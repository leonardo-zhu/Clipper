import { open, type DB } from '@op-engineering/op-sqlite';
import { CREATE_ARTICLES } from './schema';

let db: DB | null = null;

export function getDB(): DB {
  if (!db) {
    db = open({ name: 'clipper.db' });
    db.executeSync(CREATE_ARTICLES);
    migrateArticles(db);
  }
  return db;
}

function migrateArticles(database: DB) {
  const columns = [
    ['description', 'TEXT'],
    ['profile_signature', 'TEXT'],
    ['msg_cdn_url', 'TEXT'],
    ['cover_url_1_1', 'TEXT'],
    ['tags_json', 'TEXT'],
    ['lang', 'TEXT'],
    ['ingested_at', 'INTEGER'],
    ['summarising_progress', 'INTEGER NOT NULL DEFAULT 0'],
  ] as const;

  for (const [name, type] of columns) {
    try {
      database.executeSync(`ALTER TABLE articles ADD COLUMN ${name} ${type}`);
    } catch {
      // Ignore if column already exists.
    }
  }
}
