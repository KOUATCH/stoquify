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
    ${verifiedMissingProofResponseActionSource(options.missingProofResponseOptions)}
    ${verifiedMissingProofResponseAcceptanceActionSource(options.missingProofAcceptanceOptions)}
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

function verifiedMissingProofResponseActionSource(options = {}) {
  const binding = options.mutableBinding ? "let" : "const"
  const permission = options.wrongPermission
    ? "accounting.close.read"
    : "accounting.close.finding.comment"
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
    : "return respondToMissingEvidence(input)"

  return `
    ${binding} respondToMissingEvidence = protect(
      {
        permission: "${permission}",
        auditResource: "AccountantComment",
        auditAllowed: true,
      },
      async (input, ctx) => {
        const parsed = respondToMissingCloseEvidenceInputSchema.parse(input)
        const result = await respondToMissingCloseEvidence(
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

    export async function respondToMissingCloseEvidenceAction(input: unknown) {
      ${wrapper}
    }
  `
}

function verifiedMissingProofResponseAcceptanceActionSource(options = {}) {
  const binding = options.mutableBinding ? "let" : "const"
  const freshAuth = options.booleanFreshAuth
    ? "freshAuth: true,"
    : `freshAuth: { maxAgeSeconds: ${options.weakFreshAuth ? 600 : 300} },`
  const authDeclaration = options.mutableAuth ? "let" : "const"
  const authStatement = options.syntheticAuth
    ? `${authDeclaration} lastAuthAt = new Date()`
    : `${authDeclaration} lastAuthAt = verifiedCloseFreshAuthTime(ctx)`
  const parseStatement =
    "const parsed = acceptMissingCloseEvidenceResponseInputSchema.parse(input)"
  const orderedStatements = options.parseBeforeAuth
    ? `${parseStatement}\n        ${authStatement}`
    : `${authStatement}\n        ${parseStatement}`
  const organization = options.inputOrganization
    ? "parsed.organizationId"
    : "ctx.orgId"
  const actor = options.inputActor ? "parsed.actorId" : "ctx.userId"
  const controlSpread = options.spreadControl ? "...parsed.control," : ""
  const evidenceActor = options.mismatchedEvidenceActor
    ? "ctx.otherUserId"
    : "ctx.userId"
  const evidenceOrganization = options.mismatchedEvidenceOrganization
    ? "ctx.otherOrgId"
    : "ctx.orgId"
  const timestamp = options.directTimestamp
    ? "lastAuthAt: ctx.freshAuth.lastAuthAt,"
    : "lastAuthAt,"
  const revalidate = options.missingRevalidate
    ? ""
    : "revalidateClosePaths(result.periodId)"
  const wrapper = options.bypassWrapper
    ? "return null"
    : "return acceptMissingEvidenceResponse(input)"

  return `
    ${binding} acceptMissingEvidenceResponse = protect(
      {
        permission: "${
          options.wrongPermission
            ? "accounting.close.read"
            : "accounting.close.accountant.review"
        }",
        auditResource: "CloseAssuranceFinding",
        auditAllowed: true,
        ${freshAuth}
      },
      async (input, ctx) => {
        ${orderedStatements}
        const result = await acceptMissingCloseEvidenceResponse(
          ${organization},
          parsed,
          {
            ${controlSpread}
            actorId: ${actor},
            actorPermissions: ctx.permissions,
            freshAuth: {
              actorId: ${evidenceActor},
              organizationId: ${evidenceOrganization},
              ${timestamp}
            },
          },
        )
        ${revalidate}
        return result
      },
    )

    export async function acceptMissingCloseEvidenceResponseAction(input: unknown) {
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
    ${verifiedMissingProofServiceSource(
      options.missingProofOptions,
      options.missingProofResponseOptions,
      options.missingProofAcceptanceOptions,
    )}
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

function verifiedMissingProofServiceSource(
  options = {},
  responseOptions = {},
  acceptanceOptions = {},
) {
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
    ${verifiedMissingProofResponseServiceSource(responseOptions)}
    ${verifiedMissingProofResponseAcceptanceServiceSource(acceptanceOptions)}
  `
}

function verifiedMissingProofResponseServiceSource(options = {}) {
  const activeActor = options.missingActiveActor
    ? "const activeActor = { id: actorId }"
    : `const activeActor = await tx.user.findFirst({
        where: { id: actorId, organizationId, isActive: true },
      })`
  const requestOrganization = options.inputOrganization
    ? "organizationId: input.organizationId,"
    : "organizationId,"
  const requestWhere = options.unscopedRequest
    ? "id: input.requestId"
    : `id: input.requestId,
          ${requestOrganization}
          visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY,
          metadata: {
            path: ["requestType"],
            equals: MISSING_CLOSE_EVIDENCE_REQUEST_TYPE,
          }`
  const recipientGuard = options.skipRecipientGuard
    ? ""
    : `if (request.requestedFromId !== actorId) {
        throw new ForbiddenError("recipient")
      }`
  const existingResponse = options.missingIdempotency
    ? "const existingResponse = null"
    : `const existingResponse = await tx.accountantComment.findFirst({
        where: {
          organizationId,
          correlationId,
          visibility: MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY,
        },
      })`
  const stateGuard = options.skipStateGuard
    ? ""
    : `if (!missingCloseEvidenceResponseStatuses.has(finding.status)) {
        throw new BusinessRuleError("state")
      }`
  const ownerGuard = options.skipOwnerGuard
    ? ""
    : `if (finding.ownerId !== actorId) {
        throw new ForbiddenError("owner")
      }`
  const responseStatus = options.terminalState
    ? "CloseFindingStatus.RESOLVED"
    : "CloseFindingStatus.IN_REVIEW"
  const responseVisibility = options.untypedResponse
    ? '"CLIENT_RESPONSE_SUBMITTED"'
    : "MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY"
  const responseType = options.untypedResponse
    ? '"MISSING_CLOSE_EVIDENCE_RESPONSE"'
    : "MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE"
  const audit = options.missingAudit
    ? ""
    : `await auditCloseWorkflow(tx, {
        organizationId,
        actorId,
        action: "CLOSE_MISSING_EVIDENCE_RESPONSE_SUBMITTED",
        resourceType: "AccountantComment",
        resourceId: response.id,
        metadata: jsonObject({ requestId: request.id, status: "SUBMITTED" }),
      })`
  const eventLeak = options.eventLeaksResponse
    ? "responseText: input.responseText,"
    : ""
  const event = options.missingEvent
    ? ""
    : `await recordCloseWorkflowEventInTx(tx, {
        organizationId,
        actorId,
        eventType: "close.assurance.missing_evidence.response_submitted",
        ownerId: request.requestedById,
        payload: {
          requestId: request.id,
          respondedById: actorId,
          ${eventLeak}
          status: "SUBMITTED",
        },
      })`

  return `
    export async function respondToMissingCloseEvidence(
      organizationId,
      input,
      control = {},
    ) {
      const actorId = control.actorId?.trim()
      if (!actorId) {
        throw new BusinessRuleError("actor required")
      }
      const correlationId = input.correlationId ?? randomUUID()
      return runMissingCloseEvidenceTransaction(async (tx) => {
        ${activeActor}
        if (!activeActor) throw new BusinessRuleError("active actor")
        const storedRequest = await tx.accountantComment.findFirst({
          where: { ${requestWhere} },
        })
        if (!storedRequest) throw new NotFoundError("request")
        const request = mapMissingCloseEvidenceRequest(storedRequest)
        ${recipientGuard}
        ${existingResponse}
        if (existingResponse) {
          return assertMatchingMissingCloseEvidenceResponseReplay(
            existingResponse,
            input,
            request,
            actorId,
          )
        }
        const finding = await tx.closeAssuranceFinding.findFirst({
          where: { id: request.findingId, organizationId },
        })
        if (!finding) throw new NotFoundError("finding")
        if (
          finding.periodId !== request.periodId ||
          finding.closeRunId !== request.closeRunId
        ) {
          throw new BusinessRuleError("mismatch")
        }
        ${stateGuard}
        ${ownerGuard}
        await tx.closeAssuranceFinding.update({
          where: { id: finding.id },
          data: {
            status: ${responseStatus},
            correlationId,
          },
        })
        const response = await tx.accountantComment.create({
          data: {
            organizationId,
            periodId: request.periodId,
            closeRunId: request.closeRunId,
            findingId: request.findingId,
            authorId: actorId,
            body: input.responseText,
            visibility: ${responseVisibility},
            correlationId,
            metadata: jsonObject({
              responseType: ${responseType},
              requestId: request.id,
              requestCorrelationId: request.correlationId,
              requestedById: request.requestedById,
              requestedFromId: request.requestedFromId,
              respondedById: actorId,
              correlationId,
            }),
          },
        })
        ${audit}
        ${event}
        return mapMissingCloseEvidenceResponse(response)
      })
    }
  `
}

