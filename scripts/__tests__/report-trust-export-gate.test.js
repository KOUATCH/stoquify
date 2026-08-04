const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  buildReportTrustExportReadiness,
  gateResultForReport,
} = require("../report-trust-export-gate")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "report-trust-export-gate-"))
}

function write(root, relativePath, source) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, source, "utf8")
}

function verifiedFreshAuthActionSource(options = {}) {
  const authStatement = options.syntheticAuth
    ? "const lastAuthAt = new Date()"
    : "const lastAuthAt = verifiedFreshAuthTime(ctx)"
  const accessStatement =
    'const access = await resolveAccountantClientAccess({ capability: "EXPORT" })'
  const orderedStatements = options.resolutionBeforeAuth
    ? `${accessStatement}\n        ${authStatement}`
    : `${authStatement}\n        ${accessStatement}`
  const unrelatedCurrentTime = options.unrelatedCurrentTime
    ? "function unrelatedExport() { return { lastAuthAt: new Date() } }"
    : ""
  const spreadFreshAuth = options.spreadFreshAuth ? "...ctx.freshAuth," : ""
  const returnBeforeGuard = options.returnBeforeGuard
    ? "return freshAuth.lastAuthAt"
    : ""

  return `
    const exportTrustPack = protect(
      {
        permission: "accounting.exports.create",
        freshAuth: { maxAgeSeconds: 300 },
      },
      async (input, ctx) => {
        ${orderedStatements}
        return exportAccountantTrustPack({
          ${spreadFreshAuth}
          organizationId: access.organizationId,
          lastAuthAt,
        })
      },
    )

    function verifiedFreshAuthTime(ctx: ProtectedActionContext): Date {
      const freshAuth = ctx.freshAuth
      ${returnBeforeGuard}
      if (
        !freshAuth ||
        freshAuth.claims.userId !== ctx.userId ||
        freshAuth.claims.tenantId !== ctx.orgId ||
        freshAuth.claims.assuranceOrganizationId !== ctx.orgId ||
        !Number.isFinite(freshAuth.claims.assuranceLevel) ||
        freshAuth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD ||
        freshAuth.claims.lastAuthAt !== freshAuth.lastAuthAt.getTime()
      ) {
        throw new FreshAuthRequiredError()
      }
      return freshAuth.lastAuthAt
    }

    ${unrelatedCurrentTime}
  `
}

function verifiedClosePackActionSource(options = {}) {
  const authDeclaration = options.reassignAuth ? "let" : "const"
  const authStatement = options.syntheticAuth
    ? "const lastAuthAt = new Date()"
    : `${authDeclaration} lastAuthAt = verifiedCloseFreshAuthTime(ctx)`
  const parseStatement =
    "const parsed = exportClosePackInputSchema.parse(input)"
  const orderedStatements = options.parseBeforeAuth
    ? `${parseStatement}\n        ${authStatement}`
    : `${authStatement}\n        ${parseStatement}`
  const controlSpread = options.spreadControl ? "...ctx.freshAuth," : ""
  const timestamp = options.directContextTimestamp
    ? "lastAuthAt: ctx.freshAuth.lastAuthAt,"
    : "lastAuthAt,"
  const preAuthParse = options.preAuthParse
    ? "const attackerParsed = exportClosePackInputSchema.parse(input)"
    : ""
  const authReplacement = options.reassignAuth
    ? "lastAuthAt = new Date(input.lastAuthAt)"
    : ""
  const guardBypass = options.guardBypass
    ? "if (ctx) return freshAuth.lastAuthAt"
    : ""
  const wrapperReturn = options.bypassWrapper
    ? "return null"
    : "return exportCertifiedPack(input)"
  const protectedDeclaration = options.reassignProtectedAction ? "let" : "const"
  const protectedReplacement = options.reassignProtectedAction
    ? "exportCertifiedPack = async () => null"
    : ""
  const freshAuthDeclaration = options.reassignFreshAuth ? "let" : "const"
  const freshAuthReplacement = options.reassignFreshAuth
    ? "freshAuth = ctx.forgedFreshAuth"
    : ""

  return `
    ${protectedDeclaration} exportCertifiedPack = protect(
      {
        permission: "accounting.close.certify",
        freshAuth: { maxAgeSeconds: 300 },
      },
      async (input, ctx) => {
        ${preAuthParse}
        ${orderedStatements}
        ${authReplacement}
        const result = await exportClosePack(
          ctx.orgId,
          { ...parsed, mode: "CERTIFIED" },
          {
            ${controlSpread}
            actorId: ctx.userId,
            actorPermissions: ctx.permissions,
            ${timestamp}
          },
        )
        return result
      },
    )
    ${protectedReplacement}

    export async function exportCertifiedClosePackAction(input: unknown) {
      ${wrapperReturn}
    }

    function verifiedCloseFreshAuthTime(
      ctx: ProtectedActionContext,
    ): Date {
      ${freshAuthDeclaration} freshAuth = ctx.freshAuth
      ${freshAuthReplacement}
      if (
        !freshAuth ||
        freshAuth.claims.userId !== ctx.userId ||
        freshAuth.claims.tenantId !== ctx.orgId ||
        freshAuth.claims.assuranceOrganizationId !== ctx.orgId ||
        !Number.isFinite(freshAuth.claims.assuranceLevel) ||
        freshAuth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD ||
        freshAuth.claims.lastAuthAt !== freshAuth.lastAuthAt.getTime()
      ) {
        ${guardBypass}
        throw new FreshAuthRequiredError()
      }
      return freshAuth.lastAuthAt
    }
    ${verifiedCloseWaiverActionSource(options.waiverOptions)}
    ${verifiedMissingProofActionSource(options.missingProofOptions)}
  `
}

