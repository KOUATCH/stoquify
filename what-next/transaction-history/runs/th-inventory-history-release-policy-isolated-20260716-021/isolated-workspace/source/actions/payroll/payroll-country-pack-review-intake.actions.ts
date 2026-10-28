"use server";

import { protect } from "@/services/_shared/protect";
import { BusinessRuleError } from "@/services/_shared/action-errors";
import {
  getCountryPack,
  getCountryPacks,
} from "@/services/regulatory/country-packs/registry";
import {
  countryPackSchema,
  type CountryPack,
} from "@/services/regulatory/country-packs/schemas";
import {
  buildPayrollCountryPackReviewIntakeCertificate,
  type PayrollCountryPackReviewIntakeCertificate,
  type PayrollCountryPackReviewTopicEvidence,
} from "@/services/payroll/payroll-country-pack-review-intake.service";
import {
  approvePayrollCountryPackReviewIntakeCertificate,
  recordPayrollCountryPackReviewIntakeCertificate,
  type PayrollCountryPackReviewIntakeApproval,
  type PayrollCountryPackReviewIntakeRecordedCertificate,
} from "@/services/payroll/payroll-country-pack-review-intake-persistence.service";
import type { PayrollStatutoryScenarioFamily } from "@/services/payroll/payroll-statutory-scenario-coverage.service";

export type {
  PayrollCountryPackReviewIntakeApproval,
  PayrollCountryPackReviewIntakeCertificate,
  PayrollCountryPackReviewIntakeRecordedCertificate,
};

const PAYROLL_COUNTRY_PACK_INTAKE_PERMISSION = "payroll.runs.calculate";
const PAYROLL_COUNTRY_PACK_APPROVAL_PERMISSION = "payroll.runs.approve";
const payrollStatutoryScenarioFamilies = new Set<PayrollStatutoryScenarioFamily>([
  "CNPS_PENSION",
  "CNPS_FAMILY_ALLOWANCE",
  "CNPS_OCCUPATIONAL_RISK",
  "IRPP_PERIOD",
  "IRPP_YTD",
  "IRPP_ADJUSTMENTS",
  "IRPP_CORRECTIONS",
  "ALLOWANCES_BENEFITS",
  "LEAVE_OVERTIME",
]);

type ProtectedPayrollContext = {
  orgId: string;
  userId: string;
  permissions: readonly string[];
  freshAuth?: { lastAuthAt: Date };
};

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

function firstValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function stringValue(value: unknown) {
  const raw = firstValue(value);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}


function parseProposedCountryPack(input: unknown): CountryPack {
  const parsed = countryPackSchema.safeParse(firstValue(input));
  if (!parsed.success) {
    throw new BusinessRuleError(
      "Proposed payroll country-pack payload is invalid.",
    );
  }

  return parsed.data as CountryPack;
}

function resolveBaseCountryPack(raw: Record<string, unknown>, proposedPack: CountryPack) {
  const countryCode = stringValue(
    raw.baseCountryCode ?? raw.countryCode ?? proposedPack.header.countryCode,
  );
  if (!countryCode) {
    throw new BusinessRuleError(
      "Country-pack review intake requires a base country code.",
    );
  }

  const basePackVersion = stringValue(raw.basePackVersion ?? raw.countryPackVersion);
  const basePack = basePackVersion
    ? getCountryPack(countryCode, basePackVersion)
    : getCountryPacks(countryCode)[0] ?? null;

  if (!basePack) {
    throw new BusinessRuleError(
      "Base payroll country pack was not found for review intake.",
    );
  }

  return basePack;
}

function targetFamilies(value: unknown): PayrollStatutoryScenarioFamily[] {
  return (Array.isArray(value) ? value : [])
    .map((entry) => stringValue(entry))
    .filter(
      (entry): entry is PayrollStatutoryScenarioFamily =>
        Boolean(entry) &&
        payrollStatutoryScenarioFamilies.has(
          entry as PayrollStatutoryScenarioFamily,
        ),
    );
}

function reviewTopicEvidence(value: unknown): PayrollCountryPackReviewTopicEvidence[] {
  return (Array.isArray(value) ? value : []).map((entry) => {
    const row = asRecord(entry);
    return {
      topic: stringValue(row.topic) ?? "",
      legalRef: stringValue(row.legalRef) ?? "",
      sourceEvidenceHash: stringValue(row.sourceEvidenceHash) ?? "",
      reviewedBy: stringValue(row.reviewedBy) ?? "",
      reviewedOn: stringValue(row.reviewedOn) ?? "",
    };
  });
}

function countryPackReviewIntakeInput(input: unknown) {
  const raw = asRecord(input);
  const proposedPack = parseProposedCountryPack(raw.proposedPack ?? raw.countryPack);
  const basePack = resolveBaseCountryPack(raw, proposedPack);

  return {
    basePack,
    proposedPack,
    targetFamilies: targetFamilies(raw.targetFamilies),
    reviewTopicEvidence: reviewTopicEvidence(raw.reviewTopicEvidence),
    generatedAt: stringValue(raw.generatedAt ?? raw.now),
  };
}

const evaluateCountryPackReviewIntake = protect<
  unknown,
  PayrollCountryPackReviewIntakeCertificate
>(
  {
    permission: PAYROLL_COUNTRY_PACK_INTAKE_PERMISSION,
    auditResource: "PayrollCountryPackReviewIntakeCertificate",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.country_pack_review_intake.evaluate",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input) =>
    buildPayrollCountryPackReviewIntakeCertificate(
      countryPackReviewIntakeInput(input),
    ),
);

export async function evaluatePayrollCountryPackReviewIntakeAction(
  input: unknown = {},
) {
  return evaluateCountryPackReviewIntake(input);
}

const recordCountryPackReviewIntake = protect<
  unknown,
  PayrollCountryPackReviewIntakeRecordedCertificate
>(
  {
    permission: PAYROLL_COUNTRY_PACK_INTAKE_PERMISSION,
    auditResource: "PayrollCountryPackReviewIntakeCertificate",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.country_pack_review_intake.record",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const certificate = buildPayrollCountryPackReviewIntakeCertificate(
      countryPackReviewIntakeInput(input),
    );

    return recordPayrollCountryPackReviewIntakeCertificate({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      certificate,
    });
  },
);

export async function recordPayrollCountryPackReviewIntakeAction(
  input: unknown = {},
) {
  return recordCountryPackReviewIntake(input);
}

const approveCountryPackReviewIntake = protect<
  unknown,
  PayrollCountryPackReviewIntakeApproval
>(
  {
    permission: PAYROLL_COUNTRY_PACK_APPROVAL_PERMISSION,
    auditResource: "PayrollCountryPackReviewIntakeApproval",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.country_pack_review_intake.approve",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx: ProtectedPayrollContext) => {
    const raw = asRecord(input);

    return approvePayrollCountryPackReviewIntakeCertificate({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      expectedCertificateHash: stringValue(
        raw.expectedCertificateHash ?? raw.certificateHash,
      ) ?? "",
      approvalEvidenceHash: stringValue(raw.approvalEvidenceHash) ?? "",
      lastAuthAt: ctx.freshAuth?.lastAuthAt ?? new Date(0),
      approvedAt: stringValue(raw.approvedAt ?? raw.now),
      freshAuthMaxAgeSeconds: stringValue(raw.freshAuthMaxAgeSeconds)
        ? Number(stringValue(raw.freshAuthMaxAgeSeconds))
        : undefined,
    });
  },
);

export async function approvePayrollCountryPackReviewIntakeAction(
  input: unknown = {},
) {
  return approveCountryPackReviewIntake(input);
}
