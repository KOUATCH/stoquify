import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto"
import {
  AccountantAccessRole,
  AccountantAccessStatus,
  AccountantClientInviteStatus,
  Prisma,
  ReferralAttributionSource,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  grantAccountantAccess,
  type AccountantAccessGrantDto,
} from "./accountant-access.service"
import { sealAccountantClientInviteEnvelope } from "./accountant-client-invite-envelope"

export const ACCOUNTANT_CLIENT_INVITE_EVENT_NAME =
  "accountant.client.invite.requested"
export const ACCOUNTANT_CLIENT_INVITE_MAX_ATTEMPTS = 5

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SHA256_EVIDENCE_PATTERN = /^sha256:[0-9a-f]{64}$/
const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/

export type InviteAccountantClientAccessInput = {
  accountantEmail: string
  accountantFirmName: string
  accountantFirmRegistrationNumber?: string | null
  role: "READ_ONLY" | "REVIEWER" | "PREPARER"
  consentEvidenceHash: string
  effectiveFrom?: Date
  expiresAt: Date
  correlationId?: string | null
  idempotencyKey?: string | null
  locale?: "EN" | "FR"
  environment?: Record<string, string | undefined>
}

export type AccountantClientInviteDto = {
  id: string
  organizationId: string
  attributionId: string
  referralCode: string
  redactedEmail: string
  accountantFirmName: string
  accountantFirmRegistrationNumber: string | null
  role: AccountantAccessRole
  status: AccountantClientInviteStatus
  effectiveFrom: string
  expiresAt: string
  outboxId: string
  replayed: boolean
}

export type InviteOrGrantAccountantAccessResult =
  | {
      outcome: "GRANTED"
      grant: AccountantAccessGrantDto
      invite: null
    }
  | {
      outcome: "INVITED"
      grant: null
      invite: AccountantClientInviteDto
    }

function normalizeEmail(value: string) {
  const normalized = value.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(normalized) || normalized.length > 254) {
    throw new BusinessRuleError("Accountant email is invalid")
  }
  return normalized
}

function redactEmail(value: string) {
  const [local, domain] = value.split("@")
  return local.slice(0, 1) + "***@" + domain
}

function inviteTokenMatches(value: string, expectedHash: string) {
  const normalized = value.trim()
  if (!INVITE_TOKEN_PATTERN.test(normalized)) return false
  const actual = Buffer.from(hashBusinessPayload(normalized), "hex")
  const expected = Buffer.from(expectedHash, "hex")
  return (
    actual.length === 32 &&
    expected.length === 32 &&
    timingSafeEqual(actual, expected)
  )
}

function requiredText(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) throw new BusinessRuleError(label + " is required")
  return normalized
}

function safeBaseUrl(environment: Record<string, string | undefined>) {
  const configured = (
    environment.NEXT_PUBLIC_BASE_URL ||
    environment.NEXT_PUBLIC_APP_URL ||
    environment.APP_URL ||
    ""
  ).trim()
  if (!configured) {
    if (environment.NODE_ENV === "production") {
      throw new BusinessRuleError("Public application URL is not configured")
    }
    return "http://localhost:3000"
  }
  try {
    return new URL(configured).origin
  } catch {
    throw new BusinessRuleError("Public application URL is invalid")
  }
}

function eventOutboxId(event: { outboxMessages?: unknown[] }) {
  const message = event.outboxMessages?.find((candidate) => (
    candidate !== null &&
    typeof candidate === "object" &&
    (candidate as { eventName?: unknown }).eventName ===
      ACCOUNTANT_CLIENT_INVITE_EVENT_NAME
  ))
  const id = message && typeof message === "object"
    ? (message as { id?: unknown }).id
    : null
  if (typeof id !== "string") {
    throw new ConflictError("Accountant invitation outbox evidence is missing")
  }
  return id
}

function latestStatus(
  states: Array<{ status: AccountantClientInviteStatus }>,
) {
  const state = states[0]
  if (!state) {
    throw new ConflictError("Accountant invitation state evidence is missing")
  }
  return state.status
}