function verifiedCloseWaiverActionSource(options = {}) {
  const binding = options.mutableBinding ? "let" : "const"
  const authStatement = options.syntheticAuth
    ? "const lastAuthAt = Date.now()"
    : "const lastAuthAt = verifiedCloseFreshAuthTime(ctx)"
  const parseStatement =
    "const parsed = approveCloseWaiverInputSchema.parse(input)"
  const orderedStatements = options.parseBeforeAuth
    ? `${parseStatement}\n        ${authStatement}`
    : `${authStatement}\n        ${parseStatement}`
  const freshAuth = options.booleanFreshAuth
    ? "freshAuth: true,"
    : "freshAuth: { maxAgeSeconds: 300 },"
  const controlSpread = options.spreadControl ? "...ctx.freshAuth," : ""
  const timestamp = options.directTimestamp
    ? "lastAuthAt: ctx.freshAuth.lastAuthAt,"
    : "lastAuthAt,"
  const evidenceActorId = options.mismatchedEvidenceActor
    ? "ctx.otherUserId"
    : "ctx.userId"
  const evidenceOrganizationId = options.mismatchedEvidenceOrganization
    ? "ctx.otherOrgId"
    : "ctx.orgId"
  const replacement = options.mutableBinding
    ? "approveWaiver = async () => null"
    : ""
  const wrapperReturn = options.bypassWrapper
    ? "return null"
    : "return approveWaiver(input)"

  return `
    ${binding} approveWaiver = protect(
      {
        permission: "accounting.close.waiver.approve",
        auditResource: "CloseAssuranceFinding",
        auditAllowed: true,
        ${freshAuth}
      },
      async (input, ctx) => {
        ${orderedStatements}
        const result = await approveCloseWaiver(ctx.orgId, parsed, {
          ${controlSpread}
          actorId: ctx.userId,
          actorPermissions: ctx.permissions,
          freshAuth: {
            actorId: ${evidenceActorId},
            organizationId: ${evidenceOrganizationId},
            ${timestamp}
          },
        })
        revalidateClosePaths()
        return result
      },
    )
    ${replacement}

    export async function approveCloseWaiverAction(input: unknown) {
      ${wrapperReturn}
    }
  `
}

function verifiedMissingProofActionSource(options = {}) {
  const binding = options.mutableBinding ? "let" : "const"
  const permission = options.wrongPermission
    ? "accounting.close.review"
    : "accounting.close.evidence.request"
  const organization = options.inputOrganization
    ? "parsed.organizationId"
    : "ctx.orgId"
  const actor = options.inputActor ? "parsed.actorId" : "ctx.userId"
  const spread = options.spreadControl ? "...parsed.control," : ""
  const revalidate = options.missingRevalidate
    ? ""
    : "revalidateClosePaths(result.periodId)"
  const wrapper = options.bypassWrapper
    ? "return null"
    : "return requestMissingEvidence(input)"

  return `
    ${binding} requestMissingEvidence = protect(
      {
        permission: "${permission}",
        auditResource: "AccountantComment",
        auditAllowed: true,
      },
      async (input, ctx) => {
        const parsed = requestMissingCloseEvidenceInputSchema.parse(input)
        const result = await requestMissingCloseEvidence(
          ${organization},
          parsed,
          {
            ${spread}
            actorId: ${actor},
            actorPermissions: ctx.permissions,
          },
        )
        ${revalidate}
        return result
      },
    )

    export async function requestMissingCloseEvidenceAction(input: unknown) {
      ${wrapper}
    }
  `
}

function verifiedCloseWaiverServiceSource(options = {}) {
  const maxAge = options.weakenMaxAge ? "10 * 60 * 1000" : "5 * 60 * 1000"
  const policyConditions = [
    ...(options.allowMissingActor ? [] : ["!actorId"]),
    "!freshAuth",
    ...(options.allowActorMismatch ? [] : ["freshAuth.actorId !== actorId"]),
    ...(options.allowOrganizationMismatch
      ? []
      : ["freshAuth.organizationId !== organizationId"]),
    "!Number.isFinite(nowTime)",
    "!Number.isFinite(lastAuthAt)",
    "lastAuthAt <= 0",
    ...(options.allowFuture ? [] : ["lastAuthAt > nowTime"]),
    ...(options.allowStale
      ? []
      : ["nowTime - lastAuthAt > CLOSE_WAIVER_FRESH_AUTH_MAX_AGE_MS"]),
  ].join(" ||\n        ")
  const serviceClock = options.callerControlledClock
    ? "control.now instanceof Date ? control.now : new Date(control.now)"
    : "new Date()"
  const actorResolution = options.missingPreflight
    ? "const actorId = control.actorId"
    : "const actorId = requireFreshWaiverControl(organizationId, control, now)"
  const errorCode = options.wrongErrorCode
    ? "OTHER_ERROR"
    : "FRESH_AUTH_REQUIRED"
  const approvalTime = options.syntheticApprovalTime ? "new Date()" : "now"
  const approvalActor = options.nullApprover ? "null" : "actorId"
  const clockMutation = options.reassignClock
    ? "now = new Date(0)"
    : options.mutateClock
      ? "now.setTime(0)"
      : ""

  return `
    const CLOSE_WAIVER_FRESH_AUTH_MAX_AGE_MS = ${maxAge}

    function requireFreshWaiverControl(organizationId, control, now) {
      const actorId = control.actorId
      const freshAuth = control.freshAuth
      const rawLastAuthAt = freshAuth?.lastAuthAt
      const lastAuthAt =
        rawLastAuthAt instanceof Date
          ? rawLastAuthAt.getTime()
          : rawLastAuthAt === null || rawLastAuthAt === undefined
            ? Number.NaN
            : new Date(rawLastAuthAt).getTime()
      const nowTime = now.getTime()
      if (
        ${policyConditions}
      ) {
        throw new BusinessRuleError(
          "Fresh authentication is required to approve a close waiver.",
          "${errorCode}",
        )
      }
      return actorId
    }

    export async function approveCloseWaiver(
      organizationId,
      input,
      control = {},
    ) {
      const now = ${serviceClock}
      ${actorResolution}
      const correlationId = input.correlationId ?? randomUUID()
      return db.$transaction(async (tx) => {
        ${clockMutation}
        await tx.closeAssuranceFinding.update({
          data: {
            waiverApprovedById: ${approvalActor},
            waiverApprovedAt: ${approvalTime},
          },
        })
      })
    }
    ${verifiedMissingProofServiceSource(options.missingProofOptions)}
  `
}

