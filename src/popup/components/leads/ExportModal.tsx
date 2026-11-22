import { useEffect, useState } from 'react';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import type { ExportFormat } from '../../../types';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { cn } from '../../lib/cn';

export type ExportScope = 'all' | 'selected';

export function ExportModal({
  open,
  total,
  selectedCount,
  defaultFormat,
  busy,
  onClose,
  onExport
}: {
  open: boolean;
  total: number;
  selectedCount: number;
  defaultFormat: ExportFormat;
  busy: boolean;
  onClose: () => void;
  onExport: (scope: ExportScope, format: ExportFormat) => void;
}) {
  const [scope, setScope] = useState<ExportScope>('all');
  const [format, setFormat] = useState<ExportFormat>(defaultFormat);

  useEffect(() => {
    if (!open) return;
    setFormat(defaultFormat);
    setScope(selectedCount > 0 ? 'selected' : 'all');
  }, [open, defaultFormat, selectedCount]);

  return (
    <Modal
      open={open}
      title="Export leads"
      subtitle="Files download straight from your browser"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={Download}
            loading={busy}
            onClick={() => onExport(scope, format)}
          >
            Export
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <p className="wce-label">What to export</p>
          <div className="mt-1.5 space-y-1.5">
            <button
              type="button"
              onClick={() => setScope('all')}
              aria-pressed={scope === 'all'}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left transition',
                scope === 'all'
                  ? 'border-accent bg-[var(--wce-accent-soft)]'
                  : 'border-border bg-surface-2 hover:border-border-strong'
              )}
            >
              <span className="text-[11.5px] text-text">All leads</span>
              <span className="text-[10px] text-muted">{total}</span>
            </button>
            <button
              type="button"
              onClick={() => setScope('selected')}
              aria-pressed={scope === 'selected'}
              disabled={selectedCount === 0}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                scope === 'selected'
                  ? 'border-accent bg-[var(--wce-accent-soft)]'
                  : 'border-border bg-surface-2 hover:border-border-strong'
              )}
            >
              <span className="text-[11.5px] text-text">Selected leads</span>
              <span className="text-[10px] text-muted">{selectedCount}</span>
            </button>
          </div>
        </div>

        <div>
          <p className="wce-label">Format</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setFormat('csv')}
              aria-pressed={format === 'csv'}
              className={cn(
                'flex flex-col items-start gap-1 rounded-lg border px-2.5 py-2 text-left transition',
                format === 'csv'
                  ? 'border-accent bg-[var(--wce-accent-soft)]'
                  : 'border-border bg-surface-2 hover:border-border-strong'
              )}
            >
              <FileSpreadsheet className="h-4 w-4 text-accent" />
              <span className="text-[11.5px] font-medium text-text">CSV</span>
              <span className="text-[9.5px] leading-tight text-muted">Excel &amp; Google Sheets</span>
            </button>
            <button
              type="button"
              onClick={() => setFormat('json')}
              aria-pressed={format === 'json'}
              className={cn(
                'flex flex-col items-start gap-1 rounded-lg border px-2.5 py-2 text-left transition',
                format === 'json'
                  ? 'border-accent bg-[var(--wce-accent-soft)]'
                  : 'border-border bg-surface-2 hover:border-border-strong'
              )}
            >
              <FileJson className="h-4 w-4 text-accent" />
              <span className="text-[11.5px] font-medium text-text">JSON</span>
              <span className="text-[9.5px] leading-tight text-muted">Full structured data</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
