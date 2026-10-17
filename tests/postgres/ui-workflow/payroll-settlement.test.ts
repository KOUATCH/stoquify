import { randomUUID } from "node:crypto"
import { setTimeout as delay } from "node:timers/promises"
import { PrismaClient } from "@prisma/client"
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  if (process.env.RUN_UI_WORKFLOW_POSTGRES !== "1") return { db: {} }
  const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
  const { PrismaClient: Client } = jest.requireActual("@prisma/client")
  return { db: new Client({ datasources: { db: { url: resolveWorkflowTestTarget(process.env.UI_WORKFLOW_POSTGRES_DATABASE).toString() } } }) }
})
import { db } from "@/prisma/db"
import { recordPayrollPaymentSettlementEvidence, type RecordPayrollPaymentSettlementInput } from "@/services/payroll/payment-reconciliation.service"
import { settlementMatchProofInclude, storedRegisterProof, storedMatchProof } from "@/services/payroll/payment-settlement-proof"

const suite = process.env.RUN_UI_WORKFLOW_POSTGRES === "1" ? describe : describe.skip
type Fixture = { organizationId: string; actorId: string; releaserId: string; batchId: string; transactionId: string; providerAccountId: string; matchId: string; command: RecordPayrollPaymentSettlementInput }
let observer: PrismaClient
async function selection(f: Omit<Fixture, "command" | "matchId">, matchId: string) {
  const batch = await db.payrollPaymentBatch.findUniqueOrThrow({ where: { id: f.batchId }, include: { payrollRun: true } })
  const transaction = await db.paymentTransaction.findUniqueOrThrow({ where: { id: f.transactionId }, include: { providerAccount: { select: { organizationId: true } } } })
  const match = await db.matchRecord.findUniqueOrThrow({ where: { id: matchId }, include: settlementMatchProofInclude })
  const register = storedRegisterProof(batch, batch.payrollRun), proof = storedMatchProof(batch, transaction, match)
  if (!register || !proof) throw new Error("Synthetic stored proof is ineligible")
  return { payrollRunId: register.id, runVersion: register.version, runRevision: register.revision, matchRecordId: matchId, matchRevision: proof.option.revision }
}
async function matchFixture(f: Omit<Fixture, "command" | "matchId">, amount: string) {
  const id = randomUUID()
  const event = await db.providerEvent.create({ data: { organizationId: f.organizationId, providerAccountId: f.providerAccountId,
    providerEventId: id, eventType: "synthetic.settlement", status: "VERIFIED", direction: "OUTBOUND", amount, currencyCode: "XAF",
    rawPayload: { synthetic: true }, rawPayloadHash: `sha256:${id}`, signatureHash: `synthetic:${id}`, signatureValid: true, occurredAt: new Date() } })
  return db.matchRecord.create({ data: { organizationId: f.organizationId, providerAccountId: f.providerAccountId,
    paymentTransactionId: f.transactionId, providerEventId: event.id, rule: "MANUAL", status: "APPROVED", amountMatched: amount, currencyCode: "XAF", matchedById: f.actorId } })
}
async function fixture(amount = "100.00", selfApproval = false): Promise<Fixture> {
  const suffix = randomUUID(), organizationId = `ux-payroll-${suffix}`, actorId = `ux-reconciler-${suffix}`, releaserId = `ux-releaser-${suffix}`
  const batchId = `ux-batch-${suffix}`, transactionId = `ux-payment-${suffix}`, runId = `ux-run-${suffix}`
  await db.organization.create({ data: { id: organizationId, name: "Synthetic settlement test", slug: organizationId, currency: "XAF" } })
  for (const id of [actorId, releaserId]) await db.user.create({ data: { id, organizationId, email: `${id}@ui-workflow.invalid`, firstName: "Synthetic", lastName: "Payroll", isActive: true, isVerified: true, emailVerified: true, mfaBackupCodes: [] } })
  await db.role.create({ data: { organizationId, code: "SYNTHETIC_RECONCILER", nameEn: "Synthetic reconciler", permissions: ["payroll.payments.reconcile"], users: { connect: { id: actorId } } } })
  const session = await db.session.create({ data: { userId: actorId, token: `synthetic-${randomUUID()}`, expiresAt: new Date(Date.now() + 3600000), assuranceVerifiedAt: new Date(), assuranceOrganizationId: organizationId, assuranceMethod: "password", assuranceLevel: 1 } })
  const period = await db.payrollPeriod.create({ data: { organizationId, name: "Synthetic October", countryCode: "CM", periodStart: new Date("2026-10-01"), periodEnd: new Date("2026-10-31"), payDate: new Date("2026-10-31") } })
  const posting = await db.ledgerPostingBatch.create({ data: { organizationId, sourceType: "PAYROLL_PAYMENT", sourceId: batchId, postingPurpose: "PAYROLL_PAYMENT", status: "POSTED", idempotencyKey: suffix, postedAt: new Date() } })
  const event = await db.businessEvent.create({ data: { organizationId, eventType: "synthetic.payroll.posted", status: "APPLIED", idempotencyKey: suffix, payloadHash: `synthetic:${suffix}`, payload: { synthetic: true }, occurredAt: new Date() } })
  // Prepared source-state fixtures do not certify calculation, posting or provider authentication.
  await db.payrollRun.create({ data: { id: runId, organizationId, payrollPeriodId: period.id, runNumber: suffix, status: "POSTED", countryCode: "CM",
    countryPackVersion: "synthetic", countryPackSchemaVersion: "synthetic", countryPackResolutionHash: "synthetic", countryPackCapabilityStatus: "synthetic",
    ruleSetHash: "synthetic", calculationHash: "synthetic", attendanceSnapshotHash: "synthetic", currency: "XAF", netPayableAmount: "100.00",
    documentHash: `sha256:${suffix}`, postedBusinessEventId: event.id, ledgerPostingBatchId: posting.id } })
  await db.payrollPaymentBatch.create({ data: { id: batchId, organizationId, payrollRunId: runId, batchNumber: suffix, status: "RELEASED", method: "BANK_TRANSFER", amount: "100.00", currency: "XAF", paymentDate: new Date(), requestedById: releaserId, releasedById: selfApproval ? actorId : releaserId,
    ledgerPostingBatchId: posting.id, postedBusinessEventId: event.id, paymentTransactionId: transactionId, metadata: {
      ledgerStatus: "POSTED", componentRegisterProofHash: "sha256:synthetic-component", componentRegisterProofStatus: "MATCHED",
      payrollComponentMappingHash: "sha256:synthetic-mapping", payrollComponentMappingStatus: "BLOCKED_REQUIRES_EXPERT_REVIEW",
      paymentAdapterProofHash: "sha256:synthetic-adapter", paymentAdapterRegistryVersion: 1, paymentProviderAdapterContractHash: "sha256:synthetic-contract",
      paymentAdapterStatus: "MANUAL_PROVIDER_SETTLEMENT_REQUIRED", paymentProviderAdapterKey: "BANK_TRANSFER:MANUAL_DISBURSEMENT_FILE", productionPaymentAutomationSupported: false,
    } } })
  const rail = await db.paymentRail.create({ data: { organizationId, type: "BANK_TRANSFER", code: "SYNTHETIC", name: "Synthetic rail" } })
  const account = await db.providerAccount.create({ data: { organizationId, paymentRailId: rail.id, providerCode: "SYNTHETIC", displayName: "Synthetic provider", externalAccountHash: suffix, status: "ACTIVE" } })
  await db.paymentTransaction.create({ data: { id: transactionId, organizationId, providerAccountId: account.id, ledgerPostingBatchId: posting.id,
    direction: "OUTBOUND", state: "PENDING", amount: "100.00", currencyCode: "XAF", sourceType: "PAYROLL_PAYMENT", sourceId: batchId } })
  const base = { organizationId, actorId, releaserId, batchId, transactionId, providerAccountId: account.id }
  const match = await matchFixture(base, amount)
  return { ...base, matchId: match.id, command: { organizationId, actorId, sessionId: session.id, sessionToken: session.token, actorPermissions: ["payroll.payments.reconcile"], payrollPaymentBatchId: batchId,
    settlementStatus: amount === "100.00" ? "settled" : "partially_settled", settlementAmount: amount, expectedBalanceEventId: null,
    proofSelection: await selection(base, match.id), evidenceHash: "GUIDED_RECORDS_V1", idempotencyKey: randomUUID(), lastAuthAt: new Date() } }
}
async function effects(f: Fixture) {
  const batch = await db.payrollPaymentBatch.findUniqueOrThrow({ where: { id: f.batchId }, select: { status: true, metadata: true } })
  const transaction = await db.paymentTransaction.findUniqueOrThrow({ where: { id: f.transactionId }, select: { state: true, metadata: true, settledAt: true } })
  return { batch, transaction,
    events: await db.businessEvent.count({ where: { organizationId: f.organizationId, eventType: "payroll.payment_batch.reconciled" } }),
    outbox: await db.businessEventOutbox.count({ where: { organizationId: f.organizationId } }),
    audit: await db.auditLog.count({ where: { organizationId: f.organizationId } }),
    journals: await db.journalEntry.count({ where: { organizationId: f.organizationId } }) }
}
async function contend(f: Fixture, commands: RecordPayrollPaymentSettlementInput[]) {
  let unlock!: () => void, locked!: () => void
  const release = new Promise<void>(resolve => { unlock = resolve }), ready = new Promise<void>(resolve => { locked = resolve })
  const holder = observer.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM payment_transactions WHERE id = ${f.transactionId} FOR UPDATE`; locked(); await release }, { timeout: 10000 })
  await Promise.race([ready, holder.then(() => { throw new Error("Lock holder ended before readiness") })])
  const pending = Promise.allSettled(commands.map(command => recordPayrollPaymentSettlementEvidence(command)))
  try {
    let waiting = 0
    const deadline = Date.now() + 1500
    while (Date.now() < deadline) {
      const rows = await db.$queryRaw<Array<{ count: bigint }>>`SELECT count(DISTINCT pid) AS count FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE 'UPDATE%payment_transactions%'`
      waiting = Number(rows[0].count)
      if (waiting >= 2) break
      await delay(20)
    }
    expect(waiting).toBeGreaterThanOrEqual(2)
  } finally { unlock(); await holder }
  return pending
}
async function waitForLock(fragment: string) {
  const deadline = Date.now() + 3000
  while (Date.now() < deadline) {
    const rows = await observer.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) AS count FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE ${"%" + fragment + "%"}`
    if (Number(rows[0].count) > 0) return
    await delay(20)
  }
  throw new Error(`Expected lock wait did not occur: ${fragment}`)
}
suite("Guided payroll settlement on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
    observer = new PrismaClient({ datasources: { db: { url: resolveWorkflowTestTarget(process.env.UI_WORKFLOW_POSTGRES_DATABASE).toString() } } })
    const identity = await observer.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
    expect(identity[0].name).toBe(process.env.UI_WORKFLOW_POSTGRES_DATABASE)
  })
  afterAll(async () => { await Promise.all([db.$disconnect(), observer?.$disconnect()]) })
  it.each(["session", "actor", "role", "membership", "module", "wrong token"])("rejects persisted %s revocation despite stale caller claims", async kind => {
    const f = await fixture(), before = await effects(f)
    if (kind === "session") await observer.session.delete({ where: { id: f.command.sessionId } })
    if (kind === "actor") await observer.user.update({ where: { id: f.actorId }, data: { isActive: false } })
    if (kind === "role") await observer.role.updateMany({ where: { organizationId: f.organizationId }, data: { permissions: [] } })
    if (kind === "membership") await observer.user.update({ where: { id: f.actorId }, data: { roles: { set: [] } } })
    if (kind === "module") await observer.organization.update({ where: { id: f.organizationId }, data: { requestedModules: ["inventory"] } })
    if (kind === "wrong token") f.command.sessionToken = "forged-token"
    await expect(recordPayrollPaymentSettlementEvidence({ ...f.command, actorPermissions: ["*"], lastAuthAt: new Date(), now: new Date() })).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(await effects(f)).toEqual(before)
  })
  it("replays with a new valid session without changing command identity; revoked sessions cannot replay", async () => {
    const f = await fixture(), result = await recordPayrollPaymentSettlementEvidence(f.command), before = await effects(f)
    const session = await observer.session.create({ data: { userId: f.actorId, token: `synthetic-${randomUUID()}`, expiresAt: new Date(Date.now() + 60000) } })
    await expect(recordPayrollPaymentSettlementEvidence({ ...f.command, sessionId: session.id, sessionToken: session.token, actorPermissions: [] })).resolves.toEqual({ ...result, idempotent: true })
    await observer.session.delete({ where: { id: session.id } })
    await expect(recordPayrollPaymentSettlementEvidence({ ...f.command, sessionId: session.id, sessionToken: session.token })).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(await effects(f)).toEqual(before)
  })
  it.each(["session", "module", "role"])("rechecks authority on the retry after concurrent %s revocation wins its lock", async kind => {
    const f = await fixture(), before = await effects(f)
    let unlock!: () => void, locked!: () => void
    const release = new Promise<void>(resolve => { unlock = resolve }), ready = new Promise<void>(resolve => { locked = resolve })
    const holder = observer.$transaction(async tx => {
      if (kind === "session") await tx.session.delete({ where: { id: f.command.sessionId } })
      if (kind === "module") await tx.organization.update({ where: { id: f.organizationId }, data: { requestedModules: ["inventory"] } })
      if (kind === "role") await tx.role.updateMany({ where: { organizationId: f.organizationId }, data: { permissions: [] } })
      locked(); await release
    }, { timeout: 15000 })
    await Promise.race([ready, holder])
    const pending = recordPayrollPaymentSettlementEvidence(f.command).then(value => ({ value, error: null }), error => ({ value: null, error }))
    try { await waitForLock(kind === "session" ? "FROM sessions" : kind === "module" ? "organizations" : "roles") } finally { unlock(); await holder }
    expect((await pending).error).toMatchObject({ code: "FORBIDDEN" })
    expect(await effects(f)).toEqual(before)
  })
  it("allows admitted settlement to finish before a later revocation acquires its session lock", async () => {
    const f = await fixture()
    let unlock!: () => void, locked!: () => void
    const release = new Promise<void>(resolve => { unlock = resolve }), ready = new Promise<void>(resolve => { locked = resolve })
    const holder = observer.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM payment_transactions WHERE id = ${f.transactionId} FOR UPDATE`; locked(); await release }, { timeout: 15000 })
    await Promise.race([ready, holder])
    const settlement = recordPayrollPaymentSettlementEvidence(f.command)
    let revoke: Promise<unknown> | undefined
    try {
      await waitForLock("UPDATE%payment_transactions")
      revoke = observer.session.delete({ where: { id: f.command.sessionId } }).then(value => value)
      await waitForLock("DELETE%sessions")
    } finally { unlock(); await holder }
    await expect(settlement).resolves.toMatchObject({ idempotent: false })
    await revoke
    expect(await effects(f)).toMatchObject({ events: 1, outbox: 1, transaction: { state: "SETTLED" } })
  })
  it("rolls back economic effects when assurance expires while waiting on the payment write", async () => {
    const f = await fixture(), before = await effects(f)
    await observer.session.update({ where: { id: f.command.sessionId }, data: { assuranceVerifiedAt: new Date(Date.now() - 298500) } })
    let unlock!: () => void, locked!: () => void
    const release = new Promise<void>(resolve => { unlock = resolve }), ready = new Promise<void>(resolve => { locked = resolve })
    const holder = observer.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM payment_transactions WHERE id = ${f.transactionId} FOR UPDATE`; locked(); await release }, { timeout: 15000 })
    await Promise.race([ready, holder])
    const pending = recordPayrollPaymentSettlementEvidence(f.command).then(value => ({ value, error: null }), error => ({ value: null, error }))
    try { await waitForLock("UPDATE%payment_transactions"); await delay(1700) } finally { unlock(); await holder }
    expect((await pending).error).toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
    expect(await effects(f)).toEqual(before)
  })
  it("commits one guided settlement and resolves an identical retry", async () => {
    const f = await fixture(), result = await recordPayrollPaymentSettlementEvidence(f.command)
    expect(result).toMatchObject({ status: "SETTLED", idempotent: false })
    expect(await recordPayrollPaymentSettlementEvidence(f.command)).toEqual({ ...result, idempotent: true })
    expect(await effects(f)).toMatchObject({ batch: { status: "SETTLED" }, transaction: { state: "SETTLED" }, events: 1, outbox: 1, journals: 0 })
  })
  it("serializes identical submissions through distinct blocked connections", async () => {
    const f = await fixture(), results = await contend(f, [f.command, f.command])
    expect(results.every(result => result.status === "fulfilled")).toBe(true)
    const receipts = results.map(result => result.status === "fulfilled" ? result.value : null)
    expect(receipts[0]?.businessEventId).toBe(receipts[1]?.businessEventId)
    expect(receipts.filter(receipt => receipt?.idempotent)).toHaveLength(1)
    expect(await effects(f)).toMatchObject({ batch: { status: "SETTLED" }, transaction: { state: "SETTLED" }, events: 1, outbox: 1, journals: 0 })
  })
  it("accepts only one competing command for the same remaining obligation", async () => {
    const f = await fixture(), results = await contend(f, [f.command, { ...f.command, idempotencyKey: randomUUID() }])
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1)
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1)
    expect(await effects(f)).toMatchObject({ batch: { status: "SETTLED" }, transaction: { state: "SETTLED" }, events: 1, outbox: 1, journals: 0 })
  })
  it("records exact partial balances and rejects a stale remaining-balance selection", async () => {
    const f = await fixture("40.00"), first = await recordPayrollPaymentSettlementEvidence(f.command)
    expect(first.status).toBe("PARTIALLY_SETTLED")
    const match = await matchFixture(f, "60.00")
    const command: RecordPayrollPaymentSettlementInput = { ...f.command, idempotencyKey: randomUUID(), settlementAmount: "60.00", settlementStatus: "settled", proofSelection: await selection(f, match.id) }
    const before = await effects(f)
    await expect(recordPayrollPaymentSettlementEvidence(command)).rejects.toMatchObject({ code: "CONFLICT" })
    expect(await effects(f)).toEqual(before)
    const second = await recordPayrollPaymentSettlementEvidence({ ...command, expectedBalanceEventId: first.businessEventId })
    const firstEvent = await db.businessEvent.findUniqueOrThrow({ where: { id: first.businessEventId } })
    const secondEvent = await db.businessEvent.findUniqueOrThrow({ where: { id: second.businessEventId } })
    expect(firstEvent.payload).toMatchObject({ settlementBalance: { sequence: 1, settlementAmount: "40.00", cumulativeSettledAmount: "40.00", remainingAmount: "60.00", previousEventId: null } })
    expect(secondEvent.payload).toMatchObject({ settlementBalance: { sequence: 2, settlementAmount: "60.00", cumulativeSettledAmount: "100.00", remainingAmount: "0.00", previousEventId: first.businessEventId } })
    expect(await effects(f)).toMatchObject({ batch: { status: "SETTLED" }, transaction: { state: "SETTLED" }, events: 2, outbox: 2, journals: 0 })
  })
  it("rejects a selected match whose approval was revoked", async () => {
    const f = await fixture(), before = await effects(f)
    await observer.matchRecord.update({ where: { id: f.matchId }, data: { status: "REJECTED" } })
    await expect(recordPayrollPaymentSettlementEvidence(f.command)).rejects.toBeDefined()
    expect(await effects(f)).toEqual(before)
  })
  it("rejects stale proof revisions instead of trusting caller-supplied hashes", async () => {
    const f = await fixture(), before = await effects(f)
    await expect(recordPayrollPaymentSettlementEvidence({ ...f.command, proofSelection: { ...f.command.proofSelection!, matchRevision: `sha256:${"0".repeat(64)}` }, evidenceHash: "caller-proof", sourceRegisterHash: "caller-register" })).rejects.toMatchObject({ code: "CONFLICT" })
    expect(await effects(f)).toEqual(before)
  })
  it.each(["70.00", "130.00"])("rejects an unmatched or excessive settlement amount %s", async amount => {
    const f = await fixture(), before = await effects(f)
    await expect(recordPayrollPaymentSettlementEvidence({ ...f.command, settlementAmount: amount, settlementStatus: "partially_settled" })).rejects.toBeDefined()
    expect(await effects(f)).toEqual(before)
  })
  it("rejects foreign-tenant proof and batch lookup without creating settlement effects", async () => {
    const f = await fixture(), other = await fixture(), before = await effects(f), otherBefore = await effects(other)
    await expect(recordPayrollPaymentSettlementEvidence({ ...f.command, proofSelection: other.command.proofSelection })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(recordPayrollPaymentSettlementEvidence({ ...f.command, payrollPaymentBatchId: other.batchId })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(await effects(f)).toEqual(before); expect(await effects(other)).toEqual(otherBefore)
  })
  it.each(["no permission", "self approval", "stale authentication"])("rejects %s without committing any settlement effects", async mode => {
    const f = await fixture("100.00", mode === "self approval"), before = await effects(f)
    const command = { ...f.command }
    if (mode === "no permission") await observer.role.updateMany({ where: { organizationId: f.organizationId }, data: { permissions: [] } })
    if (mode === "stale authentication") await observer.session.update({ where: { id: command.sessionId }, data: { assuranceVerifiedAt: new Date(Date.now() - 360000) } })
    await expect(recordPayrollPaymentSettlementEvidence(command)).rejects.toBeDefined()
    expect(await effects(f)).toEqual(before)
  })
  it("rejects a proof with a recorded correction", async () => {
    const f = await fixture(), before = await effects(f)
    await observer.matchRecord.create({ data: { organizationId: f.organizationId, providerAccountId: f.providerAccountId, paymentTransactionId: f.transactionId,
      correctionOfId: f.matchId, correctionReason: "Synthetic correction", rule: "MANUAL", status: "NEEDS_REVIEW", amountMatched: "100.00", currencyCode: "XAF" } })
    await expect(recordPayrollPaymentSettlementEvidence(f.command)).rejects.toMatchObject({ code: "CONFLICT" })
    expect(await effects(f)).toEqual(before)
  })
  it("rolls back batch, payment, event, outbox and audit when the final audit insert fails", async () => {
    const f = await fixture(), before = await effects(f), trigger = `ux_payroll_${randomUUID().replaceAll("-", "")}`
    await observer.$executeRawUnsafe(`CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."organizationId" = '${f.organizationId}' AND NEW.action = 'PAYROLL_PAYMENT_RECONCILIATION_RECORDED' THEN RAISE EXCEPTION 'Synthetic payroll audit failure'; END IF; RETURN NEW; END $$`)
    await observer.$executeRawUnsafe(`CREATE TRIGGER "${trigger}" BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`)
    try {
      await expect(recordPayrollPaymentSettlementEvidence(f.command)).rejects.toBeDefined()
      expect(await effects(f)).toEqual(before)
    } finally {
      await observer.$executeRawUnsafe(`DROP TRIGGER "${trigger}" ON audit_logs`)
      await observer.$executeRawUnsafe(`DROP FUNCTION "${trigger}"()`)
    }
    expect(await recordPayrollPaymentSettlementEvidence(f.command)).toMatchObject({ status: "SETTLED", idempotent: false })
    expect(await effects(f)).toMatchObject({ batch: { status: "SETTLED" }, transaction: { state: "SETTLED" }, events: 1, outbox: 1, journals: 0 })
  })
})
