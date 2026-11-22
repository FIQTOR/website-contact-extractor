import type {
  ExtractionResult,
  ExtractionWarning,
  ExtractedItem,
  PageSnapshot,
  SocialPlatform,
  SocialProfile,
  SourceType
} from '../../types';
import { createId } from '../utils/id';
import { cleanWhitespace, normalizeWhitespaceKey } from '../utils/text';
import { absoluteUrl, getDomain, isSameSite, normalizeUrlKey, safeUrl } from '../utils/url';
import { addressesFromBlocks, cleanAddress, extractAddressesFromText, isPlausibleAddress } from './address';
import { EvidenceCollector, mergeSocial, preferInternational, sortBySourcePriority } from './collector';
import {
  candidatesFromUrls,
  findContactPageCandidates,
  type ContactPageCandidate
} from './contactPages';
import { deobfuscateEmails, extractCloudflareEmails, extractEmails, normalizeEmail } from './email';
import { parseJsonLd } from './jsonld';
import { extractPhones, normalizePhone, phoneKey, telLink } from './phone';
import { GENERIC_TITLE_SEGMENTS, CONTACT_PATH_RE, ABOUT_PATH_RE, LOCATION_PATH_RE } from './patterns';
import { socialProfile } from './social';
import { findWhatsAppInText, parseWhatsAppHref } from './whatsapp';

export interface AnalyzeParams {
  main: PageSnapshot;
  extras: PageSnapshot[];
  tabId: number;
  startedAt: number;
  extraWarnings: string[];
}

