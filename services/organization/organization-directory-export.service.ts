import "server-only"
import { createHash } from "node:crypto"
import { Prisma, type Session } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ApplicationError, ConflictError, ForbiddenError, IdempotencyConflictError } from "@/services/_shared/action-errors"
import { isUsableAccount, type CustodianAccount } from "@/services/roles/role-custodian-policy"
import { auditExportSafetyDecision, buildExportWatermark, evaluateExportSafety } from "@/services/security/export-safety.service"
import { getOrganizationManagementRowsForActor } from "./organization-settings.service"
import { directoryExportInput, directoryPreviewInput, matchesDirectoryFilters, type DirectoryExportInput, type DirectoryPreviewInput } from "./organization-directory-input"

type Scope = { organizationId: string; actorId: string }
const hash = (value: string) => createHash("sha256").update(value).digest("hex")
const rowKeys = ["id", "name", "slug", "industry", "country", "state", "currency", "timezone", "defaultLocale", "isActive", "usersCount", "itemsCount", "locationsCount", "suppliersCount", "customersCount", "purchaseOrdersCount", "salesOrdersCount", "paymentsCount", "paidPaymentsAmount", "updatedAt"] as const
const headings = {
  en: ["Organization ID", "Name", "Slug", "Industry", "Country", "State", "Currency", "Timezone", "Language", "Active", "Users", "Items", "Locations", "Suppliers", "Customers", "Purchase orders", "Sales orders", "Payments", "Gross PAID payment amount", "Organization updated (UTC)"],
  fr: ["ID organisation", "Nom", "Identifiant", "Secteur", "Pays", "Région", "Devise", "Fuseau horaire", "Langue", "Active", "Utilisateurs", "Articles", "Lieux", "Fournisseurs", "Clients", "Commandes fournisseurs", "Commandes clients", "Paiements", "Montant brut des paiements PAID", "Organisation modifiée (UTC)"],
}
const receiptSchema = z.object({ contentBase64: z.string().max(1_400_000).regex(/^[A-Za-z0-9+/]*={0,2}$/), contentHash: z.string().regex(/^[a-f0-9]{64}$/), watermarkId: z.string().regex(/^wm_[a-f0-9]{24}$/), auditId: z.string(), rowCount: z.number().int().min(1).max(1), fileName: z.string().regex(/^organization-directory-wm_[a-f0-9]{24}\.csv$/), mimeType: z.literal("text/csv;charset=utf-8"), generatedAt: z.string().datetime() }).strict()
export type DirectoryExportReceipt = z.infer<typeof receiptSchema> & { replayed: boolean }

async function reader(tx: Prisma.TransactionClient, scope: Scope) {
  const actor = await tx.user.findFirst({ where: { id: scope.actorId, organizationId: scope.organizationId, organization: { isActive: true, deletedAt: null } }, select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: scope.organizationId }, select: { permissions: true } } } })
  const permissions = expandPermissions(actor?.roles.flatMap(role => role.permissions) ?? [])
  if (!actor || !isUsableAccount(actor, new Date()) || !["system.organization.read", "reports.export"].every(permission => hasRbacPermission(permissions, permission))) throw new ForbiddenError("Current organization read and report-export permissions are required.")
  return permissions
}

async function previewInTx(tx: Prisma.TransactionClient, scope: Scope, input: DirectoryPreviewInput, permissions: string[]) {
  const records = await getOrganizationManagementRowsForActor({ organizationId: scope.organizationId, actor: { permissions } }, tx)
  const rows = records.filter(row => matchesDirectoryFilters(row, input.filters)).map(row => rowKeys.map(key => key === "updatedAt" ? new Date(row.updatedAt).toISOString() : row[key]))
  if (rows.length > 1) throw new ForbiddenError("The directory export must remain within the current organization.")
  return { organizationId: scope.organizationId, actorId: scope.actorId, locale: input.locale, filters: input.filters, headings: headings[input.locale], rows, rowCount: rows.length, checkedAt: new Date().toISOString(), snapshotHash: hash(JSON.stringify({ ...scope, ...input, rows })) }
}

export async function getOrganizationDirectoryExportPreview(scope: Scope, input: DirectoryPreviewInput) {
  const parsed = directoryPreviewInput.safeParse(input)
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Check the directory filters.", 400)
  return db.$transaction(async tx => previewInTx(tx, scope, parsed.data, await reader(tx, scope)), { isolationLevel: "RepeatableRead", timeout: 10000 })
}
export type DirectoryExportPreview = Awaited<ReturnType<typeof getOrganizationDirectoryExportPreview>>

