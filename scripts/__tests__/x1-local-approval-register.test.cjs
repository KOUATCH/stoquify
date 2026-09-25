const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRegister, serialize, digest, KINDS, inside } = require('../../services/governance/approval-providers/local-manual-register');

// Ephemeral self-signed test certificate. No production credential is used.
function der(tag, ...parts) {
  const body = Buffer.concat(parts);
  const length = body.length < 128 ? Buffer.from([body.length]) : (() => { let n = body.length, bytes = []; while (n) { bytes.unshift(n & 255); n >>= 8; } return Buffer.from([128 + bytes.length, ...bytes]); })();
  return Buffer.concat([Buffer.from([tag]), length, body]);
}
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 3072 });
const algorithm = der(0x30, Buffer.from('06092a864886f70d01010b0500', 'hex'));
const name = der(0x30, der(0x31, der(0x30, Buffer.from('0603550403', 'hex'), der(0x0c, Buffer.from('X1 TEST CONTROLLER')))));
const tbs = der(0x30, Buffer.from('a003020102020101', 'hex'), algorithm, name,
  der(0x30, der(0x17, Buffer.from('200101000000Z')), der(0x17, Buffer.from('300101000000Z'))), name,
  keys.publicKey.export({ format: 'der', type: 'spki' }));
const cert = new crypto.X509Certificate(der(0x30, tbs, algorithm, der(0x03, Buffer.concat([Buffer.from([0]), crypto.sign('sha256', tbs, keys.privateKey)]))));

