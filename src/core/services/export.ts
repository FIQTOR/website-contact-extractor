import type { ExportFormat, ExtractionResult, Lead } from '../../types';
import { dateTimeStamp } from '../utils/date';
import { toCsv } from '../utils/csv';
import { leadFromResult } from './storage';

const CSV_HEADERS = [
  'Company Name',
  'Website',
  'Emails',
  'Phones',
  'WhatsApp',
  'Instagram',
  'Facebook',
  'TikTok',
  'LinkedIn',
  'YouTube',
  'X (Twitter)',
  'Address',
  'Description',
  'Contact Page',
  'Notes',
  'Tags',
  'Google Maps URL',
  'Source',
  'Extracted At'
];

function join(values: string[]): string {
  return values.filter(Boolean).join('; ');
}

export function leadsToRows(leads: Lead[]): string[][] {
  return [
    CSV_HEADERS,
    ...leads.map((lead) => [
      lead.companyName,
      lead.website,
      join(lead.emails),
      join(lead.phones),
      join(lead.whatsapp),
      lead.socialMedia.instagram,
      lead.socialMedia.facebook,
      lead.socialMedia.tiktok,
      lead.socialMedia.linkedin,
      lead.socialMedia.youtube,
      lead.socialMedia.twitter,
      lead.address,
      lead.description,
      lead.contactPage,
      lead.notes,
      join(lead.tags),
      lead.googleMapsUrl ?? '',
      lead.source,
      lead.extractedAt
    ])
  ];
}

/** UTF-8 BOM + CRLF keeps Excel happy with non-ASCII characters. */
export function leadsToCsv(leads: Lead[]): string {
  return `\uFEFF${toCsv(leadsToRows(leads))}`;
}

export function leadsToJson(leads: Lead[]): string {
  return JSON.stringify(
    {
      app: 'Website Contact Extractor',
      exportedAt: new Date().toISOString(),
      count: leads.length,
      leads
    },
    null,
    2
  );
}

export interface ExportPayload {
  content: string;
  mimeType: string;
  filename: string;
}

export function buildExport(leads: Lead[], format: ExportFormat): ExportPayload {
  const stamp = dateTimeStamp();
  if (format === 'json') {
    return {
      content: leadsToJson(leads),
      mimeType: 'application/json',
      filename: `website-contact-extractor-${stamp}.json`
    };
  }
  return {
    content: leadsToCsv(leads),
    mimeType: 'text/csv',
    filename: `website-contact-extractor-${stamp}.csv`
  };
}

function encodeBase64(content: string): string {
  const bytes = new TextEncoder().encode(content);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export async function downloadContent(payload: ExportPayload): Promise<void> {
  const dataUrl = `data:${payload.mimeType};base64,${encodeBase64(payload.content)}`;

  if (chrome.downloads?.download) {
    try {
      await chrome.downloads.download({
        url: dataUrl,
        filename: payload.filename,
        saveAs: true
      });
      return;
    } catch {
      // Fall through to the anchor so the user still gets the file.
    }
  }

  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = payload.filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function exportLeads(leads: Lead[], format: ExportFormat): Promise<string> {
  if (leads.length === 0) {
    throw new Error('There are no leads to export.');
  }
  const payload = buildExport(leads, format);
  await downloadContent(payload);
  return payload.filename;
}

export async function exportResult(result: ExtractionResult, format: ExportFormat): Promise<string> {
  return exportLeads([leadFromResult(result)], format);
}
