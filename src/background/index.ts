import type { ExtractionResult, PageSnapshot } from '../types';
import type {
  ActiveTabInfo,
  ActiveTabResponse,
  ContentRequest,
  ContentResponse,
  CurrentResultResponse,
  PopupRequest,
  RuntimeEvent,
  ScanError,
  ScanOptions,
  ScanProgress,
  ScanResponse,
  SetResultResponse
} from '../types/messages';
import { analyzePage, findContactPageCandidates } from '../core/extraction';
import { currentResultKey, MAX_SCAN_PAGES, MIN_SCAN_PAGES } from '../core/constants';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function emit(event: RuntimeEvent): void {
  void chrome.runtime.sendMessage(event).catch(() => undefined);
}

function emitProgress(tabId: number, progress: ScanProgress): void {
  emit({ type: 'WCE_PROGRESS', tabId, progress });
}

function emitFinished(tabId: number, result: ExtractionResult | null, error?: ScanError): void {
  emit({ type: 'WCE_SCAN_FINISHED', tabId, result, ...(error ? { error } : {}) });
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function mapError(error: unknown): ScanError {
  const message = error instanceof Error ? error.message : String(error);

  if (/No tab with id/i.test(message)) {
    return {
      code: 'no-tab',
      message: 'The tab could not be found.',
      hint: 'Close the popup, open the website you want to scan, and try again.'
    };
  }
  if (/chrome:\/\/|edge:\/\/|about:blank|extensions gallery|cannot be scripted|Cannot access a chrome/i.test(message)) {
    return {
      code: 'unsupported-page',
      message: 'Chrome does not allow extensions to read this page.',
      hint: 'Open a regular http(s) website, then scan again. Internal pages, the Web Store and PDF viewers are blocked by Chrome.'
    };
  }
  if (/Cannot access contents of the url|Missing host permission|Cannot access contents/i.test(message)) {
    return {
      code: 'unsupported-page',
      message: 'This page cannot be accessed.',
      hint: 'Reload the page and press the extension icon again to grant access for this tab.'
    };
  }
  if (/quota|QUOTA_BYTES/i.test(message)) {
    return {
      code: 'storage-full',
      message: 'Extension storage is full.',
      hint: 'Open My Leads and delete a few old leads, then try again.'
    };
  }
  if (/did not respond|timed out|timeout/i.test(message)) {
    return {
      code: 'no-response',
      message: 'The page did not respond in time.',
      hint: 'The page may be busy or blocked by a script. Wait for it to finish loading and try again.'
    };
  }
  if (/Could not establish connection|Receiving end does not exist|message port closed/i.test(message)) {
    return {
      code: 'content-unavailable',
      message: 'The content script is not available on this page.',
      hint: 'Reload the website once, then press Scan again.'
    };
  }
  return {
    code: 'unknown',
    message: 'The scan could not be completed.',
    hint: message || 'Reload the page and try again.'
  };
}

async function pingTab(tabId: number): Promise<boolean> {
  try {
    const response = (await withTimeout(
      chrome.tabs.sendMessage(tabId, { type: 'WCE_PING' } satisfies ContentRequest),
      1200,
      'ping timeout'
    )) as ContentResponse | undefined;
    return Boolean(response && response.ok === true && 'pong' in response);
  } catch {
    return false;
  }
}

async function ensureContentScript(tabId: number): Promise<void> {
  if (await pingTab(tabId)) return;
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await pingTab(tabId)) return;
    await sleep(120);
  }
  throw new Error('The content script could not start on this page.');
}

async function collectPage(tabId: number): Promise<PageSnapshot> {
  const response = (await withTimeout(
    chrome.tabs.sendMessage(tabId, { type: 'WCE_COLLECT_PAGE' } satisfies ContentRequest),
    25_000,
    'The page did not respond while reading its content.'
  )) as ContentResponse | undefined;

  if (!response || response.ok !== true || !('snapshot' in response)) {
    const detail =
      response && 'error' in response ? response.error : 'The page returned no readable data.';
    throw new Error(detail);
  }
  return response.snapshot;
}

async function requestAdditionalPages(
  tabId: number,
  urls: string[]
): Promise<{ pages: PageSnapshot[]; warnings: string[] }> {
  const response = (await withTimeout(
    chrome.tabs.sendMessage(tabId, {
      type: 'WCE_COLLECT_ADDITIONAL',
      urls
    } satisfies ContentRequest),
    60_000,
    'The contact pages did not respond in time.'
  )) as ContentResponse | undefined;

  if (!response || response.ok !== true || !('pages' in response)) {
    const detail =
      response && 'error' in response ? response.error : 'The contact pages could not be read.';
    return { pages: [], warnings: [detail] };
  }
  return { pages: response.pages, warnings: response.warnings };
}

async function setCurrentResult(tabId: number, result: ExtractionResult | null): Promise<void> {
  const key = currentResultKey(tabId);
  if (result) {
    await chrome.storage.session.set({ [key]: result });
  } else {
    await chrome.storage.session.remove(key);
  }
}

async function readCurrentResult(tabId: number): Promise<ExtractionResult | null> {
  const key = currentResultKey(tabId);
  const data = (await chrome.storage.session.get(key)) as Record<string, unknown>;
  const value = data[key];
  if (!value || typeof value !== 'object') return null;
  const candidate = value as ExtractionResult;
  return Array.isArray(candidate.emails) ? candidate : null;
}

