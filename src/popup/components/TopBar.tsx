import { Moon, Radar, Sun } from 'lucide-react';
import type { ThemePreference } from '../../types';
import { IconButton } from './IconButton';

export function TopBar({
  theme,
  onToggleTheme
}: {
  theme: ThemePreference;
  onToggleTheme: () => void;
}) {
  const isLight = theme === 'light';
  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white shadow-soft">
          <Radar className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <p className="text-[12.5px] font-semibold tracking-[-0.01em] text-text">
            Contact Extractor
          </p>
          <p className="text-[10px] text-muted">Local leads · No server</p>
        </div>
      </div>
      <IconButton
        icon={isLight ? Moon : Sun}
        label="Toggle theme"
        onClick={onToggleTheme}
        className="h-7 w-7"
      />
    </header>
  );
}