function missingProofServiceOperationSource(options = {}) {
  const capability = options.readCapability ? "READ" : "REVIEW"
  const organization = options.inputOrganization
    ? "input.organizationId"
    : "access.organizationId"
  const existing = options.missingIdempotency
    ? "const existing = null"
    : "const existing = await tx.accountantComment.findFirst({ where: { organizationId, findingId: input.findingId, correlationId, visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY } })"
  const missingEvidence = options.skipMissingEvidence
    ? "const hasMissingEvidence = true"
    : "const hasMissingEvidence = finding.evidenceItems.length > 0 || finding.checklistItem?.status === CloseChecklistStatus.UNAVAILABLE || finding.checklistItem?.evidenceCount === 0"
  const recipientScope = options.unscopedRecipient
    ? "id: input.requestedFromId"
    : "id: input.requestedFromId, organizationId, isActive: true"
  const visibility = options.untypedComment
    ? '"CLIENT_ACTION_REQUIRED"'
    : "MISSING_CLOSE_EVIDENCE_VISIBILITY"
  const requestType = options.untypedComment
    ? '"MISSING_CLOSE_EVIDENCE"'
    : "MISSING_CLOSE_EVIDENCE_REQUEST_TYPE"
  const audit = options.missingAudit
    ? ""
    : 'await auditCloseWorkflow(tx, { organizationId, actorId, action: "CLOSE_MISSING_EVIDENCE_REQUESTED", resourceType: "AccountantComment" })'
  const event = options.missingEvent
    ? ""
    : 'await recordCloseWorkflowEventInTx(tx, { organizationId, actorId, eventType: "close.assurance.missing_evidence.requested", ownerId: recipient.id, dueAt, payload: { requestType: MISSING_CLOSE_EVIDENCE_REQUEST_TYPE } })'

  return `
    const access = await resolveAccountantClientAccess({
      homeOrganizationId,
      clientOrganizationId: input.clientOrganizationId,
      accountantUserId: actorId,
      capability: "${capability}",
      now,
      client: tx,
    })
    const organizationId = ${organization}
    ${existing}
    if (existing) {
      return assertMatchingMissingCloseEvidenceReplay(
        existing,
        input,
        actorId,
        dueAt,
      )
    }
    const finding = await tx.closeAssuranceFinding.findFirst({
      where: { id: input.findingId, organizationId },
      include: {
        checklistItem: { select: { status: true, evidenceCount: true } },
        evidenceItems: {
          where: { available: false },
          select: { id: true },
          take: 1,
        },
      },
    })
    if (!finding) throw new NotFoundError("not found")
    if (
      finding.status === CloseFindingStatus.RESOLVED ||
      finding.status === CloseFindingStatus.WAIVED_WITH_APPROVAL
    ) {
      throw new BusinessRuleError("terminal")
    }
    ${missingEvidence}
    if (!hasMissingEvidence) throw new BusinessRuleError("not missing")
    const recipient = await tx.user.findFirst({
      where: { ${recipientScope} },
    })
    if (!recipient) throw new BusinessRuleError("recipient")
    await tx.closeAssuranceFinding.update({
      where: { id: finding.id },
      data: {
        ownerId: recipient.id,
        assignedById: actorId,
        assignedAt: now,
        dueAt,
        status: CloseFindingStatus.ASSIGNED,
        correlationId,
      },
    })
    const comment = await tx.accountantComment.create({
      data: {
        organizationId,
        periodId: finding.periodId,
        closeRunId: finding.closeRunId,
        findingId: finding.id,
        authorId: actorId,
        body: input.requestText,
        visibility: ${visibility},
        correlationId,
        metadata: jsonObject({
          requestType: ${requestType},
          requestedFromId: recipient.id,
        }),
      },
    })
    ${audit}
    ${event}
    return comment
  `
}

function verifiedMissingProofServiceSource(options = {}) {
  const clock = options.callerClock ? "new Date(control.now)" : "new Date()"
  const transaction = options.nonAtomic
    ? "return operation(db)"
    : `return await db.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        })`

  return `
    import { MISSING_CLOSE_EVIDENCE_REQUEST_TYPE, MISSING_CLOSE_EVIDENCE_VISIBILITY } from "./missing-close-evidence-request-queue-contracts"

    function assertMatchingMissingCloseEvidenceReplay() {}

    async function runMissingCloseEvidenceTransaction(operation) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          ${transaction}
        } catch (error) {
          const code = getPrismaKnownRequest(error)?.code
          if (attempt === 2 || (code !== "P2034" && code !== "P2002")) {
            throw error
          }
        }
      }
      throw new BusinessRuleError("transaction failed")
    }

    export async function requestMissingCloseEvidence(
      homeOrganizationId,
      input,
      control = {},
    ) {
      const actorId = control.actorId?.trim()
      if (!actorId) {
        throw new BusinessRuleError("actor required")
      }
      const now = ${clock}
      const dueAt = new Date(input.dueAt.getTime())
      if (
        !Number.isFinite(dueAt.getTime()) ||
        dueAt.getTime() <= now.getTime()
      ) {
        throw new BusinessRuleError("future due date required")
      }
      const correlationId = input.correlationId ?? randomUUID()
      return runMissingCloseEvidenceTransaction(async (tx) => {
        ${missingProofServiceOperationSource(options)}
      })
    }
  `
}

