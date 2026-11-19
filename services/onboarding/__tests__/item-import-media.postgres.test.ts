/** @jest-environment node */
import { randomUUID } from "node:crypto"
import { db } from "@/prisma/db"
import { createItem } from "@/services/item/item.service"
import { buildTenantCsvTemplate } from "../master-data-csv"
import { stageMasterDataImport, approveMasterDataImport, commitMasterDataImport } from "../master-data-import.service"

const target = new URL(process.env.DATABASE_URL ?? "")
if (process.env.RUN_P07_MEDIA_POSTGRES !== "1" || target.hostname !== "localhost" ||
  !/^\/stoquify_retention_p07_20261018_[a-f0-9]+$/.test(target.pathname) || target.search !== "?schema=public") {
  throw new Error("Requires the explicitly owned P07 media disposable database")
}
let org: string, maker: string, checker: string
beforeEach(async () => {
  org = `p07-media-${randomUUID()}`; maker = `maker-${randomUUID()}`; checker = `checker-${randomUUID()}`
  await db.organization.create({ data: { id: org, name: "Synthetic media checks", slug: org, requestedModules: [] } })
  for (const id of [maker, checker]) await db.user.create({ data: { id, organizationId: org, email: `${id}@retention.invalid`, mfaBackupCodes: [] } })
})
afterAll(async () => db.$disconnect())
// Pre-existing media boundary fixture, not proof of a provider upload. No real
// provider object/key is created or fetched. The actual claim transaction runs.
async function asset(status = "ready", organizationId = org, entityType = "item") {
  const id = randomUUID()
  await db.pictureAsset.create({ data: { id, organizationId, createdById: maker, entityType, status,
    encryptionKey: "synthetic", encryptionIv: "synthetic", encryptionTag: "synthetic", mimeType: "image/png", byteLength: 12, sha256: "0".repeat(64) } })
  return `/api/media/${id}`
}
function csv(refs: string[]) { return buildTenantCsvTemplate(org, "ITEM").content + refs.map((ref, i) => `SKU-${i},Item ${i},Article ${i},,,0,0,${ref}`).join("\n") + "\n" }
async function stage(content: string) { return stageMasterDataImport({ organizationId: org, actorId: maker, target: "ITEM", content, sourceFilename: "synthetic-media.csv" }) }
function command(batch: Awaited<ReturnType<typeof stage>>, actorId = checker) {
  return { organizationId: org, actorId, expectedTarget: "ITEM" as const, batchId: batch.batchId, expectedApprovalDigest: batch.approval.digest }
}
async function approved(refs: string[]) {
  const batch = await stage(csv(refs)); expect(batch.status).toBe("VALIDATED")
  await approveMasterDataImport(command(batch)); return batch
}
async function noOpeningEffects() {
  const where = { organizationId: org }
  expect(await db.inventoryLevel.count({ where: { item: { organizationId: org } } })).toBe(0)
  expect(await db.inventoryTransaction.count({ where })).toBe(0)
  expect(await db.journalEntry.count({ where })).toBe(0)
  expect(await db.ledgerPostingBatch.count({ where })).toBe(0)
}
it("imports owned images through actual domain claims; preserves source/approval and repeated commit", async () => {
  const refs = [await asset(), await asset()], content = csv(refs), batch = await stage(content)
  expect(batch.status).toBe("VALIDATED")
  expect(await db.pictureAsset.count({ where: { organizationId: org, attachedAt: { not: null } } })).toBe(0)
  await expect(approveMasterDataImport(command(batch, maker))).rejects.toThrow("different authorized user")
  await approveMasterDataImport(command(batch))
  const committed = await commitMasterDataImport(command(batch)); expect(committed.status).toBe("COMMITTED")
  expect((await commitMasterDataImport(command(batch))).replayed).toBe(true)
  expect((await stage(content)).batchId).toBe(batch.batchId)
  const items = await db.item.findMany({ where: { organizationId: org }, orderBy: { sku: "asc" } })
  expect(items.map(item => item.imageUrls)).toEqual(refs.map(ref => [ref]))
  expect(await db.pictureAsset.count({ where: { organizationId: org, attachedAt: { not: null } } })).toBe(2)
  const retained = await db.onboardingImportBatch.findUniqueOrThrow({ where: { id: batch.batchId }, include: { rows: true } })
  expect(retained.approvedById).toBe(checker); expect(retained.uploadedById).toBe(maker)
  expect(retained.rows.every(row => row.committedRecordId && row.sourceRowHash)).toBe(true)
  await noOpeningEffects()
})
it.each(["foreign", "missing", "deleted", "uploading", "wrong-entity"])("rejects %s media at validation without revealing scope or creating items", async kind => {
  const ref = kind === "missing" ? `/api/media/${randomUUID()}` : await asset(
    kind === "deleted" || kind === "uploading" ? kind : "ready", kind === "foreign" ? "foreign-synthetic-org" : org, kind === "wrong-entity" ? "other" : "item")
  const result = await stage(csv([ref])); expect(result.status).toBe("BLOCKED")
  expect(result.issues.some(issue => issue.code === "ITEM_MEDIA_UNAVAILABLE")).toBe(true)
  expect(JSON.stringify(result.issues)).not.toContain(ref)
  expect(await db.item.count({ where: { organizationId: org } })).toBe(0)
  await expect(approveMasterDataImport(command(result))).rejects.toThrow()
  await noOpeningEffects()
})
it("rechecks deletion after approval, preserves partial progress and resumes the same approved batch", async () => {
  const refs = [await asset(), await asset()], batch = await approved(refs)
  await db.pictureAsset.update({ where: { id: refs[1].split("/").pop()! }, data: { status: "deleting" } })
  await expect(commitMasterDataImport(command(batch))).rejects.toThrow("paused safely")
  const first = await db.item.findFirstOrThrow({ where: { organizationId: org } })
  expect(await db.item.count({ where: { organizationId: org } })).toBe(1)
  // Restore only this synthetic availability fault; no production deleted image is resurrected.
  await db.pictureAsset.update({ where: { id: refs[1].split("/").pop()! }, data: { status: "ready" } })
  expect((await commitMasterDataImport(command(batch))).status).toBe("COMMITTED")
  expect(await db.item.count({ where: { organizationId: org } })).toBe(2)
  expect((await db.item.findUniqueOrThrow({ where: { id: first.id } })).imageUrls).toEqual([refs[0]])
  await noOpeningEffects()
})
it("recovers a real interrupted checkpoint without a duplicate item or losing the claimed image", async () => {
  const ref = await asset(), batch = await approved([ref])
  // Database-side failure after the domain transaction commits, before its row checkpoint.
  await db.$executeRawUnsafe(`CREATE FUNCTION p07_media_checkpoint_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."committedRecordId" IS NOT NULL THEN RAISE EXCEPTION 'synthetic checkpoint loss'; END IF; RETURN NEW; END $$`)
  await db.$executeRawUnsafe(`CREATE TRIGGER p07_media_checkpoint_failure BEFORE UPDATE ON onboarding_import_rows FOR EACH ROW EXECUTE FUNCTION p07_media_checkpoint_failure()`)
  try { await expect(commitMasterDataImport(command(batch))).rejects.toThrow("paused safely") }
  finally {
    await db.$executeRawUnsafe(`DROP TRIGGER p07_media_checkpoint_failure ON onboarding_import_rows`)
    await db.$executeRawUnsafe(`DROP FUNCTION p07_media_checkpoint_failure()`)
  }
  const original = await db.item.findFirstOrThrow({ where: { organizationId: org } })
  expect((await commitMasterDataImport(command(batch))).status).toBe("COMMITTED")
  expect(await db.item.count({ where: { organizationId: org } })).toBe(1)
  expect((await db.onboardingImportRow.findFirstOrThrow({ where: { batchId: batch.batchId } })).committedRecordId).toBe(original.id)
  await noOpeningEffects()
})
it("rolls back the media claim when the item insert fails, then retries the original batch", async () => {
  const ref = await asset(), batch = await approved([ref])
  await db.$executeRawUnsafe(`CREATE FUNCTION p07_media_item_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic item insert failure'; END $$`)
  await db.$executeRawUnsafe(`CREATE TRIGGER p07_media_item_failure BEFORE INSERT ON items FOR EACH ROW EXECUTE FUNCTION p07_media_item_failure()`)
  try {
    await expect(commitMasterDataImport(command(batch))).rejects.toThrow("paused safely")
    expect(await db.item.count({ where: { organizationId: org } })).toBe(0)
    expect((await db.pictureAsset.findUniqueOrThrow({ where: { id: ref.split("/").pop()! } })).attachedAt).toBeNull()
  } finally {
    await db.$executeRawUnsafe(`DROP TRIGGER p07_media_item_failure ON items`)
    await db.$executeRawUnsafe(`DROP FUNCTION p07_media_item_failure()`)
  }
  expect((await commitMasterDataImport(command(batch))).status).toBe("COMMITTED")
  expect(await db.item.count({ where: { organizationId: org } })).toBe(1)
  await noOpeningEffects()
})
it("does not adopt a conflicting existing item's different image on retry", async () => {
  const expected = await asset(), different = await asset(), batch = await approved([expected])
  await createItem(org, maker, { nameEn: "Item 0", sku: "SKU-0", costPrice: 0, sellingPrice: 0, imageUrls: different })
  await db.onboardingImportRow.updateMany({ where: { batchId: batch.batchId }, data: { commitAttemptedAt: new Date() } })
  await expect(commitMasterDataImport(command(batch))).rejects.toThrow("paused safely")
  expect((await db.onboardingImportRow.findFirstOrThrow({ where: { batchId: batch.batchId } })).committedRecordId).toBeNull()
  expect((await db.pictureAsset.findUniqueOrThrow({ where: { id: expected.split("/").pop()! } })).attachedAt).toBeNull()
})
it("creates a new default mapping version while retaining legacy mapping and changed-source approval boundaries", async () => {
  const oldMap = { sku: "sku", nameEn: "nameEn", nameFr: "nameFr", descriptionEn: "descriptionEn", descriptionFr: "descriptionFr", costPrice: "costPrice", sellingPrice: "sellingPrice" }
  const old = await db.onboardingImportMapping.create({ data: { organizationId: org, target: "ITEM", version: 1, schemaVersion: "1", fieldMap: oldMap, requiredFields: ["sku", "nameEn"], createdById: maker } })
  const first = await stage(csv([await asset()])), second = await stage(csv([await asset()]))
  expect(first.mappingVersion).toBe(2); expect(first.schemaVersion).toBe("2")
  expect((await db.onboardingImportMapping.findUniqueOrThrow({ where: { id: old.id } })).fieldMap).toEqual(oldMap)
  expect(first.contentHash).not.toBe(second.contentHash)
  await expect(approveMasterDataImport({ ...command(second), expectedApprovalDigest: first.approval.digest })).rejects.toThrow()
})
it("serializes attachment against a concurrent cleanup claim", async () => {
  const ref = await asset(), id = ref.split("/").pop()!
  const [write, cleanup] = await Promise.allSettled([
    createItem(org, maker, { nameEn: "Race", sku: "race", costPrice: 0, sellingPrice: 0, imageUrls: ref }),
    db.pictureAsset.updateMany({ where: { id, organizationId: org, status: "ready", attachedAt: null }, data: { status: "deleting" } }),
  ])
  expect(cleanup.status).toBe("fulfilled")
  const row = await db.pictureAsset.findUniqueOrThrow({ where: { id } })
  if (write.status === "fulfilled") { expect(row.status).toBe("ready"); expect(row.attachedAt).not.toBeNull(); expect(cleanup).toMatchObject({ value: { count: 0 } }) }
  else { expect(row.status).toBe("deleting"); expect(row.attachedAt).toBeNull(); expect(await db.item.count({ where: { organizationId: org } })).toBe(0) }
  await noOpeningEffects()
})
