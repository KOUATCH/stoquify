// Reviewed filesystem-only tests and deliberately incomplete readiness plan.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..'), hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const id = crypto.randomBytes(5).toString('hex'), dir = path.join(__dirname, 'controls-' + id); fs.mkdirSync(dir);
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
const input = ['scripts/hardened-close-production-readiness.cjs', 'scripts/__tests__/hardened-close-production-readiness.node-test.cjs', 'config/release/hardened-close-production.template.json',
  'scripts/release-secret-preflight.js', 'scripts/prisma-production-migration-gate.js', 'scripts/release-artifact.cjs', 'scripts/candidate-snapshot.cjs', 'scripts/prisma-migration-catalog-gate.js'];
const before = Object.fromEntries(input.map(file => [file, hash(path.join(root, file))]));
function execute(name, args, status) {
  const started = new Date().toISOString();
  const result = spawnSync(process.execPath, args, { cwd: root, env, windowsHide: true, encoding: 'utf8', timeout: 120000 });
  fs.writeFileSync(path.join(dir, name + '.log'), (result.stdout || '') + (result.stderr || ''), { flag: 'wx' });
  assert.equal(result.error, undefined); assert.equal(result.status, status, name);
  return { name, args, started, finished: new Date().toISOString(), exitCode: result.status, stdout: result.stdout };
}
const tests = execute('pure-unit', ['--test', input[1]], 0);
assert.match(tests.stdout, /# tests 15/); assert.match(tests.stdout, /# pass 15/); assert.match(tests.stdout, /# skipped 0/);
const plan = input[2], blocked = execute('undecided-template', [input[0], '--plan', plan, '--trusted-plan-sha256', before[plan]], 1);
const assessment = JSON.parse(blocked.stdout); assert.equal(assessment.status, 'BLOCKED'); assert(!assessment.applicationDeployed && !assessment.schemaPromoted && !assessment.deploymentApproved);
assert(assessment.blockers.includes('target_origin_not_public_https')); assert(assessment.blockers.includes('both_email_capabilities_must_be_explicitly_enabled_in_controlled_environment'));
assert(Object.values(assessment.secretVariablePresence).every(value => !value));
fs.writeFileSync(path.join(dir, 'undecided-template.json'), JSON.stringify(assessment, null, 2) + '\n', { flag: 'wx' });
for (const file of input) assert.equal(hash(path.join(root, file)), before[file], 'Input changed while checking');
const receipt = { passed: true, pureTests: 15, skipped: 0, expectedBlockedTemplate: true, productionContacted: false, sourceHashes: before, runnerSha256: hash(__filename), evidenceDirectory: dir,
  checks: [tests, blocked].map(({stdout, ...rest}) => rest), classification: 'Pure/file-only synthetic tests and exact CLI fail-closed check; no provider/database/application execution' };
fs.writeFileSync(path.join(dir, 'verification.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(receipt));