function accountantAccessServiceSource(options = {}) {
  const capabilityType = options.missingReviewCapability
    ? 'type AccessCapability = "READ" | "EXPORT"'
    : 'type AccessCapability = "READ" | "EXPORT" | "REVIEW"'
  const reviewGuard = options.missingReviewGuard
    ? ""
    : `if (
        input.capability === "REVIEW" &&
        grant.role === AccountantAccessRole.READ_ONLY
      ) {
        throw new ForbiddenError(
          "Read-only grant cannot request client work",
        )
      }`
  const staleGuard = options.missingStaleGuard
    ? ""
    : `if (input.expiresAt <= now) {
        throw new BusinessRuleError("expiry must be in the future")
      }`
  const scheduledResult = options.misclassifiesFuture ? "EXPIRED" : "SCHEDULED"
  const expiredRevoke = options.misleadingExpiredRevocation
    ? `if (existing.expiresAt <= now) {
        return updateRevokedGrant(existing)
      }`
    : `if (existing.expiresAt <= now) {
        await retireExpiredAccountantAccessGrantInTx(tx, organizationId, existing)
        return toDto(existing, now)
      }`

  const revokedStatusGuard = options.misclassifiesLegacyRevocation
    ? 'if (grant.status === AccountantAccessStatus.REVOKED) return "REVOKED"'
    : `if (
        grant.status === AccountantAccessStatus.REVOKED &&
        (grant.revokedAt === null || grant.revokedAt < grant.expiresAt)
      ) {
        return "REVOKED"
      }`
  const revocationTransition = options.unconditionalRevocation
    ? `const grant = await tx.accountantAccessGrant.update({
        data: { status: AccountantAccessStatus.REVOKED },
      })`
    : `const transition = await tx.accountantAccessGrant.updateMany({
        where: {
          id: existing.id,
          organizationId,
          status: AccountantAccessStatus.ACTIVE,
          activeScopeKey: organizationId + ":" + existing.accountantUserId,
          expiresAt: { gt: now },
        },
        data: { status: AccountantAccessStatus.REVOKED },
      })
      if (transition.count === 0) {
        const latest = await tx.accountantAccessGrant.findFirst({
          where: { id: input.grantId, organizationId },
        })
        return toDto(latest, now)
      }
      const grant = { ...existing, status: AccountantAccessStatus.REVOKED }`
  const organizationScope = options.missingTenantBoundary
    ? ""
    : `organizationId: targetOrganizationId,
          organization: {
            is: { isActive: true, deletedAt: null },
          },`

  return `
    ${capabilityType}
    type AccountantAccessGrantDto = {
      status: "ACTIVE" | "SCHEDULED" | "EXPIRED" | "REVOKED"
    }

    function effectiveStatus(grant, now) {
      ${revokedStatusGuard}
      if (grant.expiresAt <= now) return "EXPIRED"
      if (grant.status === AccountantAccessStatus.REVOKED) return "REVOKED"
      if (grant.effectiveFrom > now) return "${scheduledResult}"
      return "ACTIVE"
    }

    async function grantAccountantAccess(input, now) {
      const effectiveFrom = input.effectiveFrom ?? now
      ${staleGuard}
      if (input.expiresAt <= effectiveFrom) {
        throw new BusinessRuleError("expiry must follow effective date")
      }
      const accountant = await db.user.findUnique({ where: { email: input.accountantEmail } })
      return accountant
    }

    async function revokeAccountantAccess(organizationId, input, now) {
      return db.$transaction(async (tx) => {
        const existing = await tx.accountantAccessGrant.findFirst({
          where: { id: input.grantId, organizationId },
        })
        if (existing.status === AccountantAccessStatus.REVOKED) return toDto(existing, now)
        ${expiredRevoke}
        ${revocationTransition}
        await recordBusinessEventInTx(tx, {
          eventType: "ACCOUNTANT_ACCESS_REVOKED",
        })
        return grant
      })
    }

    const metadata = { consentContract: "explicit-client-consent.v1" }
    async function resolveAccountantClientAccess(input) {
      const targetOrganizationId =
        input.clientOrganizationId || input.homeOrganizationId
      if (targetOrganizationId === input.homeOrganizationId) {
        return {
          organizationId: targetOrganizationId,
          mode: "TENANT_MEMBER" as const,
          grant: null,
        }
      }

      const now = input.now ?? new Date()
      const client = input.client ?? db
      const grant = await client.accountantAccessGrant.findFirst({
        where: {
          ${organizationScope}
          accountantUserId: input.accountantUserId,
          status: AccountantAccessStatus.ACTIVE,
          effectiveFrom: { lte: now },
          expiresAt: { gt: now },
          activeScopeKey:
            targetOrganizationId + ":" + input.accountantUserId,
        },
      })
      if (!grant) {
        throw new ForbiddenError("No active client consent grants access")
      }
      if (
        input.capability === "EXPORT" &&
        grant.role === AccountantAccessRole.READ_ONLY
      ) {
        throw new ForbiddenError("Read-only grant cannot export")
      }
      ${reviewGuard}
      return {
        organizationId: targetOrganizationId,
        mode: "DELEGATED_ACCOUNTANT" as const,
        grant,
      }
    }
    function getAccountantPortfolio() {}
    const grantEvent = {
      eventType: "ACCOUNTANT_ACCESS_GRANTED",
      channel: "NOTIFICATION",
    }
    const accessMarkers = 'targetOrganizationId === input.homeOrganizationId organizationId: targetOrganizationId organization: { is: { isActive: true, deletedAt: null } } accountantUserId: input.accountantUserId effectiveFrom: { lte: now } expiresAt: { gt: now } No active client consent grants access input.capability === "EXPORT" AccountantAccessRole.READ_ONLY'
  `
}

function accountantAccessManagerSource(options = {}) {
  const revokeCondition = options.activeOnlyRevoke
    ? 'grant.status === "ACTIVE"'
    : '["ACTIVE", "SCHEDULED"].includes(grant.status)'
  const effectiveFrom = options.rawDateTimes
    ? 'formData.get("effectiveFrom")'
    : 'toAbsoluteIsoDateTime(formData.get("effectiveFrom"))'
  const expiresAt = options.rawDateTimes
    ? 'formData.get("expiresAt")'
    : 'toAbsoluteIsoDateTime(formData.get("expiresAt"))'
  return `
    function toAbsoluteIsoDateTime(value) {
      const parsed = new Date(value)
      return parsed.toISOString()
    }
    function AccountantAccessManager({ grant, formData }) {
      const effectiveFrom = ${effectiveFrom}
      const expiresAt = ${expiresAt}
      const canRevoke = ${revokeCondition}
      const result = { data: { status: "REVOKED" } }
      const message =
        result.data.status === "EXPIRED"
          ? "Accountant access had already expired."
          : "Accountant access revoked."
      return canRevoke ? (
        <time dateTime={grant.expiresAt} title={grant.expiresAt}>
          {message || effectiveFrom || expiresAt}
        </time>
      ) : null
    }
    const label = "Signed consent evidence hash"
  `
}
function accountantAccessActionsSource(options = {}) {
  const revokeOrganization = options.unscopedRevoke
    ? "input.organizationId"
    : "ctx.orgId"
  return `
    const grantAccess = protect(
      {
        permission: "accounting.close.accountant.invite",
        freshAuth: { maxAgeSeconds: 300 },
      },
      async (input, ctx) =>
        grantAccountantAccess(ctx.orgId, ctx.userId, input),
    )
    const revokeAccess = protect(
      {
        permission: "accounting.close.accountant.invite",
        freshAuth: { maxAgeSeconds: 300 },
      },
      async (input, ctx) =>
        revokeAccountantAccess(
          ${revokeOrganization},
          ctx.userId,
          input,
        ),
    )
  `
}
function verifiedMissingProofQueueContractsSource() {
  return `
    export const MISSING_CLOSE_EVIDENCE_REQUEST_TYPE =
      "MISSING_CLOSE_EVIDENCE" as const
    export const MISSING_CLOSE_EVIDENCE_VISIBILITY =
      "CLIENT_ACTION_REQUIRED" as const
    export const CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE = {
      kind: "CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE",
      readPermission: "accounting.close.read",
      maxItems: 100,
      redaction: "CLIENT_RECIPIENT_ONLY_NO_RAW_METADATA",
    } as const
    export type Queue = {
      controls: { rawMetadataExposed: false }
      blocker: {
        reason: "INVALID_REQUEST_EVIDENCE"
      }
    }
  `
}

