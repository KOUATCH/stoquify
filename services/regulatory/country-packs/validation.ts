import { BusinessRuleError } from "../../_shared/action-errors";

import { computeCountryPackHash } from "./hash";
import {
  countryPackSchema,
  isRecord,
  isRegulatoryEnvelopeArray,
  type CountryPack,
  type RegulatoryEnvelope,
} from "./schemas";

export type RegulatoryPackIssueSeverity = "error" | "warning";

export type RegulatoryPackIssueCode =
  | "STRUCTURAL_SCHEMA_INVALID"
  | "HASH_MISMATCH"
  | "PACK_NOT_PUBLISHED"
  | "LEGAL_CITATION_MISSING"
  | "LEGAL_REFERENCE_DUPLICATE"
  | "EFFECTIVE_WINDOW_INVALID"
  | "EFFECTIVE_WINDOW_OVERLAP"
  | "REQUIRED_PARAMETER_MISSING"
  | "EXPERT_REVIEW_REQUIRED"
  | "GOLDEN_FIXTURE_FAILED"
  | "CAPABILITY_DECLARATION_INVALID";

export type RegulatoryPackIssue = {
  code: RegulatoryPackIssueCode;
  severity: RegulatoryPackIssueSeverity;
  path: string;
  message: string;
};

export type RegulatoryPackValidationResult = {
  valid: boolean;
  canPublish: boolean;
  issues: RegulatoryPackIssue[];
};

export type RegulatoryResolutionErrorCode =
  | "PARAMETER_NOT_FOUND"
  | "CAPABILITY_NOT_SUPPORTED"
  | "EFFECTIVE_WINDOW_MISSING"
  | "ENTITY_PROFILE_INVALID"
  | "LEGAL_CITATION_MISSING"
  | "PACK_NOT_PUBLISHED";

export class RegulatoryPackError extends BusinessRuleError {
  constructor(
    public readonly regulatoryCode: RegulatoryResolutionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RegulatoryPackError";
  }
}

const CAMEROON_COUNTRY_CODE = "CM";
const CAMEROON_IRPP_INCOME_TAX_PARAMETER_PATH = "payroll.irpp.incomeTaxRules";
const PRODUCTION_CAPABILITY_STATUSES = new Set([
  "SUPPORTED",
  "SUPPORTED_CERTIFIED",
]);
const REQUIRED_CAMEROON_IRPP_PRODUCTION_FIXTURE_REQUIREMENTS = [
  {
    purpose: "PAYROLL_IRPP_PERIOD_CALCULATION",
    label: "period calculation",
    requiredInputFields: ["taxableBaseAmount"],
    requiredOutputFields: [
      "status",
      "calculationMode",
      "taxableBaseAmount",
      "adjustedTaxableBaseAmount",
      "cumulativeTaxableBaseAmount",
      "taxAmountBeforeAdjustments",
      "taxAmountAdjustmentAmount",
      "incomeTaxWithholdingAmount",
      "currency",
    ],
  },
  {
    purpose: "PAYROLL_IRPP_YTD_REGULARIZATION",
    label: "YTD regularization",
    requiredInputFields: [
      "taxableBaseAmount",
      "ytdTaxableBaseAmount",
      "ytdTaxWithheldAmount",
    ],
    requiredOutputFields: [
      "status",
      "calculationMode",
      "taxableBaseAmount",
      "cumulativeTaxableBaseAmount",
      "taxAmountBeforeAdjustments",
      "taxAmountAdjustmentAmount",
      "incomeTaxWithholdingAmount",
      "currency",
    ],
  },
  {
    purpose: "PAYROLL_IRPP_PERIOD_ADJUSTMENTS",
    label: "period adjustment",
    requiredInputFields: ["taxableBaseAmount", "adjustmentValues"],
    requiredOutputFields: [
      "status",
      "calculationMode",
      "adjustedTaxableBaseAmount",
      "taxableBaseAdjustmentAmount",
      "taxAmountBeforeAdjustments",
      "taxAmountAdjustmentAmount",
      "incomeTaxWithholdingAmount",
      "currency",
    ],
  },
  {
    purpose: "PAYROLL_IRPP_YTD_CORRECTION_REPLAY",
    label: "YTD correction replay",
    requiredInputFields: [
      "taxableBaseAmount",
      "ytdTaxableBaseAmount",
      "ytdTaxWithheldAmount",
      "adjustmentValues",
    ],
    requiredOutputFields: [
      "status",
      "calculationMode",
      "cumulativeTaxableBaseAmount",
      "taxAmountBeforeAdjustments",
      "taxAmountAdjustmentAmount",
      "incomeTaxWithholdingAmount",
      "currency",
    ],
  },
] as const;

