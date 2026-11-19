jest.mock("@/prisma/db", () => {
  const grants: Record<string, unknown>[] = [], events: Record<string, unknown>[] = []
  const db = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    user: { findUnique: jest.fn().mockResolvedValue({ id: "recipient", isActive: true }) },
    accountantAccessGrant: {
      findFirst: jest.fn(async ({ where }) => grants.find(g => g.organizationId === where.organizationId && (!where.id || g.id === where.id)) ?? null),
      create: jest.fn(async ({ data }) => {
        const grant = { id: "grant-1", ...data, revokedAt: null, revokedById: null, revocationReason: null }
        grants.push(grant); return grant
      }),
      update: jest.fn(),
    },
    businessEvent: {
      findUnique: jest.fn(async ({ where }) => {
        const key = where.organizationId_eventSource_idempotencyKey
        return events.find(e => e.organizationId === key.organizationId && e.eventSource === key.eventSource && e.idempotencyKey === key.idempotencyKey) ?? null
      }),
      create: jest.fn(async ({ data }) => {
        const event = { id: "event-" + events.length, status: "RECEIVED", ...data, outboxMessages: data.outboxMessages.create }
        events.push(event); return event
      }),
      update: jest.fn(async ({ where, data }) => {
        const event = events.find(e => e.id === where.id && e.organizationId === where.organizationId)
        if (!event) throw Error("Missing event")
        Object.assign(event, data); return event
      }),
    },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
    fixture: { grants, events },
  }
  db.$transaction.mockImplementation(callback => callback(db))
  return { db }
})

import { db } from "@/prisma/db"
import { inviteOrGrantAccountantAccess } from "../accountant-client-invite.service"

const fixture = (db as unknown as { fixture: { grants: Record<string, unknown>[]; events: Record<string, unknown>[] } }).fixture
const input = {
  accountantEmail: "recipient@example.invalid", accountantFirmName: "Synthetic firm", role: "REVIEWER" as const,
  consentEvidenceHash: "sha256:" + "a".repeat(64), effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01"),
  idempotencyKey: "same-grant-command",
}
const at = new Date("2026-10-28T12:00:00Z")

beforeEach(() => { jest.clearAllMocks(); fixture.grants.length = 0; fixture.events.length = 0 })

it("recovers the same existing-account command after its first result is lost", async () => {
  const first = await inviteOrGrantAccountantAccess("client", "owner", input, at)
  const before = structuredClone(fixture.grants[0])
  const replay = await inviteOrGrantAccountantAccess("client", "owner", input, new Date(at.getTime() + 1000))
  expect(replay).toEqual(first)
  expect(fixture.grants).toEqual([before])
  expect(fixture.events.filter(e => e.eventType === "ACCOUNTANT_ACCESS_GRANTED")).toHaveLength(1)
  expect(fixture.events.flatMap(e => e.outboxMessages as unknown[])).toHaveLength(1)
})

