import { isRecord, type CountryPack } from "../regulatory/country-packs/schemas";
import { getParameterEnvelopeArray } from "../regulatory/country-packs/validation";
import {
  validatePayrollCountryPackCalculationFixtures,
  type PayrollCalculationFixtureIssue,
  type PayrollCalculationFixtureRun,
  type PayrollCalculationFixtureValidationResult,
} from "./payroll-country-pack-fixture-runner";

export type PayrollStatutoryScenarioFamily =
  | "CNPS_PENSION"
  | "CNPS_FAMILY_ALLOWANCE"
  | "CNPS_OCCUPATIONAL_RISK"
  | "IRPP_PERIOD"
  | "IRPP_YTD"
  | "IRPP_ADJUSTMENTS"
  | "IRPP_CORRECTIONS"
  | "ALLOWANCES_BENEFITS"
  | "LEAVE_OVERTIME";

export type PayrollStatutoryScenarioCoverageStatus = "READY" | "BLOCKED";

export type PayrollStatutoryScenarioCoverageCertificationStatus =
  | "NO_EXECUTABLE_SCENARIOS"
  | "EXPERT_REVIEWED"
  | "REGULATOR_CONFIRMED"
  | "MIXED_REVIEW";

export type PayrollStatutoryScenarioCoverageBlockerCode =
  | "PAYROLL_STATUTORY_SCENARIO_CAPABILITY_NOT_PRODUCTION_READY"
  | "PAYROLL_STATUTORY_SCENARIO_CERTIFIED_REVIEW_MISSING"
  | "PAYROLL_STATUTORY_SCENARIO_REVIEW_EVIDENCE_MISSING"
  | "PAYROLL_STATUTORY_SCENARIO_FAMILY_MISSING"
  | "PAYROLL_STATUTORY_SCENARIO_FAMILY_FAILED";

export type PayrollStatutoryScenarioReviewEvidenceSummary = {
  presentCount: number;
  missingCount: number;
  reviewedBy: string[];
  reviewedOn: string[];
  legalRefs: string[];
  sourceEvidenceHashes: string[];
};

export type PayrollStatutoryScenarioCoverageFamily = {
  family: PayrollStatutoryScenarioFamily;
  label: string;
  status: PayrollStatutoryScenarioCoverageStatus;
  requiredForFullProduction: true;
  capabilityStatus: string | null;
  parameterPaths: string[];
  executableScenarioCount: number;
  passedScenarioCount: number;
  failedScenarioCount: number;
  fixtureIds: string[];
  requiredPurposeMatchers: string[];
  coveredPurposeMatchers: string[];
  missingPurposeMatchers: string[];
  requiredReviewTopics: string[];
  reviewStatuses: string[];
  expertReviewedScenarioCount: number;
  regulatorConfirmedScenarioCount: number;
  reviewEvidence: PayrollStatutoryScenarioReviewEvidenceSummary;
  certificationStatus: PayrollStatutoryScenarioCoverageCertificationStatus;
  issueCodes: string[];
  blockerCode: PayrollStatutoryScenarioCoverageBlockerCode | null;
  blockerMessage: string | null;
};

export type PayrollStatutoryScenarioCoverageBlocker = {
  code: PayrollStatutoryScenarioCoverageBlockerCode;
  family: PayrollStatutoryScenarioFamily;
  message: string;
  evidence: {
    capabilityStatus: string | null;
    executableScenarioCount: number;
    failedScenarioCount: number;
    reviewStatuses: string[];
    regulatorConfirmedScenarioCount: number;
    reviewEvidence: PayrollStatutoryScenarioReviewEvidenceSummary;
    certificationStatus: PayrollStatutoryScenarioCoverageCertificationStatus;
    issueCodes: string[];
    missingPurposeMatchers: string[];
    requiredReviewTopics: string[];
  };
};