function verifiedMissingProofQueueServiceSource() {
  return `
    const OPEN_FINDING_STATUSES = [
      CloseFindingStatus.OPEN,
      CloseFindingStatus.ASSIGNED,
      CloseFindingStatus.IN_REVIEW,
      CloseFindingStatus.REOPENED,
    ] as const

    export type GetClientMissingCloseEvidenceRequestQueueInput = Readonly<{
      organizationId: string;
      actorId: string;
      actorPermissions: readonly string[];
    }>

    export async function getClientMissingCloseEvidenceRequestQueue(
      input: GetClientMissingCloseEvidenceRequestQueueInput,
    ) {
      const organizationId = input.organizationId.trim()
      const actorId = input.actorId.trim()
      if (!hasRbacPermission(
        input.actorPermissions,
        CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.readPermission,
      )) throw new ForbiddenError()

      const actor = await db.user.findFirst({
        where: { id: actorId, organizationId, isActive: true },
      })
      if (!actor) throw new ForbiddenError()
      const generatedAt = new Date()
      const matchingComment: Prisma.AccountantCommentWhereInput = {
        organizationId,
        visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY,
        AND: [
          {
            metadata: {
              path: ["requestType"],
              equals: MISSING_CLOSE_EVIDENCE_REQUEST_TYPE,
            },
          },
          {
            metadata: {
              path: ["requestedFromId"],
              equals: actorId,
            },
          },
        ],
      }
      const findings = await db.closeAssuranceFinding.findMany({
        where: {
          organizationId,
          ownerId: actorId,
          status: { in: [...OPEN_FINDING_STATUSES] },
          comments: { some: matchingComment },
        },
        select: {
          comments: {
            where: matchingComment,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 1,
          },
        },
        take: CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.maxItems + 1,
      })
      const visibleFindings = findings.slice(
        0,
        CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.maxItems,
      )
      for (const finding of visibleFindings) {
        const comment = finding.comments[0]
        if (
          requestedById !== comment.authorId ||
          requestedFromId !== actorId ||
          correlationId !== comment.correlationId
        ) {
          blockers.push(invalidEvidenceBlocker(finding.id, requestId))
        }
        requests.push({
          actionPath:
            CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.actionPathPrefix,
        })
      }
      return {
        controls: { rawMetadataExposed: false },
        summary: {
          truncated:
            findings.length >
            CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.maxItems,
        },
      }
    }
  `
}

function verifiedMissingProofManagerContractsSource() {
  return `
    import type { ClientMissingCloseEvidenceRequestQueue } from "@/services/accounting/missing-close-evidence-request-queue-contracts"
    export type ClientMissingProofActionCenterSource =
      | {
          state: "AVAILABLE"
          queue: ClientMissingCloseEvidenceRequestQueue
          reason: null
        }
      | {
          state: "HIDDEN"
          queue: null
          reason: "RBAC_REQUIRED" | "MODULE_UNAVAILABLE"
        }
      | {
          state: "UNAVAILABLE"
          queue: null
          reason: "SOURCE_READ_FAILED"
        }
    export type ManagerActionCenterAction = {
      origin: "SIGNAL" | "ASSURANCE" | "ACCOUNTANT_REQUEST"
    }
    export type ManagerActionCenterData = {
      clientMissingProofSource: ClientMissingProofActionCenterSource | null
    }
    export type ComposeManagerActionCenterInput = {
      clientMissingProofSource?: ClientMissingProofActionCenterSource | null
    }
  `
}

function verifiedMissingProofManagerServiceSource() {
  return `
    import {
      CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE,
    } from "@/services/accounting/missing-close-evidence-request-queue-contracts"
    import {
      getClientMissingCloseEvidenceRequestQueue,
    } from "@/services/accounting/missing-close-evidence-request-queue.service"

    async function getClientMissingProofActionCenterSource(input) {
      if (!hasRbacPermission(
        input.actorPermissions,
        CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.readPermission,
      )) {
        return { state: "HIDDEN", queue: null, reason: "RBAC_REQUIRED" }
      }
      try {
        const access = await observeModuleAccess({
          organizationId: input.organizationId,
          userId: input.actorId,
          actorPermissions: input.actorPermissions,
          moduleSlug: "close_assurance",
          surface: "manager-action-center.client-missing-proof",
          mode: "enforce",
          audit: true,
        })
        if (!access.allowed) {
          return { state: "HIDDEN", queue: null, reason: "MODULE_UNAVAILABLE" }
        }
        const queue = await getClientMissingCloseEvidenceRequestQueue({
          organizationId: input.organizationId,
          actorId: input.actorId,
          actorPermissions: input.actorPermissions,
        })
        return { state: "AVAILABLE", queue, reason: null }
      } catch {
        return { state: "UNAVAILABLE", queue: null, reason: "SOURCE_READ_FAILED" }
      }
    }

    function getManagerActionCenterData() {
      const clientMissingProofSource =
        getClientMissingProofActionCenterSource(input)
      return composeManagerActionCenterData({
        clientMissingProofSource,
      })
    }

    function composeManagerActionCenterData(input) {
      const clientMissingProofActions = managerActionsFromClientMissingProof(
        input.clientMissingProofSource ?? null,
      )
      const additionalActions = [
        ...clientMissingProofActions,
      ]
      return {
        additionalActions,
        clientMissingProofSource: input.clientMissingProofSource ?? null,
      }
    }

    function managerActionsFromClientMissingProof(source) {
      if (!source || source.state === "HIDDEN") return []
      if (source.state === "UNAVAILABLE") {
        return [{
          origin: "ACCOUNTANT_REQUEST",
          detail: "The source-owned missing-proof queue could not be read.",
        }]
      }
      return [
        ...source.queue.requests.map((request) => ({
          origin: "ACCOUNTANT_REQUEST",
          field: "accountantComment.metadata",
          policy: CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.redaction,
        })),
        ...source.queue.blockers.map((blocker) => ({
          origin: "ACCOUNTANT_REQUEST",
          field: "accountantComment.metadata",
          policy: CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.redaction,
        })),
      ]
    }
  `
}

