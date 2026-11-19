/** @jest-environment node */
// Actual internal-system lifecycle only. No terminal accounting/certification history is seeded.
import fs from "node:fs"
import path from "node:path"
import { createHash, randomBytes, randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { REQUIRED_ACCOUNTING_MAPPINGS, REQUIRED_READY_POSTING_PURPOSES, REQUIRED_READY_POSTING_SOURCES, markAccountingSetupReady } from "@/services/accounting/accounting-settings.service"
import { getDefaultPostingRuleTemplates } from "@/services/accounting/default-posting-rules.service"
import { createPostingRule } from "@/services/accounting/posting-rules.service"
import { ensureDefaultJournals, createManualJournalEntry } from "@/services/accounting/journals.service"
import { postJournalEntry } from "@/services/accounting/posting.service"
import { addPOSCartLine, openPOSShift, commitPOSSale, closePOSShift, type ClosePOSShiftResult } from "@/services/pos/pos.service"
import { acquirePOSCheckout, preparePOSCheckout } from "@/services/pos/checkout.service"
import { posCartRevision } from "@/services/pos/cart-revision"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { proposeBalanceSheetEvidence, decideBalanceSheetEvidence } from "@/services/accounting/balance-sheet-evidence.service"
import { runCloseAssurance, updateAccountantReview } from "@/services/accounting/close-assurance.service"
import { getAccountantPortalData } from "@/services/accounting/data-trust.service"
import { exportClosePack, getRetainedClosePackExport, listClosePackExports, type ClosePackExportResult } from "@/services/accounting/close-assurance-pack.service"
import { closeAccountingPeriod } from "@/services/accounting/periods.service"
import { reopenAccountingPeriod } from "@/services/accounting/period-control.service"

const databaseUrl = new URL(process.env.EARNED_CLOSE_POSTGRES_URL || "")
if (databaseUrl.hostname !== "localhost" || databaseUrl.pathname !== "/" + process.env.EARNED_CLOSE_DATABASE_NAME ||
  !/^\/stoquify_replay_close_earned_20261109_[a-f0-9]{10}$/.test(databaseUrl.pathname) || databaseUrl.searchParams.get("schema") !== "public")
  throw Error("Exact new owned earned-close database required")
const privateDirectory = fs.realpathSync(process.env.EARNED_CLOSE_PRIVATE_DIRECTORY!)
const checks: Array<Record<string, unknown>> = []
const limitation = "Actual PostgreSQL internal-system close lifecycle over synthetic zero-tax nonstock cash facts. No provider, expert-country approval, statutory certificate, HTTP authentication or deployment claim. Manual journal/period controls use their existing trusted service snapshots; hardened close operations also re-read native exact sessions."
const rawSha = (value: string) => createHash("sha256").update(value, "utf8").digest("hex")
const digest = (value: string) => "sha256:" + rawSha(value)
const money = (value: Prisma.Decimal) => value.toFixed(2)
const safe = (value: unknown) => JSON.parse(JSON.stringify(value))
function privateDocument(name: string, value: unknown) {
  if (!/^[a-z0-9-]+\.json$/.test(name)) throw Error("Owned private document name required")
  const file = path.resolve(privateDirectory, name)
  if (path.dirname(file) !== privateDirectory) throw Error("Private evidence escaped owned directory")
  const content = JSON.stringify(value, null, 2) + "\n"
  fs.writeFileSync(file, content, { flag: "wx" })
  return { reference: "urn:stoquify:synthetic-earned-close:" + name, hash: digest(content) }
}
async function actor(organizationId: string, kind: string, permissions: string[]) {
  const id = "earned-" + kind + "-" + randomBytes(5).toString("hex")
  const role = await db.role.create({ data: { organizationId, code: id, nameEn: "Synthetic earned close " + kind, permissions } })
  const user = await db.user.create({ data: { organizationId, email: id + "@example.invalid", name: "Synthetic " + kind, isActive: true, isVerified: true, emailVerified: true, roles: { connect: { id: role.id } } } })
  const session = await db.session.create({ data: { userId: user.id, token: "earned_session_" + randomBytes(32).toString("hex"), expiresAt: new Date(Date.now() + 3600000), assuranceVerifiedAt: new Date(), assuranceMethod: "password", assuranceOrganizationId: organizationId, assuranceLevel: 1 } })
  return { user, role, session, permissions }
}
type Actor = Awaited<ReturnType<typeof actor>>
const closeControl = (a: Actor) => ({ actorId: a.user.id, actorPermissions: a.permissions, session: { id: a.session.id, token: a.session.token }, lastAuthAt: a.session.assuranceVerifiedAt! })
async function fixture() {
  const organizationId = "earned-close-" + randomBytes(6).toString("hex")
  const modules = ["accounting", "finance", "payment_reconciliation", "close_assurance", "sales", "pos", "inventory", "dashboard", "reports"]
  // Raw UI admission configuration only: no onboarding journey or statutory approval is earned here.
  await db.organization.create({ data: { id: organizationId, name: "Synthetic earned internal cash close", slug: organizationId, countryCode: "CM", country: "Cameroon", timezone: "Africa/Douala", onboardingCompletedAt: new Date(), currency: "XAF", requestedModules: modules } })
  await db.tenantModuleConfiguration.create({ data: { organizationId, manifestHash: rawSha(organizationId), revision: 1, activeRevision: 1, selectedModules: modules, activeModules: modules } })
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId, moduleSlug, status: "active", source: "manual_override" })) })
  const cashier = await actor(organizationId, "cashier", ["pos.access", "pos.sale.create", "pos.shift.open", "pos.shift.close", "sales.read"])
  const preparer = await actor(organizationId, "preparer", ["accounting.close.read", "accounting.close.run", "accounting.close.export", "accounting.close.certify", "accounting.journal.create"])
  const reviewer = await actor(organizationId, "reviewer", ["accounting.close.read", "accounting.close.certify", "accounting.close.export", "accounting.close.accountant.review", "accounting.setup.manage", "accounting.period.close", "accounting.period.reopen", "accounting.journal.post", "dashboard.read", "accounting.period.read", "accounting.reports.read"])
  const now = new Date()
  const year = await db.fiscalYear.create({ data: { organizationId, name: "Synthetic earned close " + now.getUTCFullYear(), startDate: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), endDate: new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999)) } })
  const period = await db.accountingPeriod.create({ data: { organizationId, fiscalYearId: year.id, name: "Synthetic short completed period", periodNumber: 1, startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), endDate: new Date(+now + 90000) } })
  const accounts = new Map<string, Awaited<ReturnType<typeof db.chartOfAccount.create>>>()
  for (const [index, mapping] of REQUIRED_ACCOUNTING_MAPPINGS.entries()) {
    const account = await db.chartOfAccount.create({ data: { organizationId, code: mapping.syscohadaClass + "90" + String(index + 1).padStart(2, "0"), mappingKey: mapping.key, type: mapping.type, normalBalance: mapping.normalBalance, syscohadaClass: mapping.syscohadaClass,
      syscohadaReference: "Synthetic internal chart configuration " + mapping.key, nameEn: "Synthetic " + mapping.key, currency: "XAF" } })
    accounts.set(mapping.key, account)
  }
  await ensureDefaultJournals(organizationId, preparer.user.id)
  for (const purpose of REQUIRED_READY_POSTING_PURPOSES) {
    const template = getDefaultPostingRuleTemplates().find(candidate => candidate.postingPurpose === purpose)
    // Non-exercised balanced readiness scaffolds are configuration, never transactions.
    await createPostingRule(organizationId, template ?? { code: "SYNTH_" + purpose, nameEn: "Synthetic readiness scaffold " + purpose, postingPurpose: purpose, sourceType: REQUIRED_READY_POSTING_SOURCES[purpose], lines: [
      { side: "DEBIT", mappingKey: "INVENTORY_VARIANCE", amountSource: "SOURCE_AMOUNT" },
      { side: "CREDIT", mappingKey: purpose === "CASH_DRAWER_CLOSE" ? "CASH_ON_HAND" : "ACCOUNTS_PAYABLE", amountSource: "SOURCE_AMOUNT" },
    ] }, preparer.user.id)
  }
  const ready = await markAccountingSetupReady(organizationId, reviewer.user.id, { actorPermissions: reviewer.permissions, lastAuthAt: reviewer.session.assuranceVerifiedAt! })
  expect(ready?.setupStatus).toBe("READY")
  const location = await db.location.create({ data: { organizationId, name: "Synthetic cash counter", code: "EARNED", type: "STORE", allowNegativeStock: false } })
  const terminal = await db.pOSStation.create({ data: { organizationId, locationId: location.id, terminalNumber: organizationId, name: "Synthetic earned close till", hasCashDrawer: true } })
  const item = await db.item.create({ data: { organizationId, slug: organizationId, sku: organizationId, nameEn: "Synthetic nonstock zero-tax service", imageUrls: [], trackInventory: false, sellingPrice: "100.00", costPrice: "0.00" } })
  return { organizationId, cashier, preparer, reviewer, period, accounts, location, terminal, item }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