function clampPages(value: number): number {
  if (!Number.isFinite(value)) return 3;
  return Math.min(MAX_SCAN_PAGES, Math.max(MIN_SCAN_PAGES, Math.round(value)));
}

async function handleScan(tabId: number, options: ScanOptions): Promise<ScanResponse> {
  const startedAt = Date.now();
  let tab: chrome.tabs.Tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    const error: ScanError = {
      code: 'no-tab',
      message: 'The active tab could not be found.',
      hint: 'Reopen the extension from the website you want to scan.'
    };
    emitFinished(tabId, null, error);
    return { ok: false, error };
  }

  const tabUrl = tab.url ?? '';
  if (!/^https?:/i.test(tabUrl)) {
    const error: ScanError = {
      code: 'unsupported-page',
      message: 'This page cannot be scanned.',
      hint: 'Chrome blocks extensions on internal pages, the Web Store, PDF viewers and local files. Open a normal website and try again.'
    };
    emitFinished(tabId, null, error);
    return { ok: false, error };
  }

  try {
    emitProgress(tabId, {
      phase: 'preparing',
      message: 'Preparing page reader…',
      current: 0,
      total: 1
    });
    await setCurrentResult(tabId, null);
    await ensureContentScript(tabId);

    emitProgress(tabId, {
      phase: 'collecting',
      message: 'Reading page content…',
      current: 0,
      total: 1
    });
    const snapshot = await collectPage(tabId);

    emitProgress(tabId, {
      phase: 'analyzing',
      message: 'Extracting contact details…',
      current: 1,
      total: 1
    });

    let extras: PageSnapshot[] = [];
    let extraWarnings: string[] = [];
    if (options.includeExtraPages) {
      const maxPages = clampPages(options.maxPages);
      const candidates = findContactPageCandidates(snapshot, maxPages);
      if (candidates.length > 0) {
        emitProgress(tabId, {
          phase: 'extra-pages',
          message: `Reading ${candidates.length} contact page${candidates.length > 1 ? 's' : ''}…`,
          current: 0,
          total: candidates.length
        });
        const additional = await requestAdditionalPages(
          tabId,
          candidates.map((candidate) => candidate.url)
        );
        extras = additional.pages;
        extraWarnings = additional.warnings;
      }
    }

    emitProgress(tabId, {
      phase: 'finishing',
      message: 'Finalising results…',
      current: 1,
      total: 1
    });

    const result = analyzePage({
      main: snapshot,
      extras,
      tabId,
      startedAt,
      extraWarnings
    });

    try {
      await setCurrentResult(tabId, result);
    } catch {
      // Session cache is a convenience; scan results are still returned to the popup.
    }

    emitFinished(tabId, result);
    return { ok: true, result };
  } catch (error) {
    const scanError = mapError(error);
    emitFinished(tabId, null, scanError);
    return { ok: false, error: scanError };
  }
}

async function handleActiveTab(): Promise<ActiveTabResponse> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id === undefined) {
      return {
        ok: false,
        error: { code: 'no-tab', message: 'No active tab was found.' }
      };
    }
    const url = tab.url ?? '';
    const info: ActiveTabInfo = {
      tabId: tab.id,
      url,
      title: tab.title ?? '',
      favIconUrl: tab.favIconUrl ?? '',
      supported: /^https?:/i.test(url)
    };
    return { ok: true, tab: info };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

async function handleRequest(message: PopupRequest): Promise<unknown> {
  switch (message.type) {
    case 'WCE_SCAN_TAB':
      return handleScan(message.tabId, message.options);
    case 'WCE_GET_CURRENT_RESULT': {
      const result = await readCurrentResult(message.tabId);
      return { ok: true, result } satisfies CurrentResultResponse;
    }
    case 'WCE_SET_CURRENT_RESULT': {
      await setCurrentResult(message.tabId, message.result);
      return { ok: true } satisfies SetResultResponse;
    }
    case 'WCE_CLEAR_CURRENT_RESULT': {
      await setCurrentResult(message.tabId, null);
      return { ok: true } satisfies SetResultResponse;
    }
    case 'WCE_GET_ACTIVE_TAB':
      return handleActiveTab();
    default:
      return { ok: false, error: { code: 'unknown', message: 'Unsupported request.' } };
  }
}

const POPUP_REQUESTS = new Set([
  'WCE_SCAN_TAB',
  'WCE_GET_CURRENT_RESULT',
  'WCE_SET_CURRENT_RESULT',
  'WCE_CLEAR_CURRENT_RESULT',
  'WCE_GET_ACTIVE_TAB'
]);

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  const raw = message as { type?: unknown; done?: unknown; total?: unknown } | undefined;

  if (raw?.type === 'WCE_EXTRA_PROGRESS' && sender.tab?.id !== undefined) {
    const tabId = sender.tab.id;
    const done = typeof raw.done === 'number' ? raw.done : 0;
    const total = typeof raw.total === 'number' ? raw.total : 0;
    emitProgress(tabId, {
      phase: 'extra-pages',
      message: `Reading page ${done} of ${total}…`,
      current: done,
      total
    });
    return false;
  }

  if (!raw || typeof raw.type !== 'string' || !POPUP_REQUESTS.has(raw.type)) return false;

  void handleRequest(raw as PopupRequest)
    .then((response) => sendResponse(response))
    .catch((error: unknown) => sendResponse({ ok: false, error: mapError(error) }));

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.remove(currentResultKey(tabId)).catch(() => undefined);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === 'loading') {
    void chrome.storage.session.remove(currentResultKey(tabId)).catch(() => undefined);
  }
});
