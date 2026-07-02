import { createHash } from "crypto";
import {
  AccountingPeriodStatus,
  ChartAccountNormalBalance,
  ChartAccountType,
  JournalType,
  PayrollContractStatus,
  PayrollEmployeeStatus,
  Prisma,
} from "@prisma/client";

import { hasAnyRbacPermission } from "../../lib/security/rbac-permissions";
import { db } from "../../prisma/db";
import { BusinessRuleError } from "../_shared/action-errors";
import { DEFAULT_PAYROLL_POSTING_RULES } from "../accounting/default-posting-rules";
import {
  getModuleCatalogEntry,
  normalizeRequestedModuleSlugs,
} from "../modules/module-catalog.service";
import { getCountryPack } from "../regulatory/country-packs/registry";
import { resolveRegulatoryParameter } from "../regulatory/country-packs/resolve";
import { validatePayrollCountryPackCalculationFixtures } from "./payroll-country-pack-fixture-runner";
import {
  buildPayrollStatutoryReviewedProofChain,
  buildPayrollStatutoryScenarioCoverageHash,
  buildPayrollStatutoryScenarioCoverageSummary,
  type PayrollStatutoryReviewedProofChain,
  type PayrollStatutoryScenarioCoverageSummary,
  type PayrollStatutoryScenarioReviewEvidenceSummary,
} from "./payroll-statutory-scenario-coverage.service";

type DbClient = typeof db | Prisma.TransactionClient;

export type PayrollEmployeeSourceMode =
  | "users"
  | "csv"
  | "external"
  | "manual-plan";
export type PayrollSetupIssueSeverity = "BLOCKER" | "WARNING";

export type PayrollSetupReadinessIssue = {
  code: string;
  severity: PayrollSetupIssueSeverity;
  message: string;
  evidence?: Record<string, string | number | boolean | null>;
};

export type PayrollSetupCalculationFixtureStatus =
  | "NOT_CHECKED"
  | "READY"
  | "BLOCKED_BY_COUNTRY_PACK_REVIEW"
  | "NO_EXECUTABLE_SCENARIOS"
  | "FAILED"
  | "COUNTRY_PACK_UNAVAILABLE";

export type PayrollSetupCalculationFixtureEvidence = {
  status: PayrollSetupCalculationFixtureStatus;
  packVersion: string | null;
  executableScenarioCount: number;
  passedScenarioCount: number;
  failedScenarioCount: number;
  issueCount: number;
  issueCodes: string[];
  fixtureIds: string[];
  reviewEvidence: PayrollStatutoryScenarioReviewEvidenceSummary | null;
  scenarioCoverage: PayrollStatutoryScenarioCoverageSummary | null;
  reviewedProofChain: PayrollStatutoryReviewedProofChain | null;
};

export type PayrollSetupReadinessInput = {
  organizationId: string;
  actorId?: string | null;
  actorPermissions?: readonly string[] | null;
  countryCode?: string | null;
  periodStart: Date | string;
  periodEnd: Date | string;
  payDate: Date | string;
  employeeSourceMode?: PayrollEmployeeSourceMode;
  maxRows?: number;
};

export type PayrollSetupReadinessResult = {
  organizationId: string;
  organizationRef: string;
  actorRef: string | null;
  status: "READY" | "BLOCKED";
  dryRunOnly: true;
  generatedAt: string;
  input: {
    countryCode: string | null;
    periodStart: string;
    periodEnd: string;
    payDate: string;
    employeeSourceMode: PayrollEmployeeSourceMode;
    maxRows: number;
  };
  checks: {
    tenant: {
      organizationExists: boolean;
      payrollModuleEntitled: boolean;
      accountingDependencyPresent: boolean;
      actorCanRunSetupReadiness: boolean;
      missingModuleDependencies: string[];
    };
    accounting: {
      settingsStatus: string | null;
      accountingEnabled: boolean;
      payrollMappingCount: number;
      requiredPayrollMappingKeys: string[];
      payrollJournalReady: boolean;
      payrollPostingRuleCodes: string[];
      openAccountingPeriodId: string | null;
    };
    countryPack: {
      countryCode: string | null;
      checked: boolean;
      requiredParameterPaths: string[];
      capabilityStatuses: string[];
      packVersions: string[];
      resolutionHashes: string[];
      calculationFixtures: PayrollSetupCalculationFixtureEvidence;
    };
    employeeUserMapping: {
      sourceMode: PayrollEmployeeSourceMode;
      activeUserCount: number;
      payrollEmployeeCount: number;
      mappedPayrollEmployeeCount: number;
      usersWithoutPayrollEmployeeCount: number;
      payrollEmployeesWithoutUserCount: number;
      missingUserReferenceCount: number;
      plannedEmployeeCreateCount: number;
      activeContractReadyCount: number;
      paymentDestinationReadyCount: number;
    };
  };
  blockers: PayrollSetupReadinessIssue[];
  warnings: PayrollSetupReadinessIssue[];
};

