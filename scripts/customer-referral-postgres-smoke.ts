import { createHash } from "node:crypto"
import type { RegisterUserProps } from "../types/types"
import "./server-only-node-shim"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function sha256Evidence(value: string) {
  return "sha256:" + createHash("sha256").update(value).digest("hex")
}

function requireSafeDatabaseUrl() {
  const configured = process.env.AQSTOQFLOW_REFERRAL_SMOKE_DATABASE_URL?.trim()
  assert(configured, "AQSTOQFLOW_REFERRAL_SMOKE_DATABASE_URL is required")
  const parsed = new URL(configured)
  assert(
    ["postgres:", "postgresql:"].includes(parsed.protocol),
    "Referral smoke requires PostgreSQL",
  )
  assert(
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      parsed.hostname.toLowerCase(),
    ),
    "Referral smoke refuses non-local databases",
  )
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""))
  assert(
    databaseName.startsWith("stoquify_referral_"),
    "Referral smoke requires a dedicated stoquify_referral_* database",
  )
  process.env.DATABASE_URL = configured
  process.env.AQSTOQFLOW_STATEMENT_TOKEN_SECRET ||=
    Buffer.alloc(48, 0x51).toString("base64url")
  process.env.AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY ||=
    Buffer.alloc(32, 0x52).toString("base64")
  process.env.AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY ||=
    Buffer.alloc(32, 0x53).toString("base64")
  process.env.PUBLIC_IDENTITY_ABUSE_HASH_SECRET ||=
    "referral-local-fixture-" + "a".repeat(48)
  process.env.RESEND_API_KEY ||= "local-referral-fixture-disabled"
  process.env.NEXT_PUBLIC_BASE_URL ||= "http://127.0.0.1:3000"
  return databaseName
}

function installFixedClock(at: Date) {
  const NativeDate = globalThis.Date
  const fixedTime = at.getTime()
  const FixedDate = new Proxy(NativeDate, {
    construct(target, args) {
      return Reflect.construct(target, args.length > 0 ? args : [fixedTime])
    },
    apply() {
      return new NativeDate(fixedTime).toString()
    },
  })
  Object.defineProperty(FixedDate, "now", { value: () => fixedTime })
  globalThis.Date = FixedDate as DateConstructor
  return () => {
    globalThis.Date = NativeDate
  }
}
type ReferralRouteModule =
  typeof import("../app/api/referrals/[referralCode]/route")

async function openReferralLink(
  route: ReferralRouteModule,
  referralCode: string,
  input: {
    inviteToken?: string | null
    ipAddress: string
    userAgent: string
  },
) {
  const url = new URL(
    "/api/referrals/" + encodeURIComponent(referralCode),
    process.env.NEXT_PUBLIC_BASE_URL,
  )
  if (input.inviteToken) {
    url.searchParams.set("invite", input.inviteToken)
  }
  return route.GET(
    new Request(url, {
      headers: {
        "x-forwarded-for": input.ipAddress,
        "user-agent": input.userAgent,
      },
    }),
    { params: Promise.resolve({ referralCode }) },
  )
}

function registrationInput(input: {
  location: string
  firstName: string
  lastName: string
  email: string
  phone: string
  companyName: string
  accountantInviteAccepted?: boolean
}): RegisterUserProps {
  const params = new URL(input.location).searchParams
  const referralCode = params.get("ref") || undefined
  const accountantInviteToken = params.get("invite") || undefined
  const isAccountantInvite =
    params.get("role") === "accountant" &&
    Boolean(referralCode) &&
    Boolean(accountantInviteToken)

  return {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    companyName: input.companyName,
    companySize: "1-10",
    businessType: "Services",
    branchCount: "1",
    primaryPain: "Accounting cleanup",
    setupRole: isAccountantInvite ? "accountant" : "owner",
    industry: "Services",
    country: "Cameroon",
    countryCode: "CM",
    currency: "XAF",
    timezone: "Africa/Douala",
    defaultLocale: "en",
    firstBranchName: "Main branch",
    requestedModules: ["Accounting"],
    assistedSetupRequested: false,
    onboardingSource: "aqstoqflow-register-v2",
    referralCode,
    accountantInviteToken,
    accountantInviteAccepted: input.accountantInviteAccepted,
    password: "Q7!vL2#pR9@xT4$z",
    confirmPassword: "Q7!vL2#pR9@xT4$z",
    termsAccepted: true,
  }
}

