const fs = require('node:fs');
const path = require('node:path');

const file = path.resolve(process.cwd(), 'src/i18n/index.ts');
const source = fs.readFileSync(file, 'utf8');

function extractLocaleBlock(locale) {
  const anchor = `'${locale}': {`;
  const start = source.indexOf(anchor);
  if (start === -1) throw new Error(`Locale block not found: ${locale}`);

  let i = start + anchor.length;
  let depth = 1;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    i += 1;
  }

  if (depth !== 0) throw new Error(`Locale block parse failed: ${locale}`);
  return source.slice(start + anchor.length, i - 1);
}

function extractKeys(block) {
  const keys = new Set();
  const re = /'([^']+)'\s*:\s*'[^']*'/g;
  let m = re.exec(block);
  while (m) {
    keys.add(m[1]);
    m = re.exec(block);
  }
  return keys;
}

const zhKeys = extractKeys(extractLocaleBlock('zh-CN'));
const enKeys = extractKeys(extractLocaleBlock('en-US'));

const zhOnly = [...zhKeys].filter((k) => !enKeys.has(k));
const enOnly = [...enKeys].filter((k) => !zhKeys.has(k));

if (!zhOnly.length && !enOnly.length) {
  console.log('i18n key check passed: zh-CN/en-US are aligned.');
  process.exit(0);
}

console.error('i18n key mismatch detected.');
if (zhOnly.length) {
  console.error(`Missing in en-US (${zhOnly.length}):`);
  for (const k of zhOnly) console.error(`  - ${k}`);
}
if (enOnly.length) {
  console.error(`Missing in zh-CN (${enOnly.length}):`);
  for (const k of enOnly) console.error(`  - ${k}`);
}
process.exit(1);
