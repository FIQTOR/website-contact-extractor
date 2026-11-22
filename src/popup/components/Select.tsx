import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  compact?: boolean;
}

export function Select({ className, compact, children, ...props }: SelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        className={cn(
          'wce-input cursor-pointer appearance-none pr-7',
          compact && 'h-8 py-1 text-[11.5px]'
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
    </div>
  );
}
