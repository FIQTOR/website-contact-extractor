import type { SocialPlatform, SocialProfile } from '../../types';
import { safeUrl } from '../utils/url';

const PLATFORM_HOSTS: Array<{ platform: SocialPlatform; hosts: string[] }> = [
  { platform: 'instagram', hosts: ['instagram.com', 'instagr.am'] },
  { platform: 'facebook', hosts: ['facebook.com', 'fb.com', 'fb.me'] },
  { platform: 'tiktok', hosts: ['tiktok.com'] },
  { platform: 'linkedin', hosts: ['linkedin.com'] },
  { platform: 'youtube', hosts: ['youtube.com', 'youtu.be'] },
  { platform: 'twitter', hosts: ['twitter.com', 'x.com'] }
];

const REJECTED_PATHS: Record<SocialPlatform, RegExp[]> = {
  instagram: [
    /^\/(p|reel|reels|stories|explore|accounts|tv|developer|about|legal|directory|challenge|emails|ar|web)(\/|$)/i
  ],
  facebook: [
    /^\/(sharer|share|dialog|plugins|login|help|policies|privacy|tr|events|groups|watch|marketplace|business\/help)(\/|$)/i
  ],
  tiktok: [/^\/(video|share|music|tag|discover|foryou|embed|legal|about|login|signup)(\/|$)/i],
  linkedin: [/^\/(shareArticle|sharing|feed|posts|pulse|learning|help|legal|login|signup)(\/|$)/i],
  youtube: [
    /^\/(watch|shorts|playlist|results|embed|feed|about|account|reporthistory|signin|premium)(\/|$)/i
  ],
  twitter: [
    /^\/(intent|share|home|i|hashtag|search|explore|settings|login|signup|tos|privacy|messages|notifications|compose|account|ads|business|download|communities)(\/|$)/i
  ]
};

const TWITTER_RESERVED = new Set([
  'intent',
  'share',
  'home',
  'i',
  'hashtag',
  'search',
  'explore',
  'settings',
  'login',
  'signup',
  'tos',
  'privacy',
  'messages',
  'notifications',
  'compose',
  'account',
  'ads',
  'business',
  'download',
  'communities'
]);

function withProtocol(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\//i.test(trimmed)) return `https://${trimmed.replace(/^www\./i, '')}`;
  return trimmed;
}

export interface SocialMatch {
  platform: SocialPlatform;
  url: string;
}

/** Detect a social profile URL. Returns null for shares, posts and homepages. */
export function detectSocialProfile(href: string): SocialMatch | null {
  const cleanedHref = withProtocol(href);
  const url = safeUrl(cleanedHref);
  if (!url) return null;

  const host = url.hostname.replace(/^www\./i, '').toLowerCase();
  const entry = PLATFORM_HOSTS.find((candidate) => candidate.hosts.includes(host));
  if (!entry) return null;

  const path = url.pathname.replace(/\/+$/, '');
  if (!path || path === '') return null;
  if (REJECTED_PATHS[entry.platform].some((re) => re.test(path))) return null;

  if (entry.platform === 'tiktok' && !path.startsWith('/@')) return null;
  if (entry.platform === 'youtube') {
    if (host === 'youtu.be') return null;
    if (!/^\/(@[\w.-]+|channel\/[\w-]+|c\/[\w.-]+|user\/[\w.-]+)$/i.test(path)) return null;
  }
  if (entry.platform === 'linkedin') {
    if (!/^\/(company|in|school|showcase)\/[\w%.-]+/i.test(path)) return null;
  }
  if (entry.platform === 'twitter') {
    const handle = path.slice(1).split('/')[0].toLowerCase();
    if (!handle || TWITTER_RESERVED.has(handle)) return null;
  }
  if (entry.platform === 'instagram') {
    if (path.slice(1).includes('/')) return null;
  }
  if (entry.platform === 'facebook') {
    if (/^\/(profile\.php)$/i.test(path) && !url.searchParams.get('id')) return null;
  }

  const normalized = new URL(url.toString());
  normalized.hash = '';
  normalized.hostname = host;
  normalized.pathname = path;
  if (entry.platform === 'facebook' && /^\/profile\.php$/i.test(path)) {
    const id = normalized.searchParams.get('id');
    normalized.search = id ? `?id=${encodeURIComponent(id)}` : '';
  } else {
    normalized.search = '';
  }
  return { platform: entry.platform, url: normalized.toString() };
}

export function socialProfile(href: string, sources: SocialProfile['sources']): SocialProfile | null {
  const match = detectSocialProfile(href);
  return match ? { ...match, sources: [...sources] } : null;
}
