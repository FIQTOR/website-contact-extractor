import { useState } from 'react';
import { ScanSearch } from 'lucide-react';
import type { ScanOptions } from '../../../types/messages';
import { MAX_SCAN_PAGES, MIN_SCAN_PAGES } from '../../../core/constants';
import { Button } from '../Button';
import { Select } from '../Select';
import { Toggle } from '../Toggle';

export function ScanControls({
  supported,
  scanning,
  defaultMaxPages,
  defaultIncludeExtra,
  onScan
}: {
  supported: boolean;
  scanning: boolean;
  defaultMaxPages: number;
  defaultIncludeExtra: boolean;
  onScan: (options: ScanOptions) => void;
}) {
  const [includeExtra, setIncludeExtra] = useState(defaultIncludeExtra);
  const [maxPages, setMaxPages] = useState(defaultMaxPages);

  const pages = Array.from(
    { length: MAX_SCAN_PAGES - MIN_SCAN_PAGES + 1 },
    (_, index) => MIN_SCAN_PAGES + index
  );

  return (
    <div className="wce-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11.5px] font-medium text-text">Scan contact &amp; about pages</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
            Follows detected contact links on the same site, slowly and with a hard limit.
          </p>
        </div>
        <Toggle
          checked={includeExtra}
          onChange={setIncludeExtra}
          disabled={scanning}
          label="Scan contact and about pages"
        />
      </div>

      {includeExtra ? (
        <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-border pt-2.5">
          <span className="text-[10.5px] text-muted">Maximum extra pages</span>
          <Select
            compact
            className="w-[68px]"
            value={maxPages}
            disabled={scanning}
            onChange={(event) => setMaxPages(Number(event.target.value))}
            aria-label="Maximum extra pages"
          >
            {pages.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <Button
        variant="primary"
        size="md"
        icon={ScanSearch}
        className="mt-3 w-full"
        loading={scanning}
        disabled={!supported}
        onClick={() => onScan({ includeExtraPages: includeExtra, maxPages })}
      >
        {scanning ? 'Scanning…' : 'Scan website'}
      </Button>
      {!supported ? (
        <p className="mt-2 text-center text-[10px] text-[var(--wce-danger)]">
          Chrome does not allow extensions to read this page.
        </p>
      ) : null}
    </div>
  );
}
