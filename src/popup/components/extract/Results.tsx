import type { ReactNode } from 'react';
import {
  AlignLeft,
  AlertTriangle,
  Briefcase,
  Building2,
  Camera,
  FileJson,
  FileSpreadsheet,
  FileText,
  Globe,
  Image as ImageIcon,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Play,
  Save,
  Trash2,
  Users,
  type LucideIcon
} from 'lucide-react';
import type { ExtractionResult, SocialPlatform } from '../../../types';
import { SOCIAL_PLATFORM_LABELS } from '../../../types';
import type { RemovableSection } from '../../lib/resultEdits';
import { Button } from '../Button';
import { CountBadge } from '../Badge';
import { IconButton } from '../IconButton';
import { ResultRow } from './ResultRow';

const SOCIAL_ICONS: Record<SocialPlatform, LucideIcon> = {
  instagram: Camera,
  facebook: Users,
  tiktok: Music2,
  linkedin: Briefcase,
  youtube: Play,
  twitter: MessageCircle
};

function Section({
  title,
  icon: Icon,
  count,
  children
}: {
  title: string;
  icon: LucideIcon;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="wce-card overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="flex items-center gap-1.5 text-[11.5px] font-semibold text-text">
          <Icon className="h-3.5 w-3.5 text-accent" />
          {title}
        </h3>
        <CountBadge value={count} />
      </header>
      <div className="space-y-1.5 p-2">{children}</div>
    </section>
  );
}

function NoneFound() {
  return <p className="px-1 py-1 text-[10.5px] text-muted">None found.</p>;
}

function CountChip({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-1 text-[10px] text-muted">
      <Icon className="h-2.5 w-2.5" />
      <span className="font-semibold text-text">{value}</span>
      {label}
    </span>
  );
}

