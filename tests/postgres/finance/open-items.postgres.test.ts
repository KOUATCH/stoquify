import { randomUUID } from "node:crypto"
import { PrismaClient } from "@prisma/client"

// Bind the production reader to a real client on the separately validated target.
// The query extension only provides a deterministic concurrency barrier; it returns real SQL results.
jest.mock("@/prisma/db", () => {
  if (process.env.RUN_OPEN_ITEMS_POSTGRES !== "1") return { db: {} }
  const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
  const { PrismaClient: Client } = jest.requireActual("@prisma/client")
  const client = new Client({ datasources: { db: { url: resolveWorkflowTestTarget(process.env.UI_WORKFLOW_POSTGRES_DATABASE).toString() } } })
  return { db: client.$extends({ query: { supplierInvoice: { async findMany({ args, query }: any) {
    const barrier = (globalThis as any).__openItemsReadBarrier
    if (barrier) { (globalThis as any).__openItemsReadBarrier = undefined; await barrier() }
    return query(args)
  } } } }) }
})
import { db } from "@/prisma/db"
import { getOpenItemsDashboard } from "@/services/finance/open-items-dashboard.service"

const suite = process.env.RUN_OPEN_ITEMS_POSTGRES === "1" ? describe : describe.skip
const orgId = `ap-audit-${randomUUID()}`
const otherOrgId = `ap-audit-${randomUUID()}`
const supplierId = `${orgId}-supplier`
const invoiceId = `${orgId}-verified`
const date = new Date("2026-01-01T00:00:00Z")
let observer: PrismaClient

suite("AP dashboard real PostgreSQL reads", () => {
  beforeAll(async () => {
    const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
    const name = process.env.UI_WORKFLOW_POSTGRES_DATABASE
    if (name !== "stoquify_local_ui_workflow_hris_20261007") throw new Error("Unreviewed disposable target")
    const url = resolveWorkflowTestTarget(name).toString()
    observer = new PrismaClient({ datasources: { db: { url } } })
    const identity = await observer.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
    expect(identity[0].name).toBe(name)
    await observer.$transaction(async tx => {
      for (const id of [orgId, otherOrgId]) await tx.organization.create({ data: { id, name: "Synthetic AP audit", slug: id, currency: "XAF", timezone: "Africa/Douala" } })
      await tx.supplier.create({ data: { id: supplierId, organizationId: orgId, name: "Synthetic supplier" } })
      await tx.supplierInvoice.create({ data: { id: invoiceId, organizationId: orgId, supplierId, invoiceNumber: "AP-VERIFIED", duplicateFingerprint: invoiceId, invoiceDate: date, dueDate: date, status: "POSTED", total: "10.10", currency: "XAF" } })
      await tx.supplierLedgerEntry.create({ data: { organizationId: orgId, supplierId, referenceType: "SUPPLIER_INVOICE", referenceId: invoiceId, type: "PURCHASE", entryDate: date, debit: "10.10", credit: "0", balanceAfter: "10.10", description: "Synthetic audit evidence" } })
      await tx.supplierInvoice.create({ data: { organizationId: orgId, supplierId, invoiceNumber: "AP-UNKNOWN", duplicateFingerprint: `${orgId}-unknown`, invoiceDate: date, status: "POSTED", total: "99.99", currency: "EUR" } })
    })
  })

  afterAll(async () => {
    ;(globalThis as any).__openItemsReadBarrier = undefined
    if (observer) {
      try {
        await observer.$transaction(async tx => {
          await tx.supplierLedgerEntry.deleteMany({ where: { organizationId: orgId } })
          await tx.supplierInvoice.deleteMany({ where: { organizationId: orgId } })
          await tx.supplier.deleteMany({ where: { organizationId: orgId } })
          await tx.organization.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } })
        })
        expect(await observer.organization.count({ where: { id: { in: [orgId, otherOrgId] } } })).toBe(0)
      } finally { await observer.$disconnect(); await db.$disconnect() }
    }
  })

  it("keeps unverified currency separate and preserves totals under search", async () => {
    const report = await getOpenItemsDashboard({ view: "payables" }, orgId)
    expect(report.currencies.find(row => row.currency === "XAF")).toMatchObject({ outstanding: "10.10", overdue: "10.10", unverifiedCount: 0 })
    expect(report.currencies.find(row => row.currency === "EUR")).toMatchObject({ outstanding: null, unverifiedCount: 1 })
    expect(report.records.total).toBe(2)
    const searched = await getOpenItemsDashboard({ view: "payables", search: "AP-VERIFIED" }, orgId)
    expect(searched.records.rows.map(row => row.id)).toEqual([invoiceId])
    expect(searched.currencies).toEqual(report.currencies)
  })

  it("isolates organizations and rejects foreign location scope", async () => {
    const report = await getOpenItemsDashboard({ view: "payables" }, otherOrgId)
    expect(report.records.total).toBe(0)
    expect(report.coverage).toBe("no-documents")
    await expect(getOpenItemsDashboard({ view: "payables", locationId: "foreign-location" }, orgId)).rejects.toThrow(/location/i)
  })

  it("retains one snapshot across a concurrent commit and rejects the old revision next time", async () => {
    const initial = await getOpenItemsDashboard({ view: "payables", currency: "XAF" }, orgId)
    const changedDate = new Date("2026-02-01T00:00:00Z")
    let committed = false
    ;(globalThis as any).__openItemsReadBarrier = async () => {
      await observer.supplierInvoice.update({ where: { id: invoiceId }, data: { dueDate: changedDate } })
      committed = true
    }
    const during = await getOpenItemsDashboard({ view: "payables", currency: "XAF" }, orgId)
    expect(committed).toBe(true)
    expect(during.records.rows[0].dueDate).toBe(date.toISOString())
    expect(during.revision).toBe(initial.revision)
    const after = await getOpenItemsDashboard({ view: "payables", currency: "XAF" }, orgId)
    expect(after.records.rows[0].dueDate).toBe(changedDate.toISOString())
    await expect(getOpenItemsDashboard({ view: "payables", currency: "XAF", page: 2, revision: initial.revision }, orgId)).rejects.toThrow(/changed/i)
  })

  it("does not expose an aborted invoice update", async () => {
    const before = await getOpenItemsDashboard({ view: "payables", currency: "XAF" }, orgId)
    await expect(observer.$transaction(async tx => {
      await tx.supplierInvoice.update({ where: { id: invoiceId }, data: { total: "200.00" } })
      throw new Error("synthetic rollback")
    })).rejects.toThrow("synthetic rollback")
    const after = await getOpenItemsDashboard({ view: "payables", currency: "XAF" }, orgId)
    expect(after.revision).toBe(before.revision)
    expect(after.currencies).toEqual(before.currencies)
  })
})
