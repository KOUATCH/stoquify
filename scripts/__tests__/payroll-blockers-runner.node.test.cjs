// Pure runner/path/environment tests only. Importing the runner does not execute main or open a database.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseArgs, resolveEvidencePath, childEnvironment, DEFAULT_OUT_DIR, PROVIDER_CREDENTIALS } = require('../run-payroll-blockers-postgres.cjs');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'stoquify-payroll-runner-'));
const root = path.join(temporary, 'repo'), outside = path.join(temporary, 'outside');
fs.mkdirSync(path.join(root, 'docs', 'existing'), { recursive:true });
fs.mkdirSync(outside);
after(() => {
  assert.equal(path.dirname(path.resolve(temporary)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temporary).startsWith('stoquify-payroll-runner-'));
  fs.rmSync(temporary, { recursive:true });
});

test('default destination and database argument are preserved; optional output can be supplied in either order', () => {
  assert.deepEqual(parseArgs(['--database','fixture']), { name:'fixture', outDir:DEFAULT_OUT_DIR });
  assert.deepEqual(parseArgs(['--out-dir','docs/run-one','--database','fixture']), { name:'fixture', outDir:'docs/run-one' });
  assert.deepEqual(parseArgs(['--database','fixture','--out-dir','docs/run-two']), { name:'fixture', outDir:'docs/run-two' });
});
test('missing, duplicate, unknown and valueless arguments fail before target access', () => {
  for (const args of [[], ['--out-dir','docs/run'], ['--database'], ['--database','fixture','--database','other'], ['--database','fixture','--out-dir'], ['--database','fixture','--unknown','x']]) assert.throws(()=>parseArgs(args));
});
test('a new nested destination resolves inside the repository docs subtree without creating it', () => {
  const target=resolveEvidencePath('docs/database-seed/continuation/history-proof-postgres',root);
  assert.equal(target,path.join(root,'docs/database-seed/continuation/history-proof-postgres'));
  assert.equal(fs.existsSync(target),false);
  assert.equal(resolveEvidencePath(path.join(root,'docs/existing'),root),path.join(root,'docs/existing'));
});
test('outside paths, sibling-prefix paths, docs root and traversal are rejected', () => {
  for(const input of ['docs','docs-elsewhere/run','outside/run','../docs/run','docs/../outside/run','docs\\..\\outside\\run',outside,'']) assert.throws(()=>resolveEvidencePath(input,root));
});
test('an existing junction escaping docs rejects both its direct and not-yet-existing descendants', () => {
  const link=path.join(root,'docs','escape');
  fs.symlinkSync(outside,link,'junction');
  assert.throws(()=>resolveEvidencePath(link,root),/escapes/);
  assert.throws(()=>resolveEvidencePath(path.join(link,'new-child'),root),/escapes/);
});
test('an existing evidence file redirecting outside docs is rejected before overwrite', () => {
  const foreignFile=path.join(outside,'postgres-run.json');
  fs.writeFileSync(foreignFile,'must stay unchanged');
  // Directory junctions need no Windows developer-mode symlink privilege and exercise the same resolved-file boundary.
  const link=path.join(root,'docs','file-escape');fs.symlinkSync(outside,link,'junction');
  assert.throws(()=>resolveEvidencePath(path.join(link,'postgres-run.json'),root,false),/escapes/);
  assert.equal(fs.readFileSync(foreignFile,'utf8'),'must stay unchanged');
});
test('physical docs redirection is rejected and in-docs junctions remain confined', () => {
  const anotherRoot=path.join(temporary,'redirected-repo');fs.mkdirSync(anotherRoot);
  fs.symlinkSync(outside,path.join(anotherRoot,'docs'),'junction');
  assert.throws(()=>resolveEvidencePath('docs/result',anotherRoot),/physical location/);
  const localLink=path.join(root,'docs','local-link');fs.symlinkSync(path.join(root,'docs','existing'),localLink,'junction');
  assert.equal(resolveEvidencePath(path.join(localLink,'next'),root),path.join(localLink,'next'));
});
test('existing regular files cannot be used as output directories', () => {
  const file=path.join(root,'docs','existing','report.json');fs.writeFileSync(file,'{}');
  assert.throws(()=>resolveEvidencePath(file,root),/directory/);
  assert.throws(()=>resolveEvidencePath(path.join(file,'nested'),root));
  assert.equal(resolveEvidencePath(file,root,false),file);
});
test('all declared provider credentials are blanked while disposable URLs and unrelated environment stay scoped', () => {
  const inherited={PATH:'test-path',NODE_ENV:'development',DATABASE_URL:'must-be-overridden',...Object.fromEntries(PROVIDER_CREDENTIALS.map(key=>[key,'provider-secret']))};
  const target=new URL('postgresql://synthetic:synthetic@localhost:5432/stoquify_local_payroll_blockers_20261102_aabbccdd?schema=public');
  const env=childEnvironment(target,'stoquify_local_payroll_blockers_20261102_aabbccdd',inherited);
  for(const key of PROVIDER_CREDENTIALS){assert.equal(env[key],'');assert.equal(inherited[key],'provider-secret');}
  for(const key of ['DATABASE_URL','DIRECT_URL','SHADOW_DATABASE_URL','PAYROLL_IMMUTABILITY_DATABASE_URL']) assert.equal(env[key],target.toString());
  assert.equal(env.NODE_ENV,'test');assert.equal(env.PATH,'test-path');assert.equal(env.RUN_PAYROLL_BLOCKERS_POSTGRES,'1');
});
