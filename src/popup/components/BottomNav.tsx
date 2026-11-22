import { ScanSearch, Settings, Upload, Users, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

export type PopupPage = 'extract' | 'leads' | 'import' | 'settings';

const ITEMS: Array<{ id: PopupPage; label: string; icon: LucideIcon }> = [
  { id: 'extract', label: 'Extract', icon: ScanSearch },
  { id: 'leads', label: 'My Leads', icon: Users },
  { id: 'import', label: 'Import', icon: Upload },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export function BottomNav({
  page,
  onChange
}: {
  page: PopupPage;
  onChange: (page: PopupPage) => void;
}) {
  return (
    <nav className="grid h-[56px] shrink-0 grid-cols-4 gap-1 border-t border-border bg-surface px-2">
      {ITEMS.map((item) => {
        const active = page === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'my-1.5 flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition-colors',
              active
                ? 'bg-[var(--wce-accent-soft)] text-accent'
                : 'text-muted hover:bg-surface-2 hover:text-text'
            )}
            aria-current={active ? 'page' : undefined}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
