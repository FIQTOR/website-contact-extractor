import type { Lead } from '../../types';
import { EMPTY_SOCIAL_MEDIA } from '../../types';
import { LIMITS } from '../constants';
import { extractEmails } from '../extraction/email';
import { extractPhones, normalizePhone } from '../extraction/phone';
import { parseCsv } from '../utils/csv';
import { cleanWhitespace, humanizeSlug, uniq } from '../utils/text';
import { ensureHttpUrl, getDomain, isHttpUrl } from '../utils/url';
import { createId } from '../utils/id';

export type ImportField =
  | 'companyName'
  | 'website'
  | 'phone'
  | 'email'
  | 'address'
  | 'googleMapsUrl';

export const IMPORT_FIELDS: Array<{ field: ImportField; label: string; hint: string }> = [
  { field: 'companyName', label: 'Business name', hint: 'name, business, company' },
  { field: 'website', label: 'Website', hint: 'website, url, domain' },
  { field: 'phone', label: 'Phone', hint: 'phone, telephone, whatsapp' },
  { field: 'email', label: 'Email', hint: 'email, e-mail' },
  { field: 'address', label: 'Address', hint: 'address, location' },
  { field: 'googleMapsUrl', label: 'Google Maps URL', hint: 'maps url, place url' }
];

export type ColumnMapping = Record<ImportField, number>;

export interface ParsedImport {
  headers: string[];
  rows: string[][];
  hasHeader: boolean;
  truncated: boolean;
}

const SYNONYMS: Record<ImportField, string[]> = {
  companyName: [
    'name',
    'businessname',
    'business',
    'company',
    'companyname',
    'title',
    'nama',
    'namabisnis',
    'usaha',
    'place',
    'placename',
    'store',
    'storename',
    'brand',
    'organization'
  ],
  website: [
    'website',
    'url',
    'site',
    'web',
    'domain',
    'link',
    'websiteurl',
    'situs',
    'urlwebsite',
    'websitebisnis',
    'homepage'
  ],
  phone: [
    'phone',
    'phonenumber',
    'telephone',
    'tel',
    'telp',
    'telepon',
    'nohp',
    'hp',
    'mobile',
    'mobilenumber',
    'whatsapp',
    'wa',
    'contactnumber',
    'nomor',
    'nomortelepon',
    'phone1'
  ],
  email: ['email', 'emailaddress', 'mail', 'surel', 'emails', 'emailbisnis'],
  address: ['address', 'alamat', 'location', 'lokasi', 'fulladdress', 'streetaddress', 'alamatlengkap'],
  googleMapsUrl: [
    'googlemapsurl',
    'mapsurl',
    'googlemaps',
    'mapslink',
    'googlemapslink',
    'maplink',
    'placeurl',
    'urlmaps',
    'linkmaps',
    'googleurl',
    'gmapprofile',
    'googlemapsplace',
    'googlemapslinkurl'
  ]
};

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function parseImportFile(text: string): ParsedImport {
  const allRows = parseCsv(text);
  const truncated = allRows.length > LIMITS.maxLeads + 1;
  const limited = allRows.slice(0, LIMITS.maxLeads + 1);
  if (limited.length === 0) throw new Error('The CSV is empty.');

  const headerHints = new Set(Object.values(SYNONYMS).flat());
  const firstRowNormalized = limited[0].map(normalizeHeader);
  const matches = firstRowNormalized.filter((cell) => headerHints.has(cell)).length;
  const hasHeader = matches >= 2;

  const rawHeaders = hasHeader
    ? limited[0].map((cell) => cleanWhitespace(cell) || 'Column')
    : limited[0].map((_, index) => `Column ${index + 1}`);

  const seen = new Map<string, number>();
  const headers = rawHeaders.map((header) => {
    const count = seen.get(header) ?? 0;
    seen.set(header, count + 1);
    return count === 0 ? header : `${header} (${count + 1})`;
  });

  const rows = hasHeader ? limited.slice(1) : limited;
  if (rows.length === 0) {
    throw new Error('The CSV only contains a header row.');
  }

  return { headers, rows, hasHeader, truncated };
}