function toInviteDto(
  invite: {
    id: string
    organizationId: string
    attributionId: string
    redactedEmail: string
    accountantFirmName: string
    accountantFirmRegistrationNumber: string | null
    role: AccountantAccessRole
    effectiveFrom: Date
    expiresAt: Date
    outboxId: string
    attribution: { referralCode: string }
    states: Array<{ status: AccountantClientInviteStatus }>
  },
  replayed: boolean,
): AccountantClientInviteDto {
  return {
    id: invite.id,
    organizationId: invite.organizationId,
    attributionId: invite.attributionId,
    referralCode: invite.attribution.referralCode,
    redactedEmail: invite.redactedEmail,
    accountantFirmName: invite.accountantFirmName,
    accountantFirmRegistrationNumber:
      invite.accountantFirmRegistrationNumber,
    role: invite.role,
    status: latestStatus(invite.states),
    effectiveFrom: invite.effectiveFrom.toISOString(),
    expiresAt: invite.expiresAt.toISOString(),
    outboxId: invite.outboxId,
    replayed,
  }
}

export async function queueAccountantClientInviteInTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
  actorId: string,
  input: InviteAccountantClientAccessInput,
  now = new Date(),
): Promise<AccountantClientInviteDto> {
  const email = normalizeEmail(input.accountantEmail)
  const emailHash = hashBusinessPayload(email)
  const redactedEmail = redactEmail(email)
  const accountantFirmName = requiredText(
    input.accountantFirmName,
    "Accountant firm name",
  )
  const effectiveFrom = input.effectiveFrom ?? now
  if (!SHA256_EVIDENCE_PATTERN.test(input.consentEvidenceHash)) {
    throw new BusinessRuleError("Signed client consent evidence is required")
  }
  if (input.expiresAt <= now || input.expiresAt <= effectiveFrom) {
    throw new BusinessRuleError(
      "Accountant invitation expiry must be after its effective date",
    )
  }

  const identityHash = hashBusinessPayload({
    organizationId,
    emailHash,
    accountantFirmName,
    accountantFirmRegistrationNumber:
      input.accountantFirmRegistrationNumber?.trim() || null,
    role: input.role,
    consentEvidenceHash: input.consentEvidenceHash,
    effectiveFrom: effectiveFrom.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
  })
  const idempotencyKey = input.idempotencyKey?.trim() || identityHash
  if (idempotencyKey.length < 8 || idempotencyKey.length > 191) {
    throw new BusinessRuleError(
      "Accountant invitation idempotency key is invalid",
    )
  }
  const correlationId =
    input.correlationId?.trim() ||
    "accountant-invite-" + identityHash.slice(0, 32)
  if (correlationId.length < 8 || correlationId.length > 191) {
    throw new BusinessRuleError(
      "Accountant invitation correlation ID is invalid",
    )
  }

  const existing = await tx.accountantClientInvite.findUnique({
    where: {
      organizationId_idempotencyKey: { organizationId, idempotencyKey },
    },
    include: {
      attribution: { select: { referralCode: true } },
      states: {
        orderBy: [{ version: "desc" }, { occurredAt: "desc" }],
        take: 1,
        select: { status: true },
      },
    },
  })
  if (existing) {
    if (existing.evidenceHash !== identityHash) {
      throw new ConflictError(
        "Accountant invitation idempotency evidence was reused",
      )
    }
    return toInviteDto(existing, true)
  }

  const actor = await tx.user.findFirst({
    where: { id: actorId, organizationId, isActive: true },
    select: { id: true },
  })
  if (!actor) throw new NotFoundError("Active invitation actor not found")

  const inviteId = randomUUID()
  const attributionId = randomUUID()
  const referralCode = randomBytes(18).toString("base64url")
  const inviteToken = randomBytes(32).toString("base64url")
  const inviteTokenHash = hashBusinessPayload(inviteToken)
  const environment = input.environment ?? process.env
  const inviteUrl =
    safeBaseUrl(environment) +
    "/api/referrals/" +
    encodeURIComponent(referralCode) +
    "?invite=" +
    encodeURIComponent(inviteToken)
  const sealedEnvelope = sealAccountantClientInviteEnvelope({
    destination: email,
    inviteUrl,
    inviteId,
    referralCode,
    issuedAt: now.toISOString(),
  }, environment)
  if (!sealedEnvelope) {
    throw new BusinessRuleError(
      "Accountant invitation encryption is not configured safely",
    )
  }

  const attributionEvidenceHash = hashBusinessPayload({
    organizationId,
    sourceType: ReferralAttributionSource.ACCOUNTANT_INVITE,
    sourceId: inviteId,
    referralCode,
    campaign: "accountant_client_invite",
    createdById: actor.id,
  })
  await tx.referralAttribution.create({
    data: {
      id: attributionId,
      organizationId,
      statementSnapshotId: null,
      sourceType: ReferralAttributionSource.ACCOUNTANT_INVITE,
      sourceId: inviteId,
      referralCode,
      campaign: "accountant_client_invite",
      channel: "EMAIL",
      createdById: actor.id,
      evidenceHash: attributionEvidenceHash,
    },
  })

  const locale = input.locale ?? "EN"
  const safePayload = {
    schemaVersion: "accountant-client-invite.v1",
    inviteId,
    organizationId,
    attributionId,
    referralCode,
    emailHash,
    redactedEmail,
    role: input.role,
    locale,
    consentEvidenceHash: input.consentEvidenceHash,
    expiresAt: input.expiresAt.toISOString(),
    sealedEnvelope,
    sealedEnvelopeHash: hashBusinessPayload(sealedEnvelope),
  }
  const recorded = await recordBusinessEventInTx(tx, {
    organizationId,
    eventType: "ACCOUNTANT_CLIENT_INVITE_REQUESTED",
    eventSource: "API",
    schemaVersion: 1,
    idempotencyKey: "accountant-client-invite:" + idempotencyKey,
    actorId: actor.id,
    sourceType: "ACCOUNTANT_CLIENT_INVITE",
    sourceId: inviteId,
    documentHash: input.consentEvidenceHash,
    payload: {
      inviteId,
      attributionId,
      referralCode,
      emailHash,
      redactedEmail,
      role: input.role,
      locale,
      consentEvidenceHash: input.consentEvidenceHash,
      effectiveFrom: effectiveFrom.toISOString(),
      expiresAt: input.expiresAt.toISOString(),
      evidenceHash: identityHash,
    },
    metadata: {
      gate: "net-new-accountant-onboarding",
      rawEmailStored: false,
      rawInviteTokenStored: false,
      providerEnvelope: "AES_256_GCM",
    },
    outboxMessages: [{
      channel: "EMAIL",
      eventName: ACCOUNTANT_CLIENT_INVITE_EVENT_NAME,
      idempotencyKey: "accountant-client-invite:" + inviteId,
      payload: safePayload,
      maxAttempts: ACCOUNTANT_CLIENT_INVITE_MAX_ATTEMPTS,
      metadata: {
        emailHash,
        redactedEmail,
        consentEvidenceHash: input.consentEvidenceHash,
      },
    }],
  })
  const outboxId = eventOutboxId(recorded.event)
  const stateEvidenceHash = hashBusinessPayload({
    inviteId,
    identityHash,
    attributionEvidenceHash,
    inviteTokenHash,
    businessEventId: recorded.event.id,
    outboxId,
  })
  const stateHash = hashBusinessPayload({
    organizationId,
    inviteId,
    version: 1,
    status: AccountantClientInviteStatus.PENDING,
    occurredAt: now.toISOString(),
    previousStateHash: null,
    evidenceHash: stateEvidenceHash,
  })

  const invite = await tx.accountantClientInvite.create({
    data: {
      id: inviteId,
      organizationId,
      attributionId,
      inviteTokenHash,
      emailHash,
      redactedEmail,
      accountantFirmName,
      accountantFirmRegistrationNumber:
        input.accountantFirmRegistrationNumber?.trim() || null,
      role: AccountantAccessRole[input.role],
      consentGrantedById: actor.id,
      consentGrantedAt: now,
      consentEvidenceHash: input.consentEvidenceHash,
      effectiveFrom,
      expiresAt: input.expiresAt,
      idempotencyKey,
      correlationId,
      evidenceHash: identityHash,
      businessEventId: recorded.event.id,
      outboxId,
    },
  })
  await tx.accountantClientInviteState.create({
    data: {
      organizationId,
      inviteId,
      version: 1,
      status: AccountantClientInviteStatus.PENDING,
      occurredAt: now,
      actorId: actor.id,
      previousStateHash: null,
      stateHash,
      evidenceHash: stateEvidenceHash,
      businessEventId: recorded.event.id,
    },
  })
  await markBusinessEventAppliedInTx(tx, organizationId, recorded.event.id)
  await tx.auditLog.create({
    data: {
      organizationId,
      entityType: "AccountantClientInvite",
      entityId: inviteId,
      action: "ACCOUNTANT_CLIENT_INVITE_QUEUED",
      userId: actor.id,
      changes: {
        after: {
          attributionId,
          referralCode,
          emailHash,
          redactedEmail,
          role: input.role,
          consentEvidenceHash: input.consentEvidenceHash,
          expiresAt: input.expiresAt.toISOString(),
          outboxId,
          stateHash,
        },
      },
    },
  })

  return {
    id: invite.id,
    organizationId,
    attributionId,
    referralCode,
    redactedEmail,
    accountantFirmName,
    accountantFirmRegistrationNumber:
      invite.accountantFirmRegistrationNumber,
    role: invite.role,
    status: AccountantClientInviteStatus.PENDING,
    effectiveFrom: effectiveFrom.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
    outboxId,
    replayed: false,
  }
}

