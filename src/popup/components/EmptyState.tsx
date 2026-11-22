import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface px-5 py-7 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--wce-accent-soft)] text-accent">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[12px] font-semibold text-text">{title}</p>
      <p className="max-w-[280px] text-[11px] leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
