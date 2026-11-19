// Run the real offline CLI against the deliberately incomplete reviewed plan.
// No dotenv, database, application, provider or deployment operations.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'), hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const final = process.argv[2] === 'final'; assert(process.argv.length === (final ? 3 : 2));
const plan = path.join(__dirname, 'production-plan.pending.json'), runner = path.join(root, 'scripts/hardened-close-production-readiness.cjs');
const planSha = hash(plan), runnerSha = hash(runner);
const directory = path.join(root, '.codex-tmp/close-production-plan-20261111-' + crypto.randomBytes(5).toString('hex')); fs.mkdirSync(directory); const temporary = path.join(directory, 'temp'); fs.mkdirSync(temporary);
const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|USERPROFILE|LOCALAPPDATA|APPDATA)$/i.test(key)));
Object.assign(environment, { TEMP: temporary, TMP: temporary, NODE_ENV: 'production', NODE_OPTIONS: '--require ' + JSON.stringify(path.join(root, 'scripts/local-gates-network.cjs')), STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '0', STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: '0', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '0' });
const args = [runner, '--plan', plan, '--trusted-plan-sha256', planSha];
const result = spawnSync(process.execPath, args, { cwd: root, env: environment, windowsHide: true, encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
assert.equal(result.status, 1); assert(!result.error && !result.signal); assert.equal(result.stderr.trim(), ''); const report = JSON.parse(result.stdout);
assert.equal(report.status, 'BLOCKED'); assert.equal(report.readyForOperatorReview, false); assert.equal(report.deploymentApproved, false); assert.equal(report.schemaPromoted, false); assert.equal(report.applicationDeployed, false);
for (const id of ['target_provider_missing', 'target_origin_not_public_https', 'evidence_worker_missing_invalid_stale_or_changed', 'both_email_capabilities_must_be_explicitly_enabled_in_controlled_environment']) assert(report.blockers.includes(id));
assert.equal(hash(plan), planSha); assert.equal(hash(runner), runnerSha);
fs.writeFileSync(path.join(__dirname, final ? 'PRODUCTION_BLOCKERS_FINAL.json' : 'PRODUCTION_BLOCKERS.json'), JSON.stringify({ classification: 'Actual offline admission of an incomplete plan in a secret-free controlled process; expected refusal, no external readiness or deployment qualification', expectedExitCode: 1, exitCode: result.status, plan: { path: plan, sha256: planSha }, readinessRunner: { path: runner, sha256: runnerSha }, runnerSha256: hash(__filename), temporaryDirectory: temporary, report }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ expectedBlocked: true, blockerCount: report.blockers.length, deployed: false, schemaPromoted: false }));
