import { useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import type { Settings } from '../../types';
import type { ScanError } from '../../types/messages';
import { getDomain } from '../../core/utils/url';
import { exportResult } from '../../core/services/export';
import { leadFromResult, saveLead } from '../../core/services/storage';
import type { ExtractionController } from '../hooks/useExtraction';
import { useToast } from '../hooks/useToast';
import { removeResultItem, type RemovableSection } from '../lib/resultEdits';
import { TabCard } from '../components/extract/TabCard';
import { ScanControls } from '../components/extract/ScanControls';
import { ScanProgressCard } from '../components/extract/ScanProgressCard';
import { Results } from '../components/extract/Results';
import { EmptyState } from '../components/EmptyState';
import { ResultSkeleton } from '../components/Skeleton';
import { Button } from '../components/Button';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function ErrorCard({
  error,
  retryDisabled,
  onRetry
}: {
  error: ScanError;
  retryDisabled: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--wce-danger)] bg-[var(--wce-danger-soft)] p-3">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--wce-danger)]" />
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold text-text">{error.message}</p>
          {error.hint ? (
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{error.hint}</p>
          ) : null}
        </div>
      </div>
      <Button
        size="xs"
        variant="secondary"
        icon={RefreshCw}
        className="mt-2"
        onClick={onRetry}
        disabled={retryDisabled}
      >
        Try again
      </Button>
    </div>
  );
}

export function ExtractPage({
  extraction,
  settings
}: {
  extraction: ExtractionController;
  settings: Settings;
}) {
  const { push } = useToast();
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { tab, tabLoading, result, status, progress, error, scan, updateResult, clear } = extraction;

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      const base = leadFromResult(result);
      const lead = {
        ...base,
        companyName:
          base.companyName ||
          getDomain(base.website) ||
          result.website.title.slice(0, 90) ||
          'Untitled lead'
      };
      const saved = await saveLead(lead);
      push(
        saved.merged
          ? 'A matching lead already existed — new details were merged in.'
          : 'Lead saved to My Leads.',
        'success'
      );
    } catch (caught) {
      push(messageOf(caught), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleExport(format: 'csv' | 'json') {
    if (!result) return;
    setExporting(true);
    try {
      const filename = await exportResult(result, format);
      push(`Exported current results to ${filename}`, 'success');
    } catch (caught) {
      push(messageOf(caught), 'error');
    } finally {
      setExporting(false);
    }
  }

  function handleRemove(section: RemovableSection, value: string) {
    if (!result) return;
    void updateResult(removeResultItem(result, section, value));
  }

  return (
    <div className="space-y-3 p-4">
      <TabCard tab={tab} loading={tabLoading} />

      {tab && !tab.supported ? (
        <div className="rounded-lg border border-border bg-surface p-2.5 text-[10.5px] leading-relaxed text-muted">
          Chrome blocks extensions on internal pages (chrome://), the Web Store, PDF files and local
          file URLs. Open a regular website to scan.
        </div>
      ) : null}

      <ScanControls
        supported={Boolean(tab?.supported)}
        scanning={status === 'scanning'}
        defaultMaxPages={settings.maxScanPages}
        defaultIncludeExtra={settings.scanExtraPages}
        onScan={(options) => void scan(options)}
      />

      {status === 'scanning' ? (
        <>
          <ScanProgressCard progress={progress} />
          <ResultSkeleton />
        </>
      ) : null}

      {status === 'error' && error ? (
        <ErrorCard
          error={error}
          retryDisabled={!tab?.supported}
          onRetry={() =>
            void scan({
              includeExtraPages: settings.scanExtraPages,
              maxPages: settings.maxScanPages
            })
          }
        />
      ) : null}

      {status === 'done' && result ? (
        <Results
          result={result}
          saving={saving}
          exporting={exporting}
          onSave={() => void handleSave()}
          onExport={(format) => void handleExport(format)}
          onClear={() => void clear()}
          onRemove={handleRemove}
        />
      ) : null}

      {status === 'idle' && !result ? (
        <EmptyState
          icon={Sparkles}
          title="Ready when you are"
          description="Open a business website and press Scan website. Contact details found on the page appear here, labelled with their source."
        />
      ) : null}

      <p className="flex items-center justify-center gap-1.5 pb-1 text-[9.5px] text-muted">
        <ShieldCheck className="h-3 w-3" />
        Reads public page content only. Nothing leaves your browser.
      </p>
    </div>
  );
}
