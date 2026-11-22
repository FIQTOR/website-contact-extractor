import { useEffect, useState, type ReactNode } from 'react';
import { Copy, ExternalLink, MapPin, Save, Trash2 } from 'lucide-react';
import type { Lead, LeadSocialMedia } from '../../../types';
import { EMPTY_SOCIAL_MEDIA, SOCIAL_PLATFORM_LABELS } from '../../../types';
import { formatDateTime } from '../../../core/utils/date';
import { normalizeEmail } from '../../../core/extraction/email';
import { normalizePhone } from '../../../core/extraction/phone';
import { leadSummary } from '../../../core/services/storage';
import { ensureHttpUrl } from '../../../core/utils/url';
import { copyText, openExternal } from '../../lib/browser';
import { useToast } from '../../hooks/useToast';
import { Button } from '../Button';
import { ConfirmDialog } from '../ConfirmDialog';
import { Modal } from '../Modal';
import { cn } from '../../lib/cn';

interface FormState {
  companyName: string;
  website: string;
  contactPage: string;
  address: string;
  description: string;
  notes: string;
  tags: string;
  emails: string;
  phones: string;
  whatsapp: string;
  social: LeadSocialMedia;
}

function toForm(lead: Lead): FormState {
  return {
    companyName: lead.companyName,
    website: lead.website,
    contactPage: lead.contactPage,
    address: lead.address,
    description: lead.description,
    notes: lead.notes,
    tags: lead.tags.join(', '),
    emails: lead.emails.join('\n'),
    phones: lead.phones.join('\n'),
    whatsapp: lead.whatsapp.join('\n'),
    social: { ...lead.socialMedia }
  };
}

