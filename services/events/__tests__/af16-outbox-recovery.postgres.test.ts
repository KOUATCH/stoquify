jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require("@prisma/client")
  const c = require("@/scripts/af16-verification-context.cjs")
  if (process.env.NODE_ENV === "production" || process.env.AF16_POSTGRES_URL !== c.url("af16worker")) throw Error("Explicit AF16 worker target required")
  return { db: new PrismaClient({ datasources: { db: { url: process.env.AF16_POSTGRES_URL } } }) }
})
import { writeFileSync } from "node:fs"
import { db } from "@/prisma/db"
import { claimBusinessEventOutboxMessages, markBusinessEventOutboxDelivered, runBusinessEventOutboxWorker, getBusinessEventOutboxReadiness } from "../business-event-outbox.service"
const c = require("@/scripts/af16-verification-context.cjs")
beforeAll(async () => {
  const fs = require("node:fs")
  expect(fs.realpathSync((await db.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory"))[0].data_directory).toLowerCase()).toBe(fs.realpathSync(c.cluster).toLowerCase())
})
afterAll(async () => db.$disconnect())
it("bounds concurrent claims, retries a failed delivery, fences stale leases and preserves another client's backlog", async () => {
  const now = new Date(), organizationId = "af16-worker-client", foreign = "af16-worker-foreign"
  await db.organization.createMany({ data: [organizationId, foreign].map(id => ({ id, name: id, slug: id })) })
  const payload = { synthetic: true }, events = Array.from({ length: 106 }, (_, i) => ({
    id: `af16-event-${i}`, organizationId: i === 105 ? foreign : organizationId, eventType: "AF16_SYNTHETIC_DELIVERY",
    idempotencyKey: `event-${i}`, payloadHash: "synthetic", payload, occurredAt: now,
  }))
  await db.businessEvent.createMany({ data: events })
  await db.businessEventOutbox.createMany({ data: events.map((event, i) => ({ id: `af16-outbox-${i}`, organizationId: event.organizationId,
    businessEventId: event.id, channel: "NOTIFICATION", eventName: event.eventType, idempotencyKey: `delivery-${i}`, payloadHash: "synthetic", payload, availableAt: now })) })
  const before = await getBusinessEventOutboxReadiness(organizationId), started = performance.now()
  const [left, right] = await Promise.all(["left", "right"].map(workerId => claimBusinessEventOutboxMessages({ organizationId, workerId, limit: 25, now })))
  expect(left.length).toBeLessThanOrEqual(25); expect(right.length).toBeLessThanOrEqual(25)
  expect(new Set([...left, ...right].map(row => row.id)).size).toBe(left.length + right.length)
  const old = [...left, ...right][0]; expect(old).toBeDefined()
  const reclaimedAt = new Date(now.getTime() + 301000)
  const recovered = await claimBusinessEventOutboxMessages({ organizationId, workerId: "recovery", limit: 100, now: reclaimedAt })
  const replacement = recovered.find(row => row.id === old.id)!; expect(replacement).toBeDefined()
  expect(await markBusinessEventOutboxDelivered({ organizationId, workerId: old.lockedBy!, messageId: old.id, attempts: old.attempts, lockedAt: old.lockedAt!, now: reclaimedAt })).toMatchObject({ status: "LEASE_LOST" })
  // Release successfully claimed receipts through the domain acknowledger, without any external delivery.
  for (const row of recovered) await markBusinessEventOutboxDelivered({ organizationId, workerId: "recovery", messageId: row.id, attempts: row.attempts, lockedAt: row.lockedAt!, now: reclaimedAt })
  let failedOnce = false
  const first = await runBusinessEventOutboxWorker({ organizationId, workerId: "drain", limit: 25, now: reclaimedAt }, async () => { if (!failedOnce) { failedOnce = true; throw Error("Synthetic unavailable handler") } })
  expect(first.filter(row => row.status === "FAILED")).toHaveLength(1)
  const retry = await runBusinessEventOutboxWorker({ organizationId, workerId: "retry", limit: 25, now: new Date(reclaimedAt.getTime() + 60000) }, async () => {})
  expect(retry.filter(row => row.status === "SENT")).toHaveLength(1)
  const after = await getBusinessEventOutboxReadiness(organizationId)
  expect(after).toMatchObject({ pending: 0, locked: 0, failed: 0, deadLetter: 0 })
  expect(await db.businessEventOutbox.count({ where: { organizationId, status: "SENT" } })).toBe(105)
  expect(await getBusinessEventOutboxReadiness(foreign)).toMatchObject({ pending: 1 })
  writeFileSync(c.output + "/worker-recovery.json", JSON.stringify({ synthetic: true, handler: "local no-op with one injected failure; no external delivery", load: 105, foreignLoad: 1, before, after, concurrentClaims: [left.length, right.length], elapsedMs: performance.now() - started, latencyBudget: null, staleAcknowledgement: "LEASE_LOST" }, null, 2))
})
