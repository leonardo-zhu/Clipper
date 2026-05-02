function normalizeStatus(status) {
  if (status === 'pending') return 'queued';
  if (status === 'fetching') return 'ingesting';
  if (status === 'queued' || status === 'ingesting' || status === 'ingested' || status === 'summarising' || status === 'done' || status === 'error') {
    return status;
  }
  return 'queued';
}

const IMPORT_STATUS_CASES = [
  ['pending', 'queued'],
  ['fetching', 'ingesting'],
  ['queued', 'queued'],
  ['ingesting', 'ingesting'],
  ['ingested', 'ingested'],
  ['summarising', 'summarising'],
  ['done', 'done'],
  ['error', 'error'],
  ['unknown', 'queued'],
];

let failed = false;
for (const [input, expected] of IMPORT_STATUS_CASES) {
  const actual = normalizeStatus(input);
  if (actual !== expected) {
    failed = true;
    console.error(`normalizeStatus failed: input=${input}, expected=${expected}, actual=${actual}`);
  }
}

if (failed) process.exit(1);
console.log('state flow check passed: import status normalization is stable.');
