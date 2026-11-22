import { ChevronRight, Mail, MapPin, MessageCircle, Phone, Users } from 'lucide-react';
import type { Lead } from '../../../types';
import { relativeDate } from '../../../core/utils/date';
import { displayUrl } from '../../../core/utils/url';
import { Badge } from '../Badge';
import { cn } from '../../lib/cn';

export function LeadRow({
  lead,
  selected,
  onToggleSelected,
  onOpen
}: {
  lead: Lead;
  selected: boolean;
  onToggleSelected: () => void;
  onOpen: () => void;
}) {
  const socialCount = Object.values(lead.socialMedia).filter(Boolean).length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        'group flex cursor-pointer items-start gap-2 rounded-xl border bg-surface p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        selected ? 'border-accent' : 'border-border hover:border-border-strong'
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onClick={(event) => event.stopPropagation()}
        onChange={onToggleSelected}
        aria-label={`Select ${lead.companyName || 'lead'}`}
        className="mt-1 h-3.5 w-3.5 shrink-0 cursor-pointer accent-[#8b5cf6]"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[12px] font-semibold text-text">
            {lead.companyName || displayUrl(lead.website) || 'Untitled lead'}
          </p>
          <span className="shrink-0 text-[9.5px] text-muted">{relativeDate(lead.extractedAt)}</span>
        </div>
        <p className="truncate text-[10.5px] text-muted">
          {displayUrl(lead.website) || lead.phones[0] || 'No website'}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {lead.emails.length > 0 ? (
            <Badge>
              <Mail className="h-2.5 w-2.5" /> {lead.emails.length}
            </Badge>
          ) : null}
          {lead.phones.length > 0 ? (
            <Badge>
              <Phone className="h-2.5 w-2.5" /> {lead.phones.length}
            </Badge>
          ) : null}
          {lead.whatsapp.length > 0 ? (
            <Badge>
              <MessageCircle className="h-2.5 w-2.5" /> {lead.whatsapp.length}
            </Badge>
          ) : null}
          {socialCount > 0 ? (
            <Badge>
              <Users className="h-2.5 w-2.5" /> {socialCount}
            </Badge>
          ) : null}
          {lead.address ? (
            <Badge>
              <MapPin className="h-2.5 w-2.5" />
            </Badge>
          ) : null}
          {lead.source === 'import' ? <Badge tone="outline">Imported</Badge> : null}
        </div>

        {lead.tags.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {lead.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded bg-surface-2 px-1 py-0.5 text-[9px] text-muted"
              >
                #{tag}
              </span>
            ))}
            {lead.tags.length > 4 ? (
              <span className="text-[9px] text-muted">+{lead.tags.length - 4}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
