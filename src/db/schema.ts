export const CREATE_ARTICLES = `
  CREATE TABLE IF NOT EXISTS articles (
    id         TEXT PRIMARY KEY,
    url        TEXT NOT NULL UNIQUE,
    title      TEXT,
    body       TEXT,
    summary    TEXT,
    source     TEXT,
    status     TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  );
`;

export type ArticleStatus = 'pending' | 'fetching' | 'summarising' | 'done' | 'error';

export interface Article {
  id: string;
  url: string;
  title: string | null;
  body: string | null;
  summary: string | null;
  source: string | null;
  status: ArticleStatus;
  created_at: number;
}
