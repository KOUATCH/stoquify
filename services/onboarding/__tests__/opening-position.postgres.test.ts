jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require("@prisma/client"), target = process.env.AF09_POSTGRES_URL
  if (process.env.NODE_ENV === "production" || !target || !process.env.AF09_CLUSTER_DIR) throw Error("Explicit synthetic AF09 target required")
  const url = new URL(target)
  if (url.hostname !== "127.0.0.1" || url.port !== "55449" || url.pathname !== "/stoquify_local_af09_20261020_r1") throw Error("Wrong AF09 database")
  return { db: new PrismaClient({ datasources: { db: { url: target } } }) }
})
import { realpathSync, writeFileSync } from "node:fs"
import { db } from "@/prisma/db"
import { getOpeningPositionWorkspace, stageOpeningPosition, reviewOpeningPosition } from "../opening-position.service"
import { executeFirmEngagementCommand } from "@/services/accounting/firm-engagement.service"
import type { WorkpaperActor } from "@/services/accounting/review-workpaper.service"
import type { OpeningMappings } from "../opening-position.contract"
import source from "./fixtures/af09-source.json"
import controls from "./fixtures/af09-controls.json"
const prefix = `af09-${Date.now()}`, out = "docs/accounting-firms/roadmap-2026-10-19/execution/AF09/2026-10-20-run-01"
const permissions = ["accounting.audit.read", "accounting.close.read", "accounting.close.accountant.invite",
  "accounting.close.accountant.review", "accounting.close.finding.comment", "accounting.exports.create"]
