import { cameroonCountryPack } from "../../regulatory/country-packs/cameroon";
import { validatePayrollCountryPackCalculationFixtures } from "../payroll-country-pack-fixture-runner";
import {
  buildPayrollStatutoryScenarioCoverageSummary,
  payrollStatutoryScenarioCoverageProofPayload,
  type PayrollStatutoryScenarioFamily,
} from "../payroll-statutory-scenario-coverage.service";

const REQUIRED_IRPP_REVIEW_TOPICS = [
  "bracketsAndRates",
  "deductibleEmployeeContributions",
  "familyQuotientOrDependentTreatment",
  "monthlyAndAnnualRegularization",
  "taxableSalaryBase",
  "withholdingRounding",
];
const REQUIRED_CNPS_PENSION_REVIEW_TOPICS = [
  "employeeEmployerPensionSplit",
  "pensionContributionCeiling",
  "pensionContributionRates",
];
const REQUIRED_CNPS_FAMILY_ALLOWANCE_REVIEW_TOPICS = [
  "familyAllowanceEmployerLiability",
  "familyAllowanceSectorClassification",
  "familyAllowanceSectorRates",
];
const REQUIRED_CNPS_OCCUPATIONAL_RISK_REVIEW_TOPICS = [
  "occupationalRiskEmployerLiability",
  "occupationalRiskGroupClassification",
  "occupationalRiskGroupRates",
];
const REQUIRED_ACTIVE_REVIEW_TOPICS = [
  ...REQUIRED_IRPP_REVIEW_TOPICS,
  ...REQUIRED_CNPS_PENSION_REVIEW_TOPICS,
  ...REQUIRED_CNPS_FAMILY_ALLOWANCE_REVIEW_TOPICS,
  ...REQUIRED_CNPS_OCCUPATIONAL_RISK_REVIEW_TOPICS,
].sort();
const IRPP_YTD_LIFECYCLE_PROOF_FIELDS = [
  "yearToDatePolicyHash",
  "yearToDateAccumulatorHash",
  "registerProofHash",
  "payslipProofHash",
];
const IRPP_CORRECTION_LIFECYCLE_PROOF_FIELDS = [
  "yearToDatePolicyHash",
  "yearToDateAccumulatorHash",
  "originalRunDocumentHash",
  "originalRunEvidenceHash",
  "originalCalculationHash",
  "correctionBasisHash",
  "correctionEvidenceHash",
  "registerProofHash",
  "payslipProofHash",
  "ledgerPostingProofHash",
  "declarationProofHash",
  "paymentProofHash",
];
const ALL_LIFECYCLE_PROOF_FIELDS = Array.from(
  new Set([
    ...IRPP_YTD_LIFECYCLE_PROOF_FIELDS,
    ...IRPP_CORRECTION_LIFECYCLE_PROOF_FIELDS,
  ]),
).sort();
const REQUIRED_LIFECYCLE_PROOF_FIELD_COUNT =
  IRPP_YTD_LIFECYCLE_PROOF_FIELDS.length +
  IRPP_CORRECTION_LIFECYCLE_PROOF_FIELDS.length;

function lifecycleProofOutputFor(fixtureId: string, purpose: string) {
  const fields = purpose.includes("PAYROLL_IRPP_YTD_CORRECTION_REPLAY")
    ? IRPP_CORRECTION_LIFECYCLE_PROOF_FIELDS
    : purpose.includes("PAYROLL_IRPP_YTD_REGULARIZATION")
      ? IRPP_YTD_LIFECYCLE_PROOF_FIELDS
      : [];

  return Object.fromEntries(
    fields.map((field) => [field, `sha256:${fixtureId}-${field}`]),
  );
}

function fullCoverageRun(
  fixtureId: string,
  parameterPath: string,
  purpose: string,
  reviewStatus = "EXPERT_REVIEWED",
  coveredReviewTopics: string[] = [],
) {
  const regulatorConfirmed = reviewStatus === "REGULATOR_CONFIRMED";
  const lifecycleProofOutput = lifecycleProofOutputFor(fixtureId, purpose);

  return {
    fixtureId,
    parameterPath,
    purpose,
    status: "PASSED" as const,
    reviewStatus,
    reviewEvidence: {
      reviewedBy: regulatorConfirmed
        ? "Cameroon regulator review desk"
        : "Qualified Cameroon payroll tax reviewer",
      reviewedOn: regulatorConfirmed ? "2026-06-27" : "2026-06-28",
      legalRef: regulatorConfirmed
        ? "CM_CNPS_CONTRIBUTION_DECREE_2016"
        : "CM_DGI_CGI_2025",
      sourceEvidenceHash: `sha256:${fixtureId}-review-evidence`,
      coveredReviewTopics,
    },
    expectedOutput: { status: "CALCULATED", ...lifecycleProofOutput },
    actualOutput: { status: "CALCULATED", ...lifecycleProofOutput },
  };
}

