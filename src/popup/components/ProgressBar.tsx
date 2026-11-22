import { cn } from '../lib/cn';

export function ProgressBar({
  value,
  indeterminate = false,
  className
}: {
  value?: number;
  indeterminate?: boolean;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)}>
      {indeterminate ? (
        <div className="relative h-full w-full overflow-hidden">
          <div className="absolute inset-y-0 w-1/2 animate-shimmer rounded-full bg-accent" />
        </div>
      ) : (
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      )}
    </div>
  );
}
