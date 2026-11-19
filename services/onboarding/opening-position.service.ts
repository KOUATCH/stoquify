import "server-only"
import { Prisma, type FinancialOpeningRevision } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { lockWorkpaperAuthorityInTx } from "@/services/accounting/close-evidence-acceptance-authority.service"
import { readCloseAssessmentPublicationTimeInTx } from "@/services/accounting/close-assessment-order.service"
import type { WorkpaperActor } from "@/services/accounting/review-workpaper.service"
import { hashCsvContent, hashStablePayload } from "./master-data-csv"
import { previewOpeningPosition } from "./opening-position-preview"
import {
  OPENING_MAX_BYTES, openingScopeSchema, openingStageSchema, openingReviewSchema, openingSourceSchema,
  openingControlsSchema, openingMappingsSchema, type OpeningCatalog, type OpeningMappings, type OpeningWorkspace,
} from "./opening-position.contract"

const cutoverDate = "2026-10-01"
const options = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20000, maxWait: 10000 }
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
function document(content: string, kind: "source" | "controls") {
  if (Buffer.byteLength(content, "utf8") > OPENING_MAX_BYTES) throw new BusinessRuleError("Each JSON document must be at most 100,000 UTF-8 bytes.")
  try { return JSON.parse(content) as unknown } catch { throw new BusinessRuleError(`The ${kind} document is not valid JSON.`) }
}
export async function lockCutover(tx: Prisma.TransactionClient, organizationId: string) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`opening-preview:${organizationId}:${cutoverDate}`})::bigint)`
  const org = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { countryCode: true, currency: true } })
  if (org.countryCode !== "CM" || org.currency !== "XAF") throw new BusinessRuleError("The opening preview pilot requires a CM organization using XAF.")
}
export async function catalogInTx(tx: Prisma.TransactionClient, organizationId: string, mappings?: OpeningMappings): Promise<OpeningCatalog> {
  // Bound the selector catalog. Selected rows are locked for retained/reviewed
  // previews so a concurrent master edit cannot change their meaning at commit.
  if (mappings) {
    for (const [group, table] of [["accounts", "chart_of_accounts"], ["customers", "customers"], ["suppliers", "suppliers"], ["items", "items"], ["locations", "locations"]] as const) {
      const ids = mappings[group].map(row => row.targetId).sort()
      if (ids.length) await tx.$queryRaw(Prisma.sql`SELECT id FROM ${Prisma.raw(table)} WHERE "organizationId" = ${organizationId} AND id IN (${Prisma.join(ids)}) ORDER BY id FOR SHARE`)
    }
    const items = await tx.item.findMany({ where: { organizationId, id: { in: mappings.items.map(row => row.targetId) } }, select: { unitId: true } })
    const units = items.flatMap(row => row.unitId ? [row.unitId] : []).sort()
    if (units.length) await tx.$queryRaw(Prisma.sql`SELECT id FROM units WHERE "organizationId" = ${organizationId} AND id IN (${Prisma.join(units)}) ORDER BY id FOR SHARE`)
  }
  const where = { organizationId, isActive: true, deletedAt: null }
  const [accounts, customers, suppliers, items, locations] = await Promise.all([
    tx.chartOfAccount.findMany({ where, orderBy: { id: "asc" }, take: 201, select: { id: true, code: true, nameEn: true, type: true, normalBalance: true, currency: true } }),
    tx.customer.findMany({ where, orderBy: { id: "asc" }, take: 201, select: { id: true, name: true } }),
    tx.supplier.findMany({ where, orderBy: { id: "asc" }, take: 201, select: { id: true, name: true } }),
    tx.item.findMany({ where, orderBy: { id: "asc" }, take: 201, select: { id: true, nameEn: true, unit: { select: { organizationId: true, symbol: true, isActive: true } } } }),
    tx.location.findMany({ where, orderBy: { id: "asc" }, take: 201, select: { id: true, name: true } }),
  ])
  if ([accounts, customers, suppliers, items, locations].some(rows => rows.length > 200)) throw new BusinessRuleError("This preview pilot supports up to 200 active master choices per category; narrow-catalog support is required for this client.")
  return {
    accounts: accounts.map(row => ({ ...row, name: row.nameEn, active: true })),
    customers: customers.map(row => ({ ...row, active: true })), suppliers: suppliers.map(row => ({ ...row, active: true })),
    locations: locations.map(row => ({ ...row, active: true })),
    items: items.map(row => ({ id: row.id, name: row.nameEn, active: true, unit: row.unit?.isActive && row.unit.organizationId === organizationId ? row.unit.symbol : null })),
  }
}
export function retainedPreview(row: FinancialOpeningRevision, catalog: OpeningCatalog) {
  const source = openingSourceSchema.parse(document(row.sourceContent, "source"))
  const controls = openingControlsSchema.parse(document(row.controlsContent, "controls"))
  const mappings = openingMappingsSchema.parse(row.mappings)
  if (hashCsvContent(row.sourceContent) !== row.sourceHash || hashCsvContent(row.controlsContent) !== row.controlsHash ||
    hashStablePayload(mappings) !== row.mappingHash) throw new ConflictError("Retained opening evidence integrity is invalid.")
  return { source, controls, mappings, preview: previewOpeningPosition(source, controls, mappings, catalog, row.sourceHash, row.controlsHash) }
}
export async function getOpeningPositionWorkspace(actor: WorkpaperActor, raw: unknown): Promise<OpeningWorkspace> {
  const input = openingScopeSchema.parse(raw), organizationId = input.clientOrganizationId ?? actor.homeOrganizationId
  return db.$transaction(async tx => {
    const authority = await lockWorkpaperAuthorityInTx(tx, { ...actor, organizationId }, "workpaper-read")
    await lockCutover(tx, organizationId)
    const rows = await tx.financialOpeningRevision.findMany({ where: { organizationId, cutoverDate }, orderBy: { revision: "desc" }, take: 100 })
    const row = rows[0], catalog = await catalogInTx(tx, organizationId, row ? openingMappingsSchema.parse(row.mappings) : undefined)
    let current: OpeningWorkspace["current"] = null
    if (row) {
      const evidence = retainedPreview(row, catalog), stale = evidence.preview.digest !== row.manifestDigest
      current = { id: row.id, revision: row.revision, sourceFilename: row.sourceFilename, controlsFilename: row.controlsFilename,
        createdById: row.createdById, createdAt: row.createdAt.toISOString(), ...evidence,
        preview: { ...evidence.preview, canReview: evidence.preview.canReview && !stale },
        reviewState: stale ? "STALE" : row.status as "STAGED" | "REVIEWED" | "CHANGES_REQUESTED",
        reviewedById: row.reviewedById, reviewedAt: row.reviewedAt?.toISOString() ?? null, conclusion: row.conclusion }
    }
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    return { organizationId, catalog, latestRevision: row?.revision ?? 0, current,
      history: rows.map((r, i) => ({ id: r.id, revision: r.revision, sourceHash: r.sourceHash, mappingHash: r.mappingHash, status: i ? "SUPERSEDED" : current!.reviewState })) }
  }, options)
}
export async function stageOpeningPosition(actor: WorkpaperActor, raw: unknown) {
  const input = openingStageSchema.parse(raw), organizationId = input.clientOrganizationId ?? actor.homeOrganizationId
  const source = openingSourceSchema.parse(document(input.sourceContent, "source")), controls = openingControlsSchema.parse(document(input.controlsContent, "controls"))
  if (![input.sourceFilename, input.controlsFilename].every(name => /^[^/\\]+\.json$/i.test(name))) throw new BusinessRuleError("Upload named JSON documents.")
  const commandHash = hashStablePayload({ actorId: actor.actorId, input })
  return db.$transaction(async tx => {
    const authority = await lockWorkpaperAuthorityInTx(tx, { ...actor, organizationId }, "workpaper-prepare")
    await lockCutover(tx, organizationId)
    const latest = await tx.financialOpeningRevision.findFirst({ where: { organizationId, cutoverDate }, orderBy: { revision: "desc" } })
    const replay = await tx.financialOpeningRevision.findUnique({ where: { organizationId_idempotencyKey: { organizationId, idempotencyKey: input.idempotencyKey } } })
    if (replay) {
      if (replay.commandHash !== commandHash) throw new IdempotencyConflictError()
      await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
      return { id: replay.id, revision: replay.revision, replayed: true, duplicate: false }
    }
    if ((latest?.revision ?? 0) !== input.expectedRevision) throw new ConflictError("A newer opening revision exists. Refresh before staging.")
    const catalog = await catalogInTx(tx, organizationId, input.mappings)
    const preview = previewOpeningPosition(source, controls, input.mappings, catalog, hashCsvContent(input.sourceContent), hashCsvContent(input.controlsContent))
    const datasetHash = hashStablePayload({ source, controls, mappings: input.mappings })
    const duplicate = await tx.financialOpeningRevision.findFirst({ where: { organizationId, cutoverDate, datasetHash }, orderBy: { revision: "desc" } })
    if (duplicate && retainedPreview(duplicate, catalog).preview.masterHash === (duplicate.manifest as unknown as { masterHash: string }).masterHash) {
      await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
      return { id: duplicate.id, revision: duplicate.revision, replayed: false, duplicate: true }
    }
    if ((latest?.revision ?? 0) >= 100) throw new BusinessRuleError("The 100-revision pilot limit is reached. Retained evidence remains readable.")
    const row = await tx.financialOpeningRevision.create({ data: { organizationId, cutoverDate, revision: (latest?.revision ?? 0) + 1,
      sourceFilename: input.sourceFilename, controlsFilename: input.controlsFilename, sourceContent: input.sourceContent, controlsContent: input.controlsContent,
      sourceHash: preview.sourceHash, controlsHash: preview.controlsHash, mappingHash: preview.mappingHash, datasetHash,
      mappings: json(input.mappings), manifest: json(preview), manifestDigest: preview.digest, commandHash,
      idempotencyKey: input.idempotencyKey, createdById: actor.actorId } })
    await tx.auditLog.create({ data: { organizationId, userId: actor.actorId, entityType: "FinancialOpeningRevision", entityId: row.id,
      action: "OPENING_POSITION_STAGED", changes: json({ revision: row.revision, digest: preview.digest, issues: preview.issues.length, apply: false }) } })
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    return { id: row.id, revision: row.revision, replayed: false, duplicate: false }
  }, options)
}
export async function reviewOpeningPosition(actor: WorkpaperActor, raw: unknown) {
  const input = openingReviewSchema.parse(raw), organizationId = input.clientOrganizationId ?? actor.homeOrganizationId
  return db.$transaction(async tx => {
    const authority = await lockWorkpaperAuthorityInTx(tx, { ...actor, organizationId }, "workpaper-review")
    await lockCutover(tx, organizationId)
    const row = await tx.financialOpeningRevision.findFirst({ where: { id: input.revisionId, organizationId, cutoverDate } })
    if (!row) throw new NotFoundError("The opening revision is unavailable.")
    const latest = await tx.financialOpeningRevision.findFirst({ where: { organizationId, cutoverDate }, orderBy: { revision: "desc" }, select: { id: true } })
    if (latest?.id !== row.id) throw new ConflictError("A newer source or mapping revision requires a new review.")
    const catalog = await catalogInTx(tx, organizationId, openingMappingsSchema.parse(row.mappings))
    const { preview } = retainedPreview(row, catalog)
    if (preview.digest !== input.expectedDigest || preview.digest !== row.manifestDigest) throw new ConflictError("The preview or mapped master data changed. Stage a fresh revision.")
    const commandHash = hashStablePayload({ actorId: actor.actorId, input })
    if (row.reviewKey) {
      if (row.reviewKey !== input.idempotencyKey || row.reviewCommandHash !== commandHash) throw new IdempotencyConflictError()
      await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
      return { id: row.id, replayed: true }
    }
    if (row.createdById === actor.actorId) throw new BusinessRuleError("A different accountant must review the opening preview.", "SOD_VIOLATION")
    if (input.decision === "REVIEWED" && !preview.canReview) throw new BusinessRuleError("Resolve all mapping and control differences before recording a positive preview review.")
    const at = await readCloseAssessmentPublicationTimeInTx(tx)
    await authority.revalidate(at)
    await tx.financialOpeningRevision.update({ where: { id: row.id }, data: { status: input.decision, reviewedById: actor.actorId, reviewedAt: at,
      reviewDigest: preview.digest, reviewKey: input.idempotencyKey, reviewCommandHash: commandHash, conclusion: input.conclusion } })
    await tx.auditLog.create({ data: { organizationId, userId: actor.actorId, entityType: "FinancialOpeningRevision", entityId: row.id,
      action: "OPENING_POSITION_REVIEWED", changes: json({ digest: preview.digest, decision: input.decision, apply: false }) } })
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx))
    return { id: row.id, replayed: false }
  }, options)
}