let f: Fixture
let shiftReceipt: ClosePOSShiftResult
let shiftSource: unknown
let firstRun: Awaited<ReturnType<typeof runCloseAssurance>>
let firstPack: ClosePackExportResult
let firstCorrelation: string
let finalPack: ClosePackExportResult
let correctionJournalId: string
let terminalStatesEarned = false
const account = (mapping: string) => { const result = f.accounts.get(mapping); if (!result) throw Error("Fixture mapping missing " + mapping); return result }
async function financialState() {
  const organizationId = f.organizationId
  const journals = await db.journalEntry.findMany({ where: { organizationId }, include: { lines: true, sourceLinks: true } })
  for (const row of journals) {
    expect(row.status).toBe("POSTED")
    expect(row.lines.reduce((sum, line) => sum.plus(line.debit).minus(line.credit), new Prisma.Decimal(0)).eq(0)).toBe(true)
    expect(row.sourceLinks.some(link => link.postingBatchId === row.postingBatchId && link.sourceId === row.sourceId)).toBe(true)
  }
  return { journals: journals.length, lineCount: journals.reduce((count, row) => count + row.lines.length, 0), sales: await db.salesOrder.count({ where: { organizationId, status: "COMPLETED" } }), payments: await db.payment.count({ where: { organizationId } }), stockMovements: await db.inventoryTransaction.count({ where: { organizationId } }), providerAccounts: await db.providerAccount.count({ where: { organizationId } }), payrollRuns: await db.payrollRun.count({ where: { organizationId } }) }
}
async function verifyPack(pack: ClosePackExportResult, save = false) {
  expect(digest(pack.content)).toBe(pack.documentDigest)
  const payload = JSON.parse(pack.content)
  expect(payload.export.exportId).toBe(pack.exportId)
  expect(payload.export.contentHash).toBe(pack.contentHash)
  expect(payload.period.id).toBe(f.period.id)
  expect(payload.certificationScope).toMatchObject({ systemEvidenceStatus: "SYSTEM_EVIDENCE_ONLY", statutoryReadinessStatus: "STATUTORY_BLOCKED", statutoryAuthorityStatus: "AUTHORITY_NOT_CONFIGURED" })
  const stored = await db.closePackExport.findUniqueOrThrow({ where: { id: pack.exportId } })
  expect(stored.canonicalContent).toBe(pack.content); expect(stored.canonicalContentSha256).toBe(pack.documentDigest)
  for (const a of [f.cashier, f.preparer, f.reviewer]) expect(pack.content).not.toContain(a.session.token)
  if (save) fs.writeFileSync(path.join(privateDirectory, "pack-" + pack.exportId + ".json"), pack.content, { flag: "wx" })
  return { exportId: pack.exportId, closeRunId: pack.closeRunId, documentDigest: pack.documentDigest, contentHash: pack.contentHash }
}
async function approveSchedules(phase: string) {
  const receipts: Array<{ evidenceId: string; accountId: string; basis: string; hash: string }> = []
  const accounts = await db.chartOfAccount.findMany({ where: { organizationId: f.organizationId, isActive: true, deletedAt: null, children: { none: {} }, type: { in: ["ASSET", "CONTRA_ASSET", "LIABILITY", "EQUITY"] } }, orderBy: { id: "asc" } })
  for (const ledgerAccount of accounts) {
    const lines = await db.journalEntryLine.findMany({ where: { organizationId: f.organizationId, accountId: ledgerAccount.id, journalEntry: { periodId: f.period.id, status: { in: ["POSTED", "REVERSED"] } } }, orderBy: { id: "asc" }, include: { journalEntry: { select: { id: true, sourceType: true, sourceId: true, postingBatchId: true, entryDate: true, postedAt: true, sourceLinks: true } } } })
    const additions = lines.reduce((value, line) => value.plus(ledgerAccount.normalBalance === "DEBIT" ? line.debit : line.credit), new Prisma.Decimal(0))
    const reductions = lines.reduce((value, line) => value.plus(ledgerAccount.normalBalance === "DEBIT" ? line.credit : line.debit), new Prisma.Decimal(0))
    if (ledgerAccount.mappingKey === "CASH_ON_HAND") expect(money(additions.minus(reductions))).toBe("100.00")
    if (ledgerAccount.mappingKey === "ACCOUNTS_RECEIVABLE") { expect(lines.length).toBeGreaterThan(0); expect(money(additions.minus(reductions))).toBe("0.00") }
    const support = privateDocument("support-" + phase + "-" + ledgerAccount.id.toLowerCase() + ".json", { classification: "SYNTHETIC_INTERNAL_SOURCE_ONLY", organizationId: f.organizationId, periodId: f.period.id, ledgerAccountId: ledgerAccount.id, postedLines: safe(lines), actualCashShiftReceipt: shiftReceipt, actualRetainedCashSource: shiftSource })
    const input = { ledgerAccountId: ledgerAccount.id, periodId: f.period.id, currency: "XAF", idempotencyKey: randomUUID(), scheduleKind: ledgerAccount.mappingKey === "CASH_ON_HAND" ? "CASH" as const : ledgerAccount.mappingKey === "ACCOUNTS_RECEIVABLE" ? "RECEIVABLES" as const : "OTHER" as const,
      basis: lines.length ? "SUPPORTING_SCHEDULE" as const : "ZERO_ACTIVITY" as const, explanation: "Synthetic internal ledger and zero-variance POS shift reconciliation; no external attestation", sourceReference: support.reference, sourceDocumentHash: support.hash,
      items: lines.length ? [{ reference: ledgerAccount.id, description: "Actual posted internal source movements", openingBalance: "0.00", additions: money(additions), reductions: money(reductions), closingBalance: money(additions.minus(reductions)), sourceReference: support.reference, sourceDocumentHash: support.hash }] : [] }
    const proposed = await proposeBalanceSheetEvidence(input, { organizationId: f.organizationId, actorId: f.preparer.user.id, actorPermissions: f.preparer.permissions, lastAuthAt: f.preparer.session.assuranceVerifiedAt! })
    const approved = await decideBalanceSheetEvidence({ evidenceId: proposed.id, expectedEvidenceHash: proposed.evidenceHash, decision: "APPROVE" }, { organizationId: f.organizationId, actorId: f.reviewer.user.id, actorPermissions: f.reviewer.permissions, lastAuthAt: f.reviewer.session.assuranceVerifiedAt! })
    expect(approved.status).toBe("APPROVED"); expect(approved.approvedById).not.toBe(approved.proposedById)
    receipts.push({ evidenceId: approved.id, accountId: ledgerAccount.id, basis: input.basis, hash: approved.evidenceHash })
  }
  return receipts
}
async function assess(phase: string) {
  const run = await runCloseAssurance(f.organizationId, { periodId: f.period.id }, closeControl(f.preparer))
  const portal = await getAccountantPortalData({ organizationId: f.organizationId, periodId: f.period.id })
  checks.push({ name: "assessment-" + phase, runId: run.run.id, status: run.run.status, trustLevel: portal.certificate.level, blockers: portal.blockers.map(row => ({ id: row.id, severity: row.severity, gate: row.gate, title: row.title })), checklist: run.checklist.map(row => ({ key: row.key, status: row.status, blockerReason: row.blockerReason })) })
  return { run, portal }
}
async function independentReview(runId: string) {
  return updateAccountantReview(f.organizationId, { closeRunId: runId, status: "APPROVED_FOR_CLOSE", decisionNotes: "Independent review of synthetic internal posted sources and current balance schedules" }, closeControl(f.reviewer))
}
function correctionInput() {
  return { entryDate: new Date(+f.period.endDate - 1), memo: "Synthetic noncash expense/revenue correction inside reopened original period", reference: "SYNTHETIC-INTERNAL-CORRECTION", lines: [
    { accountId: account("INVENTORY_VARIANCE").id, debit: "1.00", credit: "0.00", currency: "XAF" },
    { accountId: account("SALES_REVENUE").id, debit: "0.00", credit: "1.00", currency: "XAF" },
  ] }
}