export function Results({
  result,
  saving,
  exporting,
  onSave,
  onExport,
  onClear,
  onRemove
}: {
  result: ExtractionResult;
  saving: boolean;
  exporting: boolean;
  onSave: () => void;
  onExport: (format: 'csv' | 'json') => void;
  onClear: () => void;
  onRemove: (section: RemovableSection, value: string) => void;
}) {
  const businessCount =
    (result.business.companyName ? 1 : 0) +
    (result.business.description ? 1 : 0) +
    (result.business.logoUrl ? 1 : 0) +
    result.business.addresses.length +
    result.business.contactPages.length;

  const websiteCount =
    (result.website.url ? 1 : 0) +
    (result.website.title ? 1 : 0) +
    (result.website.metaDescription ? 1 : 0) +
    (result.website.siteName ? 1 : 0) +
    (result.website.faviconUrl ? 1 : 0);

  const totalContacts =
    result.emails.length +
    result.phones.length +
    result.whatsapp.length +
    result.social.length +
    result.business.addresses.length +
    result.business.contactPages.length;

  return (
    <div className="space-y-3">
      <div className="wce-card p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.09em] text-muted">
              Contacts found
            </p>
            <p className="mt-0.5 text-[24px] font-semibold leading-none text-text">
              {totalContacts}
            </p>
            <p className="mt-1 text-[10px] text-muted">
              {result.pagesScanned.length} page{result.pagesScanned.length === 1 ? '' : 's'} scanned
              {' · '}
              {result.durationMs} ms
            </p>
          </div>
          <IconButton
            icon={Trash2}
            label="Clear current results"
            tone="danger"
            onClick={onClear}
            className="h-7 w-7"
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          <CountChip icon={Mail} label="emails" value={result.emails.length} />
          <CountChip icon={Phone} label="phones" value={result.phones.length} />
          <CountChip icon={MessageCircle} label="WhatsApp" value={result.whatsapp.length} />
          <CountChip icon={Users} label="social" value={result.social.length} />
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <Button
            variant="primary"
            size="sm"
            icon={Save}
            className="flex-1"
            loading={saving}
            onClick={onSave}
          >
            Save lead
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={FileSpreadsheet}
            loading={exporting}
            onClick={() => onExport('csv')}
            title="Export current results as CSV"
          >
            CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={FileJson}
            onClick={() => onExport('json')}
            title="Export current results as JSON"
          >
            JSON
          </Button>
        </div>
      </div>

      {result.warnings.length > 0 ? (
        <div className="rounded-xl border border-border bg-surface p-2.5">
          <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.09em] text-muted">
            <AlertTriangle className="h-3 w-3 text-[#f59e0b]" />
            Notes
          </p>
          <ul className="mt-1.5 space-y-1">
            {result.warnings.map((warning) => (
              <li key={warning.code + warning.message} className="text-[10.5px] leading-relaxed text-muted">
                • {warning.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Section title="Business Information" icon={Building2} count={businessCount}>
        {businessCount === 0 ? <NoneFound /> : null}
        {result.business.companyName ? (
          <ResultRow
            icon={Building2}
            caption="Company name"
            value={result.business.companyName}
            sources={result.business.companyNameSource ? [result.business.companyNameSource] : ['metadata']}
            onRemove={() => onRemove('companyName', result.business.companyName)}
          />
        ) : null}
        {result.business.description ? (
          <ResultRow
            icon={FileText}
            caption="Description"
            value={result.business.description}
            sources={result.business.descriptionSource ? [result.business.descriptionSource] : ['metadata']}
            clamp
            onRemove={() => onRemove('description', result.business.description)}
          />
        ) : null}
        {result.business.logoUrl ? (
          <ResultRow
            icon={ImageIcon}
            caption="Logo"
            value={result.business.logoUrl}
            sources={result.business.logoSource ? [result.business.logoSource] : ['metadata']}
            preview
            onRemove={() => onRemove('logo', result.business.logoUrl)}
          />
        ) : null}
        {result.business.addresses.map((item) => (
          <ResultRow
            key={item.value}
            icon={MapPin}
            caption="Address"
            value={item.value}
            sources={item.sources}
            link={item.link}
            onRemove={() => onRemove('address', item.value)}
          />
        ))}
        {result.business.contactPages.map((item) => (
          <ResultRow
            key={item.value}
            icon={Link2}
            caption="Contact page"
            value={item.value}
            sources={item.sources}
            link={item.value}
            onRemove={() => onRemove('contactPage', item.value)}
          />
        ))}
      </Section>

      <Section title="Email Addresses" icon={Mail} count={result.emails.length}>
        {result.emails.length === 0 ? <NoneFound /> : null}
        {result.emails.map((item) => (
          <ResultRow
            key={item.value}
            icon={Mail}
            value={item.value}
            sources={item.sources}
            link={item.link}
            onRemove={() => onRemove('email', item.value)}
          />
        ))}
      </Section>

      <Section title="Phone Numbers" icon={Phone} count={result.phones.length}>
        {result.phones.length === 0 ? <NoneFound /> : null}
        {result.phones.map((item) => (
          <ResultRow
            key={item.value}
            icon={Phone}
            value={item.value}
            sources={item.sources}
            link={item.link}
            onRemove={() => onRemove('phone', item.value)}
          />
        ))}
      </Section>

      <Section title="WhatsApp" icon={MessageCircle} count={result.whatsapp.length}>
        {result.whatsapp.length === 0 ? <NoneFound /> : null}
        {result.whatsapp.map((item) => (
          <ResultRow
            key={item.value}
            icon={MessageCircle}
            value={item.value}
            sources={item.sources}
            link={item.link}
            onRemove={() => onRemove('whatsapp', item.value)}
          />
        ))}
      </Section>

      <Section title="Social Media" icon={Users} count={result.social.length}>
        {result.social.length === 0 ? <NoneFound /> : null}
        {result.social.map((profile) => {
          const Icon = SOCIAL_ICONS[profile.platform];
          return (
            <ResultRow
              key={profile.url}
              icon={Icon}
              caption={SOCIAL_PLATFORM_LABELS[profile.platform]}
              value={profile.url}
              sources={profile.sources}
              link={profile.url}
              onRemove={() => onRemove('social', profile.url)}
            />
          );
        })}
      </Section>

      <Section title="Website Information" icon={Globe} count={websiteCount}>
        {websiteCount === 0 ? <NoneFound /> : null}
        {result.website.url ? (
          <ResultRow
            icon={Globe}
            caption="Website URL"
            value={result.website.url}
            sources={['visible']}
            link={result.website.url}
            onRemove={undefined}
          />
        ) : null}
        {result.website.title ? (
          <ResultRow
            icon={FileText}
            caption="Page title"
            value={result.website.title}
            sources={['metadata']}
            onRemove={() => onRemove('websiteTitle', result.website.title)}
          />
        ) : null}
        {result.website.metaDescription ? (
          <ResultRow
            icon={AlignLeft}
            caption="Meta description"
            value={result.website.metaDescription}
            sources={['metadata']}
            clamp
            onRemove={() => onRemove('websiteDescription', result.website.metaDescription)}
          />
        ) : null}
        {result.website.siteName ? (
          <ResultRow
            icon={Building2}
            caption="Site name"
            value={result.website.siteName}
            sources={['metadata']}
            onRemove={() => onRemove('siteName', result.website.siteName)}
          />
        ) : null}
        {result.website.faviconUrl ? (
          <ResultRow
            icon={ImageIcon}
            caption="Favicon"
            value={result.website.faviconUrl}
            sources={['metadata']}
            preview
            onRemove={() => onRemove('favicon', result.website.faviconUrl)}
          />
        ) : null}
      </Section>
    </div>
  );
}
