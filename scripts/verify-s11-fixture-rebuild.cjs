// Resume only the compiler/artifact portion; preserve already verified disposable DBs.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { prepare, verify } = require('./release-artifact.cjs');
const fixtureBuild = require('./s11-fixture-build.cjs');
async function main() {
  const [priorPath, output, resumeFixture] = process.argv.slice(2);
  const prior = JSON.parse(fs.readFileSync(priorPath));
  const priorFixture = path.resolve(prior.fixture), root = process.cwd();
  assert.equal(path.dirname(priorFixture), path.resolve('.codex-tmp')); assert.match(path.basename(priorFixture), /^s11-[a-f0-9]{10}$/);
  // A failed trace can leave partial node_modules above its app. Use a fresh sibling
  // so Node resolution cannot pick those incomplete packages instead of the locked dependencies.
  const fixture = resumeFixture ? path.resolve(resumeFixture) : path.join(root, '.codex-tmp', 's11-' + crypto.randomBytes(5).toString('hex'));
  assert.equal(path.dirname(fixture), path.resolve('.codex-tmp')); assert.match(path.basename(fixture), /^s11-[a-f0-9]{10}$/);
  const app = path.join(fixture, 'app-final'), artifact = path.join(fixture, 'artifact-final');
  assert.equal(fs.existsSync(output), false);
  if (!resumeFixture) {
    assert.equal(fs.existsSync(app), false);
    fs.mkdirSync(path.join(app, 'app'), { recursive: true }); fs.mkdirSync(path.join(app, 'public'));
    for (const file of ['package.json', 'app/layout.js', 'public/probe.txt']) fs.copyFileSync(path.join(priorFixture, 'app-fixture', file), path.join(app, file));
    fixtureBuild.configure(root, app);
  } else {
    assert.match(fs.readFileSync(path.join(app, 'next.config.js'), 'utf8'), /outputFileTracingRoot:__dirname/);
    assert.ok(fs.existsSync(path.join(app, 'node_modules/next/package.json')));
  }
  const identity = () => ['package.json', 'next.config.js', 'app/layout.js', 'app/page.js', 'public/probe.txt'].map(file => ({ path: file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(app, file))).digest('hex') }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE|SystemDrive|PROCESSOR_ARCHITECTURE|NUMBER_OF_PROCESSORS)$/i.test(key)));
  Object.assign(env, { NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' });
  let attempt = 0;
  const runScript = async () => {
    const result = fixtureBuild.compile(root, app, env);
    fs.writeFileSync(output + `.compile-${++attempt}.log`, (result.stdout || '') + (result.stderr || ''), { flag: 'wx' });
    if (result.status !== 0) throw new Error('Fixture compilation failed: ' + (result.error?.code || result.status));
  };
  fs.writeFileSync(path.join(app, 'app/page.js'), 'export default function Page( {');
  await assert.rejects(prepare(app, artifact, { sourceIdentity: identity, runScript, env }), /compilation failed/);
  assert.equal(fs.existsSync(artifact), false);
  fs.writeFileSync(path.join(app, 'app/page.js'), "export default function Page() { return <main>S11 local compiler fixture</main> }");
  const sealed = await prepare(app, artifact, { sourceIdentity: identity, runScript, env });
  verify(app, artifact, sealed.sha256, { sourceIdentity: identity });
  fs.writeFileSync(output, JSON.stringify({ ...prior, fixture, databaseEvidence: path.resolve(priorPath), artifact: { ...sealed, sourceClass: 'Real Next standalone fixture; not the full Stoquify application', traceRootCorrected: true }, compilerRetest: { failedBuildProducedNoArtifact: true, deploymentCredentialsAvailable: false } }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify(sealed));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