const csvCell = (value: unknown) => { const text = value == null ? "" : String(value); return '"' + (/^[\s\uFEFF]*[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""') + '"' }
const csvRow = (values: unknown[]) => values.map(csvCell).join(",")

export async function exportOrganizationDirectory(scope: Scope, input: DirectoryExportInput, proof: { id: string; token: string }): Promise<DirectoryExportReceipt> {
  const parsed = directoryExportInput.safeParse(input)
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Review the directory before exporting.", 400)
  if (!scope.organizationId || !scope.actorId || !proof?.id || !proof.token) throw new ForbiddenError()
  const command = parsed.data, requestHash = hash(JSON.stringify(command)), auditId = "orgexport_" + hash(JSON.stringify({ ...scope, requestId: command.requestId }))
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${scope.organizationId} FOR SHARE`
      const actors = await tx.$queryRaw<CustodianAccount[]>`SELECT "isActive", "isVerified", "emailVerified", "isLocked", "lockedUntil" FROM users WHERE id = ${scope.actorId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
      await tx.$queryRaw`SELECT id FROM roles WHERE "organizationId" = ${scope.organizationId} ORDER BY id FOR SHARE`
      await tx.$queryRaw`SELECT membership."A" FROM "_UserRoles" membership WHERE membership."B" = ${scope.actorId} ORDER BY membership."A" FOR SHARE`
      if (!actors[0] || !isUsableAccount(actors[0], new Date())) throw new ForbiddenError()
      const permissions = await reader(tx, scope), now = new Date()
      const sessions = await tx.$queryRaw<Session[]>`SELECT * FROM sessions WHERE id = ${proof.id} AND token = ${proof.token} AND "userId" = ${scope.actorId} FOR SHARE`
      const session = sessions[0]
      if (!session || session.expiresAt <= now || !session.assuranceVerifiedAt || session.assuranceVerifiedAt > now || now.getTime() - session.assuranceVerifiedAt.getTime() > 300000 || session.assuranceMethod !== "password" || session.assuranceOrganizationId !== scope.organizationId || session.assuranceLevel < 1 || (session.assuranceLockedUntil && session.assuranceLockedUntil > now)) throw new ApplicationError("FRESH_AUTH_REQUIRED", "Confirm your password before exporting.", 403)
      const prior = await tx.auditLog.findFirst({ where: { id: auditId, organizationId: scope.organizationId, userId: scope.actorId, entityType: "OrganizationDirectory", action: "CONTROLLED_EXPORT_ALLOWED" } })
      if (prior) {
        const metadata = (prior.changes as Prisma.JsonObject | null)?.metadata as Prisma.JsonObject | undefined
        if (metadata?.requestHash !== requestHash) throw new IdempotencyConflictError()
        const saved = receiptSchema.safeParse(metadata.receipt)
        if (!saved.success || saved.data.auditId !== auditId || hash(Buffer.from(saved.data.contentBase64, "base64").toString("utf8")) !== saved.data.contentHash) throw new ApplicationError("INTERNAL_ERROR", "The retained export needs operator review.", 500)
        return { ...saved.data, replayed: true }
      }
      const preview = await previewInTx(tx, scope, { locale: command.locale, filters: command.filters }, permissions)
      if (preview.snapshotHash !== command.expectedHash) throw new ConflictError("The directory changed. Reload and review before exporting.")
      if (!preview.rowCount) throw new ApplicationError("VALIDATION_ERROR", "No organization matches the reviewed filters.", 400)
      const exportContext = { scope: "ORGANIZATION_DIRECTORY", filtersHash: preview.snapshotHash, rowCount: preview.rowCount, fileType: "csv", sensitivity: "financial" as const }
      const watermarkId = buildExportWatermark({ ...exportContext, ...scope, actorId: scope.actorId, issuedAt: now })
      const decision = evaluateExportSafety({ action: "report.export", ...scope, actorPermissions: permissions, lastAuthAt: session.assuranceVerifiedAt.getTime(), now: now.getTime(), resourceType: "OrganizationDirectory", resourceId: scope.organizationId, exportContext: { ...exportContext, watermarkId } })
      if (!decision.allowed) throw new ForbiddenError(decision.safeMessage)
      const definition = command.locale === "fr" ? "Somme brute des paiements PAID non supprimés, y compris ventes et achats, avant déduction des remboursements ; ce n’est pas un chiffre d’affaires ni un solde de trésorerie." : "Gross sum of non-deleted PAID payments, including sales and purchases, before subtracting refunds; not revenue or a cash balance."
      const content = "\uFEFF" + [csvRow(["scope", exportContext.scope]), csvRow(["organization_id", scope.organizationId]), csvRow(["generated_at_utc", now.toISOString()]), csvRow(["watermark_id", watermarkId]), csvRow(["audit_id", auditId]), csvRow(["snapshot_hash", preview.snapshotHash]), csvRow(["filters", JSON.stringify(command.filters)]), csvRow(["payment_amount_definition", definition]), csvRow(preview.headings), ...preview.rows.map(csvRow)].join("\r\n")
      if (Buffer.byteLength(content, "utf8") > 1_000_000) throw new ApplicationError("VALIDATION_ERROR", "The organization record is too large for this export. Ask an operator to review its data.", 400)
      const receipt = receiptSchema.parse({ contentBase64: Buffer.from(content, "utf8").toString("base64"), contentHash: hash(content), watermarkId, auditId, rowCount: preview.rowCount, fileName: "organization-directory-" + watermarkId + ".csv", mimeType: "text/csv;charset=utf-8", generatedAt: now.toISOString() })
      await auditExportSafetyDecision(tx, { ...decision, sensitiveActionDecision: decision.sensitiveActionDecision ? { ...decision.sensitiveActionDecision, input: { ...decision.sensitiveActionDecision.input, metadata: { requestId: command.requestId, requestHash, rowIds: preview.rows.map(row => row[0]), contentHash: receipt.contentHash, receipt } } } : undefined }, auditId)
      return { ...receipt, replayed: false }
    }, { isolationLevel: "RepeatableRead", timeout: 10000 }) } catch (error) {
      // The audit's deterministic primary key serializes concurrent retry outcomes.
      if (attempt < 1 && error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) continue
      throw error
    }
  }
}
