export const BASE_TAGS = [
  'Travel',
  'Hotel',
  'Flight',
  '攻略',
  '签证',
  '美食',
  '预算',
  '周末',
] as const;

const BASE_TAG_SET = new Set<string>(BASE_TAGS);

const KEYWORDS: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: 'Travel', patterns: [/travel/i, /trip/i, /tour/i, /旅游/] },
  { tag: 'Hotel', patterns: [/hotel/i, /resort/i, /民宿/, /酒店/] },
  { tag: 'Flight', patterns: [/flight/i, /airline/i, /机票/, /航班/] },
  { tag: '攻略', patterns: [/攻略/, /guide/i, /plan/i] },
  { tag: '签证', patterns: [/签证/, /visa/i] },
  { tag: '美食', patterns: [/美食/, /food/i, /餐厅/, /restaurant/i] },
  { tag: '预算', patterns: [/预算/, /省钱/, /折扣/, /deal/i, /price/i] },
  { tag: '周末', patterns: [/周末/, /weekend/i] },
];

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
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
    return arr.filter((v) => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function encodeTags(tags: string[]): string {
  const unique = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));
  return JSON.stringify(unique);
}

export function isBaseTag(tag: string): boolean {
  return BASE_TAG_SET.has(tag);
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
