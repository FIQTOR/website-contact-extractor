export function cleanWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Collapse newlines but keep line structure, used for address blocks. */
export function cleanBlock(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join(', ');
}

export function uniq(values: string[]): string[] {
  return Array.from(new Set(values));
}

/** Title-cases a hostname label such as `kopi-senja` -> `Kopi Senja`. */
export function humanizeSlug(value: string): string {
  return value
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function normalizeWhitespaceKey(value: string): string {
  return cleanWhitespace(value).toLowerCase();
}