function fullCoverageValidation() {
  return {
    valid: true,
    issues: [],
    runs: [
      fullCoverageRun(
        "cm-cnps-pension-reviewed",
        "payroll.cnps.pensionRatesBps",
        "PAYROLL",
        "REGULATOR_CONFIRMED",
        REQUIRED_CNPS_PENSION_REVIEW_TOPICS,
      ),
      fullCoverageRun(
        "cm-cnps-family-reviewed",
        "payroll.cnps.familyAllowanceRatesBps",
        "PAYROLL_CNPS_FAMILY_ALLOWANCE",
        "REGULATOR_CONFIRMED",
        REQUIRED_CNPS_FAMILY_ALLOWANCE_REVIEW_TOPICS,
      ),
      fullCoverageRun(
        "cm-cnps-risk-reviewed",
        "payroll.cnps.occupationalRiskRatesBps",
        "PAYROLL_CNPS_OCCUPATIONAL_RISK",
        "REGULATOR_CONFIRMED",
        REQUIRED_CNPS_OCCUPATIONAL_RISK_REVIEW_TOPICS,
      ),
      fullCoverageRun(
        "cm-irpp-period-reviewed",
        "payroll.irpp.incomeTaxRules",
        "PAYROLL_IRPP_PERIOD_CALCULATION",
        "EXPERT_REVIEWED",
        REQUIRED_IRPP_REVIEW_TOPICS,
      ),
      fullCoverageRun(
        "cm-irpp-ytd-reviewed",
        "payroll.irpp.incomeTaxRules",
        "PAYROLL_IRPP_YTD_REGULARIZATION",
        "EXPERT_REVIEWED",
        REQUIRED_IRPP_REVIEW_TOPICS,
      ),
      fullCoverageRun(
        "cm-irpp-adjustments-reviewed",
        "payroll.irpp.incomeTaxRules",
        "PAYROLL_IRPP_PERIOD_ADJUSTMENTS",
        "EXPERT_REVIEWED",
        REQUIRED_IRPP_REVIEW_TOPICS,
      ),
      fullCoverageRun(
        "cm-irpp-corrections-reviewed",
        "payroll.irpp.incomeTaxRules",
        "PAYROLL_IRPP_YTD_CORRECTION_REPLAY",
        "EXPERT_REVIEWED",
        REQUIRED_IRPP_REVIEW_TOPICS,
      ),
      fullCoverageRun(
        "cm-allowances-reviewed",
        "payroll.compensation.allowances",
        "PAYROLL_ALLOWANCE_TAXABLE",
      ),
      fullCoverageRun(
        "cm-benefits-reviewed",
        "payroll.compensation.benefits",
        "PAYROLL_BENEFIT_IN_KIND",
      ),
      fullCoverageRun(
        "cm-deduction-recovery-reviewed",
        "payroll.compensation.deductions",
        "PAYROLL_DEDUCTION_RECOVERY",
      ),
      fullCoverageRun(
        "cm-leave-paid-reviewed",
        "payroll.attendance.leave",
        "PAYROLL_LEAVE_PAID",
      ),
      fullCoverageRun(
        "cm-leave-unpaid-reviewed",
        "payroll.attendance.leave",
        "PAYROLL_LEAVE_UNPAID",
      ),
      fullCoverageRun(
        "cm-overtime-reviewed",
        "payroll.attendance.overtime",
        "PAYROLL_OVERTIME_PREMIUM",
      ),
      fullCoverageRun(
        "cm-composite-register-tieout-reviewed",
        "payroll.composite.registerTieOut",
        "PAYROLL_COMPOSITE_REGISTER_TIE_OUT",
      ),
    ],
  };
}

