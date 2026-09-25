/** @jest-environment node */
import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
jest.unmock("@/prisma/db")
import { db } from "@/prisma/db"
import { acquirePOSCheckout, preparePOSCheckout } from "../checkout.service"
import { assertCheckoutLeaseInTx, retireShiftDraftsInTx } from "../checkout-state"
import { getPOSSaleCommitStatus } from "../pos.service"

const schema = "codex_pos_lifecycle_20260920"
const enabled = process.env.RUN_POS_LIFECYCLE_POSTGRES === "1"
const suite = enabled ? describe : describe.skip
let created = false

suite("POS lifecycle PostgreSQL boundaries (disposable schema)", () => {
  jest.setTimeout(60_000)
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL!)
    if (target.hostname !== "localhost" || target.searchParams.get("schema") !== schema) throw new Error("Refusing non-isolated lifecycle test database")
    // CREATE deliberately fails if this schema already exists; never reuse or clear somebody else's fixture.
    await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
    created = true
    for (const table of ["pos_terminals", "pos_sessions", "pos_checkout_workspaces", "sales_orders", "sales_order_lines", "pos_commit_results", "pos_offline_events", "pos_offline_sync_certificates", "audit_logs"]) {
      await db.$executeRawUnsafe(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING DEFAULTS)`)
      await db.$executeRawUnsafe(`ALTER TABLE "${schema}"."${table}" ADD PRIMARY KEY ("${table === "pos_checkout_workspaces" ? "sessionId" : "id"}")`)
    }
    const columns = await db.$queryRaw<{ table_name: string; column_name: string; udt_name: string; column_default: string | null }[]>`SELECT table_name, column_name, udt_name, column_default FROM information_schema.columns WHERE table_schema = ${schema} AND data_type = 'USER-DEFINED'`
    const quote = (name: string) => `"${name.replaceAll('"', '""')}"`
    for (const name of new Set(columns.map(column => column.udt_name))) {
      const labels = await db.$queryRaw<{ enumlabel: string }[]>`SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = ${name} AND n.nspname = 'public' ORDER BY e.enumsortorder`
      await db.$executeRawUnsafe(`CREATE TYPE "${schema}".${quote(name)} AS ENUM (${labels.map(label => `'${label.enumlabel.replaceAll("'", "''")}'`).join(",")})`)
    }
    for (const column of columns) {
      const table = `"${schema}".${quote(column.table_name)}`, name = quote(column.column_name), type = `"${schema}".${quote(column.udt_name)}`
      await db.$executeRawUnsafe(`ALTER TABLE ${table} ALTER COLUMN ${name} DROP DEFAULT, ALTER COLUMN ${name} TYPE ${type} USING (${name}::text::${type})`)
      if (column.column_default) {
        const value = column.column_default.match(/^'([^']*)'::/)?.[1]
        if (!value) throw new Error("Unexpected disposable enum default")
        await db.$executeRawUnsafe(`ALTER TABLE ${table} ALTER COLUMN ${name} SET DEFAULT '${value.replaceAll("'", "''")}'::${type}`)
      }
    }
  })
  afterAll(async () => {
    if (created) await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
    await db.$disconnect()
  })

  async function fixture() {
    const suffix = randomUUID()
    const scope = { organizationId: `org-${suffix}`, userId: `actor-${suffix}`, locationId: `loc-${suffix}`, terminalId: `terminal-${suffix}`, sessionId: `session-${suffix}`, checkoutLeaseId: randomUUID() }
    await db.pOSStation.create({ data: { id: scope.terminalId, organizationId: scope.organizationId, locationId: scope.locationId, terminalNumber: suffix, name: "Disposable lifecycle till", currentSessionId: scope.sessionId } })
    await db.pOSSession.create({ data: { id: scope.sessionId, organizationId: scope.organizationId, userId: scope.userId, locationId: scope.locationId, terminalId: scope.terminalId, sessionNumber: suffix, openingBalance: 0 } })
    const cart = await db.salesOrder.create({ data: { id: `cart-${suffix}`, organizationId: scope.organizationId, createdById: scope.userId, locationId: scope.locationId, terminalId: scope.terminalId, sessionId: scope.sessionId, customerId: `customer-${suffix}`, orderNumber: suffix, status: "DRAFT", total: 100,
      lines: { create: { itemId: `item-${suffix}`, quantity: 1, unitPrice: 100, lineTotal: 100 } },
    } })
    return { scope, cart }
  }

  it("grants one of two concurrent owners and fences the losing tab's writes", async () => {
    const { scope } = await fixture()
    const competitor = { ...scope, checkoutLeaseId: randomUUID() }
    const attempts = await Promise.allSettled([acquirePOSCheckout(scope), acquirePOSCheckout(competitor)])
    expect(attempts.filter(result => result.status === "fulfilled")).toHaveLength(1)
    const loser = attempts[0].status === "fulfilled" ? competitor : scope
    await expect(db.$transaction(tx => assertCheckoutLeaseInTx(tx, loser, loser.checkoutLeaseId))).rejects.toThrow("POS_CHECKOUT_OWNERSHIP_REQUIRED")
  })

  it("preserves a request through shift closure and proves its retired nonempty cart cannot submit later", async () => {
    const { scope, cart } = await fixture()
    await acquirePOSCheckout(scope)
    const request = { ...scope, salesOrderId: cart.id, clientCommitId: `pos:${randomUUID()}`, expectedCartRevision: "a".repeat(64), tenders: [{ method: "CASH", amount: 100 }] }
    await preparePOSCheckout(request)
    await db.$transaction(async tx => {
      await tx.pOSSession.update({ where: { id: scope.sessionId }, data: { status: "CLOSED", endTime: new Date() } })
      await retireShiftDraftsInTx(tx, scope)
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    expect(await db.salesOrderLine.count({ where: { salesOrderId: cart.id } })).toBe(1)
    expect((await db.pOSCheckoutWorkspace.findUniqueOrThrow({ where: { sessionId: scope.sessionId } })).pendingRequest).toMatchObject({ clientCommitId: request.clientCommitId })
    await expect(preparePOSCheckout(request)).rejects.toThrow("POS_CHECKOUT_SHIFT_UNAVAILABLE")
    await expect(getPOSSaleCommitStatus(request)).resolves.toEqual({ kind: "NOT_COMMITTED", reason: "RETIRED_CART_CLOSED_SHIFT" })
  })

  it("rolls back retirement, ownership release and shift status together on a later failure", async () => {
    const { scope, cart } = await fixture()
    await acquirePOSCheckout(scope)
    await expect(db.$transaction(async tx => {
      await tx.pOSSession.update({ where: { id: scope.sessionId }, data: { status: "CLOSED", endTime: new Date() } })
      await retireShiftDraftsInTx(tx, scope)
      throw new Error("injected close failure")
    })).rejects.toThrow("injected close failure")
    expect((await db.salesOrder.findUniqueOrThrow({ where: { id: cart.id } })).posCartState).toBe("ACTIVE")
    expect((await db.pOSSession.findUniqueOrThrow({ where: { id: scope.sessionId } })).status).toBe("ACTIVE")
    expect((await db.pOSCheckoutWorkspace.findUniqueOrThrow({ where: { sessionId: scope.sessionId } })).leaseId).toBe(scope.checkoutLeaseId)
  })

  it("rejects a different tenant or cashier even when cart and session identifiers are known", async () => {
    const { scope } = await fixture()
    await expect(acquirePOSCheckout({ ...scope, organizationId: "other-org" })).rejects.toThrow("POS_CHECKOUT_SHIFT_UNAVAILABLE")
    await expect(acquirePOSCheckout({ ...scope, userId: "other-cashier" })).rejects.toThrow("POS_CHECKOUT_SHIFT_UNAVAILABLE")
    expect(await db.pOSCheckoutWorkspace.count({ where: { sessionId: scope.sessionId } })).toBe(0)
  })

  it("serializes a cart edit racing shift closure and rejects every late edit", async () => {
    const { scope, cart } = await fixture()
    await acquirePOSCheckout(scope)
    const edit = () => db.$transaction(async tx => {
      await assertCheckoutLeaseInTx(tx, scope, scope.checkoutLeaseId)
      const active = await tx.pOSSession.findFirst({ where: { id: scope.sessionId, status: "ACTIVE" } })
      if (!active) throw new Error("closed")
      return tx.salesOrder.updateMany({ where: { id: cart.id, posCartState: "ACTIVE" }, data: { notes: "disposable concurrent edit" } })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    const close = async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          return await db.$transaction(async tx => {
            await tx.pOSSession.update({ where: { id: scope.sessionId }, data: { status: "CLOSED", endTime: new Date() } })
            await retireShiftDraftsInTx(tx, scope)
          }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
        } catch (error) { if ((error as { code?: string }).code !== "P2034" || attempt >= 2) throw error }
      }
    }
    const [, closed] = await Promise.allSettled([edit(), close()])
    expect(closed.status).toBe("fulfilled")
    expect((await db.salesOrder.findUniqueOrThrow({ where: { id: cart.id } })).posCartState).toBe("RETIRED")
    await expect(edit()).rejects.toThrow("POS_CHECKOUT_OWNERSHIP_REQUIRED")
  })
})
