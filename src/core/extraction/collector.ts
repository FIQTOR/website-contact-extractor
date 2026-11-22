import type { ExtractedItem, SocialPlatform, SocialProfile, SourceType } from '../../types';

export type PreferFn = (nextValue: string, currentValue: string) => boolean;

/** Collects unique values while merging their evidence sources. */
export class EvidenceCollector {
  private readonly items = new Map<string, ExtractedItem>();

  constructor(
    private readonly keyOf: (value: string) => string,
    private readonly prefer?: PreferFn
  ) {}

  add(value: string, sources: SourceType[], link?: string): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = this.keyOf(trimmed);
    if (!key) return;

    const existing = this.items.get(key);
    if (!existing) {
      const item: ExtractedItem = { value: trimmed, sources: [...new Set(sources)] };
      if (link) item.link = link;
      this.items.set(key, item);
      return;
    }

    if (this.prefer?.(trimmed, existing.value)) existing.value = trimmed;
    if (link && !existing.link) existing.link = link;
    for (const source of sources) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
    }
  }

  addItem(item: ExtractedItem): void {
    this.add(item.value, item.sources, item.link);
  }

  get size(): number {
    return this.items.size;
  }

  values(): ExtractedItem[] {
    return Array.from(this.items.values());
  }
}

export function preferInternational(nextValue: string, currentValue: string): boolean {
  return nextValue.startsWith('+') && !currentValue.startsWith('+');
}

export function mergeSocial(
  map: Map<SocialPlatform, SocialProfile>,
  profile: SocialProfile
): void {
  const existing = map.get(profile.platform);
  if (!existing) {
    map.set(profile.platform, { ...profile, sources: [...new Set(profile.sources)] });
    return;
  }
  for (const source of profile.sources) {
    if (!existing.sources.includes(source)) existing.sources.push(source);
  }
  // Prefer a clean profile URL over a deeper one (e.g. /username over /username/posts).
  if (profile.url.length < existing.url.length) existing.url = profile.url;
}

export function sortBySourcePriority(items: ExtractedItem[]): ExtractedItem[] {
  const priority: Record<SourceType, number> = {
    jsonld: 0,
    metadata: 1,
    visible: 2,
    'contact-link': 3
  };
  return [...items].sort((a, b) => {
    const aScore = Math.min(...a.sources.map((source) => priority[source]));
    const bScore = Math.min(...b.sources.map((source) => priority[source]));
    return aScore - bScore;
  });
}
