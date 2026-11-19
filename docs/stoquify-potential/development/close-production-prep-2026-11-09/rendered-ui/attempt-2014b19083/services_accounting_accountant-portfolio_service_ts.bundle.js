"use strict";
(self["webpackChunkSTOQUIFY"] = self["webpackChunkSTOQUIFY"] || []).push([["services_accounting_accountant-portfolio_service_ts"],{

/***/ "./services/accounting/accountant-access.schemas.ts":
/*!**********************************************************!*\
  !*** ./services/accounting/accountant-access.schemas.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   accountantClientScopeInputSchema: () => (/* binding */ accountantClientScopeInputSchema),
/* harmony export */   accountantPortfolioInputSchema: () => (/* binding */ accountantPortfolioInputSchema),
/* harmony export */   grantAccountantAccessInputSchema: () => (/* binding */ grantAccountantAccessInputSchema),
/* harmony export */   inviteAccountantAccessInputSchema: () => (/* binding */ inviteAccountantAccessInputSchema),
/* harmony export */   revokeAccountantAccessInputSchema: () => (/* binding */ revokeAccountantAccessInputSchema)
/* harmony export */ });
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "./node_modules/zod/v3/types.js");

const idSchema = zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().min(1);
const sha256Schema = zod__WEBPACK_IMPORTED_MODULE_0__.string().regex(/^sha256:[a-f0-9]{64}$/i);
const grantAccountantAccessInputSchema = zod__WEBPACK_IMPORTED_MODULE_0__.object({
    accountantEmail: zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().email(),
    accountantFirmName: zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().min(2).max(160),
    accountantFirmRegistrationNumber: zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().min(2).max(120).nullable().optional(),
    role: zod__WEBPACK_IMPORTED_MODULE_0__["enum"](["READ_ONLY", "REVIEWER", "PREPARER"]),
    consentEvidenceHash: sha256Schema,
    effectiveFrom: zod__WEBPACK_IMPORTED_MODULE_0__.coerce.date().optional(),
    expiresAt: zod__WEBPACK_IMPORTED_MODULE_0__.coerce.date(),
    correlationId: idSchema.nullable().optional(),
    idempotencyKey: idSchema.min(8).max(191).nullable().optional(),
});
const inviteAccountantAccessInputSchema = grantAccountantAccessInputSchema.extend({
    locale: zod__WEBPACK_IMPORTED_MODULE_0__["enum"](["EN", "FR"]).optional(),
});
const revokeAccountantAccessInputSchema = zod__WEBPACK_IMPORTED_MODULE_0__.object({
    grantId: idSchema,
    reason: zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().min(5).max(500),
    correlationId: idSchema.nullable().optional(),
});
const accountantClientScopeInputSchema = zod__WEBPACK_IMPORTED_MODULE_0__.object({
    clientOrganizationId: idSchema.nullable().optional(),
});
const accountantPortfolioInputSchema = zod__WEBPACK_IMPORTED_MODULE_0__.object({
    cursor: zod__WEBPACK_IMPORTED_MODULE_0__.string().min(1).max(2000).optional(),
    search: zod__WEBPACK_IMPORTED_MODULE_0__.string().trim().max(100).default(""),
    pageSize: zod__WEBPACK_IMPORTED_MODULE_0__.number().int().min(1).max(20).default(10),
}).strict();


/***/ }),

/***/ "./services/accounting/accountant-portfolio-proof.service.ts":
/*!*******************************************************************!*\
  !*** ./services/accounting/accountant-portfolio-proof.service.ts ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   readAccountantPortfolioProof: () => (/* binding */ readAccountantPortfolioProof)
/* harmony export */ });
Object(function webpackMissingModule() { var e = new Error("Cannot find module 'server-only'"); e.code = 'MODULE_NOT_FOUND'; throw e; }());
/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @prisma/client */ "./node_modules/@prisma/client/index-browser.js");
/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _close_period_selection_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./close-period-selection.service */ "./services/accounting/close-period-selection.service.ts");
/* harmony import */ var _close_assurance_current_proof__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./close-assurance-current-proof */ "./services/accounting/close-assurance-current-proof.ts");
/* harmony import */ var _close_assessment_order_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./close-assessment-order.service */ "./services/accounting/close-assessment-order.service.ts");
/* harmony import */ var _close_source_revision_service__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./close-source-revision.service */ "./services/accounting/close-source-revision.service.ts");






