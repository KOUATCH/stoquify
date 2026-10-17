import "server-only";
import type { Prisma } from "@prisma/client";

import {
  BusinessRuleError,
  NotFoundError,
} from "@/services/_shared/action-errors";
import { hashBusinessPayload } from "@/services/events/business-event.service";
import {
  getCountryPack,
  resolveRegulatoryParameter,
} from "@/services/regulatory/regulatory-capability.service";
import { assertPayrollCertifiedInputProofMetadata } from "./certified-input-proof";
import { buildPayrollStatutoryScenarioCoverageSummary } from "./payroll-statutory-scenario-coverage.service";

const supported = new Set(["SUPPORTED", "SUPPORTED_CERTIFIED"]);
const reviewed = new Set(["EXPERT_REVIEWED", "REGULATOR_CONFIRMED"]);
export const PAYROLL_PRODUCTION_CALCULATOR_CONTRACT =
  "stoquify-payroll-calculator.v1";
// These are the inputs consumed by the existing calculator, not a complete
// legal obligation catalogue. Scenario coverage is an additional release gate.
const requiredResolutions = [
  ["pensionRates", "payroll.cnps.pensionRatesBps", "PAYROLL_CNPS_PENSION"],
  [
    "familyAllowanceRates",
    "payroll.cnps.familyAllowanceRatesBps",
    "PAYROLL_CNPS_FAMILY_ALLOWANCE",
  ],
  [
    "occupationalRiskRates",
    "payroll.cnps.occupationalRiskRatesBps",
    "PAYROLL_CNPS_OCCUPATIONAL_RISK",
  ],
  ["employerRules", "payroll.cnps.employerRules", "PAYROLL_EMPLOYER_RULES"],
  ["incomeTaxRules", "payroll.irpp.incomeTaxRules", "PAYROLL_IRPP_INCOME_TAX"],
  [
    "productionAdmission",
    "payroll.productionAdmission",
    "PAYROLL_PRODUCTION_ADMISSION",
  ],
] as const;

