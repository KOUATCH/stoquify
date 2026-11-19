// Root-authorized static execution only, after owned runtime cleanup was proven.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const planFile = path.join(__dirname, 'STATIC_EXECUTION_PLAN.json'), plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
assert.deepEqual(process.argv.slice(2), ['run-reviewed-plan']);
assert.equal(plan.executed, false); assert.equal(plan.invocation.cwd, root);
assert.equal(plan.invocation.executable, process.execPath); assert.equal(plan.invocation.args.length, 24);
assert.equal(plan.invocation.args[0], plan.runner.path); assert.equal(plan.invocation.args[1], plan.privateClient.path);
assert.equal(digest(plan.runner.path), plan.runner.sha256);
assert.equal(digest(plan.previousReceipt.path), plan.previousReceipt.sha256);
for (const item of plan.configs) assert.equal(digest(path.join(root, item.path)), item.sha256);
for (const [file, sha256] of Object.entries(plan.sourceHashes)) assert.equal(digest(path.join(root, file)), sha256, 'Source changed since plan: ' + file);
assert.equal(digest(path.join(root, plan.privateClient.path, 'schema.prisma')), plan.privateClient.schemaSha256);
assert.equal(digest(path.join(root, plan.privateClient.path, 'index.d.ts')), plan.privateClient.typesSha256);
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
const started = new Date().toISOString(); console.log('Pinned static plan verified; compiler/linter starting.');
const result = spawnSync(process.execPath, plan.invocation.args, { cwd: root, env, windowsHide: true, stdio: 'inherit', timeout: 700000 });
const receipt = { started, finished: new Date().toISOString(), exitCode: result.status, signal: result.signal, error: result.error?.code || null, planSha256: digest(planFile), runnerSha256: digest(__filename),
  authorization: 'Root GO after authenticated runtime-2d0757d253 passed and owned browser/application/PG cleanup completed',
  classification: 'Static compiler/linter only; source qualifier emits the authoritative detailed result in its own fresh static-* directory' };
fs.writeFileSync(path.join(__dirname, 'STATIC_EXECUTION.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
process.exitCode = result.status ?? 1;
