/** Base email matcher. Always run the result through `normalizeEmail`. */
export const EMAIL_RE = /[A-Za-z0-9._%+'\-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,24}/g;

/** File extensions that make an "email" a false positive (e.g. hero@2x.png). */
const BLOCKED_TLDS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'svg',
  'ico',
  'bmp',
  'css',
  'scss',
  'js',
  'mjs',
  'ts',
  'map',
  'json',
  'xml',
  'woff',
  'woff2',
  'ttf',
  'eot',
  'mp4',
  'webm',
  'mp3'
]);

const BLOCKED_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'domain.com',
  'yourdomain.com',
  'your-domain.com',
  'yourcompany.com',
  'email.com',
  'website.com',
  'company.com',
  'sentry.io',
  'wixpress.com',
  'sentry-next.wixpress.com'
]);

const BLOCKED_DOMAIN_SUFFIXES = ['wixpress.com', 'sentry.io', 'sentry-next.wixpress.com'];

export function isBlockedEmailDomain(domain: string): boolean {
  const normalized = domain.toLowerCase();
  if (BLOCKED_DOMAINS.has(normalized)) return true;
  if (BLOCKED_DOMAIN_SUFFIXES.some((suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`))) {
    return true;
  }
  const tld = normalized.split('.').pop() ?? '';
  return BLOCKED_TLDS.has(tld);
}

/** Placeholder words that mean "no real email here". */
export const PLACEHOLDER_LOCAL_PARTS = new Set([
  'youremail',
  'your.email',
  'email',
  'user',
  'username',
  'name',
  'yourname'
]);

export const CONTACT_PATH_RE =
  /(^|[/\-_.])(contact|contact-us|contactus|kontak|hubungi|contacto|contato)([/\-_.]|$)/i;

export const ABOUT_PATH_RE =
  /(^|[/\-_.])(about|about-us|aboutus|tentang|profil|profile|perusahaan|company)([/\-_.]|$)/i;

export const LOCATION_PATH_RE =
  /(^|[/\-_.])(location|locations|lokasi|alamat|our-location|store-locator|find-us|showroom|outlet)([/\-_.]|$)/i;

export const GENERIC_TITLE_SEGMENTS = new Set([
  'home',
  'beranda',
  'welcome',
  'selamat datang',
  'official website',
  'official site',
  'website resmi',
  'contact',
  'contact us',
  'kontak',
  'hubungi kami',
  'about',
  'about us',
  'tentang kami',
  'index'
]);
