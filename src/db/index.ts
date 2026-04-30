import { open, type DB } from '@op-engineering/op-sqlite';
import { CREATE_ARTICLES } from './schema';

let db: DB | null = null;

export function getDB(): DB {
  if (!db) {
    db = open({ name: 'clipper.db' });
    db.executeSync(CREATE_ARTICLES);
  }
  return db;
}
