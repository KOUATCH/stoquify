jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  const path = require("node:path"), { PrismaClient } = require("@prisma/client")
  const target = process.env.P03_POSTGRES_URL, cluster = process.env.P03_CLUSTER_DIR
  if (process.env.NODE_ENV === "production" || !target || !cluster || !path.isAbsolute(cluster)) throw Error("Explicit disposable P03 target required")
  const url = new URL(target)
  if (url.hostname !== "127.0.0.1" || !url.port || !/^\/stoquify_local_p03_replay_[a-z0-9_]+$/.test(url.pathname)) throw Error("Wrong P03 database target")
  const client = new PrismaClient({ datasources: { db: { url: target } }, transactionOptions: { maxWait: 30000, timeout: 60000 } })
  const transaction = client.$transaction.bind(client), nativeFault = { beforeCommit: false }
  client.$transaction = (work: (tx: unknown) => Promise<unknown>) => transaction(async (tx: unknown) => {
    const result = await work(tx)
    if (nativeFault.beforeCommit) throw Error("Injected failure before real transaction commit")
    return result
  })
  return { db: client, nativeFault }
})

import { db } from "@/prisma/db"
import { inviteOrGrantAccountantAccess } from "../accountant-client-invite.service"

const fault = jest.requireMock("@/prisma/db").nativeFault as { beforeCommit: boolean }
let sequence = 0
beforeAll(async () => {
  const fs = require("node:fs")
  const actual = await db.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory")
  if (fs.realpathSync(actual[0].data_directory).toLowerCase() !== fs.realpathSync(process.env.P03_CLUSTER_DIR!).toLowerCase()) throw Error("Wrong owned cluster")
})
afterAll(async () => { await db.$disconnect() })

async function seed() {
  const id = "p03-replay-" + ++sequence, client = id + "-client", firm = id + "-firm", owner = id + "-owner", recipient = id + "-recipient"
  await db.organization.createMany({ data: [client, firm].map(id => ({ id, name: id, slug: id, requestedModules: ["accounting"] })) })
  await db.user.createMany({ data: [
    { id: owner, name: owner, email: owner + "@example.invalid", organizationId: client, emailVerified: true },
    { id: recipient, name: recipient, email: recipient + "@example.invalid", organizationId: firm, emailVerified: true },
  ] })
  const input = { accountantEmail: recipient + "@example.invalid", accountantFirmName: "Synthetic firm", role: "REVIEWER" as const,
    consentEvidenceHash: "sha256:" + "a".repeat(64), effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01"), idempotencyKey: id + "-command" }
  return { client, firm, owner, recipient, input }
}
async function counts(organizationId: string) {
  return {
    grants: await db.accountantAccessGrant.count({ where: { organizationId } }),
    receipts: await db.businessEvent.count({ where: { organizationId, eventType: "ACCOUNTANT_ACCESS_GRANT_COMMAND_APPLIED" } }),
    grantEvents: await db.businessEvent.count({ where: { organizationId, eventType: "ACCOUNTANT_ACCESS_GRANTED" } }),
    notifications: await db.businessEventOutbox.count({ where: { organizationId, eventName: "ACCOUNTANT_ACCESS_GRANTED" } }),
  }
}
const exactlyOnce = { grants: 1, receipts: 1, grantEvents: 1, notifications: 1 }

it("recovers one committed grant with identical consent and no extra notification", async () => {
  const f = await seed(), first = await inviteOrGrantAccountantAccess(f.client, f.owner, f.input)
  const before = await db.accountantAccessGrant.findUniqueOrThrow({ where: { id: first.grant!.id } })
  expect(await inviteOrGrantAccountantAccess(f.client, f.owner, f.input)).toEqual(first)
  expect(await db.accountantAccessGrant.findUniqueOrThrow({ where: { id: first.grant!.id } })).toEqual(before)
  expect(await counts(f.client)).toEqual(exactlyOnce)
})

it("serializes concurrent identical commands to one durable result", async () => {
  const f = await seed()
  const results = await Promise.all(Array.from({ length: 4 }, () => inviteOrGrantAccountantAccess(f.client, f.owner, f.input)))
  expect(new Set(results.map(r => r.grant!.id)).size).toBe(1)
  expect(await counts(f.client)).toEqual(exactlyOnce)
})

it("allows only one of concurrent distinct keys for the same active scope", async () => {
  const f = await seed()
  const results = await Promise.allSettled([f.input, { ...f.input, idempotencyKey: f.input.idempotencyKey + "-other" }].map(input => inviteOrGrantAccountantAccess(f.client, f.owner, input)))
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1)
  expect(results.filter(r => r.status === "rejected")).toHaveLength(1)
  expect(await counts(f.client)).toEqual(exactlyOnce)
})

