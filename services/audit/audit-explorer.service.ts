import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import type { RbacContext } from "@/lib/security/rbac"
import { hasAllRbacPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ForbiddenError, ConflictError } from "@/services/_shared/action-errors"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { resolveTenantWideOperatingAuthority } from "@/services/operating-access/operating-access-scope-contracts"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { auditExplorerInput, itemAuditPermissions, projectAuditDetails, type AuditAction, type AuditEntry, type AuditExplorerResult } from "./audit-explorer-contracts"

type Actor = Pick<RbacContext, "orgId" | "userId" | "permissions">
type Anchor = { id: string; createdAt: Date }
type Row = Anchor & { entityType: AuditEntry["entityType"]; entityId: string; reference: string | null; action: AuditAction; actorId: string | null; safeDetails: unknown }

export async function readAuditExplorer(ctx: Actor, input: unknown): Promise<AuditExplorerResult> {
  if (!ctx.orgId || !ctx.userId || !hasRbacPermission(ctx.permissions, "controls.audit.read")) throw new ForbiddenError()
  const query = auditExplorerInput.parse(input)
  // Match existing source module policies. These checks do not grant source read permissions.
  const checkModule = async (moduleSlug: "inventory" | "settings", mode: "enforce" | "observe") => observeModuleAccess({
    organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, moduleSlug,
    surfaceType: "action", surface: "audit-explorer", accessIntent: "read", mode, audit: false,
  })
  const [settings, inventory] = await Promise.all([
    query.family !== "items" && hasRbacPermission(ctx.permissions, "users.read") ? checkModule("settings", "observe") : Promise.resolve({ allowed: false }),
    query.family !== "access" && hasRbacPermission(ctx.permissions, "inventory.items.read") ? checkModule("inventory", "enforce") : Promise.resolve({ allowed: false }),
  ])
  return db.$transaction(async tx => {
    await tx.$executeRaw`SET LOCAL statement_timeout = '2000ms'`
    // Read current stored authority in the same snapshot as the events, matching
    // member-history semantics. A session role label never grants location scope.
    const actor = await tx.user.findFirst({ where: { id: ctx.userId, organizationId: ctx.orgId, organization: { isActive: true, deletedAt: null } },
      select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true,
        roles: { where: { organizationId: ctx.orgId }, select: { code: true, permissions: true } } } })
    const permissions = actor?.roles.flatMap(role => role.permissions) ?? []
    if (!actor || !isUsableAccount(actor, new Date()) || !hasRbacPermission(permissions, "controls.audit.read")) throw new ForbiddenError()
    const can = (...required: string[]) => [ctx.permissions, permissions].every(grants => hasAllRbacPermissions(grants, required))
    const canFilterActor = can("users.read")
    if (query.actorId && !canFilterActor) throw new ForbiddenError()
    const accessAvailable = settings.allowed && canFilterActor
    const itemDecisionsAvailable = inventory.allowed && can("inventory.items.read")
    const stockChangesAvailable = itemDecisionsAvailable && can("inventory.levels.read", "dashboard.read")
    const tenantWide = Boolean(resolveTenantWideOperatingAuthority({ isSuperUser: hasRbacPermission(permissions, "*"), roleCodes: actor.roles.map(role => role.code) }))
    const families: Prisma.Sql[] = []
    if (accessAvailable) families.push(Prisma.sql`(a."entityType" = 'User' AND a.action IN ('MEMBER_ACCESS_CHANGED', 'DEACTIVATE_USER')
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = a."entityId" AND u."organizationId" = ${ctx.orgId}))`)
    if (itemDecisionsAvailable) families.push(Prisma.sql`(a."entityType" = 'SecurityEvent' AND a.action IN ('PERMISSION_GRANTED', 'PERMISSION_DENIED')
      AND a.changes->>'resource' = 'Item' AND a.changes->>'permission' IN (${Prisma.join([...itemAuditPermissions])})
      AND a.changes->>'resourceId' = a."entityId"
      AND EXISTS (SELECT 1 FROM items i WHERE i.id = a."entityId" AND i."organizationId" = ${ctx.orgId}))`)
    if (stockChangesAvailable) families.push(Prisma.sql`(a."entityType" = 'StockAdjustment'
      AND a.action IN ('REQUEST_MANUAL_ITEM_STOCK_ADJUSTMENT', 'POST_STOCK_ADJUSTMENT', 'REVERSE_STOCK_ADJUSTMENT')
      AND EXISTS (SELECT 1 FROM stock_adjustments s JOIN locations l ON l.id = s."locationId"
        WHERE s.id = a."entityId" AND s."organizationId" = ${ctx.orgId} AND l."organizationId" = ${ctx.orgId}
        ${tenantWide ? Prisma.empty : Prisma.sql`AND l."managerId" = ${ctx.userId} AND l."isActive" = true AND l."deletedAt" IS NULL`}
        AND EXISTS (SELECT 1 FROM stock_adjustment_lines sl JOIN items i ON i.id = sl."itemId" WHERE sl."adjustmentId" = s.id AND i."organizationId" = ${ctx.orgId})
        AND NOT EXISTS (SELECT 1 FROM stock_adjustment_lines sl JOIN items i ON i.id = sl."itemId" WHERE sl."adjustmentId" = s.id AND i."organizationId" <> ${ctx.orgId})))`)
    const base = { checkedAt: new Date().toISOString(), canFilterActor, accessAvailable, itemDecisionsAvailable, stockChangesAvailable }
    if (!families.length) return { ...base, entries: [], throughId: null, recordedThrough: null, nextCursor: null }
    // All event, entity and location constraints precede every cursor and page read.
    const scope = Prisma.sql`a."organizationId" = ${ctx.orgId} AND (${Prisma.join(families, " OR ")})
      ${query.action ? Prisma.sql`AND a.action = ${query.action}` : Prisma.empty}
      ${query.entityId ? Prisma.sql`AND a."entityId" = ${query.entityId}` : Prisma.empty}
      ${query.actorId ? Prisma.sql`AND a."userId" = ${query.actorId} AND EXISTS (SELECT 1 FROM users actor WHERE actor.id = a."userId" AND actor."organizationId" = ${ctx.orgId})` : Prisma.empty}
      ${query.from ? Prisma.sql`AND a."createdAt" >= ${`${query.from}T00:00:00.000Z`}::timestamp` : Prisma.empty}
      ${query.through ? Prisma.sql`AND a."createdAt" < ${new Date(new Date(`${query.through}T00:00:00.000Z`).getTime() + 86400000).toISOString()}::timestamp` : Prisma.empty}`
    const snapshots = await tx.$queryRaw<Anchor[]>(Prisma.sql`SELECT a.id, a."createdAt" FROM audit_logs a WHERE ${scope}
      ${query.throughId ? Prisma.sql`AND a.id = ${query.throughId}` : Prisma.empty} ORDER BY a."createdAt" DESC, a.id DESC LIMIT 1`)
    const snapshot = snapshots[0]
    if (query.throughId && !snapshot) throw new ConflictError("Audit snapshot unavailable. Start a new investigation.")
    if (!snapshot) return { ...base, entries: [], throughId: null, recordedThrough: null, nextCursor: null }
    // Compare the persisted timestamp at its original precision and type. Raw
    // timestamp parameters round-tripped through JavaScript can shift a boundary.
    const upper = Prisma.sql`(a."createdAt", a.id) <= (SELECT bound."createdAt", bound.id FROM audit_logs bound WHERE bound."organizationId" = ${ctx.orgId} AND bound.id = ${snapshot.id})`
    const cursors = query.beforeId ? await tx.$queryRaw<Anchor[]>(Prisma.sql`SELECT a.id, a."createdAt" FROM audit_logs a WHERE ${scope} AND ${upper} AND a.id = ${query.beforeId} LIMIT 1`) : []
    const cursor = cursors[0]
    if (query.beforeId && !cursor) throw new ConflictError("Audit cursor unavailable. Start a new investigation.")
    const rows = await tx.$queryRaw<Row[]>(Prisma.sql`SELECT a.id, a."createdAt", a."entityType", a."entityId", a.action,
      CASE WHEN a."entityType" = 'StockAdjustment' THEN (SELECT s."adjustmentNumber" FROM stock_adjustments s WHERE s.id = a."entityId" AND s."organizationId" = ${ctx.orgId})
        WHEN a."entityType" = 'SecurityEvent' THEN (SELECT i.sku FROM items i WHERE i.id = a."entityId" AND i."organizationId" = ${ctx.orgId})
        ELSE a."entityId" END AS reference,
      ${canFilterActor ? Prisma.sql`(SELECT actor.id FROM users actor WHERE actor.id = a."userId" AND actor."organizationId" = ${ctx.orgId})` : Prisma.sql`NULL::text`} AS "actorId",
      jsonb_build_object('operation', a.changes->'operation',
        'addedRoles', CASE WHEN jsonb_typeof(a.changes->'added') = 'array' THEN jsonb_array_length(a.changes->'added') ELSE NULL END,
        'removedRoles', CASE WHEN jsonb_typeof(a.changes->'removed') = 'array' THEN jsonb_array_length(a.changes->'removed') ELSE NULL END,
        'beforeActive', COALESCE(a.changes->'beforeActive', a.changes->'before'->'isActive'),
        'afterActive', COALESCE(a.changes->'afterActive', a.changes->'after'->'isActive'),
        'permission', a.changes->'permission', 'mode', a.changes->'after'->'mode',
        'requiresApproval', a.changes->'after'->'requiresApproval', 'adjustmentType', a.changes->'after'->'adjustmentType') AS "safeDetails"
      FROM audit_logs a WHERE ${scope} AND ${upper}
      ${cursor ? Prisma.sql`AND (a."createdAt", a.id) < (SELECT prior."createdAt", prior.id FROM audit_logs prior WHERE prior."organizationId" = ${ctx.orgId} AND prior.id = ${cursor.id})` : Prisma.empty}
      ORDER BY a."createdAt" DESC, a.id DESC LIMIT 26`)
    const entries: AuditEntry[] = rows.slice(0, 25).map(row => {
      const details = projectAuditDetails(row.action, row.safeDetails)
      return { id: row.id, recordedAt: row.createdAt.toISOString(), family: row.entityType === "User" ? "access" : "items",
        entityType: row.entityType, entityId: row.entityId, reference: row.reference ?? row.entityId, action: row.action, actorId: canFilterActor ? row.actorId : null, details,
        detailState: Object.keys(details).length ? "limited" : "unavailable",
        sourceHref: row.entityType === "User" ? `/dashboard/settings/users/update/${encodeURIComponent(row.entityId)}`
          : row.entityType === "SecurityEvent" ? `/dashboard/inventory/items/${encodeURIComponent(row.entityId)}` : "/dashboard/inventory/loss-control" }
    })
    return { ...base, entries, throughId: snapshot.id, recordedThrough: snapshot.createdAt.toISOString(), nextCursor: rows.length > 25 ? entries[24].id : null }
  }, { isolationLevel: "RepeatableRead", maxWait: 500, timeout: 6000 })
}
