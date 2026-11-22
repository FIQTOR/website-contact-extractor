import type {
  ActiveTabResponse,
  CurrentResultResponse,
  PopupRequest,
  ScanOptions,
  ScanResponse,
  SetResultResponse
} from '../../types/messages';
import type { ExtractionResult } from '../../types';

async function send<T>(request: PopupRequest): Promise<T> {
  return (await chrome.runtime.sendMessage(request)) as T;
}

export function requestActiveTab(): Promise<ActiveTabResponse> {
  return send<ActiveTabResponse>({ type: 'WCE_GET_ACTIVE_TAB' });
}

export function requestScan(tabId: number, options: ScanOptions): Promise<ScanResponse> {
  return send<ScanResponse>({ type: 'WCE_SCAN_TAB', tabId, options });
}

export function requestCurrentResult(tabId: number): Promise<CurrentResultResponse> {
  return send<CurrentResultResponse>({ type: 'WCE_GET_CURRENT_RESULT', tabId });
}

export function storeCurrentResult(
  tabId: number,
  result: ExtractionResult | null
): Promise<SetResultResponse> {
  return send<SetResultResponse>({ type: 'WCE_SET_CURRENT_RESULT', tabId, result });
}

export function clearStoredResult(tabId: number): Promise<SetResultResponse> {
  return send<SetResultResponse>({ type: 'WCE_CLEAR_CURRENT_RESULT', tabId });
}