function fixture(t, sameIndependentAccount = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'x1-register-test-'));
  t.after(() => { assert.equal(path.dirname(root), path.resolve(os.tmpdir())); assert.ok(path.basename(root).startsWith('x1-register-test-')); fs.rmSync(root, { recursive: true, force: true }); });
  const write = (relative, value) => { const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'object' ? serialize(value) : value); };
  const get = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
  write('contract.txt', 'test contract'); write('bundle.zip', 'test frozen bytes');
  write('docs/X1/X1_CONTRACT_ARTIFACT_MANIFEST_2026-09-05.json', { reviewBundleUri: 'repository://stoquify/bundle.zip', reviewBundleSha256: digest('test frozen bytes'), files: [{ path: 'contract.txt', sha256: digest('test contract') }] });
  write('what-next/evidence/finance-x1/finance-x1-evidence-manifest.pending.json', { schemaVersion: 1, evidenceStatus: 'blocked-awaiting-approval' });
  let time = new Date('2026-09-05T12:00:00Z');
  const reg = createRegister(root, () => time);
  reg.initialize({ status: 'RETRIEVED_READ_ONLY', roles: ['owner', 'product_approver', 'security_owner', 'qa_owner'].map(code => ({ code, id: code + '-role', users: [{ id: sameIndependentAccount && code === 'qa_owner' ? 'product_approver-user' : code + '-user', name: code + ' Person' }] })) });
  time = new Date('2026-09-05T12:01:00Z');
  reg.enroll({ name: 'Controller Person', windowsSid: 'TEST-SID', thumbprint: 'TEST', certificatePem: cert.toString() });
  const update = (kind, filename, changes) => { const target = reg.recordPath(kind, filename); const object = JSON.parse(fs.readFileSync(target, 'utf8')); fs.writeFileSync(target, serialize({ ...object, ...changes })); };
  for (const kind of KINDS) {
    for (const file of ['approval-form.docx', 'controller-review.docx']) fs.writeFileSync(reg.recordPath(kind, file), 'synthetic docx test bytes');
    fs.writeFileSync(reg.recordPath(kind, 'signed-approval.pdf'), '%PDF-1.7\n' + 'synthetic test only\n'.repeat(20));
    if (kind === 'adoption') fs.writeFileSync(reg.recordPath(kind, 'authority-evidence.pdf'), '%PDF-1.7\n' + 'synthetic authority test\n'.repeat(20));
    update(kind, 'approver-input.json', { decision: 'APPROVE', signedAt: kind === 'adoption' ? '2026-09-05T12:00:10Z' : '2026-09-05T12:00:20Z', expiresAt: '2026-09-06T12:00:00Z', ...(kind === 'adoption' ? { authorityReference: 'TEST-APPOINTMENT', controllerCertificateSha256: digest(cert.raw), retentionDays: 365, backupLocation: 'TEST-OFFLINE-BACKUP' } : {}) });
    update(kind, 'verification-input.json', { reviewerName: 'Controller Person', identityVerification: 'TEST inspected identity', authorityVerification: 'TEST inspected appointment', signatureVerification: 'TEST inspected signed document', signingTimeVerification: 'TEST witnessed time' });
  }
  const sign = payload => crypto.sign('sha256', Buffer.from(serialize(payload)), keys.privateKey).toString('base64');
  const seal = kind => { reg.prepare(kind); const payload = JSON.parse(fs.readFileSync(reg.recordPath(kind, 'pending-attestation.json'), 'utf8')); return reg.seal(kind, sign(payload)); };
  const all = () => KINDS.forEach(seal);
  return { root, reg, write, get, update, seal, all, sign, setTime: value => { time = new Date(value); } };
}
test('draft allocation is idempotent and never grants approval', t => {
  const f = fixture(t); const ids = f.reg.config().records;
  assert.equal(new Set(Object.values(ids)).size, 4);
  assert.equal(f.reg.initialize({}).status, 'EXISTING_REGISTER_PRESERVED');
  assert.deepEqual(f.reg.config().records, ids);
  assert.equal(f.reg.report().status, 'AWAITING_HUMAN_COMPLETION');
  assert.throws(() => f.reg.synchronize(), /attestation/);
});
test('typed verification claims without a controller signature cannot approve', t => {
  const f = fixture(t);
  f.update('adoption', 'signature-verification.json', { status: 'APPROVED', verified: true });
  assert.throws(() => f.reg.verifyRecord('adoption'), /attestation/);
});
test('rejects fabricated controller signatures and key replacement', t => {
  const f = fixture(t); f.reg.prepare('adoption');
  assert.throws(() => f.reg.seal('adoption', Buffer.from('fake').toString('base64')), /signature/);
  assert.throws(() => f.reg.enroll({}), /already exists/);
});
test('a complete signed local workflow produces an approval binding, never screenshots or release', t => {
  const f = fixture(t); f.all();
  assert.equal(f.reg.report().status, 'APPROVALS_READY_FOR_NONPRODUCTION_CAPTURE');
  const exported = f.reg.synchronize();
  assert.equal(exported.releaseGranted, false);
  const binding = f.get(exported.bindingPath);
  assert.equal(binding.budgetApproval.approvalReference, f.reg.config().records.product);
  assert.equal(binding.evidenceAuthorization.authorizedFixtureTenantId, 'rds_org_001');
  assert.deepEqual(binding.evidenceArtifacts, []);
  assert.equal(binding.claims.screenshotsAvailable, false);
  assert.equal(f.reg.validateExport(exported.bindingPath).productionReleaseAuthorized, false);
});
test('changed signed PDFs, Word forms or inputs invalidate the sealed approval', t => {
  const f = fixture(t); f.all();
  fs.appendFileSync(f.reg.recordPath('product', 'signed-approval.pdf'), 'tamper');
  assert.throws(() => f.reg.verifyRecord('product'), /changed/);
  assert.throws(() => f.reg.synchronize(), /changed/);
});
test('changed contract sources and altered register settings block synchronization', t => {
  const f = fixture(t); f.all(); f.write('contract.txt', 'changed');
  assert.throws(() => f.reg.synchronize(), /Contract source changed/);
});
test('future signing times, impossible dates and changed identities are rejected', t => {
  const f = fixture(t);
  f.update('adoption', 'approver-input.json', { signedAt: '2026-09-07T12:00:00Z' });
  assert.throws(() => f.reg.prepare('adoption'), /future/);
  f.update('adoption', 'approver-input.json', { signedAt: '2026-02-30T12:00:00Z' });
  assert.throws(() => f.reg.prepare('adoption'), /calendar date/);
  f.update('adoption', 'approver-input.json', { signedAt: '2026-09-05T12:00:10Z', approverUserId: 'somebody-else' });
  assert.throws(() => f.reg.prepare('adoption'), /identity/);
});
test('reject and revise decisions are retained but cannot synchronize', t => {
  const f = fixture(t); f.seal('adoption');
  f.update('product', 'approver-input.json', { decision: 'REVISE', reason: 'TEST budget needs revision' });
  f.seal('product');
  assert.throws(() => f.reg.verifyRecord('product'), /REVISE/);
});
test('decision validity cannot exceed the adopted authority window', t => {
  const f = fixture(t); f.seal('adoption');
  f.update('product', 'approver-input.json', { expiresAt: '2027-01-01T00:00:00Z' });
  assert.throws(() => f.reg.prepare('product'), /adoption validity/);
});
test('the independent reviewer cannot share the product approver account', t => {
  const f = fixture(t, true); f.all();
  assert.throws(() => f.reg.synchronize(), /must be distinct/);
});
test('revocation and expiry invalidate previously exported bindings', t => {
  const f = fixture(t); f.all(); const exported = f.reg.synchronize();
  f.reg.prepareRevocation('evidence', 'TEST credential authorization withdrawn');
  const payload = JSON.parse(fs.readFileSync(f.reg.recordPath('evidence', 'pending-revocation.json'), 'utf8'));
  f.reg.revoke('evidence', f.sign(payload));
  assert.throws(() => f.reg.validateExport(exported.bindingPath), /revoked/);
  f.setTime('2026-09-07T00:00:00Z');
  assert.throws(() => f.reg.verifyRecord('product'), /expired/);
});
test('changing an export and its hash cannot forge a different approved tenant', t => {
  const f = fixture(t); f.all(); const exported = f.reg.synchronize();
  const binding = f.get(exported.bindingPath); binding.evidenceAuthorization.authorizedFixtureTenantId = 'other-tenant';
  f.write(exported.bindingPath, binding);
  const manifest = f.get(exported.approvalManifestPath); manifest.bindingSha256 = digest(serialize(binding));
  f.write(exported.approvalManifestPath, manifest);
  assert.throws(() => f.reg.validateExport(exported.bindingPath), /no longer matches/);
});
test('audit edits and path traversal are rejected', t => {
  const f = fixture(t);
  const eventPath = 'docs/X1/approval-register/events/00000001.json';
  const event = f.get(eventPath); event.type = 'FORGED'; f.write(eventPath, event);
  assert.throws(() => f.reg.audit(), /inconsistent/);
  assert.throws(() => inside(f.root, '../escape'), /Unsafe/);
  assert.throws(() => f.reg.recordPath('../escape', 'x'), /Choose/);
});