const REQUIRED_CAMEROON_PARAMETER_PATHS = [
  "taxes.vat.standardRateBps",
  "taxes.vat.filing.monthlyDeclaration",
  "payroll.cnps.familyAllowanceRatesBps",
  "payroll.cnps.pensionRatesBps",
  "payroll.cnps.occupationalRiskRatesBps",
  "identifiers.niu",
  "identifiers.rccm",
  "filings.taxFilingNames",
  "holidays.fixed",
  "payments.providerLegality.mobileMoney",
  "compliance.eInvoicing.capability",
  "compliance.eInvoicing.requiredFields",
  "compliance.eInvoicing.certificationPolicy",
  "compliance.eInvoicing.authorityChannels",
  "compliance.eInvoicing.manualPortalFallback",
  "compliance.eInvoicing.artifactExpectations",
  "labels.business",
];

const REQUIRED_CAMEROON_PAYROLL_GOLDEN_FIXTURE_PATHS = [
  "payroll.cnps.pensionRatesBps",
  "payroll.cnps.familyAllowanceRatesBps",
  "payroll.cnps.occupationalRiskRatesBps",
  "payroll.cnps.employerRules",
];

const REQUIRED_CAMEROON_PAYROLL_COMPONENT_PRODUCTION_FIXTURES = [
  {
    capabilityPath: "payroll.compensation.allowances",
    parameterPath: "payroll.compensation.allowances",
    purposeMatcher: "PAYROLL_ALLOWANCE_TAXABLE",
    label: "taxable allowance",
    requiredInputFields: ["periodStart", "periodEnd"],
    requiredOutputFields: [
      "componentAmount",
      "taxableBaseAmount",
      "payslipLineAmount",
      "registerGrossAmount",
      "registerTaxableBaseAmount",
      "registerNetPayableAmount",
    ],
  },
  {
    capabilityPath: "payroll.compensation.benefits",
    parameterPath: "payroll.compensation.benefits",
    purposeMatcher: "PAYROLL_BENEFIT_IN_KIND",
    label: "benefit in kind",
    requiredInputFields: ["periodStart", "periodEnd"],
    requiredOutputFields: [
      "componentAmount",
      "payslipLineAmount",
      "registerEmployerChargeAmount",
      "registerNetPayableAmount",
    ],
  },
  {
    capabilityPath: "payroll.attendance.leave",
    parameterPath: "payroll.attendance.leave",
    purposeMatcher: "PAYROLL_LEAVE_PAID",
    label: "paid leave effect",
    requiredInputFields: ["periodStart", "periodEnd"],
    requiredOutputFields: [
      "payslipLineAmount",
      "registerGrossAmount",
      "registerLeavePaidAmount",
      "registerNetPayableAmount",
    ],
  },
  {
    capabilityPath: "payroll.attendance.leave",
    parameterPath: "payroll.attendance.leave",
    purposeMatcher: "PAYROLL_LEAVE_UNPAID",
    label: "unpaid leave effect",
    requiredInputFields: ["periodStart", "periodEnd"],
    requiredOutputFields: [
      "payslipLineAmount",
      "registerGrossAmount",
      "registerLeaveDeductionAmount",
      "registerNetPayableAmount",
    ],
  },
  {
    capabilityPath: "payroll.attendance.overtime",
    parameterPath: "payroll.attendance.overtime",
    purposeMatcher: "PAYROLL_OVERTIME",
    label: "overtime premium base",
    requiredInputFields: ["periodStart", "periodEnd"],
    requiredOutputFields: [
      "payslipLineAmount",
      "registerGrossAmount",
      "registerTaxableBaseAmount",
      "registerSocialBaseAmount",
      "registerOvertimeBaseAmount",
      "registerOvertimePremiumAmount",
      "registerNetPayableAmount",
    ],
  },
] as const;

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isOnOrAfter(left: string, right: string) {
  const leftDate = parseDate(left);
  const rightDate = parseDate(right);
  return !!leftDate && !!rightDate && leftDate.getTime() >= rightDate.getTime();
}

