jest.mock("server-only", () => ({}))
// Only avoid importing the HTTP authentication runtime for this constant.
// AF10 authority, sessions, roles, mandates and all financial writers use real DB rows.
jest.mock("@/lib/security/auth-session", () => ({ SESSION_ASSURANCE_LEVEL: { PASSWORD: 1 } }))
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require("@prisma/client"), target = process.env.AF10_POSTGRES_URL
  if (process.env.NODE_ENV === "production" || !target || !process.env.AF10_CLUSTER_DIR) throw Error("Explicit synthetic AF10 target required")
  const url = new URL(target)
  if (url.hostname !== "127.0.0.1" || url.port !== "55449" || url.pathname !== "/stoquify_local_af10_20261020_r1") throw Error("Wrong AF10 database")
  return { db: new PrismaClient({ datasources: { db: { url: target } } }) }
})
import { realpathSync, writeFileSync } from "node:fs"
import { Prisma } from "@prisma/client"
import { approveOpeningCutover, applyOpeningCutover, cancelOpeningCutover, getOpeningCutoverWorkspace } from "../opening-cutover.service"
import { lockPeriodControlInTx, reopenAccountingPeriod } from "@/services/accounting/period-control.service"
import { collectCustomerSettlementWithControls } from "@/services/accounting/customer-settlement.service"
import { reverseCustomerSettlementWithControls } from "@/services/accounting/customer-settlement-reversal.service"
import { readSupplierPaymentBalances } from "@/services/purchasing/supplier-payment-balance"
import { db } from "@/prisma/db"
import { getOpeningPositionWorkspace, stageOpeningPosition, reviewOpeningPosition } from "../opening-position.service"
import { executeFirmEngagementCommand } from "@/services/accounting/firm-engagement.service"
import type { WorkpaperActor } from "@/services/accounting/review-workpaper.service"
import type { OpeningMappings } from "../opening-position.contract"
import source from "./fixtures/af09-source.json"
import controls from "./fixtures/af09-controls.json"
const prefix = `af10-${Date.now()}`, out = "docs/accounting-firms/roadmap-2026-10-19/execution/AF10/2026-10-20-run-01"
const permissions = ["accounting.audit.read", "accounting.close.read", "accounting.close.accountant.invite",
  "accounting.close.accountant.review", "accounting.close.finding.comment", "accounting.exports.create", "accounting.journal.post", "inventory.stock.adjust", "inventory.adjust.approve", "purchasing.ap.invoice.post", "customers.update", "customers.payments.collect", "customers.payments.reverse"]
