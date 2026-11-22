import { normalizePhone, phoneKey } from './phone';

export interface WhatsAppHit {
  value: string;
  link: string;
}

function hitFromPhone(rawDigits: string): WhatsAppHit | null {
  const normalized = normalizePhone(rawDigits);
  if (!normalized) return null;
  const key = phoneKey(normalized);
  if (!key) return null;
  return { value: normalized, link: `https://wa.me/${key}` };
}

/** Parse wa.me, api.whatsapp.com, web.whatsapp.com and whatsapp:// links. */
export function parseWhatsAppHref(href: string): WhatsAppHit | null {
  let value = href.trim();
  if (!value) return null;
  // Links found in plain text often omit the scheme, e.g. "wa.me/62812...".
  if (/^(?:www\.)?(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|whatsapp\.com)\//i.test(value)) {
    value = `https://${value}`;
  }

  let url: URL;
  try {
    url = new URL(value, 'https://wa.me');
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./i, '').toLowerCase();
  const isWhatsAppScheme = url.protocol === 'whatsapp:';
  const isWaMe = host === 'wa.me';
  const isApi = host === 'api.whatsapp.com';
  const isWeb = host === 'web.whatsapp.com';
  const isWhatsAppDotCom = host === 'whatsapp.com' || host === 'www.whatsapp.com';

  if (!isWhatsAppScheme && !isWaMe && !isApi && !isWeb && !isWhatsAppDotCom) return null;

  const phoneParam =
    url.searchParams.get('phone') ??
    url.searchParams.get('Phone') ??
    url.searchParams.get('number');

  if (isWhatsAppScheme) {
    if (phoneParam) return hitFromPhone(phoneParam);
    return null;
  }

  if (isWaMe) {
    const segment = url.pathname.split('/').filter(Boolean)[0] ?? '';
    if (/^\d{8,15}$/.test(segment)) return hitFromPhone(segment);
    if (segment === 'message' || segment === 'qr' || segment === 'share') {
      const shortLink = `https://wa.me/${url.pathname.replace(/^\/+/, '')}`;
      return { value: shortLink, link: shortLink };
    }
    if (phoneParam) return hitFromPhone(phoneParam);
    return null;
  }

  if (phoneParam) return hitFromPhone(phoneParam);

  // Short api.whatsapp.com links such as /message/XXXX are valid but hide the number.
  const path = url.pathname.replace(/^\/+/, '');
  if (/^(message|qr|s)\//.test(path) || /^[A-Za-z0-9]{6,}$/.test(path)) {
    const shortLink = `https://${host}/${path}`;
    return { value: shortLink, link: shortLink };
  }
  return null;
}

const WHATSAPP_IN_TEXT_RE =
  /(?:https?:\/\/)?(?:wa\.me\/[^\s"'<>)\]]+|api\.whatsapp\.com\/send\/?\?[^\s"'<>)\]]+|web\.whatsapp\.com\/send\/?\?[^\s"'<>)\]]+|(?:www\.)?whatsapp\.com\/send\/?\?[^\s"'<>)\]]+|whatsapp:\/\/send\/?\?[^\s"'<>)\]]+)/gi;

/** Find WhatsApp links embedded in plain text or raw HTML. */
export function findWhatsAppInText(text: string): WhatsAppHit[] {
  const hits: WhatsAppHit[] = [];
  const seen = new Set<string>();
  const matches = text.match(WHATSAPP_IN_TEXT_RE) ?? [];
  for (const match of matches) {
    const hit = parseWhatsAppHref(match);
    if (!hit) continue;
    const key = hit.link;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push(hit);
  }
  return hits;
}
