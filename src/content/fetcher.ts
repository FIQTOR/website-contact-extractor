import type { PageSnapshot } from '../types';
import { LIMITS } from '../core/constants';
import { buildSnapshot } from './collector';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface AdditionalPagesResult {
  pages: PageSnapshot[];
  warnings: string[];
}

function describeError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'the request timed out';
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'the request was blocked by the site or its CORS policy';
  }
  return message;
}

/**
 * Fetch a few same-origin contact pages. Sequential with a small delay so the
 * target site is never hammered. Never follows links found inside these pages.
 */
export async function collectAdditionalPages(
  urls: string[],
  onProgress?: (done: number, total: number) => void
): Promise<AdditionalPagesResult> {
  const pages: PageSnapshot[] = [];
  const warnings: string[] = [];
  const unique = Array.from(new Set(urls)).slice(0, LIMITS.maxFetchPages);

  for (let index = 0; index < unique.length; index += 1) {
    const url = unique[index];
    try {
      const parsed = new URL(url);
      if (parsed.origin !== window.location.origin) {
        warnings.push(`Skipped ${parsed.pathname}: it belongs to a different site.`);
        continue;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), LIMITS.fetchTimeoutMs);
      let response: Response;
      try {
        response = await fetch(parsed.toString(), {
          credentials: 'same-origin',
          redirect: 'follow',
          signal: controller.signal,
          headers: { Accept: 'text/html,application/xhtml+xml' }
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        warnings.push(`${parsed.pathname} returned HTTP ${response.status}.`);
        continue;
      }
      const contentType = response.headers.get('content-type') ?? '';
      if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
        warnings.push(`${parsed.pathname} is not an HTML page.`);
        continue;
      }

      const html = await response.text();
      if (html.length > 3_000_000) {
        warnings.push(`${parsed.pathname} was too large to read safely.`);
        continue;
      }

      const doc = new DOMParser().parseFromString(html, 'text/html');
      pages.push(buildSnapshot(doc, response.url || parsed.toString()));
    } catch (error) {
      warnings.push(`${new URL(url).pathname || url} could not be read: ${describeError(error)}.`);
    }

    onProgress?.(index + 1, unique.length);
    if (index < unique.length - 1) await sleep(LIMITS.fetchDelayMs);
  }

  return { pages, warnings };
}
