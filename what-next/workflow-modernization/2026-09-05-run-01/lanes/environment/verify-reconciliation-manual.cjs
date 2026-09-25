"use strict";
// Owned local service proof; no sessions, live providers, human approval or ledger posting.
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
const { proposeManualMatch, approveManualMatch } = require(path.join(ROOT, "services/reconciliation/payment-reconciliation-manual-match.service.ts"));
const { getPendingManualMatchProposals } = require(path.join(ROOT, "services/reconciliation/payment-reconciliation-manual-read.service.ts"));
const { getManualMatchCandidates } = require(path.join(ROOT, "services/reconciliation/payment-reconciliation-manual-candidates.service.ts"));
const { getModuleReconciliationObligations } = require(path.join(ROOT, "services/modules/module-reconciliation-obligations.service.ts"));
const { lockModuleAdmissionPolicyInTx } = require(path.join(ROOT, "services/modules/module-admission.service.ts"));
const { captureProviderEvent } = require(path.join(ROOT, "services/payments/provider-event.service.ts"));
const { MobileMoneyHmacAdapter } = require(path.join(ROOT, "services/payments/adapters/mobile-money-hmac.adapter.ts"));
const attempt = randomUUID().replaceAll("-", "").slice(0, 12), prefix = `org_modules_service_smoke_manual_${attempt}`;
const sha = value => createHash("sha256").update(value).digest("hex");
const files = ["services/reconciliation/payment-reconciliation-manual-match.service.ts", "services/reconciliation/payment-reconciliation-manual-read.service.ts", "services/reconciliation/payment-reconciliation-notifications.ts", "services/controls/sensitive-action.service.ts", "services/payments/provider-event.service.ts", "services/payments/adapters/mobile-money-hmac.adapter.ts", "prisma/schema.prisma"];
files.push("services/modules/module-entitlement.service.ts", "services/modules/module-reconciliation-obligations.service.ts", "services/reconciliation/manual-match-lineage.sql.ts", "services/modules/module-admission.service.ts");
files.push("services/reconciliation/manual-match-evidence.ts", "services/reconciliation/payment-reconciliation-manual-candidates.service.ts");
const sources = () => Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
const receipt = { mode, attempt, database: guard.DATABASE_NAME, startedAt: new Date().toISOString(), sourcesBefore: sources(), checks: [], ownedOrganizations: [], limitations: ["CONFIRMED payments, provider setup, actor permissions and fresh-auth timestamps are synthetic test preconditions. Actual sign-in, role grants, or professional approval are not established.", "Real local HMAC capture, manual service writes, serializable transactions, append-only decisions, read queue and inbox effects are exercised; no live provider or external message.", "No ledger posting, suspense resolution, run sign-off, browser, legacy-proposal renewal or production readiness claimed."] };
const secret = randomBytes(32).toString("hex"), adapter = new MobileMoneyHmacAdapter("WORKFLOW_SYNTHETIC");
const check = async (name, work) => { const started = Date.now(); const detail = await work(); receipt.checks.push({ name, passed: true, durationMs: Date.now() - started, detail }); };
async function preflight() {
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, guard.DATABASE_NAME);
  const organizations = await db.organization.findMany({ select: { id: true, onboardingSource: true } });
  assert.ok(organizations.every(row => row.onboardingSource === guard.SOURCE && row.id.startsWith("org_modules_service_smoke_")), "Unknown ownership");
  const migrations = await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  assert.ok(REQUIRED_MIGRATIONS.every(name => migrations.some(row => row.migration_name === name)), "Required migrations missing; runner never migrates");
  receipt.targetGuardPassed = true;
}
async function fixture() {
  const main = `${prefix}_main`, foreign = `${prefix}_foreign`, maker = `${prefix}_maker`, checker = `${prefix}_checker`;
  const metadata = { synthetic: true, source: guard.SOURCE, fixture: "workflow-reconciliation-manual", productionApproval: false };
  const provider = await db.$transaction(async tx => {
    for (const [id, suffix] of [[main, "main"], [foreign, "foreign"]]) await tx.organization.create({ data: { id, name: `Synthetic manual ${suffix}`, slug: `wf-manual-${attempt}-${suffix}`, currency: "XAF", country: "CM", isActive: true, onboardingSource: guard.SOURCE } });
    for (const id of [maker, checker]) await tx.user.create({ data: { id, organizationId: main, email: `${id}@example.invalid`, name: "Synthetic manual verifier" } });
    const rail = await tx.paymentRail.create({ data: { organizationId: main, code: "WORKFLOW_SYNTHETIC", name: "Synthetic local test rail", type: "MOBILE_MONEY", metadata } });
    return tx.providerAccount.create({ data: { organizationId: main, paymentRailId: rail.id, providerCode: adapter.providerCode, displayName: "Synthetic manual evidence only", status: "ACTIVE", externalAccountHash: sha(main), currencyCode: "XAF", metadata } });
  });
  receipt.ownedOrganizations.push(main, foreign); receipt.fixture = { main, foreign, maker, checker, providerAccountId: provider.id };
  return { main, foreign, maker, checker, provider };
}
async function pair(f, label, value = "100.00", externalValue = value) {
  const at = new Date("2026-06-11T12:00:00Z"), ref = `${attempt}-${label}`;
  const payment = await db.paymentTransaction.create({ data: { organizationId: f.main, providerAccountId: f.provider.id, amount: value, currencyCode: "XAF", direction: "INBOUND", state: "CONFIRMED", occurredAt: at, confirmedAt: at, providerTransactionId: ref, providerReference: ref, sourceType: "SYNTHETIC_WORKFLOW_VERIFICATION", metadata: { synthetic: true, authorityNotVerified: true } } });
  const rawBody = JSON.stringify({ eventId: ref, transactionId: ref, reference: ref, direction: "INBOUND", amount: externalValue, currency: "XAF", occurredAt: at.toISOString() });
  const timestamp = String(at.getTime()), signature = createHmac("sha256", secret).update(`${timestamp}.${adapter.canonicalPayload(rawBody)}`).digest("hex");
  const captured = await captureProviderEvent({ organizationId: f.main, providerAccountId: f.provider.id, adapter, rawBody, headers: { "x-provider-timestamp": timestamp, "x-provider-signature": signature }, secret, now: at, receivedAt: at });
  assert.equal(captured.status, "CAPTURED");
  return { paymentTransactionId: payment.id, providerEventId: captured.providerEventRecordId };
}
const proposalInput = (f, pair, key, amount = "60.00") => ({ organizationId: f.main, providerAccountId: f.provider.id, ...pair, proposedById: f.maker, amountMatched: amount, currencyCode: "XAF", idempotencyKey: `${attempt}-${key}`, control: { actorPermissions: ["payments.reconciliation.match"] } });
async function approveInput(f, id) {
  const row = await db.matchRecord.findUniqueOrThrow({ where: { id } });
  return { organizationId: f.main, proposedMatchId: id, approvedById: f.checker, expectedEvidenceRevision: row.metadata.evidenceRevision, control: { actorPermissions: ["payments.reconciliation.override"], lastAuthAt: new Date(), now: new Date() } };
}
const effects = f => Promise.all([db.matchRecord.count({ where: { organizationId: f.main } }), db.paymentReconciliationInboxItem.count({ where: { organizationId: f.main } })]);
async function proof(f) {
  let pendingId;
  await check("Exact proposal retry returns one durable record and one notification", async () => {
    const input = proposalInput(f, await pair(f, "retry"), "retry");
    const first = await proposeManualMatch(input), before = await effects(f), second = await proposeManualMatch(input);
    assert.equal(second.matchId, first.matchId); assert.equal(second.alreadyApplied, true); assert.deepEqual(await effects(f), before);
    await assert.rejects(proposeManualMatch({ ...input, amountMatched: "50.00" }), /different|reused/i); assert.deepEqual(await effects(f), before);
    pendingId = first.matchId;
    return { proposalId: pendingId, duplicateEffects: 0 };
  });
  await check("Approval rejects missing permission, self-approval, stale authentication, forged revision and foreign organization", async () => {
    const input = await approveInput(f, pendingId), before = await effects(f);
    for (const [change, code] of [
      [{ control: { ...input.control, actorPermissions: [] } }, "FORBIDDEN"],
      [{ approvedById: f.maker }, "SOD_VIOLATION"],
      [{ control: { ...input.control, lastAuthAt: new Date(0) } }, "FRESH_AUTH_REQUIRED"],
      [{ expectedEvidenceRevision: `sha256:${"0".repeat(64)}` }, "CONFLICT"],
      [{ organizationId: f.foreign }, "NOT_FOUND"],
    ]) { await assert.rejects(approveManualMatch({ ...input, ...change }), error => error.code === code); assert.deepEqual(await effects(f), before); }
    return { denied: 5, matchAndInboxEffects: 0, denialAuditRetained: await db.auditLog.count({ where: { organizationId: f.main } }) };
  });
  await check("Concurrent approval commits one decision and safe retry returns its receipt", async () => {
    const input = await approveInput(f, pendingId);
    const results = await Promise.allSettled([approveManualMatch(input), approveManualMatch(input)]);
    assert.ok(results.some(row => row.status === "fulfilled"));
    for (const row of results) if (row.status === "rejected") assert.equal(row.reason.code, "CONCURRENCY_CONFLICT");
    const rows = await db.matchRecord.findMany({ where: { organizationId: f.main, correctionOfId: pendingId, status: "APPROVED" } }); assert.equal(rows.length, 1);
    const before = await effects(f), retry = await approveManualMatch(input); assert.equal(retry.matchId, rows[0].id); assert.equal(retry.alreadyApplied, true); assert.deepEqual(await effects(f), before);
    assert.equal((await db.matchRecord.findUniqueOrThrow({ where: { id: pendingId } })).status, "PROPOSED");
    return { approvalId: rows[0].id, originalProposalRetained: true, rejectedRaces: results.filter(row => row.status === "rejected").length, duplicateEffects: 0 };
  });
  await check("Competing proposals cannot allocate more than the evidence and exact residual is supported", async () => {
    const evidence = await pair(f, "competition"), a = await proposeManualMatch(proposalInput(f, evidence, "compete-a")), b = await proposeManualMatch(proposalInput(f, evidence, "compete-b"));
    const aInput = await approveInput(f, a.matchId), bInput = await approveInput(f, b.matchId);
    const results = await Promise.allSettled([approveManualMatch(aInput), approveManualMatch(bInput)]); assert.equal(results.filter(row => row.status === "fulfilled").length, 1);
    const loser = results[0].status === "rejected" ? aInput : bInput;
    await assert.rejects(approveManualMatch(loser), /remaining|allocated/i);
    const residual = await proposeManualMatch(proposalInput(f, evidence, "residual", "40.00")); await approveManualMatch(await approveInput(f, residual.matchId));
    const total = await db.matchRecord.aggregate({ where: { organizationId: f.main, paymentTransactionId: evidence.paymentTransactionId, status: "APPROVED" }, _sum: { amountMatched: true } }); assert.equal(total._sum.amountMatched.toFixed(2), "100.00");
    await assert.rejects(proposeManualMatch(proposalInput(f, evidence, "excess", "0.01")), /remaining|allocated/i);
    return { allocated: "100.00", ceiling: "100.00", rejectedExcess: "0.01" };
  });
  await check("Changed payment lifecycle prevents approval against the saved snapshot", async () => {
    const evidence = await pair(f, "changed"), proposed = await proposeManualMatch(proposalInput(f, evidence, "changed")), input = await approveInput(f, proposed.matchId);
    await db.paymentTransaction.update({ where: { id: evidence.paymentTransactionId }, data: { state: "SETTLED" } });
    const before = await effects(f); await assert.rejects(approveManualMatch(input), /changed|refresh/i); assert.deepEqual(await effects(f), before);
    const replacementInput = { ...proposalInput(f, evidence, "replacement"), supersedesProposalId: proposed.matchId };
    const replacement = await proposeManualMatch(replacementInput);
    assert.equal((await proposeManualMatch(replacementInput)).matchId, replacement.matchId);
    assert.equal((await db.matchRecord.findUniqueOrThrow({ where: { id: proposed.matchId } })).status, "PROPOSED");
    assert.equal(await db.matchRecord.count({ where: { organizationId: f.main, correctionOfId: proposed.matchId, status: "VOIDED" } }), 1);
    await assert.rejects(approveManualMatch(input), /decision/i);
    await approveManualMatch(await approveInput(f, replacement.matchId));
    return { proposalId: proposed.matchId, staleApprovalEffects: 0, replacementProposalId: replacement.matchId, originalRecordRetained: true };
  });
  await check("Revoked provider evidence prevents approval", async () => {
    const evidence = await pair(f, "revoked"), proposed = await proposeManualMatch(proposalInput(f, evidence, "revoked")), input = await approveInput(f, proposed.matchId);
    await db.providerEvent.update({ where: { id: evidence.providerEventId }, data: { status: "REJECTED" } });
    const before = await effects(f); await assert.rejects(approveManualMatch(input), /verified|current/i); assert.deepEqual(await effects(f), before);
    return { proposalId: proposed.matchId, invalidEvidenceEffects: 0 };
  });
  await check("Pending read model excludes approved history before limiting results and respects organization", async () => {
    const olderPending = await getPendingManualMatchProposals(f.main); assert.ok(olderPending.length > 0);
    // More closed proposals than the 12-row page must not crowd out older pending work.
    for (let index = 0; index < 13; index++) {
      const evidence = await pair(f, `closed-page-${index}`), proposed = await proposeManualMatch(proposalInput(f, evidence, `closed-page-${index}`));
      await approveManualMatch(await approveInput(f, proposed.matchId));
    }
    const rows = await getPendingManualMatchProposals(f.main); assert.ok(!rows.some(row => row.id === pendingId)); assert.ok(rows.length > 0);
    assert.deepEqual(rows.map(row => row.id), olderPending.map(row => row.id));
    assert.ok(rows.every(row => row.evidenceRevision && row.evidenceSummary?.externalSource === "PROVIDER_EVENT"));
    assert.deepEqual(await getPendingManualMatchProposals(f.foreign), []);
    return { pending: rows.length, approvedProposalExcluded: pendingId, foreignRows: 0 };
  });
  await check("Manual matching does not manufacture accounting completion", async () => {
    const ledger = await db.ledgerPostingBatch.count({ where: { organizationId: f.main } }), runs = await db.reconciliationRun.count({ where: { organizationId: f.main } }); assert.equal(ledger, 0); assert.equal(runs, 0);
    return { ledgerPostingBatches: ledger, signedOrReadyRuns: runs, outboundCalls: outbound.length };
  });
  await check("Pending review and module obligations agree after approved replacement", async () => {
    const pending = await getPendingManualMatchProposals(f.main);
    const observations = await getModuleReconciliationObligations(db, f.main);
    const count = observations.find(row => row.code === "reconciliation_matches_pending").count;
    assert.equal(count, pending.length); assert.equal(count, 2);
    assert.ok(observations.find(row => row.code === "reconciliation_payments_unreconciled").count > 0);
    return { pendingReview: pending.length, pendingMatchObligations: count, financialObligationsRetained: true };
  });
  await check("Current managed grants deny writes, retain proposals and preserve independent valid rights", async () => {
    const evidence = await pair(f, "module-authority"), input = proposalInput(f, evidence, "module-authority");
    const proposed = await proposeManualMatch(input), approval = await approveInput(f, proposed.matchId);
    const before = await effects(f);
    await db.tenantModuleConfiguration.create({ data: { organizationId: f.main, manifestHash: "synthetic-module-access-proof", selectedModules: [], activeModules: [], newWorkStoppedModules: ["accounting"] } });
    await assert.rejects(proposeManualMatch({ ...input, idempotencyKey: `${attempt}-managed-empty` }), error => error.code === "FORBIDDEN");
    for (const moduleSlug of ["payment_reconciliation", "finance", "accounting"]) await db.tenantModuleGrant.create({ data: { organizationId: f.main, moduleSlug, status: "active", source: "manual_override", metadata: { synthetic: true, authorityNotVerified: true } } });
    const grant = { organizationId_moduleSlug: { organizationId: f.main, moduleSlug: "payment_reconciliation" } };
    const invalid = [{ status: "read_only" }, { status: "suspended" }, { status: "expired" }, { status: "unavailable" }, { readOnly: true }, { startsAt: new Date("2077-01-01") }, { endsAt: new Date("2000-01-01") }];
    for (const state of invalid) {
      await db.tenantModuleGrant.update({ where: grant, data: { status: "active", readOnly: false, startsAt: null, endsAt: null, ...state } });
      await assert.rejects(proposeManualMatch({ ...input, idempotencyKey: `${attempt}-denied-${invalid.indexOf(state)}` }), error => error.code === "FORBIDDEN");
      await assert.rejects(approveManualMatch({ ...approval, control: { ...approval.control, actorPermissions: ["*", "payments.reconciliation.override"] } }), error => error.code === "FORBIDDEN");
      assert.deepEqual(await effects(f), before);
    }
    await db.tenantModuleGrant.update({ where: grant, data: { status: "active", readOnly: false, startsAt: null, endsAt: null } });
    const dependency = { organizationId_moduleSlug: { organizationId: f.main, moduleSlug: "accounting" } };
    await db.tenantModuleGrant.update({ where: dependency, data: { status: "suspended" } });
    await assert.rejects(approveManualMatch(approval), error => error.code === "FORBIDDEN");
    assert.deepEqual(await effects(f), before);
    await db.tenantModuleGrant.update({ where: dependency, data: { status: "active" } });
    await assert.rejects(proposeManualMatch({ ...input, organizationId: `${prefix}_missing` }), error => error.code === "NOT_FOUND");
    const approved = await approveManualMatch(approval); assert.equal(approved.status, "APPROVED");
    assert.equal((await db.matchRecord.findUniqueOrThrow({ where: { id: proposed.matchId } })).status, "PROPOSED");
    const deniedAudits = await db.auditLog.count({ where: { organizationId: f.main, action: "MODULE_ENTITLEMENT_ENFORCED" } });
    assert.equal(deniedAudits, 16);
    return { deniedModuleWrites: 16, committedDenialAudits: deniedAudits, missingOrganizationDenied: true, originalProposalRetained: true, workspaceDeselectionAndJournalStopPreserveValidApproval: true };
  });
  await check("Concurrent grant revocation cannot authorize from a stale transaction snapshot", async () => {
    const evidence = await pair(f, "grant-race"), proposed = await proposeManualMatch(proposalInput(f, evidence, "grant-race"));
    const input = await approveInput(f, proposed.matchId), before = await effects(f);
    let unlock, signal;
    const released = new Promise(resolve => { unlock = resolve; }), entered = new Promise(resolve => { signal = resolve; });
    const writer = db.$transaction(async tx => {
      await lockModuleAdmissionPolicyInTx(tx, f.main);
      await tx.tenantModuleGrant.update({ where: { organizationId_moduleSlug: { organizationId: f.main, moduleSlug: "payment_reconciliation" } }, data: { readOnly: true } });
      signal(); await released;
    });
    await entered;
    const result = approveManualMatch(input).then(value => ({ value }), error => ({ error }));
    await new Promise(resolve => setTimeout(resolve, 60)); unlock(); await writer;
    const raced = await result;
    receipt.revocationRace = { code: raced.error?.code ?? null, databaseCode: raced.error?.meta?.code ?? null, returnedReceipt: Boolean(raced.value), effectsBefore: before, effectsAfter: await effects(f) };
    assert.ok(raced.error && ["FORBIDDEN", "CONCURRENCY_CONFLICT"].includes(raced.error.code));
    await assert.rejects(approveManualMatch(input), error => error.code === "FORBIDDEN");
    assert.deepEqual(await effects(f), before);
    return { raceOutcome: raced.error.code, retryOutcome: "FORBIDDEN", financialAndInboxEffects: 0 };
  });
}
async function residualProof(f) {
  const grant = { organizationId_moduleSlug: { organizationId: f.main, moduleSlug: "payment_reconciliation" } };
  await db.tenantModuleGrant.update({ where: grant, data: { readOnly: false } });
  let evidence, exception;
  await check("Preparation reads exact persisted residuals and preserves a full external allocation as an unresolved obligation", async () => {
    evidence = await pair(f, "preparation", "100.00", "90.00");
    exception = await db.paymentException.create({ data: { organizationId: f.main, providerAccountId: f.provider.id, ...evidence, type: "AMOUNT_MISMATCH", severity: "HIGH", sourceType: "SYNTHETIC_WORKFLOW_VERIFICATION" } });
    const initial = await proposeManualMatch(proposalInput(f, evidence, "preparation-initial", "86.75"));
    await approveManualMatch(await approveInput(f, initial.matchId));
    const read = await getManualMatchCandidates(f.main), candidate = read.candidates.find(row => row.exceptionId === exception.id);
    assert.ok(read.writeAllowed); assert.equal(candidate.eligibility, "READY");
    assert.deepEqual([candidate.internalAmount, candidate.externalAmount, candidate.internalRemaining, candidate.externalRemaining, candidate.availableAmount], ["100.00", "90.00", "13.25", "3.25", "3.25"]);
    const before = await effects(f);
    await assert.rejects(proposeManualMatch(proposalInput(f, evidence, "preparation-excess", "3.26")), /remaining|allocated/i); assert.deepEqual(await effects(f), before);
    const residual = await proposeManualMatch(proposalInput(f, evidence, "preparation-residual", "3.25"));
    const pending = (await getPendingManualMatchProposals(f.main)).find(row => row.id === residual.matchId);
    assert.equal(pending.amountMatched, "3.25");
    await approveManualMatch(await approveInput(f, residual.matchId));
    const full = (await getManualMatchCandidates(f.main)).candidates.find(row => row.exceptionId === exception.id);
    assert.equal(full.eligibility, "FULLY_ALLOCATED"); assert.equal(full.internalRemaining, "10.00"); assert.equal(full.externalRemaining, "0.00"); assert.equal(full.availableAmount, "0.00");
    assert.equal((await db.paymentException.findUniqueOrThrow({ where: { id: exception.id } })).status, "OPEN");
    return { initialResidual: "3.25", finalExternalRemaining: "0.00", remainingInternalObligation: "10.00", exceptionRetainedOpen: true, exactProposalString: pending.amountMatched };
  });
  await check("Read-only grants retain preparation and failed or foreign evidence is never presented as zero", async () => {
    await db.tenantModuleGrant.update({ where: grant, data: { readOnly: true } });
    let read = await getManualMatchCandidates(f.main); assert.equal(read.writeAllowed, false); assert.ok(read.candidates.some(row => row.exceptionId === exception.id));
    assert.deepEqual((await getManualMatchCandidates(f.foreign)).candidates, []);
    for (const [patch, reason] of [[{ amount: null }, "AMOUNT_UNAVAILABLE"], [{ amount: "90.00", currencyCode: "EUR" }, "CURRENCY_MISMATCH"], [{ currencyCode: "XAF", signatureValid: false }, "PROVIDER_EVIDENCE_INVALID"]]) {
      const invalid = await db.providerEvent.create({ data: { organizationId: f.main, providerAccountId: f.provider.id, providerEventId: `${attempt}-${reason}`, eventType: "SYNTHETIC_INVALID_EVIDENCE", status: "VERIFIED", signatureValid: true, direction: "INBOUND", currencyCode: "XAF", amount: "90.00", rawPayloadHash: sha(`${attempt}-${reason}`), rawPayload: { synthetic: true, reason }, ...patch } });
      const invalidException = await db.paymentException.create({ data: { organizationId: f.main, providerAccountId: f.provider.id, paymentTransactionId: evidence.paymentTransactionId, providerEventId: invalid.id, type: "AMOUNT_MISMATCH", sourceType: "SYNTHETIC_INVALID_EVIDENCE" } });
      const candidate = (await getManualMatchCandidates(f.main)).candidates.find(row => row.exceptionId === invalidException.id);
      assert.equal(candidate.eligibility, reason); assert.equal(candidate.availableAmount, null); assert.equal(candidate.externalRemaining, null);
      if (patch.amount === null) assert.equal(candidate.externalAmount, null);
      if (patch.currencyCode === "EUR") assert.equal(candidate.externalCurrencyCode, "EUR");
    }
    const foreign = await db.paymentException.create({ data: { organizationId: f.foreign, providerAccountId: f.provider.id, ...evidence, type: "AMOUNT_MISMATCH", sourceType: "SYNTHETIC_MALFORMED_REFERENCE" } });
    const hidden = (await getManualMatchCandidates(f.foreign)).candidates.find(row => row.exceptionId === foreign.id);
    assert.equal(hidden.eligibility, "EVIDENCE_UNAVAILABLE"); assert.equal(hidden.internalAmount, null); assert.equal(hidden.externalAmount, null); assert.equal(hidden.providerAccountName, ""); assert.equal(hidden.internalReference, null);
    return { readOnlyPreparation: true, invalidReasons: 3, unavailableAmountIsNull: true, foreignEvidenceNotExposed: true };
  });
}
(async () => { await preflight(); if (mode === "run") { const f = await fixture(); await proof(f); await residualProof(f); } })().catch(error => { receipt.error = `${error.name}: ${String(error.message).split(target.toString()).join("[redacted]").split("Failing row contains")[0].slice(0, 1200)}`; }).finally(async () => {
  await db.$disconnect(); receipt.completedAt = new Date().toISOString(); receipt.sourcesAfter = sources(); receipt.sourceStable = JSON.stringify(receipt.sourcesBefore) === JSON.stringify(receipt.sourcesAfter); receipt.blockedOutbound = outbound; receipt.driverSha256 = sha(fs.readFileSync(__filename)); receipt.passed = receipt.checks.length; receipt.failed = Number(Boolean(receipt.error));
  const file = path.join(__dirname, `reconciliation-manual-${mode}-${attempt}.json`); fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" }); console.log(JSON.stringify({ passed: receipt.passed, failed: receipt.failed, evidence: path.relative(ROOT, file) }));
  process.exit(receipt.failed ? 1 : 0);
});
