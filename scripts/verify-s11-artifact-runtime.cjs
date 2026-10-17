// Starts only the retained S11 synthetic artifact, bound to loopback; never loads app .env.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const os = require('node:os');
const crypto = require('node:crypto');
const { filesUnder } = require('./release-artifact.cjs');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
async function main() {
  const [reportPath, output] = process.argv.slice(2);
  const report = JSON.parse(fs.readFileSync(reportPath));
  const fixture = path.resolve(report.fixture);
  const allowed = path.resolve('.codex-tmp');
  assert.equal(path.dirname(fixture), allowed);
  assert.match(path.basename(fixture), /^s11-[a-f0-9]{10}$/);
  assert.equal(report.artifact.sourceClass, 'Real Next standalone fixture; not the full Stoquify application');
  const artifact = path.resolve(report.artifact.destination);
  assert.equal(path.dirname(artifact), fixture); assert.match(path.basename(artifact), /^artifact(?:-final)?$/);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(artifact, 'artifact.json'))).digest('hex'), report.artifact.sha256);
  // Run outside repository ancestors: a missing dependency must not resolve from
  // the developer's node_modules and falsely certify a self-contained bundle.
  const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 's11-artifact-runtime-'));
  fs.cpSync(path.join(artifact, 'runtime'), runtime, { recursive: true });
  assert.deepEqual(filesUnder(runtime), filesUnder(path.join(artifact, 'runtime')));
  const port = await new Promise(resolve => { const reservation = net.createServer(); reservation.listen(0, '127.0.0.1', () => { const value = reservation.address().port; reservation.close(() => resolve(value)); }); });
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE)$/i.test(key)));
  Object.assign(env, { NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(port), NEXT_TELEMETRY_DISABLED: '1' });
  const child = spawn(process.execPath, [path.join(runtime, 'server.js')], { cwd: runtime, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let logs = ''; child.stdout.on('data', bytes => { logs += bytes; }); child.stderr.on('data', bytes => { logs += bytes; });
  const exited = new Promise(resolve => child.once('exit', resolve));
  try {
    let response;
    for (let attempt = 0; attempt < 80; attempt++) {
      if (child.exitCode !== null) throw new Error('Fixture runtime exited');
      try { response = await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1000) }); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    assert.equal(response?.status, 200);
    assert.match(await response.text(), /S11 local compiler fixture/);
    const asset = await fetch(`http://127.0.0.1:${port}/probe.txt`);
    assert.equal(asset.status, 200);
    assert.equal(await asset.text(), 's11-local-only');
    fs.writeFileSync(output, JSON.stringify({ artifactSha256: report.artifact.sha256, isolatedRuntime: runtime, copiedBytesVerified: true, loopbackOnly: true, html: 200, publicAsset: 200, evidenceClass: 'HTTP smoke of compiled synthetic standalone artifact; no browser or full app qualification' }, null, 2), { flag: 'wx' });
    console.log('Standalone fixture HTTP and public asset passed');
  } finally { child.kill(); await exited; fs.writeFileSync(output + '.log', logs, { flag: 'wx' }); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
