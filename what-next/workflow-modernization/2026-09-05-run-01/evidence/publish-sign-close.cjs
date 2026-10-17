"use strict";
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
if (process.argv[2] !== '--publish') { console.log('Inert: --publish validates source-bound signing/Close evidence and updates the local register.'); process.exit(0); }
const dir = path.resolve(__dirname, '..'), root = path.resolve(dir, '../../..'), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), reportName = 'SIGN_CLOSE_PUBLICATION_2026-10-04.md';
const names = {
  jest: 'evidence/sign-close-jest-817b5f97-59ee-4f46-b491-aab6e266958d.json',
  typecheck: 'evidence/sign-close-typecheck-d8fde2a3-c743-4a27-a622-59be4449b4fa.json',
  lint: 'evidence/sign-close-lint-c5294e09-9302-4649-8666-eae4695484f2.json',
  runtime: 'lanes/environment/sign-close-acceptance-c5f4d73e-0312-4fea-b1ac-38f1b17e9be6.json',
  boundary: 'evidence/sign-close-boundary-631fe8fa-33a8-4684-907a-728bc5c60ae6.json',
};
const bindings = {}, receipts = {};
for (const [key, name] of Object.entries(names)) {
  const bytes = fs.readFileSync(path.join(dir, name)), value = JSON.parse(bytes); receipts[key] = value; bindings[name] = sha(bytes);
  assert.equal(value.passed, key !== 'boundary'); assert.equal(value.sourceStable, true);
  for (const [file, hash] of Object.entries(value.sourcesAfter || value.sourceAfter)) assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, 'Source changed: ' + file);
}
assert.equal(receipts.jest.summary.passed, 164); assert.equal(receipts.jest.summary.failed, 0); assert.equal(receipts.jest.summary.pending, 0); assert.equal(receipts.runtime.checks.length, 5); assert.ok(receipts.runtime.checks.every(row => row.passed)); assert.equal(receipts.runtime.outsideUnchanged, true); assert.equal(Object.keys(receipts.runtime.sourcesAfter).length, 238);
assert.equal(receipts.boundary.summary.activeViolationCount, 1); assert.equal(receipts.boundary.summary.byClassification.PRISMA_CLIENT_BOUNDARY_COUPLING, 1);
for (const name of [reportName, 'SIGN_CLOSE_PUBLICATION_CHECKLIST_2026-10-04.md', 'lanes/environment/sign-close-baseline-8acec900-20b0-469c-ae5a-0229498ad150.json', 'lanes/environment/sign-close-acceptance-84daa58f-7564-4947-a15d-a33673ddd529.json', 'lanes/environment/sign-close-acceptance-82b9833b-98e9-4a9d-b3e1-dda9559aa4bf.json', 'lanes/environment/sign-close-evidence-inspection-3f4e3f28-8295-419a-a37e-18da1808a3aa.json']) bindings[name] = sha(fs.readFileSync(path.join(dir, name)));
const registerFile = path.join(dir, 'WORKFLOW_REGISTER.json'), progressFile = path.join(dir, 'CURRENT_PROGRESS.md'), before = fs.readFileSync(registerFile), progressBefore = fs.readFileSync(progressFile);
assert.equal(sha(before), '60a25d43a5f62e2d249ae3478e62368c2b45521ce73e35ec9f1236c900770d52'); assert.equal(sha(progressBefore), '137ebcd115bcd1fe066f80763201b8c4ab688756d1eee6ed043d26850f094710');
const r = JSON.parse(before), at = new Date().toISOString(), counts = {}; for (const row of r.workflows) counts[row.status] = (counts[row.status] || 0) + 1;
assert.equal(r.workflows.length, 270); assert.equal(r.discoveryComplete, false); assert.deepEqual(counts, { Queued: 264, 'Complete—verified': 4, 'In progress': 2 });
for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) {
  const row = r.workflows.find(value => value.id === id); assert.equal(row.status, 'In progress'); assert.equal(row.closureReview.complete, false);
  row.closureReview.signingClosePublicationCurrent = true;
  row.closureReview.signingClosePublication = { at, report: reportName, runtimeReceipt: names.runtime, sourceFiles: 238, reproducedDefects: 2, runtimeCases: 5, serializableSnapshotRestart: true, allTenantPeriods: true, retainedExports: true, fullCloseReadiness: false, workflowClosure: false };
  row.closureReview.verifiedCriteria.push('Reconciliation signing: old Serializable snapshot/new publication and non-overlapping-period gaps reproduced, complete ordered tenant scope corrected, stale snapshot restart and both actual PostgreSQL lock orders verified, obsolete in-flight collectors discarded, genuine late signature/Close invalidation rolled back, retained certified export and exact retry/replay preserved. Fresh assessment records the actual signature; provider statement evidence remains a genuine readiness blocker.');
  row.evidence = [...new Set([...row.evidence, reportName, ...Object.values(names)])];
  row.remaining = row.remaining.map(text => text.replace('signing versus new Close-assessment publication remains unverified.', 'signing versus new Close-assessment publication is now verified for the scope in SIGN_CLOSE_PUBLICATION_2026-10-04.md.'));
  row.remaining.push('Signing/Close ordering is corrected and verified; complete reconciliation run creation/refresh and other producers against the organization-wide collector, including no-run/non-overlapping periods. Actual recovery still has missing provider-statement evidence. Whole Cash/Close authority, native accessibility, deployment/capacity and release gates remain open; the static service-boundary gate retains one existing journal-page Prisma import finding. See ' + reportName + '.');
  row.implementationStatus += ' Reconciliation signing now coordinates the complete Close period set while preserving Serializable isolation and authentication freshness after waits.';
  row.runtimeStatus += ' Latest signing/Close checkpoint: 164 focused tests, TypeScript/lint and five source-bound owned-database cases pass; static service-boundary gate fails for one unchanged journal-page import. Full readiness remains blocked by genuine provider-statement evidence.';
}
r.updatedAt = at; r.executionPolicy.note = 'Cash primary, Close supporting. Signing/Close publication and non-overlapping-period invalidation corrected; five PostgreSQL cases verified. Next complete reconciliation run creation/refresh invalidation, keeping actual provider-statement readiness, other source producers, authority, accessibility and deployment requirements. Manual-posting scope approval remains unresolved.';
const next = Buffer.from(JSON.stringify(r, null, 2) + '\n'); assert.ok(next.length >= before.length);
const out = path.join(__dirname, 'sign-close-checkpoint-' + crypto.randomUUID()); fs.mkdirSync(out);
fs.writeFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json'), before, { flag: 'wx' }); fs.writeFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'), progressBefore, { flag: 'wx' });
assert.equal(sha(fs.readFileSync(registerFile)), sha(before)); const fd = fs.openSync(registerFile, 'r+'); try { fs.writeFileSync(fd, next); } finally { fs.closeSync(fd); } assert.equal(sha(fs.readFileSync(registerFile)), sha(next));
const publication = { at, report: reportName, registerBefore: sha(before), registerAfter: sha(next), progressBefore: sha(progressBefore), counts, bindings, currentReceipts: Object.values(names), reproducedDefectsCorrected: 2, workflowClosures: 0, goalComplete: false, registerVerified: true, progressUpdatePending: true };
fs.writeFileSync(path.join(out, 'register-publication.json'), JSON.stringify(publication, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ directory: out, registerHash: sha(next), counts, at }));
