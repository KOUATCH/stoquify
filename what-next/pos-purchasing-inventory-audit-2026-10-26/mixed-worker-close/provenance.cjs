// Local source hashes only. Preserve historical evidence and all working-tree edits.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const prior = JSON.parse(fs.readFileSync(path.join(__dirname, '../mixed-version/start-source.json'), 'utf8'));
const oldDrift = prior.oldFiles.filter(e => hash(path.join(prior.baseline, e.file)) !== e.sha256).map(e => e.file);
if (oldDrift.length) throw Error('Historical snapshot drift');
const owned = ['services/inventory/__tests__/mixed-recovery.compatibility.postgres.test.ts', 'services/inventory/__tests__/mixed-recovery.worker.postgres.test.ts', 'jest.mixed-recovery.config.cjs', 'jest.mixed-recovery-worker.config.cjs', 'tsconfig.mixed-recovery.json'];
const files = [...new Set([...prior.currentFiles.map(e => e.file), ...owned])].map(file => ({ file, sha256: fs.existsSync(file) ? hash(file) : null }));
const r = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }); if (r.status) throw Error('HEAD unavailable');
const stage = process.argv[2]; if (!['start', 'final'].includes(stage)) throw Error('Explicit stage required');
const out = { at: new Date().toISOString(), head: r.stdout.trim(), baselineHead: prior.head, oldDrift, files };
if (stage === 'final') { const start = JSON.parse(fs.readFileSync(path.join(__dirname, 'start-source.json'), 'utf8')); out.changedSinceStart = files.filter(e => start.files.find(p => p.file === e.file)?.sha256 !== e.sha256).map(e => e.file); }
fs.writeFileSync(path.join(__dirname, stage + '-source.json'), JSON.stringify(out, null, 2)); console.log(JSON.stringify({ stage, head: out.head, oldDrift, changedSinceStart: out.changedSinceStart }));
