const PHONE_RUN_RE = /\+?\(?\d[\d\s().\-\u00A0]{5,26}\d/g;

/** Digits-only identity used for deduplication across local/international formats. */
export function phoneKey(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

function isDateLike(digits: string): boolean {
  if (/^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.test(digits)) return true;
  if (/^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(19|20)\d{2}$/.test(digits)) return true;
  return false;
}

function isPlausibleDigits(digits: string, raw: string): boolean {
  if (digits.length < 8 || digits.length > 15) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (/^0{3,}/.test(digits)) return false;
  if (/^(19|20)\d{6}$/.test(digits) && digits.length === 8) return false;
  if (isDateLike(digits)) return false;
  if (/^\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{4}$/.test(raw.trim())) return false;
  return true;
}

/**
 * Normalise a phone number.
 * - `+62 812-3456-7890` -> `+6281234567890`
 * - `0812 3456 7890`   -> `081234567890` (kept in local format)
 * - `6281234567890`    -> `+6281234567890`
 */
export function normalizePhone(raw: string): string | null {
  let text = raw.trim();
  if (!text) return null;
  text = text.replace(/^(?:tel|telp|telepon|phone|whatsapp|wa|hp|mobile|call)\s*[:.]\s*/i, '');
  text = text.replace(/\s*(?:ext|ext\.|extension|x)\s*\d{1,6}\s*$/i, '');
  text = text.replace(/[\u00A0\u202F]/g, ' ');
  if (!/\d/.test(text)) return null;
  if (/\//.test(text)) return null;
  if (/(?:rp|\$|€|£|¥)\s*$/i.test(text)) return null;
  if (/^(?:rp|\$|€|£|¥)/i.test(text)) return null;

  const trimmed = text.replace(/^[^\d+(]+/, '').replace(/[^\d)]+$/, '');
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, '');
  const startedInternational = trimmed.startsWith('+') || digits.startsWith('00');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!digits) return null;
  if (!isPlausibleDigits(digits, raw)) return null;

  if (startedInternational) return `+${digits}`;
  if (digits.startsWith('62')) return `+${digits}`;
  if (digits.startsWith('0')) {
    if (digits.length < 9 || digits.length > 14) return null;
    return digits;
  }
  if (digits.length >= 10) return `+${digits}`;
  return null;
}

/** Scan free text for phone numbers, rejecting dates, prices and IDs. */
export function extractPhones(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  PHONE_RUN_RE.lastIndex = 0;
  while ((match = PHONE_RUN_RE.exec(text)) !== null) {
    const raw = match[0];
    const before = text.slice(Math.max(0, match.index - 4), match.index);
    const after = text.charAt(match.index + raw.length);
    if (/[A-Za-z\d]/.test(after)) continue;
    if (/[A-Za-z]$/.test(before)) continue;
    if (/(?:rp|idr|usd|eur)\s*$/i.test(before)) continue;

    const digits = raw.replace(/\D/g, '');
    if (digits.length < 8) continue;

    const hasFormatting = /[()\-.\s]/.test(raw);
    const explicit =
      raw.trimStart().startsWith('+') ||
      digits.startsWith('00') ||
      digits.startsWith('0') ||
      digits.startsWith('62');
    if (!explicit && !(hasFormatting && digits.length >= 10)) continue;
    if (/^\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{4}$/.test(raw.trim())) continue;

    const normalized = normalizePhone(raw);
    if (!normalized) continue;
    const key = phoneKey(normalized);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    found.push(normalized);
  }

  return found;
}

export function telLink(value: string): string {
  return `tel:${value.replace(/[^\d+]/g, '')}`;
}

export function whatsappLink(value: string): string {
  const digits = phoneKey(value);
  return digits ? `https://wa.me/${digits}` : '';
}
