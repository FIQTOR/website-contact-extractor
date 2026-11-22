import type { ReactNode } from 'react';
import type { SourceType } from '../../types';
import { SOURCE_LABELS } from '../../types';
import { cn } from '../lib/cn';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'danger' | 'outline';

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-border bg-surface-2 text-muted',
  accent: 'border-transparent bg-[var(--wce-accent-soft)] text-accent',
  success: 'border-transparent bg-[var(--wce-success-soft)] text-[var(--wce-success)]',
  danger: 'border-transparent bg-[var(--wce-danger-soft)] text-[var(--wce-danger)]',
  outline: 'border-border-strong bg-transparent text-muted'
};

export function Badge({
  children,
  tone = 'neutral',
  className,
  title
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-medium leading-tight',
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const SOURCE_SHORT: Record<SourceType, string> = {
  visible: 'Visible',
  metadata: 'Meta',
  jsonld: 'JSON-LD',
  'contact-link': 'Contact page'
};

const SOURCE_DOTS: Record<SourceType, string> = {
  visible: 'bg-[var(--wce-success)]',
  metadata: 'bg-[#38bdf8]',
  jsonld: 'bg-accent',
  'contact-link': 'bg-[#f59e0b]'
};

export function SourceBadges({ sources }: { sources: SourceType[] }) {
  if (sources.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {sources.map((source) => (
        <span
          key={source}
          title={SOURCE_LABELS[source]}
          className="inline-flex items-center gap-1 rounded border border-border bg-surface-2 px-1 py-0.5 text-[9px] uppercase tracking-wide text-muted"
        >
          <span className={cn('h-1 w-1 rounded-full', SOURCE_DOTS[source])} />
          {SOURCE_SHORT[source]}
        </span>
      ))}
    </span>
  );
}

export function CountBadge({ value, active }: { value: number; active?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-[18px] items-center justify-center rounded-full border px-1.5 text-[10px] font-semibold leading-4',
        active
          ? 'border-transparent bg-[var(--wce-accent-soft)] text-accent'
          : 'border-border bg-surface-2 text-muted'
      )}
    >
      {value}
    </span>
  );
}
