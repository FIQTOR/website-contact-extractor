import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  tone?: 'default' | 'danger' | 'accent';
  size?: 'xs' | 'sm';
}

const TONES = {
  default: 'text-muted hover:bg-surface-2 hover:text-text',
  accent: 'text-accent hover:bg-[var(--wce-accent-soft)]',
  danger: 'text-muted hover:bg-[var(--wce-danger-soft)] hover:text-[var(--wce-danger)]'
} as const;

export function IconButton({
  icon: Icon,
  label,
  tone = 'default',
  size = 'xs',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40',
        size === 'xs' ? 'h-6 w-6' : 'h-7 w-7',
        TONES[tone],
        className
      )}
      {...props}
    >
      <Icon className={size === 'xs' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </button>
  );
}
