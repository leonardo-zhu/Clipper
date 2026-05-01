export const CREATE_ARTICLES = `
  CREATE TABLE IF NOT EXISTS articles (
    id         TEXT PRIMARY KEY,
    url        TEXT NOT NULL UNIQUE,
    title      TEXT,
    description TEXT,
    body       TEXT,
    summary    TEXT,
    source     TEXT,
    profile_signature TEXT,
    msg_cdn_url TEXT,
    cover_url_1_1 TEXT,
    lang       TEXT,
    ingested_at INTEGER,
    summarising_progress INTEGER NOT NULL DEFAULT 0,
    status     TEXT NOT NULL DEFAULT 'queued',
    created_at INTEGER NOT NULL
  );
`;

export type ArticleStatus = 'queued' | 'ingesting' | 'ingested' | 'summarising' | 'done' | 'error';

export interface Article {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  body: string | null;
  summary: string | null;
  source: string | null;
  profile_signature: string | null;
  msg_cdn_url: string | null;
  cover_url_1_1: string | null;
  lang: string | null;
  ingested_at: number | null;
  summarising_progress: number;
  status: ArticleStatus;
  created_at: number;
}
