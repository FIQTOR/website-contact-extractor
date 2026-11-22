import type { ExtractionResult, Lead, LeadSocialMedia, Settings } from '../../types';
import { EMPTY_SOCIAL_MEDIA, SOCIAL_PLATFORM_LABELS } from '../../types';
import { DEFAULT_SETTINGS, LIMITS, MAX_SCAN_PAGES, MIN_SCAN_PAGES, STORAGE_KEYS } from '../constants';
import { phoneKey } from '../extraction/phone';
import { getDomain } from '../utils/url';
import { createId } from '../utils/id';

export class StorageFullError extends Error {
  constructor() {
    super('Local storage is full. Delete a few leads and try again.');
    this.name = 'StorageFullError';
  }
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
  }
  if (typeof value === 'string') {
    return value
      .split(/[;|]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toSocialMedia(value: unknown): LeadSocialMedia {
  const base: LeadSocialMedia = { ...EMPTY_SOCIAL_MEDIA };
  if (!value || typeof value !== 'object') return base;
  for (const platform of Object.keys(EMPTY_SOCIAL_MEDIA) as Array<keyof LeadSocialMedia>) {
    const entry = (value as Record<string, unknown>)[platform];
    if (typeof entry === 'string') base[platform] = entry;
  }
  return base;
}

export function normalizeLead(raw: unknown, fallbackId?: string): Lead | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const lead: Lead = {
    id: toText(source.id) || fallbackId || createId('lead'),
    companyName: toText(source.companyName),
    website: toText(source.website),
    emails: toStringArray(source.emails),
    phones: toStringArray(source.phones),
    whatsapp: toStringArray(source.whatsapp),
    socialMedia: toSocialMedia(source.socialMedia),
    address: toText(source.address),
    description: toText(source.description),
    contactPage: toText(source.contactPage),
    extractedAt: toText(source.extractedAt) || new Date().toISOString(),
    notes: toText(source.notes),
    tags: toStringArray(source.tags),
    source: source.source === 'import' ? 'import' : 'extract',
    logoUrl: toText(source.logoUrl)
  };
  if (toText(source.googleMapsUrl)) lead.googleMapsUrl = toText(source.googleMapsUrl);
  if (!lead.companyName && !lead.website && lead.phones.length === 0) return null;
  return lead;
}

export function leadFromResult(result: ExtractionResult): Lead {
  const socialMedia: LeadSocialMedia = { ...EMPTY_SOCIAL_MEDIA };
  for (const profile of result.social) {
    socialMedia[profile.platform] = profile.url;
  }
  return {
    id: createId('lead'),
    companyName: result.business.companyName,
    website: result.url,
    emails: result.emails.map((item) => item.value),
    phones: result.phones.map((item) => item.value),
    whatsapp: result.whatsapp.map((item) => item.value),
    socialMedia,
    address: result.business.addresses[0]?.value ?? '',
    description: result.business.description || result.website.metaDescription,
    contactPage: result.business.contactPages[0]?.value ?? '',
    extractedAt: new Date(result.scannedAt).toISOString(),
    notes: '',
    tags: [],
    source: 'extract',
    logoUrl: result.business.logoUrl || result.website.faviconUrl
  };
}

async function writeLeads(leads: Lead[]): Promise<void> {
  if (leads.length > LIMITS.maxLeads) {
    throw new Error(
      `You can store up to ${LIMITS.maxLeads.toLocaleString()} leads. Delete some before adding more.`
    );
  }
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.leads]: leads });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/quota|QUOTA_BYTES/i.test(message)) throw new StorageFullError();
    throw error;
  }
}

export async function getLeads(): Promise<Lead[]> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.leads);
  const raw = data[STORAGE_KEYS.leads];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index) => normalizeLead(entry, `lead_${index}`))
    .filter((lead): lead is Lead => lead !== null);
}

export function findDuplicate(leads: Lead[], candidate: Lead): Lead | undefined {
  const candidateDomain = candidate.website ? getDomain(candidate.website) : '';
  const candidatePhones = new Set(candidate.phones.map(phoneKey).filter(Boolean));
  const candidateMaps = candidate.googleMapsUrl?.trim().toLowerCase() ?? '';

  return leads.find((lead) => {
    if (candidateDomain && lead.website && getDomain(lead.website) === candidateDomain) return true;
    if (candidateMaps && lead.googleMapsUrl?.trim().toLowerCase() === candidateMaps) return true;
    if (candidatePhones.size > 0) {
      return lead.phones.some((phone) => candidatePhones.has(phoneKey(phone)));
    }
    return false;
  });
}

function mergeEmails(base: string[], incoming: string[]): string[] {
  const map = new Map<string, string>();
  for (const email of [...base, ...incoming]) {
    const value = email.trim();
    const key = value.toLowerCase();
    if (!key || map.has(key)) continue;
    map.set(key, value);
  }
  return Array.from(map.values());
}

function mergePhones(base: string[], incoming: string[]): string[] {
  const map = new Map<string, string>();
  for (const phone of [...base, ...incoming]) {
    const value = phone.trim();
    const key = phoneKey(value) || value;
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, value);
    } else if (value.startsWith('+') && !existing.startsWith('+')) {
      map.set(key, value);
    }
  }
  return Array.from(map.values());
}

function mergeWhatsApp(base: string[], incoming: string[]): string[] {
  const map = new Map<string, string>();
  for (const entry of [...base, ...incoming]) {
    const value = entry.trim();
    if (!value) continue;
    const key = /^https?:\/\//i.test(value) ? value.toLowerCase() : phoneKey(value) || value;
    if (map.has(key)) continue;
    map.set(key, value);
  }
  return Array.from(map.values());
}