type AdmissionRun = {
  countryCode: string;
  countryPackVersion: string;
  countryPackSchemaVersion: string;
  countryPackResolutionHash: string;
  countryPackCapabilityStatus: string;
  metadata: unknown;
  payrollPeriod: { payDate: Date; frequency: string };
  lines: Array<{ calculationSnapshot: unknown }>;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function deny(reason: string): never {
  throw new BusinessRuleError(
    `PAYROLL_PRODUCTION_ADMISSION_BLOCKED: ${reason}`,
    "REVIEW_REQUIRED",
  );
}

/** Server-owned gate. Reading archived evidence remains possible through read APIs.
 * No caller-supplied bypass, environment switch or missing-as-exempt fallback. */
export function assertPayrollProductionAdmission(run: AdmissionRun): void {
  if (run.countryCode !== "CM" || run.payrollPeriod.frequency !== "MONTHLY") {
    deny("This release requires Cameroon and a monthly payroll period.");
  }
  if (!supported.has(run.countryPackCapabilityStatus)) {
    deny("The calculated country pack is not production supported.");
  }
  const metadata = record(run.metadata);
  const packSnapshot = record(metadata.countryPackStatus);
  if (
    !run.countryPackResolutionHash ||
    packSnapshot.countryCode !== run.countryCode ||
    packSnapshot.countryPackVersion !== run.countryPackVersion ||
    packSnapshot.countryPackSchemaVersion !== run.countryPackSchemaVersion ||
    packSnapshot.countryPackResolutionHash !== run.countryPackResolutionHash ||
    packSnapshot.countryPackCapabilityStatus !== run.countryPackCapabilityStatus
  )
    deny("Calculated country-pack evidence is missing or inconsistent.");

  const certifiedInputProof =
    assertPayrollCertifiedInputProofMetadata(metadata);
  const readiness = record(metadata.payrollInputReadiness);
  if (
    readiness.status !== "READY" ||
    readiness.verdictHash !== metadata.payrollInputReadinessHash
  ) {
    deny("Certified input readiness is missing or inconsistent.");
  }

  for (const [key, parameterPath, purpose] of requiredResolutions) {
    const stored = record(packSnapshot[key]);
    if (
      !supported.has(String(stored.capabilityStatus)) ||
      !reviewed.has(String(stored.verificationStatus))
    ) {
      deny(`Reviewed production evidence is required for ${parameterPath}.`);
    }
    const current = resolveRegulatoryParameter<Record<string, unknown>>(
      parameterPath,
      {
        countryCode: run.countryCode,
        pinnedPackVersion: run.countryPackVersion,
        date: run.payrollPeriod.payDate,
        purpose,
        entityProfile: { countryCode: run.countryCode },
      },
    );
    if (
      !supported.has(current.capabilityStatus) ||
      !reviewed.has(current.verificationStatus) ||
      current.resolutionHash !== stored.resolutionHash ||
      current.packVersion !== run.countryPackVersion ||
      current.schemaVersion !== run.countryPackSchemaVersion
    )
      deny(
        `Rule evidence is no longer current for ${parameterPath}; recalculate and review.`,
      );
    if (
      key === "incomeTaxRules" &&
      current.value.productionCalculationSupported !== true
    ) {
      deny("The reviewed income-tax calculation is unavailable.");
    }
    if (
      key === "productionAdmission" &&
      (current.value.status !== "APPROVED" ||
        current.value.calculatorContract !==
          PAYROLL_PRODUCTION_CALCULATOR_CONTRACT ||
        current.value.scope !== "CM_PRIVATE_SME_MONTHLY_SINGLE_EMPLOYER" ||
        !/^sha256:[a-f0-9]{64}$/.test(
          String(current.value.obligationCatalogueHash),
        ) ||
        !/^sha256:[a-f0-9]{64}$/.test(
          String(current.value.releaseEvidenceHash),
        ))
    )
      deny(
        "An approved release scope, obligation catalogue and calculator acceptance are required.",
      );
  }

  const pack = getCountryPack(run.countryCode, run.countryPackVersion);
  if (!pack || pack.header.status !== "PUBLISHED")
    deny("The pinned country pack is unavailable.");
  const summary = buildPayrollStatutoryScenarioCoverageSummary(pack);
  const coveragePayload = {
    status: summary.status,
    countryCode: summary.countryCode,
    packVersion: summary.packVersion,
    executableScenarioCount: summary.executableScenarioCount,
    readyFamilyCount: summary.readyFamilyCount,
    requiredFamilyCount: summary.requiredFamilyCount,
    blockerCodes: summary.blockers.map((blocker) => blocker.code).sort(),
    reviewEvidence: summary.reviewEvidence,
  };
  const coverageHash = `sha256:${hashBusinessPayload(coveragePayload)}`;
  const storedCoverage = record(metadata.statutoryScenarioCoverage);
  if (
    summary.status !== "READY" ||
    summary.requiredFamilyCount === 0 ||
    summary.readyFamilyCount !== summary.requiredFamilyCount ||
    summary.reviewEvidence.missingCount > 0 ||
    summary.reviewEvidence.sourceEvidenceHashes.length === 0 ||
    storedCoverage.status !== "READY" ||
    storedCoverage.coverageHash !== coverageHash ||
    metadata.statutoryScenarioCoverageHash !== coverageHash
  )
    deny("Reviewed statutory scenario evidence is incomplete or stale.");

  if (!run.lines.length) deny("Calculated employee lines are required.");
  const certifiedInputs = certifiedInputProof.payrollEngineInputHashes;
  for (const line of run.lines) {
    const snapshot = record(line.calculationSnapshot);
    const provenance = record(snapshot.countryPackProvenance);
    if (
      snapshot.incomeTaxCalculationStatus !== "CALCULATED" ||
      snapshot.incomeTaxApplied !== true ||
      snapshot.incomeTaxWithholdingAmount == null
    )
      deny("An employee has an unapplied or blocked statutory calculation.");
    if (
      snapshot.payrollInputReadinessHash !==
        metadata.payrollInputReadinessHash ||
      snapshot.hrisPayrollReadinessHash !== metadata.hrisPayrollReadinessHash ||
      !certifiedInputs.includes(String(snapshot.payrollEngineInputHash)) ||
      provenance.countryCode !== run.countryCode ||
      provenance.packVersion !== run.countryPackVersion ||
      provenance.schemaVersion !== run.countryPackSchemaVersion ||
      provenance.resolutionHash !== run.countryPackResolutionHash ||
      provenance.statutoryScenarioCoverageHash !== coverageHash ||
      !supported.has(String(provenance.capabilityStatus))
    )
      deny("Employee calculation evidence does not match the certified run.");
  }
}

/** For background/adapter boundaries that do not already hold the complete run. */
export async function assertPayrollProductionAdmissionInTx(
  tx: Pick<Prisma.TransactionClient, "payrollRun">,
  organizationId: string,
  payrollRunId: string,
): Promise<void> {
  const run = await tx.payrollRun.findFirst({
    where: { id: payrollRunId, organizationId, deletedAt: null },
    include: { payrollPeriod: true, lines: true },
  });
  if (!run) throw new NotFoundError("Payroll run not found");
  assertPayrollProductionAdmission(run);
}
