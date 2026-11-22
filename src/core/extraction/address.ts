import { cleanBlock, cleanWhitespace } from '../utils/text';

const STREET_PREFIX_RE =
  /^(?:jl\.?|jalan|gang|gg\.?|ruko|komplek|kompleks|perum|perumahan|blok|kav\.?|dusun|desa|kel\.?|kelurahan|kec\.?|kecamatan|kab\.?|kabupaten|kota|provinsi|gedung|lt\.?|lantai|unit|suite|floor|no\.?|nomor)\b/i;

const ADDRESS_KEYWORD_RE =
  /\b(jl\.?|jalan|gang|ruko|komplek|kompleks|perumahan|kelurahan|kecamatan|kabupaten|provinsi|street|st\.|avenue|ave\.|road|rd\.|boulevard|blvd\.|suite|floor|building|tower|plaza|industrial park)\b/i;

const COUNTRY_RE =
  /\b(indonesia|malaysia|singapore|singapura|thailand|vietnam|philippines|filipina|australia|united states|usa|united kingdom|uk|canada|india|japan|china)\b/i;

const DISALLOWED_RE =
  /(cookie|privacy policy|terms of service|©|copyright|all rights reserved|subscribe|newsletter|shipping|return policy)/i;

/** Remove trailing separators and compress whitespace. */
export function cleanAddress(value: string): string {
  return cleanWhitespace(value)
    .replace(/^[\s,;:\-–—|•]+/, '')
    .replace(/^(?:alamat|lokasi|address|location|office|kantor)\s*[:：]\s*/i, '')
    .replace(/[\s,;:\-–—|•]+$/, '')
    .replace(/\s{2,}/g, ' ');
}

export function isPlausibleAddress(value: string, options: { trusted?: boolean } = {}): boolean {
  const address = cleanAddress(value);
  if (address.length < 12 || address.length > 220) return false;
  if (!/[A-Za-z]/.test(address)) return false;
  if (!/\d/.test(address) && !ADDRESS_KEYWORD_RE.test(address)) return false;
  if (DISALLOWED_RE.test(address)) return false;
  if (address.split(/\s+/).length < 3) return false;

  if (options.trusted) return true;

  if (STREET_PREFIX_RE.test(address)) return true;
  if (ADDRESS_KEYWORD_RE.test(address) && (COUNTRY_RE.test(address) || /,/.test(address))) return true;
  if (/\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/.test(address)) return true;
  if (/\b\d{5}\b/.test(address) && /,/.test(address) && COUNTRY_RE.test(address)) return true;
  return false;
}

/** Scan visible page text for address-looking lines. */
export function extractAddressesFromText(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const candidate = cleanBlock(line);
    if (!candidate) continue;
    if (!isPlausibleAddress(candidate)) continue;
    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(candidate);
    if (found.length >= 5) break;
  }
  return found;
}

export function addressesFromBlocks(blocks: string[]): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const block of blocks) {
    const candidate = cleanBlock(block);
    if (!candidate || !isPlausibleAddress(candidate, { trusted: true })) continue;
    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(candidate);
  }
  return found;
}