it("retains the active-scope conflict for a distinct command", async () => {
  await inviteOrGrantAccountantAccess("client", "owner", input, at)
  await expect(inviteOrGrantAccountantAccess("client", "owner", { ...input, idempotencyKey: "another-grant-command" }, at)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(fixture.grants).toHaveLength(1)
})

it.each([
  { accountantEmail: "different@example.invalid" }, { accountantFirmName: "Another firm" },
  { accountantFirmRegistrationNumber: "REG-OTHER" }, { role: "PREPARER" as const },
  { consentEvidenceHash: "sha256:" + "b".repeat(64) },
  { effectiveFrom: new Date("2021-01-01") }, { expiresAt: new Date("2098-01-01") },
])("rejects key reuse with changed intent %j", async change => {
  await inviteOrGrantAccountantAccess("client", "owner", input, at)
  await expect(inviteOrGrantAccountantAccess("client", "owner", { ...input, ...change }, at)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  expect(fixture.grants).toHaveLength(1)
})

it("binds the receipt to its original actor", async () => {
  await inviteOrGrantAccountantAccess("client", "owner", input, at)
  await expect(inviteOrGrantAccountantAccess("client", "other-owner", input, at)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
})

it("keeps omitted effectiveFrom stable across a later retry", async () => {
  const command = { ...input, effectiveFrom: undefined }
  const first = await inviteOrGrantAccountantAccess("client", "owner", command, at)
  await expect(inviteOrGrantAccountantAccess("client", "owner", command, new Date(at.getTime() + 1000))).resolves.toEqual(first)
})

it("preserves keyless legacy conflict behavior", async () => {
  const command = { ...input, idempotencyKey: undefined }
  await inviteOrGrantAccountantAccess("client", "owner", command, at)
  await expect(inviteOrGrantAccountantAccess("client", "owner", command, at)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(fixture.events).toHaveLength(1)
})

it.each([
  { status: "RECORDED" }, { eventType: "UNRELATED" }, { sourceId: "wrong-grant" }, { payloadHash: "tampered" },
])("rejects incomplete or mismatched receipts %j", async change => {
  await inviteOrGrantAccountantAccess("client", "owner", input, at)
  Object.assign(fixture.events.find(e => e.eventType === "ACCOUNTANT_ACCESS_GRANT_COMMAND_APPLIED")!, change)
  await expect(inviteOrGrantAccountantAccess("client", "owner", input, at)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  expect(fixture.grants).toHaveLength(1)
})

it.each([
  { status: "REVOKED", revokedAt: at, revokedById: "owner" },
  { revokedById: "owner" }, { expiresAt: new Date("2025-01-01") },
  { role: "PREPARER" }, { consentEvidenceHash: "sha256:" + "b".repeat(64) },
])("does not recover a changed or unavailable grant %j", async change => {
  await inviteOrGrantAccountantAccess("client", "owner", input, at)
  Object.assign(fixture.grants[0], change)
  const before = structuredClone(fixture.grants[0])
  await expect(inviteOrGrantAccountantAccess("client", "owner", input, at)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(fixture.grants).toEqual([before])
})

it("rejects recovery if expiry passes while waiting for the command lock", async () => {
  const command = { ...input, expiresAt: new Date(at.getTime() + 1000) }
  await inviteOrGrantAccountantAccess("client", "owner", command, at)
  const clock = jest.spyOn(Date, "now").mockReturnValueOnce(at.getTime()).mockReturnValue(at.getTime() + 2000)
  try { await expect(inviteOrGrantAccountantAccess("client", "owner", command, at)).rejects.toMatchObject({ code: "CONFLICT" }) }
  finally { clock.mockRestore() }
  expect(fixture.grants).toHaveLength(1)
})

it("recovers a still-valid scheduled grant without activating it early", async () => {
  const command = { ...input, effectiveFrom: new Date("2030-01-01") }
  const first = await inviteOrGrantAccountantAccess("client", "owner", command, at)
  await expect(inviteOrGrantAccountantAccess("client", "owner", command, at)).resolves.toEqual(first)
  expect(first.grant?.status).toBe("SCHEDULED")
})

it.each(["missing-grant", "missing-receipt", "wrong-tenant-receipt"])("fails closed with %s", async mode => {
  await inviteOrGrantAccountantAccess("client", "owner", input, at)
  if (mode === "missing-grant") fixture.grants.length = 0
  else {
    const index = fixture.events.findIndex(e => e.eventType === "ACCOUNTANT_ACCESS_GRANT_COMMAND_APPLIED")
    if (mode === "missing-receipt") fixture.events.splice(index, 1)
    else fixture.events[index].organizationId = "foreign-client"
  }
  const before = structuredClone(fixture.grants)
  await expect(inviteOrGrantAccountantAccess("client", "owner", input, at)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(fixture.grants).toEqual(before)
})
