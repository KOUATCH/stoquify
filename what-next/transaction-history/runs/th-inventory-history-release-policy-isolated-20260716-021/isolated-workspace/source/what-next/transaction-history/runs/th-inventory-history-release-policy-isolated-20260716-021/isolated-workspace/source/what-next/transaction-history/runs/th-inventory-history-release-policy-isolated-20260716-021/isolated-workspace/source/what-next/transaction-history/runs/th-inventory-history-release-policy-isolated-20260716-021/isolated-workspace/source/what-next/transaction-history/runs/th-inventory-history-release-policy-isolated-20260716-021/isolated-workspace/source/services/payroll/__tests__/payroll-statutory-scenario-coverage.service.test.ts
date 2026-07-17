import { cameroonCountryPack } from "../../regulatory/country-packs/cameroon";
import { validatePayrollCountryPackCalculationFixtures } from "../payroll-country-pack-fixture-runner";
import {
  buildPayrollStatutoryScenarioCoverageSummary,
  type PayrollStatutoryScenarioFamily,
} from "../payroll-statutory-scenario-coverage.service";

function fullCoverageRun(
  fixtureId: string,
  parameterPath: string,
  purpose: string,
  reviewStatus = "EXPERT_REVIEWED",
) {
  const regulatorConfirmed = reviewStatus === "REGULATOR_CONFIRMED";

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
    },
    expectedOutput: { status: "CALCULATED" },
    actualOutput: { status: "CALCULATED" },
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
      ),
      fullCoverageRun(
        "cm-cnps-family-reviewed",
        "payroll.cnps.familyAllowanceRatesBps",
        "PAYROLL_CNPS_FAMILY_ALLOWANCE",
        "REGULATOR_CONFIRMED",
      ),
      fullCoverageRun(
        "cm-cnps-risk-reviewed",
        "payroll.cnps.occupationalRiskRatesBps",
        "PAYROLL_CNPS_OCCUPATIONAL_RISK",
        "REGULATOR_CONFIRMED",
      ),
      fullCoverageRun(
        "cm-irpp-period-reviewed",
        "payroll.irpp.incomeTaxRules",
        "PAYROLL_IRPP_PERIOD_CALCULATION",
      ),
      fullCoverageRun(
        "cm-irpp-ytd-reviewed",
        "payroll.irpp.incomeTaxRules",
        "PAYROLL_IRPP_YTD_REGULARIZATION",
      ),
      fullCoverageRun(
        "cm-irpp-adjustments-reviewed",
        "payroll.irpp.incomeTaxRules",
        "PAYROLL_IRPP_PERIOD_ADJUSTMENTS",
      ),
      fullCoverageRun(
        "cm-irpp-corrections-reviewed",
        "payroll.irpp.incomeTaxRules",
        "PAYROLL_IRPP_YTD_CORRECTION_REPLAY",
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
        "payroll.irpp": "SUPPORTED" as const,
        "payroll.compensation": "SUPPORTED" as const,
        "payroll.attendance": "SUPPORTED" as const,
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
  it("keeps the active Cameroon pack blocked for full production while CNPS coverage is executable", () => {
    const validation =
      validatePayrollCountryPackCalculationFixtures(cameroonCountryPack);

    const summary = buildPayrollStatutoryScenarioCoverageSummary(
      cameroonCountryPack,
      validation,
    );

    expect(summary.status).toBe("BLOCKED");
    expect(summary.readyFamilyCount).toBe(3);
    expect(summary.requiredFamilyCount).toBe(9);
    expect(summary.requiredReviewTopicCount).toBe(6);
    expect(summary.requiredReviewTopics).toEqual([
      "bracketsAndRates",
      "deductibleEmployeeContributions",
      "familyQuotientOrDependentTreatment",
      "monthlyAndAnnualRegularization",
      "taxableSalaryBase",
      "withholdingRounding",
    ]);
    expect(family(summary, "CNPS_PENSION")).toMatchObject({
      status: "READY",
      passedScenarioCount: 1,
    });
    expect(family(summary, "CNPS_FAMILY_ALLOWANCE")).toMatchObject({
      status: "READY",
      passedScenarioCount: 3,
    });
    expect(family(summary, "CNPS_OCCUPATIONAL_RISK")).toMatchObject({
      status: "READY",
      passedScenarioCount: 3,
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
    expect(family(summary, "LEAVE_OVERTIME")).toMatchObject({
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
      executableScenarioCount: 12,
      passedScenarioCount: 12,
      failedScenarioCount: 0,
      readyFamilyCount: 9,
      requiredFamilyCount: 9,
      blockers: [],
      reviewStatuses: ["REGULATOR_CONFIRMED", "EXPERT_REVIEWED"],
      expertReviewedScenarioCount: 9,
      regulatorConfirmedScenarioCount: 3,
      reviewEvidence: expect.objectContaining({
        presentCount: 12,
        missingCount: 0,
        sourceEvidenceHashes: expect.arrayContaining([
          "sha256:cm-cnps-pension-reviewed-review-evidence",
          "sha256:cm-irpp-period-reviewed-review-evidence",
        ]),
      }),
      certificationStatus: "MIXED_REVIEW",
    });
    expect(family(summary, "CNPS_PENSION")).toMatchObject({
      reviewStatuses: ["REGULATOR_CONFIRMED"],
      regulatorConfirmedScenarioCount: 1,
      reviewEvidence: expect.objectContaining({
        presentCount: 1,
        missingCount: 0,
        legalRefs: ["CM_CNPS_CONTRIBUTION_DECREE_2016"],
      }),
      certificationStatus: "REGULATOR_CONFIRMED",
    });
    expect(family(summary, "IRPP_PERIOD")).toMatchObject({
      reviewStatuses: ["EXPERT_REVIEWED"],
      expertReviewedScenarioCount: 1,
      certificationStatus: "EXPERT_REVIEWED",
    });
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
      presentCount: 11,
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
});
