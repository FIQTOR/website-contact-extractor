import type { PageSnapshot } from '../../types';
import { ABSOLUTE_URL_RE } from './urlHelpers';
import {
  ABOUT_PATH_RE,
  CONTACT_PATH_RE,
  LOCATION_PATH_RE
} from './patterns';
import { isSameSite, normalizeUrlKey, safeUrl } from '../utils/url';

export type ContactPageKind = 'contact' | 'about' | 'location';

export interface ContactPageCandidate {
  url: string;
  kind: ContactPageKind;
  score: number;
}

const KIND_RULES: Array<{ kind: ContactPageKind; re: RegExp; baseScore: number }> = [
  { kind: 'contact', re: CONTACT_PATH_RE, baseScore: 100 },
  { kind: 'about', re: ABOUT_PATH_RE, baseScore: 60 },
  { kind: 'location', re: LOCATION_PATH_RE, baseScore: 40 }
];

const EXCLUDED_PATH_RE =
  /(\/blog\/|\/news\/|\/article|\/product|\/category|\/tag\/|\/cart|\/checkout|\/login|\/register|\/privacy|\/terms)/i;

function classify(pathname: string, text: string): { kind: ContactPageKind; score: number } | null {
  const haystack = `${pathname} ${text}`;
  for (const rule of KIND_RULES) {
    const pathMatch = rule.re.test(pathname);
    const textMatch = rule.re.test(text);
    if (pathMatch || textMatch) {
      const score = rule.baseScore + (pathMatch ? 25 : 0) + (textMatch ? 15 : 0);
      return { kind: rule.kind, score };
    }
    if (rule.re.test(haystack)) return { kind: rule.kind, score: rule.baseScore };
  }
  return null;
}

/**
 * Pick a handful of same-site contact/about/location pages.
 * Never crawls the whole site; the caller caps the number of pages.
 */
export function findContactPageCandidates(
  snapshot: PageSnapshot,
  limit: number
): ContactPageCandidate[] {
  const candidates = new Map<string, ContactPageCandidate>();
  const currentKey = normalizeUrlKey(snapshot.url);

  for (const link of snapshot.links) {
    if (!link.href) continue;
    const url = safeUrl(link.href);
    if (!url) continue;
    if (!isSameSite(snapshot.url, link.href)) continue;
    if (/\.(pdf|jpg|jpeg|png|gif|webp|svg|zip|docx?|xlsx?)$/i.test(url.pathname)) continue;
    if (EXCLUDED_PATH_RE.test(url.pathname)) continue;
    const key = normalizeUrlKey(link.href);
    if (key === currentKey) continue;
    if (candidates.has(key)) continue;

    const classification = classify(url.pathname, link.text);
    if (!classification) continue;

    const depth = url.pathname.split('/').filter(Boolean).length;
    const score = classification.score - depth * 2;
    if (score <= 0) continue;

    const clean = new URL(url.toString());
    clean.hash = '';
    candidates.set(key, { url: clean.toString(), kind: classification.kind, score });
  }

  return Array.from(candidates.values())
    .sort((a, b) => b.score - a.score || a.url.length - b.url.length)
    .slice(0, Math.max(0, limit));
}

/** Convert JSON-LD URLs to absolute candidates when they look like contact pages. */
export function candidatesFromUrls(
  urls: string[],
  pageUrl: string,
  limit: number
): ContactPageCandidate[] {
  const seen = new Set<string>();
  const output: ContactPageCandidate[] = [];
  for (const raw of urls) {
    const value = raw.trim();
    if (!value || !ABSOLUTE_URL_RE.test(value)) continue;
    if (!isSameSite(pageUrl, value)) continue;
    const url = safeUrl(value);
    if (!url) continue;
    const key = normalizeUrlKey(value);
    if (seen.has(key)) continue;
    const classification = classify(url.pathname, '');
    if (!classification) continue;
    seen.add(key);
    output.push({ url: value, kind: classification.kind, score: classification.score - 10 });
    if (output.length >= limit) break;
  }
  return output;
}
