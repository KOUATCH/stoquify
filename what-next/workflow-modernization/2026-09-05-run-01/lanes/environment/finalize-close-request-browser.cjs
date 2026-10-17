"use strict";
// Resume only the read-only final checks for this exact completed browser run.
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const { execFileSync } = require('node:child_process'), sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const name = 'close-evidence-browser-c84ff9be-2d69-48b3-9100-649ced44b971.json', originalBytes = fs.readFileSync(path.join(__dirname, name));
  assert.equal(sha(originalBytes), '669b37c082acaafa8d235a8c0c2cef72020df621a9f36c1a4600f0c8c5bdc00a');
  const original = JSON.parse(originalBytes); assert.equal(original.error, undefined); assert.ok(original.finalizationError.includes('NetTCPIP')); assert.equal(original.journeys.length, 2);
  for (const journey of original.journeys) { assert.equal(journey.passed, true); assert.equal(journey.secondRequestRefusedWithoutEffects, true); assert.equal(journey.conflictingDraftPreserved, true); assert.ok(journey.durableAcceptanceId); }
  const report = { ...original, run: crypto.randomUUID(), resumedAt: new Date().toISOString(), recovery: { original: name, originalSha256: sha(originalBytes), originalFinalizationError: original.finalizationError, journeysRerun: false, databaseWrites: false, driverSha256: sha(fs.readFileSync(__filename)) }, finalizationError: undefined, passed: false };
  try {
    const predecessorBytes = fs.readFileSync(path.join(__dirname, original.predecessor.name)); assert.equal(sha(predecessorBytes), original.predecessor.sha256);
    const predecessor = JSON.parse(predecessorBytes); assert.equal(predecessor.passed, true); assert.equal(predecessor.fixture.synthetic, true);
    assert.equal(predecessor.fixture.organizationId, original.predecessor.organizationId); assert.ok(predecessor.fixture.organizationId.startsWith('workflow_close_write_'));
    h.organizations.push(predecessor.fixture.organizationId);
    const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), 'stoquify_local_registration_20260906_01'); assert.ok(['localhost', '127.0.0.1'].includes(target.hostname)); await helper.withClient(target, helper.assertOwned);
    const command = "$ErrorActionPreference='Stop'; $rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen); if($rows.Count -ne 1){throw 'Expected one listener'}; $p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$rows[0].OwningProcess); $q=Get-CimInstance Win32_Process -Filter ('ProcessId='+$p.ParentProcessId); [pscustomobject]@{address=$rows[0].LocalAddress;pid=$p.ProcessId;parentId=$q.ProcessId;parentCommand=$q.CommandLine}|ConvertTo-Json -Compress";
    const listener = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim());
    assert.equal(listener.pid, original.listenerBefore.pid); assert.equal(listener.pid, 15208); assert.equal(listener.parentId, 18188); assert.equal(listener.address, '127.0.0.1');
    assert.ok(listener.parentCommand.includes(path.join(root, 'node_modules/next/dist/bin/next'))); assert.ok(listener.parentCommand.includes('dev -H 127.0.0.1 -p 3110')); report.listenerAfter = listener;
    report.sourceAfter = Object.fromEntries(Object.keys(original.sourceBefore).map(file => [file, sha(fs.readFileSync(path.join(root, file)))])); assert.deepEqual(report.sourceAfter, original.sourceBefore); report.sourceStable = true;
    assert.equal(sha(fs.readFileSync(path.join(root, original.build.file))), original.build.sha256);
    const snapshot = await h.outside(), other = {};
    for (const model of ['account', 'session']) other[model] = f.hash(await db[model].findMany({ where: { user: { organizationId: { notIn: h.organizations } } }, orderBy: { id: 'asc' } }));
    other.comments = f.hash(await db.accountantComment.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } }));
    report.outsideAfter = { hash: f.hash({ snapshot, other }), snapshot, other }; assert.equal(report.outsideAfter.hash, original.outsideBefore.hash); report.outsideUnchanged = true;
    report.financialAfter = await h.financial(); assert.equal(f.hash(report.financialAfter), f.hash(original.financialBefore)); report.financialUnchanged = true;
    for (const journey of original.journeys) {
      const acceptance = await db.accountantComment.findFirstOrThrow({ where: { id: journey.durableAcceptanceId, organizationId: predecessor.fixture.organizationId, visibility: 'ACCOUNTANT_RESPONSE_ACCEPTED' } });
      assert.equal(acceptance.metadata.requestId, journey.requestId);
    }
    report.passed = true;
  } catch (error) { report.finalizationError = f.safe(error); }
  finally {
    await db.$disconnect(); const filename = path.join(__dirname, 'close-evidence-browser-finalized-' + report.run + '.json'); fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ filename, passed: report.passed, error: report.finalizationError }));
  }
  return report;
}
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(error.code || error.name); process.exit(1); });
