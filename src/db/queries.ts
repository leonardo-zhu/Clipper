import { getDB } from './index';
import type { Article, ArticleStatus } from './schema';

export function insertArticle(article: { id: string; url: string; status?: ArticleStatus; created_at?: number }) {
  const db = getDB();
  db.executeSync(
    'INSERT INTO articles (id, url, status, created_at) VALUES (?, ?, ?, ?)',
    [article.id, article.url, article.status ?? 'queued', article.created_at ?? Date.now()],
  );
}

export function updateArticle(
  id: string,
  fields: Partial<
    Pick<
      Article,
      | 'title'
      | 'description'
      | 'body'
      | 'summary'
      | 'source'
      | 'profile_signature'
      | 'msg_cdn_url'
      | 'cover_url_1_1'
      | 'lang'
      | 'ingested_at'
      | 'summarising_progress'
      | 'status'
    >
  >,
) {
  const db = getDB();
  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    values.push(value as string | number | null);
  }

  if (sets.length === 0) return;

  values.push(id);
  db.executeSync(`UPDATE articles SET ${sets.join(', ')} WHERE id = ?`, values);
}

export function getArticle(id: string): Article | null {
  const db = getDB();
  const result = db.executeSync('SELECT * FROM articles WHERE id = ?', [id]);
  return (result.rows?.[0] as unknown as Article) ?? null;
}

export function getAllArticles(): Article[] {
  const db = getDB();
  const result = db.executeSync('SELECT * FROM articles ORDER BY created_at DESC');
  return (result.rows as unknown as Article[]) ?? [];
}

export function getArticlesByStatus(status: ArticleStatus): Article[] {
  const db = getDB();
  const result = db.executeSync('SELECT * FROM articles WHERE status = ? ORDER BY created_at DESC', [status]);
  return (result.rows as unknown as Article[]) ?? [];
}

export function deleteArticle(id: string) {
  const db = getDB();
  db.executeSync('DELETE FROM articles WHERE id = ?', [id]);
}

export function deleteArticlesByStatus(status: ArticleStatus): number {
  const db = getDB();
  db.executeSync('DELETE FROM articles WHERE status = ?', [status]);
  return 0;
}