beforeAll(async () => {
  const actual = (await db.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory"))[0].data_directory
  if (realpathSync(actual).toLowerCase() !== realpathSync(process.env.AF10_CLUSTER_DIR!).toLowerCase()) throw Error("Wrong owned cluster")
})
afterAll(async () => db.$disconnect())
async function fixture(name: string) {
  const client = `${prefix}-${name}-client`, firm = `${prefix}-${name}-firm`
  for (const id of [client, firm]) await db.organization.create({ data: { id, slug: id, name: "Synthetic " + name, currency: "XAF", countryCode: "CM", requestedModules: ["accounting", "close_assurance", "inventory", "purchasing", "sales"] } })
  const actors: Record<string, WorkpaperActor> = {}
  for (const who of ["preparer", "reviewer", "owner"]) {
    const home = who === "owner" ? client : firm, id = `${prefix}-${name}-${who}`
    await db.role.create({ data: { id: id + "-role", organizationId: home, code: who, nameEn: who, permissions } })
    await db.user.create({ data: { id, organizationId: home, email: id + "@example.invalid", name: who, emailVerified: true, roles: { connect: { id: id + "-role" } } } })
    const session = await db.session.create({ data: { userId: id, token: id + "-private-token", expiresAt: new Date("2099-01-01"),
      assuranceVerifiedAt: new Date(), assuranceMethod: "password", assuranceOrganizationId: home, assuranceLevel: 1 } })
    actors[who] = { homeOrganizationId: home, actorId: id, actorPermissions: permissions, session: { id: session.id, token: session.token }, lastAuthAt: new Date() }
  }
  for (const who of ["preparer", "reviewer"]) await db.accountantAccessGrant.create({ data: {
    id: actors[who].actorId + "-grant", organizationId: client, accountantUserId: actors[who].actorId, accountantFirmName: "Synthetic",
    role: "REVIEWER", activeScopeKey: `${client}:${actors[who].actorId}`, consentGrantedById: actors.owner.actorId,
    consentEvidenceHash: "sha256:" + "a".repeat(64), effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") } })
  const command = (input: Record<string, unknown>) => executeFirmEngagementCommand(actors.preparer, { ...input, idempotencyKey: `${name}-${Math.random()}` })
  const engagement = await command({ command: "CREATE", clientOrganizationId: client, ownerUserId: actors.preparer.actorId, scope: "REVIEWER", effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") })
  for (const who of ["preparer", "reviewer"]) {
    await command({ command: "ASSIGN", engagementId: engagement.engagementId, expectedVersion: 0, accountantUserId: actors[who].actorId,
      expectedAssignmentVersion: 0, scope: "REVIEWER", effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") })
    await command({ command: "ENROLL", engagementId: engagement.engagementId, expectedVersion: 0, grantId: actors[who].actorId + "-grant" })
  }
  await command({ command: "TRANSITION", engagementId: engagement.engagementId, expectedVersion: 0, status: "ACTIVE", reason: "Synthetic AF10 activation" })
  const mappings: OpeningMappings = { accounts: [], customers: [], suppliers: [], items: [], locations: [] }
  for (const [code, kind] of [["311", "STOCK"], ["411", "AR"], ["401", "AP"], ["571", "CASH"], ["101", "EQUITY"]]) {
    const account = await db.chartOfAccount.create({ data: { organizationId: client, code, nameEn: kind, currency: "XAF",
      type: kind === "AP" ? "LIABILITY" : kind === "EQUITY" ? "EQUITY" : "ASSET", normalBalance: ["AP", "EQUITY"].includes(kind) ? "CREDIT" : "DEBIT" } })
    mappings.accounts.push({ source: kind, targetId: account.id })
  }
  const customer = await db.customer.create({ data: { organizationId: client, name: "Synthetic customer", currentBalance: "0.00" } })
  const supplier = await db.supplier.create({ data: { organizationId: client, name: "Synthetic supplier", currentBalance: "0.00" } })
  const unit = await db.unit.create({ data: { organizationId: client, symbol: "kg", nameEn: "kilogram" } })
  const item = await db.item.create({ data: { organizationId: client, sku: "FLOUR", slug: client + "-flour", nameEn: "Synthetic flour", imageUrls: [], unitId: unit.id } })
  const location = await db.location.create({ data: { organizationId: client, code: "MAIN", name: "Synthetic warehouse" } })
  mappings.customers.push({ source: "CUSTOMER-1", targetId: customer.id }); mappings.suppliers.push({ source: "SUPPLIER-1", targetId: supplier.id })
  mappings.items.push({ source: "FLOUR", targetId: item.id }); mappings.locations.push({ source: "MAIN", targetId: location.id })
  const fiscalYear = await db.fiscalYear.create({ data: { organizationId: client, name: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31T23:59:59Z") } })
  const period = await db.accountingPeriod.create({ data: { organizationId: client, name: "Opening October", startDate: new Date("2026-09-30T23:00:00Z"), endDate: new Date("2026-10-31T22:59:59Z"), status: "OPEN", fiscalYearId: fiscalYear.id, periodNumber: 10 } })
  await db.journal.create({ data: { organizationId: client, code: "AN", nameEn: "Opening", type: "OPENING" } })
  const scope = { clientOrganizationId: client }
  const stage = { ...scope, sourceFilename: "source.json", sourceContent: JSON.stringify(source), controlsFilename: "controls.json",
    controlsContent: JSON.stringify(controls), mappings, expectedRevision: 0, idempotencyKey: "synthetic-stage" }
  return { client, firm, actors, scope, stage, mappings, customer, supplier, item, location, period, engagementId: engagement.engagementId }
}
async function financialState(client: string) {
  return {
    journals: await db.journalEntry.count({ where: { organizationId: client } }),
    stock: await db.inventoryTransaction.count({ where: { organizationId: client } }),
    levels: await db.inventoryLevel.count({ where: { item: { organizationId: client }, location: { organizationId: client } } }),
    ar: await db.customerLedgerEntry.count({ where: { organizationId: client } }),
    ap: await db.supplierLedgerEntry.count({ where: { organizationId: client } }),
    masterBatches: await db.onboardingImportBatch.count({ where: { organizationId: client } }),
    customer: (await db.customer.findFirstOrThrow({ where: { organizationId: client } })).currentBalance.toString(),
    supplier: (await db.supplier.findFirstOrThrow({ where: { organizationId: client } })).currentBalance.toString(),
  }
}
async function staged(f: Awaited<ReturnType<typeof fixture>>) {
  const receipt = await stageOpeningPosition(f.actors.preparer, f.stage)
  const workspace = await getOpeningPositionWorkspace(f.actors.reviewer, f.scope)
  return { receipt, workspace, review: { ...f.scope, revisionId: receipt.id, expectedDigest: workspace.current!.preview.digest,
    decision: "REVIEWED", conclusion: "Synthetic independent tie-out reviewed; no financial apply authorized.", idempotencyKey: "synthetic-review" } }
}
async function approved(f: Awaited<ReturnType<typeof fixture>>) {
  const s = await staged(f)
  await reviewOpeningPosition(f.actors.reviewer, s.review)
  const input = { ...f.scope, revisionId: s.receipt.id, expectedDigest: s.workspace.current!.preview.digest,
    conclusion: "Synthetic client operator approves the independently reviewed opening.", idempotencyKey: "financial-approval" }
  const receipt = await approveOpeningCutover(f.actors.owner, input)
  return { ...s, approval: receipt, approvalInput: input, apply: { ...f.scope, executionId: receipt.id, confirmFinancialApply: true, idempotencyKey: "financial-apply" } }
}
async function counts(client: string) {
  return { ...await financialState(client),
    operations: await db.financialOpeningOperation.count({ where: { organizationId: client } }),
    receivables: await db.customerReceivableDocument.count({ where: { organizationId: client } }),
    payables: await db.supplierInvoice.count({ where: { organizationId: client } }),
    active: await db.financialOpeningExecution.count({ where: { organizationId: client, status: "ACTIVE" } }),
    batches: await db.ledgerPostingBatch.count({ where: { organizationId: client } }),
    events: await db.businessEvent.count({ where: { organizationId: client, eventType: { in: ["financial.opening.activated", "stock.opening_balance.posted", "customer.opening_receivable.posted", "supplier.opening_payable.posted"] } } }),
  }
}
async function closeFixturePeriod(f: Awaited<ReturnType<typeof fixture>>) {
  await db.$transaction(async tx => {
    await lockPeriodControlInTx(tx, f.client, f.period.id)
    const at = new Date()
    const event = await tx.periodControlEvent.create({ data: { organizationId: f.client, periodId: f.period.id, version: 1,
      operation: "CLOSE", fromStatus: "OPEN", toStatus: "CLOSED", actorId: f.actors.owner.actorId, reason: "Synthetic period-race fixture only",
      idempotencyKey: "synthetic-close", sourceRevision: "0", approval: { syntheticFixture: true }, createdAt: at } })
    await tx.accountingPeriod.update({ where: { id: f.period.id }, data: { status: "CLOSED", controlVersion: 1,
      lastControlEventId: event.id, closedAt: at, lockedAt: at, closedById: f.actors.owner.actorId } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
}
it("posts one balanced journal and source-bound stock/AR/AP; concurrent exact replay cannot duplicate effects", async () => {
  const f = await fixture("apply"), s = await approved(f)
  expect(await approveOpeningCutover(f.actors.owner, s.approvalInput)).toMatchObject({ id: s.approval.id, replayed: true })
  const started = Date.now()
  const results = await Promise.all([1, 2].map(() => applyOpeningCutover(f.actors.owner, s.apply)))
  expect(results.map(result => result.replayed).sort()).toEqual([false, true])
  expect(await counts(f.client)).toMatchObject({ journals: 1, stock: 1, ar: 1, ap: 1, operations: 4, receivables: 1, payables: 1, active: 1, batches: 1, events: 4, customer: "100", supplier: "50" })
  const workspace = await getOpeningCutoverWorkspace(f.actors.reviewer, f.scope)
  expect(workspace.clientOperator).toBe(false)
  expect(workspace.executions[0].reconciliation).toMatchObject({ reconciled: true, debit: "150.00", credit: "150.00" })
  const before = await counts(f.client)
  await expect(applyOpeningCutover(f.actors.owner, { ...s.apply, idempotencyKey: "changed-command-key" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  await expect(cancelOpeningCutover(f.actors.owner, { ...f.scope, executionId: s.approval.id, reason: "Cannot erase applied history" })).rejects.toMatchObject({ code: "CONFLICT" })
  await expect(db.financialOpeningExecution.update({ where: { id: s.approval.id }, data: { reconciliation: {} } })).rejects.toThrow("immutable")
  const op = await db.financialOpeningOperation.findFirstOrThrow({ where: { executionId: s.approval.id } })
  await expect(db.financialOpeningOperation.update({ where: { id: op.id }, data: { receipt: {} } })).rejects.toThrow("immutable")
  await expect(db.financialOpeningOperation.delete({ where: { id: op.id } })).rejects.toThrow("retained")
  expect(await counts(f.client)).toEqual(before)
  writeFileSync(`${out}/reconciliation-manifest.json`, JSON.stringify(workspace.executions[0], null, 2))
  writeFileSync(`${out}/atomic-replay.json`, JSON.stringify({ concurrentMilliseconds: Date.now() - started, result: await counts(f.client), replayed: results.map(row => row.replayed) }, null, 2))
})

for (const boundary of ["BEFORE_LEDGER", "AFTER_LEDGER", "BEFORE_AR", "AFTER_AR", "BEFORE_AP", "AFTER_AP", "BEFORE_STOCK", "AFTER_STOCK", "ACTIVATED"]) {
  it(`rolls back every financial effect at ${boundary}; exact retry completes the retained approval`, async () => {
    const f = await fixture(`fail-${boundary}`), s = await approved(f), before = await counts(f.client)
    const action = boundary === "ACTIVATED" ? "OPENING_CUTOVER_ACTIVATED" : `OPENING_APPLY_${boundary}`
    await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION af10_fail_apply() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = '${action}' AND NEW."organizationId" = '${f.client}' THEN RAISE EXCEPTION 'AF10 synthetic boundary failure'; END IF; RETURN NEW; END $$`)
    await db.$executeRawUnsafe("CREATE TRIGGER af10_fail_apply BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION af10_fail_apply()")
    try { await expect(applyOpeningCutover(f.actors.owner, s.apply)).rejects.toThrow() }
    finally { await db.$executeRawUnsafe("DROP TRIGGER af10_fail_apply ON audit_logs") }
    expect(await counts(f.client)).toEqual(before)
    expect((await getOpeningCutoverWorkspace(f.actors.owner, f.scope)).executions[0].status).toBe("APPROVED")
    expect(await applyOpeningCutover(f.actors.owner, s.apply)).toMatchObject({ status: "ACTIVE", replayed: false })
    expect(await counts(f.client)).toMatchObject({ active: 1, journals: 1, operations: 4 })
  })
}
it("rejects actual persisted stock detail corruption instead of activating on successful row counts", async () => {
  const f = await fixture("tieout"), s = await approved(f), before = await counts(f.client)
  await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION af10_corrupt_stock() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'OPENING_APPLY_AFTER_STOCK' AND NEW."organizationId" = '${f.client}' THEN UPDATE inventory_levels SET "totalValue" = "totalValue" + 1 WHERE "itemId" = '${f.item.id}'; END IF; RETURN NEW; END $$`)
  await db.$executeRawUnsafe("CREATE TRIGGER af10_corrupt_stock BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION af10_corrupt_stock()")
  try { await expect(applyOpeningCutover(f.actors.owner, s.apply)).rejects.toMatchObject({ code: "CONFLICT" }) }
  finally { await db.$executeRawUnsafe("DROP TRIGGER af10_corrupt_stock ON audit_logs") }
  expect(await counts(f.client)).toEqual(before)
  expect(await applyOpeningCutover(f.actors.owner, s.apply)).toMatchObject({ status: "ACTIVE" })
})
it("rejects stale source, changed period version, financial activity and changed mapped master", async () => {
  for (const change of ["source", "period", "balance", "master"]) {
    const f = await fixture(`stale-${change}`), s = await approved(f)
    if (change === "source") await stageOpeningPosition(f.actors.preparer, { ...f.stage, expectedRevision: 1,
      sourceContent: JSON.stringify({ ...source, evidenceReference: "synthetic:new-source" }), idempotencyKey: "new-source-revision" })
    if (change === "period") {
      await closeFixturePeriod(f)
      await reopenAccountingPeriod({ periodId: f.period.id, expectedVersion: 1, reason: "Synthetic reopened period invalidates opening approval", idempotencyKey: "fixture-reopen" },
        { organizationId: f.client, actorId: f.actors.owner.actorId, actorPermissions: ["accounting.period.reopen"], lastAuthAt: new Date() })
    }
    if (change === "balance") await db.customer.update({ where: { id: f.customer.id }, data: { currentBalance: 1 } })
    if (change === "master") await db.chartOfAccount.update({ where: { id: f.mappings.accounts[0].targetId }, data: { nameEn: "Changed meaning" } })
    const before = await counts(f.client)
    await expect(applyOpeningCutover(f.actors.owner, s.apply)).rejects.toThrow()
    expect(await counts(f.client)).toEqual(before)
  }
})
it("requires a current client operator, independent maker, financial permissions and fresh authentication", async () => {
  const f = await fixture("authority"), s = await approved(f)
  await expect(applyOpeningCutover(f.actors.reviewer, s.apply)).rejects.toMatchObject({ code: "FORBIDDEN" })
  await expect(applyOpeningCutover(f.actors.owner, { ...s.apply, clientOrganizationId: f.firm })).rejects.toMatchObject({ code: "FORBIDDEN" })
  await db.role.update({ where: { id: f.actors.owner.actorId + "-role" }, data: { permissions: permissions.filter(p => p !== "inventory.adjust.approve") } })
  await expect(applyOpeningCutover(f.actors.owner, s.apply)).rejects.toMatchObject({ code: "FORBIDDEN" })
  await db.role.update({ where: { id: f.actors.owner.actorId + "-role" }, data: { permissions } })
  await db.session.update({ where: { id: f.actors.owner.session.id }, data: { assuranceVerifiedAt: new Date(Date.now() - 301000) } })
  await expect(applyOpeningCutover(f.actors.owner, s.apply)).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
  await db.session.update({ where: { id: f.actors.owner.session.id }, data: { assuranceVerifiedAt: new Date() } })
  await db.organization.update({ where: { id: f.client }, data: { requestedModules: ["accounting", "close_assurance", "sales"] } })
  await expect(applyOpeningCutover(f.actors.owner, s.apply)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(await counts(f.client)).toMatchObject({ active: 0, journals: 0, operations: 0 })
  const maker = await fixture("maker")
  const stagedByOwner = await stageOpeningPosition(maker.actors.owner, maker.stage)
  const preview = await getOpeningPositionWorkspace(maker.actors.reviewer, maker.scope)
  await reviewOpeningPosition(maker.actors.reviewer, { ...maker.scope, revisionId: stagedByOwner.id, expectedDigest: preview.current!.preview.digest, decision: "REVIEWED", conclusion: "Independent review of owner source", idempotencyKey: "review-owner-source" })
  await expect(approveOpeningCutover(maker.actors.owner, { ...maker.scope, revisionId: stagedByOwner.id, expectedDigest: preview.current!.preview.digest, conclusion: "Attempted self financial approval", idempotencyKey: "self-approval" })).rejects.toMatchObject({ code: "SOD_VIOLATION" })
})
it("cancels unapplied approval, preserves expired evidence and permits a fresh approval without effects", async () => {
  const f = await fixture("cancel"), s = await approved(f)
  const original = await db.financialOpeningExecution.findUniqueOrThrow({ where: { id: s.approval.id } })
  const cancel = { ...f.scope, executionId: original.id, reason: "Synthetic approval cancellation" }
  await cancelOpeningCutover(f.actors.owner, cancel)
  await cancelOpeningCutover(f.actors.owner, cancel)
  await expect(applyOpeningCutover(f.actors.owner, s.apply)).rejects.toMatchObject({ code: "CONFLICT" })
  // An explicitly constructed past approval fixture tests real expiry comparisons;
  // no production clock override or mutation of retained approval evidence.
  const expired = await db.financialOpeningExecution.create({ data: {
    ...original, id: original.id + "-expired", approvalKey: "expired-approval-fixture",
    approvedAt: new Date(Date.now() - 1900000), expiresAt: new Date(Date.now() - 100000),
    reconciliation: Prisma.DbNull,
  } })
  await expect(applyOpeningCutover(f.actors.owner, { ...s.apply, executionId: expired.id })).rejects.toMatchObject({ code: "CONFLICT" })
  await cancelOpeningCutover(f.actors.owner, { ...cancel, executionId: expired.id })
  const next = await approveOpeningCutover(f.actors.owner, { ...s.approvalInput, idempotencyKey: "fresh-approval" })
  expect(await applyOpeningCutover(f.actors.owner, { ...s.apply, executionId: next.id })).toMatchObject({ status: "ACTIVE" })
})
it("serializes competing approvals and retains a staged browser journey", async () => {
  const f = await fixture("approval-race"), s = await staged(f)
  await reviewOpeningPosition(f.actors.reviewer, s.review)
  const input = { ...f.scope, revisionId: s.receipt.id, expectedDigest: s.workspace.current!.preview.digest, conclusion: "Concurrent independent approval" }
  const results = await Promise.allSettled([1, 2].map(n => approveOpeningCutover(f.actors.owner, { ...input, idempotencyKey: `competing-approval-${n}` })))
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1)
  expect(await db.financialOpeningExecution.count({ where: { organizationId: f.client } })).toBe(1)
  const browser = await fixture("browser")
  await staged(browser)
  if (process.env.AF10_KEEP_BROWSER_FIXTURE !== "1") writeFileSync(`${out}/browser-fixture.json`, JSON.stringify({ client: browser.client, firm: browser.firm, mappings: browser.mappings,
    actors: Object.fromEntries(Object.entries(browser.actors).map(([role, actor]) => [role, actor.actorId])) }, null, 2))
})
it("rechecks committed role revocation after an authority lock wait", async () => {
  const f = await fixture("role-race"), s = await approved(f)
  let ready!: () => void, release!: () => void
  const locked = new Promise<void>(resolve => { ready = resolve }), unblock = new Promise<void>(resolve => { release = resolve })
  const revoke = db.$transaction(async tx => {
    await tx.role.update({ where: { id: f.actors.owner.actorId + "-role" }, data: { permissions: [] } })
    ready(); await unblock
  }, { timeout: 15000 })
  await locked
  const apply = applyOpeningCutover(f.actors.owner, s.apply).then(value => ({ value, error: null }), error => ({ value: null, error }))
  try {
    let waiting = false
    for (let n = 0; n < 100 && !waiting; n++) {
      const rows = await db.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%FROM "roles"%') AS waiting`
      waiting = rows[0].waiting
      if (!waiting) await new Promise(resolve => setTimeout(resolve, 20))
    }
    expect(waiting).toBe(true)
  } finally { release() }
  await revoke
  expect((await apply).error).toMatchObject({ code: "FORBIDDEN" })
  expect(await counts(f.client)).toMatchObject({ active: 0, operations: 0, journals: 0 })
})
it("waits behind period control and refuses the newly closed period", async () => {
  const f = await fixture("period-race"), s = await approved(f)
  let ready!: () => void, release!: () => void
  const locked = new Promise<void>(resolve => { ready = resolve }), unblock = new Promise<void>(resolve => { release = resolve })
  const closing = db.$transaction(async tx => {
    await lockPeriodControlInTx(tx, f.client, f.period.id)
    ready(); await unblock
    const at = new Date()
    const event = await tx.periodControlEvent.create({ data: { organizationId: f.client, periodId: f.period.id, version: 1,
      operation: "CLOSE", fromStatus: "OPEN", toStatus: "CLOSED", actorId: f.actors.owner.actorId, reason: "Synthetic concurrent period seal",
      idempotencyKey: "race-close", sourceRevision: "0", approval: { syntheticFixture: true }, createdAt: at } })
    await tx.accountingPeriod.update({ where: { id: f.period.id }, data: { status: "CLOSED", controlVersion: 1,
      lastControlEventId: event.id, closedAt: at, lockedAt: at, closedById: f.actors.owner.actorId } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 })
  await locked
  const apply = applyOpeningCutover(f.actors.owner, s.apply).then(value => ({ value, error: null }), error => ({ value: null, error }))
  try {
    let waiting = false
    for (let n = 0; n < 100 && !waiting; n++) {
      const rows = await db.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%pg_advisory_xact_lock_shared%') AS waiting`
      waiting = rows[0].waiting
      if (!waiting) await new Promise(resolve => setTimeout(resolve, 20))
    }
    expect(waiting).toBe(true)
  } finally { release() }
  await closing
  expect((await apply).error).toBeTruthy()
  expect(await counts(f.client)).toMatchObject({ active: 0, operations: 0, journals: 0 })
})
it("applies the 100-row source limit within the bounded transaction and reconciles every document", async () => {
  const f = await fixture("maximum")
  const large = structuredClone(source)
  const originalAR = large.openItems.find(row => row.kind === "AR")!
  const receivables = Array.from({ length: 93 }, (_, n) => ({ ...originalAR, sourceId: `AR-${n}`, document: `EXTERNAL-${n}` }))
  large.openItems = [...receivables, ...large.openItems.filter(row => row.kind === "AP")]
  const ar = large.ledger.find(row => row.domain === "AR")!
  ar.amount = "9300.00"; ar.covers = receivables.map(row => row.sourceId)
  large.ledger.find(row => row.domain === "EQUITY")!.amount = "9300.00"
  f.stage.sourceContent = JSON.stringify(large)
  f.stage.controlsContent = JSON.stringify({ ...controls, ar: "9300.00", debit: "9350.00", credit: "9350.00" })
  const s = await approved(f), started = Date.now()
  await applyOpeningCutover(f.actors.owner, s.apply)
  const elapsedMilliseconds = Date.now() - started
  expect(elapsedMilliseconds).toBeLessThan(30000)
  expect(await counts(f.client)).toMatchObject({ journals: 1, stock: 1, ar: 93, ap: 1, receivables: 93, payables: 1, active: 1, operations: 96, customer: "9300", supplier: "50" })
  writeFileSync(`${out}/bounded-performance.json`, JSON.stringify({ synthetic: true, sourceRows: 100, elapsedMilliseconds,
    postedReceivables: 93, operations: 96, timeoutMilliseconds: 30000, productionLoadQualified: false }, null, 2))
})
it("allows existing customer settlement and independent reversal on an opening receivable; AP balance reader retains historical paid amount", async () => {
  const f = await fixture("settlement"), s = await approved(f)
  await applyOpeningCutover(f.actors.owner, s.apply)
  const doc = await db.customerReceivableDocument.findFirstOrThrow({ where: { organizationId: f.client } })
  const payable = await db.supplierInvoice.findFirstOrThrow({ where: { organizationId: f.client } })
  const ap = await db.$transaction(tx => readSupplierPaymentBalances(tx, f.client, [payable], "XAF"))
  expect(ap.get(payable.id)?.toFixed(2)).toBe("50.00")
  await db.journal.create({ data: { organizationId: f.client, code: "CA", nameEn: "Cash", type: "CASH", isDefault: true } })
  await db.chartOfAccount.update({ where: { id: f.mappings.accounts.find(row => row.source === "CASH")!.targetId }, data: { mappingKey: "CASH_ON_HAND" } })
  await db.chartOfAccount.update({ where: { id: f.mappings.accounts.find(row => row.source === "AR")!.targetId }, data: { mappingKey: "ACCOUNTS_RECEIVABLE" } })
  await db.postingRule.create({ data: { organizationId: f.client, code: "COLLECT", nameEn: "Synthetic collection", sourceType: "CUSTOMER_SETTLEMENT", postingPurpose: "CUSTOMER_SETTLEMENT",
    lines: { create: [
      { organizationId: f.client, lineNumber: 1, mappingKey: "CASH_ON_HAND", side: "DEBIT", amountSource: "SOURCE_AMOUNT" },
      { organizationId: f.client, lineNumber: 2, mappingKey: "ACCOUNTS_RECEIVABLE", side: "CREDIT", amountSource: "SOURCE_AMOUNT" },
    ] } } })
  const command = { customerId: f.customer.id, method: "CASH" as const, amount: "40.00", settlementDate: "2026-10-20T10:00:00Z",
    idempotencyKey: "opening-customer-collection", correlationId: "opening-collection-correlation",
    documentHash: "a".repeat(64), evidenceHash: "b".repeat(64), allocations: [{ customerReceivableDocumentId: doc.id, amount: "40.00" }] }
  const control = { organizationId: f.client, actorId: f.actors.owner.actorId, actorPermissions: ["finance.receivables.collect"], lastAuthAt: new Date() }
  const payment = await collectCustomerSettlementWithControls(command, control)
  expect(await collectCustomerSettlementWithControls(command, control)).toMatchObject({ replayed: true })
  expect(payment.settlement.allocations[0].salesOrderId).toBeNull()
  expect((await db.customer.findUniqueOrThrow({ where: { id: f.customer.id } })).currentBalance.toFixed(2)).toBe("60.00")
  const checker = await db.user.create({ data: { organizationId: f.client, email: `${f.client}-checker@example.invalid`, name: "Independent financial checker", emailVerified: true } })
  const lastAuthAt = new Date()
  await reverseCustomerSettlementWithControls({ customerSettlementId: payment.settlementId, reversalDate: "2026-10-20T11:00:00Z",
    reason: "Synthetic independent reversal of opening-document payment", idempotencyKey: "opening-payment-reversal",
    correlationId: "opening-reversal-correlation", documentHash: "c".repeat(64), evidenceHash: "d".repeat(64) },
    { organizationId: f.client, actorId: checker.id, actorPermissions: ["finance.receivables.reverse"], freshAuth: { lastAuthAt,
      claims: { userId: checker.id, tenantId: f.client, assuranceOrganizationId: f.client, assuranceLevel: 1, lastAuthAt: lastAuthAt.getTime() } } })
  expect((await db.customer.findUniqueOrThrow({ where: { id: f.customer.id } })).currentBalance.toFixed(2)).toBe("100.00")
  const latest = await db.customerReceivableDocumentState.findFirstOrThrow({ where: { documentId: doc.id }, orderBy: { version: "desc" } })
  expect(latest.paidAmount.toFixed(2)).toBe("20.00"); expect(latest.unpaidAmount.toFixed(2)).toBe("100.00")
  expect(await db.salesOrder.count({ where: { organizationId: f.client } })).toBe(0)
  writeFileSync(`${out}/downstream-compatibility.json`, JSON.stringify({ openingReceivableId: doc.id, collected: "40.00", reversed: "40.00",
    finalPaid: latest.paidAmount.toFixed(2), finalOutstanding: latest.unpaidAmount.toFixed(2), payableOutstanding: ap.get(payable.id)?.toFixed(2), fabricatedSales: 0 }, null, 2))
})