function isAfter(left: string, right: string) {
  const leftDate = parseDate(left);
  const rightDate = parseDate(right);
  return !!leftDate && !!rightDate && leftDate.getTime() > rightDate.getTime();
}

function getPathValue(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!isRecord(current)) return undefined;
    return current[segment];
  }, root);
}

export function getParameterEnvelopeArray(
  pack: CountryPack,
  parameterPath: string,
) {
  const value = getPathValue(pack.parameters, parameterPath);
  return isRegulatoryEnvelopeArray(value) ? value : null;
}

function getCapabilityStatusForPath(pack: CountryPack, parameterPath: string) {
  const matchingKey = Object.keys(pack.header.capabilityMatrix)
    .sort((left, right) => right.length - left.length)
    .find(
      (key) => parameterPath === key || parameterPath.startsWith(`${key}.`),
    );

  return matchingKey ? pack.header.capabilityMatrix[matchingKey] : null;
}

export function selectEffectiveEnvelope<T = unknown>(
  envelopes: readonly RegulatoryEnvelope<T>[],
  date: string,
) {
  const target = parseDate(date);
  if (!target) return null;

  return (
    envelopes
      .filter((envelope) => {
        const from = parseDate(envelope.effectiveFrom);
        const to = envelope.effectiveTo
          ? parseDate(envelope.effectiveTo)
          : null;
        return (
          !!from &&
          from.getTime() <= target.getTime() &&
          (!to || target.getTime() <= to.getTime())
        );
      })
      .sort((left, right) =>
        right.effectiveFrom.localeCompare(left.effectiveFrom),
      )[0] ?? null
  );
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function collectEnvelopeArrays(
  value: unknown,
  path: string,
  result: Array<{ path: string; envelopes: RegulatoryEnvelope[] }>,
) {
  if (isRegulatoryEnvelopeArray(value)) {
    result.push({ path, envelopes: value });
    return;
  }

  if (Array.isArray(value)) return;
  if (!isRecord(value)) return;

  Object.entries(value).forEach(([key, entry]) => {
    collectEnvelopeArrays(entry, path ? `${path}.${key}` : key, result);
  });
}

function validateEnvelopeArray(
  pack: CountryPack,
  path: string,
  envelopes: readonly RegulatoryEnvelope[],
  legalRefIds: Set<string>,
  issues: RegulatoryPackIssue[],
  requireNoExpertReview: boolean,
) {
  const ordered = [...envelopes].sort((left, right) =>
    left.effectiveFrom.localeCompare(right.effectiveFrom),
  );

  ordered.forEach((envelope, index) => {
    if (!legalRefIds.has(envelope.legalRef)) {
      issues.push({
        code: "LEGAL_CITATION_MISSING",
        severity: "error",
        path: `${path}[${index}].legalRef`,
        message: `Legal reference "${envelope.legalRef}" is not declared in pack ${pack.header.packVersion}.`,
      });
    }

    if (
      envelope.effectiveTo &&
      isAfter(envelope.effectiveFrom, envelope.effectiveTo)
    ) {
      issues.push({
        code: "EFFECTIVE_WINDOW_INVALID",
        severity: "error",
        path,
        message:
          "A regulatory parameter has an effectiveTo date before effectiveFrom.",
      });
    }

    if (
      requireNoExpertReview &&
      envelope.verificationStatus === "REQUIRES_EXPERT_REVIEW" &&
      getCapabilityStatusForPath(pack, path) !== "REQUIRES_EXPERT_REVIEW"
    ) {
      issues.push({
        code: "EXPERT_REVIEW_REQUIRED",
        severity: "error",
        path: `${path}[${index}].verificationStatus`,
        message:
          "Published packs can only contain expert-review placeholders under an explicit REQUIRES_EXPERT_REVIEW capability.",
      });
    }

    const next = ordered[index + 1];
    if (
      next &&
      (!envelope.effectiveTo ||
        isOnOrAfter(envelope.effectiveTo, next.effectiveFrom))
    ) {
      issues.push({
        code: "EFFECTIVE_WINDOW_OVERLAP",
        severity: "error",
        path,
        message:
          "Effective windows overlap; consumers cannot resolve this parameter deterministically.",
      });
    }
  });
}

function validSourceEvidenceHash(value: unknown) {
  return typeof value === "string" && /^sha256:[A-Za-z0-9_.:-]+$/.test(value);
}

function validateCalculationScenarioReviewEvidence(
  fixture: CountryPack["goldenFixtures"][number],
  issues: RegulatoryPackIssue[],
) {
  if (!fixture.calculationScenario) return;
  const evidence = fixture.calculationScenario.reviewEvidence;
  const basePath = `goldenFixtures.${fixture.id}.calculationScenario.reviewEvidence`;
  if (!isRecord(evidence)) {
    issues.push({
      code: "GOLDEN_FIXTURE_FAILED",
      severity: "error",
      path: basePath,
      message: `Payroll calculation fixture "${fixture.id}" must include reviewer, review date, legal reference, and source evidence hash before it can support production statutory claims.`,
    });
    return;
  }
  if (typeof evidence.reviewedBy !== "string" || !evidence.reviewedBy.trim()) {
    issues.push({
      code: "GOLDEN_FIXTURE_FAILED",
      severity: "error",
      path: `${basePath}.reviewedBy`,
      message: `Payroll calculation fixture "${fixture.id}" must name the reviewer for its executable scenario evidence.`,
    });
  }
  if (typeof evidence.reviewedOn !== "string" || !parseDate(evidence.reviewedOn)) {
    issues.push({
      code: "GOLDEN_FIXTURE_FAILED",
      severity: "error",
      path: `${basePath}.reviewedOn`,
      message: `Payroll calculation fixture "${fixture.id}" must pin an ISO review date for its executable scenario evidence.`,
    });
  }
  if (evidence.legalRef !== fixture.expectedLegalRef) {
    issues.push({
      code: "GOLDEN_FIXTURE_FAILED",
      severity: "error",
      path: `${basePath}.legalRef`,
      message: `Payroll calculation fixture "${fixture.id}" review evidence legalRef must match expectedLegalRef ${fixture.expectedLegalRef}.`,
    });
  }
  if (!validSourceEvidenceHash(evidence.sourceEvidenceHash)) {
    issues.push({
      code: "GOLDEN_FIXTURE_FAILED",
      severity: "error",
      path: `${basePath}.sourceEvidenceHash`,
      message: `Payroll calculation fixture "${fixture.id}" must pin a sha256 source evidence hash for its executable scenario review.`,
    });
  }
}

function validateGoldenFixtures(
  pack: CountryPack,
  issues: RegulatoryPackIssue[],
) {
  pack.goldenFixtures.forEach((fixture, index) => {
    if (fixture.countryCode !== pack.header.countryCode) {
      issues.push({
        code: "GOLDEN_FIXTURE_FAILED",
        severity: "error",
        path: `goldenFixtures[${index}].countryCode`,
        message: `Golden fixture "${fixture.id}" targets ${fixture.countryCode}, but pack ${pack.header.packVersion} is for ${pack.header.countryCode}.`,
      });
    }

    if (fixture.expectedPackVersion !== pack.header.packVersion) {
      issues.push({
        code: "GOLDEN_FIXTURE_FAILED",
        severity: "error",
        path: `goldenFixtures[${index}].expectedPackVersion`,
        message: `Golden fixture "${fixture.id}" expects pack ${fixture.expectedPackVersion}, but this pack is ${pack.header.packVersion}.`,
      });
    }

    if (
      fixture.date < pack.header.effectiveFrom ||
      (pack.header.effectiveTo && fixture.date > pack.header.effectiveTo)
    ) {
      issues.push({
        code: "GOLDEN_FIXTURE_FAILED",
        severity: "error",
        path: `goldenFixtures[${index}].date`,
        message: `Golden fixture "${fixture.id}" is outside the pack effective window.`,
      });
    }

    validateCalculationScenarioReviewEvidence(fixture, issues);

    const envelopes = getParameterEnvelopeArray(pack, fixture.parameterPath);
    const selected = envelopes
      ? selectEffectiveEnvelope(envelopes, fixture.date)
      : null;

    if (!selected) {
      issues.push({
        code: "GOLDEN_FIXTURE_FAILED",
        severity: "error",
        path: `goldenFixtures[${index}]`,
        message: `Golden fixture "${fixture.id}" did not resolve a parameter value.`,
      });
      return;
    }

    if (
      !sameJson(selected.value, fixture.expectedValue) ||
      selected.legalRef !== fixture.expectedLegalRef
    ) {
      issues.push({
        code: "GOLDEN_FIXTURE_FAILED",
        severity: "error",
        path: `goldenFixtures[${index}]`,
        message: `Golden fixture "${fixture.id}" no longer matches the pack data.`,
      });
    }
  });
}

function validateRequiredGoldenFixtureCoverage(
  pack: CountryPack,
  issues: RegulatoryPackIssue[],
) {
  if (pack.header.countryCode !== CAMEROON_COUNTRY_CODE) return;

  const samePackFixturePaths = new Set(
    pack.goldenFixtures
      .filter((fixture) => fixture.countryCode === pack.header.countryCode)
      .filter(
        (fixture) => fixture.expectedPackVersion === pack.header.packVersion,
      )
      .map((fixture) => fixture.parameterPath),
  );

  REQUIRED_CAMEROON_PAYROLL_GOLDEN_FIXTURE_PATHS.forEach((path) => {
    if (samePackFixturePaths.has(path)) return;

    issues.push({
      code: "GOLDEN_FIXTURE_FAILED",
      severity: "error",
      path: "goldenFixtures",
      message: `Required Cameroon payroll golden fixture for "${path}" is missing or not pinned to pack ${pack.header.packVersion}.`,
    });
  });
}

function purposeMatches(purpose: string | undefined, matcher: string) {
  return purpose === matcher || Boolean(purpose?.startsWith(`${matcher}_`));
}

function validatePayrollComponentFixtureFields(
  fixture: CountryPack["goldenFixtures"][number],
  requirement: (typeof REQUIRED_CAMEROON_PAYROLL_COMPONENT_PRODUCTION_FIXTURES)[number],
  issues: RegulatoryPackIssue[],
) {
  if (!fixture.calculationScenario) {
    issues.push({
      code: "GOLDEN_FIXTURE_FAILED",
      severity: "error",
      path: `goldenFixtures.${fixture.id}.calculationScenario`,
      message: `Cameroon payroll ${requirement.label} fixture "${fixture.id}" must include reviewed calculation inputs and expected outputs.`,
    });
    return;
  }

  const input = fixture.calculationScenario.input;
  requirement.requiredInputFields.forEach((field) => {
    if (input[field] !== undefined) return;
    issues.push({
      code: "GOLDEN_FIXTURE_FAILED",
      severity: "error",
      path: `goldenFixtures.${fixture.id}.calculationScenario.input.${field}`,
      message: `Cameroon payroll ${requirement.label} fixture "${fixture.id}" must include ${field} for effective-dated validation.`,
    });
  });

  const expectedOutput = fixture.calculationScenario.expectedOutput;
  requirement.requiredOutputFields.forEach((field) => {
    if (expectedOutput[field] !== undefined) return;
    issues.push({
      code: "GOLDEN_FIXTURE_FAILED",
      severity: "error",
      path: `goldenFixtures.${fixture.id}.calculationScenario.expectedOutput.${field}`,
      message: `Cameroon payroll ${requirement.label} fixture "${fixture.id}" must pin payslip/register tie-out output ${field}.`,
    });
  });
}

function validateCameroonPayrollComponentProductionReadiness(
  pack: CountryPack,
  issues: RegulatoryPackIssue[],
) {
  if (pack.header.countryCode !== CAMEROON_COUNTRY_CODE) return;

  const missingParameterPaths = new Set<string>();

  REQUIRED_CAMEROON_PAYROLL_COMPONENT_PRODUCTION_FIXTURES.forEach(
    (requirement) => {
      const capabilityStatus = getCapabilityStatusForPath(
        pack,
        requirement.capabilityPath,
      );
      if (
        !capabilityStatus ||
        !PRODUCTION_CAPABILITY_STATUSES.has(capabilityStatus)
      ) {
        return;
      }

      if (!getParameterEnvelopeArray(pack, requirement.parameterPath)) {
        missingParameterPaths.add(requirement.parameterPath);
      }

      const fixture = pack.goldenFixtures.find(
        (entry) =>
          entry.countryCode === pack.header.countryCode &&
          entry.expectedPackVersion === pack.header.packVersion &&
          entry.parameterPath === requirement.parameterPath &&
          purposeMatches(entry.purpose, requirement.purposeMatcher),
      );

      if (!fixture) {
        issues.push({
          code: "GOLDEN_FIXTURE_FAILED",
          severity: "error",
          path: "goldenFixtures",
          message: `Cameroon payroll ${requirement.label} production support requires reviewed effective-dated fixture purpose "${requirement.purposeMatcher}" pinned to pack ${pack.header.packVersion}.`,
        });
        return;
      }

      validatePayrollComponentFixtureFields(fixture, requirement, issues);
    },
  );

  missingParameterPaths.forEach((path) => {
    issues.push({
      code: "REQUIRED_PARAMETER_MISSING",
      severity: "error",
      path,
      message: `Cameroon payroll production support requires effective-dated country-pack parameter "${path}".`,
    });
  });
}

function validateCameroonIrppFixtureFields(
  fixture: CountryPack["goldenFixtures"][number],
  requirement: (typeof REQUIRED_CAMEROON_IRPP_PRODUCTION_FIXTURE_REQUIREMENTS)[number],
  issues: RegulatoryPackIssue[],
) {
  if (!fixture.calculationScenario) {
    issues.push({
      code: "GOLDEN_FIXTURE_FAILED",
      severity: "error",
      path: `goldenFixtures.${fixture.id}.calculationScenario`,
      message: `Cameroon IRPP ${requirement.label} fixture "${fixture.id}" must include reviewed calculation inputs and expected outputs.`,
    });
    return;
  }

  const input = fixture.calculationScenario.input;
  requirement.requiredInputFields.forEach((field) => {
    if (input[field] !== undefined) return;
    issues.push({
      code: "GOLDEN_FIXTURE_FAILED",
      severity: "error",
      path: `goldenFixtures.${fixture.id}.calculationScenario.input.${field}`,
      message: `Cameroon IRPP ${requirement.label} fixture "${fixture.id}" must include ${field} for reviewed calculation replay.`,
    });
  });

  const expectedOutput = fixture.calculationScenario.expectedOutput;
  requirement.requiredOutputFields.forEach((field) => {
    if (expectedOutput[field] !== undefined) return;
    issues.push({
      code: "GOLDEN_FIXTURE_FAILED",
      severity: "error",
      path: `goldenFixtures.${fixture.id}.calculationScenario.expectedOutput.${field}`,
      message: `Cameroon IRPP ${requirement.label} fixture "${fixture.id}" must pin calculation output ${field}.`,
    });
  });
}
function validateCameroonIrppProductionReadiness(
  pack: CountryPack,
  issues: RegulatoryPackIssue[],
) {
  if (pack.header.countryCode !== CAMEROON_COUNTRY_CODE) return;

  const capabilityStatus = getCapabilityStatusForPath(
    pack,
    CAMEROON_IRPP_INCOME_TAX_PARAMETER_PATH,
  );
  if (
    !capabilityStatus ||
    !PRODUCTION_CAPABILITY_STATUSES.has(capabilityStatus)
  )
    return;

  const envelopes = getParameterEnvelopeArray(
    pack,
    CAMEROON_IRPP_INCOME_TAX_PARAMETER_PATH,
  );
  const selected = envelopes
    ? selectEffectiveEnvelope(envelopes, pack.header.effectiveFrom)
    : null;
  const rule = isRecord(selected?.value) ? selected.value : null;

  if (!rule || rule.productionCalculationSupported !== true) {
    issues.push({
      code: "CAPABILITY_DECLARATION_INVALID",
      severity: "error",
      path: `${CAMEROON_IRPP_INCOME_TAX_PARAMETER_PATH}.productionCalculationSupported`,
      message:
        "Cameroon IRPP cannot claim production support unless income-tax rules explicitly set productionCalculationSupported: true.",
    });
  }

  const calculationMode =
    typeof rule?.calculationMode === "string" ? rule.calculationMode : null;
  if (
    calculationMode !== "PROGRESSIVE_PERIOD" &&
    calculationMode !== "PROGRESSIVE_YTD"
  ) {
    issues.push({
      code: "CAPABILITY_DECLARATION_INVALID",
      severity: "error",
      path: `${CAMEROON_IRPP_INCOME_TAX_PARAMETER_PATH}.calculationMode`,
      message:
        "Cameroon IRPP production support requires a reviewed progressive calculation mode supported by the payroll tax evaluator.",
    });
  }

  REQUIRED_CAMEROON_IRPP_PRODUCTION_FIXTURE_REQUIREMENTS.forEach((requirement) => {
    const fixture = pack.goldenFixtures.find(
      (entry) =>
        entry.countryCode === pack.header.countryCode &&
        entry.expectedPackVersion === pack.header.packVersion &&
        entry.parameterPath === CAMEROON_IRPP_INCOME_TAX_PARAMETER_PATH &&
        entry.purpose === requirement.purpose,
    );

    if (!fixture) {
      issues.push({
        code: "GOLDEN_FIXTURE_FAILED",
        severity: "error",
        path: "goldenFixtures",
        message: `Cameroon IRPP production support requires reviewed calculation fixture purpose "${requirement.purpose}" pinned to pack ${pack.header.packVersion}.`,
      });
      return;
    }

    validateCameroonIrppFixtureFields(fixture, requirement, issues);
  });
}

export function validateCountryPack(
  pack: CountryPack,
  options: {
    requirePublished?: boolean;
    requireNoExpertReview?: boolean;
    requiredParameterPaths?: readonly string[];
  } = {},
): RegulatoryPackValidationResult {
  const issues: RegulatoryPackIssue[] = [];
  const structural = countryPackSchema.safeParse(pack);

  if (!structural.success) {
    structural.error.issues.forEach((issue) => {
      issues.push({
        code: "STRUCTURAL_SCHEMA_INVALID",
        severity: "error",
        path: issue.path.join("."),
        message: issue.message,
      });
    });
  }

  if (pack.header.hash !== computeCountryPackHash(pack)) {
    issues.push({
      code: "HASH_MISMATCH",
      severity: "error",
      path: "header.hash",
      message: "Country pack hash does not match the canonical pack payload.",
    });
  }

  if (options.requirePublished && pack.header.status !== "PUBLISHED") {
    issues.push({
      code: "PACK_NOT_PUBLISHED",
      severity: "error",
      path: "header.status",
      message:
        "Pack must be PUBLISHED before it can be used by production regulatory consumers.",
    });
  }

  const legalRefIds = new Set<string>();
  pack.header.legalRefs.forEach((legalRef, index) => {
    if (legalRefIds.has(legalRef.id)) {
      issues.push({
        code: "LEGAL_REFERENCE_DUPLICATE",
        severity: "error",
        path: `header.legalRefs[${index}].id`,
        message: `Duplicate legal reference id "${legalRef.id}".`,
      });
    }
    legalRefIds.add(legalRef.id);
  });

  if (!Object.keys(pack.header.capabilityMatrix).length) {
    issues.push({
      code: "CAPABILITY_DECLARATION_INVALID",
      severity: "error",
      path: "header.capabilityMatrix",
      message: "Country packs must declare capability coverage.",
    });
  }

  const requiredPaths =
    options.requiredParameterPaths ?? REQUIRED_CAMEROON_PARAMETER_PATHS;
  requiredPaths.forEach((path) => {
    if (!getParameterEnvelopeArray(pack, path)) {
      issues.push({
        code: "REQUIRED_PARAMETER_MISSING",
        severity: "error",
        path,
        message: `Required regulatory parameter "${path}" is missing or is not effective-dated.`,
      });
    }
  });

  const envelopeArrays: Array<{
    path: string;
    envelopes: RegulatoryEnvelope[];
  }> = [];
  collectEnvelopeArrays(pack.parameters, "", envelopeArrays);
  envelopeArrays.forEach(({ path, envelopes }) => {
    validateEnvelopeArray(
      pack,
      path,
      envelopes,
      legalRefIds,
      issues,
      !!options.requireNoExpertReview,
    );
  });

  validateGoldenFixtures(pack, issues);
  validateRequiredGoldenFixtureCoverage(pack, issues);
  validateCameroonPayrollComponentProductionReadiness(pack, issues);
  validateCameroonIrppProductionReadiness(pack, issues);

  const valid = issues.every((issue) => issue.severity !== "error");
  return {
    valid,
    canPublish: valid && pack.header.status === "PUBLISHED",
    issues,
  };
}

export function validateCountryPackForPublish(pack: CountryPack) {
  return validateCountryPack(pack, {
    requirePublished: true,
    requireNoExpertReview: true,
  });
}
