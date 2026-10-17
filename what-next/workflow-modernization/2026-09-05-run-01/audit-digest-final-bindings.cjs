const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const indexes = fs.readdirSync(path.join(__dirname, 'evidence')).filter(file => /^(digest|payroll-digest)-.*\.json$/.test(file) && !/typecheck|bindings/.test(file));
const records = [];
for (const index of indexes) {
  const record = JSON.parse(fs.readFileSync(path.join(__dirname, 'evidence', index), 'utf8'));
  const hashes = record.sourceAfter || record.sourceHashes || record.sources || {};
  const bound = Object.entries(hashes).filter(([, value]) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value));
  records.push({ index, runtime: record.runtime || record.browser || null, bindings: bound.length, unchanged: bound.filter(([file, hash]) => fs.existsSync(path.join(root, file)) && sha(path.join(root, file)) === hash).map(([file]) => file), changed: bound.filter(([file, hash]) => !fs.existsSync(path.join(root, file)) || sha(path.join(root, file)) !== hash).map(([file]) => file), unrecognizedBindings: !bound.length });
}
const report = { at: new Date().toISOString(), note: 'Hash matches support reuse only within original scope; changed or absent bindings require explicit review, not automatic passing status.', records };
const output = path.join(__dirname, 'evidence', 'digest-binding-audit-' + crypto.randomUUID() + '.json');
fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ output, records: records.map(({ index, bindings, changed, unrecognizedBindings }) => ({ index, bindings, changed, unrecognizedBindings })) }));
