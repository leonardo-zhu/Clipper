const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const scanDirs = [path.join(ROOT, 'app'), path.join(ROOT, 'src')];
const exts = new Set(['.ts', '.tsx']);

const ALLOW_PATTERNS = [
  /<Text[^>]*>\s*Clipper\s*<\/Text>/, // brand name
  /title:\s*'HOME'/,
  /<Text[^>]*>\s*HOME\s*<\/Text>/,
  /<Text[^>]*style=\{styles\.code\}[^>]*>/, // code snippet blocks
  /\/\/\s*i18n-ignore-next-line/,
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && exts.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function shouldIgnore(line) {
  return ALLOW_PATTERNS.some((p) => p.test(line));
}

const findings = [];

for (const file of scanDirs.flatMap((d) => walk(d))) {
  const rel = path.relative(ROOT, file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || shouldIgnore(line)) continue;

    const textNode = /<Text[^>]*>\s*([^<{][^<]*)<\/Text>/.exec(line);
    if (textNode && !/\{\s*t\(|\{\s*tf\(/.test(line)) {
      findings.push({ rel, line: i + 1, reason: 'Hardcoded <Text> copy', snippet: textNode[1].trim().slice(0, 80) });
      continue;
    }

    const placeholder = /placeholder\s*=\s*"([^"]+)"/.exec(line);
    if (placeholder) {
      findings.push({ rel, line: i + 1, reason: 'Hardcoded placeholder', snippet: placeholder[1].trim().slice(0, 80) });
      continue;
    }

    const alertLiteral = /Alert\.alert\(\s*['"][^'"]+['"]/.exec(line);
    if (alertLiteral) {
      findings.push({ rel, line: i + 1, reason: 'Alert.alert with string literal', snippet: trimmed.slice(0, 80) });
    }
  }
}

if (!findings.length) {
  console.log('hardcoded-copy check passed: no obvious hardcoded UI copy found.');
  process.exit(0);
}

console.error('hardcoded-copy check failed. Found potential hardcoded UI copy:');
for (const f of findings) {
  console.error(`- ${f.rel}:${f.line} ${f.reason} -> ${f.snippet}`);
}
process.exit(1);