beforeAll(async () => {
  expect(process.env.NODE_ENV).toBe("test")
  const [identity] = await db.$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`
  expect(identity.database).toBe(process.env.EARNED_CLOSE_DATABASE_NAME)
  for (const service of [db.$transaction, commitPOSSale, closePOSShift, runCloseAssurance, exportClosePack, closeAccountingPeriod, proposeBalanceSheetEvidence, decideBalanceSheetEvidence]) expect(jest.isMockFunction(service)).toBe(false)
  f = await fixture()
}, 90000)
afterAll(async () => {
  try {
    const organizationId = f?.organizationId
    const counts = organizationId ? { certifiedExports: await db.closePackExport.count({ where: { organizationId, isCertified: true } }), periodCloseEvents: await db.periodControlEvent.count({ where: { organizationId, operation: "CLOSE" } }), periodReopenEvents: await db.periodControlEvent.count({ where: { organizationId, operation: "REOPEN" } }), journals: await db.journalEntry.count({ where: { organizationId } }), providerAccounts: await db.providerAccount.count({ where: { organizationId } }), payrollRuns: await db.payrollRun.count({ where: { organizationId } }), statutoryCertifiedDocuments: await db.fiscalDocument.count({ where: { organizationId, status: "CERTIFIED" } }) } : null
    fs.writeFileSync(process.env.EARNED_CLOSE_PROBE_EVIDENCE!, JSON.stringify({ checks, counts, earnedTerminalStates: terminalStatesEarned, seededTerminalStates: false, limitation }, null, 2) + "\n", { flag: "wx" })
  } finally { await db.$disconnect() }
})

it("earns a zero-tax nonstock cash sale, exact POS replay and zero-variance shift closure", async () => {
  const opened = await openPOSShift({ organizationId: f.organizationId, userId: f.cashier.user.id, terminalId: f.terminal.id, locationId: f.location.id, openingBalance: 0 })
  if (!opened) throw Error("Actual shift opening produced no active shift")
  const scope = { organizationId: f.organizationId, userId: f.cashier.user.id, terminalId: f.terminal.id, locationId: f.location.id, sessionId: opened.id, checkoutLeaseId: randomUUID() }
  await acquirePOSCheckout(scope)
  await addPOSCartLine({ ...scope, itemId: f.item.id, quantity: 1 })
  const cart = await db.salesOrder.findFirstOrThrow({ where: { organizationId: f.organizationId, sessionId: opened.id, status: "DRAFT" }, include: { lines: true } })
  const request = { ...scope, salesOrderId: cart.id, clientCommitId: "earned:" + randomUUID(), expectedCartRevision: posCartRevision(cart), tenders: [{ method: "CASH" as const, amount: 100 }] }
  await preparePOSCheckout(request)
  const committed = await commitPOSSale(request)
  expect(committed.status).toBe("COMPLETED"); expect(committed.replayed).toBe(false)
  const before = await financialState()
  expect(before).toMatchObject({ journals: 2, sales: 1, payments: 1, stockMovements: 0, providerAccounts: 0, payrollRuns: 0 })
  expect((await commitPOSSale(request)).replayed).toBe(true)
  expect(await financialState()).toEqual(before)
  shiftReceipt = await closePOSShift({ organizationId: f.organizationId, userId: f.cashier.user.id, sessionId: opened.id, actualBalance: "100.00", notes: "Synthetic zero-variance exact cash count" })
  expect(shiftReceipt.variance).toBe(0)
  const event = await db.businessEvent.findFirstOrThrow({ where: { id: shiftReceipt.eventId, organizationId: f.organizationId } })
  expect(event.payload).toMatchObject({ sessionId: opened.id, countedBalance: "100.00", expectedBalance: "100.00", variance: "0.00" })
  expect(hashBusinessPayload(event.payload)).toBe(shiftReceipt.evidenceHash)
  const closingTransaction = await db.cashDrawerTransaction.findUniqueOrThrow({ where: { id: shiftReceipt.closingTransactionId } })
  expect(money(closingTransaction.balanceAfter)).toBe("100.00")
  shiftSource = { eventId: event.id, payload: event.payload, payloadHash: event.payloadHash, closingTransaction: safe(closingTransaction) }
  expect((await db.pOSSession.findUniqueOrThrow({ where: { id: opened.id } })).status).toBe("CLOSED")
  expect((await db.accountingPeriod.findUniqueOrThrow({ where: { id: f.period.id } })).endDate).toEqual(f.period.endDate)
  if (Date.now() >= +f.period.endDate) throw Error("Fixture POS/setup missed the declared real-time open-period deadline")
  checks.push({ name: "actual-setup-pos-cash-shift", organizationId: f.organizationId, periodId: f.period.id, saleId: committed.saleId, sessionId: opened.id, shiftReceipt: safe(shiftReceipt), financialState: before, syntheticZeroTax: true, syntheticNonstock: true, openingFloat: "0.00", terminalHistorySeeded: false })
  while (Date.now() <= +f.period.endDate) await new Promise(resolve => setTimeout(resolve, Math.min(1000, +f.period.endDate - Date.now() + 25)))
}, 120000)

it("earns every independent balance schedule and a real T4 READY assessment", async () => {
  const initial = await assess("before-schedules")
  expect(initial.run.run.status).toBe("BLOCKED")
  const draft = await exportClosePack(f.organizationId, { closeRunId: initial.run.run.id!, mode: "DRAFT_NOT_CERTIFIED", correlationId: randomUUID() }, closeControl(f.preparer))
  expect(draft.isCertified).toBe(false); await verifyPack(draft, true)
  await expect(exportClosePack(f.organizationId, { closeRunId: initial.run.run.id!, mode: "CERTIFIED", correlationId: randomUUID() }, closeControl(f.reviewer))).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  const schedules = await approveSchedules("initial")
  const current = await assess("after-schedules")
  expect(current.portal.certificate.level).toBe("T4"); expect(current.portal.blockers).toEqual([])
  expect(current.run.run.status).toBe("READY")
  firstRun = current.run
  checks.push({ name: "actual-independent-schedules-and-ready", schedules, runId: firstRun.run.id, trustLevel: current.portal.certificate.level, earnedThroughServices: true })
}, 90000)

it("enforces current close authority and earns one independently certified retained receipt", async () => {
  const input = { closeRunId: firstRun.run.id!, mode: "CERTIFIED" as const, correlationId: randomUUID() }
  const before = await financialState()
  await expect(exportClosePack(f.organizationId, input, closeControl(f.preparer))).rejects.toThrow("The close runner cannot certify the same close pack.")
  await expect(exportClosePack(f.organizationId, input, { ...closeControl(f.reviewer), session: null })).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
  await expect(exportClosePack(f.organizationId, input, { ...closeControl(f.reviewer), lastAuthAt: new Date(Date.now() - 600000) })).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
  expect(await financialState()).toEqual(before)
  expect(await db.closePackExport.count({ where: { organizationId: f.organizationId, isCertified: true } })).toBe(0)
  await independentReview(firstRun.run.id!)
  firstCorrelation = randomUUID()
  firstPack = await exportClosePack(f.organizationId, { ...input, correlationId: firstCorrelation }, closeControl(f.reviewer))
  expect(firstPack.isCertified).toBe(true)
  const proof = await verifyPack(firstPack, true)
  const replay = await exportClosePack(f.organizationId, { ...input, correlationId: firstCorrelation }, closeControl(f.reviewer))
  expect(replay.replayed).toBe(true); expect(replay.content).toBe(firstPack.content); expect(replay.exportId).toBe(firstPack.exportId)
  const listed = await listClosePackExports(f.organizationId, { closeRunId: firstRun.run.id! }, closeControl(f.reviewer))
  expect(listed).toEqual([expect.objectContaining({ exportId: firstPack.exportId, retained: true, documentDigest: firstPack.documentDigest })])
  expect(await db.closePackExport.count({ where: { organizationId: f.organizationId, isCertified: true } })).toBe(1)
  expect(await financialState()).toEqual(before)
  const staleSession = await db.session.create({ data: { userId: f.reviewer.user.id, token: "earned_stale_" + randomBytes(32).toString("hex"), expiresAt: new Date(Date.now() + 600000), assuranceVerifiedAt: new Date(Date.now() - 600000), assuranceMethod: "password", assuranceOrganizationId: f.organizationId, assuranceLevel: 1 } })
  const auditBefore = await db.ledgerAuditEvent.count({ where: { organizationId: f.organizationId, action: "CLOSE_PACK_RETAINED_RETRIEVED" } })
  await expect(getRetainedClosePackExport(f.organizationId, { exportId: firstPack.exportId, mode: "DRAFT_NOT_CERTIFIED" }, { ...closeControl(f.reviewer), session: { id: staleSession.id, token: staleSession.token }, lastAuthAt: staleSession.assuranceVerifiedAt! })).rejects.toMatchObject({ code: "CONFLICT", message: "The requested export mode does not match the retained receipt." })
  expect(await db.ledgerAuditEvent.count({ where: { organizationId: f.organizationId, action: "CLOSE_PACK_RETAINED_RETRIEVED" } })).toBe(auditBefore)
  await db.session.delete({ where: { id: staleSession.id } })
  checks.push({ name: "actual-independent-certification-retention", ...proof, authorityDenials: ["self-certification", "missing-exact-session", "stale-authentication"], wrongModeCertifiedReadDenied: true, noReadAuditOnWrongMode: true, exactRequestReplay: true, certifiedReceiptCount: 1 })
}, 90000)

it("seals through retained approval, rejects a closed-period write and earns reopening history", async () => {
  const closed = await closeAccountingPeriod(f.organizationId, f.period.id, f.reviewer.user.id, { expectedVersion: 0, actorPermissions: f.reviewer.permissions, lastAuthAt: f.reviewer.session.assuranceVerifiedAt! })
  expect(closed).toMatchObject({ status: "CLOSED", controlVersion: 1 })
  const seal = await db.periodControlEvent.findFirstOrThrow({ where: { organizationId: f.organizationId, operation: "CLOSE" } })
  expect(seal.approval).toMatchObject({ certifiedExportId: firstPack.exportId, contentHash: firstPack.contentHash })
  const journal = await db.journal.findFirstOrThrow({ where: { organizationId: f.organizationId, type: "GENERAL", isDefault: true } })
  const before = await financialState()
  await expect(createManualJournalEntry(f.organizationId, { ...correctionInput(), journalId: journal.id }, f.preparer.user.id)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  expect(await financialState()).toEqual(before)
  const reopenInput = { periodId: f.period.id, expectedVersion: 1, idempotencyKey: randomUUID(), reason: "Controlled synthetic reopening for an internal noncash journal correction" }
  const control = { organizationId: f.organizationId, actorId: f.reviewer.user.id, actorPermissions: f.reviewer.permissions, lastAuthAt: f.reviewer.session.assuranceVerifiedAt! }
  const reopened = await reopenAccountingPeriod(reopenInput, control)
  expect(reopened.period).toMatchObject({ status: "OPEN", controlVersion: 2 })
  expect((await reopenAccountingPeriod(reopenInput, control)).event.id).toBe(reopened.event.id)
  const stale = await db.closePackExport.findUniqueOrThrow({ where: { id: firstPack.exportId } })
  expect(stale.metadata).toMatchObject({ staleState: { status: "EVIDENCE_STALE" } })
  expect(stale.canonicalContent).toBe(firstPack.content)
  checks.push({ name: "actual-seal-and-reopen", closeEventId: seal.id, reopenEventId: reopened.event.id, sealedExportId: firstPack.exportId, closedWriteDenied: true, actualRetainedHistoryVersions: [1, 2], originalBytesPreserved: true })
}, 90000)

it("posts an independent controlled correction, invalidates current proof and recovers historical exact bytes", async () => {
  const journal = await db.journal.findFirstOrThrow({ where: { organizationId: f.organizationId, type: "GENERAL", isDefault: true } })
  const draft = await createManualJournalEntry(f.organizationId, { ...correctionInput(), journalId: journal.id }, f.preparer.user.id)
  expect(draft.status).toBe("DRAFT")
  const posted = await postJournalEntry(f.organizationId, draft.id, f.reviewer.user.id, { actorPermissions: f.reviewer.permissions, lastAuthAt: f.reviewer.session.assuranceVerifiedAt! })
  expect(posted?.status).toBe("POSTED"); expect(posted?.createdById).not.toBe(posted?.postedById)
  correctionJournalId = draft.id
  const state = await financialState(); expect(state.journals).toBe(3)
  const retained = await getRetainedClosePackExport(f.organizationId, { exportId: firstPack.exportId, mode: "CERTIFIED" }, closeControl(f.reviewer))
  expect(retained.replayed).toBe(true); expect(retained.content).toBe(firstPack.content); expect(retained.documentDigest).toBe(firstPack.documentDigest); expect(retained.historicalNotice).toContain("historical snapshot")
  const replay = await exportClosePack(f.organizationId, { closeRunId: firstRun.run.id!, mode: "CERTIFIED", correlationId: firstCorrelation }, closeControl(f.reviewer))
  expect(replay.replayed).toBe(true); expect(replay.content).toBe(firstPack.content)
  const exportCount = await db.closePackExport.count({ where: { organizationId: f.organizationId } })
  await expect(exportClosePack(f.organizationId, { closeRunId: firstRun.run.id!, mode: "CERTIFIED", correlationId: randomUUID() }, closeControl(f.reviewer))).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  expect(await db.closePackExport.count({ where: { organizationId: f.organizationId } })).toBe(exportCount)
  const current = await assess("after-correction-before-new-schedules")
  expect(current.run.run.status).toBe("BLOCKED")
  checks.push({ name: "actual-correction-and-historical-recovery", correctionJournalId, independentlyPosted: true, originalDocumentDigest: firstPack.documentDigest, oldExactBytesRecovered: true, oldExactRequestReplayedWithoutNewCertification: true, obsoleteNewCertificationDenied: true, staleAssessmentId: current.run.run.id, financialState: state })
}, 90000)

it("reapproves sources, earns a new certificate and reseals without rewriting history", async () => {
  const schedules = await approveSchedules("corrected")
  const current = await assess("corrected-current")
  expect(current.portal.certificate.level).toBe("T4"); expect(current.portal.blockers).toEqual([]); expect(current.run.run.status).toBe("READY")
  await independentReview(current.run.run.id!)
  finalPack = await exportClosePack(f.organizationId, { closeRunId: current.run.run.id!, mode: "CERTIFIED", correlationId: randomUUID() }, closeControl(f.reviewer))
  expect(finalPack.contentHash).not.toBe(firstPack.contentHash); expect(finalPack.documentDigest).not.toBe(firstPack.documentDigest)
  const proof = await verifyPack(finalPack, true)
  const closed = await closeAccountingPeriod(f.organizationId, f.period.id, f.reviewer.user.id, { expectedVersion: 2, actorPermissions: f.reviewer.permissions, lastAuthAt: f.reviewer.session.assuranceVerifiedAt! })
  expect(closed).toMatchObject({ status: "CLOSED", controlVersion: 3 })
  const events = await db.periodControlEvent.findMany({ where: { organizationId: f.organizationId }, orderBy: { version: "asc" } })
  expect(events.map(row => row.operation)).toEqual(["CLOSE", "REOPEN", "CLOSE"])
  expect(events[2].approval).toMatchObject({ certifiedExportId: finalPack.exportId, contentHash: finalPack.contentHash })
  const old = await getRetainedClosePackExport(f.organizationId, { exportId: firstPack.exportId, mode: "CERTIFIED" }, closeControl(f.reviewer))
  expect(old.content).toBe(firstPack.content); await verifyPack(old)
  expect(await db.closePackExport.count({ where: { organizationId: f.organizationId, isCertified: true } })).toBe(2)
  expect(await db.fiscalDocument.count({ where: { organizationId: f.organizationId, status: "CERTIFIED" } })).toBe(0)
  expect(await financialState()).toMatchObject({ journals: 3, stockMovements: 0, providerAccounts: 0, payrollRuns: 0 })
  // Private handoff contains only earned fixture identities and byte bindings, never credentials/session secrets.
  fs.writeFileSync(path.join(privateDirectory, "FIXTURE.json"), JSON.stringify({ organizationId: f.organizationId, reviewerUserId: f.reviewer.user.id, periodId: f.period.id,
    firstExportId: firstPack.exportId, firstDocumentDigest: firstPack.documentDigest, firstContentHash: firstPack.contentHash, firstPackPath: path.join(privateDirectory, "pack-" + firstPack.exportId + ".json"),
    finalExportId: finalPack.exportId, finalDocumentDigest: finalPack.documentDigest, finalContentHash: finalPack.contentHash, finalPackPath: path.join(privateDirectory, "pack-" + finalPack.exportId + ".json") }, null, 2) + "\n", { flag: "wx" })
  terminalStatesEarned = true
  checks.push({ name: "actual-recertification-and-reseal", schedules, ...proof, correctionJournalId, periodControlVersion: 3, retainedPeriodEventIds: events.map(row => row.id), originalDocumentDigest: firstPack.documentDigest, originalExactBytesUnchanged: true, statutoryReadiness: "STATUTORY_BLOCKED" })
}, 90000)
