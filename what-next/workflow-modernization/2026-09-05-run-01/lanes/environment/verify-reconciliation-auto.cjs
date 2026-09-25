"use strict";
// Isolated service proof. No live providers, human approvals, sessions, or ledger postings.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const { randomUUID, createHash, createHmac, randomBytes } = require("node:crypto");
const ROOT = path.resolve(__dirname, "../../../../.."); process.chdir(ROOT);
const guard = require(path.join(ROOT, "scripts/run-modern-modules-postgres-smoke.js"));
const { REQUIRED_MIGRATIONS } = require(path.join(ROOT, "scripts/modern-modules-local-verification.js"));
const mode = process.argv[2]; assert.ok(["preflight", "run"].includes(mode));
const target = guard.targetUrl(); assert.equal(target.pathname.slice(1), guard.DATABASE_NAME);
assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname)); assert.notEqual(process.env.NODE_ENV, "production");
process.env.DATABASE_URL = target.toString(); process.env.DIRECT_URL = target.toString(); process.env.NODE_ENV = "test";
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [], transactionOptions: { maxWait: 10000, timeout: 30000 } }); globalThis.prisma = db;
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "commonjs", moduleResolution: "node", jsx: "react-jsx" });
require(path.join(ROOT, "scripts/server-only-node-shim.js")); require("ts-node/register/transpile-only"); require("tsconfig-paths/register");
const outbound = []; globalThis.fetch = async () => { outbound.push("blocked outbound fetch"); throw new Error("Owned verification blocks outbound fetch"); };
const { runPaymentReconciliation } = require(path.join(ROOT, "services/reconciliation/payment-reconciliation-run.service.ts"));
const { captureProviderEvent } = require(path.join(ROOT, "services/payments/provider-event.service.ts"));
const { importProviderStatement } = require(path.join(ROOT, "services/payments/statement-import.service.ts"));
const { MobileMoneyHmacAdapter } = require(path.join(ROOT, "services/payments/adapters/mobile-money-hmac.adapter.ts"));
const attempt = randomUUID().replaceAll("-", "").slice(0, 12), prefix = `org_modules_service_smoke_recon_${attempt}`;
const sha = value => createHash("sha256").update(value).digest("hex");
const files = ["services/reconciliation/payment-reconciliation-run.service.ts", "services/reconciliation/payment-reconciliation-notifications.ts", "services/reconciliation/payment-reconciliation-evidence.service.ts", "services/payments/provider-event.service.ts", "services/payments/statement-import.service.ts", "services/payments/adapters/mobile-money-hmac.adapter.ts", "services/modules/module-admission.service.ts", "services/events/business-event.service.ts", "prisma/schema.prisma"];
const sources = () => Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
const receipt = { mode, attempt, database: guard.DATABASE_NAME, startedAt: new Date().toISOString(), sourcesBefore: sources(), checks: [], ownedOrganizations: [], limitations: ["Internal CONFIRMED transactions and approved provider setup are explicitly synthetic preconditions; this does not verify production payment authority, settlement approval or sessions.", "External provider events are captured through the real HMAC adapter with an ephemeral synthetic secret; no live provider communication.", "Statement import, run matching, exceptions, suspense, inbox and rollback are real services/database effects. No sign-off, certificate, ledger posting, statutory certification or browser completion claimed.", "Manual proposal/approval races and partial-allocation recovery remain open."] };
const day = n => new Date(`2026-06-${String(n).padStart(2, "0")}T12:00:00.000Z`);
const secret = randomBytes(32).toString("hex"); // never retained or printed
const adapter = new MobileMoneyHmacAdapter("WORKFLOW_SYNTHETIC");
async function check(name, work) { const start = Date.now(); const detail = await work(); receipt.checks.push({ name, passed: true, durationMs: Date.now() - start, detail }); }
async function preflight() {
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, guard.DATABASE_NAME);
  const organizations = await db.organization.findMany({ select: { id: true, onboardingSource: true } });
  assert.ok(organizations.every(row => row.onboardingSource === guard.SOURCE && row.id.startsWith("org_modules_service_smoke_")), "Unknown database ownership");
  const migrations = await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  assert.ok(REQUIRED_MIGRATIONS.every(name => migrations.some(row => row.migration_name === name)), "Existing required migrations missing; runner never migrates");
  receipt.targetGuardPassed = true;
}
async function fixture() {
  const main = `${prefix}_main`, foreign = `${prefix}_foreign`;
  const metadata = { synthetic: true, source: guard.SOURCE, fixture: "workflow-reconciliation-auto", productionApproval: false };
  const provider = await db.$transaction(async tx => {
    for (const [id, suffix] of [[main, "main"], [foreign, "foreign"]]) await tx.organization.create({ data: { id, name: `Synthetic reconciliation ${suffix}`, slug: `wf-recon-${attempt}-${suffix}`, currency: "XAF", country: "CM", isActive: true, onboardingSource: guard.SOURCE } });
    const bank = await tx.chartOfAccount.create({ data: { organizationId: main, code: "512", nameEn: "Synthetic bank mapping", type: "ASSET", normalBalance: "DEBIT", isActive: true } });
    const suspense = await tx.chartOfAccount.create({ data: { organizationId: main, code: "471", nameEn: "Synthetic suspense mapping", type: "ASSET", normalBalance: "DEBIT", isActive: true } });
    const rail = await tx.paymentRail.create({ data: { organizationId: main, code: "WORKFLOW_SYNTHETIC", name: "Synthetic local test rail", type: "MOBILE_MONEY", metadata } });
    const account = await tx.providerAccount.create({ data: { organizationId: main, paymentRailId: rail.id, providerCode: adapter.providerCode, displayName: "Synthetic local evidence only", status: "ACTIVE", externalAccountHash: sha(main), currencyCode: "XAF", settlementLedgerAccountId: bank.id, suspenseLedgerAccountId: suspense.id, metadata } });
    await tx.settlementAccount.create({ data: { organizationId: main, providerAccountId: account.id, ledgerAccountId: bank.id, approvalStatus: "APPROVED", effectiveFrom: new Date(0), metadata } });
    return account;
  });
  receipt.ownedOrganizations.push(main, foreign); receipt.fixture = { main, foreign, providerAccountId: provider.id };
  return { main, foreign, provider };
}
async function payment(f, n, id, value, extra = {}) {
  return db.paymentTransaction.create({ data: { organizationId: f.main, providerAccountId: f.provider.id, amount: value, currencyCode: "XAF", direction: "INBOUND", state: "CONFIRMED", occurredAt: day(n), confirmedAt: day(n), providerTransactionId: `${attempt}-${id}`, providerReference: `${attempt}-${id}`, sourceType: "SYNTHETIC_WORKFLOW_VERIFICATION", metadata: { synthetic: true, authorityNotVerified: true }, ...extra } });
}
async function event(f, n, id, value, extra = {}, received = n) {
  const payload = { eventId: `${attempt}-event-${id}`, transactionId: `${attempt}-${id}`, reference: `${attempt}-${id}`, eventType: "PAYMENT_CONFIRMED", direction: "INBOUND", amount: value, currency: "XAF", occurredAt: day(n).toISOString(), ...extra };
  const rawBody = JSON.stringify(payload), timestamp = String(day(received).getTime());
  const signature = createHmac("sha256", secret).update(`${timestamp}.${adapter.canonicalPayload(rawBody)}`).digest("hex");
  const result = await captureProviderEvent({ organizationId: f.main, providerAccountId: f.provider.id, adapter, rawBody, headers: { "x-provider-timestamp": timestamp, "x-provider-signature": signature }, secret, now: day(received), receivedAt: day(received) });
  assert.equal(result.status, "CAPTURED");
  return db.providerEvent.findUniqueOrThrow({ where: { id: result.providerEventRecordId } });
}
const run = (f, n) => runPaymentReconciliation({ organizationId: f.main, providerAccountId: f.provider.id, businessDate: day(n), correlationId: `wf-recon-${attempt}-${n}` });
const counts = f => Promise.all([db.reconciliationRun.count({ where: { organizationId: f.main } }), db.matchRecord.count({ where: { organizationId: f.main } }), db.paymentException.count({ where: { organizationId: f.main } }), db.suspenseItem.count({ where: { organizationId: f.main } }), db.paymentReconciliationInboxItem.count({ where: { organizationId: f.main } })]);
async function proof(f) {
  await check("Mixed matching saves exact matched and suspense money with real captured evidence", async () => {
    await payment(f, 1, "matched", "100.25"); await event(f, 1, "matched", "100.25");
    await payment(f, 1, "mismatch", "20.10"); await event(f, 1, "mismatch", "19.10");
    await payment(f, 1, "missing", "80.15");
    const result = await run(f, 1), stored = await db.reconciliationRun.findUniqueOrThrow({ where: { id: result.runId } });
    assert.equal(result.matchCount, 1); assert.equal(result.exceptionCount, 2); assert.equal(stored.status, "NEEDS_REVIEW");
    assert.equal(stored.matchedAmount.toFixed(2), "100.25"); assert.equal(stored.totalInternalAmount.toFixed(2), "200.50"); assert.equal(stored.suspenseAmount.toFixed(2), "100.25");
    assert.equal(await db.suspenseItem.count({ where: { reconciliationRunId: result.runId } }), 2);
    return { runId: result.runId, matched: "100.25", suspense: "100.25", internal: "200.50", matchCount: 1, exceptionCount: 2 };
  });
  await check("Shared reference creates no arbitrary automatic match", async () => {
    for (const id of ["shared-a", "shared-b"]) await payment(f, 2, id, "100.00", { providerTransactionId: null, providerReference: `${attempt}-shared` });
    await event(f, 2, "shared", "100.00", { transactionId: null });
    const result = await run(f, 2); assert.equal(result.matchCount, 0); assert.equal(result.exceptionCount, 2); assert.equal(result.suspenseAmount, "200.00");
    const rows = await db.paymentException.findMany({ where: { reconciliationRunId: result.runId } }); assert.ok(rows.every(row => row.type === "DUPLICATE_PROVIDER_REFERENCE" && row.evidence.providerEventIds.length === 1));
    return { runId: result.runId, matches: 0, explainedInternalClaims: rows.length };
  });
  await check("Real statement import and provider capture agree on outbound direction; opposite event remains unresolved", async () => {
    await payment(f, 3, "outbound", "50.50", { direction: "OUTBOUND" }); await event(f, 3, "outbound", "50.50", { direction: "OUTBOUND" });
    const imported = await importProviderStatement({ organizationId: f.main, providerAccountId: f.provider.id, adapter, rawContent: JSON.stringify([{ transactionId: `${attempt}-outbound`, reference: `${attempt}-outbound`, amount: "50.50", currency: "XAF", direction: "DEBIT", occurredAt: day(3).toISOString() }]), fileName: `synthetic-${attempt}.json` });
    assert.equal(imported.importedLineCount, 1);
    await payment(f, 3, "opposite", "20.00"); await event(f, 3, "opposite", "20.00", { direction: "OUTBOUND" });
    const result = await run(f, 3); assert.equal(result.matchCount, 1); assert.equal(result.exceptionCount, 1);
    const match = await db.matchRecord.findFirstOrThrow({ where: { reconciliationRunId: result.runId } }); assert.ok(match.providerEventId && match.statementLineId);
    const exception = await db.paymentException.findFirstOrThrow({ where: { reconciliationRunId: result.runId } }); assert.equal(exception.type, "MANUAL_REVIEW_REQUIRED");
    return { runId: result.runId, statementFileId: imported.statementFileId, matchId: match.id, unresolvedDirection: true };
  });
  await check("Missing direction survives signed capture as unknown and cannot become an inbound match", async () => {
    await payment(f, 4, "unknown", "40.00"); const captured = await event(f, 4, "unknown", "40.00", { direction: undefined });
    assert.equal(captured.direction, null); assert.equal(captured.signatureValid, true);
    const result = await run(f, 4); assert.equal(result.matchCount, 0); assert.equal(result.status, "NEEDS_REVIEW");
    return { eventId: captured.id, runId: result.runId, direction: null, signatureVerifiedByRealAdapter: true };
  });
  await check("Previously allocated evidence rolls back a subsequent run without duplicate obligations", async () => {
    await payment(f, 6, "prior", "60.00"); await event(f, 6, "prior", "60.00", {}, 7);
    const original = await run(f, 6); assert.equal(original.matchCount, 1);
    await payment(f, 7, "later", "60.00", { providerReference: `${attempt}-prior` });
    const before = await counts(f); await assert.rejects(run(f, 7), /already allocated/i); assert.deepEqual(await counts(f), before);
    assert.equal(await db.reconciliationRun.count({ where: { organizationId: f.main, businessDate: new Date("2026-06-07T00:00:00Z") } }), 0);
    return { retainedRunId: original.runId, unchangedCounts: before, failedRunPersisted: false };
  });
  await check("Foreign organization cannot reconcile the owned provider", async () => {
    const before = await counts(f); await assert.rejects(runPaymentReconciliation({ organizationId: f.foreign, providerAccountId: f.provider.id, businessDate: day(8) }), /provider account not found/i); assert.deepEqual(await counts(f), before);
    return { foreignDenied: true, changedRows: 0 };
  });
  await check("Concurrent same-day commands commit one run and one match", async () => {
    await payment(f, 8, "race", "80.00"); await event(f, 8, "race", "80.00");
    const outcomes = await Promise.allSettled([run(f, 8), run(f, 8)]); assert.equal(outcomes.filter(value => value.status === "fulfilled").length, 1);
    const stored = await db.reconciliationRun.findMany({ where: { organizationId: f.main, businessDate: new Date("2026-06-08T00:00:00Z") } }); assert.equal(stored.length, 1);
    assert.equal(await db.matchRecord.count({ where: { reconciliationRunId: stored[0].id } }), 1);
    const before = await counts(f); await assert.rejects(run(f, 8), /already exists/i); assert.deepEqual(await counts(f), before);
    return { runId: stored[0].id, fulfilled: 1, rejected: 1, retryCreatedRows: 0 };
  });
  await check("Matching creates no ledger postings and retains itemized inbox evidence", async () => {
    assert.equal(await db.ledgerPostingBatch.count({ where: { organizationId: f.main } }), 0);
    const items = await db.suspenseItem.findMany({ where: { organizationId: f.main } }); assert.ok(items.length >= 6); assert.ok(items.every(row => row.status === "OPEN"));
    const inbox = await db.paymentReconciliationInboxItem.findMany({ where: { organizationId: f.main, source: "RECONCILIATION_RUN" } }); assert.ok(inbox.length > 0);
    return { ledgerPostingBatches: 0, openSuspenseItems: items.length, reconciliationInboxItems: inbox.length };
  });
}
(async () => { await preflight(); if (mode === "run") await proof(await fixture()); })().catch(error => { receipt.error = `${error.name}: ${String(error.message).split(target.toString()).join("[redacted]").split("Failing row contains")[0].slice(0, 1200)}`; }).finally(async () => {
  await db.$disconnect(); receipt.completedAt = new Date().toISOString(); receipt.sourcesAfter = sources(); receipt.sourceStable = JSON.stringify(receipt.sourcesBefore) === JSON.stringify(receipt.sourcesAfter); receipt.blockedOutbound = outbound; receipt.driverSha256 = sha(fs.readFileSync(__filename)); receipt.passed = receipt.checks.length; receipt.failed = Number(Boolean(receipt.error));
  const file = path.join(__dirname, `reconciliation-auto-${mode}-${attempt}.json`); fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" }); console.log(JSON.stringify({ passed: receipt.passed, failed: receipt.failed, evidence: path.relative(ROOT, file) }));
  // Imported monitoring retains periodic timers. End only this completed CLI,
  // after all awaited checks, durable receipt writing and client disconnection.
  process.exit(receipt.failed ? 1 : 0);
});