const SOCIALS: SocialPlatform[] = ['instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'twitter'];

function sourcesFor(found: SourceType, fromExtraPage: boolean): SourceType[] {
  const sources: SourceType[] = [found];
  if (fromExtraPage) sources.push('contact-link');
  return sources;
}

function mapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function whatsappKey(value: string): string {
  if (/^https?:\/\//i.test(value)) return value.toLowerCase();
  return phoneKey(value) || value.toLowerCase();
}

export function cleanTitleName(title: string): string {
  const segments = title
    .split(/\s*[|•·–—]\s*|\s+-\s+|::/g)
    .map((segment) => cleanWhitespace(segment))
    .filter(Boolean);
  const usable = segments.filter((segment) => {
    const lower = segment.toLowerCase();
    if (GENERIC_TITLE_SEGMENTS.has(lower)) return false;
    if (lower.length < 2 || lower.length > 90) return false;
    return true;
  });
  return usable[0] ?? '';
}

function pickName(candidates: ExtractedItem[]): { value: string; source: SourceType | null } {
  for (const item of sortBySourcePriority(candidates)) {
    const value = cleanWhitespace(item.value);
    if (!value || value.length > 120) continue;
    if (GENERIC_TITLE_SEGMENTS.has(value.toLowerCase())) continue;
    return { value, source: item.sources[0] ?? null };
  }
  return { value: '', source: null };
}

function pickDescription(candidates: ExtractedItem[]): { value: string; source: SourceType | null } {
  for (const item of candidates) {
    const value = cleanWhitespace(item.value);
    if (value.length < 20) continue;
    return { value, source: item.sources[0] ?? null };
  }
  return { value: '', source: null };
}

function looksProtected(snapshot: PageSnapshot): boolean {
  const probe = snapshot.visibleText.slice(0, 4000);
  return /just a moment|checking your browser|enable javascript and cookies|verify you are human|captcha|cf-challenge|ddos-guard|attention required|access denied/i.test(
    probe
  );
}

function looksJsRendered(snapshot: PageSnapshot): boolean {
  if (snapshot.visibleText.trim().length >= 300) return false;
  return (
    /<script[\s>]/i.test(snapshot.html) &&
    (/<div[^>]+id=["'](root|app|__next)["'][^>]*>\s*<\/div>/i.test(snapshot.html) ||
      /<noscript[\s>]/i.test(snapshot.html) ||
      snapshot.html.length > 20_000)
  );
}

function contactKindFromUrl(url: string): 'contact' | 'about' | 'location' | null {
  const parsed = safeUrl(url);
  if (!parsed) return null;
  if (CONTACT_PATH_RE.test(parsed.pathname)) return 'contact';
  if (ABOUT_PATH_RE.test(parsed.pathname)) return 'about';
  if (LOCATION_PATH_RE.test(parsed.pathname)) return 'location';
  return null;
}

export function analyzePage(params: AnalyzeParams): ExtractionResult {
  const { main, extras, tabId, startedAt, extraWarnings } = params;

  const emails = new EvidenceCollector((value) => value.toLowerCase());
  const phones = new EvidenceCollector(phoneKey, preferInternational);
  const whatsapp = new EvidenceCollector(whatsappKey);
  const addresses = new EvidenceCollector(normalizeWhitespaceKey);
  const contactPages = new EvidenceCollector((value) => normalizeUrlKey(value));
  const socials = new Map<SocialPlatform, SocialProfile>();

  const nameCandidates: ExtractedItem[] = [];
  const descriptionCandidates: ExtractedItem[] = [];
  const logoCandidates: ExtractedItem[] = [];
  const contactCandidates: Array<ContactPageCandidate & { source: SourceType }> = [];
  const jsonLdUrls: string[] = [];

  const addEmail = (raw: string, source: SourceType, extra: boolean): void => {
    const email = normalizeEmail(raw);
    if (email) emails.add(email, sourcesFor(source, extra), `mailto:${email}`);
  };

  const addPhone = (raw: string, source: SourceType, extra: boolean): void => {
    const phone = normalizePhone(raw);
    if (phone) phones.add(phone, sourcesFor(source, extra), telLink(phone));
  };

  const addAddress = (raw: string, source: SourceType, extra: boolean, trusted = false): void => {
    const address = cleanAddress(raw);
    if (!isPlausibleAddress(address, { trusted })) return;
    addresses.add(address, sourcesFor(source, extra), mapsLink(address));
  };

  const processSnapshot = (snapshot: PageSnapshot, extra: boolean): void => {
    const title = cleanWhitespace(snapshot.title);

    // --- meta tags -------------------------------------------------------
    if (snapshot.metaDescription) {
      descriptionCandidates.push({
        value: snapshot.metaDescription,
        sources: sourcesFor('metadata', extra)
      });
    }
    if (snapshot.siteName) {
      nameCandidates.push({ value: snapshot.siteName, sources: sourcesFor('metadata', extra) });
    }

    for (const meta of snapshot.metas) {
      if (!meta.content) continue;
      if (/email|contact|mail/i.test(meta.key)) {
        for (const email of extractEmails(meta.content)) addEmail(email, 'metadata', extra);
      }
      if (/phone|tel|whatsapp|mobile/i.test(meta.key)) {
        for (const phone of extractPhones(meta.content)) addPhone(phone, 'metadata', extra);
      }
      if (/^og:image(:url)?$/i.test(meta.key) || /^twitter:image$/i.test(meta.key)) {
        logoCandidates.push({ value: meta.content, sources: sourcesFor('metadata', extra) });
      }
      if (/^og:description$/i.test(meta.key)) {
        descriptionCandidates.push({
          value: meta.content,
          sources: sourcesFor('metadata', extra)
        });
      }
    }

    // --- visible text ----------------------------------------------------
    for (const email of extractEmails(snapshot.visibleText)) addEmail(email, 'visible', extra);
    for (const email of deobfuscateEmails(snapshot.visibleText)) addEmail(email, 'visible', extra);
    for (const phone of extractPhones(snapshot.visibleText)) addPhone(phone, 'visible', extra);
    for (const hit of findWhatsAppInText(snapshot.visibleText)) {
      whatsapp.add(hit.value, sourcesFor('visible', extra), hit.link);
    }
    for (const address of extractAddressesFromText(snapshot.visibleText)) {
      addAddress(address, 'visible', extra);
    }
    for (const address of addressesFromBlocks(snapshot.addressBlocks)) {
      addAddress(address, 'visible', extra, true);
    }

    // --- raw HTML --------------------------------------------------------
    for (const email of extractCloudflareEmails(snapshot.html)) addEmail(email, 'metadata', extra);
    for (const email of extractEmails(snapshot.html)) addEmail(email, 'metadata', extra);
    for (const hit of findWhatsAppInText(snapshot.html)) {
      whatsapp.add(hit.value, sourcesFor('metadata', extra), hit.link);
    }

    // --- anchors ---------------------------------------------------------
    for (const link of snapshot.links) {
      const href = link.href;
      if (!href) continue;
      if (/^mailto:/i.test(href)) {
        const recipients = href.slice(7).split('?')[0].split(/[,;]/);
        for (const recipient of recipients) {
          try {
            addEmail(decodeURIComponent(recipient), 'visible', extra);
          } catch {
            addEmail(recipient, 'visible', extra);
          }
        }
        continue;
      }
      if (/^tel:/i.test(href)) {
        addPhone(decodeURIComponent(href.slice(4)), 'visible', extra);
        continue;
      }
      const whatsappHit = parseWhatsAppHref(href);
      if (whatsappHit) {
        whatsapp.add(whatsappHit.value, sourcesFor('visible', extra), whatsappHit.link);
        continue;
      }
      const social = socialProfile(href, sourcesFor('visible', extra));
      if (social) mergeSocial(socials, social);
    }

    // --- JSON-LD ---------------------------------------------------------
    if (snapshot.jsonLd.length) {
      const ld = parseJsonLd(snapshot.jsonLd);
      for (const email of ld.emails) addEmail(email, 'jsonld', extra);
      for (const phone of ld.phones) addPhone(phone, 'jsonld', extra);
      for (const address of ld.addresses) addAddress(address, 'jsonld', extra, true);
      for (const name of ld.businessNames) {
        nameCandidates.push({ value: name, sources: sourcesFor('jsonld', extra) });
      }
      for (const description of ld.descriptions) {
        descriptionCandidates.push({
          value: description,
          sources: sourcesFor('jsonld', extra)
        });
      }
      for (const logo of ld.logos) {
        logoCandidates.push({ value: logo, sources: sourcesFor('jsonld', extra) });
      }
      for (const sameAs of ld.sameAs) {
        const social = socialProfile(sameAs, sourcesFor('jsonld', extra));
        if (social) mergeSocial(socials, social);
      }
      for (const contactUrl of ld.contactUrls) {
        const kind = contactKindFromUrl(contactUrl);
        if (kind) contactCandidates.push({ url: contactUrl, kind, score: 80, source: 'jsonld' });
      }
      jsonLdUrls.push(...ld.urls);
    }

    // --- images ----------------------------------------------------------
    for (const image of snapshot.images) {
      logoCandidates.push({ value: image.src, sources: sourcesFor('visible', extra) });
    }

    // --- title fallback --------------------------------------------------
    const titleName = cleanTitleName(title);
    if (titleName) {
      nameCandidates.push({ value: titleName, sources: sourcesFor('metadata', extra) });
    }
  };

  processSnapshot(main, false);
  for (const extra of extras) processSnapshot(extra, true);

  // Contact page candidates from anchors on the scanned page.
  for (const candidate of findContactPageCandidates(main, 8)) {
    contactCandidates.push({ ...candidate, source: 'visible' });
  }
  for (const candidate of candidatesFromUrls(jsonLdUrls, main.url, 6)) {
    contactCandidates.push({ ...candidate, source: 'jsonld' });
  }

  const contactSeen = new Map<string, ContactPageCandidate & { source: SourceType }>();
  for (const candidate of contactCandidates) {
    if (!candidate.url || !isSameSite(main.url, candidate.url)) continue;
    const key = normalizeUrlKey(candidate.url);
    if (key === normalizeUrlKey(main.url)) continue;
    const existing = contactSeen.get(key);
    if (!existing || candidate.score > existing.score) contactSeen.set(key, candidate);
  }
  const sortedContactPages = Array.from(contactSeen.values()).sort((a, b) => b.score - a.score);
  for (const candidate of sortedContactPages.slice(0, 8)) {
    contactPages.add(
      candidate.url,
      sourcesFor(candidate.source, false),
      candidate.url
    );
  }

  const company = pickName(nameCandidates);
  const description = pickDescription(descriptionCandidates);

  const logo = (() => {
    const seen = new Set<string>();
    for (const candidate of logoCandidates) {
      const raw = candidate.value.trim();
      if (!raw || seen.has(raw)) continue;
      seen.add(raw);
      const absolute = absoluteUrl(raw, main.url);
      if (absolute && /^https?:\/\//i.test(absolute)) {
        return { value: absolute, source: candidate.sources[0] ?? null };
      }
    }
    return { value: main.iconUrl || '', source: main.iconUrl ? ('metadata' as SourceType) : null };
  })();

  const warnings: ExtractionWarning[] = [];
  const totalContacts =
    emails.size + phones.size + whatsapp.size + socials.size + addresses.size + contactPages.size;

  if (totalContacts === 0) {
    warnings.push({
      code: 'no-contacts',
      message:
        'No public contact details were found. The site may only offer a contact form or load details dynamically.'
    });
  }
  if (main.visibleText.trim().length < 200) {
    warnings.push({
      code: 'little-content',
      message:
        'Very little visible text was readable. Content may be rendered by JavaScript or hidden behind an overlay.'
    });
  }
  if (looksJsRendered(main)) {
    warnings.push({
      code: 'js-rendered',
      message:
        'This page looks client-side rendered. Try waiting for the page to finish loading, then scan again.'
    });
  }
  if (looksProtected(main)) {
    warnings.push({
      code: 'protected-page',
      message:
        'The page appears to show a bot-protection or CAPTCHA screen. The extension never bypasses those.'
    });
  }
  for (const warning of extraWarnings) {
    warnings.push({ code: 'extra-pages-failed', message: warning });
  }

  const socialProfiles: SocialProfile[] = SOCIALS.map((platform) => socials.get(platform)).filter(
    (profile): profile is SocialProfile => Boolean(profile)
  );

  const result: ExtractionResult = {
    id: createId('scan'),
    tabId,
    url: main.url,
    domain: getDomain(main.url),
    business: {
      companyName: company.value,
      companyNameSource: company.source,
      description: description.value,
      descriptionSource: description.source,
      addresses: addresses.values(),
      contactPages: contactPages.values(),
      logoUrl: logo.value,
      logoSource: logo.source
    },
    website: {
      url: main.url,
      domain: getDomain(main.url),
      title: cleanWhitespace(main.title),
      metaDescription: cleanWhitespace(main.metaDescription),
      faviconUrl: main.iconUrl,
      siteName: cleanWhitespace(main.siteName),
      language: main.lang
    },
    emails: emails.values(),
    phones: phones.values(),
    whatsapp: whatsapp.values(),
    social: socialProfiles,
    pagesScanned: [main.url, ...extras.map((page) => page.url)],
    warnings,
    scannedAt: Date.now(),
    durationMs: Math.max(0, Date.now() - startedAt)
  };

  return result;
}
