const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const prior = JSON.parse(fs.readFileSync(path.join(__dirname, 'purchase-authoring-source-hashes.json'), 'utf8'));
const files = [...prior.entries.map(entry => entry.file),
  'components/purchase-orders/purchase-authoring-form-copy.ts',
  'components/purchase-orders/__tests__/durable-purchase-form.test.tsx',
];
const entries = files.map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') }));
fs.writeFileSync(path.join(__dirname, 'purchase-authoring-localization-source-hashes.json'), JSON.stringify({ recordedAt: new Date().toISOString(), entries }, null, 2) + '\n');
