export interface JsonLdData {
  businessNames: string[];
  descriptions: string[];
  emails: string[];
  phones: string[];
  addresses: string[];
  logos: string[];
  sameAs: string[];
  urls: string[];
  contactUrls: string[];
}

const ORG_TYPES = new Set([
  'organization',
  'localbusiness',
  'corporation',
  'store',
  'restaurant',
  'hotel',
  'lodgingbusiness',
  'medicalbusiness',
  'professionalservice',
  'homeandconstructionbusiness',
  'automotivebusiness',
  'financialservice',
  'realestateagent',
  'travelagency',
  'educationalorganization',
  'ngo',
  'governmentorganization',
  'sportsorganization',
  'entertainmentbusiness',
  'foodestablishment',
  'healthandbeautybusiness',
  'legalservice',
  'plumber',
  'electrician',
  'dentist',
  'physician',
  'veterinarycare',
  'onlinestore'
]);

const WEBSITE_TYPES = new Set(['website', 'webpage']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function toStringValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (isRecord(value)) {
    const nested = value['@value'] ?? value.name ?? value.url;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }
  return null;
}

function typeNames(node: Record<string, unknown>): string[] {
  return asArray(node['@type'])
    .map((type) => (typeof type === 'string' ? type.toLowerCase().replace(/\s/g, '') : ''))
    .filter(Boolean);
}

function firstString(node: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = toStringValue(node[key]);
    if (value) return value;
  }
  return null;
}

export function formatPostalAddress(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.replace(/\s+/g, ' ').trim();
    return trimmed.length >= 6 ? trimmed : null;
  }
  if (!isRecord(value)) return null;

  const country = (() => {
    const rawCountry = value.addressCountry;
    if (typeof rawCountry === 'string') return rawCountry.trim();
    if (isRecord(rawCountry)) {
      const name = rawCountry.name;
      return typeof name === 'string' ? name.trim() : '';
    }
    return '';
  })();

  const parts = [
    firstString(value, ['streetAddress', 'addressLine1', 'addressLine']),
    firstString(value, ['addressLine2', 'postOfficeBoxNumber']),
    firstString(value, ['addressLocality', 'addressCity', 'city']),
    firstString(value, ['addressRegion', 'addressState', 'region']),
    firstString(value, ['postalCode', 'zipCode', 'postcode']),
    country
  ].filter((part): part is string => Boolean(part));

  const unique = parts.filter((part, index) => parts.indexOf(part) === index);
  const line = unique.join(', ').replace(/\s+,/g, ',').replace(/,\s*,/g, ',').trim();
  return line.length >= 6 ? line : null;
}

function collectLogo(value: unknown, output: string[]): void {
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectLogo(entry, output));
    return;
  }
  if (isRecord(value)) {
    const url = firstString(value, ['url', 'contentUrl', '@id']);
    if (url && /^https?:\/\//i.test(url)) output.push(url);
  }
}

function collectContactPoint(value: unknown, data: JsonLdData): void {
  for (const point of asArray(value)) {
    if (!isRecord(point)) continue;
    const email = toStringValue(point.email);
    if (email) data.emails.push(email);
    const phone = toStringValue(point.telephone);
    if (phone) data.phones.push(phone);
    const contactUrl = toStringValue(point.url);
    if (contactUrl) data.contactUrls.push(contactUrl);
  }
}

/** Walk any JSON-LD payload (including @graph) and gather business evidence. */
export function parseJsonLd(nodes: unknown[]): JsonLdData {
  const data: JsonLdData = {
    businessNames: [],
    descriptions: [],
    emails: [],
    phones: [],
    addresses: [],
    logos: [],
    sameAs: [],
    urls: [],
    contactUrls: []
  };

  const allRecords: Record<string, unknown>[] = [];

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isRecord(node)) return;
    allRecords.push(node);
    if (node['@graph'] !== undefined) visit(node['@graph']);
    for (const key of ['mainEntity', 'mainEntityOfPage', 'publisher', 'parentOrganization']) {
      if (node[key] !== undefined) visit(node[key]);
    }
  };

  nodes.forEach(visit);

  const isOrganization = (node: Record<string, unknown>): boolean => {
    const types = typeNames(node);
    return types.some((type) =>
      /(business|store|shop|restaurant|cafe|agency|organization)$/.test(type) || ORG_TYPES.has(type)
    );
  };

  for (const node of allRecords) {
    const types = typeNames(node);
    if (types.some((type) => WEBSITE_TYPES.has(type))) {
      const name = firstString(node, ['name']);
      if (name) data.businessNames.push(name);
    }

    if (isOrganization(node)) {
      const name = firstString(node, ['legalName', 'name']);
      if (name) data.businessNames.push(name);
      const description = firstString(node, ['description']);
      if (description) data.descriptions.push(description);
      const url = firstString(node, ['url', '@id']);
      if (url) data.urls.push(url);
      const logo = node.logo ?? node.image;
      if (logo) collectLogo(logo, data.logos);
    }

    const email = toStringValue(node.email);
    if (email) data.emails.push(email);
    const phone = toStringValue(node.telephone);
    if (phone) data.phones.push(phone);
    if (node.contactPoint !== undefined) collectContactPoint(node.contactPoint, data);

    if (node.address !== undefined) {
      for (const address of asArray(node.address)) {
        const formatted = formatPostalAddress(address);
        if (formatted) data.addresses.push(formatted);
      }
    }

    for (const link of asArray(node.sameAs)) {
      const value = toStringValue(link);
      if (value) data.sameAs.push(value);
    }
  }

  return data;
}