export type PayrollStatutoryScenarioCoverageSummary = {
  status: PayrollStatutoryScenarioCoverageStatus;
  countryCode: string;
  packVersion: string;
  executableScenarioCount: number;
  passedScenarioCount: number;
  failedScenarioCount: number;
  readyFamilyCount: number;
  requiredFamilyCount: number;
  issueCount: number;
  issueCodes: string[];
  fixtureIds: string[];
  reviewStatuses: string[];
  expertReviewedScenarioCount: number;
  regulatorConfirmedScenarioCount: number;
  requiredReviewTopicCount: number;
  requiredReviewTopics: string[];
  reviewEvidence: PayrollStatutoryScenarioReviewEvidenceSummary;
  certificationStatus: PayrollStatutoryScenarioCoverageCertificationStatus;
  families: PayrollStatutoryScenarioCoverageFamily[];
  blockers: PayrollStatutoryScenarioCoverageBlocker[];
};

type FamilySpec = {
  family: PayrollStatutoryScenarioFamily;
  label: string;
  parameterPaths: string[];
  capabilityPath: string | null;
  purposeMatchers: readonly string[];
  requiredPurposeMatchers?: readonly string[];
};

const PRODUCTION_CAPABILITY_STATUSES = new Set([
  "SUPPORTED",
  "SUPPORTED_CERTIFIED",
]);

const CERTIFIED_CAPABILITY_STATUS = "SUPPORTED_CERTIFIED";

const FAMILY_SPECS: readonly FamilySpec[] = [
  {
    family: "CNPS_PENSION",
    label: "CNPS pension",
    parameterPaths: ["payroll.cnps.pensionRatesBps"],
    capabilityPath: "payroll.cnps",
    purposeMatchers: ["PAYROLL_CNPS_PENSION"],
  },
  {
    family: "CNPS_FAMILY_ALLOWANCE",
    label: "CNPS family allowance",
    parameterPaths: ["payroll.cnps.familyAllowanceRatesBps"],
    capabilityPath: "payroll.cnps",
    purposeMatchers: ["PAYROLL_CNPS_FAMILY_ALLOWANCE"],
  },
  {
    family: "CNPS_OCCUPATIONAL_RISK",
    label: "CNPS occupational risk",
    parameterPaths: ["payroll.cnps.occupationalRiskRatesBps"],
    capabilityPath: "payroll.cnps",
    purposeMatchers: ["PAYROLL_CNPS_OCCUPATIONAL_RISK"],
  },
  {
    family: "IRPP_PERIOD",
    label: "IRPP period calculation",
    parameterPaths: ["payroll.irpp.incomeTaxRules"],
    capabilityPath: "payroll.irpp",
    purposeMatchers: ["PAYROLL_IRPP_PERIOD_CALCULATION"],
  },
  {
    family: "IRPP_YTD",
    label: "IRPP YTD regularization",
    parameterPaths: ["payroll.irpp.incomeTaxRules"],
    capabilityPath: "payroll.irpp",
    purposeMatchers: ["PAYROLL_IRPP_YTD_REGULARIZATION"],
  },
  {
    family: "IRPP_ADJUSTMENTS",
    label: "IRPP period adjustments",
    parameterPaths: ["payroll.irpp.incomeTaxRules"],
    capabilityPath: "payroll.irpp",
    purposeMatchers: ["PAYROLL_IRPP_PERIOD_ADJUSTMENTS"],
  },
  {
    family: "IRPP_CORRECTIONS",
    label: "IRPP correction replay",
    parameterPaths: ["payroll.irpp.incomeTaxRules"],
    capabilityPath: "payroll.irpp",
    purposeMatchers: ["PAYROLL_IRPP_YTD_CORRECTION_REPLAY"],
  },
  {
    family: "ALLOWANCES_BENEFITS",
    label: "Allowances and benefits",
    parameterPaths: [
      "payroll.compensation.allowances",
      "payroll.compensation.benefits",
    ],
    capabilityPath: "payroll.compensation",
    purposeMatchers: ["PAYROLL_ALLOWANCE", "PAYROLL_BENEFIT"],
    requiredPurposeMatchers: [
      "PAYROLL_ALLOWANCE_TAXABLE",
      "PAYROLL_BENEFIT_IN_KIND",
    ],
  },
  {
    family: "LEAVE_OVERTIME",
    label: "Leave and overtime",
    parameterPaths: ["payroll.attendance.leave", "payroll.attendance.overtime"],
    capabilityPath: "payroll.attendance",
    purposeMatchers: ["PAYROLL_LEAVE", "PAYROLL_OVERTIME"],
    requiredPurposeMatchers: [
      "PAYROLL_LEAVE_PAID",
      "PAYROLL_LEAVE_UNPAID",
      "PAYROLL_OVERTIME",
    ],
  },
];

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      ).map((item) => item.trim())
    : [];
}