// Caller supplies one RepeatableRead transaction. No collectors, row/advisory
// locks, publication helpers or write paths belong in this projection.
async function readAccountantPortfolioProof(tx, organizationId, now) {
    const period = await (0,_close_period_selection_service__WEBPACK_IMPORTED_MODULE_1__.resolveTargetPeriod)(organizationId, null, tx, now);
    const selectedPeriod = period ? {
        id: period.id, name: period.name, status: period.status,
        startDate: period.startDate.toISOString(), endDate: period.endDate.toISOString(),
    } : null;
    const empty = { selectedPeriod, checkedAt: now.toISOString(), assessmentAsOf: null, close: null, currentProof: null };
    if (!period)
        return { ...empty, proofState: "NO_PERIOD" };
    const order = await (0,_close_assessment_order_service__WEBPACK_IMPORTED_MODULE_3__.readCloseAssessmentOrderInTx)(tx, organizationId, period.id);
    if (!order.latest)
        return { ...empty, proofState: "NO_ASSESSMENT" };
    const run = await tx.closeRun.findFirst({
        where: { organizationId, periodId: period.id, id: order.latest.id },
        select: { id: true, periodId: true, status: true, readinessScore: true,
            criticalBlockerCount: true, highBlockerCount: true, asOf: true, metadata: true, voidedAt: true },
    });
    if (!run)
        return { ...empty, proofState: "UNAVAILABLE" };
    const scope = { organizationId, periodId: period.id, closeRunId: run.id };
    const findings = await tx.closeAssuranceFinding.groupBy({
        by: ["severity"], where: { ...scope, status: { in: ["OPEN", "ASSIGNED", "IN_REVIEW", "REOPENED"] } }, _count: { _all: true },
    });
    const controls = await tx.closeChecklistItem.groupBy({
        by: ["severity"], where: { ...scope, status: { in: ["FAILED", "UNAVAILABLE"] } }, _count: { _all: true },
    });
    const unavailableEvidence = await tx.closeEvidenceItem.count({ where: { ...scope, available: false } });
    // SQL IS DISTINCT FROM includes SQL NULL, JSON null and absent staleState,
    // matching deriveCloseCurrentProof's retained-export predicate exactly.
    const exports = await tx.$queryRaw(_prisma_client__WEBPACK_IMPORTED_MODULE_5__.Prisma.sql `
    SELECT COUNT(*) AS count FROM close_pack_exports
    WHERE "organizationId" = ${organizationId} AND "periodId" = ${period.id} AND "closeRunId" = ${run.id}
      AND "isCertified" = true
      AND (metadata #>> '{staleState,status}') IS DISTINCT FROM 'EVIDENCE_STALE'
  `);
    const sum = (rows, high = false) => rows.reduce((total, row) => total + ((!high || ["HIGH", "CRITICAL"].includes(row.severity)) ? row._count._all : 0), 0);
    const proof = (0,_close_assessment_order_service__WEBPACK_IMPORTED_MODULE_3__.applyCloseAssessmentSelection)((0,_close_assurance_current_proof__WEBPACK_IMPORTED_MODULE_2__.deriveCloseCurrentProof)({
        ...run, findings: [], checklistItems: [], evidenceItems: [], packExports: [],
        counts: { currentExports: Number(exports[0]?.count ?? 0), openFindings: sum(findings),
            highFindings: sum(findings, true), failedControls: sum(controls), highControls: sum(controls, true), unavailableEvidence },
    }, now), (0,_close_assessment_order_service__WEBPACK_IMPORTED_MODULE_3__.deriveCloseAssessmentSelection)(order, run));
    const proofState = proof.assessmentState !== "CURRENT" ? proof.assessmentState
        : proof.blockers.some(b => b.id === "close-evidence-stale") ? "STALE"
            : proof.blockers.some(b => ["close-evidence-unavailable", "close-certified-export-missing"].includes(b.id)) ? "UNAVAILABLE"
                : "CURRENT";
    return {
        selectedPeriod, checkedAt: now.toISOString(), assessmentAsOf: run.asOf.toISOString(), proofState, currentProof: proof,
        close: {
            runId: run.id, periodId: run.periodId, status: run.status, readinessScore: run.readinessScore,
            blockerCount: run.criticalBlockerCount + run.highBlockerCount, asOf: run.asOf.toISOString(),
            scoreBasis: "HISTORICAL_ASSESSMENT",
            // A global revision mismatch alone is not a period-specific invalidation.
            // Publication guards and source invalidators own that decision.
            sourceRevision: (0,_close_source_revision_service__WEBPACK_IMPORTED_MODULE_4__.savedCloseSourceRevision)(run.metadata),
        },
    };
}


/***/ }),

/***/ "./services/accounting/accountant-portfolio.service.ts":
/*!*************************************************************!*\
  !*** ./services/accounting/accountant-portfolio.service.ts ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getAccountantPortfolio: () => (/* binding */ getAccountantPortfolio)
