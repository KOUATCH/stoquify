const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "../..")
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8")

describe("realistic seed blocker remediation contract", () => {
  const comprehensiveSeed = read("prisma/comprehensive-seed.ts")
  const realisticSeed = read("prisma/realistic-development-seed.ts")
  const roleSeed = read("prisma/compliance-hris-role-seed.ts")
  const readOnlyVerifier = read("scripts/verify-realistic-development-seed-readonly.ts")
  const packageJson = JSON.parse(read("package.json"))

  test("allows only explicitly disposable local replay targets", () => {
    expect(realisticSeed).toContain("referral|replay|disposable")
    expect(realisticSeed).toContain("LOCAL_HOSTS")
  })

  test("seeds at least twenty curated products and enforces twenty per location", () => {
    const productCatalog = comprehensiveSeed
      .split("const PRODUCT_DEFINITIONS = [")[1]
      .split("] as const;")[0]
    expect([...productCatalog.matchAll(/nameEn:/g)]).toHaveLength(20)
    expect(comprehensiveSeed).toContain("minimumPosReadyItemCount < 20")
    expect(comprehensiveSeed).toContain("minimumPosReadyItems=${minimumPosReadyItemCount}/20")
  })

  test("seeds finance state, period, currency and reversal coverage", () => {
    expect(comprehensiveSeed).toContain("seedAccountingScenarioCoverage")
    for (const marker of [
      "JournalEntryStatus.DRAFT",
      "JournalEntryStatus.REVERSED",
      "JournalEntryStatus.VOIDED",
      'currency: "USD"',
      'currency: "EUR"',
      "AccountingPeriodStatus.CLOSED",
      "ChartAccountType.EQUITY",
      'mappingKey: "PROFESSIONAL_SERVICES"',
      "reversalOfEntryId",
      "customerReceivableDocument.createMany",
      "CustomerReceivableDocumentStatus.PARTIALLY_PAID",
    ]) {
      expect(comprehensiveSeed).toContain(marker)
    }
  })

  test("defines an exact external-accountant allow-list and mutation deny-list", () => {
    expect(roleSeed).toContain('code: "external_accountant"')
    expect(roleSeed).toContain("explicitPermissions")
    expect(roleSeed).toContain("PERMISSIONS.FINANCIAL_REPORTS_EXPORT")
    for (const forbidden of [
      "CREATE_JOURNAL_ENTRIES",
      "APPROVE_JOURNAL_ENTRIES",
      "POST_JOURNAL_ENTRIES",
      "REVERSE_JOURNAL_ENTRIES",
      "CLOSE_FINANCIAL_PERIODS",
    ]) {
      expect(readOnlyVerifier).toContain(`PERMISSIONS.${forbidden}`)
    }
  })

  test("keeps read-only verification separate from write-capable business-flow smoke", () => {
    expect(packageJson.scripts["seed:verify:realistic"]).toContain(
      "verify-realistic-development-seed-readonly.ts",
    )
    expect(packageJson.scripts["seed:smoke:realistic"]).toContain(
      "verify-realistic-development-seed.ts",
    )
    expect(readOnlyVerifier).toContain('SET TRANSACTION READ ONLY')
    expect(readOnlyVerifier).not.toContain("commitPOSSale")
    expect(readOnlyVerifier).not.toContain("openPOSShift")
  })
})
