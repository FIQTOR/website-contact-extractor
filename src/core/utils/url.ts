export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** Resolve a possibly relative URL. Returns an empty string when invalid. */
export function absoluteUrl(value: string, base?: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    return new URL(trimmed, base).toString();
  } catch {
    return '';
  }
}

/** `https://www.Example.com/path?q=1` -> `example.com` */
export function getDomain(value: string): string {
  const url = safeUrl(value);
  if (!url) return '';
  return url.hostname.replace(/^www\./i, '').toLowerCase();
}

export function safeUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

export function normalizeUrlKey(value: string): string {
  const url = safeUrl(value);
  if (!url) return value.trim();
  const path = url.pathname.replace(/\/+$/, '') || '/';
  return `${url.hostname.replace(/^www\./i, '').toLowerCase()}${path}${url.search}`;
}

export function isSameSite(a: string, b: string): boolean {
  const first = safeUrl(a);
  const second = safeUrl(b);
  if (!first || !second) return false;
  return first.hostname.replace(/^www\./i, '') === second.hostname.replace(/^www\./i, '');
}

/** Human friendly URL for display (drops protocol and trailing slash). */
export function displayUrl(value: string): string {
  return value
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
}

/** Turn `example.com` or `www.example.com/path` into an https URL. */
export function ensureHttpUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(trimmed)) return `https://${trimmed}`;
  return '';
}
