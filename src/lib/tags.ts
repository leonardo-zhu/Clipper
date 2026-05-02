export const BASE_TAGS = [
  '目的地',
  '酒店',
  '机票',
  '攻略',
  '签证',
  '美食',
  '预算',
  '周末',
] as const;

const BASE_TAG_SET = new Set<string>(BASE_TAGS);

const KEYWORDS: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: '目的地', patterns: [/travel/i, /trip/i, /tour/i, /旅游/, /城市/, /目的地/] },
  { tag: '酒店', patterns: [/hotel/i, /resort/i, /民宿/, /酒店/, /住宿/] },
  { tag: '机票', patterns: [/flight/i, /airline/i, /机票/, /航班/] },
  { tag: '攻略', patterns: [/攻略/, /guide/i, /plan/i] },
  { tag: '签证', patterns: [/签证/, /visa/i] },
  { tag: '美食', patterns: [/美食/, /food/i, /餐厅/, /restaurant/i] },
  { tag: '预算', patterns: [/预算/, /省钱/, /折扣/, /deal/i, /price/i] },
  { tag: '周末', patterns: [/周末/, /weekend/i] },
];

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function canonicalTag(tag: string): string {
  return normalize(tag).toLowerCase();
}

export function generateBaseTags(input: { title?: string | null; description?: string | null; source?: string | null }): string[] {
  const text = normalize(`${input.title ?? ''} ${input.description ?? ''} ${input.source ?? ''}`);
  if (!text) return [];

  const tags: string[] = [];
  for (const item of KEYWORDS) {
    if (item.patterns.some((re) => re.test(text))) {
      tags.push(item.tag);
    }
  }

  return Array.from(new Set(tags)).slice(0, 4);
}

export function parseTags(tagsJson: string | null | undefined): string[] {
  if (!tagsJson) return [];
  try {
    const arr = JSON.parse(tagsJson);
    if (!Array.isArray(arr)) return [];
    const dedup = new Map<string, string>();
    for (const raw of arr) {
      if (typeof raw !== 'string') continue;
      const cleaned = normalize(raw);
      if (!cleaned) continue;
      const key = canonicalTag(cleaned);
      if (!dedup.has(key)) dedup.set(key, cleaned);
    }
    return Array.from(dedup.values());
  } catch {
    return [];
  }
}

export function encodeTags(tags: string[]): string {
  const dedup = new Map<string, string>();
  for (const raw of tags) {
    const cleaned = normalize(raw);
    if (!cleaned) continue;
    const key = canonicalTag(cleaned);
    if (!dedup.has(key)) dedup.set(key, cleaned);
  }
  const unique = Array.from(dedup.values());
  return JSON.stringify(unique);
}

export function isBaseTag(tag: string): boolean {
  if (BASE_TAG_SET.has(tag)) return true;
  const canonical = canonicalTag(tag);
  for (const item of BASE_TAG_SET) {
    if (canonicalTag(item) === canonical) return true;
  }
  return false;
}

export function splitTags(tags: string[]): { base: string[]; ai: string[] } {
  const base: string[] = [];
  const ai: string[] = [];
  for (const tag of tags) {
    if (isBaseTag(tag)) base.push(tag);
    else ai.push(tag);
  }
  return { base, ai };
}

export function topTagsFromTagSets(tagSets: string[][], limit = 8): string[] {
  const count = new Map<string, { value: string; hit: number }>();
  for (const tags of tagSets) {
    for (const tag of tags) {
      const cleaned = normalize(tag);
      if (!cleaned) continue;
      const key = canonicalTag(cleaned);
      const current = count.get(key);
      if (current) {
        current.hit += 1;
      } else {
        count.set(key, { value: cleaned, hit: 1 });
      }
    }
  }
  return Array.from(count.values())
    .sort((a, b) => b.hit - a.hit)
    .map((item) => item.value)
    .slice(0, limit);
}
