export const BASE_TAGS = [
  'default',
  'design',
  'tech',
] as const;

export type BaseTagId = (typeof BASE_TAGS)[number];

const BASE_TAG_SET = new Set<string>(BASE_TAGS);

const KEYWORDS: Array<{ tag: BaseTagId; patterns: RegExp[] }> = [
  {
    tag: 'design',
    patterns: [
      /design/i,
      /ui/i,
      /ux/i,
      /figma/i,
      /视觉/,
      /交互/,
      /排版/,
      /品牌/,
      /设计/,
    ],
  },
  {
    tag: 'tech',
    patterns: [
      /tech/i,
      /engineering/i,
      /programming/i,
      /coding/i,
      /ai/i,
      /llm/i,
      /prompt/i,
      /cache/i,
      /架构/,
      /工程/,
      /算法/,
      /开发/,
      /技术/,
    ],
  },
  {
    tag: 'default',
    patterns: [
      /newsletter/i,
      /weekly/i,
      /digest/i,
      /brief/i,
      /update/i,
      /快报/,
      /周报/,
      /月报/,
      /通讯/,
    ],
  },
];

const TAG_ALIAS_TO_ID: Record<string, BaseTagId> = {
  default: 'default',
  design: 'design',
  tech: 'tech',
  newsletter: 'default',
  designs: 'design',
  默认: 'default',
  通用: 'default',
  技术: 'tech',
  设计: 'design',
  通讯: 'default',
  通信: 'default',
  科技: 'tech',
  news: 'default',
  newsletter_: 'default',
};

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function canonicalTag(tag: string): string {
  return normalize(tag).toLowerCase();
}

function normalizeTagId(raw: string): string {
  const cleaned = normalize(raw);
  if (!cleaned) return '';
  const lower = cleaned.toLowerCase();
  return TAG_ALIAS_TO_ID[cleaned] ?? TAG_ALIAS_TO_ID[lower] ?? cleaned;
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
      const cleaned = normalizeTagId(raw);
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
    const cleaned = normalizeTagId(raw);
    if (!cleaned) continue;
    const key = canonicalTag(cleaned);
    if (!dedup.has(key)) dedup.set(key, cleaned);
  }
  const unique = Array.from(dedup.values());
  return JSON.stringify(unique);
}

export function isBaseTag(tag: string): boolean {
  const normalized = normalizeTagId(tag);
  if (BASE_TAG_SET.has(normalized as BaseTagId)) return true;
  const canonical = canonicalTag(normalized);
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
      const cleaned = normalizeTagId(tag);
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

export function topPrimaryTags(tagSets: string[][], limit = 3): string[] {
  const count = new Map<string, { value: string; hit: number }>();
  for (const tags of tagSets) {
    const first = tags[0];
    if (!first) continue;
    const cleaned = normalizeTagId(first);
    if (!cleaned) continue;
    const key = canonicalTag(cleaned);
    const current = count.get(key);
    if (current) current.hit += 1;
    else count.set(key, { value: cleaned, hit: 1 });
  }
  return Array.from(count.values())
    .sort((a, b) => b.hit - a.hit)
    .map((item) => item.value)
    .slice(0, limit);
}

export function getTagLabel(tag: string, t: (key: string) => string): string {
  const normalized = normalizeTagId(tag);
  if (normalized === 'default') return t('tag.default');
  if (normalized === 'design') return t('tag.design');
  if (normalized === 'tech') return t('tag.tech');
  return normalized;
}