function writeReadyFixture(root) {
  write(
    root,
    "services/accounting/reports.service.ts",
    'await Promise.all getTrialBalance({ getGeneralLedger({ data: report schemaVersion: "accounting-report-export.v1" sourceTables: rowCount, filtersHash, currency, db.accountingPeriod.findFirst id: input.periodId, organizationId: input.organizationId periodStatus: period?.status balanceStatus redactionStatus: "NO_CONTACT_OR_AUTHENTICATION_FIELDS_INCLUDED" status: "INTERNAL_ACCOUNTING_REPORT_ONLY" Not a certified OHADA statutory filing function hashContent const contentHash = hashContent(payload) contentHash, certificationStatus: provenance.certification.status',
  )
  write(
    root,
    "actions/accounting/reports.actions.ts",
    'permission: "accounting.exports.create" freshAuth: { maxAgeSeconds: 300 } organizationId: ctx.orgId',
  )
  write(
    root,
    "services/analytics/financial-reports.service.ts",
    "currency: string getReportCurrency currency: input.currency select: { currency: true }",
  )
  write(
    root,
    "components/reports/report-trust-banner.tsx",
    "Currency: {provenance.currency} provenance.sourceTables provenance.knownBlockers",
  )
  write(
    root,
    "components/reports/financial-summary-report.tsx",
    "currency: report.provenance.currency",
  )
  write(
    root,
    "components/reports/cash-flow-report.tsx",
    "currency: report.provenance.currency",
  )
  write(
    root,
    "components/reports/cashier-performance-report.tsx",
    "currency: provenance!.currency",
  )
  write(
    root,
    "components/reports/item-performance-report.tsx",
    "currency: provenance!.currency",
  )
  write(
    root,
    "package.json",
    '{"scripts":{"report:trust:export:gate":"node gate","policy:gates":"npm run report:trust:export:gate"}}',
  )
  write(
    root,
    "services/accounting/data-trust.service.ts",
    'mode: "LEDGER_BACKED_DATA_TRUST" JournalEntryStatus.POSTED JournalEntryStatus.REVERSED provenance: "POSTED" "payroll_runs" "payroll_declarations" "fiscal_documents" "supplier_invoices" packVersion: "accountant-trust-pack.v1" eventType: "REPORT_EXPORT_CREATED" filtersHash: portal.source.scopeHash sourceTables: portal.source.sourceTables documentHash: contentHash',
  )
  write(
    root,
    "actions/accounting/data-trust.actions.ts",
    verifiedFreshAuthActionSource(),
  )
  write(
    root,
    "services/accounting/accountant-access.service.ts",
    accountantAccessServiceSource(),
  )
  write(
    root,
    "actions/accounting/accountant-access.actions.ts",
    accountantAccessActionsSource(),
  )
  write(
    root,
    "prisma/schema.prisma",
    "model AccountantAccessGrant consentEvidenceHash effectiveFrom expiresAt AccountantAccessRole",
  )
  write(
    root,
    "services/accounting/close-assurance-pack.service.ts",
    'INVENTORY_VALUATION_ANNEX "Tax/VAT"',
  )
  write(
    root,
    "services/accounting/close-assurance.service.ts",
    verifiedCloseWaiverServiceSource(),
  )
  write(
    root,
    "services/accounting/missing-close-evidence-request-queue-contracts.ts",
    verifiedMissingProofQueueContractsSource(),
  )
  write(
    root,
    "services/accounting/missing-close-evidence-request-queue.service.ts",
    verifiedMissingProofQueueServiceSource(),
  )
  write(
    root,
    "services/manager-action-center/manager-action-center-contracts.ts",
    verifiedMissingProofManagerContractsSource(),
  )
  write(
    root,
    "services/manager-action-center/manager-action-center.service.ts",
    verifiedMissingProofManagerServiceSource(),
  )
  write(
    root,
    "actions/accounting/close-assurance.actions.ts",
    verifiedClosePackActionSource(),
  )
  write(
    root,
    "components/accounting/AccountantPortfolio.tsx",
    "Accountant Client Portfolio clientOrganizationId=",
  )
  write(
    root,
    "components/accounting/AccountantAccessManager.tsx",
    accountantAccessManagerSource(),
  )
  write(
    root,
    "app/[locale]/(dashboard)/dashboard/accounting/accountant-portfolio/page.tsx",
    "Accountant Client Portfolio",
  )
  write(
    root,
    "app/[locale]/(dashboard)/dashboard/accounting/accountant-access/page.tsx",
    "Signed consent evidence hash",
  )
}

