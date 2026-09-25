import "server-only"
import { createHash } from "node:crypto"
import type { Prisma, Role, Session } from "@prisma/client"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ApplicationError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { isUsableAccount, type CustodianAccount } from "@/services/roles/role-custodian-policy"
import { auditExportSafetyDecision, buildExportWatermark, evaluateExportSafety } from "@/services/security/export-safety.service"
import { memberHistoryExportInput, memberHistoryInput, type MemberHistoryInput, type MemberHistoryExportInput } from "./member-history-input"

type Scope = { organizationId: string; actorId: string; targetUserId: string }
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex")
const historyActions = ["MEMBER_ACCESS_CHANGED", "DEACTIVATE_USER"]
const safeRoleIds = (value: unknown) => Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && id.length <= 200).slice(0, 100) : null

// Caller must establish current actor/read authority in the same transaction.
export async function readMemberHistoryInTx(tx: Prisma.TransactionClient, input: Scope, page: MemberHistoryInput = {}) {
  const parsed = memberHistoryInput.safeParse(page)
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "The history page is invalid.", 400)
  const scope = { organizationId: input.organizationId, entityType: "User", entityId: input.targetUserId, action: { in: historyActions } }
  const first = parsed.data.throughId ? await tx.auditLog.findFirst({ where: { ...scope, id: parsed.data.throughId }, select: { id: true, createdAt: true } }) : await tx.auditLog.findFirst({ where: scope, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, createdAt: true } })
  if (parsed.data.throughId && !first) throw new ConflictError("The history snapshot is unavailable. Reload the current history.")
  const before = parsed.data.beforeId && first ? await tx.auditLog.findFirst({ where: { ...scope, id: parsed.data.beforeId, OR: [{ createdAt: { lt: first.createdAt } }, { createdAt: first.createdAt, id: { lte: first.id } }] }, select: { id: true, createdAt: true } }) : null
  if (parsed.data.beforeId && !before) throw new ConflictError("The history cursor is unavailable. Reload the current history.")
  const rows = first ? await tx.auditLog.findMany({ where: { ...scope, AND: [
    { OR: [{ createdAt: { lt: first.createdAt } }, { createdAt: first.createdAt, id: { lte: first.id } }] },
    ...(before ? [{ OR: [{ createdAt: { lt: before.createdAt } }, { createdAt: before.createdAt, id: { lt: before.id } }] }] : []),
  ] }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21, select: { id: true, createdAt: true, userId: true, action: true, changes: true } }) : []
  const entries = rows.slice(0, 20).map(record => {
    const change = record.changes as { operation?: string; reason?: unknown; added?: unknown; removed?: unknown } | null
    const addedRoleIds = safeRoleIds(change?.added), removedRoleIds = safeRoleIds(change?.removed)
    return { id: record.id, actorId: record.userId, createdAt: record.createdAt.toISOString(), operation: record.action === "DEACTIVATE_USER" ? "deactivate" as const : change?.operation === "reactivate" ? "reactivate" as const : change?.operation === "roles" ? "roles" as const : "unknown" as const, reason: typeof change?.reason === "string" ? change.reason.slice(0, 400) : null, added: addedRoleIds?.length ?? null, removed: removedRoleIds?.length ?? null, addedRoleIds, removedRoleIds }
  })
  const pageInfo = { beforeId: before?.id ?? null, throughId: first?.id ?? null, recordedThrough: first?.createdAt.toISOString() ?? null, nextCursor: rows.length > 20 ? entries[entries.length - 1].id : null }
  return { entries, pageInfo, pageHash: digest({ organizationId: input.organizationId, targetUserId: input.targetUserId, entries, pageInfo }) }
}

async function currentReader(tx: Prisma.TransactionClient, scope: Scope) {
  const actor = await tx.user.findFirst({ where: { id: scope.actorId, organizationId: scope.organizationId, organization: { isActive: true, deletedAt: null } }, select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: scope.organizationId }, select: { permissions: true } } } })
  const permissions = actor?.roles.flatMap(role => role.permissions) ?? []
  if (!actor || !isUsableAccount(actor, new Date()) || !["users.read", "controls.audit.read"].every(value => hasRbacPermission(permissions, value))) throw new ForbiddenError()
  if (!await tx.user.findFirst({ where: { id: scope.targetUserId, organizationId: scope.organizationId }, select: { id: true } })) throw new NotFoundError("Member not found.")
  return permissions
}

export async function getMemberHistory(scope: Scope, page: MemberHistoryInput = {}) {
  return db.$transaction(async tx => {
    const permissions = await currentReader(tx, scope)
    return { ...await readMemberHistoryInTx(tx, scope, page), canExport: hasRbacPermission(permissions, "reports.export"), checkedAt: new Date().toISOString() }
  }, { isolationLevel: "RepeatableRead", timeout: 10000 })
}