export function guessMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map(normalizeHeader);
  const mapping: ColumnMapping = {
    companyName: -1,
    website: -1,
    phone: -1,
    email: -1,
    address: -1,
    googleMapsUrl: -1
  };
  const used = new Set<number>();

  for (const { field } of IMPORT_FIELDS) {
    const synonyms = SYNONYMS[field];
    let bestIndex = -1;
    for (let index = 0; index < normalized.length; index += 1) {
      if (used.has(index)) continue;
      if (synonyms.includes(normalized[index])) {
        bestIndex = index;
        break;
      }
    }
    if (bestIndex === -1) {
      for (let index = 0; index < normalized.length; index += 1) {
        if (used.has(index)) continue;
        if (
          normalized[index].length > 2 &&
          synonyms.some((synonym) => normalized[index].includes(synonym))
        ) {
          bestIndex = index;
          break;
        }
      }
    }
    if (bestIndex >= 0) {
      mapping[field] = bestIndex;
      used.add(bestIndex);
    }
  }

  return mapping;
}

function isMapsUrl(value: string): boolean {
  if (!isHttpUrl(value)) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (host === 'maps.app.goo.gl' || host === 'goo.gl') return true;
    return /(^|\.)google\.[a-z.]+$/.test(host) && /\/maps/i.test(url.pathname);
  } catch {
    return false;
  }
}

function parsePhoneCell(raw: string): string[] {
  const value = raw.trim();
  if (!value) return [];
  const parts = value
    .split(/[;|,\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const normalized = parts
    .map((part) => normalizePhone(part))
    .filter((phone): phone is string => phone !== null);
  if (normalized.length > 0) return uniq(normalized);
  return uniq(
    extractPhones(value)
      .map((phone) => normalizePhone(phone))
      .filter((phone): phone is string => phone !== null)
  );
}

function cellValue(row: string[], mapping: ColumnMapping, field: ImportField): string {
  const index = mapping[field];
  if (index < 0 || index >= row.length) return '';
  return cleanWhitespace(row[index] ?? '');
}

export interface ImportMappingResult {
  leads: Lead[];
  skipped: number;
}

export function rowsToLeads(parsed: ParsedImport, mapping: ColumnMapping): ImportMappingResult {
  const leads: Lead[] = [];
  let skipped = 0;

  for (const row of parsed.rows) {
    const rawName = cellValue(row, mapping, 'companyName');
    const rawWebsite = cellValue(row, mapping, 'website');
    const rawMaps = cellValue(row, mapping, 'googleMapsUrl');
    const rawAddress = cellValue(row, mapping, 'address');
    const rawEmail = cellValue(row, mapping, 'email');
    const rawPhone = cellValue(row, mapping, 'phone');

    let website = ensureHttpUrl(rawWebsite);
    let googleMapsUrl = isMapsUrl(rawMaps) ? rawMaps : '';
    if (website && isMapsUrl(website)) {
      googleMapsUrl = googleMapsUrl || website;
      website = '';
    }
    if (rawMaps && !googleMapsUrl && isHttpUrl(rawMaps)) googleMapsUrl = rawMaps;

    const phones = parsePhoneCell(rawPhone);
    const emails = extractEmails(rawEmail);
    const domain = website ? getDomain(website) : '';
    const fallbackName = domain ? humanizeSlug(domain.split('.')[0] ?? '') : '';
    const companyName = rawName || fallbackName;

    if (!companyName && !website && phones.length === 0) {
      skipped += 1;
      continue;
    }

    const lead: Lead = {
      id: createId('lead'),
      companyName,
      website,
      emails,
      phones,
      whatsapp: [],
      socialMedia: { ...EMPTY_SOCIAL_MEDIA },
      address: rawAddress,
      description: '',
      contactPage: '',
      extractedAt: new Date().toISOString(),
      notes: '',
      tags: [],
      source: 'import'
    };
    if (googleMapsUrl) lead.googleMapsUrl = googleMapsUrl;
    leads.push(lead);
  }

  return { leads, skipped };
}

export function hasAnyMapping(mapping: ColumnMapping): boolean {
  return IMPORT_FIELDS.some(({ field }) => mapping[field] >= 0);
}
