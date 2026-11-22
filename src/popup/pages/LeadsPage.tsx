import { useEffect, useMemo, useState } from 'react';
import { Download, Inbox, Search, Trash2, X } from 'lucide-react';
import type { ExportFormat, Lead, Settings } from '../../types';
import type { PopupPage } from '../components/BottomNav';
import { isWithinDays } from '../../core/utils/date';
import { exportLeads } from '../../core/services/export';
import { useDebounce } from '../hooks/useDebounce';
import { useLeads } from '../hooks/useLeads';
import { useToast } from '../hooks/useToast';
import { LeadRow } from '../components/leads/LeadRow';
import { LeadEditorModal } from '../components/leads/LeadEditorModal';
import { ExportModal, type ExportScope } from '../components/leads/ExportModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { Skeleton } from '../components/Skeleton';

type CategoryFilter = 'all' | 'email' | 'phone' | 'whatsapp' | 'social' | 'address';
type DateFilter = 'all' | '7' | '30' | '90';

const PAGE_SIZE = 20;

function matchesCategory(lead: Lead, category: CategoryFilter): boolean {
  switch (category) {
    case 'email':
      return lead.emails.length > 0;
    case 'phone':
      return lead.phones.length > 0;
    case 'whatsapp':
      return lead.whatsapp.length > 0;
    case 'social':
      return Object.values(lead.socialMedia).some(Boolean);
    case 'address':
      return Boolean(lead.address);
    default:
      return true;
  }
}

