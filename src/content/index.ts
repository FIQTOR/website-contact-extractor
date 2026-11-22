import type { ContentRequest, ContentResponse } from '../types/messages';
import { buildSnapshot } from './collector';
import { collectAdditionalPages } from './fetcher';

/**
 * Injected on demand by the background worker via chrome.scripting.
 * Registers a message listener each time it runs; the background pings before
 * injecting, so duplicate listeners are not expected in normal use.
 */
chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const request = message as ContentRequest | undefined;
  if (!request || typeof request !== 'object' || typeof request.type !== 'string') return false;

  if (request.type === 'WCE_PING') {
    sendResponse({ ok: true, pong: true } satisfies ContentResponse);
    return false;
  }

  if (request.type === 'WCE_COLLECT_PAGE') {
    try {
      const snapshot = buildSnapshot(document, window.location.href);
      sendResponse({ ok: true, snapshot } satisfies ContentResponse);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown collection error';
      sendResponse({ ok: false, error: detail } satisfies ContentResponse);
    }
    return false;
  }

  if (request.type === 'WCE_COLLECT_ADDITIONAL') {
    void collectAdditionalPages(request.urls, (done, total) => {
      void chrome.runtime
        .sendMessage({ type: 'WCE_EXTRA_PROGRESS', done, total })
        .catch(() => undefined);
    })
      .then((result) => {
        sendResponse({ ok: true, pages: result.pages, warnings: result.warnings } satisfies ContentResponse);
      })
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : 'Could not read contact pages';
        sendResponse({ ok: false, error: detail } satisfies ContentResponse);
      });
    return true;
  }

  return false;
});