beforeAll(async () => {
  const actual = (await db.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory"))[0].data_directory
  if (realpathSync(actual).toLowerCase() !== realpathSync(process.env.AF09_CLUSTER_DIR!).toLowerCase()) throw Error("Wrong owned cluster")
})
afterAll(async () => db.$disconnect())
async function fixture(name: string) {
  const client = `${prefix}-${name}-client`, firm = `${prefix}-${name}-firm`
  for (const id of [client, firm]) await db.organization.create({ data: { id, slug: id, name: "Synthetic " + name, currency: "XAF", countryCode: "CM", requestedModules: ["accounting", "close_assurance"] } })
  const actors: Record<string, WorkpaperActor> = {}
  for (const who of ["preparer", "reviewer", "owner"]) {
    const home = who === "owner" ? client : firm, id = `${prefix}-${name}-${who}`
    await db.role.create({ data: { id: id + "-role", organizationId: home, code: who, nameEn: who, permissions } })
    await db.user.create({ data: { id, organizationId: home, email: id + "@example.invalid", name: who, emailVerified: true, roles: { connect: { id: id + "-role" } } } })
    const session = await db.session.create({ data: { userId: id, token: id + "-private-token", expiresAt: new Date("2099-01-01"),
      assuranceVerifiedAt: new Date(), assuranceMethod: "password", assuranceOrganizationId: home, assuranceLevel: 1 } })
    actors[who] = { homeOrganizationId: home, actorId: id, actorPermissions: permissions, session: { id: session.id, token: session.token }, lastAuthAt: new Date() }
  }
  for (const who of ["preparer", "reviewer"]) await db.accountantAccessGrant.create({ data: {
    id: actors[who].actorId + "-grant", organizationId: client, accountantUserId: actors[who].actorId, accountantFirmName: "Synthetic",
    role: "REVIEWER", activeScopeKey: `${client}:${actors[who].actorId}`, consentGrantedById: actors.owner.actorId,
    consentEvidenceHash: "sha256:" + "a".repeat(64), effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") } })
  const command = (input: Record<string, unknown>) => executeFirmEngagementCommand(actors.preparer, { ...input, idempotencyKey: `${name}-${Math.random()}` })
  const engagement = await command({ command: "CREATE", clientOrganizationId: client, ownerUserId: actors.preparer.actorId, scope: "REVIEWER", effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") })
  for (const who of ["preparer", "reviewer"]) {
    await command({ command: "ASSIGN", engagementId: engagement.engagementId, expectedVersion: 0, accountantUserId: actors[who].actorId,
      expectedAssignmentVersion: 0, scope: "REVIEWER", effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") })
    await command({ command: "ENROLL", engagementId: engagement.engagementId, expectedVersion: 0, grantId: actors[who].actorId + "-grant" })
  }
  await command({ command: "TRANSITION", engagementId: engagement.engagementId, expectedVersion: 0, status: "ACTIVE", reason: "Synthetic AF09 activation" })
  const mappings: OpeningMappings = { accounts: [], customers: [], suppliers: [], items: [], locations: [] }
  for (const [code, kind] of [["311", "STOCK"], ["411", "AR"], ["401", "AP"], ["571", "CASH"], ["101", "EQUITY"]]) {
    const account = await db.chartOfAccount.create({ data: { organizationId: client, code, nameEn: kind, currency: "XAF",
      type: kind === "AP" ? "LIABILITY" : kind === "EQUITY" ? "EQUITY" : "ASSET", normalBalance: ["AP", "EQUITY"].includes(kind) ? "CREDIT" : "DEBIT" } })
    mappings.accounts.push({ source: kind, targetId: account.id })
  }
  const customer = await db.customer.create({ data: { organizationId: client, name: "Synthetic customer", currentBalance: "17.00" } })
  const supplier = await db.supplier.create({ data: { organizationId: client, name: "Synthetic supplier", currentBalance: "29.00" } })
  const unit = await db.unit.create({ data: { organizationId: client, symbol: "kg", nameEn: "kilogram" } })
  const item = await db.item.create({ data: { organizationId: client, sku: "FLOUR", slug: client + "-flour", nameEn: "Synthetic flour", imageUrls: [], unitId: unit.id } })
  const location = await db.location.create({ data: { organizationId: client, code: "MAIN", name: "Synthetic warehouse" } })
  mappings.customers.push({ source: "CUSTOMER-1", targetId: customer.id }); mappings.suppliers.push({ source: "SUPPLIER-1", targetId: supplier.id })
  mappings.items.push({ source: "FLOUR", targetId: item.id }); mappings.locations.push({ source: "MAIN", targetId: location.id })
  const scope = { clientOrganizationId: client }
  const stage = { ...scope, sourceFilename: "source.json", sourceContent: JSON.stringify(source), controlsFilename: "controls.json",
    controlsContent: JSON.stringify(controls), mappings, expectedRevision: 0, idempotencyKey: "synthetic-stage" }
  return { client, firm, actors, scope, stage, mappings, customer, supplier, item, location, engagementId: engagement.engagementId }
}
async function financialState(client: string) {
  return {
    journals: await db.journalEntry.count({ where: { organizationId: client } }),
    stock: await db.inventoryTransaction.count({ where: { organizationId: client } }),
    levels: await db.inventoryLevel.count({ where: { item: { organizationId: client }, location: { organizationId: client } } }),
    ar: await db.customerLedgerEntry.count({ where: { organizationId: client } }),
    ap: await db.supplierLedgerEntry.count({ where: { organizationId: client } }),
    masterBatches: await db.onboardingImportBatch.count({ where: { organizationId: client } }),
    customer: (await db.customer.findFirstOrThrow({ where: { organizationId: client } })).currentBalance.toString(),
    supplier: (await db.supplier.findFirstOrThrow({ where: { organizationId: client } })).currentBalance.toString(),
  }
}
async function staged(f: Awaited<ReturnType<typeof fixture>>) {
  const receipt = await stageOpeningPosition(f.actors.preparer, f.stage)
  const workspace = await getOpeningPositionWorkspace(f.actors.reviewer, f.scope)
  return { receipt, workspace, review: { ...f.scope, revisionId: receipt.id, expectedDigest: workspace.current!.preview.digest,
    decision: "REVIEWED", conclusion: "Synthetic independent tie-out reviewed; no financial apply authorized.", idempotencyKey: "synthetic-review" } }
}
it("stages and independently reviews exact controls without operational writes, and retains a browser fixture", async () => {
  const f = await fixture("journey"), before = await financialState(f.client), s = await staged(f)
  expect(s.workspace.current!.preview.canReview).toBe(true)
  await expect(reviewOpeningPosition(f.actors.preparer, s.review)).rejects.toMatchObject({ code: "SOD_VIOLATION" })
  await reviewOpeningPosition(f.actors.reviewer, s.review)
  expect(await reviewOpeningPosition(f.actors.reviewer, s.review)).toMatchObject({ replayed: true })
  const reviewed = await getOpeningPositionWorkspace(f.actors.preparer, f.scope)
  expect(reviewed.current!.reviewState).toBe("REVIEWED"); expect(reviewed.current!.preview.canApply).toBe(false)
  expect(await financialState(f.client)).toEqual(before)
  expect(await db.closeRun.count({ where: { organizationId: f.client } })).toBe(0)
  writeFileSync(`${out}/balanced-preview.json`, JSON.stringify(reviewed, null, 2))
  writeFileSync(`${out}/financial-write-boundary.json`, JSON.stringify({ before, after: await financialState(f.client), equal: true }, null, 2))
  writeFileSync(`${out}/browser-fixture.json`, JSON.stringify({ client: f.client, firm: f.firm, mappings: f.mappings, actors: Object.fromEntries(Object.entries(f.actors).map(([role, actor]) => [role, actor.actorId])) }, null, 2))
})
it("detects duplicates and concurrent exact retries without staging duplicate revisions", async () => {
  const f = await fixture("duplicate")
  const results = await Promise.all([1, 2].map(() => stageOpeningPosition(f.actors.preparer, f.stage)))
  expect(new Set(results.map(row => row.id)).size).toBe(1)
  expect(await stageOpeningPosition(f.actors.preparer, { ...f.stage, sourceContent: JSON.stringify(source, null, 2), expectedRevision: 1, idempotencyKey: "duplicate-other-key" })).toMatchObject({ duplicate: true, revision: 1 })
  await expect(stageOpeningPosition(f.actors.preparer, { ...f.stage, sourceFilename: "changed.json" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  expect(await db.financialOpeningRevision.count({ where: { organizationId: f.client } })).toBe(1)
})
it("retains mismatched previews, blocks positive review and permits an independent correction request", async () => {
  const f = await fixture("mismatch")
  f.stage.controlsContent = JSON.stringify({ ...controls, ar: "99.00" })
  const s = await staged(f)
  expect(s.workspace.current!.preview.comparisons.find(row => row.key === "ar")?.difference).toBe("1.00")
  await expect(reviewOpeningPosition(f.actors.reviewer, s.review)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  await reviewOpeningPosition(f.actors.reviewer, { ...s.review, decision: "CHANGES_REQUESTED" })
  const result = await getOpeningPositionWorkspace(f.actors.preparer, f.scope)
  expect(result.current!.reviewState).toBe("CHANGES_REQUESTED")
  writeFileSync(`${out}/mismatched-preview.json`, JSON.stringify(result, null, 2))
})
it("supersedes review when source or mappings change and rejects old revision approval", async () => {
  const f = await fixture("revision"), s = await staged(f)
  await reviewOpeningPosition(f.actors.reviewer, s.review)
  const revised = { ...source, evidenceReference: "synthetic:revised-source" }
  await stageOpeningPosition(f.actors.preparer, { ...f.stage, sourceContent: JSON.stringify(revised), expectedRevision: 1, idempotencyKey: "source-revision" })
  const current = await getOpeningPositionWorkspace(f.actors.reviewer, f.scope)
  expect(current.current!.reviewState).toBe("STAGED"); expect(current.history[1].status).toBe("SUPERSEDED")
  await expect(reviewOpeningPosition(f.actors.reviewer, s.review)).rejects.toMatchObject({ code: "CONFLICT" })
  const mappings = structuredClone(f.mappings); mappings.accounts[0].targetId = mappings.accounts[1].targetId
  await stageOpeningPosition(f.actors.preparer, { ...f.stage, mappings, expectedRevision: 2, idempotencyKey: "mapping-revision" })
  const changed = await getOpeningPositionWorkspace(f.actors.reviewer, f.scope)
  expect(changed.current!.preview.canReview).toBe(false); expect(changed.current!.preview.mappingHash).not.toBe(current.current!.preview.mappingHash)
})
it("invalidates changed mapped masters and permits a newly bound revision", async () => {
  const f = await fixture("master"), s = await staged(f)
  await reviewOpeningPosition(f.actors.reviewer, s.review)
  await db.chartOfAccount.update({ where: { id: f.mappings.accounts[0].targetId }, data: { nameEn: "Changed source account meaning" } })
  const changed = await getOpeningPositionWorkspace(f.actors.reviewer, f.scope)
  expect(changed.current!.reviewState).toBe("STALE"); expect(changed.current!.preview.canReview).toBe(false)
  await expect(reviewOpeningPosition(f.actors.reviewer, s.review)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(await stageOpeningPosition(f.actors.preparer, { ...f.stage, expectedRevision: 1, idempotencyKey: "refresh-master" })).toMatchObject({ revision: 2, duplicate: false })
})
it("enforces current client isolation, mandate, engagement, freshness and module authority", async () => {
  const f = await fixture("authority"), s = await staged(f)
  await expect(reviewOpeningPosition(f.actors.reviewer, { ...s.review, clientOrganizationId: f.firm })).rejects.toMatchObject({ code: "NOT_FOUND" })
  await db.session.update({ where: { id: f.actors.reviewer.session.id }, data: { assuranceVerifiedAt: new Date(Date.now() - 301000) } })
  await expect(reviewOpeningPosition(f.actors.reviewer, s.review)).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
  await db.organization.update({ where: { id: f.client }, data: { requestedModules: ["accounting"] } })
  await expect(getOpeningPositionWorkspace(f.actors.preparer, f.scope)).rejects.toMatchObject({ code: "FORBIDDEN" })
  await db.organization.update({ where: { id: f.client }, data: { requestedModules: ["accounting", "close_assurance"] } })
  await executeFirmEngagementCommand(f.actors.preparer, { command: "TRANSITION", engagementId: f.engagementId, expectedVersion: 1, status: "SUSPENDED", reason: "Synthetic suspension test", idempotencyKey: "suspend-engagement" })
  await expect(stageOpeningPosition(f.actors.preparer, f.stage)).rejects.toMatchObject({ code: "FORBIDDEN" })
  await db.accountantAccessGrant.update({ where: { id: f.actors.preparer.actorId + "-grant" }, data: { status: "REVOKED", revokedAt: new Date(), revokedById: f.actors.owner.actorId, activeScopeKey: null } })
  await expect(getOpeningPositionWorkspace(f.actors.preparer, f.scope)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it("rejects immutable evidence edits/deletion and rolls staging back if its audit fails", async () => {
  const f = await fixture("rollback"), s = await staged(f)
  await expect(db.financialOpeningRevision.update({ where: { id: s.receipt.id }, data: { sourceContent: "{}" } })).rejects.toThrow("immutable")
  await expect(db.financialOpeningRevision.delete({ where: { id: s.receipt.id } })).rejects.toThrow("retained")
  await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION af09_fail_stage() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'OPENING_POSITION_STAGED' AND NEW."organizationId" = '${f.client}' THEN RAISE EXCEPTION 'AF09 synthetic audit failure'; END IF; RETURN NEW; END $$`)
  await db.$executeRawUnsafe("CREATE TRIGGER af09_fail_stage BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION af09_fail_stage()")
  const next = { ...f.stage, expectedRevision: 1, idempotencyKey: "rollback-next", sourceContent: JSON.stringify({ ...source, evidenceReference: "synthetic:next" }) }
  try { await expect(stageOpeningPosition(f.actors.preparer, next)).rejects.toThrow() }
  finally { await db.$executeRawUnsafe("DROP TRIGGER af09_fail_stage ON audit_logs") }
  expect(await db.financialOpeningRevision.count({ where: { organizationId: f.client } })).toBe(1)
  expect(await stageOpeningPosition(f.actors.preparer, next)).toMatchObject({ revision: 2 })
})
it("keeps unavailable foreign master references blocked and rejects unsupported tenant currency", async () => {
  const f = await fixture("foreign")
  f.stage.mappings.accounts[0].targetId = "foreign-account"
  const s = await staged(f)
  expect(s.workspace.current!.preview.issues.some(row => row.code === "UNAVAILABLE_MAPPING")).toBe(true)
  await expect(reviewOpeningPosition(f.actors.reviewer, s.review)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  await db.organization.update({ where: { id: f.client }, data: { currency: "EUR" } })
  await expect(getOpeningPositionWorkspace(f.actors.preparer, f.scope)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
})
