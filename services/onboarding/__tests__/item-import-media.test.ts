import { analyzeMasterDataCsv, buildTenantCsvTemplate, defaultFieldMap, parseMasterDataDomainRow } from "../master-data-csv"

const reference = "/api/media/11111111-1111-4111-8111-111111111111"
function analyze(image: string, availableItemMedia = new Set([reference])) {
  return analyzeMasterDataCsv({ target: "ITEM", fieldMap: defaultFieldMap("ITEM"), availableItemMedia,
    content: buildTenantCsvTemplate("org", "ITEM").content + `SKU,Item,,,,0,0,${image}\n` })
}
it("carries exactly one managed reference in version 2, without stock fields", () => {
  expect(buildTenantCsvTemplate("org", "ITEM").schemaVersion).toBe("2")
  expect(buildTenantCsvTemplate("org", "CUSTOMER").schemaVersion).toBe("1")
  const result = analyze(reference)
  expect(result.validRecordCount).toBe(1)
  expect(result.rows[0].normalizedData.imageUrls).toBe(reference)
  expect(result.rows[0].normalizedData).not.toHaveProperty("initialQuantity")
})
it.each(["", "https://example.com/image.png", "/uploads/legacy.png", "data:image/png;base64,aaa"])("rejects missing/unmanaged reference %s", value => {
  expect(analyze(value).validRecordCount).toBe(0)
  expect(parseMasterDataDomainRow("ITEM", { nameEn: "Item", sku: "SKU", imageUrls: value }).success).toBe(false)
})
it("blocks unavailable media without disclosing another tenant or reference", () => {
  const result = analyze(reference, new Set())
  expect(result.validRecordCount).toBe(0)
  expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "ITEM_MEDIA_UNAVAILABLE" })]))
  expect(JSON.stringify(result.issues)).not.toContain(reference)
})
it("binds a different image to different source row and content hashes", () => {
  const other = reference.replaceAll("1", "2")
  expect(analyze(reference).rows[0].sourceRowHash).not.toBe(analyze(other, new Set([other])).rows[0].sourceRowHash)
})
