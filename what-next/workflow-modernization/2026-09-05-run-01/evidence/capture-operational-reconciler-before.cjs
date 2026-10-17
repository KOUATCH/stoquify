const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const run = path.dirname(__dirname), file = path.join(run, 'reconcile-current-progress.cjs');
const content = fs.readFileSync(file, 'utf8');
const row = { at: new Date().toISOString(), file: 'reconcile-current-progress.cjs', sha256: crypto.createHash('sha256').update(content).digest('hex'), content };
const output = path.join(__dirname, `operational-reconciler-before-${crypto.randomUUID()}.json`);
fs.writeFileSync(output, JSON.stringify(row, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ file: path.relative(run, output).replaceAll('\\', '/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'), sourceSha256: row.sha256 }) + '\n');