function requiredReviewTopicsFor(pack: CountryPack, spec: FamilySpec) {
  return uniqueValues(
    spec.parameterPaths.flatMap((path) => {
      const envelopes = getParameterEnvelopeArray(pack, path) ?? [];
      return envelopes.flatMap((envelope) => {
        const value = envelope.value;
        return isRecord(value) ? stringArray(value.requiredReviewedCoverage) : [];
      });
    }),
  ).sort();
}

function capabilityStatusFor(
  pack: CountryPack,
  spec: FamilySpec,
): string | null {
  const matrix = pack.header.capabilityMatrix ?? {};
  const candidatePaths = uniqueValues([
    spec.capabilityPath,
    ...spec.parameterPaths,
  ]);
  const matchingKey = Object.keys(matrix)
    .sort((left, right) => right.length - left.length)
    .find((key) =>
      candidatePaths.some((path) => path === key || path.startsWith(`${key}.`)),
    );

  return matchingKey ? (matrix[matchingKey] ?? null) : null;
}

function purposeMatches(purpose: string | null, matcher: string) {
  return purpose === matcher || Boolean(purpose?.startsWith(`${matcher}_`));
}

function certificationStatusFor(
  runs: PayrollCalculationFixtureRun[],
): PayrollStatutoryScenarioCoverageCertificationStatus {
  if (runs.length === 0) return "NO_EXECUTABLE_SCENARIOS";
  const statuses = uniqueValues(runs.map((run) => run.reviewStatus));
  if (statuses.length === 1 && statuses[0] === "REGULATOR_CONFIRMED") {
    return "REGULATOR_CONFIRMED";
  }
  if (statuses.length === 1 && statuses[0] === "EXPERT_REVIEWED") {
    return "EXPERT_REVIEWED";
  }
  return "MIXED_REVIEW";
}

function reviewEvidenceSummaryFor(
  runs: PayrollCalculationFixtureRun[],
): PayrollStatutoryScenarioReviewEvidenceSummary {
  const records = runs
    .map((run) => run.reviewEvidence)
    .filter(
      (
        evidence,
      ): evidence is NonNullable<PayrollCalculationFixtureRun["reviewEvidence"]> =>
        Boolean(evidence),
    );

  return {
    presentCount: records.length,
    missingCount: runs.length - records.length,
    reviewedBy: uniqueValues(records.map((evidence) => evidence.reviewedBy)),
    reviewedOn: uniqueValues(records.map((evidence) => evidence.reviewedOn)),
    legalRefs: uniqueValues(records.map((evidence) => evidence.legalRef)),
    sourceEvidenceHashes: uniqueValues(
      records.map((evidence) => evidence.sourceEvidenceHash),
    ),
  };
}

function runBelongsToSpec(run: PayrollCalculationFixtureRun, spec: FamilySpec) {
  if (spec.parameterPaths.includes(run.parameterPath)) {
    if (spec.family === "IRPP_PERIOD") {
      return spec.purposeMatchers.some((matcher) =>
        purposeMatches(run.purpose, matcher),
      );
    }
    if (spec.family.startsWith("IRPP_")) {
      return spec.purposeMatchers.some((matcher) =>
        purposeMatches(run.purpose, matcher),
      );
    }
    return true;
  }

  return spec.purposeMatchers.some((matcher) =>
    purposeMatches(run.purpose, matcher),
  );
}

function issueBelongsToSpec(
  issue: PayrollCalculationFixtureIssue,
  spec: FamilySpec,
) {
  if (spec.parameterPaths.includes(issue.parameterPath)) {
    return !spec.family.startsWith("IRPP_");
  }

  return spec.purposeMatchers.some((matcher) =>
    issue.fixtureId.toUpperCase().includes(matcher.toUpperCase()),
  );
}

