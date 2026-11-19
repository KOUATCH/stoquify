// Client generation only, in the environment-free snapshot; no schema/database mutation.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const root = process.cwd(), baseline = path.join(root, '.codex-tmp/mixed-version-baseline');
const f = JSON.parse(fs.readFileSync('.codex-tmp/workflow-closure-private.json', 'utf8')), u = new URL(f.url);
if (u.hostname !== 'localhost' || u.pathname !== '/stoquify_pos_audit_20261026_d30f') throw Error('Wrong disposable target');
const env = {};
for (const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC']) if (process.env[key]) env[key] = process.env[key];
Object.assign(env, { DATABASE_URL: f.url, DIRECT_URL: f.url, SHADOW_DATABASE_URL: f.url, PRISMA_GENERATE_SKIP_AUTOINSTALL: 'true', CHECKPOINT_DISABLE: '1' });
const r = spawnSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'generate', '--schema', 'prisma/compatibility-schema.prisma'], { cwd: baseline, env, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
const output = (r.stdout + r.stderr).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[redacted URL]');
fs.writeFileSync(path.join(__dirname, 'client-generation.json'), JSON.stringify({ at: new Date().toISOString(), exitCode: r.status, output }, null, 2));
console.log(output); process.exitCode = r.status ?? 1;
