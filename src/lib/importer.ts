import type { Article, ArticleStatus } from '@/src/db/schema';

export function normalizeStatus(status: string): ArticleStatus {
  if (status === 'pending') return 'queued';
  if (status === 'fetching') return 'ingesting';
  if (status === 'queued' || status === 'ingesting' || status === 'ingested' || status === 'summarising' || status === 'done' || status === 'error') {
    return status;
  }
  return 'queued';
}

export function normalizeImportRow(row: Partial<Article>) {
  return {
    title: row.title ?? null,
    description: row.description ?? null,
    body: row.body ?? null,
    summary: row.summary ?? null,
    source: row.source ?? null,
    profile_signature: row.profile_signature ?? null,
    msg_cdn_url: row.msg_cdn_url ?? null,
    cover_url_1_1: row.cover_url_1_1 ?? null,
    tags_json: row.tags_json ?? null,
    lang: row.lang ?? null,
    ingested_at: row.ingested_at ?? null,
    summarising_progress: typeof row.summarising_progress === 'number' ? row.summarising_progress : 0,
    status: normalizeStatus((row.status as string) ?? 'queued'),
  } as const;
}

export function resolveImportId(row: Partial<Article>): string {
  if (row.id && typeof row.id === 'string') return row.id;
  return `import-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