type IssueInput = Omit<PayrollSetupReadinessIssue, "severity"> & {
  severity?: PayrollSetupIssueSeverity;
};

const PAYROLL_SETUP_ADMIN_PERMISSIONS = [
  "payroll.runs.calculate",
  "payroll.runs.approve",
  "payroll.runs.post",
] as const;

const PAYROLL_ACCOUNT_MAPPING_SPECS = [
  {
    key: "PAYROLL_GROSS_EXPENSE",
    label: "gross payroll expense",
    type: ChartAccountType.EXPENSE,
    normalBalance: ChartAccountNormalBalance.DEBIT,
  },
  {
    key: "PAYROLL_EMPLOYER_CHARGE_EXPENSE",
    label: "employer payroll charge expense",
    type: ChartAccountType.EXPENSE,
    normalBalance: ChartAccountNormalBalance.DEBIT,
  },
  {
    key: "EMPLOYEE_PAYABLES",
    label: "employee payables",
    type: ChartAccountType.LIABILITY,
    normalBalance: ChartAccountNormalBalance.CREDIT,
  },
  {
    key: "EMPLOYEE_RECEIVABLES",
    label: "employee receivables",
    type: ChartAccountType.ASSET,
    normalBalance: ChartAccountNormalBalance.DEBIT,
  },
  {
    key: "PAYROLL_WITHHOLDING_PAYABLE",
    label: "payroll withholding payable",
    type: ChartAccountType.LIABILITY,
    normalBalance: ChartAccountNormalBalance.CREDIT,
  },
  {
    key: "SOCIAL_CONTRIBUTIONS_PAYABLE",
    label: "social contributions payable",
    type: ChartAccountType.LIABILITY,
    normalBalance: ChartAccountNormalBalance.CREDIT,
  },
] as const;

const PAYROLL_PAYMENT_RAIL_MAPPING_KEYS = [
  "BANK",
  "CASH_ON_HAND",
  "MOBILE_MONEY_CLEARING",
  "CHEQUE_CLEARING",
] as const;

export const REQUIRED_PAYROLL_ACCOUNT_MAPPING_KEYS =
  PAYROLL_ACCOUNT_MAPPING_SPECS.map((item) => item.key);
export const REQUIRED_PAYROLL_POSTING_RULE_CODES =
  DEFAULT_PAYROLL_POSTING_RULES.map((rule) => rule.code);
export const REQUIRED_PAYROLL_COUNTRY_PACK_PARAMETER_PATHS = [
  "payroll.cnps.pensionRatesBps",
  "payroll.cnps.familyAllowanceRatesBps",
  "payroll.cnps.occupationalRiskRatesBps",
  "payroll.cnps.employerRules",
  "payroll.irpp.incomeTaxRules",
  "payroll.compensation.allowances",
  "payroll.compensation.benefits",
  "payroll.attendance.leave",
  "payroll.attendance.overtime",
] as const;

const PRODUCTION_PAYROLL_COUNTRY_PACK_CAPABILITY_STATUSES = new Set([
  "SUPPORTED",
  "SUPPORTED_CERTIFIED",
]);

function normalizeDate(value: Date | string) {
  const parsed =
    value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BusinessRuleError(
      "Payroll setup readiness received an invalid date.",
    );
  }
  return parsed;
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function normalizeCountryCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "CAMEROON") return "CM";
  return normalized.length === 2 ? normalized : null;
}

