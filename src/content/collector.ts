import type { PageSnapshot, SnapshotImage, SnapshotLink, SnapshotMeta } from '../types';
import { LIMITS } from '../core/constants';
import { absoluteUrl } from '../core/utils/url';

function readVisibleText(doc: Document): string {
  const body = doc.body;
  if (!body) return '';
  const rendered = body.innerText;
  if (typeof rendered === 'string' && rendered.trim().length > 0) {
    return rendered;
  }
  const clone = body.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('script, style, noscript, template, svg').forEach((node) => node.remove());
  return clone.textContent ?? '';
}

function readMetas(doc: Document): SnapshotMeta[] {
  const metas: SnapshotMeta[] = [];
  const elements = Array.from(doc.querySelectorAll('meta')).slice(0, 200);
  for (const element of elements) {
    const key = (
      element.getAttribute('property') ??
      element.getAttribute('name') ??
      element.getAttribute('itemprop') ??
      ''
    ).trim();
    const content = (element.getAttribute('content') ?? '').trim();
    if (!key || !content) continue;
    metas.push({ key, content });
  }
  return metas;
}

function metaValue(metas: SnapshotMeta[], wanted: string): string {
  const lower = wanted.toLowerCase();
  return metas.find((meta) => meta.key.toLowerCase() === lower)?.content ?? '';
}

function readLinks(doc: Document, baseUrl: string): SnapshotLink[] {
  const links: SnapshotLink[] = [];
  const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]')).slice(
    0,
    LIMITS.maxLinks
  );
  for (const anchor of anchors) {
    const raw = anchor.getAttribute('href') ?? '';
    if (!raw || raw.startsWith('javascript:') || raw === '#') continue;
    const href = absoluteUrl(raw, baseUrl);
    if (!href) continue;
    const text = (anchor.innerText || anchor.getAttribute('aria-label') || anchor.title || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
    links.push({ href, text, rel: anchor.getAttribute('rel') ?? '' });
  }
  return links;
}

function readImages(doc: Document, baseUrl: string, metas: SnapshotMeta[]): SnapshotImage[] {
  const images: SnapshotImage[] = [];
  const seen = new Set<string>();

  const push = (rawSrc: string, alt: string, hint: string): void => {
    const src = absoluteUrl(rawSrc, baseUrl);
    if (!src || seen.has(src)) return;
    seen.add(src);
    images.push({ src, alt: alt.slice(0, 160), hint: hint.slice(0, 160) });
  };

  const ogImage = metaValue(metas, 'og:image') || metaValue(metas, 'twitter:image');
  if (ogImage) push(ogImage, '', 'og:image');

  const elements = Array.from(doc.querySelectorAll<HTMLImageElement>('img')).slice(0, 300);
  for (const image of elements) {
    const hint = `${image.className} ${image.id} ${image.alt}`.toLowerCase();
    const raw = image.getAttribute('src') ?? image.getAttribute('data-src') ?? '';
    if (!raw) continue;
    if (!/logo|brand|wordmark/.test(hint) && !/logo|brand|wordmark/i.test(raw)) continue;
    push(raw, image.alt ?? '', hint);
    if (images.length >= 20) break;
  }

  return images;
}

function readAddressBlocks(doc: Document): string[] {
  const blocks: string[] = [];
  const seen = new Set<string>();

  const push = (value: string | null): void => {
    if (!value) return;
    const clean = value.replace(/\s+/g, ' ').trim();
    if (clean.length < 10 || clean.length > 300) return;
    const key = clean.toLowerCase();
    if (seen.has(key) || blocks.length >= LIMITS.maxAddressBlocks) return;
    seen.add(key);
    blocks.push(clean);
  };

  for (const element of Array.from(doc.querySelectorAll('address'))) {
    push(element.textContent);
  }
  for (const element of Array.from(doc.querySelectorAll('[itemprop~="address"]'))) {
    push(element.textContent);
  }

  const selectors = [
    '[class*="address" i]',
    '[id*="address" i]',
    '[class*="alamat" i]',
    '[id*="alamat" i]',
    '[class*="lokasi" i]',
    '[id*="lokasi" i]',
    '[class*="location" i]'
  ];
  for (const selector of selectors) {
    try {
      for (const element of Array.from(doc.querySelectorAll(selector)).slice(0, 12)) {
        push(element.textContent);
      }
    } catch {
      // Unsupported selector syntax in older browsers; ignore.
    }
  }

  return blocks;
}

function readJsonLd(doc: Document): unknown[] {
  const output: unknown[] = [];
  const scripts = Array.from(
    doc.querySelectorAll('script[type="application/ld+json"]')
  ).slice(0, LIMITS.maxJsonLdScripts);

  for (const script of scripts) {
    const raw = (script.textContent ?? '').trim();
    if (!raw) continue;
    const attempts = [raw, raw.replace(/^\s*<!--/, '').replace(/-->\s*$/, '').trim()];
    for (const attempt of attempts) {
      try {
        output.push(JSON.parse(attempt));
        break;
      } catch {
        // Try the next cleaning strategy.
      }
    }
  }
  return output;
}

export function buildSnapshot(doc: Document, url: string): PageSnapshot {
  const metas = readMetas(doc);
  const title = doc.title || metaValue(metas, 'og:title');
  const metaDescription =
    metaValue(metas, 'description') ||
    metaValue(metas, 'og:description') ||
    metaValue(metas, 'twitter:description');
  const siteName = metaValue(metas, 'og:site_name') || metaValue(metas, 'application-name');

  const iconElement = doc.querySelector<HTMLLinkElement>(
    'link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="shortcut icon"]'
  );
  const iconUrl = absoluteUrl(iconElement?.getAttribute('href') ?? '', url);

  const html = doc.documentElement?.outerHTML ?? '';

  return {
    url,
    title,
    lang: doc.documentElement?.lang ?? '',
    metaDescription,
    siteName,
    visibleText: readVisibleText(doc).slice(0, LIMITS.maxVisibleText),
    html: html.slice(0, LIMITS.maxHtml),
    jsonLd: readJsonLd(doc),
    links: readLinks(doc, url),
    images: readImages(doc, url, metas),
    metas,
    addressBlocks: readAddressBlocks(doc),
    iconUrl,
    capturedAt: Date.now()
  };
}
