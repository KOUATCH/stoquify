// Read existing certified-close fixtures through isolated historical/current owners.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const f = JSON.parse(fs.readFileSync('.codex-tmp/workflow-closure-private.json', 'utf8')), u = new URL(f.url);
if (u.hostname !== 'localhost' || u.pathname !== '/stoquify_pos_audit_20261026_d30f' || u.searchParams.get('schema') !== 'public') throw Error('Wrong disposable database');
const env = {};
for (const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC']) if (process.env[key]) env[key] = process.env[key];
Object.assign(env, { NODE_ENV: 'test', DATABASE_URL: f.url, DIRECT_URL: f.url, SHADOW_DATABASE_URL: f.url, WORKFLOW_PHASE3_DATABASE: u.pathname.slice(1), PURCHASE_ORDER_AUTHORING_UI_ENABLED: 'false', PURCHASE_ORDER_AUTHORING_WRITES_ENABLED: 'false' });
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, '../close-browser/database-readback.json'), 'utf8')).rows, results = [];
try {
  for (const row of fixtures) {
    const approval = row.seals[0].approval;
    const input = { organizationId: row.organizationId, periodId: row.period.id, closeRunId: approval.closeRunId, exportId: approval.certifiedExportId };
    const versions = {};
    for (const source of ['baseline', 'current']) {
      const prefix = path.resolve('.codex-tmp/mixed-version-work', crypto.randomUUID()), job = prefix + '.json', output = prefix + '-result.json';
      fs.writeFileSync(job, JSON.stringify({ op: 'closeRead', input }));
      const r = spawnSync(process.execPath, ['node_modules/jest/bin/jest.js', '--config', 'jest.mixed-version-worker.config.cjs', '--runInBand', '--silent'], { env: { ...env, MIXED_SOURCE: source, MIXED_JOB: job, MIXED_RESULT: output }, encoding: 'utf8', windowsHide: true, timeout: 180000 });
      fs.writeFileSync(prefix + '.log', String(r.stdout) + String(r.stderr));
      assert.equal(r.status, 0, 'Worker process failed: ' + source);
      const response = JSON.parse(fs.readFileSync(output, 'utf8')); assert.equal(response.ok, true, JSON.stringify(response.error));
      versions[source] = response.value;
      assert.equal(response.value.certificate.contentHash, approval.contentHash); assert.equal(response.value.certificate.isCertified, true); assert.equal(response.value.sealCount, 1);
    }
    assert.deepEqual(versions.current, versions.baseline);
    results.push({ locale: row.locale, status: 'PASS', input, versions });
    console.log(row.locale + ': old/current retained close dashboard, evidence graph, certificate and seal reads match');
  }
} catch (e) { results.push({ status: 'FAIL', error: String(e.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[redacted URL]') }); process.exitCode = 1; }
fs.writeFileSync(path.join(__dirname, 'close-read-results.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