function normalizeMappingKey(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function emptyCalculationFixtureEvidence(
  status: PayrollSetupCalculationFixtureStatus,
  packVersion: string | null = null,
): PayrollSetupCalculationFixtureEvidence {
  return {
    status,
    packVersion,
    executableScenarioCount: 0,
    passedScenarioCount: 0,
    failedScenarioCount: 0,
    issueCount: 0,
    issueCodes: [],
    fixtureIds: [],
    reviewEvidence: null,
    scenarioCoverage: null,
    reviewedProofChain: null,
  };
}

export function redactPayrollSetupRef(value?: string | null) {
  if (!value) return null;
  return `redacted:${createHash("sha256").update(value).digest("hex").slice(0, 12)}`;
}

function addIssue(target: PayrollSetupReadinessIssue[], input: IssueInput) {
  target.push({
    severity: input.severity ?? "BLOCKER",
    code: input.code,
    message: input.message,
    evidence: input.evidence,
  });
}

function evaluatePayrollModuleReadiness(
  requestedModules: readonly string[] | null | undefined,
) {
  const catalogEntry = getModuleCatalogEntry("payroll");
  const normalized = normalizeRequestedModuleSlugs(requestedModules);
  const hasRequestedModules = (requestedModules?.length ?? 0) > 0;
  const entitlementPresent = Boolean(
    catalogEntry &&
    (!hasRequestedModules || normalized.slugs.includes("payroll")),
  );
  const requestedSet = new Set(normalized.slugs);
  const missingDependencies =
    !catalogEntry || !entitlementPresent
      ? []
      : catalogEntry.dependencies
          .filter((dependency) => dependency.dependencyType === "required")
          .filter(
            (dependency) =>
              hasRequestedModules &&
              !requestedSet.has(dependency.dependsOnSlug),
          )
          .map((dependency) => dependency.dependsOnSlug);

  return {
    entitled: entitlementPresent && missingDependencies.length === 0,
    accountingDependencyPresent:
      !hasRequestedModules || requestedSet.has("accounting"),
    missingDependencies,
  };
}

function isEffectiveOn(
  rule: { effectiveFrom: Date | null; effectiveTo: Date | null },
  date: Date,
) {
  return (
    (!rule.effectiveFrom || rule.effectiveFrom <= date) &&
    (!rule.effectiveTo || rule.effectiveTo >= date)
  );
}

function buildResult(
  input: PayrollSetupReadinessInput,
  normalizedInput: PayrollSetupReadinessResult["input"],
  checks: PayrollSetupReadinessResult["checks"],
  blockers: PayrollSetupReadinessIssue[],
  warnings: PayrollSetupReadinessIssue[],
): PayrollSetupReadinessResult {
  return {
    organizationId: input.organizationId,
    organizationRef:
      redactPayrollSetupRef(input.organizationId) ?? "redacted:unknown",
    actorRef: redactPayrollSetupRef(input.actorId),
    status: blockers.length > 0 ? "BLOCKED" : "READY",
    dryRunOnly: true,
    generatedAt: new Date().toISOString(),
    input: normalizedInput,
    checks,
    blockers,
    warnings,
  };
}

export async function getPayrollSetupReadiness(
  input: PayrollSetupReadinessInput,
  client: DbClient = db,
): Promise<PayrollSetupReadinessResult> {
  const periodStart = normalizeDate(input.periodStart);
  const periodEnd = normalizeDate(input.periodEnd);
  const payDate = normalizeDate(input.payDate);
  const employeeSourceMode = input.employeeSourceMode ?? "users";
  const maxRows = Math.max(1, Math.min(input.maxRows ?? 250, 1000));
  const blockers: PayrollSetupReadinessIssue[] = [];
  const warnings: PayrollSetupReadinessIssue[] = [];

  if (periodEnd < periodStart) {
    addIssue(blockers, {
      code: "PAYROLL_PERIOD_RANGE_INVALID",
      message:
        "Payroll period end date must be on or after the period start date.",
    });
  }

  const normalizedInput = {
    countryCode: normalizeCountryCode(input.countryCode),
    periodStart: isoDate(periodStart),
    periodEnd: isoDate(periodEnd),
    payDate: isoDate(payDate),
    employeeSourceMode,
    maxRows,
  };

  const organization = await client.organization.findFirst({
    where: { id: input.organizationId, deletedAt: null },
    select: {
      id: true,
      country: true,
      countryCode: true,
      requestedModules: true,
    },
  });

  if (!organization) {
    addIssue(blockers, {
      code: "ORGANIZATION_NOT_FOUND",
      message: "Payroll setup readiness requires an active organization.",
    });

    return buildResult(
      input,
      normalizedInput,
      {
        tenant: {
          organizationExists: false,
          payrollModuleEntitled: false,
          accountingDependencyPresent: false,
          actorCanRunSetupReadiness: false,
          missingModuleDependencies: [],
        },
        accounting: {
          settingsStatus: null,
          accountingEnabled: false,
          payrollMappingCount: 0,
          requiredPayrollMappingKeys: [
            ...REQUIRED_PAYROLL_ACCOUNT_MAPPING_KEYS,
          ],
          payrollJournalReady: false,
          payrollPostingRuleCodes: [],
          openAccountingPeriodId: null,
        },
        countryPack: {
          countryCode: normalizedInput.countryCode,
          checked: false,
          requiredParameterPaths: [
            ...REQUIRED_PAYROLL_COUNTRY_PACK_PARAMETER_PATHS,
          ],
          capabilityStatuses: [],
          packVersions: [],
          resolutionHashes: [],
          calculationFixtures: emptyCalculationFixtureEvidence("NOT_CHECKED"),
        },
        employeeUserMapping: {
          sourceMode: employeeSourceMode,
          activeUserCount: 0,
          payrollEmployeeCount: 0,
          mappedPayrollEmployeeCount: 0,
          usersWithoutPayrollEmployeeCount: 0,
          payrollEmployeesWithoutUserCount: 0,
          missingUserReferenceCount: 0,
          plannedEmployeeCreateCount: 0,
          activeContractReadyCount: 0,
          paymentDestinationReadyCount: 0,
        },
      },
      blockers,
      warnings,
    );
  }

  const countryCode =
    normalizeCountryCode(input.countryCode) ??
    normalizeCountryCode(organization.countryCode) ??
    normalizeCountryCode(organization.country);
  normalizedInput.countryCode = countryCode;

  const moduleDecision = evaluatePayrollModuleReadiness(
    organization.requestedModules,
  );
  if (!moduleDecision.entitled) {
    addIssue(blockers, {
      code: "PAYROLL_MODULE_NOT_READY",
      message:
        "Tenant payroll module entitlement or required module dependencies are not ready.",
      evidence: {
        missingDependencyCount: moduleDecision.missingDependencies.length,
      },
    });
  }
  if (!moduleDecision.accountingDependencyPresent) {
    addIssue(blockers, {
      code: "PAYROLL_ACCOUNTING_DEPENDENCY_MISSING",
      message:
        "Payroll rollout requires the tenant accounting module dependency to be selected and ready.",
    });
  }

  const actorCanRunSetupReadiness = hasAnyRbacPermission(
    input.actorPermissions,
    PAYROLL_SETUP_ADMIN_PERMISSIONS,
  );
  if (!actorCanRunSetupReadiness) {
    addIssue(blockers, {
      code: "PAYROLL_SETUP_PERMISSION_MISSING",
      message:
        "Actor lacks payroll setup/control permission for this readiness dry-run.",
    });
  }

  const [
    accountingSettings,
    mappedAccounts,
    payrollJournals,
    postingRules,
    openAccountingPeriod,
    users,
    payrollEmployees,
  ] = await Promise.all([
    client.organizationAccountingSettings.findUnique({
      where: { organizationId: input.organizationId },
      select: {
        accountingEnabled: true,
        setupStatus: true,
        payrollCnpsFamilyAllowanceSector: true,
        payrollCnpsOccupationalRiskGroup: true,
      },
    }),
    client.chartOfAccount.findMany({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        mappingKey: {
          in: [
            ...REQUIRED_PAYROLL_ACCOUNT_MAPPING_KEYS,
            ...PAYROLL_PAYMENT_RAIL_MAPPING_KEYS,
          ],
        },
      },
      include: { _count: { select: { children: true } } },
    }),
    client.journal.findMany({
      where: {
        organizationId: input.organizationId,
        type: JournalType.PAYROLL,
      },
      select: { id: true, code: true, isActive: true, isDefault: true },
    }),
    client.postingRule.findMany({
      where: {
        organizationId: input.organizationId,
        code: { in: [...REQUIRED_PAYROLL_POSTING_RULE_CODES] },
      },
      include: {
        lines: {
          include: {
            account: { include: { _count: { select: { children: true } } } },
          },
          orderBy: { lineNumber: "asc" },
        },
      },
    }),
    client.accountingPeriod.findFirst({
      where: {
        organizationId: input.organizationId,
        status: AccountingPeriodStatus.OPEN,
        startDate: { lte: payDate },
        endDate: { gte: payDate },
      },
      select: { id: true, name: true },
      orderBy: { startDate: "desc" },
    }),
    client.user.findMany({
      where: { organizationId: input.organizationId, isActive: true },
      take: maxRows + 1,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        isActive: true,
      },
    }),
    client.payrollEmployee.findMany({
      where: { organizationId: input.organizationId, deletedAt: null },
      take: maxRows + 1,
      select: {
        id: true,
        userId: true,
        status: true,
        paymentDestinationHash: true,
        bankAccountHash: true,
        mobileMoneyPhoneHash: true,
        contracts: {
          where: {
            deletedAt: null,
            status: PayrollContractStatus.ACTIVE,
            effectiveFrom: { lte: periodEnd },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }],
          },
          select: { id: true, signedDocumentHash: true },
        },
      },
    }),
  ]);

  if (!accountingSettings) {
    addIssue(blockers, {
      code: "ACCOUNTING_SETTINGS_MISSING",
      message:
        "Accounting settings must exist before payroll setup can be marked ready.",
    });
  } else if (
    !accountingSettings.accountingEnabled ||
    accountingSettings.setupStatus !== "READY"
  ) {
    addIssue(blockers, {
      code: "ACCOUNTING_SETUP_NOT_READY_FOR_PAYROLL",
      message:
        "Accounting setup must be enabled and READY before payroll setup can proceed.",
      evidence: {
        accountingEnabled: accountingSettings.accountingEnabled,
        setupStatus: accountingSettings.setupStatus,
      },
    });
  }

  if (countryCode === "CM" && accountingSettings) {
    if (!accountingSettings.payrollCnpsFamilyAllowanceSector) {
      addIssue(blockers, {
        code: "PAYROLL_CNPS_FAMILY_ALLOWANCE_SECTOR_MISSING",
        message:
          "Cameroon payroll setup requires a CNPS family-allowance sector before statutory calculation.",
      });
    }
    if (!accountingSettings.payrollCnpsOccupationalRiskGroup) {
      addIssue(blockers, {
        code: "PAYROLL_CNPS_OCCUPATIONAL_RISK_GROUP_MISSING",
        message:
          "Cameroon payroll setup requires a CNPS occupational-risk group before statutory calculation.",
      });
    }
  }

  const accountsByMapping = new Map(
    mappedAccounts.map((account) => [
      normalizeMappingKey(account.mappingKey),
      account,
    ]),
  );
  for (const required of PAYROLL_ACCOUNT_MAPPING_SPECS) {
    const account = accountsByMapping.get(required.key);
    if (!account) {
      addIssue(blockers, {
        code: "PAYROLL_ACCOUNT_MAPPING_MISSING",
        message: `Missing ${required.label} account mapping.`,
        evidence: { mappingKey: required.key },
      });
      continue;
    }

    if (!account.isActive) {
      addIssue(blockers, {
        code: "PAYROLL_ACCOUNT_MAPPING_INACTIVE",
        message: `Payroll account mapping ${required.key} points to an inactive account.`,
        evidence: { mappingKey: required.key },
      });
    }
    if (account._count.children > 0) {
      addIssue(blockers, {
        code: "PAYROLL_ACCOUNT_MAPPING_NOT_LEAF",
        message: `Payroll account mapping ${required.key} must point to a leaf account.`,
        evidence: { mappingKey: required.key },
      });
    }
    if (
      account.type !== required.type ||
      account.normalBalance !== required.normalBalance
    ) {
      addIssue(blockers, {
        code: "PAYROLL_ACCOUNT_MAPPING_CLASSIFICATION_INVALID",
        message: `Payroll account mapping ${required.key} has an incompatible account type or normal balance.`,
        evidence: { mappingKey: required.key },
      });
    }
  }

  for (const railKey of PAYROLL_PAYMENT_RAIL_MAPPING_KEYS) {
    const account = accountsByMapping.get(railKey);
    if (!account) {
      addIssue(blockers, {
        code: "PAYROLL_PAYMENT_RAIL_MAPPING_MISSING",
        message: `Payroll payment posting requires the ${railKey} mapping used by the payment rule.`,
        evidence: { mappingKey: railKey },
      });
      continue;
    }
    if (!account.isActive || account._count.children > 0) {
      addIssue(blockers, {
        code: "PAYROLL_PAYMENT_RAIL_MAPPING_NOT_POSTABLE",
        message: `Payroll payment rail mapping ${railKey} must be active and leaf-postable.`,
        evidence: { mappingKey: railKey },
      });
    }
  }

  const defaultPayrollJournal = payrollJournals.find(
    (journal) => journal.isActive && journal.isDefault,
  );
  if (!defaultPayrollJournal) {
    addIssue(blockers, {
      code: "PAYROLL_JOURNAL_MISSING",
      message:
        "An active default payroll journal is required before payroll posting.",
    });
  }

  for (const template of DEFAULT_PAYROLL_POSTING_RULES) {
    const rule = postingRules.find((item) => item.code === template.code);
    if (!rule) {
      addIssue(blockers, {
        code: "PAYROLL_POSTING_RULE_MISSING",
        message: `Missing payroll posting rule ${template.code}.`,
        evidence: { postingRuleCode: template.code },
      });
      continue;
    }

    if (!rule.isActive || !isEffectiveOn(rule, payDate)) {
      addIssue(blockers, {
        code: "PAYROLL_POSTING_RULE_NOT_EFFECTIVE",
        message: `Payroll posting rule ${template.code} must be active and effective on the pay date.`,
        evidence: { postingRuleCode: template.code },
      });
    }
    if (
      rule.sourceType !== template.sourceType ||
      rule.postingPurpose !== template.postingPurpose
    ) {
      addIssue(blockers, {
        code: "PAYROLL_POSTING_RULE_SCOPE_INVALID",
        message: `Payroll posting rule ${template.code} has the wrong source type or posting purpose.`,
        evidence: { postingRuleCode: template.code },
      });
    }

    const hasDebit = rule.lines.some((line) => line.side === "DEBIT");
    const hasCredit = rule.lines.some((line) => line.side === "CREDIT");
    if (!hasDebit || !hasCredit || rule.lines.length < 2) {
      addIssue(blockers, {
        code: "PAYROLL_POSTING_RULE_UNBALANCED_SCAFFOLD",
        message: `Payroll posting rule ${template.code} must contain debit and credit posting lines.`,
        evidence: { postingRuleCode: template.code },
      });
    }

    for (const templateLine of template.lines) {
      const matchingLine = rule.lines.find(
        (line) =>
          line.lineNumber === templateLine.lineNumber &&
          line.side === templateLine.side &&
          line.amountSource === templateLine.amountSource &&
          (Boolean(line.accountId) ||
            normalizeMappingKey(line.mappingKey) === templateLine.mappingKey),
      );

      if (!matchingLine) {
        addIssue(blockers, {
          code: "PAYROLL_POSTING_RULE_LINE_MISSING",
          message: `Payroll posting rule ${template.code} is missing the expected line ${templateLine.lineNumber}.`,
          evidence: {
            postingRuleCode: template.code,
            lineNumber: templateLine.lineNumber,
          },
        });
        continue;
      }

      if (
        !matchingLine.accountId &&
        !accountsByMapping.get(normalizeMappingKey(matchingLine.mappingKey))
      ) {
        addIssue(blockers, {
          code: "PAYROLL_POSTING_RULE_LINE_MAPPING_UNRESOLVED",
          message: `Payroll posting rule ${template.code} references an unmapped posting line.`,
          evidence: {
            postingRuleCode: template.code,
            lineNumber: matchingLine.lineNumber,
          },
        });
      }
      if (
        matchingLine.account &&
        (!matchingLine.account.isActive ||
          matchingLine.account._count.children > 0)
      ) {
        addIssue(blockers, {
          code: "PAYROLL_POSTING_RULE_LINE_ACCOUNT_NOT_POSTABLE",
          message: `Payroll posting rule ${template.code} line ${matchingLine.lineNumber} uses a non-postable account.`,
          evidence: {
            postingRuleCode: template.code,
            lineNumber: matchingLine.lineNumber,
          },
        });
      }
    }
  }

  if (!openAccountingPeriod) {
    addIssue(blockers, {
      code: "PAYROLL_PAY_DATE_PERIOD_CLOSED_OR_MISSING",
      message: "No open accounting period covers the payroll pay date.",
    });
  }

  const countryPackStatuses: string[] = [];
  const countryPackVersions: string[] = [];
  const countryPackResolutionHashes: string[] = [];
  if (!countryCode) {
    addIssue(blockers, {
      code: "PAYROLL_COUNTRY_CODE_MISSING",
      message: "Payroll setup readiness requires a country code.",
    });
  } else {
    for (const parameterPath of REQUIRED_PAYROLL_COUNTRY_PACK_PARAMETER_PATHS) {
      try {
        const resolution = resolveRegulatoryParameter(parameterPath, {
          countryCode,
          date: payDate,
          purpose: "PAYROLL_SETUP_READINESS",
          entityProfile: { countryCode },
        });
        countryPackStatuses.push(resolution.capabilityStatus);
        countryPackVersions.push(resolution.packVersion);
        countryPackResolutionHashes.push(resolution.resolutionHash);

        if (
          !["SUPPORTED", "SUPPORTED_CERTIFIED"].includes(
            resolution.capabilityStatus,
          )
        ) {
          addIssue(blockers, {
            code: "PAYROLL_COUNTRY_PACK_REQUIRES_REVIEW",
            message:
              "Payroll country-pack capability is not production-supported for this readiness check.",
            evidence: {
              parameterPath,
              capabilityStatus: resolution.capabilityStatus,
            },
          });
        }
      } catch (error) {
        addIssue(blockers, {
          code: "PAYROLL_COUNTRY_PACK_UNAVAILABLE",
          message: "Payroll country-pack parameter resolution failed.",
          evidence: {
            parameterPath,
            errorName: error instanceof Error ? error.name : "UnknownError",
          },
        });
      }
    }
  }

  const uniqueCountryPackVersions = uniqueValues(countryPackVersions);
  const countryPackVersion = uniqueCountryPackVersions[0] ?? null;
  const countryPackCapabilitiesProductionReady =
    countryPackStatuses.length ===
      REQUIRED_PAYROLL_COUNTRY_PACK_PARAMETER_PATHS.length &&
    countryPackStatuses.every((status) =>
      PRODUCTION_PAYROLL_COUNTRY_PACK_CAPABILITY_STATUSES.has(status),
    );
  let calculationFixtures = emptyCalculationFixtureEvidence(
    countryCode ? "COUNTRY_PACK_UNAVAILABLE" : "NOT_CHECKED",
    countryPackVersion,
  );

  if (countryCode && countryPackVersion) {
    const countryPack = getCountryPack(countryCode, countryPackVersion);
    if (!countryPack) {
      addIssue(blockers, {
        code: "PAYROLL_COUNTRY_PACK_CALCULATION_FIXTURE_PACK_UNAVAILABLE",
        message:
          "Payroll setup could not load the active country pack for calculation fixture evidence.",
        evidence: { countryCode, packVersion: countryPackVersion },
      });
    } else {
      const fixtureValidation =
        validatePayrollCountryPackCalculationFixtures(countryPack);
      const scenarioCoverage = buildPayrollStatutoryScenarioCoverageSummary(
        countryPack,
        fixtureValidation,
      );
      const passedScenarioCount = fixtureValidation.runs.filter(
        (run) => run.status === "PASSED",
      ).length;
      const failedScenarioCount = fixtureValidation.runs.filter(
        (run) => run.status === "FAILED",
      ).length;
      const issueCodes = uniqueValues(
        fixtureValidation.issues.map((issue) => issue.code),
      );
      const fixtureIds = uniqueValues([
        ...fixtureValidation.runs.map((run) => run.fixtureId),
        ...fixtureValidation.issues.map((issue) => issue.fixtureId),
      ]);
      let fixtureStatus: PayrollSetupCalculationFixtureStatus = "READY";

      if (!fixtureValidation.valid) {
        fixtureStatus = "FAILED";
        addIssue(blockers, {
          code: "PAYROLL_COUNTRY_PACK_CALCULATION_FIXTURES_FAILED",
          message:
            "Executable payroll country-pack calculation fixtures must pass before full production readiness.",
          evidence: {
            packVersion: countryPackVersion,
            executableScenarioCount: fixtureValidation.runs.length,
            issueCount: fixtureValidation.issues.length,
            issueCodes: issueCodes.join(", ") || null,
          },
        });
      } else if (fixtureValidation.runs.length === 0) {
        fixtureStatus = countryPackCapabilitiesProductionReady
          ? "NO_EXECUTABLE_SCENARIOS"
          : "BLOCKED_BY_COUNTRY_PACK_REVIEW";
        if (countryPackCapabilitiesProductionReady) {
          addIssue(blockers, {
            code: "PAYROLL_COUNTRY_PACK_CALCULATION_FIXTURES_MISSING",
            message:
              "Production-supported payroll country-pack capabilities require executable calculation scenario fixtures.",
            evidence: { packVersion: countryPackVersion },
          });
        }
      } else if (!countryPackCapabilitiesProductionReady) {
        fixtureStatus = "BLOCKED_BY_COUNTRY_PACK_REVIEW";
      }

      const scenarioCoverageHash = buildPayrollStatutoryScenarioCoverageHash({
        status: scenarioCoverage.status,
        countryCode: scenarioCoverage.countryCode,
        packVersion: scenarioCoverage.packVersion,
        executableScenarioCount: scenarioCoverage.executableScenarioCount,
        readyFamilyCount: scenarioCoverage.readyFamilyCount,
        requiredFamilyCount: scenarioCoverage.requiredFamilyCount,
        blockerCodes: scenarioCoverage.blockers.map((blocker) => blocker.code),
        reviewEvidence: scenarioCoverage.reviewEvidence,
      });
      const reviewedProofChain = buildPayrollStatutoryReviewedProofChain({
        status: scenarioCoverage.status,
        coverageHash: scenarioCoverageHash,
        reviewEvidence: scenarioCoverage.reviewEvidence,
        readyFamilyCount: scenarioCoverage.readyFamilyCount,
        requiredFamilyCount: scenarioCoverage.requiredFamilyCount,
        blockerCodes: scenarioCoverage.blockers.map((blocker) => blocker.code),
      });

      if (scenarioCoverage.status === "BLOCKED") {
        addIssue(blockers, {
          code: "PAYROLL_STATUTORY_SCENARIO_COVERAGE_INCOMPLETE",
          message:
            "Full-production payroll requires reviewed executable scenario coverage across statutory, adjustment, correction, allowance, benefit, leave, and overtime families.",
          evidence: {
            packVersion: countryPackVersion,
            readyFamilyCount: scenarioCoverage.readyFamilyCount,
            requiredFamilyCount: scenarioCoverage.requiredFamilyCount,
            blockedFamilyCount: scenarioCoverage.blockers.length,
            missingReviewEvidenceCount:
              scenarioCoverage.reviewEvidence.missingCount,
            reviewEvidenceSourceHashes:
              scenarioCoverage.reviewEvidence.sourceEvidenceHashes.join(", ") ||
              null,
            reviewedProofChainStatus: reviewedProofChain.status,
            reviewedProofChainCoverageHash: reviewedProofChain.coverageHash,
            blockerCodes:
              uniqueValues(
                scenarioCoverage.blockers.map((item) => item.code),
              ).join(", ") || null,
          },
        });
      }

      calculationFixtures = {
        status: fixtureStatus,
        packVersion: countryPackVersion,
        executableScenarioCount: fixtureValidation.runs.length,
        passedScenarioCount,
        failedScenarioCount,
        issueCount: fixtureValidation.issues.length,
        issueCodes,
        fixtureIds,
        reviewEvidence: scenarioCoverage.reviewEvidence,
        scenarioCoverage,
        reviewedProofChain,
      };
    }
  }
  if (employeeSourceMode !== "users") {
    addIssue(blockers, {
      code: "PAYROLL_EMPLOYEE_SOURCE_ADAPTER_NOT_IMPLEMENTED",
      message:
        "Only the existing users source can be dry-run scanned in this slice.",
      evidence: { sourceMode: employeeSourceMode },
    });
  }

  if (users.length > maxRows || payrollEmployees.length > maxRows) {
    addIssue(warnings, {
      severity: "WARNING",
      code: "PAYROLL_DRY_RUN_SCAN_LIMIT_REACHED",
      message:
        "Dry-run scan reached maxRows and returned count-limited readiness evidence.",
      evidence: { maxRows },
    });
  }

  const scannedUsers = users.slice(0, maxRows);
  const scannedPayrollEmployees = payrollEmployees.slice(0, maxRows);
  const userIds = new Set(scannedUsers.map((user) => user.id));
  const payrollEmployeeUserIds = new Set(
    scannedPayrollEmployees
      .map((employee) => employee.userId)
      .filter((userId): userId is string => Boolean(userId)),
  );
  const missingUserReferenceCount = scannedPayrollEmployees.filter(
    (employee) => employee.userId && !userIds.has(employee.userId),
  ).length;
  const usersWithoutPayrollEmployeeCount = scannedUsers.filter(
    (user) => !payrollEmployeeUserIds.has(user.id),
  ).length;
  const payrollEmployeesWithoutUserCount = scannedPayrollEmployees.filter(
    (employee) => !employee.userId,
  ).length;
  const activePayrollEmployees = scannedPayrollEmployees.filter(
    (employee) => employee.status === PayrollEmployeeStatus.ACTIVE,
  );
  const activeContractReadyCount = activePayrollEmployees.filter((employee) =>
    employee.contracts.some((contract) => Boolean(contract.signedDocumentHash)),
  ).length;
  const paymentDestinationReadyCount = activePayrollEmployees.filter(
    (employee) =>
      Boolean(
        employee.paymentDestinationHash ||
        employee.bankAccountHash ||
        employee.mobileMoneyPhoneHash,
      ),
  ).length;

  if (employeeSourceMode === "users" && scannedUsers.length === 0) {
    addIssue(blockers, {
      code: "PAYROLL_EMPLOYEE_SOURCE_EMPTY",
      message:
        "No active tenant users are available for payroll employee mapping dry-run.",
    });
  }
  if (missingUserReferenceCount > 0) {
    addIssue(blockers, {
      code: "PAYROLL_EMPLOYEE_USER_REFERENCE_MISSING",
      message:
        "One or more payroll employees reference users that are not active in this tenant.",
      evidence: { missingUserReferenceCount },
    });
  }
  if (payrollEmployeesWithoutUserCount > 0) {
    addIssue(warnings, {
      severity: "WARNING",
      code: "PAYROLL_EMPLOYEE_USER_MAPPING_INCOMPLETE",
      message: "Some payroll employees are not linked to platform users yet.",
      evidence: { payrollEmployeesWithoutUserCount },
    });
  }
  if (activePayrollEmployees.length > activeContractReadyCount) {
    addIssue(warnings, {
      severity: "WARNING",
      code: "PAYROLL_CONTRACT_EVIDENCE_INCOMPLETE",
      message:
        "Active payroll employees need active contracts with signed document hashes before calculation.",
      evidence: {
        activePayrollEmployeeCount: activePayrollEmployees.length,
        activeContractReadyCount,
      },
    });
  }
  if (activePayrollEmployees.length > paymentDestinationReadyCount) {
    addIssue(warnings, {
      severity: "WARNING",
      code: "PAYROLL_PAYMENT_DESTINATION_EVIDENCE_INCOMPLETE",
      message:
        "Payment release remains blocked until active employees have hashed payment destination evidence.",
      evidence: {
        activePayrollEmployeeCount: activePayrollEmployees.length,
        paymentDestinationReadyCount,
      },
    });
  }

  const checks: PayrollSetupReadinessResult["checks"] = {
    tenant: {
      organizationExists: true,
      payrollModuleEntitled: moduleDecision.entitled,
      accountingDependencyPresent: moduleDecision.accountingDependencyPresent,
      actorCanRunSetupReadiness,
      missingModuleDependencies: moduleDecision.missingDependencies,
    },
    accounting: {
      settingsStatus: accountingSettings?.setupStatus ?? null,
      accountingEnabled: accountingSettings?.accountingEnabled ?? false,
      payrollMappingCount: mappedAccounts.filter((account) =>
        REQUIRED_PAYROLL_ACCOUNT_MAPPING_KEYS.includes(
          normalizeMappingKey(account.mappingKey) as never,
        ),
      ).length,
      requiredPayrollMappingKeys: [...REQUIRED_PAYROLL_ACCOUNT_MAPPING_KEYS],
      payrollJournalReady: Boolean(defaultPayrollJournal),
      payrollPostingRuleCodes: postingRules
        .filter((rule) => rule.isActive && isEffectiveOn(rule, payDate))
        .map((rule) => rule.code),
      openAccountingPeriodId: openAccountingPeriod?.id ?? null,
    },
    countryPack: {
      countryCode,
      checked: Boolean(countryCode),
      requiredParameterPaths: [
        ...REQUIRED_PAYROLL_COUNTRY_PACK_PARAMETER_PATHS,
      ],
      capabilityStatuses: uniqueValues(countryPackStatuses),
      packVersions: uniqueCountryPackVersions,
      resolutionHashes: uniqueValues(countryPackResolutionHashes),
      calculationFixtures,
    },
    employeeUserMapping: {
      sourceMode: employeeSourceMode,
      activeUserCount: scannedUsers.length,
      payrollEmployeeCount: scannedPayrollEmployees.length,
      mappedPayrollEmployeeCount: payrollEmployeeUserIds.size,
      usersWithoutPayrollEmployeeCount,
      payrollEmployeesWithoutUserCount,
      missingUserReferenceCount,
      plannedEmployeeCreateCount:
        employeeSourceMode === "users" ? usersWithoutPayrollEmployeeCount : 0,
      activeContractReadyCount,
      paymentDestinationReadyCount,
    },
  };

  return buildResult(input, normalizedInput, checks, blockers, warnings);
}