function splitLines(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="wce-label">{label}</span>
      <div className={cn('mt-1')}>{children}</div>
      {hint ? <span className="mt-0.5 block text-[9px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function LeadEditorModal({
  lead,
  onClose,
  onSave,
  onDelete
}: {
  lead: Lead;
  onClose: () => void;
  onSave: (patch: Partial<Lead>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { push } = useToast();
  const [form, setForm] = useState<FormState>(() => toForm(lead));
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setForm(toForm(lead));
  }, [lead]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleCopySummary() {
    const copied = await copyText(leadSummary(lead));
    push(copied ? 'Lead summary copied.' : 'Could not copy the summary.', copied ? 'success' : 'error');
  }

  async function handleSave() {
    const rawWebsite = form.website.trim();
    const website = rawWebsite ? ensureHttpUrl(rawWebsite) : '';
    if (rawWebsite && !website) {
      push('Website must be a valid domain or http(s) URL.', 'error');
      return;
    }
    const rawContactPage = form.contactPage.trim();
    const contactPage = rawContactPage ? ensureHttpUrl(rawContactPage) : '';
    if (rawContactPage && !contactPage) {
      push('Contact page must be a valid URL.', 'error');
      return;
    }

    const emailEntries = splitLines(form.emails);
    const invalidEmail = emailEntries.find((entry) => !normalizeEmail(entry));
    if (invalidEmail) {
      push(`"${invalidEmail}" is not a valid email address.`, 'error');
      return;
    }
    const phoneEntries = splitLines(form.phones);
    const invalidPhone = phoneEntries.find((entry) => !normalizePhone(entry));
    if (invalidPhone) {
      push(`"${invalidPhone}" is not a valid phone number.`, 'error');
      return;
    }

    const emails = emailEntries.map((entry) => normalizeEmail(entry)).filter(Boolean) as string[];
    const phones = phoneEntries.map((entry) => normalizePhone(entry)).filter(Boolean) as string[];
    const whatsapp = splitLines(form.whatsapp).map((entry) => normalizePhone(entry) ?? entry);
    const tags = Array.from(
      new Set(
        form.tags
          .split(',')
          .map((tag) => tag.trim().replace(/^#/, ''))
          .filter(Boolean)
      )
    );

    const patch: Partial<Lead> = {
      companyName: form.companyName.trim(),
      website,
      contactPage,
      address: form.address.trim(),
      description: form.description.trim(),
      notes: form.notes.trim(),
      tags,
      emails: Array.from(new Set(emails)),
      phones: Array.from(new Set(phones)),
      whatsapp: Array.from(new Set(whatsapp)),
      socialMedia: { ...EMPTY_SOCIAL_MEDIA, ...form.social }
    };

    setBusy(true);
    try {
      await onSave(patch);
    } catch (caught) {
      push(caught instanceof Error ? caught.message : 'Could not save the lead.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await onDelete();
    } catch (caught) {
      push(caught instanceof Error ? caught.message : 'Could not delete the lead.', 'error');
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <Modal
        open
        title={lead.companyName || 'Lead details'}
        subtitle={`Saved ${formatDateTime(lead.extractedAt)} · ${lead.source === 'import' ? 'Imported' : 'Extracted'}`}
        onClose={onClose}
        footer={
          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="danger"
              icon={Trash2}
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
            >
              Delete
            </Button>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" icon={Save} loading={busy} onClick={() => void handleSave()}>
                Save changes
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {lead.website ? (
              <Button
                size="xs"
                variant="secondary"
                icon={ExternalLink}
                onClick={() => openExternal(lead.website)}
              >
                Website
              </Button>
            ) : null}
            {lead.googleMapsUrl ? (
              <Button
                size="xs"
                variant="secondary"
                icon={MapPin}
                onClick={() => openExternal(lead.googleMapsUrl ?? '')}
              >
                Maps
              </Button>
            ) : null}
            <Button size="xs" variant="ghost" icon={Copy} onClick={() => void handleCopySummary()}>
              Copy summary
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Company name">
              <input
                className="wce-input"
                value={form.companyName}
                onChange={(event) => update('companyName', event.target.value)}
                placeholder="Business name"
              />
            </Field>
            <Field label="Website">
              <input
                className="wce-input"
                value={form.website}
                onChange={(event) => update('website', event.target.value)}
                placeholder="https://example.com"
              />
            </Field>
          </div>

          <Field label="Contact page">
            <input
              className="wce-input"
              value={form.contactPage}
              onChange={(event) => update('contactPage', event.target.value)}
              placeholder="https://example.com/contact"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Emails" hint="One per line">
              <textarea
                className="wce-input h-[58px] resize-none leading-snug"
                value={form.emails}
                onChange={(event) => update('emails', event.target.value)}
                placeholder="hello@company.com"
              />
            </Field>
            <Field label="Phones" hint="One per line">
              <textarea
                className="wce-input h-[58px] resize-none leading-snug"
                value={form.phones}
                onChange={(event) => update('phones', event.target.value)}
                placeholder="+62 812 3456 7890"
              />
            </Field>
          </div>

          <Field label="WhatsApp" hint="Phone numbers or wa.me links">
            <textarea
              className="wce-input h-[58px] resize-none leading-snug"
              value={form.whatsapp}
              onChange={(event) => update('whatsapp', event.target.value)}
              placeholder="+62 812 3456 7890"
            />
          </Field>

          <Field label="Address">
            <textarea
              className="wce-input h-[52px] resize-none leading-snug"
              value={form.address}
              onChange={(event) => update('address', event.target.value)}
              placeholder="Street, city, postal code"
            />
          </Field>

          <Field label="Description">
            <textarea
              className="wce-input h-[58px] resize-none leading-snug"
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="What the business does"
            />
          </Field>

          <div>
            <p className="wce-label">Social media</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(Object.keys(EMPTY_SOCIAL_MEDIA) as Array<keyof LeadSocialMedia>).map((platform) => (
                <Field key={platform} label={SOCIAL_PLATFORM_LABELS[platform]}>
                  <input
                    className="wce-input h-8 py-1 text-[11px]"
                    value={form.social[platform]}
                    onChange={(event) =>
                      update('social', { ...form.social, [platform]: event.target.value })
                    }
                    placeholder="https://"
                  />
                </Field>
              ))}
            </div>
          </div>

          <Field label="Notes">
            <textarea
              className="wce-input h-[58px] resize-none leading-snug"
              value={form.notes}
              onChange={(event) => update('notes', event.target.value)}
              placeholder="Follow-up context, next steps…"
            />
          </Field>

          <Field label="Tags" hint="Comma separated">
            <input
              className="wce-input"
              value={form.tags}
              onChange={(event) => update('tags', event.target.value)}
              placeholder="restaurant, bali, hot lead"
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this lead?"
        description="The lead and its notes will be removed from local storage. This cannot be undone."
        confirmLabel="Delete lead"
        busy={busy}
        onConfirm={() => void handleDelete()}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