export function LeadsPage({
  settings,
  onNavigate
}: {
  settings: Settings;
  onNavigate: (page: PopupPage) => void;
}) {
  const { push } = useToast();
  const { leads, loading, error, remove, removeMany, edit } = useLeads();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [dateRange, setDateRange] = useState<DateFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const debouncedQuery = useDebounce(query, 250);

  const filtered = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    return leads
      .filter((lead) => {
        if (!matchesCategory(lead, category)) return false;
        if (dateRange !== 'all' && !isWithinDays(lead.extractedAt, Number(dateRange))) return false;
        if (!needle) return true;
        const haystack = [
          lead.companyName,
          lead.website,
          lead.address,
          lead.description,
          lead.notes,
          lead.emails.join(' '),
          lead.phones.join(' '),
          lead.whatsapp.join(' '),
          lead.tags.join(' '),
          Object.values(lead.socialMedia).join(' '),
          lead.googleMapsUrl ?? ''
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      })
      .sort(
        (a, b) => new Date(b.extractedAt).getTime() - new Date(a.extractedAt).getTime()
      );
  }, [leads, debouncedQuery, category, dateRange]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedQuery, category, dateRange]);

  useEffect(() => {
    setSelected((current) => {
      if (current.size === 0) return current;
      const ids = new Set(leads.map((lead) => lead.id));
      const next = new Set(Array.from(current).filter((id) => ids.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [leads]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((lead) => selected.has(lead.id));

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelected((current) => {
        const next = new Set(current);
        filtered.forEach((lead) => next.delete(lead.id));
        return next;
      });
      return;
    }
    setSelected((current) => new Set([...current, ...filtered.map((lead) => lead.id)]));
  }

  async function handleExport(scope: ExportScope, format: ExportFormat) {
    const target =
      scope === 'selected' ? leads.filter((lead) => selected.has(lead.id)) : leads;
    if (target.length === 0) {
      push('There are no leads to export.', 'error');
      return;
    }
    setExporting(true);
    try {
      const filename = await exportLeads(target, format);
      push(`Exported ${target.length} lead${target.length === 1 ? '' : 's'} to ${filename}`, 'success');
      setExportOpen(false);
    } catch (caught) {
      push(caught instanceof Error ? caught.message : 'Export failed.', 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    setDeleting(true);
    try {
      await removeMany(ids);
      setSelected(new Set());
      push(`Deleted ${ids.length} lead${ids.length === 1 ? '' : 's'}.`, 'success');
      setConfirmBulkDelete(false);
    } catch (caught) {
      push(caught instanceof Error ? caught.message : 'Could not delete leads.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  const hasActiveFilters = category !== 'all' || dateRange !== 'all' || query.trim() !== '';

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-text">My Leads</h1>
          <p className="text-[10.5px] text-muted">
            {leads.length} saved{selected.size > 0 ? ` · ${selected.size} selected` : ''}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          icon={Download}
          onClick={() => setExportOpen(true)}
          disabled={leads.length === 0}
        >
          Export
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, phone, tag…"
          className="wce-input pl-8 pr-8"
          aria-label="Search leads"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted transition hover:text-text"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select
          compact
          value={category}
          onChange={(event) => setCategory(event.target.value as CategoryFilter)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          <option value="email">Has email</option>
          <option value="phone">Has phone</option>
          <option value="whatsapp">Has WhatsApp</option>
          <option value="social">Has social media</option>
          <option value="address">Has address</option>
        </Select>
        <Select
          compact
          value={dateRange}
          onChange={(event) => setDateRange(event.target.value as DateFilter)}
          aria-label="Filter by date"
        >
          <option value="all">Any date</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </Select>
      </div>

      {hasActiveFilters ? (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted">
            {filtered.length} of {leads.length} leads match
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('all');
              setDateRange('all');
            }}
            className="text-[10px] font-medium text-accent hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : null}

      {selected.size > 0 ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-2.5 py-1.5">
          <span className="text-[10.5px] text-muted">{selected.size} selected</span>
          <div className="flex items-center gap-1">
            <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button
              size="xs"
              variant="danger"
              icon={Trash2}
              onClick={() => setConfirmBulkDelete(true)}
            >
              Delete
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="rounded-xl border border-border bg-surface p-2.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-44" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-border bg-surface p-3 text-[11px] text-[var(--wce-danger)]">
          {error}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No leads saved yet"
          description="Scan a website and press Save lead, or import a CSV exported from a Google Maps scraping tool."
          action={
            <Button size="sm" variant="primary" onClick={() => onNavigate('extract')}>
              Go to Extract
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching leads"
          description="Try a different search term or reset the filters."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setQuery('');
                setCategory('all');
                setDateRange('all');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-muted">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
                className="h-3 w-3 cursor-pointer accent-[#8b5cf6]"
              />
              Select all
            </label>
            <span className="text-[10px] text-muted">
              {filtered.length} lead{filtered.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-2">
            {filtered.slice(0, visibleCount).map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                selected={selected.has(lead.id)}
                onToggleSelected={() => toggleSelected(lead.id)}
                onOpen={() => setEditing(lead)}
              />
            ))}
          </div>

          {filtered.length > visibleCount ? (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Load more ({filtered.length - visibleCount} remaining)
            </Button>
          ) : null}
        </>
      )}

      {editing ? (
        <LeadEditorModal
          lead={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await edit(editing.id, patch);
            setEditing(null);
            push('Lead updated.', 'success');
          }}
          onDelete={async () => {
            await remove(editing.id);
            setSelected((current) => {
              const next = new Set(current);
              next.delete(editing.id);
              return next;
            });
            setEditing(null);
            push('Lead deleted.', 'success');
          }}
        />
      ) : null}

      <ExportModal
        open={exportOpen}
        total={leads.length}
        selectedCount={selected.size}
        defaultFormat={settings.defaultExportFormat}
        busy={exporting}
        onClose={() => setExportOpen(false)}
        onExport={(scope, format) => void handleExport(scope, format)}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selected.size} lead${selected.size === 1 ? '' : 's'}?`}
        description="Selected leads and their notes will be removed from local storage. This cannot be undone."
        confirmLabel="Delete selected"
        busy={deleting}
        onConfirm={() => void handleBulkDelete()}
        onClose={() => setConfirmBulkDelete(false)}
      />
    </div>
  );
}
