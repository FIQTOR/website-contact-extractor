export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  let inQuotes = false;
  for (const char of firstLine) {
    if (char === '"') inQuotes = !inQuotes;
    if (inQuotes) continue;
    if (char in counts) counts[char] += 1;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return ranked[0][1] > 0 ? ranked[0][0] : ',';
}

/**
 * Parse CSV text (RFC 4180-ish) including quoted fields, escaped quotes and
 * CRLF/LF line endings. Throws a readable error for broken files.
 */
export function parseCsv(input: string): string[][] {
  if (input.includes('\u0000')) {
    throw new Error('This file is not a text CSV. Export it again as CSV (comma separated).');
  }
  const text = input.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(text);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = '';
      continue;
    }
    if (char === '\r') continue;
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += char;
  }

  if (inQuotes) {
    throw new Error('The CSV has an unclosed quote. Check the file and try again.');
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const cleaned = rows
    .map((cells) => cells.map((cell) => cell.trim()))
    .filter((cells) => cells.some((cell) => cell.length > 0));

  if (cleaned.length === 0) {
    throw new Error('The CSV is empty.');
  }
  return cleaned;
}

export function escapeCsvField(value: string): string {
  const normalized = value.replace(/\r?\n/g, ' ');
  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

/** Serialise rows with CRLF so Excel and Google Sheets open them cleanly. */
export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
}
