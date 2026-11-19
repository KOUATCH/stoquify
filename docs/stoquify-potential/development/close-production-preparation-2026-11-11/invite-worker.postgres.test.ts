// Real isolated PostgreSQL worker/CAS tests. Only the send dependency is simulated.
// Fixtures are synthetic PENDING invitations; no grant, financial posting or send.
import fs from "node:fs"
import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { sealAccountantClientInviteEnvelope } from "@/services/accounting/accountant-client-invite-envelope"
import { claimAccountantClientInvites, processAccountantClientInvite } from "@/services/communication/accountant-client-invite-worker.service"

const environment = {
  AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY: "a7".repeat(32),
  STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: "0",
  STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: "0",
  STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: "0",
}
const checks: unknown[] = []
const unique = (label: string) => `invite-pg-${label}-${randomUUID()}`
const eventName = "accountant.client.invite.requested"
function recorded(name: string, facts: Record<string, unknown> = {}) {
  checks.push({ name, passed: true, ...facts })
  fs.writeFileSync(process.env.INVITE_POSTGRES_EVIDENCE!, JSON.stringify({ realPostgres: true, providerDependencySimulated: true, noProviderCalls: true, syntheticPendingInvitations: true, checks }, null, 2) + "\n")
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
async function fixture(label: string, maxAttempts = 5) {
  const now = new Date(), organizationId = unique("org"), inviteId = unique("invite"), outboxId = unique("outbox")
  const attributionId = unique("attribution"), token = "synthetic_invite_" + randomUUID().replaceAll("-", "")
  const referralCode = "synthetic_" + randomUUID().replaceAll("-", ""), destination = "synthetic-accountant@owned.invalid"
  const expiresAt = new Date(now.getTime() + 86400000), consentEvidenceHash = "sha256:" + hashBusinessPayload(label)
  const sealedEnvelope = sealAccountantClientInviteEnvelope({ destination, inviteUrl: `https://invites.owned.invalid/api/referrals/${referralCode}?invite=${token}`, inviteId, referralCode, issuedAt: now.toISOString() }, environment)!
  const payload = { schemaVersion: "accountant-client-invite.v1", inviteId, organizationId, attributionId, referralCode,
    emailHash: hashBusinessPayload(destination), redactedEmail: "s***@owned.invalid", role: "REVIEWER", locale: "EN", consentEvidenceHash,
    expiresAt: expiresAt.toISOString(), sealedEnvelope, sealedEnvelopeHash: hashBusinessPayload(sealedEnvelope) }
  await db.organization.create({ data: { id: organizationId, name: "Synthetic invitation CAS " + label, slug: organizationId, countryCode: "CM" } })
  const event = await db.businessEvent.create({ data: { organizationId, eventType: "SYNTHETIC_ACCOUNTANT_INVITE_REQUESTED", eventSource: "INTERNAL", idempotencyKey: unique("event-key"), payloadHash: hashBusinessPayload(payload), payload, occurredAt: now } })
  await db.businessEventOutbox.create({ data: { id: outboxId, organizationId, businessEventId: event.id, channel: "EMAIL", eventName,
    idempotencyKey: unique("outbox-key"), payloadHash: hashBusinessPayload(payload), payload, availableAt: new Date(now.getTime() - 1000), maxAttempts, metadata: Prisma.DbNull } })
  await db.referralAttribution.create({ data: { id: attributionId, organizationId, sourceType: "ACCOUNTANT_INVITE", sourceId: inviteId,
    referralCode, campaign: "synthetic-invite-cas", createdById: "synthetic-consent-issuer", evidenceHash: hashBusinessPayload(label + "-attribution") } })
  await db.accountantClientInvite.create({ data: { id: inviteId, organizationId, attributionId, inviteTokenHash: hashBusinessPayload(token),
    emailHash: payload.emailHash, redactedEmail: payload.redactedEmail, accountantFirmName: "Synthetic Pending Firm", role: "REVIEWER",
    consentGrantedById: "synthetic-consent-issuer", consentGrantedAt: now, consentEvidenceHash, effectiveFrom: now, expiresAt,
    idempotencyKey: unique("invite-key"), correlationId: unique("correlation"), evidenceHash: hashBusinessPayload(label + "-invite"), businessEventId: event.id, outboxId, createdAt: now } })
  await db.accountantClientInviteState.create({ data: { organizationId, inviteId, version: 1, status: "PENDING", occurredAt: now,
    stateHash: hashBusinessPayload({ inviteId, fixture: "PENDING" }), evidenceHash: hashBusinessPayload(label + "-state") } })
  return { organizationId, inviteId, outboxId, now, destination }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
const workerId = "synthetic-stable-worker"
const row = (f: Fixture) => db.businessEventOutbox.findUniqueOrThrow({ where: { id: f.outboxId } })
const success = (f: Fixture) => ({ status: "SENT" as const, provider: "RESEND" as const, providerReference: "synthetic-provider-" + f.inviteId })
async function claim(f: Fixture, now = f.now) {
  return claimAccountantClientInvites({ organizationId: f.organizationId, workerId, now, limit: 1 })
}
async function processFixture(f: Fixture, sender: (...args: any[]) => any, extra: Record<string, unknown> = {}) {
  return processAccountantClientInvite({ organizationId: f.organizationId, requestId: f.outboxId, workerId, now: f.now,
    environment, dependencies: { sendAccountantClientInvite: sender }, ...extra })
}
async function sentFacts(f: Fixture) {
  return { events: await db.businessEvent.findMany({ where: { organizationId: f.organizationId, eventType: "ACCOUNTANT_CLIENT_INVITE_DELIVERY_SENT" } }),
    audits: await db.auditLog.findMany({ where: { organizationId: f.organizationId, entityId: f.inviteId, action: "ACCOUNTANT_CLIENT_INVITE_DELIVERY_SENT" } }) }
}
async function hold(f: Fixture, result: unknown) {
  expect(result).toMatchObject({ requestId: f.outboxId, status: "DEFERRED", code: "PROVIDER_OUTCOME_UNKNOWN" })
  const current = await row(f)
  expect(current.status).toBe("DEFERRED")
  expect(current.lastErrorCode).toBe("PROVIDER_OUTCOME_UNKNOWN")
  expect(current.lockedBy).toBeNull()
  expect(await claim(f, new Date(f.now.getTime() + 86400000))).toEqual([])
  return current
}

afterAll(async () => {
  try {
    expect(await db.journalEntry.count()).toBe(0)
    expect(await db.accountantAccessGrant.count()).toBe(0)
    expect(await db.accountantClientInviteState.count({ where: { status: { not: "PENDING" } } })).toBe(0)
  } finally { await db.$disconnect() }
})

test("requires a nonblank tenant and rejects a foreign actual tenant without changing the lease", async () => {
  const f = await fixture("tenant"), foreign = await fixture("foreign"), sender = jest.fn().mockResolvedValue(success(f))
  const before = await row(f)
  for (const organizationId of [undefined, "", " "]) {
    await expect(claimAccountantClientInvites({ organizationId, workerId } as any)).rejects.toBeDefined()
    await expect(processAccountantClientInvite({ organizationId, requestId: f.outboxId, workerId, environment, dependencies: { sendAccountantClientInvite: sender } } as any)).rejects.toBeDefined()
  }
  await expect(processAccountantClientInvite({ organizationId: foreign.organizationId, requestId: f.outboxId, workerId, environment, dependencies: { sendAccountantClientInvite: sender } })).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(await row(f)).toEqual(before)
  expect(sender).not.toHaveBeenCalled()
  recorded("required-and-foreign-tenant", { noOutboxChange: true, providerCalls: 0 })
})

test("parallel claims produce exactly one native lease and attempt increment", async () => {
  const f = await fixture("claim")
  const claims = await Promise.all([claim(f), claim(f)])
  expect(claims.flat()).toEqual([f.outboxId])
  expect(await row(f)).toMatchObject({ status: "LOCKED", attempts: 1, lockedBy: workerId })
  recorded("parallel-claim-cas", { nativeLeases: 1, attempts: 1 })
})

test("settles a simulated accepted delivery with actual event and audit transactions", async () => {
  const f = await fixture("success"), sender = jest.fn().mockResolvedValue(success(f))
  expect((await db.$queryRaw<Array<{ sqlnull: boolean }>>(Prisma.sql`SELECT metadata IS NULL AS sqlnull FROM business_event_outbox WHERE id=${f.outboxId}`))[0].sqlnull).toBe(true)
  expect(await claim(f)).toEqual([f.outboxId])
  expect(await processFixture(f, sender)).toEqual({ requestId: f.outboxId, status: "SENT" })
  const current = await row(f), facts = await sentFacts(f)
  expect(current).toMatchObject({ status: "SENT", attempts: 1, lockedBy: null })
  expect((current.metadata as any).accountantInviteDispatch).toMatchObject({ version: 1, attempt: 1, outcome: "ACCEPTED" })
  expect(facts.events).toHaveLength(1); expect(facts.audits).toHaveLength(1)
  expect(facts.events[0].status).toBe("APPLIED")
  expect(JSON.stringify(facts)).not.toContain(success(f).providerReference)
  expect(JSON.stringify(facts)).not.toContain(f.destination)
  expect(sender).toHaveBeenCalledTimes(1)
  recorded("native-accepted-settlement", { appliedDeliveryEvents: 1, deliveryAudits: 1, providerCalls: 1 })
})

test("first-attempt JSON null metadata is fenced and reserved like SQL null metadata", async () => {
  const f = await fixture("json-null"), sender = jest.fn().mockResolvedValue(success(f))
  await db.businessEventOutbox.update({ where: { id: f.outboxId }, data: { metadata: Prisma.JsonNull } })
  expect((await row(f)).metadata).toBeNull()
  expect((await db.$queryRaw<Array<{ sqlnull: boolean; jsontype: string }>>(Prisma.sql`SELECT metadata IS NULL AS sqlnull,jsonb_typeof(metadata) AS jsontype FROM business_event_outbox WHERE id=${f.outboxId}`))[0]).toEqual({ sqlnull: false, jsontype: "null" })
  expect(await claim(f)).toEqual([f.outboxId])
  expect(await processFixture(f, sender)).toEqual({ requestId: f.outboxId, status: "SENT" })
  expect((await row(f)).metadata).toMatchObject({ accountantInviteDispatch: { attempt: 1, outcome: "ACCEPTED" } })
  expect(sender).toHaveBeenCalledTimes(1)
  recorded("json-null-first-attempt-fence", { providerCalls: 1, reservationAccepted: true })
})

test("a duplicate processor observes the durable reservation while the first provider result is pending", async () => {
  const f = await fixture("duplicate"), started = deferred<void>(), response = deferred<any>()
  await claim(f)
  const sender = jest.fn().mockImplementation(() => { started.resolve(); return response.promise })
  const first = processFixture(f, sender)
  try {
    await started.promise
    expect((await row(f)).metadata).toMatchObject({ accountantInviteDispatch: { attempt: 1, outcome: "RESERVED" } })
    expect(await processFixture(f, sender)).toEqual({ requestId: f.outboxId, status: "PROCESSING" })
  } finally { response.resolve(success(f)) }
  expect(await first).toEqual({ requestId: f.outboxId, status: "SENT" })
  expect(sender).toHaveBeenCalledTimes(1)
  expect((await sentFacts(f)).events).toHaveLength(1)
  recorded("duplicate-processor-reservation", { providerCalls: 1, nativeSentEvents: 1 })
})

test.each(["success", "failure", "throw"])("a stale %s cannot settle a newer attempt reclaimed by the same stable worker", async outcome => {
  const f = await fixture("stale-" + outcome), started = deferred<void>(), response = deferred<any>()
  await claim(f)
  const sender = jest.fn().mockImplementation(() => { started.resolve(); return response.promise })
  const old = processFixture(f, sender)
  let preserved: Awaited<ReturnType<typeof row>>
  try {
    await started.promise
    const oldExecution = ((await row(f)).metadata as any).accountantInviteDispatch.executionId
    const later = new Date(f.now.getTime() + 600000)
    expect(await claim(f, later)).toEqual([f.outboxId])
    const held = await hold(f, await processFixture(f, sender, { now: later }))
    expect(held.attempts).toBe(2)
    expect((held.metadata as any).accountantInviteDispatch.executionId).toBe(oldExecution)
    preserved = held
  } finally {
    if (outcome === "success") response.resolve(success(f))
    else if (outcome === "failure") response.resolve({ status: "FAILED", provider: "RESEND", errorCode: "SYNTHETIC_REJECTION", retryable: true })
    else response.reject(new Error("Synthetic late provider exception"))
  }
  expect(await old).toMatchObject({ requestId: f.outboxId, status: "LEASE_LOST" })
  expect(await row(f)).toEqual(preserved!)
  expect((await sentFacts(f)).events).toHaveLength(0)
  expect(await db.businessEvent.count({ where: { organizationId: f.organizationId, eventType: "ACCOUNTANT_CLIENT_INVITE_DELIVERY_DEFERRED" } })).toBe(1)
  expect(sender).toHaveBeenCalledTimes(1)
  recorded("stale-generation-" + outcome, { newerAttempt: 2, staleResult: "LEASE_LOST", providerCalls: 1, noStaleSettlement: true })
})

test("holds a reclaimed persisted reservation after a simulated process crash", async () => {
  const f = await fixture("crash"), executionId = randomUUID(), sender = jest.fn().mockResolvedValue(success(f))
  await db.businessEventOutbox.update({ where: { id: f.outboxId }, data: { status: "LOCKED", attempts: 1, lockedBy: workerId,
    lockedAt: new Date(f.now.getTime() - 600000), metadata: { accountantInviteDispatch: { version: 1, attempt: 1, executionId, reservedAt: new Date(f.now.getTime() - 600000).toISOString(), outcome: "RESERVED" } } } })
  await claim(f)
  const held = await hold(f, await processFixture(f, sender))
  expect(held.attempts).toBe(2)
  expect((held.metadata as any).accountantInviteDispatch).toMatchObject({ executionId, outcome: "UNKNOWN" })
  expect(sender).not.toHaveBeenCalled()
  recorded("persisted-reservation-crash-hold", { attempt: 2, providerCalls: 0 })
})

test.each(["throw", "timeout"])("holds an ambiguous provider %s without automatic resend", async outcome => {
  const f = await fixture("unknown-" + outcome), response = deferred<any>()
  await claim(f)
  const sender = outcome === "throw" ? jest.fn().mockRejectedValue(new Error("Synthetic ambiguous provider exception")) : jest.fn().mockReturnValue(response.promise)
  const held = await hold(f, await processFixture(f, sender, { providerTimeoutMs: 20 }))
  expect((held.metadata as any).accountantInviteDispatch.outcome).toBe("UNKNOWN")
  response.resolve(success(f))
  await new Promise(resolve => setTimeout(resolve, 35))
  expect(await row(f)).toEqual(held)
  expect(sender).toHaveBeenCalledTimes(1)
  recorded("ambiguous-provider-" + outcome, { providerCalls: 1, heldForReview: true, lateResultUnchanged: true })
})

test("retries a proven non-send and settles the next generation once", async () => {
  const f = await fixture("definite-retry"), sender = jest.fn()
    .mockResolvedValueOnce({ status: "FAILED", provider: "RESEND", errorCode: "SYNTHETIC_429", retryable: true })
    .mockResolvedValueOnce(success(f))
  await claim(f)
  expect(await processFixture(f, sender)).toMatchObject({ status: "FAILED" })
  const rejected = await row(f), firstExecution = (rejected.metadata as any).accountantInviteDispatch.executionId
  expect((rejected.metadata as any).accountantInviteDispatch.outcome).toBe("NOT_SENT")
  const later = new Date(f.now.getTime() + 20000)
  expect(await claim(f, later)).toEqual([f.outboxId])
  expect(await processFixture(f, sender, { now: later })).toMatchObject({ status: "SENT" })
  const accepted = await row(f)
  expect(accepted.attempts).toBe(2)
  expect((accepted.metadata as any).accountantInviteDispatch.executionId).not.toBe(firstExecution)
  expect((accepted.metadata as any).accountantInviteDispatch.outcome).toBe("ACCEPTED")
  expect(sender).toHaveBeenCalledTimes(2)
  expect((await sentFacts(f)).events).toHaveLength(1)
  recorded("proven-nonsend-retry", { attempts: 2, providerCalls: 2, nativeSentEvents: 1 })
})

test("rolls back failed sent-event settlement and retains an unknown outcome for operator review", async () => {
  const f = await fixture("atomic-fault"), sender = jest.fn().mockResolvedValue(success(f))
  await claim(f)
  const suffix = randomUUID().replaceAll("-", ""), name = "invite_pg_fault_" + suffix
  await db.$executeRawUnsafe(`CREATE FUNCTION public."${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."entityId"='${f.inviteId}' AND NEW.action='ACCOUNTANT_CLIENT_INVITE_DELIVERY_SENT' THEN RAISE EXCEPTION 'Synthetic invitation settlement audit fault'; END IF; RETURN NEW; END $$`)
  try {
    await db.$executeRawUnsafe(`CREATE TRIGGER "${name}" BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public."${name}"()`)
    try {
      const held = await hold(f, await processFixture(f, sender))
      expect((held.metadata as any).accountantInviteDispatch.outcome).toBe("UNKNOWN")
      expect((await sentFacts(f)).events).toHaveLength(0)
      expect((await sentFacts(f)).audits).toHaveLength(0)
      expect(sender).toHaveBeenCalledTimes(1)
    } finally { await db.$executeRawUnsafe(`DROP TRIGGER "${name}" ON public.audit_logs`) }
  } finally { await db.$executeRawUnsafe(`DROP FUNCTION public."${name}"()`) }
  recorded("actual-settlement-rollback", { sentEvents: 0, sentAudits: 0, providerCalls: 1, heldForReview: true, ownedFaultDdlRemoved: true })
})

test("holds malformed dispatch metadata without rewriting it or sending", async () => {
  const f = await fixture("malformed"), metadata = { unrelatedEvidence: "preserved", accountantInviteDispatch: { outcome: "RESERVED", executionId: "invalid" } }, sender = jest.fn()
  await db.businessEventOutbox.update({ where: { id: f.outboxId }, data: { metadata } })
  await claim(f)
  expect((await hold(f, await processFixture(f, sender))).metadata).toEqual(metadata)
  expect(sender).not.toHaveBeenCalled()
  recorded("malformed-metadata-hold", { providerCalls: 0, rawMetadataPreserved: true })
})

test.each(["SQL null", "JSON null"])("holds an ambiguous reclaimed legacy lease with %s metadata", async representation => {
  const f = await fixture("legacy-" + representation), sender = jest.fn()
  await db.businessEventOutbox.update({ where: { id: f.outboxId }, data: { status: "LOCKED", attempts: 1, lockedBy: workerId, lockedAt: new Date(f.now.getTime() - 600000), metadata: representation === "SQL null" ? Prisma.DbNull : Prisma.JsonNull } })
  expect((await db.$queryRaw<Array<{ sqlnull: boolean }>>(Prisma.sql`SELECT metadata IS NULL AS sqlnull FROM business_event_outbox WHERE id=${f.outboxId}`))[0].sqlnull).toBe(representation === "SQL null")
  await claim(f)
  const held = await hold(f, await processFixture(f, sender))
  expect(held.attempts).toBe(2)
  expect(held.metadata).toBeNull()
  expect(sender).not.toHaveBeenCalled()
  recorded("legacy-ambiguous-lease-hold-" + representation, { providerCalls: 0, metadataStillNull: true })
})

test("dead letters an exhausted definite rejection without a subsequent claim", async () => {
  const f = await fixture("exhausted", 1), sender = jest.fn().mockResolvedValue({ status: "FAILED", provider: "RESEND", errorCode: "SYNTHETIC_429", retryable: true })
  await claim(f)
  expect(await processFixture(f, sender)).toMatchObject({ status: "DEAD_LETTER" })
  expect(await row(f)).toMatchObject({ status: "DEAD_LETTER", attempts: 1 })
  expect(await claim(f, new Date(f.now.getTime() + 86400000))).toEqual([])
  expect(sender).toHaveBeenCalledTimes(1)
  recorded("exhausted-definite-rejection", { providerCalls: 1, furtherClaims: 0 })
})
