#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.log('Usage: pnpm analyze <snapshot.json>');
}

const input = process.argv[2];
if (!input) {
  usage();
  process.exit(1);
}

const full = path.resolve(process.cwd(), input);
if (!fs.existsSync(full)) {
  console.error(`file not found: ${full}`);
  process.exit(1);
}

const raw = fs.readFileSync(full, 'utf8');
const data = JSON.parse(raw);
const articles = Array.isArray(data.articles) ? data.articles : [];
const byStatus = new Map();
let totalBodyBytes = 0;
let totalSummaryBytes = 0;

for (const a of articles) {
  byStatus.set(a.status, (byStatus.get(a.status) ?? 0) + 1);
  totalBodyBytes += Buffer.byteLength(a.body ?? '', 'utf8');
  totalSummaryBytes += Buffer.byteLength(a.summary ?? '', 'utf8');
}

console.log(`snapshot: ${full}`);
console.log(`createdAt: ${data.createdAt ?? '-'}`);
console.log(`app: ${data.app ?? '-'}`);
console.log(`articleCount: ${articles.length}`);
console.log('status:');
for (const [k, v] of [...byStatus.entries()].sort((a, b) => `${a[0]}`.localeCompare(`${b[0]}`))) {
  console.log(`  ${k}: ${v}`);
}
console.log(`bodyBytes: ${totalBodyBytes}`);
console.log(`summaryBytes: ${totalSummaryBytes}`);
