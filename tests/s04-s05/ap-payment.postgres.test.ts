/** @jest-environment node */
import { randomUUID } from "node:crypto"
import { db } from "@/prisma/db"
import { previewPaymentRequest, submitPaymentRequest, reviewPaymentRequestApproval, confirmPaymentRequestApproval } from "@/services/purchasing/payment-request.service"
import { previewPaymentRelease, confirmPaymentRelease, readPaymentReleaseOutcome } from "@/services/purchasing/payment-release.service"
import { previewPaymentPostingRecovery, confirmPaymentPostingRecovery, readPaymentPostingRecovery } from "@/services/purchasing/payment-posting-recovery.service"
import { paymentRequestAuthority } from "@/services/purchasing/payment-request-authority"
import { createAPLedgerPosting } from "@/services/purchasing/ap-control.service"
import type { PaymentRequestScope, PaymentRequestDraft } from "@/services/purchasing/payment-request-contracts"

const { assertTestEnvironment } = require("../../scripts/s04-s05-target.cjs")
// Prepared payable and bank destination are synthetic preconditions, not evidence
// that invoice receipt, destination approval or a real bank transfer was tested.
async function fixture() {
  assertTestEnvironment()
  const organizationId = `s04-${randomUUID()}`, today = new Date().toISOString().slice(0, 10)
  await db.organization.create({ data: { id: organizationId, slug: organizationId, name: "Synthetic AP recovery", currency: "XAF", country: "CM" } })
  const scopes: PaymentRequestScope[] = []
  for (const kind of ["request", "approve", "release"] as const) {
    const actorId = randomUUID()
    await db.user.create({ data: { id: actorId, organizationId, email: `${actorId}@s04.invalid`, firstName: "Synthetic", lastName: kind, isActive: true, isVerified: true, emailVerified: true, mfaBackupCodes: [] } })
    await db.role.create({ data: { organizationId, code: kind, nameEn: kind, permissions: ["purchasing.ap.payment.request", "purchasing.ap.payment.approve", "purchasing.ap.payment.release"], users: { connect: { id: actorId } } } })
    const session = await db.session.create({ data: { userId: actorId, token: randomUUID(), expiresAt: new Date(Date.now() + 3600000), assuranceOrganizationId: organizationId, assuranceVerifiedAt: new Date(), assuranceLevel: 1, assuranceMethod: "password" } })
    scopes.push({ organizationId, actorId, sessionId: session.id, sessionToken: session.token })
  }
  const [maker, approver, recorder] = scopes
  const supplier = await db.supplier.create({ data: { organizationId, code: randomUUID(), name: "Synthetic supplier", currentBalance: "200.50" } })
  const bank = await db.supplierBankAccount.create({ data: { organizationId, supplierId: supplier.id, status: "APPROVED", bankName: "Synthetic bank", accountNumberMasked: "****0000" } })
  const invoice = await db.supplierInvoice.create({ data: { organizationId, supplierId: supplier.id, invoiceNumber: randomUUID(), invoiceDate: new Date(today), status: "POSTED", total: "200.50", subtotal: "200.50", currency: "XAF", duplicateFingerprint: randomUUID() } })
  const year = new Date().getUTCFullYear()
  const fiscal = await db.fiscalYear.create({ data: { organizationId, name: "Synthetic year", startDate: new Date(Date.UTC(year, 0, 1)), endDate: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)) } })
  const period = await db.accountingPeriod.create({ data: { organizationId, fiscalYearId: fiscal.id, periodNumber: 1, name: "Synthetic period", startDate: fiscal.startDate, endDate: fiscal.endDate } })
  await db.journal.create({ data: { organizationId, code: "TEST_BANK", nameEn: "Synthetic bank", type: "BANK", isDefault: true } })
  const payable = await db.chartOfAccount.create({ data: { organizationId, code: "TEST_AP", nameEn: "Synthetic payable", type: "LIABILITY", normalBalance: "CREDIT", currency: "XAF" } })
  const cash = await db.chartOfAccount.create({ data: { organizationId, code: "TEST_CASH", nameEn: "Synthetic cash", type: "ASSET", normalBalance: "DEBIT", currency: "XAF" } })
  const draft: PaymentRequestDraft = { supplierId: supplier.id, bankAccountId: bank.id, method: "BANK_TRANSFER", paymentDate: today, documentReference: "https://evidence.invalid/request", documentSha256: "a".repeat(64), allocations: [{ supplierInvoiceId: invoice.id, amount: "100.25" }] }
  return { organizationId, maker, approver, recorder, supplier, invoice, period, payable, cash, draft }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
