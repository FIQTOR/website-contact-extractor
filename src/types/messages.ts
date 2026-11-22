import type { ExtractionResult, PageSnapshot } from './index';

export interface ScanOptions {
  includeExtraPages: boolean;
  maxPages: number;
}

export type ScanPhase =
  | 'preparing'
  | 'collecting'
  | 'analyzing'
  | 'extra-pages'
  | 'finishing';

export interface ScanProgress {
  phase: ScanPhase;
  message: string;
  current: number;
  total: number;
}

export type ScanErrorCode =
  | 'no-tab'
  | 'unsupported-page'
  | 'injection-failed'
  | 'content-unavailable'
  | 'no-response'
  | 'storage-full'
  | 'unknown';

export interface ScanError {
  code: ScanErrorCode;
  message: string;
  hint?: string;
}

export type PopupRequest =
  | { type: 'WCE_SCAN_TAB'; tabId: number; options: ScanOptions }
  | { type: 'WCE_GET_CURRENT_RESULT'; tabId: number }
  | { type: 'WCE_SET_CURRENT_RESULT'; tabId: number; result: ExtractionResult | null }
  | { type: 'WCE_CLEAR_CURRENT_RESULT'; tabId: number }
  | { type: 'WCE_GET_ACTIVE_TAB' };

export interface ActiveTabInfo {
  tabId: number;
  url: string;
  title: string;
  favIconUrl: string;
  supported: boolean;
}

export type ScanResponse =
  | { ok: true; result: ExtractionResult }
  | { ok: false; error: ScanError };

export type CurrentResultResponse =
  | { ok: true; result: ExtractionResult | null }
  | { ok: false; error: ScanError };

export type ActiveTabResponse =
  | { ok: true; tab: ActiveTabInfo }
  | { ok: false; error: ScanError };

export type SetResultResponse = { ok: true } | { ok: false; error: ScanError };

export type ProgressEvent = {
  type: 'WCE_PROGRESS';
  tabId: number;
  progress: ScanProgress;
};

export type ScanFinishedEvent = {
  type: 'WCE_SCAN_FINISHED';
  tabId: number;
  result: ExtractionResult | null;
  error?: ScanError;
};

export type RuntimeEvent = ProgressEvent | ScanFinishedEvent;

export type ContentRequest =
  | { type: 'WCE_PING' }
  | { type: 'WCE_COLLECT_PAGE' }
  | { type: 'WCE_COLLECT_ADDITIONAL'; urls: string[] };

export type ContentResponse =
  | { ok: true; snapshot: PageSnapshot }
  | { ok: true; pages: PageSnapshot[]; warnings: string[] }
  | { ok: true; pong: true }
  | { ok: false; error: string };
