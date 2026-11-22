import type { ButtonHTMLAttributes } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'xs' | 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover shadow-soft disabled:cursor-not-allowed disabled:opacity-50',
  secondary:
    'border border-border bg-surface-2 text-text hover:border-border-strong hover:bg-[var(--wce-accent-soft)]',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
  danger:
    'border border-transparent bg-[var(--wce-danger-soft)] text-[var(--wce-danger)] hover:border-[var(--wce-danger)]'
};

const SIZES: Record<ButtonSize, string> = {
  xs: 'h-7 gap-1 rounded-md px-2 text-[11px]',
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-[11.5px]',
  md: 'h-9 gap-2 rounded-lg px-3.5 text-[12.5px]'
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon: Icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex select-none items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : Icon ? (
        <Icon className="h-3.5 w-3.5" />
      ) : null}
      {children}
    </button>
  );
}