function verifiedMissingProofResponseAcceptanceServiceSource(options = {}) {
  const maxAgeMultiplier = options.weakFreshAuth ? 2000 : 1000
  const authConditions = [
    "!actorId",
    "!freshAuth",
    ...(options.allowActorMismatch ? [] : ["freshAuth.actorId !== actorId"]),
    ...(options.allowOrganizationMismatch
      ? []
      : ["freshAuth.organizationId !== homeOrganizationId"]),
    "!Number.isFinite(nowTime)",
    "!Number.isFinite(lastAuthAt)",
    "lastAuthAt <= 0",
    ...(options.allowFuture ? [] : ["lastAuthAt > nowTime"]),
    ...(options.allowStale
      ? []
      : [
          "nowTime - lastAuthAt > MISSING_CLOSE_EVIDENCE_ACCEPTANCE_FRESH_AUTH_MAX_AGE_MS",
        ]),
  ].join(" ||\n        ")
  const rbac = options.missingRbac
    ? ""
    : `if (
        !hasRbacPermission(
          control.actorPermissions ?? [],
          ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE.permission,
        )
      ) {
        throw new ForbiddenError("review permission")
      }`
  const clock = options.callerClock ? "new Date(control.now)" : "new Date()"
  const activeActor = options.missingActiveActor
    ? "const activeActor = { id: actorId }"
    : `const activeActor = await tx.user.findFirst({
        where: {
          id: actorId,
          organizationId: homeOrganizationId,
          isActive: true,
        },
        select: { id: true },
      })`
  const capability = options.readCapability ? "READ" : "REVIEW"
  const organization = options.inputOrganization
    ? "input.organizationId"
    : "access.organizationId"
  const existingAcceptance = options.missingIdempotency
    ? "const existingAcceptance = null"
    : `const existingAcceptance = await tx.accountantComment.findFirst({
        where: {
          organizationId,
          correlationId,
          visibility: MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_VISIBILITY,
          metadata: {
            path: ["acceptanceType"],
            equals: MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_TYPE,
          },
        },
      })`
  const replay = options.inexactReplay
    ? "return mapMissingCloseEvidenceResponseAcceptance(existingAcceptance)"
    : `return assertMatchingMissingCloseEvidenceAcceptanceReplay(
          existingAcceptance,
          input,
          organizationId,
          actorId,
        )`
  const requestScope = options.unscopedRequest
    ? "id: requestId"
    : `id: requestId,
          organizationId,
          visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY,
          metadata: {
            path: ["requestType"],
            equals: MISSING_CLOSE_EVIDENCE_REQUEST_TYPE,
          }`
  const responseScope = options.unscopedResponse
    ? "id: responseId"
    : `id: responseId,
          organizationId,
          visibility: MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY,
          metadata: {
            path: ["responseType"],
            equals: MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE,
          }`
  const relationshipGuard = options.missingRelationshipGuard
    ? ""
    : `if (
        response.requestId !== request.id ||
        response.organizationId !== request.organizationId ||
        response.periodId !== request.periodId ||
        response.closeRunId !== request.closeRunId ||
        response.findingId !== request.findingId ||
        response.requestedById !== request.requestedById ||
        response.requestedFromId !== request.requestedFromId ||
        response.respondedById !== request.requestedFromId ||
        response.requestCorrelationId !== request.correlationId
      ) {
        throw new BusinessRuleError("evidence mismatch")
      }`
  const selfAcceptanceGuard = options.allowSelfAcceptance
    ? ""
    : `if (actorId === response.respondedById) {
        throw new ForbiddenError("self acceptance")
      }`
  const statusGuard = options.skipStatusGuard
    ? ""
    : `if (finding.status !== CloseFindingStatus.IN_REVIEW) {
        throw new BusinessRuleError("state")
      }`
  const ownerGuard = options.skipOwnerGuard
    ? ""
    : `if (finding.ownerId !== response.respondedById) {
        throw new BusinessRuleError("owner")
      }`
  const transitionMethod = options.nonCasUpdate ? "update" : "updateMany"
  const transitionScope = options.skipCasScope
    ? "id: finding.id, organizationId"
    : `id: finding.id,
          organizationId,
          status: CloseFindingStatus.IN_REVIEW,
          ownerId: response.respondedById`
  const transitionStatus = options.wrongTransitionStatus
    ? "CloseFindingStatus.ASSIGNED"
    : "CloseFindingStatus.RESOLVED"
  const attribution = options.missingResolutionAttribution
    ? ""
    : `resolutionNotes,
          resolvedAt: now,
          resolvedById: actorId,`
  const countGuard = options.skipCasCount
    ? ""
    : `if (transition.count !== 1) {
        throw new ConflictError("concurrent transition")
      }`
  const visibility = options.untypedAcceptance
    ? '"ACCOUNTANT_RESPONSE_ACCEPTED"'
    : "MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_VISIBILITY"
  const acceptanceType = options.untypedAcceptance
    ? '"MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE"'
    : "MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_TYPE"
  const auditLeak = options.auditLeaksText ? "resolutionNotes," : ""
  const audit = options.missingAudit
    ? ""
    : `await auditCloseWorkflow(tx, {
        organizationId,
        actorId,
        action:
          ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE.auditAction,
        resourceType: "AccountantComment",
        resourceId: acceptance.id,
        metadata: jsonObject({
          requestId: request.id,
          responseId: response.id,
          ${auditLeak}
          status: CloseFindingStatus.RESOLVED,
        }),
      })`
  const eventLeak = options.eventLeaksText ? "resolutionNotes," : ""
  const event = options.missingEvent
    ? ""
    : `await recordCloseWorkflowEventInTx(tx, {
        organizationId,
        actorId,
        eventType:
          ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE.eventType,
        ownerId: response.respondedById,
        payload: {
          requestId: request.id,
          responseId: response.id,
          ${eventLeak}
          findingStatus:
            ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE.findingStatus,
        },
      })`
  const certification = options.certifiesClose
    ? "await tx.closeRun.update({ data: { status: CloseRunStatus.APPROVED_FOR_CLOSE } })"
    : ""

  return `
    const MISSING_CLOSE_EVIDENCE_ACCEPTANCE_FRESH_AUTH_MAX_AGE_MS =
      ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE.freshAuthMaxAgeSeconds *
  ${maxAgeMultiplier}

    function requireFreshMissingEvidenceAcceptanceControl(
      homeOrganizationId,
      control,
      now,
    ) {
      const actorId = control.actorId?.trim()
      const freshAuth = control.freshAuth
      const rawLastAuthAt = freshAuth?.lastAuthAt
      const lastAuthAt =
        rawLastAuthAt instanceof Date
          ? rawLastAuthAt.getTime()
          : new Date(rawLastAuthAt).getTime()
      const nowTime = now.getTime()
      if (${authConditions}) {
        throw new BusinessRuleError("fresh auth", "FRESH_AUTH_REQUIRED")
      }
      return actorId
    }

    function mapMissingCloseEvidenceResponseAcceptance(comment) {
      const respondedById = metadataString(comment.metadata, "respondedById")
      const acceptedById = metadataString(comment.metadata, "acceptedById")
      if (acceptedById === respondedById) throw new BusinessRuleError("duties")
      return {
        organizationId: comment.organizationId,
        requestId: metadataString(comment.metadata, "requestId"),
        responseId: metadataString(comment.metadata, "responseId"),
        acceptedById,
        resolutionNotes: comment.body,
        controls: {
          serviceClockOwned: true,
          freshAuthRequired: true,
          delegatedReviewRequired: true,
          segregationOfDutiesRequired: true,
          compareAndSetResolution: true,
          rawMetadataExposed: false,
          closeCertificationAuthorized: false,
        },
      }
    }

    function assertMatchingMissingCloseEvidenceAcceptanceReplay(
      existing,
      input,
      organizationId,
      actorId,
    ) {
      const acceptance = mapMissingCloseEvidenceResponseAcceptance(existing)
      if (
        acceptance.organizationId !== organizationId ||
        acceptance.requestId !== input.requestId.trim() ||
        acceptance.responseId !== input.responseId.trim() ||
        acceptance.acceptedById !== actorId ||
        acceptance.resolutionNotes !== input.resolutionNotes.trim()
      ) {
        throw new ConflictError("replay mismatch")
      }
      return acceptance
    }

    export async function acceptMissingCloseEvidenceResponse(
      homeOrganizationIdInput,
      input,
      control = {},
    ) {
      const homeOrganizationId = homeOrganizationIdInput.trim()
      if (!homeOrganizationId) {
        throw new BusinessRuleError("home organization")
      }
      ${rbac}
      const now = ${clock}
      const actorId = requireFreshMissingEvidenceAcceptanceControl(
        homeOrganizationId,
        control,
        now,
      )
      const clientOrganizationId = input.clientOrganizationId?.trim() || null
      const requestId = input.requestId.trim()
      const responseId = input.responseId.trim()
      const resolutionNotes = input.resolutionNotes.trim()
      const suppliedCorrelationId = input.correlationId?.trim() || null
      const correlationId = suppliedCorrelationId ?? randomUUID()

      return runMissingCloseEvidenceTransaction(async (tx) => {
        ${activeActor}
        if (!activeActor) throw new ForbiddenError("active actor")
        const access = await resolveAccountantClientAccess({
          homeOrganizationId,
          clientOrganizationId,
          accountantUserId: actorId,
          capability: "${capability}",
          now,
          client: tx,
        })
        const organizationId = ${organization}
        ${existingAcceptance}
        if (existingAcceptance) {
          ${replay}
        }
        const storedRequest = await tx.accountantComment.findFirst({
          where: { ${requestScope} },
        })
        if (!storedRequest) throw new NotFoundError("request")
        const request = mapMissingCloseEvidenceRequest(storedRequest)
        const storedResponse = await tx.accountantComment.findFirst({
          where: { ${responseScope} },
        })
        if (!storedResponse) throw new NotFoundError("response")
        const response = mapMissingCloseEvidenceResponse(storedResponse)
        ${relationshipGuard}
        ${selfAcceptanceGuard}
        const finding = await tx.closeAssuranceFinding.findFirst({
          where: { id: request.findingId, organizationId },
        })
        if (!finding) throw new NotFoundError("finding")
        if (
          finding.periodId !== request.periodId ||
          finding.closeRunId !== request.closeRunId
        ) throw new BusinessRuleError("finding mismatch")
        ${statusGuard}
        ${ownerGuard}
        const transition = await tx.closeAssuranceFinding.${transitionMethod}({
          where: { ${transitionScope} },
          data: {
            status: ${transitionStatus},
            ${attribution}
            correlationId,
          },
        })
        ${countGuard}
        const acceptance = await tx.accountantComment.create({
          data: {
            organizationId,
            periodId: request.periodId,
            closeRunId: request.closeRunId,
            findingId: request.findingId,
            authorId: actorId,
            body: resolutionNotes,
            visibility: ${visibility},
            correlationId,
            metadata: jsonObject({
              acceptanceType: ${acceptanceType},
              requestId: request.id,
              responseId: response.id,
              respondedById: response.respondedById,
              acceptedById: actorId,
            }),
          },
        })
        ${certification}
        ${audit}
        ${event}
        return mapMissingCloseEvidenceResponseAcceptance(acceptance)
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
    export const MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE =
      "MISSING_CLOSE_EVIDENCE_RESPONSE" as const
    export const MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY =
      "CLIENT_RESPONSE_SUBMITTED" as const
    export const CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE = {
      version: 2,
      kind: "CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE",
      readPermission: "accounting.close.read",
      maxItems: 100,
      redaction: "CLIENT_RECIPIENT_ONLY_NO_RAW_METADATA",
    } as const
    export type ClientMissingCloseEvidenceWorkflowState =
      | "AWAITING_RECIPIENT_RESPONSE"
      | "RESPONSE_SUBMITTED"
    export type ClientMissingCloseEvidenceResponse = Readonly<{
      responseId: string
      correlationId: string
      respondedById: string
      submittedAt: string
      status: "SUBMITTED"
    }>
    export type Queue = {
      controls: {
        rawMetadataExposed: false
        responseBodyExposed: false
        responseStateServiceOwned: true
      }
      summary: {
        awaitingResponse: number
        responseSubmitted: number
        invalidRequestEvidence: number
        invalidResponseEvidence: number
      }
      blocker:
        | { reason: "INVALID_REQUEST_EVIDENCE" }
        | { reason: "INVALID_RESPONSE_EVIDENCE" }
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

    const AWAITING_RESPONSE_FINDING_STATUSES = new Set<CloseFindingStatus>([
      CloseFindingStatus.OPEN,
      CloseFindingStatus.ASSIGNED,
      CloseFindingStatus.REOPENED,
    ])
    const MAX_RESPONSE_CANDIDATES =
      CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.maxItems * 2

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
      const responseCandidates: MissingCloseEvidenceResponseRecord[] =
        await db.accountantComment.findMany({
          where: {
            organizationId,
            findingId: { in: visibleFindings.map((finding) => finding.id) },
            visibility: MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY,
            metadata: {
              path: ["responseType"],
              equals: MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE,
            },
          },
          take: MAX_RESPONSE_CANDIDATES + 1,
        })
      const responseEvidenceTruncated =
        responseCandidates.length > MAX_RESPONSE_CANDIDATES
      for (const finding of visibleFindings) {
        const comment = finding.comments[0]
        const responseCandidatesForFinding = responsesByFinding.get(finding.id) ?? []
        const awaitingResponse = AWAITING_RESPONSE_FINDING_STATUSES.has(finding.status)
        if (
          requestedById !== comment.authorId ||
          requestedFromId !== actorId ||
          correlationId !== comment.correlationId
        ) {
          blockers.push(invalidEvidenceBlocker(finding.id, requestId))
        }
        if (
          responseEvidenceTruncated ||
          responseCandidatesForFinding.length > 1 ||
          (finding.status === CloseFindingStatus.IN_REVIEW &&
            responseCandidatesForFinding.length !== 1) ||
          (awaitingResponse && responseCandidatesForFinding.length !== 0)
        ) {
          blockers.push(invalidResponseEvidenceBlocker(finding.id, requestId))
        }
        if (
          storedResponse.organizationId !== organizationId ||
          storedResponse.periodId !== finding.period.id ||
          storedResponse.closeRunId !== finding.closeRunId ||
          storedResponse.findingId !== finding.id ||
          responseRequestId !== comment.id ||
          requestCorrelationId !== correlationId ||
          responseRequestedById !== requestedById ||
          responseRequestedFromId !== actorId ||
          storedResponse.authorId !== actorId ||
          respondedById !== storedResponse.authorId ||
          responseCorrelationId !== storedResponse.correlationId
        ) {
          blockers.push(invalidResponseEvidenceBlocker(finding.id, requestId))
        }
        const response = {
          responseId: storedResponse.id,
          correlationId: storedResponse.correlationId,
          respondedById,
          submittedAt: storedResponse.createdAt.toISOString(),
          status: "SUBMITTED",
        }
        requests.push({
          actionPath:
            CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.actionPathPrefix,
          workflowState: response
            ? "RESPONSE_SUBMITTED"
            : "AWAITING_RECIPIENT_RESPONSE",
          response,
        })
      }
      const awaitingResponseRequests = requests.filter(
        (request) =>
          request.workflowState === "AWAITING_RECIPIENT_RESPONSE",
      )
      const invalidRequestEvidence = blockers.length
      const invalidResponseEvidence = blockers.length
      return {
        controls: { rawMetadataExposed: false },
        responseControls: {
          responseBodyExposed: false,
          responseStateServiceOwned: true,
        },
        summary: {
          awaitingResponse: awaitingResponseRequests.length,
          responseSubmitted: requests.length - awaitingResponseRequests.length,
          invalidRequestEvidence,
          invalidResponseEvidence,
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
    type ManagerActionCenterActionBase = {
      waitingOn?: "ACCOUNTANT_REVIEW"
    }
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

    function runSheetGroupForAction(item) {
      if (item.waitingOn === "ACCOUNTANT_REVIEW") return "waiting"
      if (item.dueState === "overdue") return "overdue"
      return "routine"
    }

    function runSheetGroupState() {}

    function managerActionsFromClientMissingProof(source) {
      if (!source || source.state === "HIDDEN") return []
      if (source.state === "UNAVAILABLE") {
        return [{
          origin: "ACCOUNTANT_REQUEST",
          detail: "The source-owned missing-proof queue could not be read.",
        }]
      }
      return [
        ...source.queue.requests.map((request) =>
          managerActionFromClientMissingProofRequest(request),
        ),
        ...source.queue.blockers.map((blocker) =>
          managerActionFromClientMissingProofBlocker(blocker),
        ),
      ]
    }

    function managerActionFromClientMissingProofRequest(request) {
      if (
        request.workflowState === "RESPONSE_SUBMITTED" &&
        request.response
      ) {
        return {
          origin: "ACCOUNTANT_REQUEST",
          nextStep: "Response submitted; awaiting accountant review.",
          assignedRole: "accountant",
          waitingOn: "ACCOUNTANT_REVIEW",
          dueState: "scheduled",
          state: "partial",
          field: "accountantComment.metadata",
          policy: CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.redaction,
        }
      }
      return {
        origin: "ACCOUNTANT_REQUEST",
        assignedRole: "manager",
        field: "accountantComment.metadata",
        policy: CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.redaction,
      }
    }

    function managerActionFromClientMissingProofBlocker(blocker) {
      const isResponseEvidence = blocker.reason === "INVALID_RESPONSE_EVIDENCE"
      const gate = isResponseEvidence
        ? "client_missing_proof_response"
        : "client_missing_proof_request"
      return {
        origin: "ACCOUNTANT_REQUEST",
        gate,
        field: "accountantComment.metadata",
        policy: CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.redaction,
      }
    }
  `
}

function verifiedAccountantMissingProofReviewContractsSource() {
  return `
    export const ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE = {
      version: 1,
      kind: "ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE",
      readPermission: "accounting.close.accountant.review",
      maxItems: 100,
      candidateMultiplier: 2,
      redaction: "ACCOUNTANT_REVIEW_NO_RAW_METADATA",
      responseTextExposure: "AUTHORIZED_ACCOUNTANT_REVIEW_ONLY",
    } as const
    export type ReviewItem = {
      workflowState: "AWAITING_ACCOUNTANT_REVIEW"
      request: { requestText: string }
      response: { responseText: string }
    }
    export type Blocker = {
      reason:
        | "INVALID_REQUEST_EVIDENCE"
        | "INVALID_RESPONSE_EVIDENCE"
        | "TRUNCATED_EVIDENCE"
    }
    export type Queue = {
      source: {
        accessMode: "TENANT_MEMBER" | "DELEGATED_ACCOUNTANT"
      }
      controls: {
        activeHomeTenantActorRequired: true
        targetOrganizationServiceResolved: true
        delegatedReviewGrantRequired: true
        serviceClockOwned: true
        rawMetadataExposed: false
        failClosedOnTruncation: true
      }
    }
  `
}

function verifiedAccountantMissingProofReviewServiceSource() {
  return `
    const MAX_COMMENT_CANDIDATES =
      ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems *
      ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.candidateMultiplier

    export type GetAccountantMissingCloseEvidenceReviewQueueInput = Readonly<{
      homeOrganizationId: string
      clientOrganizationId?: string | null
      actorId: string
      actorPermissions: readonly string[]
    }>

    export async function getAccountantMissingCloseEvidenceReviewQueue(input) {
      const homeOrganizationId = input.homeOrganizationId.trim()
      const actorId = input.actorId.trim()
      const clientOrganizationId = input.clientOrganizationId?.trim() || null
      if (input.clientOrganizationId != null && !clientOrganizationId) {
        throw new BusinessRuleError("blank")
      }
      if (!hasRbacPermission(
        input.actorPermissions,
        ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.readPermission,
      )) throw new ForbiddenError("forbidden")
      const generatedAt = new Date()
      return db.$transaction(async (tx) => {
        const actor = await tx.user.findFirst({
          where: {
            id: actorId,
            organizationId: homeOrganizationId,
            isActive: true,
          },
        })
        if (!actor) throw new ForbiddenError("forbidden")
        const access = await resolveAccountantClientAccess({
          homeOrganizationId,
          clientOrganizationId,
          accountantUserId: actorId,
          capability: "REVIEW",
          now: generatedAt,
          client: tx,
        })
        const organizationId = access.organizationId
        const requestMatcher = {
          organizationId,
          visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY,
          metadata: {
            path: ["requestType"],
            equals: MISSING_CLOSE_EVIDENCE_REQUEST_TYPE,
          },
        }
        const responseMatcher = {
          organizationId,
          visibility: MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY,
          metadata: {
            path: ["responseType"],
            equals: MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE,
          },
        }
        const findings = await tx.closeAssuranceFinding.findMany({
          where: {
            organizationId,
            status: CloseFindingStatus.IN_REVIEW,
            comments: { some: requestMatcher },
          },
          take:
            ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems + 1,
        })
        const findingsTruncated =
          findings.length >
          ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems
        const visibleFindings = findings.slice(
          0,
          ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems,
        )
        if (findingsTruncated) {
          return queueResult({
            items: [],
            blockers: [truncatedEvidenceBlocker()],
            truncated: true,
          })
        }
        const findingIds = visibleFindings.map((finding) => finding.id)
        const requestCandidates = await tx.accountantComment.findMany({
          where: {
            ...requestMatcher,
            findingId: { in: findingIds },
          },
          take: MAX_COMMENT_CANDIDATES + 1,
        })
        const responseCandidates = await tx.accountantComment.findMany({
          where: {
            ...responseMatcher,
            findingId: { in: findingIds },
          },
          take: MAX_COMMENT_CANDIDATES + 1,
        })
        const commentsTruncated =
          requestCandidates.length > MAX_COMMENT_CANDIDATES ||
          responseCandidates.length > MAX_COMMENT_CANDIDATES
        if (commentsTruncated) {
          return queueResult({
            items: [],
            blockers: [truncatedEvidenceBlocker()],
            truncated: true,
          })
        }
        for (const finding of visibleFindings) {
          const requests = requestsByFinding.get(finding.id) ?? []
          const request = requests[0] ?? null
          if (requests.length !== 1 || !request) {
            blockers.push(invalidRequestBlocker(finding.id, request?.id ?? null))
          }
          const responses = responsesByFinding.get(finding.id) ?? []
          const response = responses[0] ?? null
          if (responses.length !== 1 || !response) {
            blockers.push(invalidResponseBlocker(finding.id, request.id, response?.id ?? null))
          }
          if (
            request.organizationId !== organizationId ||
            request.periodId !== finding.period.id ||
            request.closeRunId !== finding.closeRunId ||
            request.findingId !== finding.id ||
            requestedById !== request.authorId ||
            finding.ownerId !== requestedFromId ||
            requestCorrelationId !== request.correlationId
          ) throw new Error("invalid request")
          if (
            response.organizationId !== organizationId ||
            response.periodId !== finding.period.id ||
            response.closeRunId !== finding.closeRunId ||
            response.findingId !== finding.id ||
            responseRequestId !== request.id ||
            responseRequestCorrelationId !== request.correlationId ||
            responseRequestedById !== requestedById ||
            responseRequestedFromId !== requestedFromId ||
            response.authorId !== requestedFromId ||
            respondedById !== response.authorId ||
            responseCorrelationId !== response.correlationId
          ) throw new Error("invalid response")
          items.push({
            workflowState: "AWAITING_ACCOUNTANT_REVIEW",
            request: { requestText: request.body },
            response: { responseText: response.body },
          })
        }
        items.sort(
          (left, right) =>
            Date.parse(left.response.submittedAt) -
              Date.parse(right.response.submittedAt) ||
            left.request.requestId.localeCompare(right.request.requestId),
        )
        return {
          controls: {
            rawMetadataExposed: false,
            responseTextExposure:
              ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.responseTextExposure,
          },
        }
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      })
    }
  `
}