function familyBlockerFor(
  spec: FamilySpec,
  capabilityStatus: string | null,
  executableScenarioCount: number,
  failedScenarioCount: number,
  issueCodes: string[],
  missingPurposeMatchers: string[],
  reviewEvidence: PayrollStatutoryScenarioReviewEvidenceSummary,
  certificationStatus: PayrollStatutoryScenarioCoverageCertificationStatus,
) {
  if (
    capabilityStatus &&
    !PRODUCTION_CAPABILITY_STATUSES.has(capabilityStatus)
  ) {
    return {
      code: "PAYROLL_STATUTORY_SCENARIO_CAPABILITY_NOT_PRODUCTION_READY" as const,
      message: `${spec.label} capability is ${capabilityStatus}, so full production remains blocked.`,
    };
  }

  if (executableScenarioCount === 0) {
    return {
      code: "PAYROLL_STATUTORY_SCENARIO_FAMILY_MISSING" as const,
      message: `${spec.label} needs reviewed executable calculation scenarios before full production.`,
    };
  }

  if (!capabilityStatus) {
    return {
      code: "PAYROLL_STATUTORY_SCENARIO_CAPABILITY_NOT_PRODUCTION_READY" as const,
      message: `${spec.label} capability is missing, so full production remains blocked.`,
    };
  }

  if (missingPurposeMatchers.length > 0) {
    return {
      code: "PAYROLL_STATUTORY_SCENARIO_FAMILY_MISSING" as const,
      message: `${spec.label} is missing reviewed executable scenarios for ${missingPurposeMatchers.join(", ")}.`,
    };
  }

  if (failedScenarioCount > 0 || issueCodes.length > 0) {
    return {
      code: "PAYROLL_STATUTORY_SCENARIO_FAMILY_FAILED" as const,
      message: `${spec.label} has failing executable calculation scenario evidence.`,
    };
  }

  if (reviewEvidence.missingCount > 0) {
    return {
      code: "PAYROLL_STATUTORY_SCENARIO_REVIEW_EVIDENCE_MISSING" as const,
      message: `${spec.label} has executable calculation scenarios without review evidence provenance.`,
    };
  }

  if (
    capabilityStatus === CERTIFIED_CAPABILITY_STATUS &&
    certificationStatus !== "REGULATOR_CONFIRMED"
  ) {
    return {
      code: "PAYROLL_STATUTORY_SCENARIO_CERTIFIED_REVIEW_MISSING" as const,
      message: `${spec.label} claims certified support but lacks regulator-confirmed executable scenario evidence.`,
    };
  }

  return null;
}