/* harmony export */ });
Object(function webpackMissingModule() { var e = new Error("Cannot find module 'server-only'"); e.code = 'MODULE_NOT_FOUND'; throw e; }());
/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! @prisma/client */ "./node_modules/@prisma/client/index-browser.js");
/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_11___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_11__);
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! zod */ "./node_modules/zod/v3/types.js");
/* harmony import */ var _prisma_db__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/prisma/db */ "./prisma/db.ts");
/* harmony import */ var _lib_security_rbac_permissions__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/lib/security/rbac-permissions */ "./lib/security/rbac-permissions.ts");
/* harmony import */ var _services_roles_role_custodian_policy__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/services/roles/role-custodian-policy */ "./services/roles/role-custodian-policy.ts");
/* harmony import */ var _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @/services/_shared/action-errors */ "./services/_shared/action-errors.ts");
/* harmony import */ var _services_modules_module_entitlement_service__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @/services/modules/module-entitlement.service */ "./services/modules/module-entitlement.service.ts");
/* harmony import */ var _accountant_access_service__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./accountant-access.service */ "./services/accounting/accountant-access.service.ts");
/* harmony import */ var _accountant_access_schemas__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./accountant-access.schemas */ "./services/accounting/accountant-access.schemas.ts");
/* harmony import */ var _accountant_portfolio_proof_service__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./accountant-portfolio-proof.service */ "./services/accounting/accountant-portfolio-proof.service.ts");
/* harmony import */ var _managed_accountant_access_service__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./managed-accountant-access.service */ "./services/accounting/managed-accountant-access.service.ts");