it("rejects changed actor and normalized consent intent without additional writes", async () => {
  const f = await seed()
  await inviteOrGrantAccountantAccess(f.client, f.owner, f.input)
  await expect(inviteOrGrantAccountantAccess(f.client, f.recipient, f.input)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  for (const change of [
    { role: "PREPARER" as const }, { accountantFirmName: "Changed firm" }, { accountantFirmRegistrationNumber: "REG-CHANGED" },
    { consentEvidenceHash: "sha256:" + "b".repeat(64) }, { effectiveFrom: new Date("2021-01-01") }, { expiresAt: new Date("2098-01-01") },
  ]) await expect(inviteOrGrantAccountantAccess(f.client, f.owner, { ...f.input, ...change })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  expect(await counts(f.client)).toEqual(exactlyOnce)
})

it("never returns another tenant's receipt for the same key", async () => {
  const f = await seed(), other = await seed()
  const first = await inviteOrGrantAccountantAccess(f.client, f.owner, f.input)
  const second = await inviteOrGrantAccountantAccess(other.client, other.owner, { ...f.input })
  expect(second.grant!.organizationId).toBe(other.client)
  expect(second.grant!.id).not.toBe(first.grant!.id)
  expect(await counts(f.client)).toEqual(exactlyOnce)
  expect(await counts(other.client)).toEqual(exactlyOnce)
})

it.each(["RECORDED", "wrong-type", "wrong-hash"])("fails closed for a damaged real receipt: %s", async mode => {
  const f = await seed()
  await inviteOrGrantAccountantAccess(f.client, f.owner, f.input)
  const receipt = await db.businessEvent.findFirstOrThrow({ where: { organizationId: f.client, eventType: "ACCOUNTANT_ACCESS_GRANT_COMMAND_APPLIED" } })
  await db.businessEvent.update({ where: { id: receipt.id }, data: mode === "RECORDED" ? { status: "RECORDED" } : mode === "wrong-type" ? { eventType: "UNRELATED" } : { payloadHash: "tampered" } })
  await expect(inviteOrGrantAccountantAccess(f.client, f.owner, f.input)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  expect(await db.accountantAccessGrant.count({ where: { organizationId: f.client } })).toBe(1)
})

it.each(["revoked", "expired", "changed-consent"])("does not renew or alter a %s grant", async mode => {
  const f = await seed(), first = await inviteOrGrantAccountantAccess(f.client, f.owner, f.input)
  await db.accountantAccessGrant.update({ where: { id: first.grant!.id }, data: mode === "revoked" ? { status: "REVOKED", revokedAt: new Date(), revokedById: f.owner, activeScopeKey: null } : mode === "expired" ? { expiresAt: new Date("2020-01-01") } : { consentEvidenceHash: "sha256:" + "b".repeat(64) } })
  const before = await db.accountantAccessGrant.findUniqueOrThrow({ where: { id: first.grant!.id } })
  await expect(inviteOrGrantAccountantAccess(f.client, f.owner, f.input)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(await db.accountantAccessGrant.findUniqueOrThrow({ where: { id: first.grant!.id } })).toEqual(before)
  expect(await counts(f.client)).toEqual(exactlyOnce)
})

it("rolls back grant, receipt and notification together before a successful retry", async () => {
  const f = await seed()
  fault.beforeCommit = true
  try { await expect(inviteOrGrantAccountantAccess(f.client, f.owner, f.input)).rejects.toMatchObject({ code: "INTERNAL_ERROR" }) }
  finally { fault.beforeCommit = false }
  expect(await counts(f.client)).toEqual({ grants: 0, receipts: 0, grantEvents: 0, notifications: 0 })
  await inviteOrGrantAccountantAccess(f.client, f.owner, f.input)
  expect(await counts(f.client)).toEqual(exactlyOnce)
})

it("retains keyless conflict behavior and recovers a scheduled keyed grant", async () => {
  const f = await seed(), legacy = { ...f.input, idempotencyKey: undefined }
  await inviteOrGrantAccountantAccess(f.client, f.owner, legacy)
  await expect(inviteOrGrantAccountantAccess(f.client, f.owner, legacy)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(await counts(f.client)).toEqual({ ...exactlyOnce, receipts: 0 })
  const other = await seed(), scheduled = { ...other.input, effectiveFrom: new Date("2030-01-01") }
  const first = await inviteOrGrantAccountantAccess(other.client, other.owner, scheduled)
  expect(first.grant!.status).toBe("SCHEDULED")
  expect(await inviteOrGrantAccountantAccess(other.client, other.owner, scheduled)).toEqual(first)
})