export function buildPayrollStatutoryScenarioCoverageSummary(
  pack: CountryPack,
  validation: PayrollCalculationFixtureValidationResult = validatePayrollCountryPackCalculationFixtures(
    pack,
  ),
): PayrollStatutoryScenarioCoverageSummary {
  const families = FAMILY_SPECS.map((spec) => {
    const runs = validation.runs.filter((run) => runBelongsToSpec(run, spec));
    const runFixtureIds = new Set(runs.map((run) => run.fixtureId));
    const issues = validation.issues.filter(
      (issue) =>
        runFixtureIds.has(issue.fixtureId) || issueBelongsToSpec(issue, spec),
    );
    const capabilityStatus = capabilityStatusFor(pack, spec);
    const requiredReviewTopics = requiredReviewTopicsFor(pack, spec);
    const passedScenarioCount = runs.filter(
      (run) => run.status === "PASSED",
    ).length;
    const failedScenarioCount = runs.filter(
      (run) => run.status === "FAILED",
    ).length;
    const requiredPurposeMatchers = spec.requiredPurposeMatchers ?? [];
    const coveredPurposeMatchers = requiredPurposeMatchers.filter((matcher) =>
      runs.some((run) => purposeMatches(run.purpose, matcher)),
    );
    const missingPurposeMatchers = requiredPurposeMatchers.filter(
      (matcher) => !coveredPurposeMatchers.includes(matcher),
    );
    const issueCodes = uniqueValues(issues.map((issue) => issue.code));
    const reviewStatuses = uniqueValues(runs.map((run) => run.reviewStatus));
    const expertReviewedScenarioCount = runs.filter(
      (run) => run.reviewStatus === "EXPERT_REVIEWED",
    ).length;
    const regulatorConfirmedScenarioCount = runs.filter(
      (run) => run.reviewStatus === "REGULATOR_CONFIRMED",
    ).length;
    const reviewEvidence = reviewEvidenceSummaryFor(runs);
    const certificationStatus = certificationStatusFor(runs);
    const blocker = familyBlockerFor(
      spec,
      capabilityStatus,
      runs.length,
      failedScenarioCount,
      issueCodes,
      missingPurposeMatchers,
      reviewEvidence,
      certificationStatus,
    );

    return {
      family: spec.family,
      label: spec.label,
      status: blocker ? "BLOCKED" : "READY",
      requiredForFullProduction: true,
      capabilityStatus,
      parameterPaths: spec.parameterPaths,
      executableScenarioCount: runs.length,
      passedScenarioCount,
      failedScenarioCount,
      fixtureIds: uniqueValues(runs.map((run) => run.fixtureId)),
      requiredPurposeMatchers: [...requiredPurposeMatchers],
      coveredPurposeMatchers,
      missingPurposeMatchers,
      requiredReviewTopics,
      reviewStatuses,
      expertReviewedScenarioCount,
      regulatorConfirmedScenarioCount,
      reviewEvidence,
      certificationStatus,
      issueCodes,
      blockerCode: blocker?.code ?? null,
      blockerMessage: blocker?.message ?? null,
    } satisfies PayrollStatutoryScenarioCoverageFamily;
  });

  const blockers = families
    .filter((family) => family.blockerCode)
    .map((family) => ({
      code: family.blockerCode as PayrollStatutoryScenarioCoverageBlockerCode,
      family: family.family,
      message:
        family.blockerMessage ??
        "Payroll statutory scenario coverage is blocked.",
      evidence: {
        capabilityStatus: family.capabilityStatus,
        executableScenarioCount: family.executableScenarioCount,
        failedScenarioCount: family.failedScenarioCount,
        reviewStatuses: family.reviewStatuses,
        regulatorConfirmedScenarioCount: family.regulatorConfirmedScenarioCount,
        reviewEvidence: family.reviewEvidence,
        certificationStatus: family.certificationStatus,
        issueCodes: family.issueCodes,
        missingPurposeMatchers: family.missingPurposeMatchers,
        requiredReviewTopics: family.requiredReviewTopics,
      },
    }));

  const reviewStatuses = uniqueValues(
    validation.runs.map((run) => run.reviewStatus),
  );
  const expertReviewedScenarioCount = validation.runs.filter(
    (run) => run.reviewStatus === "EXPERT_REVIEWED",
  ).length;
  const regulatorConfirmedScenarioCount = validation.runs.filter(
    (run) => run.reviewStatus === "REGULATOR_CONFIRMED",
  ).length;
  const reviewEvidence = reviewEvidenceSummaryFor(validation.runs);
  const certificationStatus = certificationStatusFor(validation.runs);
  const requiredReviewTopics = uniqueValues(
    families.flatMap((family) => family.requiredReviewTopics),
  ).sort();

  return {
    status: blockers.length > 0 ? "BLOCKED" : "READY",
    countryCode: pack.header.countryCode,
    packVersion: pack.header.packVersion,
    executableScenarioCount: validation.runs.length,
    passedScenarioCount: validation.runs.filter(
      (run) => run.status === "PASSED",
    ).length,
    failedScenarioCount: validation.runs.filter(
      (run) => run.status === "FAILED",
    ).length,
    readyFamilyCount: families.filter((family) => family.status === "READY")
      .length,
    requiredFamilyCount: families.length,
    issueCount: validation.issues.length,
    issueCodes: uniqueValues(validation.issues.map((issue) => issue.code)),
    fixtureIds: uniqueValues(validation.runs.map((run) => run.fixtureId)),
    reviewStatuses,
    expertReviewedScenarioCount,
    regulatorConfirmedScenarioCount,
    requiredReviewTopicCount: requiredReviewTopics.length,
    requiredReviewTopics,
    reviewEvidence,
    certificationStatus,
    families,
    blockers,
  };
}
