import { useRef, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileUp,
  MapPin,
  UploadCloud,
  X
} from 'lucide-react';
import type { Lead } from '../../types';
import type { PopupPage } from '../components/BottomNav';
import type { ColumnMapping, ParsedImport } from '../../core/services/import';
import {
  IMPORT_FIELDS,
  guessMapping,
  hasAnyMapping,
  parseImportFile,
  rowsToLeads
} from '../../core/services/import';
import { addLeads } from '../../core/services/storage';
import { displayUrl } from '../../core/utils/url';
import { openExternal } from '../lib/browser';
import { useToast } from '../hooks/useToast';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { Select } from '../components/Select';
import { ProgressBar } from '../components/ProgressBar';
import { cn } from '../lib/cn';

interface ImportSummary {
  added: number;
  merged: number;
  skipped: number;
  total: number;
  truncated: boolean;
  leads: Lead[];
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function ImportPage({ onNavigate }: { onNavigate: (page: PopupPage) => void }) {
  const { push } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  async function handleFile(file: File) {
    if (!/\.csv$/i.test(file.name)) {
      push('Please choose a .csv file.', 'error');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      push('That CSV is larger than 5 MB. Split it into smaller files.', 'error');
      return;
    }
    try {
      const text = await file.text();
      const next = parseImportFile(text);
      const guessed = guessMapping(next.headers);
      const matched = IMPORT_FIELDS.filter(({ field }) => guessed[field] >= 0).length;
      setParsed(next);
      setMapping(guessed);
      setFileName(file.name);
      setSummary(null);
      push(
        `${next.rows.length} row${next.rows.length === 1 ? '' : 's'} detected · ${matched} column${
          matched === 1 ? '' : 's'
        } auto-mapped.`,
        'success'
      );
    } catch (caught) {
      setParsed(null);
      setMapping(null);
      setFileName('');
      push(caught instanceof Error ? caught.message : 'Could not read that CSV.', 'error');
    }
  }

  async function handleImport() {
    if (!parsed || !mapping) return;
    if (!hasAnyMapping(mapping)) {
      push('Map at least one column before importing.', 'error');
      return;
    }
    setBusy(true);
    try {
      const result = rowsToLeads(parsed, mapping);
      if (result.leads.length === 0) {
        push('No usable rows were found. Check the column mapping and try again.', 'error');
        return;
      }
      const saved = await addLeads(result.leads);
      setSummary({
        added: saved.added,
        merged: saved.merged,
        skipped: result.skipped,
        total: saved.total,
        truncated: parsed.truncated,
        leads: result.leads.slice(0, 12)
      });
      setParsed(null);
      setMapping(null);
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      push(
        `Imported ${saved.added} new lead${saved.added === 1 ? '' : 's'}${
          saved.merged > 0 ? `, merged ${saved.merged} duplicate${saved.merged === 1 ? '' : 's'}` : ''
        }.${parsed.truncated ? ' Large file: only the first rows were imported.' : ''}`,
        'success'
      );
    } catch (caught) {
      push(caught instanceof Error ? caught.message : 'Import failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function resetImport() {
    setParsed(null);
    setMapping(null);
    setFileName('');
    setSummary(null);
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const mappedIndexes = mapping ? Object.values(mapping).filter((index) => index >= 0) : [];

  return (
    <div className="space-y-3 p-4">
      <div>
        <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-text">Import Leads</h1>
        <p className="text-[10.5px] text-muted">
          Use a CSV exported from Google Maps scraping tools, then scan each website for more details.
        </p>
      </div>

      {summary ? (
        <div className="wce-card space-y-2.5 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[var(--wce-success)]" />
            <p className="text-[12px] font-semibold text-text">Import complete</p>
          </div>

          <div className="grid grid-cols-4 gap-1 text-center">
            {[
              { label: 'Added', value: summary.added },
              { label: 'Merged', value: summary.merged },
              { label: 'Skipped', value: summary.skipped },
              { label: 'Saved', value: summary.total }
            ].map((tile) => (
              <div key={tile.label} className="rounded-lg border border-border bg-surface-2 py-1.5">
                <p className="text-[14px] font-semibold leading-none text-text">{tile.value}</p>
                <p className="mt-0.5 text-[9px] text-muted">{tile.label}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] leading-relaxed text-muted">
            Open a business website, then press the extension icon to scan it and merge extra contact
            details into the saved lead.
          </p>

          {summary.truncated ? (
            <p className="rounded-md border border-border bg-[var(--wce-accent-soft)] px-2 py-1.5 text-[9.5px] leading-relaxed text-muted">
              This CSV was larger than the 5,000-row import limit. Split the file to import the
              remaining rows.
            </p>
          ) : null}

          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="primary"
              className="flex-1"
              onClick={() => onNavigate('leads')}
            >
              View my leads
            </Button>
            <Button size="sm" variant="secondary" onClick={resetImport}>
              Import another
            </Button>
          </div>

          {summary.leads.length > 0 ? (
            <ul className="space-y-1 border-t border-border pt-2">
              {summary.leads.map((lead) => (
                <li
                  key={lead.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[10.5px] text-text">{lead.companyName}</p>
                    <p className="truncate text-[9.5px] text-muted">
                      {displayUrl(lead.website) || lead.phones[0] || 'No website'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {lead.website ? (
                      <Button
                        size="xs"
                        variant="ghost"
                        icon={ExternalLink}
                        onClick={() => openExternal(lead.website)}
                      >
                        Open
                      </Button>
                    ) : null}
                    {lead.googleMapsUrl ? (
                      <IconButton
                        icon={MapPin}
                        label="Open in Google Maps"
                        onClick={() => openExternal(lead.googleMapsUrl ?? '')}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {parsed && mapping ? (
        <div className="space-y-3">
          <div className="wce-card p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-semibold text-text">{fileName}</p>
                <p className="text-[10px] text-muted">
                  {parsed.rows.length} rows · {parsed.headers.length} columns
                  {parsed.hasHeader ? '' : ' · no header row'}
                  {parsed.truncated ? ' · only the first 5,000 rows are used' : ''}
                </p>
              </div>
              <IconButton icon={X} label="Cancel import" onClick={resetImport} />
            </div>

            {!parsed.hasHeader ? (
              <p className="mt-2 rounded-md border border-border bg-[var(--wce-accent-soft)] px-2 py-1.5 text-[9.5px] leading-relaxed text-muted">
                No header row was detected, so columns are numbered. Pick the right column for each
                field below.
              </p>
            ) : null}
          </div>

          <div className="wce-card p-3">
            <p className="text-[11.5px] font-semibold text-text">Column mapping</p>
            <p className="mt-0.5 text-[10px] text-muted">
              Tell the importer which CSV column belongs to each field.
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {IMPORT_FIELDS.map(({ field, label, hint }) => (
                <label key={field} className="block">
                  <span className="wce-label">{label}</span>
                  <Select
                    compact
                    className="mt-1"
                    value={mapping[field]}
                    onChange={(event) =>
                      setMapping({ ...mapping, [field]: Number(event.target.value) })
                    }
                    aria-label={`${label} column`}
                  >
                    <option value={-1}>Don't import</option>
                    {parsed.headers.map((header, index) => {
                      const usedByAnother = Object.entries(mapping).some(
                        ([otherField, otherIndex]) => otherField !== field && otherIndex === index
                      );
                      return (
                        <option key={`${header}-${index}`} value={index} disabled={usedByAnother}>
                          {header}
                        </option>
                      );
                    })}
                  </Select>
                  <span className="mt-0.5 block truncate text-[8.5px] text-muted">{hint}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="wce-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="text-[11.5px] font-semibold text-text">Preview</p>
              <span className="text-[9.5px] text-muted">first 5 rows</span>
            </div>
            <div className="max-h-[190px] overflow-auto">
              <table className="w-full border-collapse text-[9.5px]">
                <thead className="sticky top-0 bg-surface-2">
                  <tr>
                    {parsed.headers.map((header, index) => (
                      <th
                        key={`${header}-${index}`}
                        className={cn(
                          'whitespace-nowrap border-b border-border px-2 py-1.5 text-left font-semibold',
                          mappedIndexes.includes(index) ? 'text-accent' : 'text-muted'
                        )}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-border last:border-0">
                      {parsed.headers.map((_, cellIndex) => (
                        <td
                          key={cellIndex}
                          title={row[cellIndex] ?? ''}
                          className="max-w-[150px] truncate px-2 py-1 text-text"
                        >
                          {row[cellIndex] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {busy ? <ProgressBar indeterminate /> : null}

          <Button
            variant="primary"
            size="md"
            icon={FileUp}
            className="w-full"
            loading={busy}
            disabled={!hasAnyMapping(mapping)}
            onClick={() => void handleImport()}
          >
            Import {parsed.rows.length} row{parsed.rows.length === 1 ? '' : 's'}
          </Button>
          {!hasAnyMapping(mapping) ? (
            <p className="text-center text-[9.5px] text-[var(--wce-danger)]">
              Map at least one column to continue.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const file = event.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border border-dashed p-5 text-center transition-colors',
              dragOver
                ? 'border-accent bg-[var(--wce-accent-soft)]'
                : 'border-border bg-surface'
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--wce-accent-soft)] text-accent">
              <UploadCloud className="h-5 w-5" />
            </div>
            <p className="text-[12px] font-semibold text-text">Drop your CSV here</p>
            <p className="text-[10px] leading-relaxed text-muted">
              Business name, website, phone, address and Google Maps URL are supported.
            </p>
            <Button
              size="sm"
              variant="secondary"
              icon={FileUp}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose CSV file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.target.value = '';
              }}
            />
            <p className="text-[9px] text-muted">Max 5 MB · Parsed locally, never uploaded</p>
          </div>

          <div className="wce-card p-3">
            <p className="text-[11.5px] font-semibold text-text">How it works</p>
            <ol className="mt-1.5 space-y-1.5 text-[10px] leading-relaxed text-muted">
              <li>1. Export or prepare a CSV from your Google Maps scraper.</li>
              <li>2. Drop the file here and confirm the column mapping.</li>
              <li>3. Press Import, then open each website and scan it for extra contact details.</li>
            </ol>
            <p className="mt-2 rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[9px] leading-relaxed text-muted">
              This extension does not connect to other extensions. CSV files are the only bridge.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