function verifiedMissingProofResponseAcceptanceContractsSource(options = {}) {
  const rawMetadataExposed = options.rawMetadataExposed ? "true" : "false"
  const closeCertificationAuthorized = options.certifiesClose
    ? "true"
    : "false"

  return `
    export const MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_TYPE =
      "MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE"
    export const MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_VISIBILITY =
      "ACCOUNTANT_RESPONSE_ACCEPTED"
    export const ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE = {
      version: 1,
      kind: "ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE",
      permission: "${
        options.wrongPermission
          ? "accounting.close.read"
          : "accounting.close.accountant.review"
      }",
      decision: "${options.wrongDecision ? "REJECTED" : "ACCEPTED"}",
      findingStatus: "${options.wrongStatus ? "IN_REVIEW" : "RESOLVED"}",
      freshAuthMaxAgeSeconds: ${options.weakFreshAuth ? 600 : 300},
      auditAction: "CLOSE_MISSING_EVIDENCE_RESPONSE_ACCEPTED",
      eventType: "close.assurance.missing_evidence.response_accepted",
      redaction: "${
        options.weakRedaction
          ? "RAW_TEXT_ALLOWED"
          : "NO_REQUEST_RESPONSE_OR_RESOLUTION_TEXT_IN_AUDIT_EVENT"
      }",
      rawMetadataExposed: ${rawMetadataExposed},
      closeCertificationAuthorized: ${closeCertificationAuthorized},
    } as const
    export type AcceptanceDto = {
      controls: {
        serviceClockOwned: true
        freshAuthRequired: true
        delegatedReviewRequired: true
        segregationOfDutiesRequired: true
        compareAndSetResolution: true
        rawMetadataExposed: ${rawMetadataExposed}
        closeCertificationAuthorized: ${closeCertificationAuthorized}
      }
    }
  `
}

function verifiedCustomerLedgerBalanceKernelSource() {
  return {
    service: `
      type CreateCustomerLedgerEntryInput = {
        enforceCreditLimit?: boolean
      }
      const organizationId = requiredText(input.organizationId, "Organization")
      const customerId = requiredText(input.customerId, "Customer")
      validateTypePolarity(input.type, debit, credit)
      if (type === LedgerEntryType.PURCHASE) throw new BusinessRuleError()
      if (type === LedgerEntryType.ADJUSTMENT) return
      const customer = await tx.customer.findFirst({
        where: { id: customerId, organizationId, deletedAt: null },
        select: { id: true, currentBalance: true, creditLimit: true },
      })
      const currentBalance = toMoney(customer.currentBalance)
      const balanceAfter = currentBalance
        .plus(debit)
        .minus(credit)
        .toDecimalPlaces(2)
      if (balanceAfter.lt(0)) throw new BusinessRuleError()
      if (
        input.enforceCreditLimit &&
        customer.creditLimit != null &&
        balanceAfter.gt(toMoney(customer.creditLimit))
      ) throw new BusinessRuleError()
      const balanceClaim = await tx.customer.updateMany({
        where: {
          id: customerId,
          organizationId,
          deletedAt: null,
          currentBalance,
        },
        data: { currentBalance: balanceAfter },
      })
      if (balanceClaim.count !== 1) throw new ConflictError()
      return tx.customerLedgerEntry.create({
        data: {
          customerId,
          organizationId,
          entryDate,
          type: input.type,
          debit,
          credit,
          balanceAfter,
          description,
        },
      })
    `,
    pos: `
      createCustomerLedgerEntry(tx, {
        type: LedgerEntryType.SALE,
        debit: onAccountAmount,
        enforceCreditLimit: true,
        description: "sale",
      })
      createCustomerLedgerEntry(tx, {
        type: LedgerEntryType.CREDIT_NOTE,
        credit: creditAmount,
        description: "void",
      })
    `,
  }
}

function verifiedCustomerSettlementFoundationSource() {
  return {
    schema: `
      enum CustomerSettlementStatus { POSTED REVERSED }
      model CustomerSettlement {
        organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
        customer Customer @relation(fields: [customerId], references: [id], onDelete: Restrict)
        idempotencyPayloadHash String
        ledgerPostingBatchId String?
        postedBusinessEventId String?
        reversalIdempotencyKey String?
        @@unique([organizationId, idempotencyKey])
        @@unique([organizationId, correlationId])
      }
      model CustomerSettlementAllocation {
        customerLedgerEntryId String @unique
        customerReceivableDocumentId String?
        customerLedgerEntry CustomerLedgerEntry @relation("CustomerSettlementAllocationLedgerEntry", fields: [customerLedgerEntryId], references: [id], onDelete: Restrict)
        @@unique([customerSettlementId, salesOrderId])
        @@index([organizationId, salesOrderId])
      }
    `,
    migration: `
      CREATE TYPE "CustomerSettlementStatus" AS ENUM ('POSTED', 'REVERSED');
      CREATE TABLE "customer_settlements" ("id" TEXT NOT NULL);
      CREATE TABLE "customer_settlement_allocations" ("id" TEXT NOT NULL);
      "customerLedgerEntryId" TEXT NOT NULL
      CREATE UNIQUE INDEX "customer_settlements_organizationId_idempotencyKey_key" ON "customer_settlements"("organizationId", "idempotencyKey");
      CREATE UNIQUE INDEX "customer_settlement_allocations_customerLedgerEntryId_key" ON "customer_settlement_allocations"("customerLedgerEntryId");
      CREATE UNIQUE INDEX "customer_settlement_allocations_customerSettlementId_salesOrderId_key" ON "customer_settlement_allocations"("customerSettlementId", "salesOrderId");
      ALTER TABLE "customer_settlement_allocations" ADD CONSTRAINT "customer_settlement_allocations_customerLedgerEntryId_fkey" FOREIGN KEY ("customerLedgerEntryId") REFERENCES "customer_ledger_entries"("id");
    `,
    commandSchema: `
      const customerSettlementMethodSchema = z.enum([
        "CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "CHEQUE"
      ])
      const collectCustomerSettlementInputSchema = z.object({
        idempotencyKey: z.string().trim().min(8).max(160),
        correlationId: z.string().trim().min(8).max(160),
        documentHash: hashSchema,
        evidenceHash: hashSchema,
        allocations: z.array(customerSettlementAllocationInputSchema).min(1).max(50),
      })
    `,
    service: `
      const decision = evaluateSensitiveAction({ action: "customer.settlement.collect" })
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      if (isPrismaCode(error, "P2034")) retry()
      if (isPrismaCode(error, "P2002")) replay()
      const actor = await tx.user.findFirst({ where: { id: actorId, organizationId, isActive: true } })
      const existing = await tx.customerSettlement.findFirst({ where: { organizationId, idempotencyKey: command.parsed.idempotencyKey } })
      if (allocations.some((allocation) => allocation.amount.lte(0))) throw error
      if (allocationIds.length !== new Set(allocationIds).size) throw error
      if (!allocatedTotal.eq(amount)) throw error
      const salesOrders = await tx.salesOrder.findMany({ where: { organizationId, customerId: customer.id, deletedAt: null } })
      const receivable = await ensurePostedCustomerReceivableDocumentInTx(tx, {
        organizationId,
      })
      const receivableBySalesOrder = new Map<string, unknown>()
      const groups = await tx.customerLedgerEntry.groupBy({ where: { referenceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE } })
      if (allocation.amount.gt(openAmount)) throw error
      const settlement = await tx.customerSettlement.create({ data: command })
      const ledgerEntry = await createCustomerLedgerEntry(tx, {
        type: LedgerEntryType.PAYMENT,
        credit: allocation.amount,
        referenceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
      })
      const settlementAllocation = await tx.customerSettlementAllocation.create({
        data: {
          customerReceivableDocumentId: receivable.document.id,
          customerLedgerEntryId: ledgerEntry.id,
        },
      })
      const ledgerEntryIds = existing.allocations.map((allocation) => allocation.customerLedgerEntryId)
      const evidence = await tx.customerLedgerEntry.findMany({ where: { id: { in: ledgerEntryIds } } })
      if (entry.referenceId !== allocation.customerReceivableDocumentId || !entry.credit.eq(allocation.amount)) throw error
      await recordCustomerReceivableSettlementAppliedInTx(tx, { documentId: receivable.document.id })
      sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT
      postingPurpose: AccountingPostingPurpose.CUSTOMER_SETTLEMENT
      line.mappingKey === "ACCOUNTS_RECEIVABLE"
      await createAccountingSourceLink()
      action: "CUSTOMER_SETTLEMENT_LEDGER_POSTED"
      await recordPostedJournalCloseInvalidationInTx()
      const posting = await postCustomerSettlementInTx()
      const eventResult = await recordBusinessEventInTx({ eventType: "customer.settlement.posted" })
      await markBusinessEventAppliedInTx(tx, organizationId, eventResult.event.id)
      const completed = await tx.customerSettlement.update({ action: "CUSTOMER_SETTLEMENT_POSTED" })
    `,
    postingRules: `
      const DEFAULT_CUSTOMER_SETTLEMENT_POSTING_RULES = [{
        code: "AR-CUSTOMER-SETTLEMENT",
        sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
        postingPurpose: AccountingPostingPurpose.CUSTOMER_SETTLEMENT,
        lines: [{ mappingKey: "ACCOUNTS_RECEIVABLE" }],
      }]
      const DEFAULT_POSTING_RULES = [
        ...DEFAULT_CUSTOMER_SETTLEMENT_POSTING_RULES,
      ]
    `,
    rbac: `
      const risks = { "finance.receivables.collect": "crit" }
      const aliases = { "finance.receivables.collect": ["CUSTOMER_PAYMENTS_PROCESS"] }
    `,
    sensitiveAction: `
      type SensitiveActionId = | "customer.settlement.collect"
      const policies = {
        "customer.settlement.collect": {
          permission: "finance.receivables.collect",
          riskTier: "critical",
          requiredAssurance: "L1",
          freshAuthMaxAgeSeconds: 300,
        }
      }
    `,
  }
}

function verifiedCustomerSettlementReversalSource() {
  return {
    schema: `
      enum LedgerEntryType { PAYMENT_REVERSAL }
      model CustomerLedgerEntry {
        settlementAllocation CustomerSettlementAllocation? @relation("CustomerSettlementAllocationLedgerEntry")
        settlementReversalAllocation CustomerSettlementAllocation? @relation("CustomerSettlementAllocationReversalLedgerEntry")
      }
      type CustomerSettlementReversalFields {
        reversalDate DateTime?
        reversalIdempotencyPayloadHash String?
        reversalCorrelationId String?
        reversalDocumentHash String?
        reversalAccountingSourceLinkId String?
        @@unique([organizationId, reversalCorrelationId], map: "customer_settlements_reversal_correlation_key")
      }
      type CustomerSettlementAllocationReversalFields {
        reversalCustomerLedgerEntryId String? @unique
        reversalCustomerLedgerEntry CustomerLedgerEntry? @relation("CustomerSettlementAllocationReversalLedgerEntry", fields: [reversalCustomerLedgerEntryId], references: [id], onDelete: Restrict)
      }
    `,
    migration: `
      ALTER TYPE "LedgerEntryType" ADD VALUE 'PAYMENT_REVERSAL';
      ADD COLUMN "reversalIdempotencyPayloadHash" TEXT;
      ADD COLUMN "reversalCorrelationId" TEXT;
      ADD COLUMN "reversalAccountingSourceLinkId" TEXT;
      CREATE UNIQUE INDEX "customer_settlements_reversal_correlation_key";
      CREATE UNIQUE INDEX "customer_settlement_allocations_reversalCustomerLedgerEntryId_key";
      ADD CONSTRAINT "customer_settlement_allocations_reversalCustomerLedgerEntryId_fkey";
      CHECK (
        ("status" = 'POSTED' AND "reversalIdempotencyPayloadHash" IS NULL)
        OR (
          "status" = 'REVERSED'
          AND "reversedById" <> "receivedById"
          AND char_length(btrim("reversalReason")) BETWEEN 3 AND 500
          AND "reversalDate" >= "settlementDate"
        )
      );
    `,
    commandSchema: `
      const reverseCustomerSettlementInputSchema = z.object({
        customerSettlementId: idSchema,
        reversalDate: z.union([z.date(), z.string().trim().min(1)]),
        reason: z.string().trim().min(3).max(500),
        idempotencyKey: z.string().trim().min(8).max(160),
        correlationId: z.string().trim().min(8).max(160),
        documentHash: hashSchema,
        evidenceHash: hashSchema,
      })
    `,
    service: `
      type CustomerSettlementReversalControlContext = { freshAuth?: unknown }
      const now = new Date()
      if (freshAuth.claims.userId !== actorId) return null
      if (freshAuth.claims.tenantId !== organizationId) return null
      if (freshAuth.claims.assuranceOrganizationId !== organizationId) return null
      if (freshAuth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD) return null
      if (freshAuth.claims.lastAuthAt !== lastAuthAtMs) return null
      hashBusinessPayload({
        organizationId,
        actorId,
        customerSettlementId: parsed.customerSettlementId,
      })
      evaluateSensitiveAction({
        action: "customer.settlement.reverse",
        subjectActorId: settlement.receivedById,
      })
      assertReplayMatches(settlement, command, actorId)
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      if (isPrismaCode(error, "P2034")) retry()
      if (isPrismaCode(error, "P2002")) replay()
      const ledgerEntry = await createCustomerLedgerEntry(tx, {
        type: LedgerEntryType.PAYMENT_REVERSAL,
        debit: allocation.amount,
        referenceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
        referenceId: allocation.customerReceivableDocumentId,
      })
      if (!allocation.customerReceivableDocumentId) throw conflict
      const allocationClaim = await tx.customerSettlementAllocation.updateMany({
        data: { reversalCustomerLedgerEntryId: ledgerEntry.id },
      if (allocationClaim.count !== 1) throw conflict
      })
      await recordCustomerReceivableSettlementReversedInTx(tx, { documentId: allocation.customerReceivableDocumentId })
      const posting = await postReversalInTx()
      const eventResult = await recordBusinessEventInTx({
        eventType: "customer.settlement.reversed",
      const reversalEvent = await tx.businessEvent.findFirst({
        where: { status: "APPLIED" },
      })
      if (reversalEvent.payloadHash !== expectedEventPayloadHash) throw conflict
      })
      await markBusinessEventAppliedInTx(tx, organizationId, eventResult.event.id)
      const completedClaim = await tx.customerSettlement.updateMany({
        where: {
          status: CustomerSettlementStatus.POSTED,
          reversalIdempotencyPayloadHash: null,
          reversalBusinessEventId: null,
      if (completedClaim.count !== 1) throw conflict
      return { settlementId: settlement.id }
        },
        data: {
          status: CustomerSettlementStatus.REVERSED,
          reversalAccountingSourceLinkId: posting.sourceLinkId,
        },
      })
    `,
    ledger: `
      const CUSTOMER_DEBIT_TYPES = new Set<LedgerEntryType>([
        LedgerEntryType.PAYMENT_REVERSAL,
      ])
    `,
    arOpenItem: `
      type AROpenItem = {
        initialPaidAmount: string
        initialUnpaidAmount: string
      }
      const documents = await client.customerReceivableDocument.findMany({
        where: { referenceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE },
        include: {
          lifecycleStates: {
            where: { effectiveAt: { lte: asOf }, createdAt: { lte: recordedThrough } },
          },
        },
      })
      const item = {
        initialPaidAmount: moneyText(document.initialPaidAmount),
        initialUnpaidAmount: moneyText(document.initialUnpaidAmount),
        evidenceGrade: "posted",
        documentHash: document.documentHash,
        stateHash: state.stateHash,
      }
      assertReceivableStateConservation()
      const RECEIVABLE_ALLOCATION_REVERSAL_TYPES = new Set<LedgerEntryType>([
        LedgerEntryType.PAYMENT_REVERSAL,
      ])
      amount: RECEIVABLE_ALLOCATION_REVERSAL_TYPES.has(entry.type)
        ? moneyText(money(entry.debit).negated())
        : moneyText(entry.credit)
    `,
    posting: `
      if (original.sourceType === AccountingSourceType.CUSTOMER_SETTLEMENT) {
        await tx.auditLog.create({
          data: { action: "JOURNAL_ENTRY_SOURCE_OWNED_REVERSAL_BLOCKED" },
        })
        return { sourceOwnedBlocked: true as const }
      }
      if ("sourceOwnedBlocked" in result && result.sourceOwnedBlocked) throw error
    `,
    permissions: 'const FINANCE_PERMISSIONS = ["finance.receivables.reverse"]',
    rbac: 'const reversalRisks = { "finance.receivables.reverse": "crit" }',
    sensitiveAction: `
      type SensitiveActionId = | "customer.settlement.reverse"
      const reversalPolicies = {
        "customer.settlement.reverse": {
          permission: "finance.receivables.reverse",
          riskTier: "critical",
          requiredAssurance: "L1",
          freshAuthMaxAgeSeconds: 300,
          blockSelfApproval: true,
        },
      }
    `,
  }
}

