import { Globe } from 'lucide-react';
import type { ActiveTabInfo } from '../../../types/messages';
import { displayUrl, getDomain } from '../../../core/utils/url';
import { Badge } from '../Badge';
import { Skeleton } from '../Skeleton';

export function TabCard({ tab, loading }: { tab: ActiveTabInfo | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="wce-card flex items-center gap-3 p-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-48" />
        </div>
      </div>
    );
  }

  if (!tab) {
    return (
      <div className="wce-card flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2">
          <Globe className="h-4 w-4 text-muted" />
        </div>
        <p className="text-[11.5px] text-muted">No active tab detected.</p>
      </div>
    );
  }

  const domain = getDomain(tab.url) || displayUrl(tab.url) || 'Current tab';

  return (
    <div className="wce-card flex items-center gap-3 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2">
        {tab.favIconUrl ? (
          <img
            src={tab.favIconUrl}
            alt=""
            className="h-5 w-5"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <Globe className="h-4 w-4 text-muted" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-text" title={tab.url}>
          {domain}
        </p>
        <p className="truncate text-[10.5px] text-muted">{tab.title || displayUrl(tab.url)}</p>
      </div>
      {tab.supported ? (
        <Badge tone="success">Ready</Badge>
      ) : (
        <Badge tone="danger">Blocked</Badge>
      )}
    </div>
  );
}