async function approved(f: Fixture) {
  const preview = await previewPaymentRequest(f.draft, f.maker)
  const request = await submitPaymentRequest({ draft: f.draft, expectedRevision: preview.revision, idempotencyKey: randomUUID() }, f.maker)
  const review = await reviewPaymentRequestApproval(request.paymentRequestId, f.approver)
  await confirmPaymentRequestApproval({ paymentRequestId: request.paymentRequestId, expectedRevision: review.revision, idempotencyKey: randomUUID() }, f.approver)
  const draft = { paymentRequestId: request.paymentRequestId, executionReference: randomUUID(), executedAt: new Date().toISOString(), evidenceUri: "https://evidence.invalid/transfer", evidenceSha256: "b".repeat(64) }
  const release = await previewPaymentRelease(draft, f.recorder)
  return { draft, expectedRevision: release.revision, idempotencyKey: randomUUID() }
}
async function repair(f: Fixture) {
  await db.postingRule.create({ data: { organizationId: f.organizationId, code: "TEST_AP_PAYMENT", nameEn: "Synthetic zero-tax settlement", sourceType: "SUPPLIER_PAYMENT", postingPurpose: "SUPPLIER_PAYMENT", lines: { create: [
    { organizationId: f.organizationId, lineNumber: 1, side: "DEBIT", amountSource: "GROSS_AMOUNT", accountId: f.payable.id },
    { organizationId: f.organizationId, lineNumber: 2, side: "CREDIT", amountSource: "GROSS_AMOUNT", accountId: f.cash.id },
  ] } } })
}
async function effects(f: Fixture) {
  const where = { organizationId: f.organizationId }
  return {
    supplier: await db.supplier.findUniqueOrThrow({ where: { id: f.supplier.id }, select: { currentBalance: true } }),
    invoice: await db.supplierInvoice.findUniqueOrThrow({ where: { id: f.invoice.id }, select: { amountPaid: true, status: true } }),
    payments: await db.supplierPayment.findMany({ where, orderBy: { id: "asc" } }),
    entries: await db.supplierLedgerEntry.findMany({ where, orderBy: { id: "asc" } }),
    transactions: await db.paymentTransaction.findMany({ where, orderBy: { id: "asc" } }),
    journals: await db.journalEntry.findMany({ where, include: { lines: true }, orderBy: { id: "asc" } }),
    batches: await db.ledgerPostingBatch.findMany({ where, orderBy: { id: "asc" } }),
    exceptions: await db.paymentException.findMany({ where, orderBy: { id: "asc" } }),
    events: await db.businessEvent.findMany({ where, orderBy: { id: "asc" } }),
    audit: await db.auditLog.count({ where }), outbox: await db.businessEventOutbox.count({ where }),
    close: await db.closeRun.findMany({ where, orderBy: { id: "asc" } }),
  }
}
async function failureAtAudit(f: Fixture, action: string, run: () => Promise<unknown>) {
  const name = `s04_${randomUUID().replaceAll("-", "")}`, probe = `${name}_probe`
  assertTestEnvironment()
  await db.$executeRawUnsafe(`CREATE SEQUENCE public."${probe}"`)
  await db.$executeRawUnsafe(`CREATE FUNCTION public."${name}"() RETURNS trigger AS $$ BEGIN IF NEW."organizationId" = '${f.organizationId}' AND NEW.action = '${action}' THEN PERFORM nextval('public."${probe}"'); RAISE EXCEPTION 's04 injected final audit failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`)
  await db.$executeRawUnsafe(`CREATE TRIGGER "${name}" BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public."${name}"()`)
  try {
    await expect(run()).rejects.toThrow()
    expect((await db.$queryRawUnsafe<Array<{ is_called: boolean }>>(`SELECT is_called FROM public."${probe}"`))[0].is_called).toBe(true)
  } finally {
    await db.$executeRawUnsafe(`DROP TRIGGER "${name}" ON public.audit_logs`)
    await db.$executeRawUnsafe(`DROP FUNCTION public."${name}"()`)
    await db.$executeRawUnsafe(`DROP SEQUENCE public."${probe}"`)
  }
}
describe("S04 AP payment real PostgreSQL recovery", () => {
  beforeAll(async () => {
    const name = assertTestEnvironment()
    expect((await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`)[0].name).toBe(name)
    for (const fn of [db.$transaction, paymentRequestAuthority, createAPLedgerPosting]) expect(jest.isMockFunction(fn)).toBe(false)
  })
  afterAll(async () => { await db.$disconnect() })
  it("records execution once under concurrent confirmation; changed retries and reused bank references cannot pay again", async () => {
    const f = await fixture(), command = await approved(f)
    const results = await Promise.all([confirmPaymentRelease(command, f.recorder), confirmPaymentRelease(command, f.recorder)])
    expect(results.map(r => r.replayed).sort()).toEqual([false, true])
    const state = await effects(f)
    expect(state.supplier.currentBalance.toFixed(2)).toBe("100.25")
    expect(state.invoice.amountPaid.toFixed(2)).toBe("100.25")
    expect(state.entries).toHaveLength(1)
    expect(state.transactions).toHaveLength(1)
    expect(state.journals).toHaveLength(0)
    expect(state.batches).toHaveLength(1)
    expect(state.batches[0].status).toBe("FAILED")
    expect(state.transactions[0].state).toBe("SUSPENSE")
    const execution = state.events.filter(e => e.eventType === "supplier.payment.execution_recorded")
    expect(execution).toHaveLength(1)
    await expect(confirmPaymentRelease({ ...command, draft: { ...command.draft, evidenceSha256: "c".repeat(64) } }, f.recorder)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
    expect(await effects(f)).toEqual(state)
    // The successful response is deliberately discarded. A read plus same-command
    // retry recovers the durable outcome without another economic effect.
    expect((await readPaymentReleaseOutcome(command.draft.paymentRequestId, f.recorder)).paymentTransactionId).toBe(state.transactions[0].id)
    expect((await confirmPaymentRelease(command, f.recorder)).replayed).toBe(true)
    expect(await effects(f)).toEqual(state)
    const second = await approved(f)
    const duplicate = { ...second.draft, executionReference: command.draft.executionReference }
    const preview = await previewPaymentRelease(duplicate, f.recorder), before = await effects(f)
    await expect(confirmPaymentRelease({ ...second, draft: duplicate, expectedRevision: preview.revision }, f.recorder)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
    expect(await effects(f)).toEqual(before)
  })
  it("recovers a missing rule exactly once, invalidates close, and retains unresolved bank reconciliation", async () => {
    const f = await fixture(), command = await approved(f)
    const release = await confirmPaymentRelease(command, f.recorder)
    const originalExecution = await db.businessEvent.findUniqueOrThrow({ where: { id: release.executionEventId } })
    const blocked = await previewPaymentPostingRecovery({ paymentRequestId: command.draft.paymentRequestId }, f.recorder)
    expect(blocked.blockers).toContain("RULE_UNAVAILABLE")
    await repair(f)
    const close = await db.closeRun.create({ data: { organizationId: f.organizationId, periodId: f.period.id, status: "CERTIFIED" } })
    const preview = await previewPaymentPostingRecovery({ paymentRequestId: command.draft.paymentRequestId }, f.recorder)
    expect(preview.blockers).toEqual([])
    const recovery = { paymentRequestId: command.draft.paymentRequestId, expectedRevision: preview.revision, idempotencyKey: randomUUID() }
    const before = await effects(f)
    await failureAtAudit(f, "SUPPLIER_PAYMENT_POSTING_RECOVERED", () => confirmPaymentPostingRecovery(recovery, f.recorder))
    expect(await effects(f)).toEqual(before)
    const results = await Promise.all([confirmPaymentPostingRecovery(recovery, f.recorder), confirmPaymentPostingRecovery(recovery, f.recorder)])
    expect(results.map(r => r.replayed).sort()).toEqual([false, true])
    const after = await effects(f)
    expect(after.entries).toEqual(before.entries)
    expect(after.supplier).toEqual(before.supplier)
    expect(after.invoice).toEqual(before.invoice)
    expect(after.journals).toHaveLength(1)
    const lines = after.journals[0].lines
    expect(lines.find(l => l.accountId === f.payable.id)?.debit.toFixed(2)).toBe("100.25")
    expect(lines.find(l => l.accountId === f.cash.id)?.credit.toFixed(2)).toBe("100.25")
    expect(lines.reduce((n, l) => n + Number(l.debit) - Number(l.credit), 0)).toBe(0)
    expect(after.transactions).toHaveLength(1)
    expect(after.transactions[0]).toMatchObject({ state: "PENDING", settledAt: null, confirmedAt: null })
    expect(after.exceptions.filter(e => e.type === "SUSPENSE_POSTING_BLOCKED")).toEqual([expect.objectContaining({ status: "RESOLVED" })])
    expect(after.exceptions.filter(e => e.type === "MISSING_STATEMENT_LINE")).toEqual([expect.objectContaining({ status: "OPEN" })])
    expect(after.close.find(c => c.id === close.id)).toMatchObject({ status: "BLOCKED", metadata: { staleState: { status: "EVIDENCE_STALE" } } })
    expect(await db.businessEvent.findUniqueOrThrow({ where: { id: release.executionEventId } })).toEqual(originalExecution)
    expect((await readPaymentPostingRecovery(recovery.paymentRequestId, f.recorder)).reconciliationStatus).toBe("AWAITING_STATEMENT_MATCH")
    expect((await confirmPaymentPostingRecovery(recovery, f.recorder)).replayed).toBe(true)
    await expect(confirmPaymentPostingRecovery({ ...recovery, expectedRevision: "f".repeat(64) }, f.recorder)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
    expect(await effects(f)).toEqual(after)
  })
  it("rolls back all release effects when final execution audit fails, then safely retries the original command", async () => {
    const f = await fixture(), command = await approved(f), before = await effects(f)
    await failureAtAudit(f, "SUPPLIER_PAYMENT_EXECUTION_RECORDED", () => confirmPaymentRelease(command, f.recorder))
    expect(await effects(f)).toEqual(before)
    expect((await confirmPaymentRelease(command, f.recorder)).replayed).toBe(false)
    expect((await effects(f)).entries).toHaveLength(1)
  })
  it("retries a serialization failure at final execution evidence without duplicating payment effects", async () => {
    const f = await fixture(), command = await approved(f)
    const name = `ap_retry_${randomUUID().replaceAll("-", "")}`, probe = `${name}_probe`
    await db.$executeRawUnsafe(`CREATE SEQUENCE public."${probe}"`)
    await db.$executeRawUnsafe(`CREATE FUNCTION public."${name}"() RETURNS trigger AS $$ BEGIN IF NEW."organizationId" = '${f.organizationId}' AND NEW."eventType" = 'supplier.payment.execution_recorded' AND nextval('public."${probe}"') = 1 THEN RAISE EXCEPTION 'injected serialization retry' USING ERRCODE = '40001'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`)
    await db.$executeRawUnsafe(`CREATE TRIGGER "${name}" BEFORE INSERT ON public.business_events FOR EACH ROW EXECUTE FUNCTION public."${name}"()`)
    try {
      expect((await confirmPaymentRelease(command, f.recorder)).replayed).toBe(false)
      expect(Number((await db.$queryRawUnsafe<Array<{ last_value: bigint }>>(`SELECT last_value FROM public."${probe}"`))[0].last_value)).toBe(2)
      const after = await effects(f)
      expect(after.entries).toHaveLength(1)
      expect(after.transactions).toHaveLength(1)
      expect(after.supplier.currentBalance.toFixed(2)).toBe("100.25")
      expect(after.invoice.amountPaid.toFixed(2)).toBe("100.25")
      expect(after.events.filter(e => e.eventType === "supplier.payment.execution_recorded")).toHaveLength(1)
      expect((await confirmPaymentRelease(command, f.recorder)).replayed).toBe(true)
      expect(await effects(f)).toEqual(after)
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER "${name}" ON public.business_events`)
      await db.$executeRawUnsafe(`DROP FUNCTION public."${name}"()`)
      await db.$executeRawUnsafe(`DROP SEQUENCE public."${probe}"`)
    }
  })

  it("enforces distinct operators and current authorization before any financial effect", async () => {
    const f = await fixture(), command = await approved(f), before = await effects(f)
    for (const actor of [f.maker, f.approver]) await expect(confirmPaymentRelease(command, actor)).rejects.toMatchObject({ code: "SOD_VIOLATION" })
    await db.session.delete({ where: { id: f.recorder.sessionId } })
    await expect(confirmPaymentRelease(command, f.recorder)).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(await effects(f)).toEqual(before)
  })
})
