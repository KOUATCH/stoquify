"use strict";

// Inert on import and without --run. The coordinator owns the database lane.
// The reproducing baseline and its receipt remain untouched historical evidence.
async function main() {
  const { signedFixture } = require('./verify-sign-notification.cjs');
  const f = require('./statement-recipient-fixtures.cjs');
  const { db, fs, path, crypto, assert, helper } = f;
  const load = file => require(path.join(f.root, file));
  const { runReconciliationSignNotificationWorker } = load('services/reconciliation/reconciliation-sign-notification.worker.ts');
  const { claimBusinessEventOutboxMessages, markBusinessEventOutboxDelivered, markBusinessEventOutboxFailed } = load('services/events/business-event-outbox.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const stamp = crypto.randomUUID(), organizations = [], originalTransaction = db.$transaction;
  const transaction = originalTransaction.bind(db), eventName = 'payment.reconciliation.signed';
  const baselineFile = path.join(__dirname, 'verify-sign-lease-reclaim-baseline.cjs');
  const baselineReceiptFile = path.join(__dirname, 'sign-lease-reclaim-baseline-2586c14a-b971-42c4-b25f-a7d07c49c77b.json');
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const sourceFiles = [...new Set([__filename, baselineFile, baselineReceiptFile, path.join(f.root, 'prisma/schema.prisma'),
    ...Object.keys(require.cache).filter(file => file.startsWith(f.root + path.sep)
      && !file.includes(path.sep + 'node_modules' + path.sep)
      && !file.includes(path.sep + '.auth' + path.sep) && /\.(?:ts|js|cjs)$/.test(file))])].sort();
  const sources = () => Object.fromEntries(sourceFiles.map(file => [path.relative(f.root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))]));
  const retainedModels = ['reconciliationRun', 'matchRecord', 'paymentTransaction', 'journalEntry',
    'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'ledgerAuditEvent', 'businessEvent', 'closeRun', 'closePackExport'];
  const observedModels = ['businessEventOutbox', 'businessEventAudit', 'paymentReconciliationInboxItem', 'auditLog'];
  const report = { run: stamp, at: new Date().toISOString(), cases: [], fixtures: [],
    scope: 'Actual signed reconciliation fixture and actual notification/claim/terminal services; exact owned loopback registration database only. No source candidate injection.',
    limitations: [
      'Only the actual claim API clock advances beyond the existing five-minute lease timeout; no lease/status row is backdated and five minutes of real elapsed time is not claimed.',
      'The accepted worker identity is deliberately reused. Claim identity must also bind attempts and lockedAt.',
      'SENT means durable workspace inbox publication, not external delivery, human acknowledgement or Close certification.',
      'Synthetic provider/settlement prerequisites are inherited; reconciliation and signature come from actual services.',
      'The failure recovery waits the actual existing approximately 30-second retry schedule. It does not alter availableAt or fake a signed event.',
      'Two individually scoped real signed messages are exercised. Continuation within one multi-message claimed batch is not claimed by this runtime.',
      'No product edits, migrations, seeds, delivery worker outside these explicit calls, external messages, listener startup or customer approval.',
    ] };
  function deferred() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; }
  async function bounded(promise, label, milliseconds = 15000) {
    let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(label + ' timed out; proof incomplete')), milliseconds); })]); }
    finally { clearTimeout(timer); }
  }
  const outcome = promise => promise.then(value => ({ success: true, value }), error => ({ success: false, code: error.code, error: f.safe(error) }));
  async function rows(models, where) { const result = {}; for (const model of models) result[model] = await db[model].findMany({ where, orderBy: { id: 'asc' } }); return result; }
  const retained = organizationId => rows(retainedModels, { organizationId });
  const observed = organizationId => rows(observedModels, { organizationId });
  const notices = snapshot => snapshot.paymentReconciliationInboxItem.filter(row => row.idempotencyKey.startsWith('payment-reconciliation.run.signed:'));
  async function outside() {
    const result = {};
    for (const model of [...retainedModels, ...observedModels]) {
      const data = await db[model].findMany({ where: { organizationId: { notIn: organizations } }, orderBy: { id: 'asc' } }); result[model] = { count: data.length, hash: f.hash(data) };
    }
    const existing = await db.organization.findMany({ where: { id: { notIn: organizations } }, orderBy: { id: 'asc' } }); result.organization = { count: existing.length, hash: f.hash(existing) };
    return { hash: f.hash(result), models: result };
  }
  async function guard() {
    assert.equal(helper.database, 'stoquify_local_registration_20260906_01'); assert.equal(f.target.pathname.slice(1), helper.database); assert.ok(['127.0.0.1', 'localhost'].includes(f.target.hostname));
    await assertDisposableDatabaseIdentity(db, helper.database);
    return helper.withClient(f.target, async client => { await helper.assertOwned(client); const identity = (await client.query('SELECT current_database() AS database, inet_server_addr()::text AS server_address, inet_server_port() AS server_port')).rows[0]; return { ...identity, targetHost: f.target.hostname, expectedDatabase: helper.database, ownershipVerified: true, externalFetchDisabled: true }; });
  }
  async function verify(mode) {
    const row = { mode, status: 'running' }; report.cases.push(row);
    const x = await signedFixture('lease-accept-' + mode + '-' + stamp); organizations.push(x.org.id);
    report.fixtures.push({ organizationId: x.org.id, runId: x.run.runId, signerId: x.signer.id, makerId: x.maker.id });
    const retainedBefore = await retained(x.org.id), before = await observed(x.org.id);
    row.retainedBeforeHash = f.hash(retainedBefore);
    const signed = retainedBefore.reconciliationRun.find(run => run.id === x.run.runId); assert.ok(signed?.signedAt && signed.signedById === x.signer.id && signed.certificateHash);
    const jobs = before.businessEventOutbox.filter(job => job.eventName === eventName); assert.equal(jobs.length, 1); const job = jobs[0]; assert.equal(job.status, 'PENDING'); assert.equal(job.attempts, 0);
    const workerId = 'owned-sign-reused-' + mode + '-' + stamp; row.workerId = workerId; row.messageId = job.id;
    const held = deferred(), release = deferred(); let paused = false, oldWorker, actualHandlerError;
    // Every query/result remains genuine. Both terminal and handler now bind
    // attempts, so channel/eventName distinguish the handler read reliably.
    db.$transaction = (work, options) => {
      let handlerRead = false;
      return transaction(tx => work(new Proxy(tx, { get(client, key) {
        if (key !== 'businessEventOutbox') { const value = Reflect.get(client, key); return typeof value === 'function' ? value.bind(client) : value; }
        return new Proxy(client.businessEventOutbox, { get(model, method) {
          const fn = Reflect.get(model, method); if (method !== 'findFirst') return typeof fn === 'function' ? fn.bind(model) : fn;
          return async args => {
            const where = args.where || {}, isHandler = where.channel === 'NOTIFICATION' && where.eventName === eventName;
            if (where.id === job.id && where.organizationId === x.org.id && where.status === 'LOCKED' && where.lockedBy === workerId) {
              if (isHandler) handlerRead = true;
              if (!paused && isHandler === (mode === 'failure')) {
                assert.equal(where.attempts, 1); assert.ok(where.lockedAt instanceof Date, 'The observed read must bind its actual claimed lease timestamp');
                paused = true; row.pausedRead = { id: where.id, organizationId: where.organizationId, attempts: where.attempts, lockedAt: where.lockedAt, handler: isHandler }; held.resolve(); await bounded(release.promise, 'old attempt release');
              }
            }
            return fn.call(model, args);
          };
        } });
      } })), options).catch(error => { if (handlerRead) actualHandlerError = error; throw error; });
    };
    try {
      oldWorker = outcome(runReconciliationSignNotificationWorker({ organizationId: x.org.id, workerId, limit: 1 }));
      await bounded(held.promise, 'old worker reaches exact read');
      const afterPause = await observed(x.org.id), oldLease = afterPause.businessEventOutbox.find(item => item.id === job.id);
      assert.equal(oldLease.status, 'LOCKED'); assert.equal(oldLease.attempts, 1); assert.equal(oldLease.lockedBy, workerId); assert.ok(oldLease.lockedAt);
      assert.equal(notices(afterPause).length, mode === 'success' ? 1 : 0);
      const reclaimAt = new Date(oldLease.lockedAt.getTime() + 5 * 60_000 + 1);
      row.claimClock = { initialLockedAt: oldLease.lockedAt, reclaimAt, actualWallClockAtReclaim: new Date(), staleAfterMilliseconds: 5 * 60_000 };
      const claimed = await claimBusinessEventOutboxMessages({ organizationId: x.org.id, workerId, channels: ['NOTIFICATION'], eventNames: [eventName], limit: 1, now: reclaimAt });
      assert.equal(claimed.length, 1); const claim2 = claimed[0]; assert.equal(claim2.id, job.id); assert.equal(claim2.attempts, 2); assert.equal(claim2.lockedAt.getTime(), reclaimAt.getTime());
      const reclaimed = await observed(x.org.id), lease2 = reclaimed.businessEventOutbox.find(item => item.id === job.id); assert.equal(lease2.status, 'LOCKED'); assert.equal(lease2.lockedBy, workerId);
      row.currentClaim = { messageId: claim2.id, attempts: claim2.attempts, lockedAt: claim2.lockedAt, leaseHash: f.hash(lease2), auditHash: f.hash(reclaimed.businessEventAudit) };
      release.resolve(); row.oldWorker = await bounded(oldWorker, 'old worker finishes without owning current lease');
      assert.equal(row.oldWorker.success, true, row.oldWorker.error); assert.equal(row.oldWorker.value.length, 1); assert.equal(row.oldWorker.value[0].messageId, job.id); assert.equal(row.oldWorker.value[0].status, 'LEASE_LOST');
      const afterStale = await observed(x.org.id);
      assert.deepEqual(afterStale, reclaimed, 'Stale success/failure must preserve the entire newer lease, audit, inbox and unrelated jobs');
      assert.deepEqual(await retained(x.org.id), retainedBefore); assert.deepEqual(afterStale.paymentReconciliationInboxItem, afterPause.paymentReconciliationInboxItem); assert.deepEqual(afterStale.auditLog, before.auditLog);
      row.staleAttempt = { outcome: 'LEASE_LOST', currentLeaseUnchanged: true, allAuditRowsUnchanged: true, inboxUnchanged: true, retainedSignatureFinancialCloseUnchanged: true };
      // Stop observing before the current owner settles its real second claim.
      db.$transaction = originalTransaction;
      const lease = { organizationId: x.org.id, workerId, messageId: claim2.id, attempts: claim2.attempts, lockedAt: claim2.lockedAt };
      let currentResult;
      if (mode === 'success') {
        assert.equal(notices(afterStale).length, 1, 'The actual handler has already durably published the signed observation');
        currentResult = await markBusinessEventOutboxDelivered(lease);
        assert.equal(currentResult.status, 'SENT'); row.currentOwnerRecovery = { kind: 'actual-claim-2-terminal-ack-after-existing-publication', result: currentResult };
      } else {
        assert.ok(actualHandlerError, 'Actual rejected handler error must be retained, not fabricated for retry'); assert.equal(actualHandlerError.code, 'CONFLICT');
        const failed = await markBusinessEventOutboxFailed({ ...lease, error: actualHandlerError }); assert.equal(failed.status, 'FAILED'); assert.equal(failed.attempts, 2);
        const failedState = await observed(x.org.id), actualFailed = failedState.businessEventOutbox.find(item => item.id === job.id);
        assert.equal(actualFailed.status, 'FAILED'); assert.equal(actualFailed.attempts, 2); assert.equal(actualFailed.lockedAt, null); assert.equal(actualFailed.lockedBy, null); assert.equal(actualFailed.lastErrorCode, actualHandlerError.code);
        assert.equal(actualFailed.availableAt.getTime() - actualFailed.failedAt.getTime(), 30000, 'Use actual attempt-2 exponential retry policy');
        assert.equal(notices(failedState).length, 0);
        assert.deepEqual(await runReconciliationSignNotificationWorker({ organizationId: x.org.id, workerId, limit: 1 }), []); assert.deepEqual(await observed(x.org.id), failedState);
        const waitMs = Math.max(0, actualFailed.availableAt.getTime() - Date.now()) + 25; assert.ok(waitMs <= 45000);
        row.backoff = { availableAt: actualFailed.availableAt, failedAt: actualFailed.failedAt, actualWaitMs: waitMs, startedAt: new Date() }; console.log(JSON.stringify({ mode, awaitingExistingRetryBackoffMs: waitMs }));
        await new Promise(resolve => setTimeout(resolve, waitMs)); row.backoff.finishedAt = new Date(); assert.ok(Date.now() >= actualFailed.availableAt.getTime());
        const recovered = await runReconciliationSignNotificationWorker({ organizationId: x.org.id, workerId, limit: 1 }); assert.equal(recovered.length, 1); assert.equal(recovered[0].status, 'SENT'); currentResult = recovered[0];
        row.currentOwnerRecovery = { kind: 'actual-claim-2-failure-and-real-scheduled-worker-claim-3', handlerErrorCode: actualHandlerError.code, failed, result: currentResult };
      }
      const completed = await observed(x.org.id), terminal = completed.businessEventOutbox.find(item => item.id === job.id);
      assert.equal(terminal.status, 'SENT'); assert.equal(terminal.attempts, mode === 'success' ? 2 : 3); assert.equal(terminal.lockedAt, null); assert.equal(terminal.lockedBy, null); assert.ok(terminal.processedAt); assert.equal(notices(completed).length, 1);
      if (mode === 'success') assert.deepEqual(completed.paymentReconciliationInboxItem, afterPause.paymentReconciliationInboxItem);
      const targetAudits = completed.businessEventAudit.filter(item => item.metadata?.outboxMessageId === job.id);
      const delivered = targetAudits.filter(item => item.action === 'OUTBOX_DELIVERED'), retries = targetAudits.filter(item => item.action === 'OUTBOX_RETRY');
      assert.equal(delivered.length, 1); assert.equal(delivered[0].metadata.attempts, mode === 'success' ? 2 : 3); assert.equal(retries.length, mode === 'success' ? 0 : 1); if (retries.length) assert.equal(retries[0].metadata.attempts, 2);
      assert.equal(targetAudits.filter(item => item.action === 'OUTBOX_DEAD_LETTERED').length, 0);
      const unrelated = snapshot => snapshot.businessEventOutbox.filter(item => item.id !== job.id); assert.deepEqual(unrelated(completed), unrelated(before)); assert.deepEqual(completed.auditLog, before.auditLog);
      assert.deepEqual(await retained(x.org.id), retainedBefore); assert.deepEqual(await runReconciliationSignNotificationWorker({ organizationId: x.org.id, workerId, limit: 1 }), []); assert.deepEqual(await observed(x.org.id), completed);
      row.final = { messageId: terminal.id, status: terminal.status, attempts: terminal.attempts, inboxId: notices(completed)[0].id, inboxHash: f.hash(notices(completed)), deliveredAuditId: delivered[0].id, retryAuditIds: retries.map(item => item.id), retainedHash: f.hash(await retained(x.org.id)), exactRepeatNoEffects: true };
      row.status = 'passed';
    } finally { release.resolve(); try { if (oldWorker) await bounded(oldWorker, 'finally settle old worker', 22000); } finally { db.$transaction = originalTransaction; } }
  }
  try {
    report.identity = await guard();
    const baseline = JSON.parse(fs.readFileSync(baselineReceiptFile, 'utf8')); assert.equal(baseline.run, '2586c14a-b971-42c4-b25f-a7d07c49c77b'); assert.equal(baseline.baselineProofComplete, true); assert.equal(baseline.defectReproduced, true);
    report.baseline = { source: path.basename(baselineFile), sourceSha256: sha(fs.readFileSync(baselineFile)), receipt: path.basename(baselineReceiptFile), receiptSha256: sha(fs.readFileSync(baselineReceiptFile)), reproducedBothPaths: true };
    report.sourcesBefore = sources(); report.outsideBefore = await outside();
    for (const mode of ['success', 'failure']) { try { await verify(mode); } catch (error) { const row = report.cases.at(-1); row.status = 'failed'; row.error = f.safe(error); } console.log(JSON.stringify({ mode, status: report.cases.at(-1).status, error: report.cases.at(-1).error })); }
  } catch (error) { report.error = f.safe(error); }
  finally {
    db.$transaction = originalTransaction;
    try { report.sourcesAfter = sources(); report.sourceStable = !!report.sourcesBefore && f.hash(report.sourcesBefore) === f.hash(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = !!report.outsideBefore && report.outsideBefore.hash === report.outsideAfter.hash; } catch (error) { report.finalizationError = f.safe(error); }
    try { await db.$disconnect(); } catch (error) { report.disconnectError = f.safe(error); }
    report.passed = report.cases.length === 2 && report.cases.every(row => row.status === 'passed') && report.sourceStable && report.outsideUnchanged && !report.error && !report.finalizationError && !report.disconnectError;
    const output = path.join(__dirname, 'sign-lease-acceptance-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ output, passed: report.passed, cases: report.cases.map(row => ({ mode: row.mode, status: row.status })), sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged }));
  }
  return report;
}
module.exports = { main };
if (require.main === module) {
  if (process.argv[2] !== '--run') console.log('Prepared only. --run requires source freeze, review and coordinator release.');
  else main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(String(error?.message || error).replace(/postgres(?:ql)?:\/\/\S+/gi, '[database URL redacted]')); process.exit(1); });
}
