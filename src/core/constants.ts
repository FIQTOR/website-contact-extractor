import type { Settings } from '../types';

export const STORAGE_KEYS = {
  leads: 'wce:leads',
  settings: 'wce:settings',
  currentPrefix: 'wce:current:'
} as const;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  defaultExportFormat: 'csv',
  maxScanPages: 3,
  scanExtraPages: true
};

export const MIN_SCAN_PAGES = 1;
export const MAX_SCAN_PAGES = 5;

export const LIMITS = {
  maxLinks: 4000,
  maxJsonLdScripts: 30,
  maxAddressBlocks: 40,
  maxVisibleText: 400_000,
  maxHtml: 900_000,
  maxFetchPages: 5,
  fetchTimeoutMs: 12_000,
  fetchDelayMs: 350,
  maxLeads: 5000
} as const;

export const APP_VERSION = '1.0.0';

export function currentResultKey(tabId: number): string {
  return `${STORAGE_KEYS.currentPrefix}${tabId}`;
}
