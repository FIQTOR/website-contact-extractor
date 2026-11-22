import { EMAIL_RE, isBlockedEmailDomain, PLACEHOLDER_LOCAL_PARTS } from './patterns';

/** Lowercase, strip mailto/params and reject obvious non-emails. */
export function normalizeEmail(raw: string): string | null {
  let value = raw.trim();
  value = value.replace(/^mailto:/i, '');
  value = value.split('?')[0];
  value = value.replace(/^["'<(]+|[>"'),.;:]+$/g, '');
  if (!value || value.length > 254) return null;
  if (!/^[a-z0-9._%+'\-]+@[a-z0-9.-]+\.[a-z]{2,24}$/i.test(value)) return null;

  const email = value.toLowerCase();
  const atIndex = email.lastIndexOf('@');
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  if (!local || local.length > 64) return null;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return null;
  if (PLACEHOLDER_LOCAL_PARTS.has(local)) return null;
  if (!domain.includes('.')) return null;
  if (isBlockedEmailDomain(domain)) return null;
  if (domain.startsWith('.') || domain.includes('..')) return null;
  return email;
}

export function extractEmails(text: string): string[] {
  const found: string[] = [];
  const matches = text.match(EMAIL_RE) ?? [];
  for (const match of matches) {
    const email = normalizeEmail(match);
    if (email && !found.includes(email)) found.push(email);
  }
  return found;
}

/** Decode Cloudflare's obfuscated `data-cfemail` hex payload. */
export function decodeCloudflareEmail(hex: string): string | null {
  const value = hex.trim();
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0 || value.length < 4) return null;
  const key = parseInt(value.slice(0, 2), 16);
  let output = '';
  for (let i = 2; i < value.length; i += 2) {
    output += String.fromCharCode(parseInt(value.slice(i, i + 2), 16) ^ key);
  }
  return normalizeEmail(output);
}

export function extractCloudflareEmails(html: string): string[] {
  const found: string[] = [];
  const re = /data-cfemail=["']([0-9a-fA-F]+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const email = decodeCloudflareEmail(match[1]);
    if (email && !found.includes(email)) found.push(email);
  }
  return found;
}

/** Convert "name [at] domain [dot] com" style obfuscation into plain text. */
export function deobfuscateEmails(text: string): string[] {
  const normalized = text
    .replace(/\s*\[\s*at\s*\]\s*/gi, '@')
    .replace(/\s*\(\s*at\s*\)\s*/gi, '@')
    .replace(/\s*\{\s*at\s*\}\s*/gi, '@')
    .replace(/\s*\[\s*dot\s*\]\s*/gi, '.')
    .replace(/\s*\(\s*dot\s*\)\s*/gi, '.')
    .replace(/\s*\{\s*dot\s*\}\s*/gi, '.')
    .replace(/\s+at\s+([a-z0-9-]+)\s+dot\s+([a-z]{2,})/gi, '@$1.$2');
  if (!normalized.includes('@')) return [];
  return extractEmails(normalized);
}
