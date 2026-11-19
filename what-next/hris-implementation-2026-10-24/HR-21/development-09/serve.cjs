const {spawn} = require('node:child_process'), path = require('node:path'), crypto = require('node:crypto'), fs = require('node:fs');
const base = __dirname, root = process.cwd(), env = {};
for (const key of ['PATH','Path','SystemRoot','SYSTEMROOT','WINDIR','TEMP','TMP','LOCALAPPDATA','APPDATA','USERPROFILE','ComSpec','COMSPEC','PATHEXT']) if (process.env[key]) env[key] = process.env[key];
const url = 'http://127.0.0.1:35585';
const organizationId = 'hr21term-' + crypto.randomUUID();
Object.assign(env, {NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1', DATABASE_URL: 'postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public', AUTH_SECRET: crypto.randomBytes(48).toString('hex'), NEXTAUTH_URL: url, NEXT_PUBLIC_BASE_URL: url, NEXT_PUBLIC_APP_URL: url, NODE_OPTIONS: '--require "' + path.join(base, 'preload.cjs').replaceAll('\\', '/') + '"', NEXT_DIST_DIR: '.next-hris-browser', HRIS_SETUP_PILOT_ORGANIZATIONS: organizationId});
env.HRIS_PAYROLL_HANDOFF_POLICIES_JSON=JSON.stringify([{organizationId,version:'synthetic-v1',countryCode:'CM',recipientUserId:organizationId+'-employee',recipientLabel:'Synthetic independent payroll recipient',templateVersion:'HR_CORE_INPUTS_V1',approvalReference:'Synthetic reviewed template prerequisite',effectiveFrom:'2026-01-01T00:00:00Z',effectiveTo:'2030-01-01T00:00:00Z',enabled:true}]);
env.HRIS_LIFECYCLE_TASK_POLICIES_JSON=JSON.stringify([require('./policy.cjs')(organizationId)]);
fs.writeFileSync(path.join(base, 'runtime-context.json'), JSON.stringify({organizationId, url, launcherPid: process.pid}, null, 2));
const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', path.join(base, 'runtime-files'), '--hostname', '127.0.0.1', '--port', '35585'], {cwd: path.join(base, 'runtime-files'), env, windowsHide: true, stdio: 'inherit'});
child.on('exit', code => process.exit(code ?? 1));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));