function verifiedCustomerSettlementReversalActionSource() {
  return `
    "use server"
    const reverseSettlement = protect<unknown, CustomerSettlementReversalResult>(
      {
        permission: "finance.receivables.reverse",
        auditResource: "CustomerSettlement",
        auditAllowed: true,
        freshAuth: { maxAgeSeconds: 300 },
        module: {
          moduleSlug: "finance",
          surface: "actions/finance/customer-settlement.actions.ts:reverseCustomerSettlementAction",
          surfaceType: "action",
          accessIntent: "write",
          mode: "enforce",
          audit: true,
        },
      },
      async (input, ctx) => {
        const freshAuth = verifiedFreshAuthEvidence(ctx)
        const parsed = reverseCustomerSettlementInputSchema.parse(input)
        const result = await reverseCustomerSettlementWithControls(parsed, {
          organizationId: ctx.orgId,
          actorId: ctx.userId,
          actorPermissions: ctx.permissions,
          freshAuth,
        })
        revalidatePath("/dashboard/finance/receivables", "page")
        revalidatePath("/dashboard/accounting", "page")
        return result
      },
    )
    export async function reverseCustomerSettlementAction(input: unknown) {
      return reverseSettlement(input)
    }
    function verifiedFreshAuthEvidence(ctx: ProtectedActionContext) {
      const freshAuth = ctx.freshAuth
      const lastAuthAtMs =
        freshAuth?.lastAuthAt instanceof Date
          ? freshAuth.lastAuthAt.getTime()
          : Number.NaN
      if (
        !freshAuth ||
        !Number.isFinite(lastAuthAtMs) ||
        freshAuth.claims.userId !== ctx.userId ||
        freshAuth.claims.tenantId !== ctx.orgId ||
        freshAuth.claims.assuranceOrganizationId !== ctx.orgId ||
        !Number.isFinite(freshAuth.claims.assuranceLevel) ||
        freshAuth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD ||
        freshAuth.claims.lastAuthAt !== lastAuthAtMs
      ) {
        throw new FreshAuthRequiredError()
      }
      return {
        lastAuthAt: new Date(lastAuthAtMs),
        claims: {
          userId: freshAuth.claims.userId,
          tenantId: freshAuth.claims.tenantId,
          assuranceOrganizationId: freshAuth.claims.assuranceOrganizationId,
          assuranceLevel: freshAuth.claims.assuranceLevel,
          lastAuthAt: freshAuth.claims.lastAuthAt,
        },
      }
    }
  `
}

function verifiedPostedCustomerReceivableFoundationSource() {
  return {
    schema: `
      enum CustomerReceivableDocumentStatus {
        DRAFT ISSUED PARTIALLY_PAID PAID CANCELLED VOIDED
      }
      model CustomerReceivableDocument {
        sourceSalesOrder SalesOrder @relation(fields: [sourceSalesOrderId], references: [id], onDelete: Restrict)
        organizationSnapshot Json
        customerSnapshot Json
        sourceSnapshot Json
        documentHash String
        sourceEvidenceHash String
        metadataHash String
        supersedesDocumentId String?
      }
      model CustomerReceivableDocumentState {
        previousStateHash String?
        stateHash String
        businessEventId String?
        @@unique([organizationId, documentId, version])
      }
    `,
    migration: `
      CREATE TYPE "CustomerReceivableDocumentStatus" AS ENUM ('DRAFT', 'ISSUED');
      CREATE TABLE "customer_receivable_documents" ("id" TEXT NOT NULL);
      CREATE TABLE "customer_receivable_document_states" ("id" TEXT NOT NULL);
      customer_receivable_documents_money_check
      customer_receivable_documents_hash_check
      customer_receivable_documents_correction_check
      customer_receivable_document_states_lineage_check
      customer_receivable_document_states_reason_check
      customer_receivable_documents_prevent_mutation_trigger
      customer_receivable_document_states_prevent_mutation_trigger
      customer_settlement_allocations_prevent_receivable_relink_trigger
      RAISE EXCEPTION 'Cannot relink customer settlement allocation';
    `,
    documentService: `
      export const CUSTOMER_RECEIVABLE_REFERENCE_TYPE = "CUSTOMER_RECEIVABLE_DOCUMENT" as const
      const identity = { sourceSalesOrderId: salesOrderId, version: 1 }
      const totals = await tx.customerLedgerEntry.aggregate({ _sum: { debit: true, credit: true } })
      if (initialUnpaidAmount.lt(0)) throw error
      const partial = CustomerReceivableDocumentStatus.PARTIALLY_PAID
      const paid = CustomerReceivableDocumentStatus.PAID
      const frozen = {
        organizationSnapshot: receivableJson(organizationSnapshot),
        customerSnapshot: receivableJson(customerSnapshot),
        sourceSnapshot: receivableJson(sourceSnapshot),
      }
      const sourceEvidenceHash = hashBusinessPayload(sourceSnapshot)
      const documentHash = hashBusinessPayload({ sourceEvidenceHash })
      const document = await tx.customerReceivableDocument.create({ data: frozen })
      const event = await recordBusinessEventInTx({ eventType: "customer.receivable.posted" })
      const state = await tx.customerReceivableDocumentState.create({ data: { businessEventId: event.id } })
      await tx.auditLog.create({ data: { action: "CUSTOMER_RECEIVABLE_DOCUMENT_POSTED" } })
    `,
    lifecycleService: `
      async function appendCustomerReceivableLifecycleStateInTx() {
        assertTransition(latestState.status, input.status)
        const payload = { previousStateHash: latestState.stateHash }
        const event = await recordBusinessEventInTx({ eventType: "customer.receivable.lifecycle.changed" })
        const state = await tx.customerReceivableDocumentState.create({ data: payload })
        await tx.auditLog.create({ data: { action: "CUSTOMER_RECEIVABLE_LIFECYCLE_APPENDED" } })
      }
      function recordCustomerReceivableSettlementAppliedInTx() {}
      function recordCustomerReceivableSettlementReversedInTx() {}
      function voidCustomerReceivableDocumentInTx() {}
    `,
    backfillService: `
      function assessCustomerReceivableBackfillReadiness() {
        return [
          "legacy_sales_order_ledger_references",
          "unlinked_settlement_allocations",
          "documents_missing_initial_state",
          "malformed_document_hashes",
        ]
      }
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      referenceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE
      customerReceivableDocumentId: ensured.document.id
      action: "CUSTOMER_RECEIVABLE_LEGACY_SOURCE_LINKED"
    `,
    posService: `
      const receivable = await ensurePostedCustomerReceivableDocumentInTx(tx, {
        initialUnpaidAmount: onAccountAmount,
      })
      const reference = { referenceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE }
      await voidCustomerReceivableDocumentInTx(tx, { documentId: receivable.document.id })
    `,
    tests: `
      freezes tenant, customer, source, monetary, hash
      appends a conserved hash-chained state
      classifies every unresolved release blocker
      fails closed when no lifecycle state exists
    `,
  }
}

function verifiedCustomerStatementSnapshotFoundationSource() {
  return {
    schema: `
      model CustomerStatementSnapshot {
        organization Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)
        customer Customer @relation(fields: [customerId], references: [id], onDelete: Restrict)
        statementPayload Json
        sourceTables Json
        sourceDocumentHashes Json
        sourceStateHashes Json
        sourceLedgerEntryIds Json
        contentHash String
        idempotencyPayloadHash String
        supersedesStatementId String?
        @@unique([organizationId, customerId, periodStart, periodEnd, currency, version], map: "customer_statement_scope_version_key")
        @@unique([organizationId, idempotencyKey])
        @@unique([organizationId, contentHash])
      }
    `,
    migration: `
      CREATE TABLE "customer_statement_snapshots" ("id" TEXT NOT NULL);
      customer_statement_scope_check
      customer_statement_money_check
      "openingBalance" + "periodDebits" - "periodCredits" = "closingBalance"
      customer_statement_count_check
      "sourceItemCount" = "includedItemCount"
      "truncated" = false
      customer_statement_json_shape_check
      customer_statement_hash_check
      customer_statement_snapshots_supersedesStatementId_fkey
      customer_statement_snapshots_prevent_mutation_trigger
      Customer statement snapshots are immutable and append-only
    `,
    service: `
      const CUSTOMER_STATEMENT_ITEM_LIMIT = 500
      const CUSTOMER_STATEMENT_SOURCE_TABLES = [
        "customer_receivable_documents",
        "customer_receivable_document_states",
        "customer_ledger_entries",
      ]
      const openingAsOf = new Date(command.periodStart.getTime() - 1)
      const opening = await getCustomerAROpenItems({
        recordedThrough: command.generatedAt,
        client: tx,
      })
      const closing = await getCustomerAROpenItems({
        recordedThrough: command.generatedAt,
        client: tx,
      })
      const lines = buildStatementLines(openingItems, closingItems, command)
      if (lines.length > CUSTOMER_STATEMENT_ITEM_LIMIT) throw truncated
      if (!openingBalance.plus(periodDebits).minus(periodCredits).eq(closingBalance)) throw error
      const payload = {
        schemaVersion: "customer-statement.v1",
        redaction: {
          profile: "CUSTOMER_STATEMENT_EXTERNAL_SAFE_V1",
          contactAndAuthenticationFieldsIncluded: false,
        },
        source: {
          documentHashes: sourceDocumentHashes,
          stateHashes: sourceStateHashes,
          ledgerEntryIds: sourceLedgerEntryIds,
        },
      }
      const contentHash = hashBusinessPayload(payload)
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      if (isPrismaCode(error, "P2034")) retry()
      if (isPrismaCode(error, "P2002")) replay()
      const event = await recordBusinessEventInTx({
        eventType: "customer.statement.snapshot.created",
        outboxMessages: [],
      })
      const snapshot = await tx.customerStatementSnapshot.create({
        data: { supersedesStatementId: latest?.id ?? null },
      })
      await markBusinessEventAppliedInTx(tx, command.organizationId, event.event.id)
      await tx.auditLog.create({
        data: { action: "CUSTOMER_STATEMENT_SNAPSHOT_CREATED" },
      })
    `,
    tests: `
      freezes a complete redacted statement
      immutable initial paid evidence
      fails closed when movement evidence
      fails closed instead of persisting a truncated statement
      replays the exact idempotent snapshot
      supersedes the prior scope snapshot
    `,
  }
}