function mergeNotes(base: string, incoming: string): string {
  if (!incoming.trim()) return base;
  if (!base.trim()) return incoming;
  if (base.includes(incoming.trim())) return base;
  return `${base.trim()}\n${incoming.trim()}`;
}

export function mergeLeads(base: Lead, incoming: Lead): Lead {
  const socialMedia: LeadSocialMedia = { ...base.socialMedia };
  for (const platform of Object.keys(EMPTY_SOCIAL_MEDIA) as Array<keyof LeadSocialMedia>) {
    if (!socialMedia[platform] && incoming.socialMedia[platform]) {
      socialMedia[platform] = incoming.socialMedia[platform];
    }
  }
  return {
    ...base,
    companyName: base.companyName || incoming.companyName,
    website: base.website || incoming.website,
    emails: mergeEmails(base.emails, incoming.emails),
    phones: mergePhones(base.phones, incoming.phones),
    whatsapp: mergeWhatsApp(base.whatsapp, incoming.whatsapp),
    socialMedia,
    address: base.address || incoming.address,
    description: base.description || incoming.description,
    contactPage: base.contactPage || incoming.contactPage,
    notes: mergeNotes(base.notes, incoming.notes),
    tags: Array.from(new Set([...base.tags, ...incoming.tags])),
    extractedAt:
      new Date(incoming.extractedAt).getTime() > new Date(base.extractedAt).getTime()
        ? incoming.extractedAt
        : base.extractedAt,
    source: base.source === 'extract' || incoming.source === 'extract' ? 'extract' : 'import',
    googleMapsUrl: base.googleMapsUrl || incoming.googleMapsUrl,
    logoUrl: base.logoUrl || incoming.logoUrl
  };
}

export interface SaveLeadResult {
  lead: Lead;
  merged: boolean;
  total: number;
}

export async function saveLead(lead: Lead): Promise<SaveLeadResult> {
  const leads = await getLeads();
  const duplicate = findDuplicate(leads, lead);
  if (duplicate) {
    const merged = mergeLeads(duplicate, lead);
    const next = leads.map((entry) => (entry.id === duplicate.id ? merged : entry));
    await writeLeads(next);
    return { lead: merged, merged: true, total: next.length };
  }
  const next = [lead, ...leads];
  await writeLeads(next);
  return { lead, merged: false, total: next.length };
}

export interface BulkSaveResult {
  added: number;
  merged: number;
  total: number;
}

export async function addLeads(incoming: Lead[]): Promise<BulkSaveResult> {
  const leads = await getLeads();
  const working = [...leads];
  let added = 0;
  let mergedCount = 0;

  for (const lead of incoming) {
    const duplicate = findDuplicate(working, lead);
    if (duplicate) {
      const index = working.findIndex((entry) => entry.id === duplicate.id);
      working[index] = mergeLeads(duplicate, lead);
      mergedCount += 1;
    } else {
      working.unshift(lead);
      added += 1;
    }
  }

  await writeLeads(working);
  return { added, merged: mergedCount, total: working.length };
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead> {
  const leads = await getLeads();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index === -1) throw new Error('This lead no longer exists.');
  const updated = normalizeLead({ ...leads[index], ...patch, id });
  if (!updated) throw new Error('The lead data is invalid.');
  leads[index] = updated;
  await writeLeads(leads);
  return updated;
}

export async function deleteLead(id: string): Promise<void> {
  const leads = await getLeads();
  await writeLeads(leads.filter((lead) => lead.id !== id));
}

export async function deleteLeads(ids: string[]): Promise<void> {
  const remove = new Set(ids);
  const leads = await getLeads();
  await writeLeads(leads.filter((lead) => !remove.has(lead.id)));
}

export async function clearLeads(): Promise<void> {
  await writeLeads([]);
}

export async function getSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.settings);
  const raw = data[STORAGE_KEYS.settings];
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const source = raw as Partial<Settings>;
  const maxPages = Number(source.maxScanPages);
  return {
    theme:
      source.theme === 'light' || source.theme === 'system' || source.theme === 'dark'
        ? source.theme
        : DEFAULT_SETTINGS.theme,
    defaultExportFormat:
      source.defaultExportFormat === 'json' || source.defaultExportFormat === 'csv'
        ? source.defaultExportFormat
        : DEFAULT_SETTINGS.defaultExportFormat,
    maxScanPages: Number.isFinite(maxPages)
      ? Math.min(MAX_SCAN_PAGES, Math.max(MIN_SCAN_PAGES, Math.round(maxPages)))
      : DEFAULT_SETTINGS.maxScanPages,
    scanExtraPages:
      typeof source.scanExtraPages === 'boolean'
        ? source.scanExtraPages
        : DEFAULT_SETTINGS.scanExtraPages
  };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = { ...current, ...patch };
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next });
  return next;
}

export async function getStorageUsage(): Promise<{ bytes: number; quota: number }> {
  try {
    const bytes = await chrome.storage.local.getBytesInUse(null);
    return { bytes, quota: chrome.storage.local.QUOTA_BYTES };
  } catch {
    return { bytes: 0, quota: chrome.storage.local.QUOTA_BYTES };
  }
}

/** Map a stored lead back into the flat structure used by CSV export. */
export function leadSummary(lead: Lead): string {
  const socials = (Object.keys(lead.socialMedia) as Array<keyof LeadSocialMedia>)
    .filter((platform) => lead.socialMedia[platform])
    .map((platform) => SOCIAL_PLATFORM_LABELS[platform]);
  const parts = [lead.companyName || getDomain(lead.website) || 'Untitled lead'];
  if (lead.emails[0]) parts.push(lead.emails[0]);
  if (lead.phones[0]) parts.push(lead.phones[0]);
  if (socials.length) parts.push(socials.join(', '));
  return parts.join(' · ');
}
