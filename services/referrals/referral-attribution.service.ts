import { randomUUID, timingSafeEqual } from "node:crypto"
import {
  Prisma,
  ReferralAttributionEventType,
  ReferralAttributionSource,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { NotFoundError } from "@/services/_shared/action-errors"
import { acceptAccountantClientInviteInTx } from "@/services/accounting/accountant-client-invite.service"
import { hashBusinessPayload } from "@/services/events/business-event.service"

const REFERRAL_CODE_PATTERN = /^[A-Za-z0-9_-]{12,64}$/
const ACCOUNTANT_INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/

function normalizedCode(value?: string | null) {
  const normalized = value?.trim() ?? ""
  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : null
}

function optionalSubjectHash(values: Array<string | null | undefined>) {
  const normalized = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join("|")
  return normalized ? hashBusinessPayload(normalized) : null
}

function inviteTokenMatches(value: string, expectedHash: string) {
  if (!ACCOUNTANT_INVITE_TOKEN_PATTERN.test(value)) return false
  const actual = Buffer.from(hashBusinessPayload(value), "hex")
  const expected = Buffer.from(expectedHash, "hex")
  return (
    actual.length === 32 &&
    expected.length === 32 &&
    timingSafeEqual(actual, expected)
  )
}

function registrationPath(
  sourceType: ReferralAttributionSource,
  referralCode: string,
  inviteToken?: string | null,
) {
  const params = new URLSearchParams({ ref: referralCode })
  if (sourceType === ReferralAttributionSource.ACCOUNTANT_INVITE) {
    params.set("role", "accountant")
    if (inviteToken) params.set("invite", inviteToken)
  }
  return "/register-v2?" + params.toString()
}

export async function recordReferralClick(input: {
  referralCode: string
  inviteToken?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  now?: Date
}, client: typeof db = db) {
  const referralCode = normalizedCode(input.referralCode)
  if (!referralCode) throw new NotFoundError("Referral not found")
  const now = input.now ?? new Date()

  return client.$transaction(async (tx) => {
    const attribution = await tx.referralAttribution.findUnique({
      where: { referralCode },
      select: {
        id: true,
        organizationId: true,
        sourceType: true,
        campaign: true,
        accountantClientInvite: {
          select: { inviteTokenHash: true },
        },
      },
    })
    if (!attribution) throw new NotFoundError("Referral not found")
    const inviteToken = input.inviteToken?.trim() ?? ""
    if (
      attribution.sourceType === ReferralAttributionSource.ACCOUNTANT_INVITE &&
      (
        !attribution.accountantClientInvite ||
        !inviteTokenMatches(
          inviteToken,
          attribution.accountantClientInvite.inviteTokenHash,
        )
      )
    ) {
      throw new NotFoundError("Referral not found")
    }

    const subjectHash = optionalSubjectHash([
      input.ipAddress,
      input.userAgent,
    ])
    const sourceEventKey = subjectHash
      ? hashBusinessPayload({
          subjectHash,
          day: now.toISOString().slice(0, 10),
        })
      : randomUUID()
    const payloadHash = hashBusinessPayload({
      attributionId: attribution.id,
      eventType: ReferralAttributionEventType.CLICK,
      sourceEventKey,
      subjectHash,
      campaign: attribution.campaign,
    })
    await tx.referralAttributionEvent.createMany({
      data: [{
        organizationId: attribution.organizationId,
        attributionId: attribution.id,
        targetOrganizationId: null,
        eventType: ReferralAttributionEventType.CLICK,
        sourceEventKey,
        subjectHash,
        payloadHash,
        occurredAt: now,
        metadata: {
          source: "REFERRAL_REDIRECT",
          requestMetadataHashed: true,
        },
      }],
      skipDuplicates: true,
    })
    return {
      referralCode,
      sourceType: attribution.sourceType,
      campaign: attribution.campaign,
      registrationPath: registrationPath(
        attribution.sourceType,
        referralCode,
        inviteToken,
      ),
    }
  })
}

export async function recordReferralConversionInTx(
  tx: Prisma.TransactionClient,
  input: {
    referralCode?: string | null
    targetOrganizationId: string
    subject: string
    targetUserId?: string | null
    accountantInviteToken?: string | null
    accountantInviteAccepted?: boolean
    now?: Date
  },
) {
  const referralCode = normalizedCode(input.referralCode)
  if (!referralCode) return null
  const attribution = await tx.referralAttribution.findUnique({
    where: { referralCode },
    select: {
      id: true,
      organizationId: true,
      sourceType: true,
      campaign: true,
    },
  })
  if (!attribution) return null

  const now = input.now ?? new Date()
  const subjectHash = hashBusinessPayload(input.subject.trim().toLowerCase())
  const sourceEventKey = input.targetOrganizationId
  const payloadHash = hashBusinessPayload({
    attributionId: attribution.id,
    eventType: ReferralAttributionEventType.CONVERSION,
    targetOrganizationId: input.targetOrganizationId,
    subjectHash,
    campaign: attribution.campaign,
  })
  const result = await tx.referralAttributionEvent.createMany({
    data: [{
      organizationId: attribution.organizationId,
      attributionId: attribution.id,
      targetOrganizationId: input.targetOrganizationId,
      eventType: ReferralAttributionEventType.CONVERSION,
      sourceEventKey,
      subjectHash,
      payloadHash,
      occurredAt: now,
      metadata: {
        source: "ORGANIZATION_REGISTRATION",
        sourceType: attribution.sourceType,
      },
    }],
    skipDuplicates: true,
  })
  const accountantInviteActivation =
    attribution.sourceType === ReferralAttributionSource.ACCOUNTANT_INVITE
      ? await acceptAccountantClientInviteInTx(tx, {
          referralCode,
          targetOrganizationId: input.targetOrganizationId,
          accountantUserId: input.targetUserId ?? "",
          accountantEmail: input.subject,
          inviteToken: input.accountantInviteToken ?? "",
          recipientAccepted: input.accountantInviteAccepted === true,
          now,
        })
      : null
  return {
    attributionId: attribution.id,
    sourceType: attribution.sourceType,
    campaign: attribution.campaign,
    recorded: result.count === 1,
    accountantInviteActivation,
  }
}
