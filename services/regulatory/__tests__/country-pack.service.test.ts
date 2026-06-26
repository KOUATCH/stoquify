import { cameroonCountryPack } from "../country-packs/cameroon";
import { computeCountryPackHash } from "../country-packs/hash";
import { resolveRegulatoryParameter } from "../country-packs/resolve";
import {
  RegulatoryPackError,
  validateCountryPackForPublish,
} from "../country-packs/validation";
import { detectRegulatoryHardcodesInText } from "../hardcode-detector";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("regulatory country pack foundation", () => {
  it("validates Cameroon pack provenance, hash, required paths, and golden fixtures", () => {
    const result = validateCountryPackForPublish(cameroonCountryPack);

    expect(result).toMatchObject({ valid: true, canPublish: true });
    expect(result.issues).toEqual([]);
    expect(cameroonCountryPack.header.hash).toBe(
      computeCountryPackHash(cameroonCountryPack),
    );
    expect(cameroonCountryPack.goldenFixtures.length).toBeGreaterThanOrEqual(9);
  });

  it("resolves values by country, entity, date, and pack version with provenance", () => {
    const resolved = resolveRegulatoryParameter<number>(
      "taxes.vat.standardRateBps",
      {
        countryCode: "CM",
        date: "2026-06-11",
        purpose: "POS_SALE_TAX",
        pinnedPackVersion: "CM-2026.1",
        entityProfile: {
          id: "entity-profile-1",
          countryCode: "CM",
          taxRegime: "REAL",
        },
      },
    );

    expect(resolved).toMatchObject({
      value: 1925,
      countryCode: "CM",
      packVersion: "CM-2026.1",
      legalRef: "CM_DGI_CGI_2025",
      capabilityStatus: "SUPPORTED",
      layer: "country",
    });
    expect(resolved.resolutionHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("resolves Cameroon CNPS payroll parameters as regulator-confirmed fixtures", () => {
    const familyAllowance = resolveRegulatoryParameter<Record<string, unknown>>(
      "payroll.cnps.familyAllowanceRatesBps",
      {
        countryCode: "CM",
        date: "2026-06-11",
        purpose: "PAYROLL_CNPS_FAMILY_ALLOWANCE",
        pinnedPackVersion: "CM-2026.1",
      },
    );
    const occupationalRisk = resolveRegulatoryParameter<
      Record<string, unknown>
    >("payroll.cnps.occupationalRiskRatesBps", {
      countryCode: "CM",
      date: "2026-06-11",
      purpose: "PAYROLL_CNPS_OCCUPATIONAL_RISK",
      pinnedPackVersion: "CM-2026.1",
    });
    const employerRules = resolveRegulatoryParameter<Record<string, unknown>>(
      "payroll.cnps.employerRules",
      {
        countryCode: "CM",
        date: "2026-06-11",
        purpose: "PAYROLL_EMPLOYER_RULES",
        pinnedPackVersion: "CM-2026.1",
      },
    );

    expect(familyAllowance).toMatchObject({
      verificationStatus: "REGULATOR_CONFIRMED",
      legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
      value: {
        general: 700,
        agriculture: 565,
        privateEducation: 370,
        paidBy: "EMPLOYER",
      },
    });
    expect(occupationalRisk).toMatchObject({
      verificationStatus: "REGULATOR_CONFIRMED",
      legalRef: "CM_CNPS_CONTRIBUTION_DECREE_2016",
      value: {
        groupA: 175,
        groupB: 250,
        groupC: 500,
        classificationRequired: true,
      },
    });
    expect(employerRules).toMatchObject({
      verificationStatus: "REGULATOR_CONFIRMED",
      legalRef: "CM_CNPS_EMPLOYER_RULES",
      value: { registrationRequired: true, employeeDeclarationRequired: true },
    });
  });

  it("resolves Cameroon e-invoicing readiness metadata as expert-review gated", () => {
    const resolved = resolveRegulatoryParameter<{
      status: string;
      productionAutomationAllowed: boolean;
      requiresPostedLedgerSource: boolean;
      requiresOfficialTechnicalSpec: boolean;
    }>("compliance.eInvoicing.capability", {
      countryCode: "CM",
      date: "2026-06-11",
      purpose: "COMPLIANCE_CENTER_READINESS",
      pinnedPackVersion: "CM-2026.1",
    });

    expect(resolved).toMatchObject({
      countryCode: "CM",
      packVersion: "CM-2026.1",
      legalRef: "CM_DGI_EINVOICING_REVIEW_REQUIRED",
      verificationStatus: "REQUIRES_EXPERT_REVIEW",
      capabilityStatus: "REQUIRES_EXPERT_REVIEW",
    });
    expect(resolved.value).toMatchObject({
      status: "REQUIRES_EXPERT_REVIEW",
      productionAutomationAllowed: false,
      requiresPostedLedgerSource: true,
      requiresOfficialTechnicalSpec: true,
    });

    const certificationPolicy = resolveRegulatoryParameter<
      Record<string, unknown>
    >("compliance.eInvoicing.certificationPolicy", {
      countryCode: "CM",
      date: "2026-06-11",
      purpose: "COMPLIANCE_CENTER_CERTIFICATION_GATE",
      pinnedPackVersion: "CM-2026.1",
    });

    expect(certificationPolicy.value).toMatchObject({
      certificationTiming: "REQUIRES_EXPERT_REVIEW",
      legalDeliveryWhenUncertified: "BLOCK",
      authorityCallInsideSaleTransactionAllowed: false,
    });
  });

  it("blocks missing parameters with typed client-safe errors", () => {
    expect(() =>
      resolveRegulatoryParameter("taxes.vat.unknownRate", {
        countryCode: "CM",
        date: "2026-06-11",
      }),
    ).toThrow(RegulatoryPackError);

    try {
      resolveRegulatoryParameter("taxes.vat.unknownRate", {
        countryCode: "CM",
        date: "2026-06-11",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(RegulatoryPackError);
      expect((error as RegulatoryPackError).regulatoryCode).toBe(
        "PARAMETER_NOT_FOUND",
      );
    }
  });

  it("rejects expert-review placeholders if the matching capability claims support", () => {
    const defective = clone(cameroonCountryPack);
    defective.header.capabilityMatrix["compliance.eInvoicing"] = "SUPPORTED";
    defective.header.hash = computeCountryPackHash(defective);

    const result = validateCountryPackForPublish(defective);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "EXPERT_REVIEW_REQUIRED",
          path: "compliance.eInvoicing.capability[0].verificationStatus",
        }),
      ]),
    );
  });

  it("rejects defective packs with missing legal citations", () => {
    const defective = clone(cameroonCountryPack);
    const vatRate = (
      (
        (defective.parameters.taxes as Record<string, unknown>).vat as Record<
          string,
          unknown
        >
      ).standardRateBps as Array<Record<string, unknown>>
    )[0];
    vatRate.legalRef = "MISSING_LEGAL_REF";
    defective.header.hash = computeCountryPackHash(defective);

    const result = validateCountryPackForPublish(defective);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "LEGAL_CITATION_MISSING",
          path: "taxes.vat.standardRateBps[0].legalRef",
        }),
      ]),
    );
  });

  it("rejects defective packs with overlapping effective windows", () => {
    const defective = clone(cameroonCountryPack);
    const vatRates = (
      (defective.parameters.taxes as Record<string, unknown>).vat as Record<
        string,
        unknown
      >
    ).standardRateBps as Array<Record<string, unknown>>;
    vatRates.push({
      ...vatRates[0],
      value: 2000,
      effectiveFrom: "2026-06-01",
    });
    defective.header.hash = computeCountryPackHash(defective);

    const result = validateCountryPackForPublish(defective);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "EFFECTIVE_WINDOW_OVERLAP",
          path: "taxes.vat.standardRateBps",
        }),
      ]),
    );
  });

  it("detects production regulatory hardcodes and points to pack data", () => {
    const findings = detectRegulatoryHardcodesInText(
      "services/tax-rate/example.ts",
      `
      const standardVatRate = 19.25
      const socialRate = { cnps: 4.2, monthlyCeiling: 750000 }
      const providers = ["MTN_MOMO", "ORANGE_MONEY"]
      `,
    );

    expect(findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining([
        "country-vat-rate-literal",
        "social-contribution-literal",
        "mobile-money-provider-literal",
      ]),
    );
    expect(
      findings.every((finding) =>
        finding.suggestedPackPath.includes("services/regulatory"),
      ),
    ).toBe(true);
  });

  it("does not report country-pack data as hardcoded production logic", () => {
    const findings = detectRegulatoryHardcodesInText(
      "services/regulatory/country-packs/cameroon.ts",
      `const standardRateBps = 1925; const providers = ["MTN_MOMO"]`,
    );

    expect(findings).toEqual([]);
  });

  it("does not report seed and fixture data as production statutory logic", () => {
    expect(
      detectRegulatoryHardcodesInText(
        "prisma/comprehensive-seed.ts",
        "const taxIdentifier = `SEED-NIU-001-XAF`",
      ),
    ).toEqual([]);
    expect(
      detectRegulatoryHardcodesInText(
        "__fixtures__/payroll.ts",
        "const cnps = { employee: 4.2, ceiling: 750000 }",
      ),
    ).toEqual([]);
  });
});
