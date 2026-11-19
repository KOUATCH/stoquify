// Creates a new, environment-free baseline source snapshot; never alters Git or the shared client.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = process.cwd(), baseline = path.join(root, '.codex-tmp/mixed-version-baseline');
if (fs.existsSync(baseline)) throw Error('Baseline snapshot already exists');
const run = (command, args, cwd = root) => { const r = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true }); if (r.status !== 0) throw Error(r.stderr || r.stdout); return r.stdout; };
const head = run('git', ['rev-parse', 'HEAD']).trim();
if (head !== '9ab93a2a1d81e37ef7e0b10357885b48a3bc5886') throw Error('Reassess baseline revision');
const candidates = ['actions', 'services', 'prisma', 'lib', 'config', 'types', 'validations', 'hooks', 'src', 'i18n', 'messages', 'scripts', 'package.json', 'package-lock.json', 'tsconfig.json'];
const tracked = new Set(run('git', ['ls-tree', '--name-only', head]).trim().split('\n'));
const sources = candidates.filter(p => tracked.has(p));
const archive = path.join(root, '.codex-tmp/mixed-version-baseline.tar');
if (fs.existsSync(archive)) throw Error('Archive path already exists');
run('git', ['archive', '--format=tar', '--output=' + archive, head, ...sources]);
fs.mkdirSync(baseline); run('tar', ['-xf', archive, '-C', baseline]);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function manifest(dir, prefix = '') { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => { const rel = prefix + e.name, file = path.join(dir, e.name); if (e.isSymbolicLink()) throw Error('Unexpected source link'); return e.isDirectory() ? manifest(file, rel + '/') : [{ file: rel, sha256: hash(file) }]; }); }
const oldFiles = manifest(baseline), currentFiles = [];
for (const name of sources) { const p = path.join(root, name); if (!fs.existsSync(p)) continue; if (fs.statSync(p).isDirectory()) currentFiles.push(...manifest(p, name + '/')); else currentFiles.push({ file: name, sha256: hash(p) }); }
fs.writeFileSync(path.join(__dirname, 'start-source.json'), JSON.stringify({ at: new Date().toISOString(), head, baseline, oldFiles, currentFiles }, null, 2));
fs.writeFileSync(path.join(__dirname, 'start-working-tree.txt'), run('git', ['status', '--short']));
// Generate into a private output, not node_modules/@prisma/client.
const schema = fs.readFileSync(path.join(baseline, 'prisma/schema.prisma'), 'utf8');
if (!schema.includes('provider = "prisma-client-js"')) throw Error('Unexpected generator');
fs.writeFileSync(path.join(baseline, 'prisma/compatibility-schema.prisma'), schema.replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output = "../generated/legacy-client"'));
fs.symlinkSync(path.join(root, 'node_modules'), path.join(baseline, 'node_modules'), 'junction');
console.log(JSON.stringify({ head, baselineFiles: oldFiles.length, currentFiles: currentFiles.length, schemaOriginalSha256: hash(path.join(baseline, 'prisma/schema.prisma')) }));