function verifiedCustomerStatementExternalAccessFoundationSource() {
  return {
    schema: `
      model CustomerStatementAccessToken {
        tokenHash String
        jtiHash String
        statementContentHash String
        allowView Boolean @default(true)
        allowDispute Boolean @default(false)
        allowPromiseToPay Boolean @default(false)
      }
      model CustomerStatementAccessLog {
        tokenHashPrefix String
        ipHash String?
        userAgentHash String?
        responseHash String?
      }
      model CustomerStatementRecipientAction {
        recipientNote String
        noteHash String
        payloadHash String
      }
      model CustomerStatementRecipientActionState {
        previousStateHash String?
        stateHash String
      }
    `,
    migration: `
      CREATE TABLE "customer_statement_access_tokens";
      CREATE TABLE "customer_statement_access_logs";
      CREATE TABLE "customer_statement_recipient_actions";
      CREATE TABLE "customer_statement_recipient_action_states";
      customer_statement_access_tokens_hash_check
      customer_statement_access_tokens_scope_check
      customer_statement_access_tokens_guard_mutation_trigger
      customer_statement_access_logs_prevent_mutation_trigger
      customer_statement_recipient_actions_prevent_mutation_trigger
      customer_statement_recipient_action_states_prevent_mutation_trigger
    `,
    tokenService: `
      const TOKEN_SCOPE = "customer_statement"
      process.env.AQSTOQFLOW_STATEMENT_TOKEN_SECRET || process.env.STATEMENT_TOKEN_SECRET
      secret.length >= 32
      createHmac("sha256", secret)
      timingSafeEqual(leftBuffer, rightBuffer)
      statementContentHash: input.statementContentHash
      payload.statementSnapshotId !== input.statementSnapshotId
      payload.exp <= nowSeconds
    `,
    accessService: `
      hashCustomerStatementAccessValue(token)
      hashCustomerStatementAccessValue(jti)
      const tokenRow = { tokenHash, jtiHash, statementContentHash: snapshot.contentHash }
      hashBusinessPayload(snapshot.statementPayload) !== snapshot.contentHash
      row.status !== CustomerStatementAccessTokenStatus.ACTIVE
      !permissionAllowed(input.action, row, payload.permissions)
      FORBIDDEN_EXTERNAL_KEYS.has(key)
      ipHash: optionalHash(input.ipAddress)
      userAgentHash: optionalHash(input.userAgent)
      tx.customerStatementAccessToken.updateMany({
        data: { status: CustomerStatementAccessTokenStatus.REVOKED },
      })
      action: "CUSTOMER_STATEMENT_ACCESS_TOKEN_REVOKED"
    `,
    recipientActionService: `
      requestedAmount.gt(opening.plus(debit))
      requestedAmount.gt(access.snapshot.closingBalance)
      eventType: "customer.statement.recipient_action.created"
      const action = await tx.customerStatementRecipientAction.create({})
      const state = await tx.customerStatementRecipientActionState.create({
        previousStateHash: null,
        noteHash,
        payloadHash,
      })
      markBusinessEventAppliedInTx(
      recordCustomerStatementAccessInTx(tx, {
    `,
    viewRoute: `
      if (!token) throw new NotFoundError("Statement not found")
      response.headers.set("Cache-Control", "private, no-store, max-age=0")
    `,
    actionRoute: `
      if (!token) throw new NotFoundError("Statement not found")
      actionType !== "DISPUTE" && actionType !== "PROMISE_TO_PAY"
      status: result.replayed ? 200 : 201
      response.headers.set("Cache-Control", "private, no-store, max-age=0")
    `,
    tests: `
      rejects expired tokens and unsafe secret
      returns a redacted view and appends only hashed request/access evidence
      rejects revoked access before counters or view logs are written
      creates an immutable dispute with an OPEN hash-chained state
      creates a bounded promise-to-pay
      rejects missing tokens without looking up a statement
      rejects missing tokens before parsing recipient evidence
    `,
  }
}

function verifiedConsentedReferralLaunchSource() {
  return {
    schema:
      "model ReferralAttribution {} model ReferralAttributionEvent {} " +
      "model CustomerStatementDelivery { consentEvidenceHash String } " +
      "model CustomerStatementDeliveryState {} " +
      "model AccountantClientInvite { inviteTokenHash String @unique consentEvidenceHash String } " +
      "model AccountantClientInviteState {}",
    deliveryMigration:
      'CREATE TABLE "referral_attributions"; ' +
      'CREATE TABLE "referral_attribution_events"; ' +
      'CREATE TABLE "customer_statement_deliveries"; ' +
      'CREATE TABLE "customer_statement_delivery_states"; ' +
      "referral_attributions_prevent_mutation_trigger " +
      "referral_attribution_events_prevent_mutation_trigger " +
      "customer_statement_deliveries_prevent_mutation_trigger " +
      "customer_statement_delivery_states_prevent_mutation_trigger",
    inviteMigration:
      'CREATE TABLE "accountant_client_invites"; ' +
      'CREATE TABLE "accountant_client_invite_states"; ' +
      "accountant_client_invites_token_hash_check " +
      "accountant_client_invites_email_check " +
      "accountant_client_invites_consent_check " +
      "accountant_client_invites_prevent_mutation_trigger " +
      "accountant_client_invite_states_prevent_mutation_trigger",
    statementEnvelope:
      'Buffer.from("customer_statement_delivery.v1", "utf8") ' +
      "environment.AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY " +
      'createCipheriv("aes-256-gcm", key, iv) cipher.setAAD(ENVELOPE_AAD) ' +
      'createDecipheriv("aes-256-gcm", key, iv) decipher.setAuthTag(tag)',
    statementDelivery:
      "if (!SHA256_EVIDENCE_PATTERN.test(input.consentEvidenceHash)) throw error " +
      "tx.referralAttribution.create({ issueCustomerStatementAccessTokenInTx(tx, { " +
      'sealCustomerStatementDeliveryEnvelope({ schemaVersion: "customer-statement-delivery.v1" ' +
      'rawDestinationStored: false rawTokenStored: false providerEnvelope: "AES_256_GCM" ' +
      "tx.customerStatementDelivery.create({ tx.customerStatementDeliveryState.create({",
    statementWorker:
      "sha256(payload.sealedEnvelope) !== payload.sealedEnvelopeHash " +
      "delivery.statementContentHash !== payload.statementContentHash " +
      "destinationHash(delivery.channel, envelope.destination) !== payload.destinationHash " +
      'delivery.token.status !== "ACTIVE" ' +
      "delivery.token.expiresAt.getTime() <= now.getTime() " +
      "dependencies.sendCustomerStatementDelivery({",
    inviteEnvelope:
      'Buffer.from("accountant_client_invite_delivery.v1", "utf8") ' +
      "environment.AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY " +
      'createCipheriv("aes-256-gcm", key, iv) cipher.setAAD(ENVELOPE_AAD) ' +
      'createDecipheriv("aes-256-gcm", key, iv) decipher.setAuthTag(tag)',
    inviteService:
      'const inviteToken = randomBytes(32).toString("base64url") ' +
      'const inviteTokenHash = hashBusinessPayload(inviteToken) "?invite=" + encodeURIComponent(inviteToken) ' +
      'sealAccountantClientInviteEnvelope({ rawEmailStored: false rawInviteTokenStored: false providerEnvelope: "AES_256_GCM" ' +
      "tx.accountantClientInvite.create({ tx.accountantClientInviteState.create({ " +
      "inviteTokenMatches(input.inviteToken, invite.inviteTokenHash) timingSafeEqual(actual, expected) " +
      "tx.accountantAccessGrant.create({ " +
      'consentContract: "explicit-client-and-recipient-consent.v1" previousStateHash: current.stateHash',
    inviteWorker:
      "hashBusinessPayload(payload.sealedEnvelope) !== payload.sealedEnvelopeHash " +
      'const inviteToken = inviteUrl.searchParams.get("invite") ?? "" ' +
      "hashBusinessPayload(inviteToken) !== invite.inviteTokenHash " +
      "dependencies.sendAccountantClientInvite({",
    referral:
      "accountantClientInvite: { select: { inviteTokenHash: true } } " +
      "inviteTokenMatches(inviteToken, attribution.accountantClientInvite.inviteTokenHash) " +
      'params.set("invite", inviteToken) acceptAccountantClientInviteInTx(tx, { ' +
      'inviteToken: input.accountantInviteToken ?? "" ' +
      "recipientAccepted: input.accountantInviteAccepted === true",
    referralRoute: 'requestUrl.searchParams.get("invite")',
    registrationService:
      "accountantInviteToken: data.accountantInviteToken " +
      "accountantInviteAccepted: data.accountantInviteAccepted === true",
    registrationSurfaces:
      'Boolean(params.get("invite")) accountantInviteToken: params.get("invite") || undefined ' +
      "You must accept the client mandate.",
    statementActions:
      'permission: "accounting.exports.create" organizationId: ctx.orgId issuedById: ctx.userId ' +
      'moduleSlug: "accounting" mode: "enforce" audit: true ' +
      'surface: "actions/accounting/customer-statement.actions.ts:create" ' +
      'moduleSlug: "accounting" mode: "enforce" audit: true ' +
      'surface: "actions/accounting/customer-statement.actions.ts:deliver" ' +
      'moduleSlug: "accounting" mode: "enforce" audit: true ' +
      'surface: "actions/accounting/customer-statement.actions.ts:revoke"',
    accountantActions:
      'permission: "accounting.close.accountant.invite" inviteOrGrantAccountantAccess(ctx.orgId, ctx.userId,',
    internalWorkflow:
      'globalThis.crypto.subtle.digest("SHA-256" consentBasis: "EXPLICIT" queueCustomerStatementDeliveryAction({',
    publicPortal:
      'cache: "no-store" credentials: "omit" referrerPolicy: "no-referrer" method: "POST" statement.branding.referralUrl',
    workerRunner:
      "service.runCustomerStatementDeliveryWorker(common) service.runAccountantClientInviteWorker(common)",
    tests:
      "queues consented email delivery without persisting the raw recipient or token " +
      "fails the lease closed before provider access when envelope integrity drifts " +
      "queues an immutable, consent-bound invite without persisting raw email " +
      "rejects a matching email and referral when the invite secret is wrong " +
      "fails closed before provider delivery when the invite secret drifts " +
      "rejects an accountant referral click without its secret token " +
      "creates an immutable snapshot and queues a consent-hashed delivery " +
      "renders the verified snapshot, receivable lines, and branded referral CTA " +
      "runs both referral delivery queues with the same bounded scope",
  }
}

function writeReadyFixture(root) {
  const customerSettlement = verifiedCustomerSettlementFoundationSource()
  const customerSettlementReversal =
    verifiedCustomerSettlementReversalSource()
  const customerReceivable =
    verifiedPostedCustomerReceivableFoundationSource()
  const customerStatement =
    verifiedCustomerStatementSnapshotFoundationSource()
  const customerStatementExternalAccess =
    verifiedCustomerStatementExternalAccessFoundationSource()
  const referralLaunch = verifiedConsentedReferralLaunchSource()
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
    '{"scripts":{"report:trust:export:gate":"node gate","policy:gates":"npm run report:trust:export:gate","worker:referrals":"node scripts/referral-delivery-worker.ts"}}',
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
    accountantAccessActionsSource() + " " + referralLaunch.accountantActions,
  )
  write(
    root,
    "prisma/schema.prisma",
    "model AccountantAccessGrant consentEvidenceHash effectiveFrom expiresAt AccountantAccessRole " +
      customerSettlement.schema + " " + customerSettlementReversal.schema + " " +
      customerReceivable.schema + " " + customerStatement.schema + " " +
      customerStatementExternalAccess.schema + " " + referralLaunch.schema,
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
    "services/accounting/missing-close-evidence-accountant-review-queue-contracts.ts",
    verifiedAccountantMissingProofReviewContractsSource(),
  )
  write(
    root,
    "services/accounting/missing-close-evidence-response-acceptance-contracts.ts",
    verifiedMissingProofResponseAcceptanceContractsSource(),
  )
  write(
    root,
    "services/accounting/missing-close-evidence-accountant-review-queue.service.ts",
    verifiedAccountantMissingProofReviewServiceSource(),
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
  const customerLedgerKernel = verifiedCustomerLedgerBalanceKernelSource()
  write(
    root,
    "services/accounting/customer-ledger.service.ts",
    `${customerLedgerKernel.service} ${customerSettlementReversal.ledger}`,
  )
  write(
    root,
    "services/pos/pos.service.ts",
    `${customerLedgerKernel.pos} ${customerReceivable.posService}`,
  )
  write(
    root,
    "services/accounting/customer-settlement.schemas.ts",
    `${customerSettlement.commandSchema} ${customerSettlementReversal.commandSchema}`,
  )
  write(
    root,
    "services/accounting/customer-settlement.service.ts",
    customerSettlement.service,
  )
  write(
    root,
    "services/accounting/default-posting-rules.ts",
    customerSettlement.postingRules,
  )
  write(
    root,
    "lib/security/rbac-permissions.ts",
    `${customerSettlement.rbac} ${customerSettlementReversal.rbac}`,
  )
  write(
    root,
    "services/controls/sensitive-action.service.ts",
    `${customerSettlement.sensitiveAction} ${customerSettlementReversal.sensitiveAction}`,
  )
  write(
    root,
    "prisma/migrations/20260808120000_customer_settlement_allocation_foundation/migration.sql",
    customerSettlement.migration,
  )
  write(
    root,
    "prisma/migrations/20260808133000_customer_settlement_compensating_reversal_foundation/migration.sql",
    customerSettlementReversal.migration,
  )
  write(
    root,
    "services/accounting/customer-settlement-reversal.service.ts",
    customerSettlementReversal.service,
  )
  write(
    root,
    "actions/finance/customer-settlement.actions.ts",
    verifiedCustomerSettlementReversalActionSource(),
  )
  write(
    root,
    "services/accounting/ar-open-item.service.ts",
    customerSettlementReversal.arOpenItem,
  )
  write(
    root,
    "prisma/migrations/20260809100000_customer_receivable_document_foundation/migration.sql",
    customerReceivable.migration,
  )
  write(
    root,
    "services/accounting/customer-receivable-document.service.ts",
    customerReceivable.documentService,
  )
  write(
    root,
    "services/accounting/customer-receivable-lifecycle.service.ts",
    customerReceivable.lifecycleService,
  )
  write(
    root,
    "services/accounting/customer-receivable-backfill.service.ts",
    customerReceivable.backfillService,
  )
  write(
    root,
    "services/accounting/__tests__/customer-receivable-document.service.test.ts",
    customerReceivable.tests,
  )
  write(
    root,
    "services/accounting/__tests__/customer-receivable-lifecycle.service.test.ts",
    "",
  )
  write(
    root,
    "services/accounting/__tests__/customer-receivable-backfill.service.test.ts",
    "",
  )
  write(
    root,
    "services/accounting/__tests__/ar-open-item.service.test.ts",
    "",
  )
  write(
    root,
    "prisma/migrations/20260809113000_customer_statement_snapshot_foundation/migration.sql",
    customerStatement.migration,
  )
  write(
    root,
    "services/accounting/customer-statement.service.ts",
    customerStatement.service,
  )
  write(
    root,
    "services/accounting/__tests__/customer-statement.service.test.ts",
    customerStatement.tests,
  )
  write(
    root,
    "prisma/migrations/20260809130000_customer_statement_external_access/migration.sql",
    customerStatementExternalAccess.migration,
  )
  write(
    root,
    "services/accounting/customer-statement-token.ts",
    customerStatementExternalAccess.tokenService,
  )
  write(
    root,
    "services/accounting/customer-statement-access.service.ts",
    customerStatementExternalAccess.accessService,
  )
  write(
    root,
    "services/accounting/customer-statement-recipient-action.service.ts",
    customerStatementExternalAccess.recipientActionService,
  )
  write(
    root,
    "app/api/customer-statements/[statementId]/route.ts",
    customerStatementExternalAccess.viewRoute,
  )
  write(
    root,
    "app/api/customer-statements/[statementId]/actions/route.ts",
    customerStatementExternalAccess.actionRoute,
  )
  write(
    root,
    "services/accounting/__tests__/customer-statement-token.test.ts",
    customerStatementExternalAccess.tests,
  )
  write(
    root,
    "services/accounting/__tests__/customer-statement-access.service.test.ts",
    "",
  )
  write(
    root,
    "services/accounting/__tests__/customer-statement-recipient-action.service.test.ts",
    "",
  )
  write(root, "app/api/customer-statements/[statementId]/__tests__/route.test.ts", "")
  write(
    root,
    "app/api/customer-statements/[statementId]/actions/__tests__/route.test.ts",
    "",
  )
  write(
    root,
    "prisma/migrations/20260809143000_customer_statement_delivery_referral/migration.sql",
    referralLaunch.deliveryMigration,
  )
  write(
    root,
    "prisma/migrations/20260809160000_accountant_client_invite_onboarding/migration.sql",
    referralLaunch.inviteMigration,
  )
  write(
    root,
    "services/accounting/customer-statement-delivery-envelope.ts",
    referralLaunch.statementEnvelope,
  )
  write(
    root,
    "services/accounting/customer-statement-delivery.service.ts",
    referralLaunch.statementDelivery,
  )
  write(
    root,
    "services/communication/customer-statement-delivery-worker.service.ts",
    referralLaunch.statementWorker,
  )
  write(
    root,
    "services/accounting/accountant-client-invite-envelope.ts",
    referralLaunch.inviteEnvelope,
  )
  write(
    root,
    "services/accounting/accountant-client-invite.service.ts",
    referralLaunch.inviteService,
  )
  write(
    root,
    "services/communication/accountant-client-invite-worker.service.ts",
    referralLaunch.inviteWorker,
  )
  write(
    root,
    "services/referrals/referral-attribution.service.ts",
    referralLaunch.referral,
  )
  write(
    root,
    "app/api/referrals/[referralCode]/route.ts",
    referralLaunch.referralRoute,
  )
  write(
    root,
    "services/users/user-identity.service.ts",
    referralLaunch.registrationService,
  )
  write(
    root,
    "components/auth/BeautifulRegisterForm.tsx",
    referralLaunch.registrationSurfaces,
  )
  write(
    root,
    "components/auth/v2/RegisterV2Form.tsx",
    referralLaunch.registrationSurfaces,
  )
  write(root, "types/types.ts", "")
  write(
    root,
    "actions/accounting/customer-statement.actions.ts",
    referralLaunch.statementActions,
  )
  write(
    root,
    "app/[locale]/(dashboard)/dashboard/customers/[id]/statement/page.tsx",
    "",
  )
  write(
    root,
    "components/customers/CustomerStatementWorkflow.tsx",
    referralLaunch.internalWorkflow,
  )
  write(
    root,
    "app/customer-statement/[statementId]/page.tsx",
    "",
  )
  write(
    root,
    "app/customer-statement/[statementId]/CustomerStatementPortal.tsx",
    referralLaunch.publicPortal,
  )
  write(
    root,
    "scripts/referral-delivery-worker.ts",
    referralLaunch.workerRunner,
  )
  write(
    root,
    "services/accounting/__tests__/customer-statement-delivery.service.test.ts",
    referralLaunch.tests,
  )
  write(
    root,
    "services/communication/__tests__/customer-statement-delivery-worker.service.test.ts",
    "",
  )
  write(
    root,
    "services/accounting/__tests__/accountant-client-invite.service.test.ts",
    "",
  )
  write(
    root,
    "services/communication/__tests__/accountant-client-invite-worker.service.test.ts",
    "",
  )
  write(root, "services/referrals/__tests__/referral-attribution.service.test.ts", "")
  write(root, "components/customers/__tests__/CustomerStatementWorkflow.test.tsx", "")
  write(
    root,
    "actions/accounting/__tests__/customer-statement.actions.test.ts",
    "registers every statement mutation behind the enforced accounting entitlement",
  )
  write(
    root,
    "app/[locale]/(dashboard)/dashboard/customers/[id]/statement/__tests__/page.test.tsx",
    "does not enumerate customer data when Accounting is not entitled",
  )
  write(
    root,
    "app/customer-statement/[statementId]/__tests__/CustomerStatementPortal.test.tsx",
    "",
  )
  write(root, "scripts/__tests__/referral-delivery-worker.test.ts", "")
  write(
    root,
    "services/accounting/posting.service.ts",
    customerSettlementReversal.posting,
  )
  write(
    root,
    "config/permissions.ts",
    customerSettlementReversal.permissions,
  )
}