export async function inviteOrGrantAccountantAccess(
  organizationId: string,
  actorId: string,
  input: InviteAccountantClientAccessInput,
  now = new Date(),
): Promise<InviteOrGrantAccountantAccessResult> {
  const email = normalizeEmail(input.accountantEmail)
  const accountant = await db.user.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  })
  if (accountant?.isActive) {
    const grant = await grantAccountantAccess(
      organizationId,
      actorId,
      {
        accountantEmail: email,
        accountantFirmName: input.accountantFirmName,
        accountantFirmRegistrationNumber:
          input.accountantFirmRegistrationNumber,
        role: input.role,
        consentEvidenceHash: input.consentEvidenceHash,
        effectiveFrom: input.effectiveFrom,
        expiresAt: input.expiresAt,
        correlationId: input.correlationId,
      },
      now,
    )
    return { outcome: "GRANTED", grant, invite: null }
  }
  if (accountant) {
    throw new BusinessRuleError(
      "The accountant account exists but is inactive and must be reactivated",
    )
  }
  const invite = await db.$transaction((tx) =>
    queueAccountantClientInviteInTx(
      tx,
      organizationId,
      actorId,
      input,
      now,
    ),
  )
  return { outcome: "INVITED", grant: null, invite }
}

export async function acceptAccountantClientInviteInTx(
  tx: Prisma.TransactionClient,
  input: {
    referralCode: string
    targetOrganizationId: string
    accountantUserId: string
    accountantEmail: string
    inviteToken: string
    recipientAccepted: boolean
    now?: Date
  },
) {
  const now = input.now ?? new Date()
  const emailHash = hashBusinessPayload(normalizeEmail(input.accountantEmail))
  const invite = await tx.accountantClientInvite.findFirst({
    where: {
      emailHash,
      attribution: { referralCode: input.referralCode },
    },
    include: {
      attribution: { select: { referralCode: true } },
      states: {
        orderBy: [{ version: "desc" }, { occurredAt: "desc" }],
        take: 1,
      },
    },
  })
  if (!invite) {
    throw new ForbiddenError(
      "Accountant invitation does not match the registered email",
    )
  }
  if (!inviteTokenMatches(input.inviteToken, invite.inviteTokenHash)) {
    throw new ForbiddenError(
      "Accountant invitation credentials do not match",
    )
  }
  if (!input.recipientAccepted) {
    throw new BusinessRuleError(
      "Accountant invitation acceptance is required",
    )
  }
  const current = invite.states[0]
  if (!current) {
    throw new ConflictError("Accountant invitation state evidence is missing")
  }
  if (current.status === AccountantClientInviteStatus.ACCEPTED) {
    return {
      inviteId: invite.id,
      accessGrantId: current.accessGrantId,
      accepted: false,
      replayed: true,
    }
  }
  if (current.status !== AccountantClientInviteStatus.PENDING) {
    throw new BusinessRuleError("Accountant invitation is no longer active")
  }
  if (invite.expiresAt <= now) {
    throw new BusinessRuleError("Accountant invitation has expired")
  }

  const activeScopeKey =
    invite.organizationId + ":" + input.accountantUserId
  const grant = await tx.accountantAccessGrant.create({
    data: {
      organizationId: invite.organizationId,
      accountantUserId: input.accountantUserId,
      accountantFirmName: invite.accountantFirmName,
      accountantFirmRegistrationNumber:
        invite.accountantFirmRegistrationNumber,
      role: invite.role,
      status: AccountantAccessStatus.ACTIVE,
      activeScopeKey,
      consentGrantedById: invite.consentGrantedById,
      consentGrantedAt: invite.consentGrantedAt,
      consentEvidenceHash: invite.consentEvidenceHash,
      effectiveFrom: invite.effectiveFrom,
      expiresAt: invite.expiresAt,
      correlationId: invite.correlationId,
      metadata: {
        consentContract: "explicit-client-and-recipient-consent.v1",
        accessBoundary: "ledger-backed-accountant-portal",
        accountantClientInviteId: invite.id,
        accountantOrganizationId: input.targetOrganizationId,
      },
    },
  })
  const acceptanceEvidenceHash = hashBusinessPayload({
    inviteEvidenceHash: invite.evidenceHash,
    accountantUserId: input.accountantUserId,
    accountantOrganizationId: input.targetOrganizationId,
    emailHash,
    recipientAccepted: true,
    acceptedAt: now.toISOString(),
  })
  const recorded = await recordBusinessEventInTx(tx, {
    organizationId: invite.organizationId,
    eventType: "ACCOUNTANT_CLIENT_INVITE_ACCEPTED",
    eventSource: "API",
    schemaVersion: 1,
    idempotencyKey: "accountant-client-invite-accepted:" + invite.id,
    actorId: input.accountantUserId,
    sourceType: "ACCOUNTANT_CLIENT_INVITE",
    sourceId: invite.id,
    documentHash: acceptanceEvidenceHash,
    payload: {
      inviteId: invite.id,
      attributionId: invite.attributionId,
      accountantUserId: input.accountantUserId,
      accountantOrganizationId: input.targetOrganizationId,
      accessGrantId: grant.id,
      acceptedAt: now.toISOString(),
      acceptanceEvidenceHash,
    },
    outboxMessages: [{
      channel: "NOTIFICATION",
      eventName: "ACCOUNTANT_CLIENT_ACCESS_ACTIVATED",
      destination: input.accountantUserId,
      payload: {
        inviteId: invite.id,
        organizationId: invite.organizationId,
        accessGrantId: grant.id,
        role: grant.role,
        expiresAt: grant.expiresAt.toISOString(),
      },
    }],
  })
  const stateHash = hashBusinessPayload({
    organizationId: invite.organizationId,
    inviteId: invite.id,
    version: current.version + 1,
    status: AccountantClientInviteStatus.ACCEPTED,
    occurredAt: now.toISOString(),
    previousStateHash: current.stateHash,
    accountantUserId: input.accountantUserId,
    accessGrantId: grant.id,
    evidenceHash: acceptanceEvidenceHash,
  })
  await tx.accountantClientInviteState.create({
    data: {
      organizationId: invite.organizationId,
      inviteId: invite.id,
      version: current.version + 1,
      status: AccountantClientInviteStatus.ACCEPTED,
      occurredAt: now,
      actorId: input.accountantUserId,
      accountantUserId: input.accountantUserId,
      accessGrantId: grant.id,
      previousStateHash: current.stateHash,
      stateHash,
      evidenceHash: acceptanceEvidenceHash,
      businessEventId: recorded.event.id,
    },
  })
  await markBusinessEventAppliedInTx(
    tx,
    invite.organizationId,
    recorded.event.id,
  )
  await tx.auditLog.create({
    data: {
      organizationId: invite.organizationId,
      entityType: "AccountantClientInvite",
      entityId: invite.id,
      action: "ACCOUNTANT_CLIENT_INVITE_ACCEPTED",
      userId: input.accountantUserId,
      changes: {
        after: {
          accountantUserId: input.accountantUserId,
          accountantOrganizationId: input.targetOrganizationId,
          accessGrantId: grant.id,
          acceptanceEvidenceHash,
          stateHash,
        },
      },
    },
  })
  return {
    inviteId: invite.id,
    accessGrantId: grant.id,
    accepted: true,
    replayed: false,
  }
}
