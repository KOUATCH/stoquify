import { cameroonCountryPack } from "../country-packs/cameroon"
import { computeCountryPackHash } from "../country-packs/hash"
import { resolveRegulatoryParameter } from "../country-packs/resolve"
import {
  RegulatoryPackError,
  validateCountryPackForPublish,
} from "../country-packs/validation"
import { detectRegulatoryHardcodesInText } from "../hardcode-detector"

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

describe("regulatory country pack foundation", () => {
  it("validates Cameroon pack provenance, hash, required paths, and golden fixtures", () => {
    const result = validateCountryPackForPublish(cameroonCountryPack)

    expect(result).toMatchObject({ valid: true, canPublish: true })
    expect(result.issues).toEqual([])
    expect(cameroonCountryPack.header.hash).toBe(computeCountryPackHash(cameroonCountryPack))
    expect(cameroonCountryPack.goldenFixtures.length).toBeGreaterThanOrEqual(4)
  })

  it("resolves values by country, entity, date, and pack version with provenance", () => {
    const resolved = resolveRegulatoryParameter<number>("taxes.vat.standardRateBps", {
      countryCode: "CM",
      date: "2026-06-11",
      purpose: "POS_SALE_TAX",
      pinnedPackVersion: "CM-2026.1",
      entityProfile: {
        id: "entity-profile-1",
        countryCode: "CM",
        taxRegime: "REAL",
      },
    })

    expect(resolved).toMatchObject({
      value: 1925,
      countryCode: "CM",
      packVersion: "CM-2026.1",
      legalRef: "CM_DGI_CGI_2025",
      capabilityStatus: "SUPPORTED",
      layer: "country",
    })
    expect(resolved.resolutionHash).toMatch(/^sha256:[a-f0-9]{64}$/)
  })

  it("blocks missing parameters with typed client-safe errors", () => {
    expect(() =>
      resolveRegulatoryParameter("taxes.vat.unknownRate", {
        countryCode: "CM",
        date: "2026-06-11",
      }),
    ).toThrow(RegulatoryPackError)

    try {
      resolveRegulatoryParameter("taxes.vat.unknownRate", {
        countryCode: "CM",
        date: "2026-06-11",
      })
    } catch (error) {
      expect(error).toBeInstanceOf(RegulatoryPackError)
      expect((error as RegulatoryPackError).regulatoryCode).toBe("PARAMETER_NOT_FOUND")
    }
  })

  it("rejects defective packs with missing legal citations", () => {
    const defective = clone(cameroonCountryPack)
    const vatRate = (((defective.parameters.taxes as Record<string, unknown>).vat as Record<string, unknown>)
      .standardRateBps as Array<Record<string, unknown>>)[0]
    vatRate.legalRef = "MISSING_LEGAL_REF"
    defective.header.hash = computeCountryPackHash(defective)

    const result = validateCountryPackForPublish(defective)

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "LEGAL_CITATION_MISSING",
          path: "taxes.vat.standardRateBps[0].legalRef",
        }),
      ]),
    )
  })

  it("rejects defective packs with overlapping effective windows", () => {
    const defective = clone(cameroonCountryPack)
    const vatRates = ((defective.parameters.taxes as Record<string, unknown>).vat as Record<string, unknown>)
      .standardRateBps as Array<Record<string, unknown>>
    vatRates.push({
      ...vatRates[0],
      value: 2000,
      effectiveFrom: "2026-06-01",
    })
    defective.header.hash = computeCountryPackHash(defective)

    const result = validateCountryPackForPublish(defective)

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "EFFECTIVE_WINDOW_OVERLAP",
          path: "taxes.vat.standardRateBps",
        }),
      ]),
    )
  })

  it("detects production regulatory hardcodes and points to pack data", () => {
    const findings = detectRegulatoryHardcodesInText(
      "services/tax-rate/example.ts",
      `
      const standardVatRate = 19.25
      const socialRate = { cnps: 4.2, monthlyCeiling: 750000 }
      const providers = ["MTN_MOMO", "ORANGE_MONEY"]
      `,
    )

    expect(findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining([
        "country-vat-rate-literal",
        "social-contribution-literal",
        "mobile-money-provider-literal",
      ]),
    )
    expect(findings.every((finding) => finding.suggestedPackPath.includes("services/regulatory"))).toBe(true)
  })

  it("does not report country-pack data as hardcoded production logic", () => {
    const findings = detectRegulatoryHardcodesInText(
      "services/regulatory/country-packs/cameroon.ts",
      `const standardRateBps = 1925; const providers = ["MTN_MOMO"]`,
    )

    expect(findings).toEqual([])
  })
})
