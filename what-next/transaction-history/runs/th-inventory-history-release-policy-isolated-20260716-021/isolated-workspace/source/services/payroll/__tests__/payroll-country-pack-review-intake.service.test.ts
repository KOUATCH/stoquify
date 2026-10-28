import { cameroonCountryPack } from "../../regulatory/country-packs/cameroon";
import { computeCountryPackHash } from "../../regulatory/country-packs/hash";
import {
  buildPayrollCountryPackReviewIntakeCertificate,
  type PayrollCountryPackReviewTopicEvidence,
} from "../payroll-country-pack-review-intake.service";

const GENERATED_AT = "2026-07-01T08:00:00.000Z";
const REQUIRED_IRPP_REVIEW_TOPICS = [
  "bracketsAndRates",
  "deductibleEmployeeContributions",
  "familyQuotientOrDependentTreatment",
  "monthlyAndAnnualRegularization",
  "taxableSalaryBase",
  "withholdingRounding",
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function reviewTopicEvidence(
  topics = REQUIRED_IRPP_REVIEW_TOPICS,
): PayrollCountryPackReviewTopicEvidence[] {
  return topics.map((topic) => ({
    topic,
    legalRef: "CM_DGI_CGI_2025",
    sourceEvidenceHash: `sha256:cm-irpp-${topic}-review-evidence`,
    reviewedBy: "Qualified Cameroon payroll tax reviewer",
    reviewedOn: "2026-06-28",
  }));
}

function supportedIrppPack() {
  const supported = clone(cameroonCountryPack);
  const incomeTaxRule = {
    productionCalculationSupported: true,
    calculationMode: "PROGRESSIVE_YTD",
    brackets: [
      { upToAmount: "100000", rateBps: 0 },
      { upToAmount: null, rateBps: 1000 },
    ],
    roundingScale: 2,
    taxableBaseAdjustments: [
      {
        code: "reviewed-social-deduction-cap",
        operation: "SUBTRACT",
        inputKey: "socialDeduction",
        capAmount: "25000",
      },
    ],
    taxAmountAdjustments: [
      {
        code: "reviewed-family-relief-cap",
        operation: "SUBTRACT",
        inputKey: "familyRelief",
        capAmount: "1000",
      },
      {
        code: "reviewed-current-period-correction",
        operation: "ADD",
        inputKey: "currentPeriodCorrection",
      },
    ],
  };
  const baseFixture = {
    countryCode: supported.header.countryCode,
    parameterPath: "payroll.irpp.incomeTaxRules",
    date: "2026-06-11",
    expectedValue: incomeTaxRule,
    expectedLegalRef: "CM_DGI_CGI_2025",
    expectedPackVersion: supported.header.packVersion,
    calculationScenario: {
      input: {
        taxableBaseAmount: "150000.00",
        currency: "XAF",
      },
      expectedOutput: {
        status: "CALCULATED",
        applied: true,
        calculationMode: "PROGRESSIVE_YTD",
        incomeTaxWithholdingAmount: "5000.00",
        taxableBaseAmount: "150000.00",
        adjustedTaxableBaseAmount: "150000.00",
        cumulativeTaxableBaseAmount: "150000.00",
        taxAmountBeforeAdjustments: "5000.00",
        taxAmountAdjustmentAmount: "0.00",
        currency: "XAF",
      },
      reviewStatus: "EXPERT_REVIEWED" as const,
      reviewEvidence: {
        reviewedBy: "Qualified Cameroon payroll tax reviewer",
        reviewedOn: "2026-06-28",
        legalRef: "CM_DGI_CGI_2025",
        sourceEvidenceHash: "sha256:cm-payroll-expert-reviewed-test-fixture",
      },
    },
  };

  supported.header.capabilityMatrix["payroll.irpp"] = "SUPPORTED";

  const payroll = supported.parameters.payroll as Record<string, unknown>;
  const irpp = payroll.irpp as Record<string, unknown>;
  const incomeTaxRules = irpp.incomeTaxRules as Array<Record<string, unknown>>;
  incomeTaxRules[0] = {
    ...incomeTaxRules[0],
    value: incomeTaxRule,
    verifiedBy: "Qualified Cameroon payroll tax reviewer",
    verificationStatus: "EXPERT_REVIEWED",
  };

  supported.goldenFixtures = supported.goldenFixtures.map((fixture) =>
    fixture.parameterPath === "payroll.irpp.incomeTaxRules"
      ? {
          ...fixture,
          expectedValue: incomeTaxRule,
        }
      : fixture,
  );
  supported.goldenFixtures.push(
    {
      ...baseFixture,
      id: "cm-irpp-period-calculation-reviewed-2026",
      purpose: "PAYROLL_IRPP_PERIOD_CALCULATION",
    },
    {
      ...baseFixture,
      id: "cm-irpp-ytd-regularization-reviewed-2026",
      purpose: "PAYROLL_IRPP_YTD_REGULARIZATION",
      calculationScenario: {
        ...baseFixture.calculationScenario,
        input: {
          taxableBaseAmount: "50000.00",
          ytdTaxableBaseAmount: "100000.00",
          ytdTaxWithheldAmount: "1000.00",
          currency: "XAF",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          calculationMode: "PROGRESSIVE_YTD",
          incomeTaxWithholdingAmount: "4000.00",
          taxableBaseAmount: "50000.00",
          cumulativeTaxableBaseAmount: "150000.00",
          taxAmountBeforeAdjustments: "4000.00",
          taxAmountAdjustmentAmount: "0.00",
          currency: "XAF",
        },
      },
    },
    {
      ...baseFixture,
      id: "cm-irpp-period-adjustments-reviewed-2026",
      purpose: "PAYROLL_IRPP_PERIOD_ADJUSTMENTS",
      calculationScenario: {
        ...baseFixture.calculationScenario,
        input: {
          taxableBaseAmount: "200000.00",
          adjustmentValues: {
            socialDeduction: "40000.00",
            familyRelief: "2000.00",
          },
          currency: "XAF",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          calculationMode: "PROGRESSIVE_YTD",
          incomeTaxWithholdingAmount: "6500.00",
          taxableBaseAmount: "200000.00",
          adjustedTaxableBaseAmount: "175000.00",
          cumulativeTaxableBaseAmount: "175000.00",
          taxableBaseAdjustmentAmount: "-25000.00",
          taxAmountBeforeAdjustments: "7500.00",
          taxAmountAdjustmentAmount: "-1000.00",
          currency: "XAF",
        },
      },
    },
    {
      ...baseFixture,
      id: "cm-irpp-ytd-correction-reviewed-2026",
      purpose: "PAYROLL_IRPP_YTD_CORRECTION_REPLAY",
      calculationScenario: {
        ...baseFixture.calculationScenario,
        input: {
          taxableBaseAmount: "50000.00",
          ytdTaxableBaseAmount: "100000.00",
          ytdTaxWithheldAmount: "1000.00",
          adjustmentValues: {
            currentPeriodCorrection: "250.00",
          },
          currency: "XAF",
        },
        expectedOutput: {
          status: "CALCULATED",
          applied: true,
          calculationMode: "PROGRESSIVE_YTD",
          incomeTaxWithholdingAmount: "4250.00",
          taxableBaseAmount: "50000.00",
          adjustedTaxableBaseAmount: "50000.00",
          cumulativeTaxableBaseAmount: "150000.00",
          taxAmountBeforeAdjustments: "4000.00",
          taxAmountAdjustmentAmount: "250.00",
          currency: "XAF",
        },
      },
    },
  );
  supported.header.hash = computeCountryPackHash(supported);

  return supported;
}

describe("buildPayrollCountryPackReviewIntakeCertificate", () => {
  it("certifies a proposed reviewed country pack for legal-owner signoff", () => {
    const certificate = buildPayrollCountryPackReviewIntakeCertificate({
      basePack: cameroonCountryPack,
      proposedPack: supportedIrppPack(),
      targetFamilies: ["IRPP_PERIOD"],
      reviewTopicEvidence: reviewTopicEvidence(),
      generatedAt: GENERATED_AT,
    });

    expect(certificate).toMatchObject({
      status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
      countryCode: "CM",
      proposedPackHashMatches: true,
      publishValidation: {
        valid: true,
        canPublish: true,
        issueCount: 0,
      },
      blockers: [],
      redaction: {
        rawLegalDocumentsIncluded: false,
        rawFormulaSourceDocumentsIncluded: false,
        rawEmployeeDataIncluded: false,
        rawSalaryDataIncluded: false,
      },
    });
    expect(certificate.certificateHash).toMatch(/^sha256:/);
    expect(certificate.targetFamilies).toHaveLength(1);
    const targetFamily = certificate.targetFamilies[0];
    expect(targetFamily).toMatchObject({
      family: "IRPP_PERIOD",
      status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
      proposedCoverageStatus: "READY",
      proposedCapabilityStatus: "SUPPORTED",
      executableScenarioCount: 1,
      passedScenarioCount: 1,
      failedScenarioCount: 0,
      baseRequiredReviewTopics: REQUIRED_IRPP_REVIEW_TOPICS,
      coveredReviewTopics: REQUIRED_IRPP_REVIEW_TOPICS,
      missingReviewTopics: [],
      invalidReviewTopics: [],
    });
    expect(targetFamily.reviewEvidenceSourceHashes).toHaveLength(
      REQUIRED_IRPP_REVIEW_TOPICS.length,
    );
    expect(targetFamily.fixtureEvidenceHashes).toHaveLength(1);
    expect(targetFamily.fixtureEvidence).toHaveLength(1);
    expect(targetFamily.fixtureEvidence[0]).toMatchObject({
      fixtureId: "cm-irpp-period-calculation-reviewed-2026",
      parameterPath: "payroll.irpp.incomeTaxRules",
      purpose: "PAYROLL_IRPP_PERIOD_CALCULATION",
      fixtureDate: "2026-06-11",
      expectedPackVersion: "CM-2026.1",
      expectedLegalRef: "CM_DGI_CGI_2025",
      reviewStatus: "EXPERT_REVIEWED",
      reviewedBy: "Qualified Cameroon payroll tax reviewer",
      reviewedOn: "2026-06-28",
      legalRef: "CM_DGI_CGI_2025",
      sourceEvidenceHash: "sha256:cm-payroll-expert-reviewed-test-fixture",
      proposedPackHash: certificate.proposedPackHash,
      computedProposedPackHash: certificate.computedProposedPackHash,
    });
    expect(targetFamily.fixtureEvidence[0].expectedOutputHash).toMatch(/^sha256:/);
    expect(targetFamily.fixtureEvidence[0].actualOutputHash).toMatch(/^sha256:/);
    expect(targetFamily.fixtureEvidence[0].evidenceHash).toMatch(/^sha256:/);
  });

  it("blocks when a required legal review topic is missing evidence", () => {
    const certificate = buildPayrollCountryPackReviewIntakeCertificate({
      basePack: cameroonCountryPack,
      proposedPack: supportedIrppPack(),
      targetFamilies: ["IRPP_PERIOD"],
      reviewTopicEvidence: reviewTopicEvidence(
        REQUIRED_IRPP_REVIEW_TOPICS.filter(
          (topic) => topic !== "taxableSalaryBase",
        ),
      ),
      generatedAt: GENERATED_AT,
    });

    expect(certificate.status).toBe("BLOCKED");
    expect(certificate.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PAYROLL_COUNTRY_PACK_REVIEW_TOPIC_EVIDENCE_MISSING",
          family: "IRPP_PERIOD",
          evidence: {
            missingReviewTopics: ["taxableSalaryBase"],
          },
        }),
      ]),
    );
    expect(certificate.targetFamilies[0]).toMatchObject({
      family: "IRPP_PERIOD",
      status: "BLOCKED",
      missingReviewTopics: ["taxableSalaryBase"],
    });
  });

  it("blocks stale proposed country-pack hashes before legal-owner signoff", () => {
    const proposedPack = supportedIrppPack();
    proposedPack.header.hash = "sha256:stale-proposed-payroll-pack";

    const certificate = buildPayrollCountryPackReviewIntakeCertificate({
      basePack: cameroonCountryPack,
      proposedPack,
      targetFamilies: ["IRPP_PERIOD"],
      reviewTopicEvidence: reviewTopicEvidence(),
      generatedAt: GENERATED_AT,
    });

    expect(certificate.status).toBe("BLOCKED");
    expect(certificate.proposedPackHashMatches).toBe(false);
    expect(certificate.publishValidation.issueCodes).toContain("HASH_MISMATCH");
    expect(certificate.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PAYROLL_COUNTRY_PACK_PROPOSED_HASH_MISMATCH",
          family: null,
        }),
        expect.objectContaining({
          code: "PAYROLL_COUNTRY_PACK_PROPOSED_VALIDATION_FAILED",
          family: null,
        }),
      ]),
    );
  });
});
