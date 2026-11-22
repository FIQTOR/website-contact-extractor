import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Database,
  Download,
  HardDrive,
  Moon,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Trash2,
  type LucideIcon
} from 'lucide-react';
import type { ExportFormat, Settings, ThemePreference } from '../../types';
import type { PopupPage } from '../components/BottomNav';
import { APP_VERSION } from '../../core/constants';
import { exportLeads } from '../../core/services/export';
import { getStorageUsage } from '../../core/services/storage';
import { useLeads } from '../hooks/useLeads';
import { useToast } from '../hooks/useToast';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProgressBar } from '../components/ProgressBar';
import { Select } from '../components/Select';
import { Toggle } from '../components/Toggle';
import { cn } from '../lib/cn';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function SectionCard({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="wce-card p-3">
      <h2 className="flex items-center gap-1.5 text-[11.5px] font-semibold text-text">
        <Icon className="h-3.5 w-3.5 text-accent" />
        {title}
      </h2>
      <div className="mt-2.5 space-y-2.5">{children}</div>
    </section>
  );
}

function SettingRow({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] text-text">{title}</p>
        {description ? (
          <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="grid gap-1 rounded-lg border border-border bg-surface-2 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-2 py-1 text-[10.5px] font-medium transition-colors',
            value === option.value
              ? 'bg-accent text-white shadow-soft'
              : 'text-muted hover:text-text'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const PERMISSIONS: Array<{ name: string; reason: string }> = [
  {
    name: 'activeTab',
    reason: 'Reads the page you are viewing only after you press the extension icon.'
  },
  {
    name: 'scripting',
    reason: 'Injects the page reader into that active tab to collect contact details.'
  },
  {
    name: 'storage',
    reason: 'Keeps your saved leads and preferences inside Chrome, on this device.'
  },
  {
    name: 'downloads',
    reason: 'Saves your CSV and JSON exports to the Downloads folder when you ask.'
  }
];

export function SettingsPage({
  settings,
  updateSettings,
  onNavigate,
  onClearCurrent
}: {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>;
  onNavigate: (page: PopupPage) => void;
  onClearCurrent: () => Promise<void>;
}) {
  const { push } = useToast();
  const { leads, clear } = useLeads();

  const [usage, setUsage] = useState<{ bytes: number; quota: number } | null>(null);
  const [busy, setBusy] = useState<'export' | 'clear' | 'current' | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const refreshUsage = useCallback(async () => {
    try {
      setUsage(await getStorageUsage());
    } catch {
      setUsage(null);
    }
  }, []);

  useEffect(() => {
    void refreshUsage();
  }, [refreshUsage, leads.length]);

  async function handleExportAll() {
    if (leads.length === 0) {
      push('There are no leads to export.', 'error');
      return;
    }
    setBusy('export');
    try {
      const filename = await exportLeads(leads, settings.defaultExportFormat);
      push(`Exported ${leads.length} lead${leads.length === 1 ? '' : 's'} to ${filename}`, 'success');
    } catch (caught) {
      push(caught instanceof Error ? caught.message : 'Export failed.', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function handleClearCurrent() {
    setBusy('current');
    try {
      await onClearCurrent();
      push('Current scan results cleared.', 'success');
    } catch {
      push('Could not clear the current results.', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function handleClearAll() {
    setBusy('clear');
    try {
      await clear();
      await refreshUsage();
      setConfirmClear(false);
      push('All saved leads were deleted.', 'success');
    } catch (caught) {
      push(caught instanceof Error ? caught.message : 'Could not delete leads.', 'error');
    } finally {
      setBusy(null);
    }
  }

  const usagePercent = usage && usage.quota > 0 ? (usage.bytes / usage.quota) * 100 : 0;

  return (
    <div className="space-y-3 p-4">
      <div>
        <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-text">Settings</h1>
        <p className="text-[10.5px] text-muted">Preferences, storage and privacy.</p>
      </div>

      <SectionCard title="Appearance" icon={Moon}>
        <Segmented<ThemePreference>
          value={settings.theme}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
            { value: 'system', label: 'System' }
          ]}
          onChange={(theme) => void updateSettings({ theme })}
        />
        <p className="text-[9.5px] leading-relaxed text-muted">
          Dark is the default. System follows your operating system setting.
        </p>
      </SectionCard>

      <SectionCard title="Scanning" icon={ScanSearch}>
        <SettingRow
          title="Maximum pages to scan"
          description="Includes the page you are on. Contact and about pages only, same site only."
        >
          <Select
            compact
            className="w-[68px]"
            value={settings.maxScanPages}
            onChange={(event) =>
              void updateSettings({ maxScanPages: Number(event.target.value) })
            }
            aria-label="Maximum pages to scan"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </SettingRow>
        <div className="border-t border-border pt-2.5">
          <SettingRow
            title="Scan contact pages by default"
            description="Automatically follow detected contact/about links when a scan starts."
          >
            <Toggle
              checked={settings.scanExtraPages}
              onChange={(value) => void updateSettings({ scanExtraPages: value })}
              label="Scan contact pages by default"
            />
          </SettingRow>
        </div>
      </SectionCard>

      <SectionCard title="Export" icon={Download}>
        <p className="wce-label">Default format</p>
        <Segmented<ExportFormat>
          value={settings.defaultExportFormat}
          options={[
            { value: 'csv', label: 'CSV' },
            { value: 'json', label: 'JSON' }
          ]}
          onChange={(format) => void updateSettings({ defaultExportFormat: format })}
        />
        <p className="text-[9.5px] leading-relaxed text-muted">
          CSV uses UTF-8 with a BOM so Excel opens accents correctly. JSON keeps the full lead
          structure.
        </p>
      </SectionCard>

      <SectionCard title="Local data" icon={Database}>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border border-border bg-surface-2 px-2.5 py-2">
            <p className="text-[14px] font-semibold leading-none text-text">{leads.length}</p>
            <p className="mt-0.5 text-[9px] text-muted">Saved leads</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 px-2.5 py-2">
            <p className="text-[14px] font-semibold leading-none text-text">
              {usage ? formatBytes(usage.bytes) : '—'}
            </p>
            <p className="mt-0.5 text-[9px] text-muted">Local storage used</p>
          </div>
        </div>

        {usage ? (
          <div>
            <ProgressBar value={usagePercent} />
            <p className="mt-1 flex items-center gap-1 text-[9px] text-muted">
              <HardDrive className="h-2.5 w-2.5" />
              {formatBytes(usage.bytes)} of {formatBytes(usage.quota)} used
            </p>
          </div>
        ) : null}

        <div className="space-y-1.5 border-t border-border pt-2.5">
          <Button
            size="sm"
            variant="secondary"
            icon={Download}
            className="w-full justify-start"
            loading={busy === 'export'}
            disabled={leads.length === 0}
            onClick={() => void handleExportAll()}
          >
            Export all leads
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={RefreshCw}
            className="w-full justify-start"
            loading={busy === 'current'}
            onClick={() => void handleClearCurrent()}
          >
            Clear current scan results
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={Trash2}
            className="w-full justify-start"
            disabled={leads.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            Delete all saved leads
          </Button>
          <button
            type="button"
            onClick={() => onNavigate('leads')}
            className="w-full py-1 text-center text-[10px] font-medium text-accent hover:underline"
          >
            Review saved leads
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Privacy & permissions" icon={ShieldCheck}>
        <ul className="space-y-1.5">
          {PERMISSIONS.map((permission) => (
            <li key={permission.name} className="flex gap-2">
              <code className="mt-0.5 h-fit shrink-0 rounded border border-border bg-surface-2 px-1 py-0.5 text-[8.5px] text-accent">
                {permission.name}
              </code>
              <span className="text-[9.5px] leading-relaxed text-muted">{permission.reason}</span>
            </li>
          ))}
        </ul>
        <p className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[9px] leading-relaxed text-muted">
          No servers, analytics, paid APIs or accounts. The extension reads public page content only.
          It never collects passwords or cookies, never bypasses logins or CAPTCHAs, and all data
          stays in Chrome local storage until you delete it.
        </p>
      </SectionCard>

      <p className="pb-1 text-center text-[9px] text-muted">
        Website Contact Extractor v{APP_VERSION} · Built for local lead generation
      </p>

      <ConfirmDialog
        open={confirmClear}
        title="Delete all saved leads?"
        description={`This removes ${leads.length} lead${
          leads.length === 1 ? '' : 's'
        } and their notes from local storage. Export first if you want a backup. This cannot be undone.`}
        confirmLabel="Delete everything"
        busy={busy === 'clear'}
        onConfirm={() => void handleClearAll()}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  );
}
