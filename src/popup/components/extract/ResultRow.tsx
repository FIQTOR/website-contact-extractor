import type { LucideIcon } from 'lucide-react';
import { Copy, ExternalLink, X } from 'lucide-react';
import type { SourceType } from '../../../types';
import { copyText, openExternal } from '../../lib/browser';
import { useToast } from '../../hooks/useToast';
import { SourceBadges } from '../Badge';
import { IconButton } from '../IconButton';
import { cn } from '../../lib/cn';

export function ResultRow({
  icon: Icon,
  value,
  caption,
  sources,
  link,
  preview = false,
  clamp = false,
  onRemove
}: {
  icon: LucideIcon;
  value: string;
  caption?: string;
  sources: SourceType[];
  link?: string;
  preview?: boolean;
  clamp?: boolean;
  onRemove?: () => void;
}) {
  const { push } = useToast();

  async function handleCopy() {
    const copied = await copyText(value);
    push(copied ? 'Copied to clipboard.' : 'Could not copy this value.', copied ? 'success' : 'error');
  }

  return (
    <div className="group flex items-start gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-2">
      {preview ? (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-white">
          <img
            src={value}
            alt=""
            className="h-full w-full object-contain p-0.5"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        </div>
      ) : (
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
      )}

      <div className="min-w-0 flex-1">
        {caption ? (
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">{caption}</p>
        ) : null}
        <p
          title={value}
          className={cn(
            'break-words text-[11.5px] leading-snug text-text',
            clamp && 'line-clamp-3'
          )}
        >
          {value}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <SourceBadges sources={sources} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-80 transition-opacity group-hover:opacity-100">
        <IconButton icon={Copy} label="Copy value" onClick={() => void handleCopy()} />
        {link ? (
          <IconButton
            icon={ExternalLink}
            label="Open link"
            onClick={() => openExternal(link)}
          />
        ) : null}
        {onRemove ? (
          <IconButton icon={X} label="Remove from results" tone="danger" onClick={onRemove} />
        ) : null}
      </div>
    </div>
  );
}