describe("report trust and export certification gate", () => {
  it("passes when report trust is service-owned and explicit", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const report = buildReportTrustExportReadiness(root, { mode: "fail" })
    expect(report.summary).toMatchObject({
      status: "ready",
      readyCount: 35,
      blockerCount: 0,
    })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it.each([
    [
      "immutable document trigger removed",
      "prisma/migrations/20260809100000_customer_receivable_document_foundation/migration.sql",
      "customer_receivable_documents_prevent_mutation_trigger",
      "customer_receivable_documents_mutation_trigger_removed",
    ],
    [
      "lifecycle hash-chain predecessor removed",
      "services/accounting/customer-receivable-lifecycle.service.ts",
      "previousStateHash: latestState.stateHash",
      "previousStateHash: null",
    ],
    [
      "posted business-event evidence removed",
      "services/accounting/customer-receivable-document.service.ts",
      'eventType: "customer.receivable.posted"',
      'eventType: "customer.receivable.untracked"',
    ],
    [
      "fail-closed open-item test removed",
      "services/accounting/__tests__/customer-receivable-document.service.test.ts",
      "fails closed when no lifecycle state exists",
      "returns an item when no lifecycle state exists",
    ],
  ])(
    "blocks a posted customer-receivable foundation with %s",
    (_name, relativePath, from, to) => {
      const root = makeTempRepo()
      writeReadyFixture(root)
      const target = path.join(root, relativePath)
      const source = fs.readFileSync(target, "utf8")
      expect(source).toContain(from)
      write(root, relativePath, source.replace(from, to))

      const report = buildReportTrustExportReadiness(root, { mode: "fail" })

      expect(report.blockers).toContain(
        "posted_customer_receivable_document_foundation",
      )
      expect(gateResultForReport(report, "fail").exitCode).toBe(1)
    },
  )

  it.each([
    [
      "immutable snapshot trigger removed",
      "prisma/migrations/20260809113000_customer_statement_snapshot_foundation/migration.sql",
      "customer_statement_snapshots_prevent_mutation_trigger",
      "customer_statement_snapshots_mutation_trigger_removed",
    ],
    [
      "balance conservation removed",
      "services/accounting/customer-statement.service.ts",
      "openingBalance.plus(periodDebits).minus(periodCredits).eq(closingBalance)",
      "closingBalance.eq(closingBalance)",
    ],
    [
      "external-safe redaction weakened",
      "services/accounting/customer-statement.service.ts",
      "contactAndAuthenticationFieldsIncluded: false",
      "contactAndAuthenticationFieldsIncluded: true",
    ],
    [
      "truncation fail-closed test removed",
      "services/accounting/__tests__/customer-statement.service.test.ts",
      "fails closed instead of persisting a truncated statement",
      "persists a truncated statement",
    ],
  ])(
    "blocks an immutable customer statement foundation with %s",
    (_name, relativePath, from, to) => {
      const root = makeTempRepo()
      writeReadyFixture(root)
      const target = path.join(root, relativePath)
      const source = fs.readFileSync(target, "utf8")
      expect(source).toContain(from)
      write(root, relativePath, source.replace(from, to))

      const report = buildReportTrustExportReadiness(root, { mode: "fail" })

      expect(report.blockers).toContain(
        "immutable_customer_statement_snapshot_foundation",
      )
      expect(gateResultForReport(report, "fail").exitCode).toBe(1)
    },
  )

  it.each([
    [
      "token identity guard removed",
      "prisma/migrations/20260809130000_customer_statement_external_access/migration.sql",
      "customer_statement_access_tokens_guard_mutation_trigger",
      "customer_statement_access_tokens_mutation_guard_removed",
    ],
    [
      "constant-time signature comparison removed",
      "services/accounting/customer-statement-token.ts",
      "timingSafeEqual(leftBuffer, rightBuffer)",
      "leftBuffer.equals(rightBuffer)",
    ],
    [
      "snapshot content integrity check removed",
      "services/accounting/customer-statement-access.service.ts",
      "hashBusinessPayload(snapshot.statementPayload) !== snapshot.contentHash",
      "snapshot.contentHash !== snapshot.contentHash",
    ],
    [
      "compare-and-set revocation removed",
      "services/accounting/customer-statement-access.service.ts",
      "tx.customerStatementAccessToken.updateMany({",
      "tx.customerStatementAccessToken.update({",
    ],
    [
      "append-only recipient state creation removed",
      "services/accounting/customer-statement-recipient-action.service.ts",
      "tx.customerStatementRecipientActionState.create({",
      "tx.customerStatementRecipientActionState.update({",
    ],
    [
      "public statement caching enabled",
      "app/api/customer-statements/[statementId]/route.ts",
      '"private, no-store, max-age=0"',
      '"public, max-age=300"',
    ],
  ])(
    "blocks signed customer-statement external access with %s",
    (_name, relativePath, from, to) => {
      const root = makeTempRepo()
      writeReadyFixture(root)
      const target = path.join(root, relativePath)
      const source = fs.readFileSync(target, "utf8")
      expect(source).toContain(from)
      write(root, relativePath, source.replace(from, to))

      const report = buildReportTrustExportReadiness(root, { mode: "fail" })

      expect(report.blockers).toContain(
        "signed_customer_statement_external_access_foundation",
      )
      expect(gateResultForReport(report, "fail").exitCode).toBe(1)
    },
  )

  it.each([
    [
      "statement delivery append-only trigger removed",
      "prisma/migrations/20260809143000_customer_statement_delivery_referral/migration.sql",
      "customer_statement_deliveries_prevent_mutation_trigger",
      "customer_statement_deliveries_mutation_allowed",
    ],
    [
      "accountant invite append-only trigger removed",
      "prisma/migrations/20260809160000_accountant_client_invite_onboarding/migration.sql",
      "accountant_client_invites_prevent_mutation_trigger",
      "accountant_client_invites_mutation_allowed",
    ],
    [
      "statement provider envelope encryption weakened",
      "services/accounting/customer-statement-delivery-envelope.ts",
      'createCipheriv("aes-256-gcm", key, iv)',
      'createCipheriv("aes-128-cbc", key, iv)',
    ],
    [
      "statement worker content integrity removed",
      "services/communication/customer-statement-delivery-worker.service.ts",
      "delivery.statementContentHash !== payload.statementContentHash",
      "delivery.statementContentHash !== delivery.statementContentHash",
    ],
    [
      "accountant acceptance token guard removed",
      "services/accounting/accountant-client-invite.service.ts",
      "inviteTokenMatches(input.inviteToken, invite.inviteTokenHash)",
      "Boolean(input.inviteToken)",
    ],
    [
      "accountant worker secret verification removed",
      "services/communication/accountant-client-invite-worker.service.ts",
      "hashBusinessPayload(inviteToken) !== invite.inviteTokenHash",
      "hashBusinessPayload(inviteToken) !== hashBusinessPayload(inviteToken)",
    ],
    [
      "referral redirect secret validation removed",
      "services/referrals/referral-attribution.service.ts",
      "inviteTokenMatches(",
      "Boolean(",
    ],
    [
      "registration invite-token surface removed",
      "components/auth/BeautifulRegisterForm.tsx",
      'Boolean(params.get("invite"))',
      "true",
    ],
    [
      "internal consent basis weakened",
      "components/customers/CustomerStatementWorkflow.tsx",
      'consentBasis: "EXPLICIT"',
      'consentBasis: "IMPLIED"',
    ],
    [
      "public referral call-to-action removed",
      "app/customer-statement/[statementId]/CustomerStatementPortal.tsx",
      "statement.branding.referralUrl",
      "null",
    ],
    [
      "accountant invitation queue omitted from runner",
      "scripts/referral-delivery-worker.ts",
      "service.runAccountantClientInviteWorker(common)",
      "Promise.resolve([])",
    ],
    [
      "statement Accounting entitlement removed",
      "actions/accounting/customer-statement.actions.ts",
      'moduleSlug: "accounting"',
      'moduleSlug: "sales"',
    ],
    [
      "statement route no-enumeration regression removed",
      "app/[locale]/(dashboard)/dashboard/customers/[id]/statement/__tests__/page.test.tsx",
      "does not enumerate customer data when Accounting is not entitled",
      "enumerates customer data before checking Accounting entitlement",
    ],
    [
      "fail-closed invite-secret regression removed",
      "services/accounting/__tests__/customer-statement-delivery.service.test.ts",
      "rejects a matching email and referral when the invite secret is wrong",
      "accepts a matching email without its invite secret",
    ],
  ])(
    "blocks the consented customer referral launch foundation with %s",
    (_name, relativePath, from, to) => {
      const root = makeTempRepo()
      writeReadyFixture(root)
      const target = path.join(root, relativePath)
      const source = fs.readFileSync(target, "utf8")
      expect(source).toContain(from)
      write(root, relativePath, source.replace(from, to))

      const report = buildReportTrustExportReadiness(root, { mode: "fail" })

      expect(report.blockers).toContain(
        "consented_customer_referral_launch_foundation",
      )
      expect(gateResultForReport(report, "fail").exitCode).toBe(1)
    },
  )

  it.each([
    [
      "caller-supplied balance",
      "service",
      "enforceCreditLimit?: boolean",
      "balanceAfter: CustomerLedgerAmount",
    ],
    [
      "unscoped customer lookup",
      "service",
      "where: { id: customerId, organizationId, deletedAt: null },",
      "where: { id: customerId, deletedAt: null },",
    ],
    [
      "missing type-polarity validation",
      "service",
      "validateTypePolarity(input.type, debit, credit)",
      "void input.type",
    ],
    [
      "negative resulting balance",
      "service",
      "if (balanceAfter.lt(0)) throw new BusinessRuleError()",
      "if (false) throw new BusinessRuleError()",
    ],
    [
      "missing service credit-limit control",
      "service",
      "input.enforceCreditLimit &&",
      "false &&",
    ],
    [
      "non-CAS customer update",
      "service",
      "const balanceClaim = await tx.customer.updateMany({",
      "const balanceClaim = await tx.customer.update({",
    ],
    [
      "unscoped balance claim",
      "service",
      "id: customerId,\n          organizationId,\n          deletedAt: null,\n          currentBalance,",
      "id: customerId,\n          deletedAt: null,\n          currentBalance,",
    ],
    [
      "weak compare-and-set result",
      "service",
      "if (balanceClaim.count !== 1) throw new ConflictError()",
      "if (balanceClaim.count < 0) throw new ConflictError()",
    ],
    [
      "POS sale bypasses credit-limit enforcement",
      "pos",
      "enforceCreditLimit: true,",
      "enforceCreditLimit: false,",
    ],
    [
      "POS sale supplies a balance",
      "pos",
      "debit: onAccountAmount,\n        enforceCreditLimit: true,",
      "debit: onAccountAmount,\n        balanceAfter: nextBalance,\n        enforceCreditLimit: true,",
    ],
    [
      "POS void reads caller-owned running balance",
      "pos",
      "createCustomerLedgerEntry(tx, {\n        type: LedgerEntryType.CREDIT_NOTE,",
      "sale.customer.currentBalance\n      createCustomerLedgerEntry(tx, {\n        type: LedgerEntryType.CREDIT_NOTE,",
    ],
  ])("blocks a customer-ledger kernel with %s", (_name, target, from, to) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const sources = verifiedCustomerLedgerBalanceKernelSource()
    const paths = {
      service: "services/accounting/customer-ledger.service.ts",
      pos: "services/pos/pos.service.ts",
    }
    expect(sources[target]).toContain(from)
    write(root, paths[target], sources[target].replace(from, to))

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "customer_ledger_service_owned_balance_integrity_kernel",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it.each([
    [
      "missing settlement aggregate",
      "prisma/schema.prisma",
      "model CustomerSettlement {",
      "model RemovedCustomerSettlement {",
    ],
    [
      "missing idempotency uniqueness",
      "prisma/schema.prisma",
      "@@unique([organizationId, idempotencyKey])",
      "@@index([organizationId, idempotencyKey])",
    ],
    [
      "missing allocation migration",
      "prisma/migrations/20260808120000_customer_settlement_allocation_foundation/migration.sql",
      'CREATE TABLE "customer_settlement_allocations"',
      'CREATE TABLE "removed_customer_settlement_allocations"',
    ],
    [
      "unsupported command method surface",
      "services/accounting/customer-settlement.schemas.ts",
      '"CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "CHEQUE"',
      '"CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "CREDIT"',
    ],
    [
      "unbounded allocations",
      "services/accounting/customer-settlement.schemas.ts",
      ".min(1).max(50)",
      ".min(1)",
    ],
    [
      "non-critical collection permission",
      "lib/security/rbac-permissions.ts",
      '"finance.receivables.collect": "crit"',
      '"finance.receivables.collect": "med"',
    ],
    [
      "stale-auth allowance",
      "services/controls/sensitive-action.service.ts",
      "freshAuthMaxAgeSeconds: 300",
      "freshAuthMaxAgeSeconds: 600",
    ],
    [
      "non-serializable transaction",
      "services/accounting/customer-settlement.service.ts",
      "Prisma.TransactionIsolationLevel.Serializable",
      "Prisma.TransactionIsolationLevel.ReadCommitted",
    ],
    [
      "missing serialization retry",
      "services/accounting/customer-settlement.service.ts",
      'isPrismaCode(error, "P2034")',
      'isPrismaCode(error, "REMOVED")',
    ],
    [
      "unscoped actor",
      "services/accounting/customer-settlement.service.ts",
      "id: actorId, organizationId, isActive: true",
      "id: actorId, isActive: true",
    ],
    [
      "duplicate allocations allowed",
      "services/accounting/customer-settlement.service.ts",
      "allocationIds.length !== new Set(allocationIds).size",
      "allocationIds.length < 0",
    ],
    [
      "allocation conservation removed",
      "services/accounting/customer-settlement.service.ts",
      "!allocatedTotal.eq(amount)",
      "allocatedTotal.lt(0)",
    ],
    [
      "cross-customer sales-order lookup",
      "services/accounting/customer-settlement.service.ts",
      "organizationId, customerId: customer.id, deletedAt: null",
      "organizationId, deletedAt: null",
    ],
    [
      "open-balance limit removed",
      "services/accounting/customer-settlement.service.ts",
      "allocation.amount.gt(openAmount)",
      "allocation.amount.lt(0)",
    ],
    [
      "customer ledger kernel bypass",
      "services/accounting/customer-settlement.service.ts",
      "createCustomerLedgerEntry(tx, {",
      "tx.customerLedgerEntry.create({",
    ],
    [
      "nullable allocation ledger link",
      "prisma/schema.prisma",
      "customerLedgerEntryId String @unique",
      "customerLedgerEntryId String? @unique",
    ],
    [
      "nullable migration ledger link",
      "prisma/migrations/20260808120000_customer_settlement_allocation_foundation/migration.sql",
      '"customerLedgerEntryId" TEXT NOT NULL',
      '"customerLedgerEntryId" TEXT',
    ],
    [
      "allocation ledger link omitted",
      "services/accounting/customer-settlement.service.ts",
      "customerLedgerEntryId: ledgerEntry.id",
      "customerLedgerEntryId: undefined",
    ],
    [
      "replay evidence amount check removed",
      "services/accounting/customer-settlement.service.ts",
      "!entry.credit.eq(allocation.amount)",
      "entry.credit.eq(allocation.amount)",
    ],
    [
      "wrong accounting source",
      "services/accounting/customer-settlement.service.ts",
      "AccountingSourceType.CUSTOMER_SETTLEMENT",
      "AccountingSourceType.POS_PAYMENT",
    ],
    [
      "receivables clearing removed",
      "services/accounting/default-posting-rules.ts",
      'mappingKey: "ACCOUNTS_RECEIVABLE"',
      'mappingKey: "SALES_REVENUE"',
    ],
    [
      "business event removed",
      "services/accounting/customer-settlement.service.ts",
      'eventType: "customer.settlement.posted"',
      'eventType: "customer.settlement.missing"',
    ],
  ])("blocks a customer-settlement foundation with %s", (_name, relativePath, from, to) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const target = path.join(root, relativePath)
    const source = fs.readFileSync(target, "utf8")
    expect(source).toContain(from)
    write(root, relativePath, source.replace(from, to))

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "customer_settlement_allocation_source_foundation",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it.each([
    [
      "missing reversal enum",
      "prisma/schema.prisma",
      "PAYMENT_REVERSAL",
      "REMOVED_REVERSAL",
    ],
    [
      "nullable state invariant removed",
      "prisma/migrations/20260808133000_customer_settlement_compensating_reversal_foundation/migration.sql",
      '"reversalIdempotencyPayloadHash" IS NULL',
      '"reversalIdempotencyPayloadHash" IS NOT NULL',
    ],
    [
      "maker-checker database guard removed",
      "prisma/migrations/20260808133000_customer_settlement_compensating_reversal_foundation/migration.sql",
      '"reversedById" <> "receivedById"',
      '"reversedById" = "receivedById"',
    ],
    [
      "unbounded reversal reason",
      "services/accounting/customer-settlement.schemas.ts",
      "reason: z.string().trim().min(3).max(500)",
      "reason: z.string()",
    ],
    [
      "actor omitted from idempotency hash",
      "services/accounting/customer-settlement-reversal.service.ts",
      "organizationId,\n        actorId,\n        customerSettlementId:",
      "organizationId,\n        customerSettlementId:",
    ],
    [
      "actor-bound assurance removed",
      "services/accounting/customer-settlement-reversal.service.ts",
      "freshAuth.claims.assuranceOrganizationId !== organizationId",
      "freshAuth.claims.assuranceOrganizationId === organizationId",
    ],
    [
      "serializable reversal removed",
      "services/accounting/customer-settlement-reversal.service.ts",
      "Prisma.TransactionIsolationLevel.Serializable",
      "Prisma.TransactionIsolationLevel.ReadCommitted",
    ],
    [
      "customer ledger kernel bypass",
      "services/accounting/customer-settlement-reversal.service.ts",
      "createCustomerLedgerEntry(tx, {",
      "tx.customerLedgerEntry.create({",
    ],
    [
      "final aggregate CAS removed",
      "services/accounting/customer-settlement-reversal.service.ts",
      "const completedClaim = await tx.customerSettlement.updateMany({",
      "const completedClaim = await tx.customerSettlement.update({",
    ],
    [
      "caller-controlled reversal clock restored",
      "services/accounting/customer-settlement-reversal.service.ts",
      "const now = new Date()",
      "const now = control.now",
    ],
    [
      "allocation CAS count check removed",
      "services/accounting/customer-settlement-reversal.service.ts",
      "if (allocationClaim.count !== 1) throw conflict",
      "if (allocationClaim.count > 1) throw conflict",
    ],
    [
      "applied reversal event replay validation removed",
      "services/accounting/customer-settlement-reversal.service.ts",
      "const reversalEvent = await tx.businessEvent.findFirst({",
      "const reversalEvent = await tx.businessEvent.findUnique({",
    ],
    [
      "final aggregate CAS count check removed",
      "services/accounting/customer-settlement-reversal.service.ts",
      "if (completedClaim.count !== 1) throw conflict",
      "if (completedClaim.count > 1) throw conflict",
    ],
    [
      "raw settlement persistence row returned",
      "services/accounting/customer-settlement-reversal.service.ts",
      "return { settlementId: settlement.id }",
      "return { settlement, settlementId: settlement.id }",
    ],
    [
      "AR reopening removed",
      "services/accounting/ar-open-item.service.ts",
      "? moneyText(money(entry.debit).negated())",
      "? moneyText(entry.credit)",
    ],
    [
      "source-owned bypass audit removed",
      "services/accounting/posting.service.ts",
      'action: "JOURNAL_ENTRY_SOURCE_OWNED_REVERSAL_BLOCKED"',
      'action: "JOURNAL_ENTRY_REVERSE"',
    ],
    [
      "critical reversal permission weakened",
      "lib/security/rbac-permissions.ts",
      '"finance.receivables.reverse": "crit"',
      '"finance.receivables.reverse": "med"',
    ],
  ])("blocks a customer-settlement reversal with %s", (_name, relativePath, from, to) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const target = path.join(root, relativePath)
    const source = fs.readFileSync(target, "utf8")
    expect(source).toContain(from)
    write(root, relativePath, source.replace(from, to))

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "customer_settlement_compensating_reversal_foundation",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it.each([
    [
      "wrong permission",
      "actions/finance/customer-settlement.actions.ts",
      'permission: "finance.receivables.reverse"',
      'permission: "finance.receivables.collect"',
    ],
    [
      "allowed-command audit removed",
      "actions/finance/customer-settlement.actions.ts",
      "auditAllowed: true",
      "auditAllowed: false",
    ],
    [
      "boolean fresh auth",
      "actions/finance/customer-settlement.actions.ts",
      "freshAuth: { maxAgeSeconds: 300 }",
      "freshAuth: true",
    ],
    [
      "weakened fresh-auth age",
      "actions/finance/customer-settlement.actions.ts",
      "freshAuth: { maxAgeSeconds: 300 }",
      "freshAuth: { maxAgeSeconds: 900 }",
    ],
    [
      "wrong commercial module",
      "actions/finance/customer-settlement.actions.ts",
      'moduleSlug: "finance"',
      'moduleSlug: "accounting"',
    ],
    [
      "observe-only module gate",
      "actions/finance/customer-settlement.actions.ts",
      'mode: "enforce"',
      'mode: "observe"',
    ],
    [
      "read-only entitlement intent",
      "actions/finance/customer-settlement.actions.ts",
      'accessIntent: "write"',
      'accessIntent: "read"',
    ],
    [
      "fresh-auth verification after parsing",
      "actions/finance/customer-settlement.actions.ts",
      "const freshAuth = verifiedFreshAuthEvidence(ctx)\n        const parsed = reverseCustomerSettlementInputSchema.parse(input)",
      "const parsed = reverseCustomerSettlementInputSchema.parse(input)\n        const freshAuth = verifiedFreshAuthEvidence(ctx)",
    ],
    [
      "user binding removed",
      "actions/finance/customer-settlement.actions.ts",
      "freshAuth.claims.userId !== ctx.userId",
      "freshAuth.claims.userId === ctx.userId",
    ],
    [
      "tenant binding removed",
      "actions/finance/customer-settlement.actions.ts",
      "freshAuth.claims.tenantId !== ctx.orgId",
      "freshAuth.claims.tenantId === ctx.orgId",
    ],
    [
      "assurance organization binding removed",
      "actions/finance/customer-settlement.actions.ts",
      "freshAuth.claims.assuranceOrganizationId !== ctx.orgId",
      "freshAuth.claims.assuranceOrganizationId === ctx.orgId",
    ],
    [
      "assurance level weakened",
      "actions/finance/customer-settlement.actions.ts",
      "freshAuth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD",
      "freshAuth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.NONE",
    ],
    [
      "authentication timestamp binding removed",
      "actions/finance/customer-settlement.actions.ts",
      "freshAuth.claims.lastAuthAt !== lastAuthAtMs",
      "freshAuth.claims.lastAuthAt === lastAuthAtMs",
    ],
    [
      "Date provenance check removed",
      "actions/finance/customer-settlement.actions.ts",
      "freshAuth?.lastAuthAt instanceof Date",
      "Boolean(freshAuth?.lastAuthAt)",
    ],
    [
      "synthetic authentication time",
      "actions/finance/customer-settlement.actions.ts",
      "lastAuthAt: new Date(lastAuthAtMs)",
      "lastAuthAt: new Date(Date.now())",
    ],
    [
      "attacker-controlled organization",
      "actions/finance/customer-settlement.actions.ts",
      "organizationId: ctx.orgId",
      "organizationId: input.organizationId",
    ],
    [
      "attacker-controlled actor",
      "actions/finance/customer-settlement.actions.ts",
      "actorId: ctx.userId",
      "actorId: input.actorId",
    ],
    [
      "attacker-controlled permissions",
      "actions/finance/customer-settlement.actions.ts",
      "actorPermissions: ctx.permissions",
      "actorPermissions: input.actorPermissions",
    ],
    [
      "raw context spread",
      "actions/finance/customer-settlement.actions.ts",
      "organizationId: ctx.orgId,",
      "...ctx,\n          organizationId: ctx.orgId,",
    ],
    [
      "module audit removed",
      "actions/finance/customer-settlement.actions.ts",
      "audit: true",
      "audit: false",
    ],
    [
      "finite assurance guard removed",
      "actions/finance/customer-settlement.actions.ts",
      "!Number.isFinite(freshAuth.claims.assuranceLevel) ||",
      "false ||",
    ],
    [
      "verified fresh-auth evidence not passed to service",
      "actions/finance/customer-settlement.actions.ts",
      "actorPermissions: ctx.permissions,\n          freshAuth,",
      "actorPermissions: ctx.permissions,\n          freshAuth: undefined,",
    ],
    [
      "fresh-auth denial replaced by comment marker",
      "actions/finance/customer-settlement.actions.ts",
      "throw new FreshAuthRequiredError()",
      "void 0\n      // throw new FreshAuthRequiredError()",
    ],
    [
      "fresh-auth denial disjunction weakened",
      "actions/finance/customer-settlement.actions.ts",
      "!freshAuth ||",
      "!freshAuth &&",
    ],
    [
      "finance revalidation removed",
      "actions/finance/customer-settlement.actions.ts",
      'revalidatePath("/dashboard/finance/receivables", "page")',
      "void 0",
    ],
    [
      "privileged control field added to command schema",
      "services/accounting/customer-settlement.schemas.ts",
      "customerSettlementId: idSchema,",
      "organizationId: idSchema,\n        customerSettlementId: idSchema,",
    ],
  ])("blocks a protected settlement-reversal action with %s", (_name, relativePath, from, to) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const target = path.join(root, relativePath)
    const source = fs.readFileSync(target, "utf8")
    expect(source).toContain(from)
    write(root, relativePath, source.replace(from, to))

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "customer_settlement_reversal_protected_action_boundary",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("ignores forbidden markers in an unrelated executable helper", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const relativePath = "actions/finance/customer-settlement.actions.ts"
    const target = path.join(root, relativePath)
    const source = fs.readFileSync(target, "utf8")
    write(
      root,
      relativePath,
      `${source}\nfunction unrelatedTelemetry(input) {\n  return { ...input, observedAt: Date.now() }\n}\n`,
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).not.toContain(
      "customer_settlement_reversal_protected_action_boundary",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("blocks a fresh-auth denial guard moved into dead code", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const relativePath = "actions/finance/customer-settlement.actions.ts"
    const target = path.join(root, relativePath)
    const source = fs.readFileSync(target, "utf8")
    const deadGuard = source
      .replace(
        "      if (\n        !freshAuth ||",
        "      if (false) {\n        if (\n          !freshAuth ||",
      )
      .replace(
        "      }\n      return {\n        lastAuthAt:",
        "        }\n      }\n      return {\n        lastAuthAt:",
      )
    expect(deadGuard).not.toBe(source)
    write(root, relativePath, deadGuard)

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "customer_settlement_reversal_protected_action_boundary",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
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

  it.each([
    ["queue contract version", "contracts", "version: 2", "version: 1"],
    [
      "response body redaction contract",
      "contracts",
      'submittedAt: string\n      status: "SUBMITTED"',
      'submittedAt: string\n      body: string\n      status: "SUBMITTED"',
    ],
    [
      "response body exposure control",
      "contracts",
      "responseBodyExposed: false",
      "responseBodyExposed: true",
    ],
    [
      "service-owned response state control",
      "contracts",
      "responseStateServiceOwned: true",
      "responseStateServiceOwned: false",
    ],
    [
      "tenant-scoped response query",
      "queue",
      "organizationId,\n            findingId:",
      "findingId:",
    ],
    [
      "typed response visibility",
      "queue",
      "visibility: MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY",
      "visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY",
    ],
    [
      "typed response metadata",
      "queue",
      'path: ["responseType"]',
      'path: ["requestType"]',
    ],
    [
      "bounded response evidence read",
      "queue",
      "take: MAX_RESPONSE_CANDIDATES + 1,",
      "",
    ],
    [
      "duplicate response fail-closed rule",
      "queue",
      "responseCandidatesForFinding.length > 1",
      "responseCandidatesForFinding.length > 2",
    ],
    [
      "IN_REVIEW exactly-one response rule",
      "queue",
      "responseCandidatesForFinding.length !== 1",
      "responseCandidatesForFinding.length > 1",
    ],
    [
      "request-response relationship validation",
      "queue",
      "responseRequestId !== comment.id",
      "responseRequestId === comment.id",
    ],
    [
      "redacted response projection",
      "queue",
      "responseId: storedResponse.id,",
      "responseId: storedResponse.id,\n          body: storedResponse.body,",
    ],
    [
      "response body output control",
      "queue",
      "responseBodyExposed: false",
      "responseBodyExposed: true",
    ],
    [
      "accountant-review waiting contract",
      "managerContracts",
      'waitingOn?: "ACCOUNTANT_REVIEW"',
      'waitingOn?: "CLIENT_RESPONSE"',
    ],
    [
      "waiting run-sheet composition",
      "managerService",
      'if (item.waitingOn === "ACCOUNTANT_REVIEW") return "waiting"',
      'if (item.waitingOn === "ACCOUNTANT_REVIEW") return "routine"',
    ],
    [
      "accountant response-review ownership",
      "managerService",
      'assignedRole: "accountant"',
      'assignedRole: "manager"',
    ],
    [
      "non-overdue submitted response state",
      "managerService",
      'dueState: "scheduled"',
      'dueState: "overdue"',
    ],
    [
      "partial submitted response trust state",
      "managerService",
      'state: "partial"',
      'state: "redacted"',
    ],
    [
      "response body exclusion from manager action",
      "managerService",
      'nextStep: "Response submitted; awaiting accountant review."',
      "nextStep: request.response.body",
    ],
    [
      "generic invalid-response blocker",
      "managerService",
      'blocker.reason === "INVALID_RESPONSE_EVIDENCE"',
      'blocker.reason === "INVALID_REQUEST_EVIDENCE"',
    ],
    [
      "response-specific blocker gate",
      "managerService",
      '"client_missing_proof_response"',
      '"client_missing_proof_request"',
    ],
  ])("blocks client missing-proof response-state projection without %s", (
    _name,
    target,
    from,
    to,
  ) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const sources = {
      contracts: verifiedMissingProofQueueContractsSource(),
      queue: verifiedMissingProofQueueServiceSource(),
      managerContracts: verifiedMissingProofManagerContractsSource(),
      managerService: verifiedMissingProofManagerServiceSource(),
    }
    const paths = {
      contracts:
        "services/accounting/missing-close-evidence-request-queue-contracts.ts",
      queue:
        "services/accounting/missing-close-evidence-request-queue.service.ts",
      managerContracts:
        "services/manager-action-center/manager-action-center-contracts.ts",
      managerService:
        "services/manager-action-center/manager-action-center.service.ts",
    }
    const source = sources[target]
    expect(source).toContain(from)
    write(root, paths[target], source.replace(from, to))

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "client_missing_proof_response_state_projection",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it.each([
    [
      "accountant review permission",
      "contracts",
      'readPermission: "accounting.close.accountant.review"',
      'readPermission: "accounting.close.read"',
    ],
    [
      "accountant-only response text exposure",
      "contracts",
      'responseTextExposure: "AUTHORIZED_ACCOUNTANT_REVIEW_ONLY"',
      'responseTextExposure: "ANY_AUTHENTICATED_USER"',
    ],
    [
      "raw-metadata redaction contract",
      "contracts",
      'redaction: "ACCOUNTANT_REVIEW_NO_RAW_METADATA"',
      'redaction: "RAW_METADATA_ALLOWED"',
    ],
    [
      "active home-tenant actor control",
      "contracts",
      "activeHomeTenantActorRequired: true",
      "activeHomeTenantActorRequired: false",
    ],
    [
      "delegated REVIEW grant control",
      "contracts",
      "delegatedReviewGrantRequired: true",
      "delegatedReviewGrantRequired: false",
    ],
    [
      "raw-metadata exclusion control",
      "contracts",
      "rawMetadataExposed: false",
      "rawMetadataExposed: true",
    ],
    [
      "fail-closed truncation control",
      "contracts",
      "failClosedOnTruncation: true",
      "failClosedOnTruncation: false",
    ],
    [
      "service-owned clock",
      "service",
      "const generatedAt = new Date()",
      "const generatedAt = new Date(input.now)",
    ],
    [
      "active home-tenant actor query",
      "service",
      "isActive: true",
      "isActive: false",
    ],
    [
      "service-resolved target organization",
      "service",
      "const organizationId = access.organizationId",
      "const organizationId = input.organizationId",
    ],
    [
      "delegated REVIEW capability",
      "service",
      'capability: "REVIEW"',
      'capability: "READ"',
    ],
    [
      "IN_REVIEW finding boundary",
      "service",
      "status: CloseFindingStatus.IN_REVIEW",
      "status: CloseFindingStatus.ASSIGNED",
    ],
    [
      "typed request evidence matcher",
      "service",
      "visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY",
      "visibility: MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY",
    ],
    [
      "typed response evidence matcher",
      "service",
      "visibility: MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY",
      "visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY",
    ],
    [
      "bounded finding query",
      "service",
      `take:
            ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems + 1`,
      `take:
            ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems`,
    ],
    [
      "finding truncation comparison",
      "service",
      `findings.length >
          ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems`,
      `findings.length >=
          ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems`,
    ],
    [
      "bounded visible-finding slice",
      "service",
      `findings.slice(
          0,
          ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems,`,
      `findings.slice(
          1,
          ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems,`,
    ],
    [
      "both bounded comment queries",
      "service",
      "take: MAX_COMMENT_CANDIDATES + 1,",
      "take: MAX_COMMENT_CANDIDATES,",
    ],
    [
      "both fail-closed truncation paths",
      "service",
      "items: [],",
      "items,",
    ],
    [
      "exactly one request per finding",
      "service",
      "requests.length !== 1 || !request",
      "requests.length < 1 || !request",
    ],
    [
      "exactly one response per finding",
      "service",
      "responses.length !== 1 || !response",
      "responses.length < 1 || !response",
    ],
    [
      "request organization relationship",
      "service",
      "request.organizationId !== organizationId",
      "request.organizationId !== homeOrganizationId",
    ],
    [
      "request owner relationship",
      "service",
      "finding.ownerId !== requestedFromId",
      "finding.ownerId !== requestedById",
    ],
    [
      "response request relationship",
      "service",
      "responseRequestId !== request.id",
      "responseRequestId !== response.id",
    ],
    [
      "response author relationship",
      "service",
      "response.authorId !== requestedFromId",
      "response.authorId !== requestedById",
    ],
    [
      "accountant-visible response text",
      "service",
      "response: { responseText: response.body }",
      "response: { responseText: request.body }",
    ],
    [
      "raw request-metadata exclusion",
      "service",
      "request: { requestText: request.body }",
      "request: { requestText: request.body, metadata: request.metadata }",
    ],
    [
      "deterministic request-id tie breaker",
      "service",
      `Date.parse(left.response.submittedAt) -
              Date.parse(right.response.submittedAt) ||
            left.request.requestId.localeCompare(right.request.requestId)`,
      `Date.parse(left.response.submittedAt) -
            Date.parse(right.response.submittedAt)`,
    ],
    [
      "repeatable-read snapshot",
      "service",
      "Prisma.TransactionIsolationLevel.RepeatableRead",
      "Prisma.TransactionIsolationLevel.ReadCommitted",
    ],
    [
      "narrow service-owned read model",
      "service",
      "export async function getAccountantMissingCloseEvidenceReviewQueue(input)",
      `const getCloseAssuranceDashboard = true
    export async function getAccountantMissingCloseEvidenceReviewQueue(input)`,
    ],
  ])("blocks accountant missing-proof review queue without %s", (
    _name,
    target,
    from,
    to,
  ) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const sources = {
      contracts: verifiedAccountantMissingProofReviewContractsSource(),
      service: verifiedAccountantMissingProofReviewServiceSource(),
    }
    const paths = {
      contracts:
        "services/accounting/missing-close-evidence-accountant-review-queue-contracts.ts",
      service:
        "services/accounting/missing-close-evidence-accountant-review-queue.service.ts",
    }
    const source = sources[target]
    expect(source).toContain(from)
    write(root, paths[target], source.replace(from, to))

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "accountant_missing_proof_response_review_queue",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks accountant missing-proof review without the read-only REVIEW denial", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "services/accounting/accountant-access.service.ts",
      accountantAccessServiceSource({ missingReviewGuard: true }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "accountant_missing_proof_response_review_queue",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

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

  it.each([
    ["mutable protected binding", { mutableBinding: true }],
    ["public wrapper bypass", { bypassWrapper: true }],
    ["wrong permission", { wrongPermission: true }],
    ["attacker-controlled organization", { inputOrganization: true }],
    ["attacker-controlled actor", { inputActor: true }],
    ["control spread", { spreadControl: true }],
    ["missing period revalidation", { missingRevalidate: true }],
  ])("blocks missing-proof response action with %s", (_name, options) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "actions/accounting/close-assurance.actions.ts",
      verifiedClosePackActionSource({
        missingProofResponseOptions: options,
      }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "missing_proof_response_service_owned_command_evidence",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it.each([
    ["attacker-controlled organization", { inputOrganization: true }],
    ["missing active actor check", { missingActiveActor: true }],
    ["unscoped request lookup", { unscopedRequest: true }],
    ["missing recipient guard", { skipRecipientGuard: true }],
    ["missing idempotency lookup", { missingIdempotency: true }],
    ["missing finding-state guard", { skipStateGuard: true }],
    ["missing finding-owner guard", { skipOwnerGuard: true }],
    ["terminal finding transition", { terminalState: true }],
    ["untyped response evidence", { untypedResponse: true }],
    ["missing audit evidence", { missingAudit: true }],
    ["missing business event", { missingEvent: true }],
    ["response text leaked into event", { eventLeaksResponse: true }],
  ])("blocks missing-proof response service with %s", (_name, options) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "services/accounting/close-assurance.service.ts",
      verifiedCloseWaiverServiceSource({
        missingProofResponseOptions: options,
      }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "missing_proof_response_service_owned_command_evidence",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it.each([
    ["wrong review permission", { wrongPermission: true }],
    ["wrong acceptance decision", { wrongDecision: true }],
    ["wrong finding status", { wrongStatus: true }],
    ["weakened fresh-auth age", { weakFreshAuth: true }],
    ["weakened redaction", { weakRedaction: true }],
    ["raw metadata exposure", { rawMetadataExposed: true }],
    ["close certification authority", { certifiesClose: true }],
  ])("blocks response-acceptance contract with %s", (_name, options) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "services/accounting/missing-close-evidence-response-acceptance-contracts.ts",
      verifiedMissingProofResponseAcceptanceContractsSource(options),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "accountant_missing_proof_response_acceptance_resolution",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it.each([
    ["mutable protected binding", { mutableBinding: true }],
    ["public wrapper bypass", { bypassWrapper: true }],
    ["wrong permission", { wrongPermission: true }],
    ["boolean fresh-auth option", { booleanFreshAuth: true }],
    ["weakened fresh-auth age", { weakFreshAuth: true }],
    ["synthetic authentication time", { syntheticAuth: true }],
    ["input parsed before fresh auth", { parseBeforeAuth: true }],
    ["mutable verified authentication", { mutableAuth: true }],
    ["attacker-controlled organization", { inputOrganization: true }],
    ["attacker-controlled actor", { inputActor: true }],
    ["control spread", { spreadControl: true }],
    ["mismatched evidence actor", { mismatchedEvidenceActor: true }],
    ["mismatched evidence organization", { mismatchedEvidenceOrganization: true }],
    ["direct context timestamp", { directTimestamp: true }],
    ["missing period revalidation", { missingRevalidate: true }],
  ])("blocks response-acceptance action with %s", (_name, options) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "actions/accounting/close-assurance.actions.ts",
      verifiedClosePackActionSource({
        missingProofAcceptanceOptions: options,
      }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "accountant_missing_proof_response_acceptance_resolution",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it.each([
    ["missing service RBAC", { missingRbac: true }],
    ["caller-controlled clock", { callerClock: true }],
    ["weakened fresh-auth age", { weakFreshAuth: true }],
    ["fresh-auth actor mismatch allowed", { allowActorMismatch: true }],
    ["fresh-auth organization mismatch allowed", { allowOrganizationMismatch: true }],
    ["future authentication allowed", { allowFuture: true }],
    ["stale authentication allowed", { allowStale: true }],
    ["missing active home actor", { missingActiveActor: true }],
    ["read-only delegated capability", { readCapability: true }],
    ["attacker-controlled target organization", { inputOrganization: true }],
    ["missing idempotency lookup", { missingIdempotency: true }],
    ["inexact replay", { inexactReplay: true }],
    ["unscoped request lookup", { unscopedRequest: true }],
    ["unscoped response lookup", { unscopedResponse: true }],
    ["missing request-response relationship guard", { missingRelationshipGuard: true }],
    ["self-acceptance allowed", { allowSelfAcceptance: true }],
    ["missing exact state guard", { skipStatusGuard: true }],
    ["missing respondent owner guard", { skipOwnerGuard: true }],
    ["non-CAS finding update", { nonCasUpdate: true }],
    ["incomplete CAS scope", { skipCasScope: true }],
    ["missing CAS count check", { skipCasCount: true }],
    ["wrong transition status", { wrongTransitionStatus: true }],
    ["missing resolution attribution", { missingResolutionAttribution: true }],
    ["untyped acceptance evidence", { untypedAcceptance: true }],
    ["missing audit evidence", { missingAudit: true }],
    ["missing business event", { missingEvent: true }],
    ["resolution text leaked to audit", { auditLeaksText: true }],
    ["resolution text leaked to event", { eventLeaksText: true }],
    ["acceptance certifies close", { certifiesClose: true }],
  ])("blocks response-acceptance service with %s", (_name, options) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "services/accounting/close-assurance.service.ts",
      verifiedCloseWaiverServiceSource({
        missingProofAcceptanceOptions: options,
      }),
    )

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "accountant_missing_proof_response_acceptance_resolution",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it.each([
    ["non-atomic transaction", "service", { nonAtomic: true }],
    ["missing delegated REVIEW denial", "access", { missingReviewGuard: true }],
  ])("blocks response acceptance with %s", (_name, target, options) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    if (target === "service") {
      write(
        root,
        "services/accounting/close-assurance.service.ts",
        verifiedCloseWaiverServiceSource({ missingProofOptions: options }),
      )
    } else {
      write(
        root,
        "services/accounting/accountant-access.service.ts",
        accountantAccessServiceSource(options),
      )
    }

    const report = buildReportTrustExportReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "accountant_missing_proof_response_acceptance_resolution",
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