const cursorSchema = zod__WEBPACK_IMPORTED_MODULE_10__.object({
    version: zod__WEBPACK_IMPORTED_MODULE_10__.literal(1), actorId: zod__WEBPACK_IMPORTED_MODULE_10__.string(), homeOrganizationId: zod__WEBPACK_IMPORTED_MODULE_10__.string(),
    search: zod__WEBPACK_IMPORTED_MODULE_10__.string(), pageSize: zod__WEBPACK_IMPORTED_MODULE_10__.number(), after: zod__WEBPACK_IMPORTED_MODULE_10__.string().min(1).max(191),
}).strict();
async function assertActor(actor) {
    if (!(0,_lib_security_rbac_permissions__WEBPACK_IMPORTED_MODULE_2__.hasRbacPermission)(actor.actorPermissions, "accounting.audit.read"))
        throw new _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_4__.ForbiddenError("Accountant read access is required.");
    const user = await _prisma_db__WEBPACK_IMPORTED_MODULE_1__.db.user.findFirst({
        where: { id: actor.actorId, organizationId: actor.homeOrganizationId, isActive: true },
        include: { roles: true, organization: true },
    });
    if (!user || !(0,_services_roles_role_custodian_policy__WEBPACK_IMPORTED_MODULE_3__.isUsableAccount)(user, new Date()) || !user.organization.isActive || user.organization.deletedAt) {
        throw new _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_4__.ForbiddenError("Active accountant membership is required.");
    }
    const permissions = (0,_lib_security_rbac_permissions__WEBPACK_IMPORTED_MODULE_2__.expandPermissions)(user.roles.filter(r => r.organizationId === actor.homeOrganizationId).flatMap(r => r.permissions));
    if (!(0,_lib_security_rbac_permissions__WEBPACK_IMPORTED_MODULE_2__.hasRbacPermission)(permissions, "accounting.audit.read"))
        throw new _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_4__.ForbiddenError("Current accountant read access is required.");
    await assertModule(actor.homeOrganizationId, actor.actorId, permissions, "accounting");
    return permissions;
}
async function assertModule(organizationId, actorId, permissions, moduleSlug) {
    const decision = await (0,_services_modules_module_entitlement_service__WEBPACK_IMPORTED_MODULE_5__.observeModuleAccess)({
        organizationId, userId: actorId, actorPermissions: permissions, moduleSlug,
        surfaceType: "action", surface: "accountant-portfolio", accessIntent: "read", mode: "enforce", audit: false,
    });
    if (!decision.allowed)
        throw new _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_4__.ForbiddenError("Accountant workspace access is unavailable.");
}
async function assertClient(actor, organizationId, grantId, permissions) {
    const access = await (0,_accountant_access_service__WEBPACK_IMPORTED_MODULE_6__.resolveAccountantClientAccess)({
        homeOrganizationId: actor.homeOrganizationId, clientOrganizationId: organizationId,
        accountantUserId: actor.actorId, capability: "READ",
    });
    if (access.mode !== "DELEGATED_ACCOUNTANT" || access.grant?.id !== grantId)
        throw new _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_4__.ForbiddenError("Client mandate changed.");
    await assertModule(organizationId, actor.actorId, permissions, "close_assurance");
    return access.grant;
}
async function getAccountantPortfolio(actor, input = {}) {
    const parsed = _accountant_access_schemas__WEBPACK_IMPORTED_MODULE_7__.accountantPortfolioInputSchema.parse(input);
    const permissions = await assertActor(actor);
    const scope = { version: 1, actorId: actor.actorId, homeOrganizationId: actor.homeOrganizationId, search: parsed.search, pageSize: parsed.pageSize };
    let after;
    if (parsed.cursor) {
        try {
            const cursor = cursorSchema.parse(JSON.parse(Buffer.from(parsed.cursor, "base64url").toString("utf8")));
            if (Object.entries(scope).some(([key, value]) => cursor[key] !== value))
                throw new Error();
            after = cursor.after;
        }
        catch {
            throw new _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_4__.BusinessRuleError("This portfolio page is no longer valid. Restart the portfolio search.");
        }
    }
    const now = new Date();
    const candidates = await _prisma_db__WEBPACK_IMPORTED_MODULE_1__.db.accountantAccessGrant.findMany({
        where: {
            accountantUserId: actor.actorId, organizationId: { not: actor.homeOrganizationId },
            status: "ACTIVE", effectiveFrom: { lte: now }, expiresAt: { gt: now }, activeScopeKey: { not: null },
            organization: { is: { isActive: true, deletedAt: null,
                    ...(parsed.search ? { name: { contains: parsed.search, mode: "insensitive" } } : {}) } },
            ...(after ? { id: { gt: after } } : {}),
        },
        select: { id: true, organizationId: true }, orderBy: { id: "asc" }, take: parsed.pageSize + 1,
    });
    const page = candidates.slice(0, parsed.pageSize);
    const clients = [];
    // Sequential bounded transactions avoid bursting the pool across tenants.
    for (const candidate of page) {
        try {
            await assertClient(actor, candidate.organizationId, candidate.id, permissions);
            const row = await _prisma_db__WEBPACK_IMPORTED_MODULE_1__.db.$transaction(async (tx) => {
                const checkedAt = new Date();
                const grant = await tx.accountantAccessGrant.findFirst({
                    where: { id: candidate.id, organizationId: candidate.organizationId, accountantUserId: actor.actorId,
                        activeScopeKey: { in: (0,_managed_accountant_access_service__WEBPACK_IMPORTED_MODULE_9__.accountantScopeKeys)(candidate.organizationId, actor.actorId) }, status: "ACTIVE",
                        effectiveFrom: { lte: checkedAt }, expiresAt: { gt: checkedAt },
                        organization: { is: { isActive: true, deletedAt: null } } },
                    include: { organization: { select: { id: true, name: true, countryCode: true, currency: true } } },
                });
                if (!grant)
                    throw new _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_4__.ForbiddenError("Client mandate changed.");
                const proof = await (0,_accountant_portfolio_proof_service__WEBPACK_IMPORTED_MODULE_8__.readAccountantPortfolioProof)(tx, candidate.organizationId, checkedAt);
                return { ...proof, grant: (0,_accountant_access_service__WEBPACK_IMPORTED_MODULE_6__.toAccountantAccessGrantDto)(grant, checkedAt), client: {
                        organizationId: grant.organization.id, name: grant.organization.name,
                        countryCode: grant.organization.countryCode, currency: grant.organization.currency,
                    } };
            }, { isolationLevel: _prisma_client__WEBPACK_IMPORTED_MODULE_11__.Prisma.TransactionIsolationLevel.RepeatableRead });
            clients.push(row);
        }
        catch (error) {
            if (!(error instanceof _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_4__.ForbiddenError) && !(error instanceof _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_4__.NotFoundError))
                throw error;
            // No client identity, proof or denial reason leaves this boundary.
        }
    }
    const currentPermissions = await assertActor(actor);
    const authorized = [];
    // Recheck ALL accumulated rows after fan-out, including the first client.
    for (const row of clients) {
        try {
            row.grant = await assertClient(actor, row.client.organizationId, row.grant.id, currentPermissions);
            authorized.push(row);
        }
        catch (error) {
            if (!(error instanceof _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_4__.ForbiddenError) && !(error instanceof _services_shared_action_errors__WEBPACK_IMPORTED_MODULE_4__.NotFoundError))
                throw error;
        }
    }
    await assertActor(actor);
    const hasMore = candidates.length > page.length;
    const nextCursor = hasMore ? Buffer.from(JSON.stringify({ ...scope, after: page[page.length - 1].id })).toString("base64url") : null;
    return {
        generatedAt: new Date().toISOString(), accountantUserId: actor.actorId, clientCount: authorized.length, clients: authorized,
        page: { scope: "AUTHORIZED_CLIENTS_IN_GRANT_PAGE", loadedCount: authorized.length, pageSize: parsed.pageSize,
            search: parsed.search, nextCursor, hasMore, coverage: hasMore ? "PARTIAL" : "END_OF_SCAN" },
    };
}


/***/ })

}]);