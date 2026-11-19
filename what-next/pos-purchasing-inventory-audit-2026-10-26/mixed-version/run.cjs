// Explicit retained disposable target. No environment-file loading, reset, provider or migration.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const f = JSON.parse(fs.readFileSync('.codex-tmp/workflow-closure-private.json', 'utf8')), u = new URL(f.url);
if (u.hostname !== 'localhost' || u.pathname !== '/stoquify_pos_audit_20261026_d30f' || u.searchParams.get('schema') !== 'public') throw Error('Wrong disposable target');
const env = {};
for (const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC']) if (process.env[key]) env[key] = process.env[key];
Object.assign(env, { NODE_ENV: 'test', DATABASE_URL: f.url, DIRECT_URL: f.url, SHADOW_DATABASE_URL: f.url, WORKFLOW_PHASE3_DATABASE: u.pathname.slice(1), MIXED_EVIDENCE: __dirname, PURCHASE_ORDER_AUTHORING_UI_ENABLED: 'false', PURCHASE_ORDER_AUTHORING_WRITES_ENABLED: 'false' });
const args = ['node_modules/jest/bin/jest.js', '--config', 'jest.mixed-version.config.cjs', '--runInBand', '--json', '--outputFile=' + path.join(__dirname, 'results.json')];
if (process.argv[2]) args.push('--testNamePattern', process.argv[2]);
const r = spawnSync(process.execPath, args, { env, encoding: 'utf8', windowsHide: true, timeout: 2400000, maxBuffer: 16 * 1024 * 1024 });
const output = (r.stdout + r.stderr).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[redacted URL]');
fs.writeFileSync(path.join(__dirname, 'run.log'), output); console.log(output); process.exitCode = r.status ?? 1;