async function main() {
  const databaseName = requireSafeDatabaseUrl()
  const runId = "registration-handoff-v1"
  const now = new Date("2026-08-09T18:00:00.000Z")
  const restoreClock = installFixedClock(now)
  const revokedAt = new Date("2026-08-09T18:00:01.000Z")
  const periodEnd = new Date(now.getTime() - 1_000)
  const consentEvidenceHash = sha256Evidence("referral-smoke:" + runId)
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    throw new Error("External network is disabled for the referral fixture")
  }) as typeof fetch

  const [{ db }, backfill, statementService, deliveryService, accessService,
    recipientService, deliveryEnvelope, inviteService, inviteEnvelope,
    identityService, referralRoute] = await Promise.all([
    import("../prisma/db"),
    import("../services/accounting/customer-receivable-backfill.service"),
    import("../services/accounting/customer-statement.service"),
    import("../services/accounting/customer-statement-delivery.service"),
    import("../services/accounting/customer-statement-access.service"),
    import("../services/accounting/customer-statement-recipient-action.service"),
    import("../services/accounting/customer-statement-delivery-envelope"),
    import("../services/accounting/accountant-client-invite.service"),
    import("../services/accounting/accountant-client-invite-envelope"),
    import("../services/users/user-identity.service"),
    import("../app/api/referrals/[referralCode]/route"),
  ])

  try {
    const sourceOrganization = await db.organization.findUnique({
      where: { id: "cmp_org_001" },
      select: { id: true, currency: true },
    })

    const actor = await db.user.findFirst({
      where: { organizationId: sourceOrganization?.id, isActive: true },
      orderBy: { id: "asc" },
      select: { id: true },
    })
    assert(sourceOrganization && actor, "Seed fixture is missing")

    const sourceOrder = await db.salesOrder.findFirst({
      where: {
        organizationId: sourceOrganization.id,
        id: "cmp_org_001_sales_order_002",
        deletedAt: null,
        orderDate: {
          gte: new Date("2026-05-01T00:00:00.000Z"),
          lte: now,
        },
        total: { gt: 1 },
      },
      orderBy: [{ orderDate: "asc" }, { id: "asc" }],
      select: {
        id: true,
        customerId: true,
        orderDate: true,
        total: true,
      },
    })
    assert(sourceOrder, "Valid source order is missing")

    await db.customerLedgerEntry.updateMany({
      where: {
        organizationId: sourceOrganization.id,
        referenceType: "SALES_ORDER",
      },
      data: { referenceType: "SEED_NON_RECEIVABLE" },
    })
    await db.customerLedgerEntry.updateMany({
      where: {
        organizationId: sourceOrganization.id,
        description: "Dedicated referral smoke receivable",
      },
      data: { referenceType: "SEED_NON_RECEIVABLE" },
    })


    await db.customerLedgerEntry.deleteMany({
      where: { id: "referral_smoke_customer_ledger_" + runId },
    })

    await db.customerLedgerEntry.create({
      data: {
        id: "referral_smoke_customer_ledger_" + runId,
        organizationId: sourceOrganization.id,
        customerId: sourceOrder.customerId,
        entryDate: sourceOrder.orderDate,
        type: "SALE",
        debit: sourceOrder.total,
        credit: 0,
        balanceAfter: sourceOrder.total,
        description: "Dedicated referral smoke receivable",
        referenceType: "SALES_ORDER",
        referenceId: sourceOrder.id,
      },
    })


    const backfillResult = await backfill.backfillCustomerReceivableDocuments(
      {
        organizationId: sourceOrganization.id,
        actorId: actor.id,
        limit: 500,
      },
      db,
    )
    assert(backfillResult.readiness.status === "ready", "Receivable backfill is blocked")

    const receivable = await db.customerReceivableDocument.findFirst({
      where: {
        organizationId: sourceOrganization.id,
        sourceSalesOrderId: sourceOrder.id,
        lifecycleStates: { some: { unpaidAmount: { gt: 1 } } },
      },
      include: {
        lifecycleStates: {
          orderBy: [{ version: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
      },
      orderBy: { documentNumber: "asc" },
    })
    assert(receivable?.lifecycleStates[0], "Open synthetic receivable is missing")

    const statement = await statementService.createCustomerStatementSnapshot(
      {
        organizationId: sourceOrganization.id,
        customerId: receivable.customerId,
        periodStart: "2026-05-01T00:00:00.000Z",
        periodEnd: periodEnd.toISOString(),
        currency: sourceOrganization.currency,
        generatedById: actor.id,
        idempotencyKey: "referral-smoke-statement:" + runId,
        correlationId: "referral-smoke-statement-correlation:" + runId,
        now,
      },
      db,
    )
    assert(statement.itemCount > 0, "Statement contains no receivable evidence")
    assert(Number(statement.closingBalance) > 1, "Statement balance is not actionable")

    const destination = "customer.referral.smoke." + runId + "@example.test"
    const delivery = await deliveryService.queueCustomerStatementDelivery(
      {
        organizationId: sourceOrganization.id,
        statementSnapshotId: statement.statementId,
        issuedById: actor.id,
        channel: "EMAIL",
        destination,
        consentBasis: "EXPLICIT",
        consentEvidenceHash,
        consentCapturedAt: now,
        allowDispute: true,
        allowPromiseToPay: true,
        locale: "EN",
        tokenTtlSeconds: 30 * 24 * 60 * 60,
        idempotencyKey: "referral-smoke-delivery:" + runId,
        correlationId: "referral-smoke-delivery-correlation:" + runId,
        now,
        environment: process.env,
      },
      db,
    )
    const deliveryOutbox = await db.businessEventOutbox.findUnique({
      where: { id: delivery.outboxId },
      select: { payload: true },
    })
    const deliveryPayload = asRecord(deliveryOutbox?.payload)
    const sealedDelivery = deliveryPayload?.sealedEnvelope
    assert(typeof sealedDelivery === "string", "Sealed statement envelope is missing")
    const openedDelivery = deliveryEnvelope.openCustomerStatementDeliveryEnvelope(
      sealedDelivery,
      process.env,
    )
    assert(openedDelivery, "Statement delivery envelope cannot be opened")
    const statementUrl = new URL(openedDelivery.accessUrl)
    const statementToken = statementUrl.searchParams.get("token")
    assert(statementToken, "Statement token is missing from sealed provider envelope")

    const publicStatement = await accessService.getPublicCustomerStatement(
      {
        statementSnapshotId: statement.statementId,
        token: statementToken,
        now,
        ipAddress: "192.0.2.10",
        userAgent: "stoquify-referral-postgres-smoke/1.0",
      },
      db,
    )
    assert(publicStatement.controls.redacted, "Public statement is not redacted")
    assert(
      publicStatement.branding.referralCode === delivery.referralCode,
      "Statement branding lost referral attribution",
    )
    const externalJson = JSON.stringify(publicStatement)
    assert(!externalJson.includes(destination), "Public response leaked destination")
    assert(!externalJson.includes(statementToken), "Public response leaked access token")

    const publicPayload = asRecord(publicStatement.payload)
    const lines = Array.isArray(publicPayload?.lines) ? publicPayload.lines : []
    const line = asRecord(lines[0])
    const receivableId = line?.customerReceivableDocumentId
    assert(typeof receivableId === "string", "Public statement line is missing")

    const dispute = await recipientService.submitCustomerStatementRecipientAction(
      {
        statementSnapshotId: statement.statementId,
        token: statementToken,
        actionType: "DISPUTE",
        customerReceivableDocumentId: receivableId,
        requestedAmount: "1.00",
        note: "Synthetic PostgreSQL dispute proof",
        idempotencyKey: "referral-smoke-dispute:" + runId,
        correlationId: "referral-smoke-dispute-correlation:" + runId,
        now,
        ipAddress: "192.0.2.10",
        userAgent: "stoquify-referral-postgres-smoke/1.0",
      },
      db,
    )
    const promiseToPay = await recipientService.submitCustomerStatementRecipientAction(
      {
        statementSnapshotId: statement.statementId,
        token: statementToken,
        actionType: "PROMISE_TO_PAY",
        customerReceivableDocumentId: receivableId,
        requestedAmount: "1.00",
        promisedFor: new Date("2026-08-16T10:00:00.000Z"),
        note: "Synthetic PostgreSQL promise proof",
        idempotencyKey: "referral-smoke-promise:" + runId,
        correlationId: "referral-smoke-promise-correlation:" + runId,
        now,
        ipAddress: "192.0.2.10",
        userAgent: "stoquify-referral-postgres-smoke/1.0",
      },
      db,
    )
    const customerLinkInput = {
      ipAddress: "192.0.2.20",
      userAgent: "stoquify-referral-registration-fixture/1.0",
    }
    const customerRedirect = await openReferralLink(
      referralRoute,
      delivery.referralCode,
      customerLinkInput,
    )
    const customerRedirectReplay = await openReferralLink(
      referralRoute,
      delivery.referralCode,
      customerLinkInput,
    )
    const customerRegistrationLocation =
      customerRedirect.headers.get("location")
    assert(
      customerRedirect.status === 307 &&
        customerRedirectReplay.status === 307 &&
        customerRegistrationLocation &&
        customerRedirectReplay.headers.get("location") ===
          customerRegistrationLocation,
      "Customer statement referral did not redirect deterministically",
    )
    assert(
      new URL(customerRegistrationLocation).searchParams.get("ref") ===
        delivery.referralCode,
      "Customer statement referral code was not preserved",
    )

    const customerEmail = "customer.referral.registration@example.test"
    const customerCompanyName = "Referral Customer Fixture Ltd"
    const customerRegistration =
      await identityService.registerOrganizationAccount(
        registrationInput({
          location: customerRegistrationLocation,
          firstName: "Customer",
          lastName: "Referral",
          email: customerEmail,
          phone: "+237670000101",
          companyName: customerCompanyName,
        }),
        { ipAddress: "192.0.2.21" },
      )
    assert(
      customerRegistration.success && customerRegistration.data,
      "Customer referral registration did not create an organization",
    )
    const customerOrganization = await db.organization.findUnique({
      where: { id: customerRegistration.data.organizationId },
      select: { id: true, name: true, onboardingSource: true },
    })
    assert(
      customerOrganization?.name === customerCompanyName &&
        customerOrganization.onboardingSource ===
          "aqstoqflow-register-v2",
      "Customer referral created the wrong organization",
    )

    const accountantEmail = "accountant.referral.registration@example.test"
    const accountantCompanyName = "Referral Accountant Fixture LLP"
    const invited = await inviteService.inviteOrGrantAccountantAccess(
      sourceOrganization.id,
      actor.id,
      {
        accountantEmail,
        accountantFirmName: "Stoquify Referral Smoke LLP",
        role: "REVIEWER",
        consentEvidenceHash,
        expiresAt: new Date("2030-12-31T23:59:59.000Z"),
        correlationId: "referral-smoke-accountant-correlation:" + runId,
        idempotencyKey: "referral-smoke-accountant:" + runId,
        locale: "EN",
        environment: process.env,
      },
      now,
    )
    assert(invited.outcome === "INVITED", "Net-new accountant was not invited")
    const inviteOutbox = await db.businessEventOutbox.findUnique({
      where: { id: invited.invite.outboxId },
      select: { payload: true },
    })
    const invitePayload = asRecord(inviteOutbox?.payload)
    const sealedInvite = invitePayload?.sealedEnvelope
    assert(typeof sealedInvite === "string", "Sealed accountant envelope is missing")
    const openedInvite = inviteEnvelope.openAccountantClientInviteEnvelope(
      sealedInvite,
      process.env,
    )
    assert(openedInvite, "Accountant invite envelope cannot be opened")
    const inviteUrl = new URL(openedInvite.inviteUrl)
    const inviteToken = inviteUrl.searchParams.get("invite")
    assert(inviteToken, "Secret-bound accountant invite token is missing")

    const missingTokenRedirect = await openReferralLink(
      referralRoute,
      invited.invite.referralCode,
      {
        ipAddress: "192.0.2.30",
        userAgent: "stoquify-referral-registration-fixture/1.0",
      },
    )
    const invalidInviteToken = "x".repeat(43)
    const invalidTokenRedirect = await openReferralLink(
      referralRoute,
      invited.invite.referralCode,
      {
        inviteToken: invalidInviteToken,
        ipAddress: "192.0.2.31",
        userAgent: "stoquify-referral-registration-fixture/1.0",
      },
    )
    assert(
      missingTokenRedirect.status === 404 &&
        invalidTokenRedirect.status === 404,
      "Missing or invalid accountant invite tokens were accepted by the link",
    )

    const accountantRegistrationBase = {
      firstName: "Referral",
      lastName: "Accountant",
      email: accountantEmail,
      phone: "+237670000102",
      companyName: accountantCompanyName,
    }
    const missingTokenRegistrationLocation = new URL(
      "/register-v2?ref=" +
        encodeURIComponent(invited.invite.referralCode) +
        "&role=accountant",
      process.env.NEXT_PUBLIC_BASE_URL,
    ).toString()
    let missingTokenRegistrationDenied = false
    try {
      const result = await identityService.registerOrganizationAccount(
        registrationInput({
          ...accountantRegistrationBase,
          location: missingTokenRegistrationLocation,
          accountantInviteAccepted: false,
        }),
        { ipAddress: "192.0.2.32" },
      )
      missingTokenRegistrationDenied = !result.success
    } catch {
      missingTokenRegistrationDenied = true
    }
    assert(
      missingTokenRegistrationDenied,
      "Registration accepted a missing accountant invite token",
    )

    const invalidTokenRegistrationLocation = new URL(
      "/register-v2?ref=" +
        encodeURIComponent(invited.invite.referralCode) +
        "&role=accountant&invite=" +
        invalidInviteToken,
      process.env.NEXT_PUBLIC_BASE_URL,
    ).toString()
    let invalidTokenRegistrationDenied = false
    try {
      const result = await identityService.registerOrganizationAccount(
        registrationInput({
          ...accountantRegistrationBase,
          location: invalidTokenRegistrationLocation,
          accountantInviteAccepted: true,
        }),
        { ipAddress: "192.0.2.33" },
      )
      invalidTokenRegistrationDenied = !result.success
    } catch {
      invalidTokenRegistrationDenied = true
    }
    assert(
      invalidTokenRegistrationDenied,
      "Registration accepted an invalid accountant invite token",
    )
    assert(
      await db.organization.count({
        where: { name: accountantCompanyName },
      }) === 0,
      "Rejected accountant registrations leaked an organization",
    )

    const accountantLinkInput = {
      inviteToken,
      ipAddress: "192.0.2.34",
      userAgent: "stoquify-referral-registration-fixture/1.0",
    }
    const accountantRedirect = await openReferralLink(
      referralRoute,
      invited.invite.referralCode,
      accountantLinkInput,
    )
    const accountantRedirectReplay = await openReferralLink(
      referralRoute,
      invited.invite.referralCode,
      accountantLinkInput,
    )
    const accountantRegistrationLocation =
      accountantRedirect.headers.get("location")
    assert(
      accountantRedirect.status === 307 &&
        accountantRedirectReplay.status === 307 &&
        accountantRegistrationLocation &&
        accountantRedirectReplay.headers.get("location") ===
          accountantRegistrationLocation,
      "Valid accountant invite did not redirect deterministically",
    )
    const accountantRegistrationParams =
      new URL(accountantRegistrationLocation).searchParams
    assert(
      accountantRegistrationParams.get("ref") ===
        invited.invite.referralCode &&
        accountantRegistrationParams.get("role") === "accountant" &&
        accountantRegistrationParams.get("invite") === inviteToken,
      "Accountant registration handoff lost referral or token evidence",
    )

    const accountantRegistration =
      await identityService.registerOrganizationAccount(
        registrationInput({
          ...accountantRegistrationBase,
          location: accountantRegistrationLocation,
          accountantInviteAccepted: true,
        }),
        { ipAddress: "192.0.2.35" },
      )
    assert(
      accountantRegistration.success && accountantRegistration.data,
      "Valid accountant invite did not create an organization",
    )
    const accountantOrganization = await db.organization.findUnique({
      where: { id: accountantRegistration.data.organizationId },
      select: { id: true, name: true, onboardingSource: true },
    })
    assert(
      accountantOrganization?.name === accountantCompanyName &&
        accountantOrganization.onboardingSource ===
          "aqstoqflow-register-v2",
      "Accountant invite created the wrong organization",
    )
    const acceptedInviteState = await db.accountantClientInviteState.findFirst({
      where: {
        inviteId: invited.invite.id,
        status: "ACCEPTED",
        accountantUserId: accountantRegistration.data.userId,
      },
      select: { accessGrantId: true },
    })
    const accountantGrant = acceptedInviteState?.accessGrantId
      ? await db.accountantAccessGrant.findUnique({
          where: { id: acceptedInviteState.accessGrantId },
          select: {
            organizationId: true,
            accountantUserId: true,
            status: true,
          },
        })
      : null
    assert(
      accountantGrant?.organizationId === sourceOrganization.id &&
        accountantGrant.accountantUserId ===
          accountantRegistration.data.userId &&
        accountantGrant.status === "ACTIVE",
      "Valid accountant invite did not activate client access",
    )
    await accessService.revokeCustomerStatementAccessToken(
      {
        organizationId: sourceOrganization.id,
        tokenId: delivery.tokenId,
        revokedById: actor.id,
        reason: "Synthetic PostgreSQL revocation proof",
        now: revokedAt,
      },
      db,
    )
    let revokedTokenDenied = false
    try {
      await accessService.getPublicCustomerStatement(
        {
          statementSnapshotId: statement.statementId,
          token: statementToken,
          now: revokedAt,
        },
        db,
      )
    } catch {
      revokedTokenDenied = true
    }
    assert(revokedTokenDenied, "Revoked statement token still grants access")

    const statementAccessLogs = await db.customerStatementAccessLog.count({
      where: { statementSnapshotId: statement.statementId },
    })
    const [
      customerClickCount,
      customerConversionCount,
      accountantClickCount,
      accountantConversionCount,
    ] = await Promise.all([
      db.referralAttributionEvent.count({
        where: {
          attributionId: delivery.attributionId,
          eventType: "CLICK",
        },
      }),
      db.referralAttributionEvent.count({
        where: {
          attributionId: delivery.attributionId,
          eventType: "CONVERSION",
        },
      }),
      db.referralAttributionEvent.count({
        where: {
          attributionId: invited.invite.attributionId,
          eventType: "CLICK",
        },
      }),
      db.referralAttributionEvent.count({
        where: {
          attributionId: invited.invite.attributionId,
          eventType: "CONVERSION",
        },
      }),
    ])
    assert(
      customerClickCount === 1 &&
        customerConversionCount === 1 &&
        accountantClickCount === 1 &&
        accountantConversionCount === 1,
      "Referral journeys did not persist exactly one click and conversion",
    )

    const [customerClickEvidence, accountantClickEvidence] = await Promise.all([
      db.referralAttributionEvent.findFirst({
        where: {
          attributionId: delivery.attributionId,
          eventType: "CLICK",
        },
        select: {
          subjectHash: true,
          payloadHash: true,
          metadata: true,
        },
      }),
      db.referralAttributionEvent.findFirst({
        where: {
          attributionId: invited.invite.attributionId,
          eventType: "CLICK",
        },
        select: {
          subjectHash: true,
          payloadHash: true,
          metadata: true,
        },
      }),
    ])
    for (const evidence of [
      customerClickEvidence,
      accountantClickEvidence,
    ]) {
      assert(
        evidence &&
          typeof evidence.subjectHash === "string" &&
          /^[0-9a-f]{64}$/.test(evidence.subjectHash) &&
          /^[0-9a-f]{64}$/.test(evidence.payloadHash),
        "Referral click evidence is not privacy bounded",
      )
      const serialized = JSON.stringify(evidence)
      assert(
        !serialized.includes("192.0.2.") &&
          !serialized.includes(
            "stoquify-referral-registration-fixture/1.0",
          ),
        "Referral click evidence leaked request metadata",
      )
    }

    const [customerConversionEvidence, accountantConversionEvidence] =
      await Promise.all([
        db.referralAttributionEvent.findFirst({
          where: {
            attributionId: delivery.attributionId,
            eventType: "CONVERSION",
          },
          select: {
            targetOrganizationId: true,
            subjectHash: true,
            metadata: true,
          },
        }),
        db.referralAttributionEvent.findFirst({
          where: {
            attributionId: invited.invite.attributionId,
            eventType: "CONVERSION",
          },
          select: {
            targetOrganizationId: true,
            subjectHash: true,
            metadata: true,
          },
        }),
      ])
    assert(
      customerConversionEvidence?.targetOrganizationId ===
        customerRegistration.data.organizationId &&
        accountantConversionEvidence?.targetOrganizationId ===
          accountantRegistration.data.organizationId &&
        /^[0-9a-f]{64}$/.test(
          customerConversionEvidence.subjectHash ?? "",
        ) &&
        /^[0-9a-f]{64}$/.test(
          accountantConversionEvidence.subjectHash ?? "",
        ) &&
        !JSON.stringify(customerConversionEvidence).includes(customerEmail) &&
        !JSON.stringify(accountantConversionEvidence).includes(
          accountantEmail,
        ),
      "Referral conversion evidence is missing, misattributed, or unbounded",
    )

    const summary = {
      status: "ready",
      database: databaseName,
      fixture: runId,
      receivableBackfillStatus: backfillResult.readiness.status,
      receivableDocumentsProcessed: backfillResult.processed.length,
      statement: {
        id: statement.statementId,
        contentHashPrefix: statement.contentHash.slice(0, 16),
        itemCount: statement.itemCount,
        closingBalance: statement.closingBalance,
      },
      publicAccess: {
        redacted: publicStatement.controls.redacted,
        accessLogCount: statementAccessLogs,
        revokedTokenDenied,
      },
      recipientActions: {
        dispute: dispute.status,
        promiseToPay: promiseToPay.status,
      },
      referrals: {
        eventCount:
          customerClickCount +
          customerConversionCount +
          accountantClickCount +
          accountantConversionCount,
        privacyBounded: true,
        customerStatement: {
          clickCount: customerClickCount,
          conversionCount: customerConversionCount,
          organizationId: customerRegistration.data.organizationId,
        },
        accountantInvite: {
          clickCount: accountantClickCount,
          conversionCount: accountantConversionCount,
          missingTokenLinkDenied: missingTokenRedirect.status === 404,
          invalidTokenLinkDenied: invalidTokenRedirect.status === 404,
          missingTokenRegistrationDenied,
          invalidTokenRegistrationDenied,
          accepted: accountantGrant?.status === "ACTIVE",
          organizationId: accountantRegistration.data.organizationId,
        },
      },
    }
    console.log(JSON.stringify(summary, null, 2))
  } finally {
    globalThis.fetch = originalFetch
    restoreClock()
    await db.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
