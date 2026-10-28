import {
  MASTER_DATA_IMPORT_TARGETS,
  analyzeMasterDataCsv,
  buildTenantCsvTemplate,
  defaultFieldMap,
  hashCsvContent,
  type MasterDataImportTarget,
} from "../master-data-csv"

const validRows: Record<MasterDataImportTarget, string> = {
  CUSTOMER: "C-001,Ada Market,ada@example.com,+237600000000,Douala,TAX-1,30,1000,EN,true",
  SUPPLIER: "S-001,Cacao Supply,Mina,mina@example.com,+237611111111,Douala,Douala,Littoral,1000,CM,TAX-2,30,5000,FR,true",
  ITEM: "SKU-001,Cocoa,Noyer,Cocoa item,Article cacao,100,150",
}

describe("governed master-data CSV controls", () => {
  it.each(MASTER_DATA_IMPORT_TARGETS)("builds a tenant-bound %s template and validates one safe row", (target) => {
    const template = buildTenantCsvTemplate("org-a", target)
    expect(template.organizationId).toBe("org-a")
    expect(template.filename).toContain("org-a")
    expect(template.contentHash).toBe(hashCsvContent(template.content))
    expect(template.content).not.toMatch(/balance|quantity|opening|ledger|reset/i)

    const analysis = analyzeMasterDataCsv({
      target,
      content: `${template.content.trimEnd()}\r\n${validRows[target]}\r\n`,
      fieldMap: defaultFieldMap(target),
    })
    expect(analysis).toMatchObject({
      sourceRecordCount: 1,
      validRecordCount: 1,
      errorRecordCount: 0,
      duplicateRecordCount: 0,
    })
    expect(Object.values(analysis.sourceRequiredFieldTotals)).toEqual([1, 1])
  })

  it("blocks duplicate keys both inside the file and against tenant truth", () => {
    const template = buildTenantCsvTemplate("org-a", "CUSTOMER")
    const analysis = analyzeMasterDataCsv({
      target: "CUSTOMER",
      content: `${template.content.trimEnd()}\nC-001,Ada,,,,,30,0,EN,true\nc-001,Other Ada,,,,,30,0,EN,true\nC-EXISTING,Existing,,,,,30,0,EN,true\n`,
      fieldMap: defaultFieldMap("CUSTOMER"),
      existingBusinessKeys: new Set(["c-existing"]),
    })
    expect(analysis.validRecordCount).toBe(0)
    expect(analysis.duplicateRecordCount).toBe(3)
    expect(analysis.issues.filter((issue) => issue.code === "DUPLICATE_IN_FILE")).toHaveLength(2)
    expect(analysis.issues.filter((issue) => issue.code === "DUPLICATE_IN_TENANT")).toHaveLength(1)
  })

  it("returns safe row errors without echoing rejected cell content", () => {
    const secret = "=HYPERLINK(\"https://attacker.invalid\",\"secret-value\")"
    const template = buildTenantCsvTemplate("org-a", "ITEM")
    const analysis = analyzeMasterDataCsv({
      target: "ITEM",
      content: `${template.content.trimEnd()}\nSKU-1,${secret},,,,,\n`,
      fieldMap: defaultFieldMap("ITEM"),
    })
    expect(analysis.issues.some((issue) => issue.code === "CSV_FORMULA_REJECTED")).toBe(true)
    expect(JSON.stringify(analysis.issues)).not.toContain("secret-value")
    expect(JSON.stringify(analysis.issues)).not.toContain("attacker.invalid")
  })

  it("counts required fields even when another field makes the row invalid", () => {
    const template = buildTenantCsvTemplate("org-a", "ITEM")
    const analysis = analyzeMasterDataCsv({
      target: "ITEM",
      content: `${template.content.trimEnd()}\nSKU-1,Valid name,,,,not-a-number,10\n`,
      fieldMap: defaultFieldMap("ITEM"),
    })
    expect(analysis.sourceRequiredFieldTotals).toEqual({ sku: 1, nameEn: 1 })
    expect(analysis.validRecordCount).toBe(0)
  })
})
