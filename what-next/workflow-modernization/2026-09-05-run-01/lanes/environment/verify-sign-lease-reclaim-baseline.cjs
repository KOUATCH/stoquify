"use strict";

// Inert on import and without --run. The coordinator owns execution of this
// deliberately failing product-contract baseline in the existing disposable DB.
async function main() {
  const { signedFixture } = require('./verify-sign-notification.cjs');
  const f = require('./statement-recipient-fixtures.cjs');
  const { db, fs, path, crypto, assert, helper } = f;
  const load = file => require(path.join(f.root, file));
  const { runReconciliationSignNotificationWorker } = load('services/reconciliation/reconciliation-sign-notification.worker.ts');
  const { claimBusinessEventOutboxMessages } = load('services/events/business-event-outbox.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const stamp = crypto.randomUUID(), organizations = [], originalTransaction = db.$transaction;
  const transaction = originalTransaction.bind(db), eventName = 'payment.reconciliation.signed';
  const sourceFiles = [...new Set([__filename, path.join(f.root, 'prisma/schema.prisma'),
    ...Object.keys(require.cache).filter(file => file.startsWith(f.root + path.sep)
      && !file.includes(path.sep + 'node_modules' + path.sep)
      && !file.includes(path.sep + '.auth' + path.sep) && /\.(?:ts|js|cjs)$/.test(file))])].sort();
  const sources = () => Object.fromEntries(sourceFiles.map(file => [path.relative(f.root, file).replaceAll('\\', '/'),
    crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
  const retainedModels = ['reconciliationRun', 'matchRecord', 'paymentTransaction', 'journalEntry',
    'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'ledgerAuditEvent', 'businessEvent',
    'closeRun', 'closePackExport'];
  const observedModels = ['businessEventOutbox', 'businessEventAudit', 'paymentReconciliationInboxItem', 'auditLog'];
  const report = { run: stamp, at: new Date().toISOString(), cases: [], fixtures: [], safetyContractSatisfied: null,
    purpose: 'Source-bound baseline reproduction, not product acceptance or workflow closure.',
    scope: 'Actual signed reconciliation fixture, actual notification worker and actual claim service; existing owned loopback DB only.',
    limitations: ['The supplied reclaim clock advances only the lease-selection input beyond its existing five-minute timeout; it does not claim five minutes of real elapsed time.',
      'The accepted worker identity is deliberately reused across two claims. CLI guidance recommends a unique worker identity but the current service accepts this sequence.',
      'SENT means durable workspace inbox publication, not external delivery, reader acknowledgement or Close certification.',
      'Synthetic provider/settlement setup is inherited from the existing guarded fixture; the run itself is reconciled and signed through actual services.',
      'No product edits, migrations, seeds, direct lease/status writes, external messages, listener startup or production approval.'] };
  function deferred() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; }
  async function bounded(promise, label, milliseconds = 12000) {
    let timer;
    try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out; proof incomplete')), milliseconds); })]); }
    finally { clearTimeout(timer); }
  }
  const outcome = promise => promise.then(value => ({ success: true, value }), error => ({ success: false, code: error.code, error: f.safe(error) }));
  async function rows(models, where) {
    const result = {};
    for (const model of models) result[model] = await db[model].findMany({ where, orderBy: { id: 'asc' } });
    return result;
  }
  const retained = organizationId => rows(retainedModels, { organizationId });
  const observed = organizationId => rows(observedModels, { organizationId });
  async function outside() {
    const result = {};
    for (const model of [...retainedModels, ...observedModels]) {
      const data = await db[model].findMany({ where: { organizationId: { notIn: organizations } }, orderBy: { id: 'asc' } });
      result[model] = { count: data.length, hash: f.hash(data) };
    }
    const existingOrganizations = await db.organization.findMany({ where: { id: { notIn: organizations } }, orderBy: { id: 'asc' } });
    result.organization = { count: existingOrganizations.length, hash: f.hash(existingOrganizations) };
    return { hash: f.hash(result), models: result };
  }
  async function guard() {
    await assertDisposableDatabaseIdentity(db, helper.database);
    return helper.withClient(f.target, async client => {
      await helper.assertOwned(client);
      const identity = (await client.query('SELECT current_database() AS database, inet_server_addr()::text AS server_address, inet_server_port() AS server_port')).rows[0];
      return { ...identity, targetHost: f.target.hostname, expectedDatabase: helper.database, ownershipVerified: true, startsListener: false, externalFetchDisabled: true };
    });
  }
  async function reproduce(mode) {
    const row = { mode, scope: mode === 'success' ? 'Pause old terminal acknowledgement after actual inbox publication.' : 'Pause old handler before its actual attempt-bound lease read.' };
    report.cases.push(row);
    const x = await signedFixture('lease-baseline-' + mode + '-' + stamp);
    organizations.push(x.org.id);
    report.fixtures.push({ organizationId: x.org.id, runId: x.run.runId, signerId: x.signer.id, makerId: x.maker.id });
    row.retainedBefore = await retained(x.org.id);
    const signed = row.retainedBefore.reconciliationRun.find(run => run.id === x.run.runId);
    assert.ok(signed?.signedAt && signed.signedById === x.signer.id && signed.certificateHash, 'Actual fixture must retain a signed certificate.');
    row.before = await observed(x.org.id);
    const jobs = row.before.businessEventOutbox.filter(job => job.eventName === eventName);
    assert.equal(jobs.length, 1); const job = jobs[0]; assert.equal(job.status, 'PENDING'); assert.equal(job.attempts, 0);
    const workerId = 'owned-sign-reused-' + mode + '-' + stamp;
    row.workerId = workerId; row.messageId = job.id;
    const held = deferred(), release = deferred(); let paused = false, oldWorker;
    // This observer only pauses the exact signed message. It returns every real
    // delegate result and never supplies a lease, signature or business outcome.
    db.$transaction = (work, options) => transaction(tx => work(new Proxy(tx, { get(client, key) {
      if (key !== 'businessEventOutbox') { const value = Reflect.get(client, key); return typeof value === 'function' ? value.bind(client) : value; }
      return new Proxy(client.businessEventOutbox, { get(model, method) {
        const fn = Reflect.get(model, method); if (method !== 'findFirst') return typeof fn === 'function' ? fn.bind(model) : fn;
        return async args => {
          const where = args.where || {}, isHandler = Object.prototype.hasOwnProperty.call(where, 'attempts');
          if (!paused && where.id === job.id && where.organizationId === x.org.id && where.status === 'LOCKED'
            && where.lockedBy === workerId && isHandler === (mode === 'failure')) {
            paused = true; row.pausedRead = args; held.resolve(); await bounded(release.promise, 'old attempt release');
          }
          return fn.call(model, args);
        };
      } });
    } })), options);
    try {
      oldWorker = outcome(runReconciliationSignNotificationWorker({ organizationId: x.org.id, workerId, limit: 1 }));
      await bounded(held.promise, 'old worker observation');
      row.afterOldPause = await observed(x.org.id);
      const oldLease = row.afterOldPause.businessEventOutbox.find(item => item.id === job.id);
      assert.equal(oldLease.status, 'LOCKED'); assert.equal(oldLease.attempts, 1); assert.equal(oldLease.lockedBy, workerId); assert.ok(oldLease.lockedAt);
      const signatureNotices = snapshot => snapshot.paymentReconciliationInboxItem.filter(item => item.idempotencyKey.startsWith('payment-reconciliation.run.signed:'));
      assert.equal(signatureNotices(row.afterOldPause).length, mode === 'success' ? 1 : 0);
      const reclaimAt = new Date(new Date(oldLease.lockedAt).getTime() + 5 * 60_000 + 1);
      row.claimClock = { initialLockedAt: oldLease.lockedAt, reclaimAt, staleAfterMilliseconds: 5 * 60_000, actualWallClockAtReclaim: new Date() };
      row.newClaim = await claimBusinessEventOutboxMessages({ organizationId: x.org.id, workerId, channels: ['NOTIFICATION'], eventNames: [eventName], limit: 1, now: reclaimAt });
      assert.equal(row.newClaim.length, 1); assert.equal(row.newClaim[0].id, job.id); assert.equal(row.newClaim[0].attempts, 2);
      assert.equal(row.newClaim[0].lockedAt.getTime(), reclaimAt.getTime());
      row.afterReclaim = await observed(x.org.id);
      const currentLease = row.afterReclaim.businessEventOutbox.find(item => item.id === job.id);
      assert.equal(currentLease.status, 'LOCKED'); assert.equal(currentLease.attempts, 2); assert.equal(currentLease.lockedBy, workerId);
      release.resolve(); row.oldWorker = await bounded(oldWorker, 'old worker settlement');
      row.afterOldTerminal = await observed(x.org.id);
      row.retainedAfter = await retained(x.org.id);
      assert.deepEqual(row.retainedAfter, row.retainedBefore, 'Signing, financial, business-event and Close records must remain byte-equivalent.');
      assert.deepEqual(row.afterOldTerminal.paymentReconciliationInboxItem, row.afterOldPause.paymentReconciliationInboxItem, 'Reclaim and terminal updates must not alter the inbox.');
      assert.deepEqual(row.afterOldTerminal.auditLog, row.before.auditLog);
      const unrelated = snapshot => snapshot.businessEventOutbox.filter(item => item.id !== job.id);
      assert.deepEqual(unrelated(row.afterOldTerminal), unrelated(row.before));
      const after = row.afterOldTerminal.businessEventOutbox.find(item => item.id === job.id);
      const priorAuditIds = new Set(row.afterReclaim.businessEventAudit.map(item => item.id));
      row.newAudits = row.afterOldTerminal.businessEventAudit.filter(item => !priorAuditIds.has(item.id));
      row.safetyContractSatisfied = f.hash(after) === f.hash(currentLease) && row.newAudits.length === 0;
      row.defectReproduced = row.oldWorker.success && after.attempts === 2 && after.status === (mode === 'success' ? 'SENT' : 'FAILED')
        && after.lockedAt === null && after.lockedBy === null && row.newAudits.length === 1
        && row.newAudits[0].action === (mode === 'success' ? 'OUTBOX_DELIVERED' : 'OUTBOX_RETRY')
        && row.newAudits[0].metadata?.attempts === 2;
      assert.equal(row.defectReproduced, true, 'Expected old-source defect was not reproduced; inspect the exact source-bound result.');
      assert.equal(row.safetyContractSatisfied, false);
      row.signedFinancialRecordsUnchanged = true;
      row.proofComplete = true;
    } finally {
      release.resolve();
      try { if (oldWorker) await bounded(oldWorker, 'finally settle old worker', 22000); }
      finally { db.$transaction = originalTransaction; }
    }
  }
  try {
    report.identity = await guard(); report.sourcesBefore = sources(); report.outsideBefore = await outside();
    for (const mode of ['success', 'failure']) {
      try { await reproduce(mode); }
      catch (error) { report.cases.at(-1).error = f.safe(error); }
    }
  } catch (error) { report.error = f.safe(error); }
  finally {
    db.$transaction = originalTransaction;
    try {
      report.sourcesAfter = sources(); report.sourceStable = !!report.sourcesBefore && f.hash(report.sourcesBefore) === f.hash(report.sourcesAfter);
      report.outsideAfter = await outside(); report.outsideUnchanged = !!report.outsideBefore && report.outsideBefore.hash === report.outsideAfter.hash;
    } catch (error) { report.finalizationError = f.safe(error); }
    try { await db.$disconnect(); } catch (error) { report.disconnectError = f.safe(error); }
    report.defectReproduced = report.cases.length === 2 && report.cases.every(row => row.defectReproduced === true);
    report.safetyContractSatisfied = report.defectReproduced ? false : null;
    report.baselineProofComplete = report.defectReproduced && report.cases.every(row => row.proofComplete) && report.sourceStable && report.outsideUnchanged
      && !report.error && !report.finalizationError && !report.disconnectError;
    const output = path.join(__dirname, 'sign-lease-reclaim-baseline-' + stamp + '.json');
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ output, baselineProofComplete: report.baselineProofComplete, defectReproduced: report.defectReproduced,
      safetyContractSatisfied: report.safetyContractSatisfied, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged }));
    process.exitCode = report.baselineProofComplete ? 0 : 1;
  }
  return report;
}

module.exports = { main };
if (require.main === module) {
  if (process.argv[2] !== '--run') console.log('Prepared only. --run requires coordinator review and owned database lane release.');
  else main().catch(error => { console.error(String(error?.message || error).replace(/postgres(?:ql)?:\/\/\S+/gi, '[database URL redacted]')); process.exitCode = 1; });
}