const csvValue = (value: unknown) => { const text = value == null ? "" : String(value); return '"' + (/^[\s\uFEFF]*[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""') + '"' }
const csvRow = (values: unknown[]) => values.map(csvValue).join(",")

export async function exportMemberHistory(scope: Scope, input: MemberHistoryExportInput, proof: { id: string; token: string }) {
  const parsed = memberHistoryExportInput.safeParse(input)
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Review the current history page before exporting.", 400)
  if (!proof?.id || !proof.token) throw new ForbiddenError()
  return db.$transaction(async tx => {
    // Coordinate with member/role writes and retain authority until the export audit commits.
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${scope.organizationId} FOR SHARE`
    const actors = await tx.$queryRaw<CustodianAccount[]>`SELECT "isActive", "isVerified", "emailVerified", "isLocked", "lockedUntil" FROM users WHERE id = ${scope.actorId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
    await tx.$queryRaw<Role[]>`SELECT * FROM roles WHERE "organizationId" = ${scope.organizationId} ORDER BY id FOR SHARE`
    await tx.$queryRaw`SELECT membership."A" FROM "_UserRoles" membership WHERE membership."B" = ${scope.actorId} ORDER BY membership."A" FOR SHARE`
    if (!actors[0] || !isUsableAccount(actors[0], new Date())) throw new ForbiddenError()
    const permissions = await currentReader(tx, scope)
    if (!hasRbacPermission(permissions, "reports.export")) throw new ForbiddenError("Report-export permission is required.")
    const sessions = await tx.$queryRaw<Session[]>`SELECT * FROM sessions WHERE id = ${proof.id} AND token = ${proof.token} AND "userId" = ${scope.actorId} FOR SHARE`
    const session = sessions[0], now = new Date()
    if (!session || session.expiresAt <= now || !session.assuranceVerifiedAt || session.assuranceVerifiedAt > now || now.getTime() - session.assuranceVerifiedAt.getTime() > 300000 || session.assuranceMethod !== "password" || session.assuranceOrganizationId !== scope.organizationId || session.assuranceLevel < 1 || (session.assuranceLockedUntil && session.assuranceLockedUntil > now)) throw new ApplicationError("FRESH_AUTH_REQUIRED", "Confirm your password before exporting history.", 403)
    const history = await readMemberHistoryInTx(tx, scope, parsed.data.page)
    if (history.pageHash !== parsed.data.expectedHash) throw new ConflictError("This history page changed. Reload and review before exporting.")
    const exportContext = { scope: "MEMBER_ACCESS_HISTORY_PAGE", filtersHash: history.pageHash, rowCount: history.entries.length, fileType: "csv", sensitivity: "personal" as const }
    const watermarkId = buildExportWatermark({ ...exportContext, organizationId: scope.organizationId, actorId: scope.actorId, issuedAt: now })
    const decision = evaluateExportSafety({ action: "report.export", organizationId: scope.organizationId, actorId: scope.actorId, actorPermissions: permissions, lastAuthAt: session.assuranceVerifiedAt.getTime(), now: now.getTime(), resourceType: "MemberAccessHistory", resourceId: scope.targetUserId, exportContext: { ...exportContext, watermarkId } })
    if (!decision.allowed) throw new ForbiddenError(decision.safeMessage)
    const headings = parsed.data.locale === "fr" ? ["Référence", "Horodatage UTC", "Opération", "Référence de l’acteur", "Motif", "Rôles ajoutés", "Rôles retirés"] : ["Reference", "Timestamp UTC", "Operation", "Actor reference", "Reason", "Added roles", "Removed roles"]
    const operations = parsed.data.locale === "fr" ? { roles: "Modification des rôles", reactivate: "Réactivation", deactivate: "Désactivation", unknown: "Modification non détaillée" } : { roles: "Role change", reactivate: "Reactivation", deactivate: "Deactivation", unknown: "Unspecified change" }
    const content = '\uFEFF' + [csvRow(["scope", exportContext.scope]), csvRow(["organization_id", scope.organizationId]), csvRow(["member_id", scope.targetUserId]), csvRow(["watermark_id", watermarkId]), csvRow(["generated_at", now.toISOString()]), csvRow(["recorded_through", history.pageInfo.recordedThrough]), csvRow(["before_id", history.pageInfo.beforeId]), csvRow(["row_count", history.entries.length]), csvRow(["page_hash", history.pageHash]), csvRow(headings), ...history.entries.map(row => csvRow([row.id, row.createdAt, operations[row.operation], row.actorId, row.reason, row.addedRoleIds?.join("; "), row.removedRoleIds?.join("; ")]))].join("\r\n")
    const contentHash = createHash("sha256").update(content).digest("hex")
    const audit = await auditExportSafetyDecision(tx, { ...decision, sensitiveActionDecision: decision.sensitiveActionDecision ? { ...decision.sensitiveActionDecision, input: { ...decision.sensitiveActionDecision.input, metadata: { contentHash, rowIds: history.entries.map(row => row.id) } } } : undefined })
    // Preserve the exact audited UTF-8 bytes through server-action text transport.
    return { contentBase64: Buffer.from(content, "utf8").toString("base64"), contentHash, watermarkId, auditId: audit.id, rowCount: history.entries.length, fileName: "member-access-history-" + watermarkId + ".csv", mimeType: "text/csv;charset=utf-8", generatedAt: now.toISOString() }
  }, { isolationLevel: "ReadCommitted", timeout: 10000 })
}

export type MemberHistoryPage = Awaited<ReturnType<typeof getMemberHistory>>