describe("report trust and export certification gate", () => {
  it("passes when report trust is service-owned and explicit", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const report = buildReportTrustExportReadiness(root, { mode: "fail" })
    expect(report.summary).toMatchObject({
      status: "ready",
      readyCount: 23,
      blockerCount: 0,
    })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })
  it.each([
    [
      "wrong read permission",
      "contracts",
      '"accounting.close.read"',
      '"accounting.close.export"',
    ],
    [
      "weak redaction contract",
      "contracts",
      '"CLIENT_RECIPIENT_ONLY_NO_RAW_METADATA"',
      '"RAW_METADATA_ALLOWED"',
    ],
    ["caller-controlled clock", "queue", "new Date()", "new Date(input.now)"],
    [
      "recipient override",
      "queue",
      "ownerId: actorId",
      "ownerId: input.requestedFromId",
    ],
    ["inactive tenant actor", "queue", "isActive: true", "isActive: false"],
    [
      "unscoped finding query",
      "queue",
      "organizationId,\n          ownerId: actorId,",
      "ownerId: actorId,",
    ],
    [
      "resolved finding eligibility",
      "queue",
      "CloseFindingStatus.OPEN,",
      "CloseFindingStatus.RESOLVED,",
    ],
    [
      "untyped request comment",
      "queue",
      'path: ["requestType"]',
      'path: ["otherType"]',
    ],
    [
      "unscoped metadata recipient",
      "queue",
      'path: ["requestedFromId"]',
      'path: ["requestedById"]',
    ],
    [
      "unbounded finding query",
      "queue",
      "take: CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.maxItems + 1,",
      "",
    ],
    [
      "raw metadata response",
      "queue",
      "controls: { rawMetadataExposed: false }",
      "controls: { rawMetadataExposed: false, metadata: comment.metadata }",
    ],
    [
      "silent malformed evidence",
      "queue",
      "blockers.push(invalidEvidenceBlocker(finding.id, requestId))",
      "continue",
    ],
    [
      "writer-local evidence vocabulary",
      "writer",
      'import { MISSING_CLOSE_EVIDENCE_REQUEST_TYPE, MISSING_CLOSE_EVIDENCE_VISIBILITY } from "./missing-close-evidence-request-queue-contracts"',
      'const MISSING_CLOSE_EVIDENCE_REQUEST_TYPE = "MISSING_CLOSE_EVIDENCE"',
    ],
  ])("blocks client missing-proof queue %s", (_name, target, from, to) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const sources = {
      contracts: verifiedMissingProofQueueContractsSource(),
      queue: verifiedMissingProofQueueServiceSource(),
      writer: verifiedCloseWaiverServiceSource(),
    }
    const paths = {
      contracts:
        "services/accounting/missing-close-evidence-request-queue-contracts.ts",
      queue:
        "services/accounting/missing-close-evidence-request-queue.service.ts",
      writer: "services/accounting/close-assurance.service.ts",
    }
    const source = sources[target]
    expect(source).toContain(from)
    write(root, paths[target], source.replace(from, to))

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "client_missing_proof_request_queue_service_owned_evidence",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it.each([
    [
      "action origin contract",
      "contracts",
      '"ACCOUNTANT_REQUEST"',
      '"ACCOUNTANT_NOTE"',
    ],
    ["RBAC gate", "service", "!hasRbacPermission(", "!canReadMissingProof("],
    [
      "close assurance entitlement",
      "service",
      'moduleSlug: "close_assurance"',
      'moduleSlug: "accounting"',
    ],
    [
      "exact source-owned queue call",
      "service",
      "actorPermissions: input.actorPermissions,\n        })",
      "actorPermissions: input.actorPermissions,\n          now: input.now,\n        })",
    ],
    ["generic source failure", "service", "} catch {", "} catch (error) {"],
    [
      "metadata redaction",
      "service",
      'field: "accountantComment.metadata"',
      'field: "accountantComment.rawMetadata"',
    ],
    [
      "invalid-evidence blocker composition",
      "service",
      "source.queue.blockers.map",
      "source.queue.requests.map",
    ],
  ])(
    "blocks client missing-proof manager composition without %s",
    (_name, target, from, to) => {
      const root = makeTempRepo()
      writeReadyFixture(root)
      const sources = {
        contracts: verifiedMissingProofManagerContractsSource(),
        service: verifiedMissingProofManagerServiceSource(),
      }
      const paths = {
        contracts:
          "services/manager-action-center/manager-action-center-contracts.ts",
        service:
          "services/manager-action-center/manager-action-center.service.ts",
      }
      const source = sources[target]
      expect(source).toContain(from)
      write(root, paths[target], source.replaceAll(from, to))

      const report = buildReportTrustExportReadiness(root, { mode: "fail" })

      expect(report.blockers).toContain(
        "client_missing_proof_manager_action_center_composition",
      )
      expect(gateResultForReport(report, "fail").exitCode).toBe(1)
    },
  )

  it("blocks a hardcoded USD report formatter", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "components/reports/item-performance-report.tsx",
      'currency: "USD"',
    )
    const report = buildReportTrustExportReadiness(root, { mode: "fail" })
    expect(report.blockers).toContain("report_ui_has_no_hardcoded_usd")
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks when the accounting export loses its content hash", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "services/accounting/reports.service.ts",
      "await Promise.all getTrialBalance({ getGeneralLedger({ data: report",
    )
    const report = buildReportTrustExportReadiness(root, { mode: "fail" })
    expect(report.blockers).toContain("tamper_evident_content_and_audit")
  })

  it("blocks synthetic accountant trust-pack authentication time", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "actions/accounting/data-trust.actions.ts",
      verifiedFreshAuthActionSource({ syntheticAuth: true }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "accountant_trust_pack_verified_fresh_auth_evidence",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })
  it.each([
    ["synthetic authentication time", { syntheticAuth: true }],
    ["verification after input parsing", { parseBeforeAuth: true }],
    ["fresh-auth control spread", { spreadControl: true }],
    ["unverified direct context timestamp", { directContextTimestamp: true }],
    ["post-verification timestamp reassignment", { reassignAuth: true }],
    ["mismatch-guard early return", { guardBypass: true }],
    ["additional parsing before verification", { preAuthParse: true }],
    ["public action wrapper bypass", { bypassWrapper: true }],
    [
      "protected action binding reassignment",
      { reassignProtectedAction: true },
    ],
    ["fresh-auth local binding reassignment", { reassignFreshAuth: true }],
  ])("blocks certified close-pack %s", (_name, options) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "actions/accounting/close-assurance.actions.ts",
      verifiedClosePackActionSource(options),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "certified_close_pack_verified_fresh_auth_evidence",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it.each([
    ["synthetic authentication time", { syntheticAuth: true }],
    ["verification after input parsing", { parseBeforeAuth: true }],
    ["boolean fresh-auth policy", { booleanFreshAuth: true }],
    ["fresh-auth control spread", { spreadControl: true }],
    ["direct context timestamp", { directTimestamp: true }],
    ["mismatched evidence actor", { mismatchedEvidenceActor: true }],
    [
      "mismatched evidence organization",
      { mismatchedEvidenceOrganization: true },
    ],
    ["mutable protected binding", { mutableBinding: true }],
    ["public wrapper bypass", { bypassWrapper: true }],
  ])("blocks close-waiver action %s", (_name, options) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "actions/accounting/close-assurance.actions.ts",
      verifiedClosePackActionSource({ waiverOptions: options }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "close_waiver_service_owned_verified_fresh_auth_evidence",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it.each([
    ["missing service preflight", { missingPreflight: true }],
    ["caller-controlled service clock", { callerControlledClock: true }],
    ["missing actor allowed", { allowMissingActor: true }],
    ["actor mismatch allowed", { allowActorMismatch: true }],
    ["organization mismatch allowed", { allowOrganizationMismatch: true }],
    ["weakened max age", { weakenMaxAge: true }],
    ["future timestamps allowed", { allowFuture: true }],
    ["stale timestamps allowed", { allowStale: true }],
    ["wrong freshness error code", { wrongErrorCode: true }],
    ["synthetic approval time", { syntheticApprovalTime: true }],
    ["null approver attribution", { nullApprover: true }],
    ["post-validation clock reassignment", { reassignClock: true }],
    ["post-validation clock mutation", { mutateClock: true }],
  ])("blocks close-waiver service policy with %s", (_name, options) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "services/accounting/close-assurance.service.ts",
      verifiedCloseWaiverServiceSource(options),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "close_waiver_service_owned_verified_fresh_auth_evidence",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it.each([
    ["mutable protected binding", { mutableBinding: true }],
    ["public wrapper bypass", { bypassWrapper: true }],
    ["wrong permission", { wrongPermission: true }],
    ["attacker-controlled organization", { inputOrganization: true }],
    ["attacker-controlled actor", { inputActor: true }],
    ["control spread", { spreadControl: true }],
    ["missing period revalidation", { missingRevalidate: true }],
  ])("blocks missing-proof action with %s", (_name, options) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "actions/accounting/close-assurance.actions.ts",
      verifiedClosePackActionSource({ missingProofOptions: options }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "missing_proof_request_service_owned_command_evidence",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it.each([
    ["caller-controlled clock", { callerClock: true }],
    ["attacker-controlled organization", { inputOrganization: true }],
    ["READ instead of REVIEW delegation", { readCapability: true }],
    ["missing correlation lookup", { missingIdempotency: true }],
    ["non-atomic operation", { nonAtomic: true }],
    ["missing-evidence preflight bypass", { skipMissingEvidence: true }],
    ["unscoped recipient", { unscopedRecipient: true }],
    ["untyped client-action evidence", { untypedComment: true }],
    ["missing audit evidence", { missingAudit: true }],
    ["missing business event", { missingEvent: true }],
  ])("blocks missing-proof service with %s", (_name, options) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "services/accounting/close-assurance.service.ts",
      verifiedCloseWaiverServiceSource({ missingProofOptions: options }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "missing_proof_request_service_owned_command_evidence",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it.each([
    ["missing REVIEW capability", { missingReviewCapability: true }],
    ["missing read-only REVIEW denial", { missingReviewGuard: true }],
  ])("blocks missing-proof delegated access with %s", (_name, options) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "services/accounting/accountant-access.service.ts",
      accountantAccessServiceSource(options),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "missing_proof_request_service_owned_command_evidence",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks fresh-auth verification after delegated access resolution", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "actions/accounting/data-trust.actions.ts",
      verifiedFreshAuthActionSource({ resolutionBeforeAuth: true }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "accountant_trust_pack_verified_fresh_auth_evidence",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("ignores unrelated current-time construction outside trust-pack export", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "actions/accounting/data-trust.actions.ts",
      verifiedFreshAuthActionSource({ unrelatedCurrentTime: true }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).not.toContain(
      "accountant_trust_pack_verified_fresh_auth_evidence",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("blocks fresh-auth spreads into trust-pack service input", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "actions/accounting/data-trust.actions.ts",
      verifiedFreshAuthActionSource({ spreadFreshAuth: true }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "accountant_trust_pack_verified_fresh_auth_evidence",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks fully elapsed accountant consent acceptance", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "services/accounting/accountant-access.service.ts",
      accountantAccessServiceSource({ missingStaleGuard: true }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "explicit_accountant_consent_role_and_expiry",
    )
  })

  it("blocks future-effective grants mislabeled as expired", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "services/accounting/accountant-access.service.ts",
      accountantAccessServiceSource({ misclassifiesFuture: true }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "explicit_accountant_consent_role_and_expiry",
    )
  })

  it("blocks post-expiry revocation from replacing expiry truth", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "services/accounting/accountant-access.service.ts",
      accountantAccessServiceSource({ misleadingExpiredRevocation: true }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "explicit_accountant_consent_role_and_expiry",
    )
  })

  it("blocks loss of scheduled revocation or absolute timestamps", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "components/accounting/AccountantAccessManager.tsx",
      accountantAccessManagerSource({
        activeOnlyRevoke: true,
        rawDateTimes: true,
      }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "explicit_accountant_consent_role_and_expiry",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })
  it("blocks fresh-auth timestamps returned before verification", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "actions/accounting/data-trust.actions.ts",
      verifiedFreshAuthActionSource({ returnBeforeGuard: true }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "accountant_trust_pack_verified_fresh_auth_evidence",
    )
  })

  it("blocks detached tenant markers without an executable scoped resolver", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "services/accounting/accountant-access.service.ts",
      accountantAccessServiceSource({ missingTenantBoundary: true }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "cross_client_access_is_server_resolved",
        "delegated_export_honors_grant_role",
      ]),
    )
  })

  it("blocks an unconditional last-writer revocation transition", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "services/accounting/accountant-access.service.ts",
      accountantAccessServiceSource({ unconditionalRevocation: true }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "explicit_accountant_consent_role_and_expiry",
    )
  })
  it("blocks legacy post-expiry rows from unconditional revoked precedence", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "services/accounting/accountant-access.service.ts",
      accountantAccessServiceSource({
        misclassifiesLegacyRevocation: true,
      }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "explicit_accountant_consent_role_and_expiry",
    )
  })

  it("blocks a protected revoke action that accepts client scope from input", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "actions/accounting/accountant-access.actions.ts",
      accountantAccessActionsSource({ unscopedRevoke: true }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "explicit_accountant_consent_role_and_expiry",
        "delegated_export_honors_grant_role",
      ]),
    )
  })

  it("blocks UI evidence that always reports a successful revocation", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "components/accounting/AccountantAccessManager.tsx",
      accountantAccessManagerSource().replace(
        'result.data.status === "EXPIRED"',
        "false",
      ),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "explicit_accountant_consent_role_and_expiry",
    )
  })
})
