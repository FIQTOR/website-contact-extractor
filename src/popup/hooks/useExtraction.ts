import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExtractionResult } from '../../types';
import type {
  ActiveTabInfo,
  RuntimeEvent,
  ScanError,
  ScanOptions,
  ScanProgress
} from '../../types/messages';
import {
  clearStoredResult,
  requestActiveTab,
  requestCurrentResult,
  requestScan,
  storeCurrentResult
} from '../lib/messaging';

export type ExtractionStatus = 'idle' | 'scanning' | 'done' | 'error';

export function useExtraction() {
  const [tab, setTab] = useState<ActiveTabInfo | null>(null);
  const [tabLoading, setTabLoading] = useState(true);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [status, setStatus] = useState<ExtractionStatus>('idle');
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<ScanError | null>(null);
  const tabIdRef = useRef<number | null>(null);

  const loadTab = useCallback(async () => {
    setTabLoading(true);
    try {
      const response = await requestActiveTab();
      if (!response.ok) {
        setError(response.error);
        setStatus('error');
        return;
      }
      setTab(response.tab);
      tabIdRef.current = response.tab.tabId;

      if (!response.tab.supported) {
        setStatus('idle');
        return;
      }

      const cached = await requestCurrentResult(response.tab.tabId);
      if (cached.ok && cached.result) {
        setResult(cached.result);
        setStatus('done');
        setError(null);
      }
    } catch {
      setError({
        code: 'unknown',
        message: 'Could not read the active tab.',
        hint: 'Close and reopen the extension popup.'
      });
      setStatus('error');
    } finally {
      setTabLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTab();
  }, [loadTab]);

  useEffect(() => {
    const listener = (message: unknown) => {
      const event = message as RuntimeEvent | undefined;
      if (!event || typeof event !== 'object') return;
      if (event.type !== 'WCE_PROGRESS' && event.type !== 'WCE_SCAN_FINISHED') return;
      if (tabIdRef.current === null || event.tabId !== tabIdRef.current) return;

      if (event.type === 'WCE_PROGRESS') {
        setProgress(event.progress);
        setStatus('scanning');
        return;
      }

      setProgress(null);
      if (event.error) {
        setError(event.error);
        setStatus('error');
        return;
      }
      setResult(event.result);
      setStatus(event.result ? 'done' : 'idle');
      setError(null);
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const scan = useCallback(async (options: ScanOptions) => {
    const tabId = tabIdRef.current;
    if (tabId === null) {
      setError({ code: 'no-tab', message: 'No active tab was found.' });
      setStatus('error');
      return;
    }

    setStatus('scanning');
    setError(null);
    setResult(null);
    setProgress({
      phase: 'preparing',
      message: 'Preparing page reader…',
      current: 0,
      total: 1
    });

    try {
      const response = await requestScan(tabId, options);
      if (!response.ok) {
        setError(response.error);
        setStatus('error');
        setProgress(null);
      }
    } catch {
      setError({
        code: 'unknown',
        message: 'The scan could not be started.',
        hint: 'Reload the page and try again.'
      });
      setStatus('error');
      setProgress(null);
    }
  }, []);

  const updateResult = useCallback(async (next: ExtractionResult) => {
    setResult(next);
    const tabId = tabIdRef.current;
    if (tabId === null) return;
    try {
      await storeCurrentResult(tabId, next);
    } catch {
      // The session cache is best-effort; the visible result is still correct.
    }
  }, []);

  const clear = useCallback(async () => {
    setResult(null);
    setStatus('idle');
    setProgress(null);
    setError(null);
    const tabId = tabIdRef.current;
    if (tabId === null) return;
    try {
      await clearStoredResult(tabId);
    } catch {
      // Nothing to clear.
    }
  }, []);

  return {
    tab,
    tabLoading,
    result,
    status,
    progress,
    error,
    scan,
    updateResult,
    clear,
    reloadTab: loadTab
  };
}

export type ExtractionController = ReturnType<typeof useExtraction>;