function supportedIrppPack() {
  return {
    ...cameroonCountryPack,
    header: {
      ...cameroonCountryPack.header,
      capabilityMatrix: {
        ...cameroonCountryPack.header.capabilityMatrix,
        // This synthetic fully reviewed pack is distinct from the active draft pack.
        "payroll.cnps": "SUPPORTED" as const,
        "payroll.irpp": "SUPPORTED" as const,
        "payroll.compensation": "SUPPORTED" as const,
        "payroll.attendance": "SUPPORTED" as const,
        "payroll.composite.registerTieOut": "SUPPORTED" as const,
      },
    },
  };
}

function certifiedIrppPack() {
  return {
    ...supportedIrppPack(),
    header: {
      ...supportedIrppPack().header,
      capabilityMatrix: {
        ...supportedIrppPack().header.capabilityMatrix,
        "payroll.irpp": "SUPPORTED_CERTIFIED" as const,
      },
    },
  };
}

function family(
  summary: ReturnType<typeof buildPayrollStatutoryScenarioCoverageSummary>,
  name: PayrollStatutoryScenarioFamily,
) {
  const item = summary.families.find((entry) => entry.family === name);
  if (!item) throw new Error(`Missing scenario family ${name}`);
  return item;
}

describe("payroll statutory scenario coverage service", () => {
  it("sorts covered review topics in statutory proof payloads", () => {
    const payload = payrollStatutoryScenarioCoverageProofPayload({
      status: "READY",
      countryCode: "CM",
      packVersion: "CM-2026.1",
      executableScenarioCount: 1,
      readyFamilyCount: 1,
      requiredFamilyCount: 1,
      blockerCodes: [],
      reviewEvidence: {
        presentCount: 1,
        missingCount: 0,
        reviewedBy: ["Reviewer B", "Reviewer A"],
        reviewedOn: ["2026-06-28", "2026-06-27"],
        legalRefs: ["LEGAL_B", "LEGAL_A"],
        sourceEvidenceHashes: ["sha256:z", "sha256:a"],
        coveredReviewTopics: ["zTopic", "aTopic"],
      },
      requiredLifecycleProofFields: ["zProofHash", "aProofHash"],
      coveredLifecycleProofFields: ["zProofHash", "aProofHash"],
      missingLifecycleProofFields: ["zMissingProofHash", "aMissingProofHash"],
    });

    expect(payload.reviewEvidence.coveredReviewTopics).toEqual([
      "aTopic",
      "zTopic",
    ]);
    expect(payload.requiredLifecycleProofFields).toEqual([
      "aProofHash",
      "zProofHash",
    ]);
    expect(payload.missingLifecycleProofFields).toEqual([
      "aMissingProofHash",
      "zMissingProofHash",
    ]);
  });

  it("keeps the active Cameroon pack blocked for production even when CNPS fixtures execute", () => {
    const validation =
      validatePayrollCountryPackCalculationFixtures(cameroonCountryPack);

    const summary = buildPayrollStatutoryScenarioCoverageSummary(
      cameroonCountryPack,
      validation,
    );

    expect(summary.status).toBe("BLOCKED");
    expect(summary.readyFamilyCount).toBe(0);
    expect(summary.requiredFamilyCount).toBe(11);
    expect(summary.requiredReviewTopicCount).toBe(
      REQUIRED_ACTIVE_REVIEW_TOPICS.length,
    );
    expect(summary.requiredReviewTopics).toEqual(REQUIRED_ACTIVE_REVIEW_TOPICS);
    expect(summary.coveredReviewTopics).toEqual(
      REQUIRED_ACTIVE_REVIEW_TOPICS.filter(
        (topic) => !REQUIRED_IRPP_REVIEW_TOPICS.includes(topic),
      ),
    );
    expect(summary.missingReviewTopics).toEqual(REQUIRED_IRPP_REVIEW_TOPICS);
    expect(family(summary, "CNPS_PENSION")).toMatchObject({
      status: "BLOCKED",
      capabilityStatus: "SUPPORTED_DRAFT",
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_CAPABILITY_NOT_PRODUCTION_READY",
      passedScenarioCount: 1,
      coveredReviewTopics: REQUIRED_CNPS_PENSION_REVIEW_TOPICS,
      missingReviewTopics: [],
    });
    expect(family(summary, "CNPS_FAMILY_ALLOWANCE")).toMatchObject({
      status: "BLOCKED",
      capabilityStatus: "SUPPORTED_DRAFT",
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_CAPABILITY_NOT_PRODUCTION_READY",
      passedScenarioCount: 3,
      coveredReviewTopics: REQUIRED_CNPS_FAMILY_ALLOWANCE_REVIEW_TOPICS,
      missingReviewTopics: [],
    });
    expect(family(summary, "CNPS_OCCUPATIONAL_RISK")).toMatchObject({
      status: "BLOCKED",
      capabilityStatus: "SUPPORTED_DRAFT",
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_CAPABILITY_NOT_PRODUCTION_READY",
      passedScenarioCount: 3,
      coveredReviewTopics: REQUIRED_CNPS_OCCUPATIONAL_RISK_REVIEW_TOPICS,
      missingReviewTopics: [],
    });
    expect(family(summary, "IRPP_PERIOD")).toMatchObject({
      status: "BLOCKED",
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_CAPABILITY_NOT_PRODUCTION_READY",
      capabilityStatus: "REQUIRES_EXPERT_REVIEW",
      requiredReviewTopics: expect.arrayContaining([
        "taxableSalaryBase",
        "bracketsAndRates",
        "monthlyAndAnnualRegularization",
      ]),
      missingReviewTopics: expect.arrayContaining([
        "taxableSalaryBase",
        "withholdingRounding",
      ]),
    });
    expect(summary.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          family: "IRPP_PERIOD",
          evidence: expect.objectContaining({
            requiredReviewTopics: expect.arrayContaining([
              "taxableSalaryBase",
              "withholdingRounding",
            ]),
          }),
        }),
      ]),
    );
    expect(family(summary, "ALLOWANCES_BENEFITS")).toMatchObject({
      status: "BLOCKED",
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_FAMILY_MISSING",
    });
    expect(family(summary, "DEDUCTIONS_RECOVERIES")).toMatchObject({
      status: "BLOCKED",
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_FAMILY_MISSING",
    });
    expect(family(summary, "LEAVE_OVERTIME")).toMatchObject({
      status: "BLOCKED",
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_FAMILY_MISSING",
    });
    expect(family(summary, "COMPOSITE_REGISTER_TIE_OUT")).toMatchObject({
      status: "BLOCKED",
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_FAMILY_MISSING",
    });
  });

  it("marks full-production statutory coverage ready when every required family has passed executable evidence", () => {
    const summary = buildPayrollStatutoryScenarioCoverageSummary(
      supportedIrppPack(),
      fullCoverageValidation(),
    );

    expect(summary).toMatchObject({
      status: "READY",
      executableScenarioCount: 14,
      passedScenarioCount: 14,
      failedScenarioCount: 0,
      readyFamilyCount: 11,
      requiredFamilyCount: 11,
      blockers: [],
      reviewStatuses: ["REGULATOR_CONFIRMED", "EXPERT_REVIEWED"],
      expertReviewedScenarioCount: 11,
      regulatorConfirmedScenarioCount: 3,
      coveredReviewTopicCount: REQUIRED_ACTIVE_REVIEW_TOPICS.length,
      coveredReviewTopics: REQUIRED_ACTIVE_REVIEW_TOPICS,
      missingReviewTopicCount: 0,
      missingReviewTopics: [],
      requiredLifecycleProofFieldCount: REQUIRED_LIFECYCLE_PROOF_FIELD_COUNT,
      requiredLifecycleProofFields: ALL_LIFECYCLE_PROOF_FIELDS,
      coveredLifecycleProofFieldCount: REQUIRED_LIFECYCLE_PROOF_FIELD_COUNT,
      coveredLifecycleProofFields: ALL_LIFECYCLE_PROOF_FIELDS,
      missingLifecycleProofFieldCount: 0,
      missingLifecycleProofFields: [],
      reviewEvidence: expect.objectContaining({
        presentCount: 14,
        missingCount: 0,
        coveredReviewTopics: REQUIRED_ACTIVE_REVIEW_TOPICS,
        sourceEvidenceHashes: expect.arrayContaining([
          "sha256:cm-cnps-pension-reviewed-review-evidence",
          "sha256:cm-irpp-period-reviewed-review-evidence",
          "sha256:cm-composite-register-tieout-reviewed-review-evidence",
        ]),
      }),
      certificationStatus: "MIXED_REVIEW",
    });
    expect(family(summary, "CNPS_PENSION")).toMatchObject({
      reviewStatuses: ["REGULATOR_CONFIRMED"],
      regulatorConfirmedScenarioCount: 1,
      coveredReviewTopics: REQUIRED_CNPS_PENSION_REVIEW_TOPICS,
      missingReviewTopics: [],
      reviewEvidence: expect.objectContaining({
        presentCount: 1,
        missingCount: 0,
        legalRefs: ["CM_CNPS_CONTRIBUTION_DECREE_2016"],
        coveredReviewTopics: REQUIRED_CNPS_PENSION_REVIEW_TOPICS,
      }),
      certificationStatus: "REGULATOR_CONFIRMED",
    });
    expect(family(summary, "IRPP_PERIOD")).toMatchObject({
      reviewStatuses: ["EXPERT_REVIEWED"],
      expertReviewedScenarioCount: 1,
      certificationStatus: "EXPERT_REVIEWED",
    });
    expect(family(summary, "IRPP_YTD")).toMatchObject({
      status: "READY",
      requiredLifecycleProofFields: IRPP_YTD_LIFECYCLE_PROOF_FIELDS,
      coveredLifecycleProofFields: IRPP_YTD_LIFECYCLE_PROOF_FIELDS,
      missingLifecycleProofFields: [],
    });
    expect(family(summary, "IRPP_CORRECTIONS")).toMatchObject({
      status: "READY",
      requiredLifecycleProofFields: IRPP_CORRECTION_LIFECYCLE_PROOF_FIELDS,
      coveredLifecycleProofFields: IRPP_CORRECTION_LIFECYCLE_PROOF_FIELDS,
      missingLifecycleProofFields: [],
    });
    expect(family(summary, "DEDUCTIONS_RECOVERIES")).toMatchObject({
      status: "READY",
      executableScenarioCount: 1,
      requiredPurposeMatchers: ["PAYROLL_DEDUCTION_RECOVERY"],
      coveredPurposeMatchers: ["PAYROLL_DEDUCTION_RECOVERY"],
      certificationStatus: "EXPERT_REVIEWED",
    });
    expect(family(summary, "COMPOSITE_REGISTER_TIE_OUT")).toMatchObject({
      status: "READY",
      executableScenarioCount: 1,
      requiredPurposeMatchers: ["PAYROLL_COMPOSITE_REGISTER_TIE_OUT"],
      coveredPurposeMatchers: ["PAYROLL_COMPOSITE_REGISTER_TIE_OUT"],
      certificationStatus: "EXPERT_REVIEWED",
    });
  });

  it("blocks IRPP correction coverage when lifecycle proof hashes are missing", () => {
    const validation = fullCoverageValidation();
    const correctionRun = validation.runs.find(
      (run) => run.purpose === "PAYROLL_IRPP_YTD_CORRECTION_REPLAY",
    );
    if (!correctionRun?.actualOutput) {
      throw new Error("Missing IRPP correction fixture output");
    }
    delete (correctionRun.actualOutput as Record<string, unknown>)
      .correctionEvidenceHash;

    const summary = buildPayrollStatutoryScenarioCoverageSummary(
      supportedIrppPack(),
      validation,
    );

    expect(summary.status).toBe("BLOCKED");
    expect(summary.missingLifecycleProofFieldCount).toBe(1);
    expect(summary.missingLifecycleProofFields).toEqual([
      "correctionEvidenceHash",
    ]);
    expect(family(summary, "IRPP_CORRECTIONS")).toMatchObject({
      status: "BLOCKED",
      blockerCode:
        "PAYROLL_STATUTORY_SCENARIO_LIFECYCLE_PROOF_COVERAGE_MISSING",
      missingLifecycleProofFields: ["correctionEvidenceHash"],
    });
    expect(summary.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          family: "IRPP_CORRECTIONS",
          evidence: expect.objectContaining({
            missingLifecycleProofFields: ["correctionEvidenceHash"],
          }),
        }),
      ]),
    );
  });

  it("blocks executable scenarios that omit required legal review topic coverage", () => {
    const validation = fullCoverageValidation();
    const irppPeriodRun = validation.runs.find(
      (run) => run.purpose === "PAYROLL_IRPP_PERIOD_CALCULATION",
    );
    if (!irppPeriodRun?.reviewEvidence) {
      throw new Error("Missing IRPP period fixture review evidence");
    }
    irppPeriodRun.reviewEvidence.coveredReviewTopics = REQUIRED_IRPP_REVIEW_TOPICS.filter(
      (topic) => topic !== "withholdingRounding",
    );

    const summary = buildPayrollStatutoryScenarioCoverageSummary(
      supportedIrppPack(),
      validation,
    );

    expect(summary.status).toBe("BLOCKED");
    expect(summary.missingReviewTopics).toEqual(["withholdingRounding"]);
    expect(family(summary, "IRPP_PERIOD")).toMatchObject({
      status: "BLOCKED",
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_REVIEW_TOPIC_COVERAGE_MISSING",
      coveredReviewTopics: REQUIRED_IRPP_REVIEW_TOPICS.filter(
        (topic) => topic !== "withholdingRounding",
      ),
      missingReviewTopics: ["withholdingRounding"],
    });
    expect(summary.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          family: "IRPP_PERIOD",
          evidence: expect.objectContaining({
            missingReviewTopics: ["withholdingRounding"],
          }),
        }),
      ]),
    );
  });
  it("blocks executable scenarios that lack review evidence provenance", () => {
    const validation = fullCoverageValidation();
    const irppPeriodRun = validation.runs.find(
      (run) => run.purpose === "PAYROLL_IRPP_PERIOD_CALCULATION",
    );
    if (!irppPeriodRun) throw new Error("Missing IRPP period fixture");
    (irppPeriodRun as { reviewEvidence: null }).reviewEvidence = null;

    const summary = buildPayrollStatutoryScenarioCoverageSummary(
      supportedIrppPack(),
      validation,
    );

    expect(summary.status).toBe("BLOCKED");
    expect(summary.reviewEvidence).toMatchObject({
      presentCount: 13,
      missingCount: 1,
    });
    expect(family(summary, "IRPP_PERIOD")).toMatchObject({
      status: "BLOCKED",
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_REVIEW_EVIDENCE_MISSING",
      reviewEvidence: expect.objectContaining({
        presentCount: 0,
        missingCount: 1,
      }),
    });
    expect(summary.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          family: "IRPP_PERIOD",
          evidence: expect.objectContaining({
            reviewEvidence: expect.objectContaining({ missingCount: 1 }),
          }),
        }),
      ]),
    );
  });

  it("blocks families that have fixtures but no production capability matrix entry", () => {
    const packWithoutAttendanceCapability = {
      ...supportedIrppPack(),
      header: {
        ...supportedIrppPack().header,
        capabilityMatrix: {
          ...supportedIrppPack().header.capabilityMatrix,
          "payroll.attendance": undefined,
        },
      },
    };
    delete (
      packWithoutAttendanceCapability.header.capabilityMatrix as Record<
        string,
        unknown
      >
    )["payroll.attendance"];

    const summary = buildPayrollStatutoryScenarioCoverageSummary(
      packWithoutAttendanceCapability,
      fullCoverageValidation(),
    );

    expect(summary.status).toBe("BLOCKED");
    expect(family(summary, "LEAVE_OVERTIME")).toMatchObject({
      status: "BLOCKED",
      capabilityStatus: null,
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_CAPABILITY_NOT_PRODUCTION_READY",
      certificationStatus: "EXPERT_REVIEWED",
    });
  });

  it("blocks certified capability claims unless executable fixtures are regulator-confirmed", () => {
    const summary = buildPayrollStatutoryScenarioCoverageSummary(
      certifiedIrppPack(),
      fullCoverageValidation(),
    );

    expect(summary.status).toBe("BLOCKED");
    expect(family(summary, "IRPP_PERIOD")).toMatchObject({
      status: "BLOCKED",
      capabilityStatus: "SUPPORTED_CERTIFIED",
      reviewStatuses: ["EXPERT_REVIEWED"],
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_CERTIFIED_REVIEW_MISSING",
      certificationStatus: "EXPERT_REVIEWED",
    });
    expect(summary.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          family: "IRPP_PERIOD",
          evidence: expect.objectContaining({
            certificationStatus: "EXPERT_REVIEWED",
            regulatorConfirmedScenarioCount: 0,
          }),
        }),
      ]),
    );
  });
  it("blocks allowance, benefit, and deduction coverage when the deduction scenario is missing", () => {
    const validation = fullCoverageValidation();
    validation.runs = validation.runs.filter(
      (run) => run.purpose !== "PAYROLL_DEDUCTION_RECOVERY",
    );

    const summary = buildPayrollStatutoryScenarioCoverageSummary(
      supportedIrppPack(),
      validation,
    );

    expect(summary.status).toBe("BLOCKED");
    expect(family(summary, "DEDUCTIONS_RECOVERIES")).toMatchObject({
      status: "BLOCKED",
      missingPurposeMatchers: ["PAYROLL_DEDUCTION_RECOVERY"],
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_FAMILY_MISSING",
    });
  });

  it("blocks allowance and benefit coverage when the benefit scenario is missing", () => {
    const validation = fullCoverageValidation();
    validation.runs = validation.runs.filter(
      (run) => run.purpose !== "PAYROLL_BENEFIT_IN_KIND",
    );

    const summary = buildPayrollStatutoryScenarioCoverageSummary(
      supportedIrppPack(),
      validation,
    );

    expect(summary.status).toBe("BLOCKED");
    expect(family(summary, "ALLOWANCES_BENEFITS")).toMatchObject({
      status: "BLOCKED",
      executableScenarioCount: 1,
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_FAMILY_MISSING",
      requiredPurposeMatchers: [
        "PAYROLL_ALLOWANCE_TAXABLE",
        "PAYROLL_BENEFIT_IN_KIND",
      ],
      coveredPurposeMatchers: ["PAYROLL_ALLOWANCE_TAXABLE"],
      missingPurposeMatchers: ["PAYROLL_BENEFIT_IN_KIND"],
    });
    expect(summary.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          family: "ALLOWANCES_BENEFITS",
          evidence: expect.objectContaining({
            missingPurposeMatchers: ["PAYROLL_BENEFIT_IN_KIND"],
          }),
        }),
      ]),
    );
  });

  it("blocks leave and overtime coverage when the leave scenario is missing", () => {
    const validation = fullCoverageValidation();
    validation.runs = validation.runs.filter(
      (run) => run.purpose !== "PAYROLL_LEAVE_PAID",
    );

    const summary = buildPayrollStatutoryScenarioCoverageSummary(
      supportedIrppPack(),
      validation,
    );

    expect(summary.status).toBe("BLOCKED");
    expect(family(summary, "LEAVE_OVERTIME")).toMatchObject({
      status: "BLOCKED",
      executableScenarioCount: 2,
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_FAMILY_MISSING",
      requiredPurposeMatchers: [
        "PAYROLL_LEAVE_PAID",
        "PAYROLL_LEAVE_UNPAID",
        "PAYROLL_OVERTIME",
      ],
      coveredPurposeMatchers: ["PAYROLL_LEAVE_UNPAID", "PAYROLL_OVERTIME"],
      missingPurposeMatchers: ["PAYROLL_LEAVE_PAID"],
    });
  });

  it("blocks the correction family when full coverage lacks correction replay evidence", () => {
    const validation = fullCoverageValidation();
    validation.runs = validation.runs.filter(
      (run) => run.purpose !== "PAYROLL_IRPP_YTD_CORRECTION_REPLAY",
    );

    const summary = buildPayrollStatutoryScenarioCoverageSummary(
      supportedIrppPack(),
      validation,
    );

    expect(summary.status).toBe("BLOCKED");
    expect(family(summary, "IRPP_CORRECTIONS")).toMatchObject({
      status: "BLOCKED",
      executableScenarioCount: 0,
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_FAMILY_MISSING",
    });
  });

  it("blocks composite register tie-out coverage when the fixture is missing", () => {
    const validation = fullCoverageValidation();
    validation.runs = validation.runs.filter(
      (run) => run.purpose !== "PAYROLL_COMPOSITE_REGISTER_TIE_OUT",
    );

    const summary = buildPayrollStatutoryScenarioCoverageSummary(
      supportedIrppPack(),
      validation,
    );

    expect(summary.status).toBe("BLOCKED");
    expect(family(summary, "COMPOSITE_REGISTER_TIE_OUT")).toMatchObject({
      status: "BLOCKED",
      executableScenarioCount: 0,
      blockerCode: "PAYROLL_STATUTORY_SCENARIO_FAMILY_MISSING",
      missingPurposeMatchers: ["PAYROLL_COMPOSITE_REGISTER_TIE_OUT"],
    });
  });
});
