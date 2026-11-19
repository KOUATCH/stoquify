// Plan/pin inputs only. It does not invoke compiler, linter, app, env or DB.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../../..'), base = path.dirname(__dirname);
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
assert.equal(process.argv.length, 2);
const previousPath = path.join(base, 'static-68242d33b5/verification.json'), previous = read(previousPath);
const lint = previous.checks.find(check => check.name === 'scoped-lint');
const priorOwned = lint.args.slice(1, lint.args.indexOf('--format'));
assert.equal(priorOwned.length, 21); assert.equal(new Set(priorOwned).size, 21);
const owned = [...priorOwned, 'lib/auth.ts']; assert.equal(new Set(owned).size, 22);
const client = previous.privateClient, absoluteClient = path.resolve(root, client);
assert(absoluteClient.startsWith(path.join(root, '.codex-tmp') + path.sep));
assert.equal(digest(path.join(absoluteClient, 'schema.prisma')), previous.privateClientSchemaSha256);
assert.equal(digest(path.join(absoluteClient, 'index.d.ts')), previous.privateClientTypesSha256);
assert.equal(digest(path.join(root, 'lib/auth.ts')), 'c7a1acf7ee8c25682a47a7476feafdaeeb4d55f68fb030f33b76bd95e605bff5');
const runner = path.join(base, 'source-qualification.cjs'), current = fs.readFileSync(runner, 'utf8');
const before = current.replace('(actions|services|hooks|components|lib)', '(actions|services|hooks|components)');
assert.notEqual(before, current);
assert.equal(crypto.createHash('sha256').update(before).digest('hex'), previous.runnerSha256);
fs.writeFileSync(path.join(__dirname, 'source-qualification.before.txt'), before, { flag: 'wx' });
const plan = { preparedAt: new Date().toISOString(), executed: false, awaitingRootGo: true,
  classification: 'Plan only; actual full-tree TypeScript/noEmit/incremental:false and scoped22-file ESLint will execute only after root confirms its app/browser/PG stopped',
  previousReceipt: { path: previousPath, sha256: digest(previousPath) },
  invocation: { executable: process.execPath, args: [runner, client, ...owned], cwd: root },
  runner: { path: runner, sha256: digest(runner), change: 'Allowed lint path prefixes now additionally include lib; no compiler/environment/effect change', previousSha256: previous.runnerSha256 },
  configs: ['tsconfig.json', '.eslintrc.json'].map(file => ({ path: file, sha256: digest(path.join(root, file)) })),
  privateClient: { path: client, schemaSha256: previous.privateClientSchemaSha256, typesSha256: previous.privateClientTypesSha256 },
  sourceHashes: Object.fromEntries(owned.map(file => [file, digest(path.join(root, file))])),
  stopCondition: 'Root must explicitly confirm actual local application, browser and PG are stopped before authorizing execution. No timeout extension or retry implied.' };
fs.writeFileSync(path.join(__dirname, 'STATIC_EXECUTION_PLAN.json'), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ prepared: true, executed: false, ownedPaths: owned.length, runnerSha256: plan.runner.sha256, client, plan: path.join(__dirname, 'STATIC_EXECUTION_PLAN.json') }));
