/** Where a piece of information was found. Shown as a label in the dashboard. */
export type SourceType = 'visible' | 'metadata' | 'jsonld' | 'contact-link';

export const SOURCE_LABELS: Record<SourceType, string> = {
  visible: 'Visible page content',
  metadata: 'HTML metadata',
  jsonld: 'JSON-LD',
  'contact-link': 'Contact link'
};

/** A single extracted value plus every source it was seen in. */
export interface ExtractedItem {
  value: string;
  sources: SourceType[];
  /** Optional clickable target (mailto:, tel:, wa.me, maps...). */
  link?: string;
}

export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'linkedin'
  | 'youtube'
  | 'twitter';

export interface SocialProfile {
  platform: SocialPlatform;
  url: string;
  sources: SourceType[];
}

export interface ExtractionWarning {
  code:
    | 'no-contacts'
    | 'little-content'
    | 'js-rendered'
    | 'protected-page'
    | 'extra-pages-failed'
    | 'extra-pages-partial';
  message: string;
}

/** Raw, serialisable page data collected by the content script. */
export interface PageSnapshot {
  url: string;
  title: string;
  lang: string;
  metaDescription: string;
  siteName: string;
  visibleText: string;
  html: string;
  jsonLd: unknown[];
  links: SnapshotLink[];
  images: SnapshotImage[];
  metas: SnapshotMeta[];
  addressBlocks: string[];
  iconUrl: string;
  capturedAt: number;
}

export interface SnapshotLink {
  href: string;
  text: string;
  rel: string;
}

export interface SnapshotImage {
  src: string;
  alt: string;
  /** class/id/alt hints, used to guess a logo. */
  hint: string;
}

export interface SnapshotMeta {
  key: string;
  content: string;
}

export interface BusinessInformation {
  companyName: string;
  companyNameSource: SourceType | null;
  description: string;
  descriptionSource: SourceType | null;
  addresses: ExtractedItem[];
  contactPages: ExtractedItem[];
  logoUrl: string;
  logoSource: SourceType | null;
}

export interface WebsiteInformation {
  url: string;
  domain: string;
  title: string;
  metaDescription: string;
  faviconUrl: string;
  siteName: string;
  language: string;
}

export interface ExtractionResult {
  id: string;
  tabId: number;
  url: string;
  domain: string;
  business: BusinessInformation;
  website: WebsiteInformation;
  emails: ExtractedItem[];
  phones: ExtractedItem[];
  whatsapp: ExtractedItem[];
  social: SocialProfile[];
  pagesScanned: string[];
  warnings: ExtractionWarning[];
  scannedAt: number;
  durationMs: number;
}

export interface LeadSocialMedia {
  instagram: string;
  facebook: string;
  tiktok: string;
  linkedin: string;
  youtube: string;
  twitter: string;
}

export type LeadSource = 'extract' | 'import';

export interface Lead {
  id: string;
  companyName: string;
  website: string;
  emails: string[];
  phones: string[];
  whatsapp: string[];
  socialMedia: LeadSocialMedia;
  address: string;
  description: string;
  contactPage: string;
  extractedAt: string;
  notes: string;
  tags: string[];
  source: LeadSource;
  googleMapsUrl?: string;
  logoUrl?: string;
}

export type ThemePreference = 'dark' | 'light' | 'system';
export type ExportFormat = 'csv' | 'json';

export interface Settings {
  theme: ThemePreference;
  defaultExportFormat: ExportFormat;
  maxScanPages: number;
  scanExtraPages: boolean;
}

export const EMPTY_SOCIAL_MEDIA: LeadSocialMedia = {
  instagram: '',
  facebook: '',
  tiktok: '',
  linkedin: '',
  youtube: '',
  twitter: ''
};

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  twitter: 'X / Twitter'
};
