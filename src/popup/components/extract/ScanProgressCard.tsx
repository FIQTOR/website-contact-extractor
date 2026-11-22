import { Check, Circle, Loader2 } from 'lucide-react';
import type { ScanPhase, ScanProgress } from '../../../types/messages';
import { ProgressBar } from '../ProgressBar';
import { cn } from '../../lib/cn';

const STEPS: Array<{ phase: ScanPhase; label: string }> = [
  { phase: 'preparing', label: 'Prepare page reader' },
  { phase: 'collecting', label: 'Read page content' },
  { phase: 'analyzing', label: 'Extract contact details' },
  { phase: 'extra-pages', label: 'Read contact pages' },
  { phase: 'finishing', label: 'Finalise results' }
];

function phasePercent(progress: ScanProgress): number {
  switch (progress.phase) {
    case 'preparing':
      return 10;
    case 'collecting':
      return 35;
    case 'analyzing':
      return 60;
    case 'extra-pages':
      return progress.total > 0 ? 60 + (progress.current / progress.total) * 30 : 65;
    case 'finishing':
      return 94;
    default:
      return 5;
  }
}

export function ScanProgressCard({ progress }: { progress: ScanProgress | null }) {
  const currentIndex = progress
    ? STEPS.findIndex((step) => step.phase === progress.phase)
    : 0;
  const percent = progress ? phasePercent(progress) : 5;

  return (
    <div className="wce-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11.5px] font-medium text-text">
          {progress?.message ?? 'Starting scan…'}
        </p>
        <span className="shrink-0 text-[10px] text-muted">
          {Math.max(0, currentIndex) + 1}/{STEPS.length}
        </span>
      </div>
      <ProgressBar className="mt-2" value={percent} />
      <ul className="mt-2.5 space-y-1.5">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li
              key={step.phase}
              className={cn(
                'flex items-center gap-2 text-[10.5px]',
                done ? 'text-muted' : active ? 'text-text' : 'text-muted/60'
              )}
            >
              {done ? (
                <Check className="h-3 w-3 text-[var(--wce-success)]" />
              ) : active ? (
                <Loader2 className="h-3 w-3 animate-spin text-accent" />
              ) : (
                <Circle className="h-2.5 w-2.5" />
              )}
              {step.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
