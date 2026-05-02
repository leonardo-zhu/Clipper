const fs = require('node:fs');
const path = require('node:path');

function normalizeStatus(status) {
  if (status === 'pending') return 'queued';
  if (status === 'fetching') return 'ingesting';
  if (status === 'queued' || status === 'ingesting' || status === 'ingested' || status === 'summarising' || status === 'done' || status === 'error') return status;
  return 'queued';
}

function normalizeText(v) {
  if (typeof v !== 'string') return null;
  const t = v.replace(/\s+/g, ' ').trim();
  return t || null;
}

function normalizeTags(tagsJson) {
  if (!tagsJson) return null;
  let arr = [];
  if (Array.isArray(tagsJson)) arr = tagsJson;
  else if (typeof tagsJson === 'string') {
    try {
      const parsed = JSON.parse(tagsJson);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      return null;
    }
  }

  const dedup = new Map();
  for (const raw of arr) {
    if (typeof raw !== 'string') continue;
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!dedup.has(key)) dedup.set(key, cleaned);
  }
  const out = Array.from(dedup.values());
  return out.length ? JSON.stringify(out) : null;
}

function migrateRow(row) {
  const cover = normalizeText(row.cover_url_1_1) || normalizeText(row.cdn_url_1_1);
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    url: normalizeText(row.url),
    title: normalizeText(row.title),
    description: normalizeText(row.description),
    body: typeof row.body === 'string' ? row.body : null,
    summary: normalizeText(row.summary),
    source: normalizeText(row.source),
    profile_signature: normalizeText(row.profile_signature),
    msg_cdn_url: normalizeText(row.msg_cdn_url),
    cover_url_1_1: cover,
    tags_json: normalizeTags(row.tags_json),
    lang: normalizeText(row.lang),
    ingested_at: Number.isFinite(row.ingested_at) ? row.ingested_at : null,
    summarising_progress: Number.isFinite(row.summarising_progress) ? row.summarising_progress : 0,
    status: normalizeStatus(row.status),
    created_at: Number.isFinite(row.created_at) ? row.created_at : Date.now(),
  };
}

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: pnpm migrate:snapshot <input.json> [output.json]');
    process.exit(1);
  }

  const output = process.argv[3] || input.replace(/\.json$/i, '.migrated.json');
  const inputPath = path.resolve(process.cwd(), input);
  const outputPath = path.resolve(process.cwd(), output);

  const raw = fs.readFileSync(inputPath, 'utf8');
  const payload = JSON.parse(raw);
  const rows = Array.isArray(payload.articles) ? payload.articles : [];

  let skipped = 0;
  const migrated = [];
  for (const row of rows) {
    const next = migrateRow(row || {});
    if (!next.url) {
      skipped += 1;
      continue;
    }
    migrated.push(next);
  }

  const out = {
    app: 'Clipper',
    schemaVersion: 2,
    migratedAt: new Date().toISOString(),
    articleCount: migrated.length,
    skipped,
    articles: migrated,
  };

  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2));
  console.log(`Migrated ${migrated.length} articles, skipped ${skipped}.`);
  console.log(`Output: ${outputPath}`);
}

main();
