const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { fixture, snapshot } = require('./verify-tender-access-v131.cjs');
const pos = require(path.join(f.root, 'services/pos/pos.service.ts'));
const offline = require(path.join(f.root, 'services/pos/offline-sync.service.ts'));
const { hashBusinessPayload } = require(path.join(f.root, 'services/events/business-event.service.ts'));
const stamp = crypto.randomUUID(), report = { at: new Date().toISOString(), checks: [], scope: 'Owned synthetic cash data; offline PENDING_REPLAY records are direct controlled fixtures, not signature-ingestion evidence.' };
async function eventFor(x, request) {
  const { organizationId, locationId, terminalId, sessionId } = x.ctx;
  const device = await db.pOSOfflineDevice.create({ data: { organizationId, locationId, terminalId, deviceLabel: 'Owned legacy review '+crypto.randomUUID(), deviceFingerprintHash: crypto.randomUUID(), status: 'ACTIVE' } });
  const payload = JSON.parse(JSON.stringify({ commitSale: request }));
  return db.pOSOfflineEvent.create({ data: { organizationId, locationId, terminalId, sessionId, deviceId: device.id, eventType: 'OFFLINE_SALE_CAPTURED', deviceSeq: 1, idempotencyKey: crypto.randomUUID(), payloadHash: hashBusinessPayload(payload), entryHash: crypto.randomUUID(), capturedAtDevice: new Date(), payload, status: 'PENDING_REPLAY' } });
}
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  assert.equal(process.env.NODE_ENV, 'test'); process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS = '1';
  const x = await fixture('legacy-review-' + stamp), legacy = { ...x.commit }; delete legacy.expectedCartRevision;
  const before = await snapshot(x);
  assert.equal((await pos.getPOSSaleCommitStatus(legacy)).kind, 'CART_REVIEW_REQUIRED');
  await assert.rejects(() => pos.commitPOSSale(legacy), error => error.metadata?.reason === 'POS_CART_REVISION_CHANGED');
  assert.equal(await snapshot(x), before);
  for (const scope of [{ userId: 'different-actor' }, { organizationId: 'different-organization' }]) assert.equal((await pos.getPOSSaleCommitStatus({ ...legacy, ...scope })).kind, 'NOT_FOUND');
  const reviewed = await pos.getActivePOSCart(x.ctx);
  await pos.commitPOSSale({ ...legacy, expectedCartRevision: reviewed.revision });
  report.checks.push('Legacy unrecorded request requires explicit current review, rejects unbound commit, isolates scope, then same identifier commits after review');
  const event = await eventFor(x, legacy), committed = await snapshot(x);
  const conflict = await offline.replayPendingOfflineSaleEnvelope({ organizationId: x.ctx.organizationId, userId: x.ctx.userId, offlineEventId: event.id });
  assert.equal(conflict.status, 'BLOCKED'); assert.equal(conflict.blockerCode, 'OFFLINE_REPLAY_REQUEST_CONFLICT');
  assert.equal(await snapshot(x), committed);
  const stored = await db.pOSOfflineEvent.findUniqueOrThrow({ where: { id: event.id } });
  assert.deepEqual(stored.payload, event.payload); assert.equal(stored.payloadHash, event.payloadHash); assert.equal(stored.status, 'BLOCKED'); assert.equal(stored.documentHash, null);
  report.checks.push('Completed re-reviewed sale cannot acknowledge older different queued intent; payload/hash retained and no financial effects');
  const y = await fixture('offline-review-' + stamp), unbound = { ...y.commit }; delete unbound.expectedCartRevision;
  const pending = await eventFor(y, unbound), unchanged = await snapshot(y);
  const blocked = await offline.replayPendingOfflineSaleEnvelope({ organizationId: y.ctx.organizationId, userId: y.ctx.userId, offlineEventId: pending.id });
  assert.equal(blocked.blockerCode, 'OFFLINE_REPLAY_CART_REVIEW_REQUIRED'); assert.equal(await snapshot(y), unchanged);
  assert.deepEqual((await db.pOSOfflineEvent.findUniqueOrThrow({ where: { id: pending.id } })).payload, pending.payload);
  report.checks.push('Unbound pending offline event has durable review-required blocker and unchanged accepted payload, with no sale');
  const matching = await eventFor(x, { ...legacy, expectedCartRevision: reviewed.revision });
  const stable = await snapshot(x);
  const replay = await offline.replayPendingOfflineSaleEnvelope({ organizationId: x.ctx.organizationId, userId: x.ctx.userId, offlineEventId: matching.id });
  assert.equal(replay.status, 'DUPLICATE_REPLAY'); assert.equal(await snapshot(x), stable);
  assert.equal((await db.pOSOfflineEvent.findUniqueOrThrow({ where: { id: matching.id } })).status, 'REPLAYED');
  report.checks.push('Exact recorded request acknowledges matching queued intent with no new financial effects');
  report.passed = true;
}
main().catch(error => { report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  report.sources = Object.fromEntries(['services/pos/pos.service.ts', 'services/pos/offline-sync.service.ts'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
  const file = path.join(__dirname, 'legacy-review-v135-' + stamp + '.json'); console.log(JSON.stringify({ file, ...report }));
  try { fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx' }); } finally { await db.$disconnect(); }
});
