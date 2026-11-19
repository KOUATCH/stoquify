// Local-only evidence checks. Does not print any private value.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8')), hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const secrets = new Set();
function collect(v, key = '') { if (typeof v === 'string' && /password|token|secret|^url$/i.test(key) && v.length > 6) secrets.add(v); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) collect(x, k); }
collect(read('.codex-tmp/workflow-closure-private.json')); collect(read('.codex-tmp/close-browser-private.json'));
const files = fs.readdirSync(__dirname).filter(n => fs.statSync(path.join(__dirname, n)).isFile()).map(n => path.join(__dirname, n));
for (const file of files) { const text = fs.readFileSync(file, 'utf8'); for (const secret of secrets) assert(!text.includes(secret), 'Private value found in ' + path.basename(file)); }
const full = read(path.join(__dirname, 'initial-full-source.json')), targeted = read(path.join(__dirname, 'run-source.json'));
assert.deepEqual(full.drift, []); assert.deepEqual(targeted.drift, []);
const tests = read(path.join(__dirname, 'combined-results.json')).tests, database = read(path.join(__dirname, 'database-readback.json'));
assert.equal(tests.length, 18); assert(tests.every(t => t.status === 'passed')); assert.equal(database.rows.length, 16); assert.equal(database.residualFaultTriggers, 0);
fs.writeFileSync(path.join(__dirname, 'evidence-manifest.json'), JSON.stringify({ at: new Date().toISOString(), targetedSecretScan: 'PASS', files: files.filter(f => !f.endsWith('evidence-manifest.json')).map(file => ({ file: path.basename(file), sha256: hash(file) })) }, null, 2));
console.log('PASS: complete matrix/readback, stable run sources and targeted private-value scan');
