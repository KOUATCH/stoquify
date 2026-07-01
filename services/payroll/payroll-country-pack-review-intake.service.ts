import { computeCountryPackHash, computeResolutionHash } from "../regulatory/country-packs/hash";
import type { CountryPack } from "../regulatory/country-packs/schemas";
import { validateCountryPackForPublish } from "../regulatory/country-packs/validation";
import {
  validatePayrollCountryPackCalculationFixtures,
  type PayrollCalculationFixtureRun,
} from "./payroll-country-pack-fixture-runner";
import {
  buildPayrollStatutoryScenarioCoverageSummary,
  type PayrollStatutoryScenarioFamily,
} from "./payroll-statutory-scenario-coverage.service";

export type PayrollCountryPackReviewIntakeStatus =
  | "READY_FOR_LEGAL_OWNER_SIGNOFF"
  | "BLOCKED";

export type PayrollCountryPackReviewIntakeBlockerCode =
  | "PAYROLL_COUNTRY_PACK_TARGET_FAMILIES_MISSING"
  | "PAYROLL_COUNTRY_PACK_COUNTRY_MISMATCH"
  | "PAYROLL_COUNTRY_PACK_PROPOSED_HASH_MISMATCH"
  | "PAYROLL_COUNTRY_PACK_PROPOSED_VALIDATION_FAILED"
  | "PAYROLL_COUNTRY_PACK_FAMILY_MISSING"
  | "PAYROLL_COUNTRY_PACK_FAMILY_NOT_READY"
  | "PAYROLL_COUNTRY_PACK_REVIEW_TOPIC_EVIDENCE_MISSING"
  | "PAYROLL_COUNTRY_PACK_REVIEW_TOPIC_EVIDENCE_INVALID"
  | "PAYROLL_COUNTRY_PACK_REVIEW_TOPIC_EVIDENCE_DUPLICATE"
  | "PAYROLL_COUNTRY_PACK_FAMILY_FIXTURE_PROVENANCE_MISSING";

export type PayrollCountryPackReviewTopicEvidence = {
  topic: string;
  legalRef: string;
  sourceEvidenceHash: string;
  reviewedBy: string;
  reviewedOn: string;
};

export type PayrollCountryPackReviewIntakeInput = {
  basePack: CountryPack;
  proposedPack: CountryPack;
  targetFamilies: PayrollStatutoryScenarioFamily[];
  reviewTopicEvidence: PayrollCountryPackReviewTopicEvidence[];
  generatedAt?: string;
};

export type PayrollCountryPackReviewIntakeBlocker = {
  code: PayrollCountryPackReviewIntakeBlockerCode;
  family: PayrollStatutoryScenarioFamily | null;
  message: string;
  evidence: Record<string, unknown>;
};

export type PayrollCountryPackReviewFixtureEvidence = {
  fixtureId: string;
  parameterPath: string;
  purpose: string | null;
  fixtureDate: string;
  expectedPackVersion: string;
  expectedLegalRef: string;
  reviewStatus: string;
  reviewedBy: string;
  reviewedOn: string;
  legalRef: string;
  sourceEvidenceHash: string;
  expectedOutputHash: string;
  actualOutputHash: string | null;
  proposedPackHash: string;
  computedProposedPackHash: string;
  evidenceHash: string;
};

export type PayrollCountryPackReviewIntakeFamily = {
  family: PayrollStatutoryScenarioFamily;
  status: PayrollCountryPackReviewIntakeStatus;
  proposedCoverageStatus: string | null;
  proposedCapabilityStatus: string | null;
  certificationStatus: string | null;
  executableScenarioCount: number;
  passedScenarioCount: number;
  failedScenarioCount: number;
  fixtureIds: string[];
  baseRequiredReviewTopics: string[];
  coveredReviewTopics: string[];
  missingReviewTopics: string[];
  invalidReviewTopics: string[];
  reviewEvidenceSourceHashes: string[];
  fixtureEvidence: PayrollCountryPackReviewFixtureEvidence[];
  fixtureEvidenceHashes: string[];
  proposedIssueCodes: string[];
  proposedBlockerCode: string | null;
  proposedBlockerMessage: string | null;
};

export type PayrollCountryPackReviewIntakeCertificate = {
  kind: "AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_CERTIFICATE";
  version: 1;
  status: PayrollCountryPackReviewIntakeStatus;
  generatedAt: string;
  countryCode: string;
  basePackVersion: string;
  basePackHash: string;
  proposedPackVersion: string;
  proposedPackHash: string;
  computedProposedPackHash: string;
  proposedPackHashMatches: boolean;
  targetFamilies: PayrollCountryPackReviewIntakeFamily[];
  publishValidation: {
    valid: boolean;
    canPublish: boolean;
    issueCount: number;
    issueCodes: string[];
    issues: Array<{
      code: string;
      severity: string;
      path: string;
    }>;
  };
  blockers: PayrollCountryPackReviewIntakeBlocker[];
  redaction: {
    rawLegalDocumentsIncluded: false;
    rawFormulaSourceDocumentsIncluded: false;
    rawEmployeeDataIncluded: false;
    rawSalaryDataIncluded: false;
  };
  certificateHash: string;
};

const REVIEW_EVIDENCE_HASH_PREFIX = "sha256:";

function uniqueSorted<TValue extends string>(values: readonly TValue[]) {
  return [...new Set(values.filter((value): value is TValue => Boolean(value)))].sort();
}

function stableGeneratedAt(value: string | undefined) {
  return value ?? new Date().toISOString();
}

function reviewTopicEvidenceHashIsPresent(value: string) {
  return (
    value.startsWith(REVIEW_EVIDENCE_HASH_PREFIX) &&
    value.length > REVIEW_EVIDENCE_HASH_PREFIX.length
  );
}

function evidenceMissingFields(evidence: PayrollCountryPackReviewTopicEvidence) {
  const missing: string[] = [];

  if (!evidence.legalRef.trim()) missing.push("legalRef");
  if (!reviewTopicEvidenceHashIsPresent(evidence.sourceEvidenceHash)) {
    missing.push("sourceEvidenceHash");
  }
  if (!evidence.reviewedBy.trim()) missing.push("reviewedBy");
  if (!evidence.reviewedOn.trim()) missing.push("reviewedOn");

  return missing;
}

function groupReviewEvidence(
  evidence: readonly PayrollCountryPackReviewTopicEvidence[],
) {
  const byTopic = new Map<string, PayrollCountryPackReviewTopicEvidence[]>();

  evidence.forEach((entry) => {
    const topic = entry.topic.trim();
    if (!topic) return;
    byTopic.set(topic, [...(byTopic.get(topic) ?? []), entry]);
  });

  return byTopic;
}

function certificateHashFor(
  certificate: Omit<PayrollCountryPackReviewIntakeCertificate, "certificateHash">,
) {
  return computeResolutionHash(certificate);
}

function fixtureEvidenceHashFor(
  evidence: Omit<PayrollCountryPackReviewFixtureEvidence, "evidenceHash">,
) {
  return computeResolutionHash(evidence);
}

function buildFixtureEvidence(input: {
  fixtureId: string;
  proposedPack: CountryPack;
  proposedPackHash: string;
  computedProposedPackHash: string;
  runsByFixtureId: Map<string, PayrollCalculationFixtureRun>;
}): PayrollCountryPackReviewFixtureEvidence | null {
  const fixture = input.proposedPack.goldenFixtures.find(
    (entry) => entry.id === input.fixtureId,
  );
  const run = input.runsByFixtureId.get(input.fixtureId);
  const reviewEvidence = run?.reviewEvidence;

  if (
    !fixture ||
    !run ||
    run.status !== "PASSED" ||
    !reviewEvidence ||
    !reviewEvidence.legalRef.trim() ||
    !reviewTopicEvidenceHashIsPresent(reviewEvidence.sourceEvidenceHash) ||
    !reviewEvidence.reviewedBy.trim() ||
    !reviewEvidence.reviewedOn.trim()
  ) {
    return null;
  }

  const withoutHash = {
    fixtureId: run.fixtureId,
    parameterPath: run.parameterPath,
    purpose: run.purpose,
    fixtureDate: fixture.date,
    expectedPackVersion: fixture.expectedPackVersion,
    expectedLegalRef: fixture.expectedLegalRef,
    reviewStatus: run.reviewStatus,
    reviewedBy: reviewEvidence.reviewedBy,
    reviewedOn: reviewEvidence.reviewedOn,
    legalRef: reviewEvidence.legalRef,
    sourceEvidenceHash: reviewEvidence.sourceEvidenceHash,
    expectedOutputHash: computeResolutionHash(run.expectedOutput),
    actualOutputHash: run.actualOutput
      ? computeResolutionHash(run.actualOutput)
      : null,
    proposedPackHash: input.proposedPackHash,
    computedProposedPackHash: input.computedProposedPackHash,
  } satisfies Omit<PayrollCountryPackReviewFixtureEvidence, "evidenceHash">;

  return {
    ...withoutHash,
    evidenceHash: fixtureEvidenceHashFor(withoutHash),
  };
}

export function buildPayrollCountryPackReviewIntakeCertificate(
  input: PayrollCountryPackReviewIntakeInput,
): PayrollCountryPackReviewIntakeCertificate {
  const generatedAt = stableGeneratedAt(input.generatedAt);
  const targetFamilies = uniqueSorted(input.targetFamilies);
  const blockers: PayrollCountryPackReviewIntakeBlocker[] = [];
  const computedProposedPackHash = computeCountryPackHash(input.proposedPack);
  const proposedPackHashMatches =
    input.proposedPack.header.hash === computedProposedPackHash;
  const publishValidation = validateCountryPackForPublish(input.proposedPack);
  const reviewEvidenceByTopic = groupReviewEvidence(input.reviewTopicEvidence);

  if (!targetFamilies.length) {
    blockers.push({
      code: "PAYROLL_COUNTRY_PACK_TARGET_FAMILIES_MISSING",
      family: null,
      message: "At least one statutory scenario family must be targeted for country-pack review intake.",
      evidence: {
        targetFamilyCount: 0,
      },
    });
  }

  if (input.basePack.header.countryCode !== input.proposedPack.header.countryCode) {
    blockers.push({
      code: "PAYROLL_COUNTRY_PACK_COUNTRY_MISMATCH",
      family: null,
      message: "Proposed country pack must use the same country code as the base pack.",
      evidence: {
        baseCountryCode: input.basePack.header.countryCode,
        proposedCountryCode: input.proposedPack.header.countryCode,
      },
    });
  }

  if (!proposedPackHashMatches) {
    blockers.push({
      code: "PAYROLL_COUNTRY_PACK_PROPOSED_HASH_MISMATCH",
      family: null,
      message: "Proposed country pack hash does not match the canonical proposed pack payload.",
      evidence: {
        proposedPackHash: input.proposedPack.header.hash,
        computedProposedPackHash,
      },
    });
  }

  if (!publishValidation.valid || !publishValidation.canPublish) {
    blockers.push({
      code: "PAYROLL_COUNTRY_PACK_PROPOSED_VALIDATION_FAILED",
      family: null,
      message: "Proposed country pack must pass publish validation before review intake can be signed off.",
      evidence: {
        issueCount: publishValidation.issues.length,
        issueCodes: uniqueSorted(publishValidation.issues.map((issue) => issue.code)),
      },
    });
  }

  const baseFixtureValidation = validatePayrollCountryPackCalculationFixtures(
    input.basePack,
  );
  const proposedFixtureValidation =
    validatePayrollCountryPackCalculationFixtures(input.proposedPack);
  const proposedRunsByFixtureId = new Map(
    proposedFixtureValidation.runs.map((run) => [run.fixtureId, run]),
  );

  const baseCoverage = buildPayrollStatutoryScenarioCoverageSummary(
    input.basePack,
    baseFixtureValidation,
  );
  const proposedCoverage = buildPayrollStatutoryScenarioCoverageSummary(
    input.proposedPack,
    proposedFixtureValidation,
  );

  const families = targetFamilies.map((family) => {
    const baseFamily = baseCoverage.families.find((entry) => entry.family === family);
    const proposedFamily = proposedCoverage.families.find(
      (entry) => entry.family === family,
    );
    const baseRequiredReviewTopics = uniqueSorted(
      baseFamily?.requiredReviewTopics ?? [],
    );
    const coveredReviewTopics: string[] = [];
    const missingReviewTopics: string[] = [];
    const invalidReviewTopics: string[] = [];
    const reviewEvidenceSourceHashes: string[] = [];
    const fixtureEvidence = uniqueSorted(proposedFamily?.fixtureIds ?? [])
      .map((fixtureId) =>
        buildFixtureEvidence({
          fixtureId,
          proposedPack: input.proposedPack,
          proposedPackHash: input.proposedPack.header.hash,
          computedProposedPackHash,
          runsByFixtureId: proposedRunsByFixtureId,
        }),
      )
      .filter(
        (entry): entry is PayrollCountryPackReviewFixtureEvidence =>
          Boolean(entry),
      );
    const fixtureEvidenceFixtureIds = new Set(
      fixtureEvidence.map((entry) => entry.fixtureId),
    );
    const missingFixtureProvenance = uniqueSorted(
      (proposedFamily?.fixtureIds ?? []).filter(
        (fixtureId) => !fixtureEvidenceFixtureIds.has(fixtureId),
      ),
    );

    baseRequiredReviewTopics.forEach((topic) => {
      const topicEvidence = reviewEvidenceByTopic.get(topic) ?? [];
      if (!topicEvidence.length) {
        missingReviewTopics.push(topic);
        return;
      }

      if (topicEvidence.length > 1) {
        blockers.push({
          code: "PAYROLL_COUNTRY_PACK_REVIEW_TOPIC_EVIDENCE_DUPLICATE",
          family,
          message: `Review topic "${topic}" has duplicate evidence entries.`,
          evidence: {
            topic,
            evidenceCount: topicEvidence.length,
          },
        });
      }

      const validEvidence = topicEvidence.find(
        (entry) => evidenceMissingFields(entry).length === 0,
      );
      if (!validEvidence) {
        invalidReviewTopics.push(topic);
        return;
      }

      coveredReviewTopics.push(topic);
      reviewEvidenceSourceHashes.push(validEvidence.sourceEvidenceHash);
    });

    if (!proposedFamily) {
      blockers.push({
        code: "PAYROLL_COUNTRY_PACK_FAMILY_MISSING",
        family,
        message: `${family} is not present in proposed statutory scenario coverage.`,
        evidence: {
          family,
        },
      });
    }

    if (proposedFamily && proposedFamily.status !== "READY") {
      blockers.push({
        code: "PAYROLL_COUNTRY_PACK_FAMILY_NOT_READY",
        family,
        message:
          proposedFamily.blockerMessage ??
          `${family} statutory scenario coverage is not ready.`,
        evidence: {
          family,
          proposedCoverageStatus: proposedFamily.status,
          proposedCapabilityStatus: proposedFamily.capabilityStatus,
          executableScenarioCount: proposedFamily.executableScenarioCount,
          failedScenarioCount: proposedFamily.failedScenarioCount,
          missingPurposeMatchers: proposedFamily.missingPurposeMatchers,
          issueCodes: proposedFamily.issueCodes,
          proposedBlockerCode: proposedFamily.blockerCode,
        },
      });
    }

    if (missingReviewTopics.length) {
      blockers.push({
        code: "PAYROLL_COUNTRY_PACK_REVIEW_TOPIC_EVIDENCE_MISSING",
        family,
        message: `${family} is missing required legal review topic evidence.`,
        evidence: {
          missingReviewTopics,
        },
      });
    }

    if (invalidReviewTopics.length) {
      blockers.push({
        code: "PAYROLL_COUNTRY_PACK_REVIEW_TOPIC_EVIDENCE_INVALID",
        family,
        message: `${family} has incomplete legal review topic evidence.`,
        evidence: {
          invalidReviewTopics,
        },
      });
    }

    if (proposedFamily?.status === "READY" && missingFixtureProvenance.length) {
      blockers.push({
        code: "PAYROLL_COUNTRY_PACK_FAMILY_FIXTURE_PROVENANCE_MISSING",
        family,
        message: `${family} is missing executable fixture provenance evidence.`,
        evidence: {
          missingFixtureIds: missingFixtureProvenance,
        },
      });
    }

    const familyStatus =
      proposedFamily?.status === "READY" &&
      missingReviewTopics.length === 0 &&
      invalidReviewTopics.length === 0 &&
      missingFixtureProvenance.length === 0
        ? "READY_FOR_LEGAL_OWNER_SIGNOFF"
        : "BLOCKED";

    return {
      family,
      status: familyStatus,
      proposedCoverageStatus: proposedFamily?.status ?? null,
      proposedCapabilityStatus: proposedFamily?.capabilityStatus ?? null,
      certificationStatus: proposedFamily?.certificationStatus ?? null,
      executableScenarioCount: proposedFamily?.executableScenarioCount ?? 0,
      passedScenarioCount: proposedFamily?.passedScenarioCount ?? 0,
      failedScenarioCount: proposedFamily?.failedScenarioCount ?? 0,
      fixtureIds: proposedFamily?.fixtureIds ?? [],
      baseRequiredReviewTopics,
      coveredReviewTopics: uniqueSorted(coveredReviewTopics),
      missingReviewTopics: uniqueSorted(missingReviewTopics),
      invalidReviewTopics: uniqueSorted(invalidReviewTopics),
      reviewEvidenceSourceHashes: uniqueSorted(reviewEvidenceSourceHashes),
      fixtureEvidence,
      fixtureEvidenceHashes: uniqueSorted(
        fixtureEvidence.map((entry) => entry.evidenceHash),
      ),
      proposedIssueCodes: proposedFamily?.issueCodes ?? [],
      proposedBlockerCode: proposedFamily?.blockerCode ?? null,
      proposedBlockerMessage: proposedFamily?.blockerMessage ?? null,
    } satisfies PayrollCountryPackReviewIntakeFamily;
  });

  const status =
    blockers.length === 0 ? "READY_FOR_LEGAL_OWNER_SIGNOFF" : "BLOCKED";
  const certificateWithoutHash = {
    kind: "AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_CERTIFICATE",
    version: 1,
    status,
    generatedAt,
    countryCode: input.proposedPack.header.countryCode,
    basePackVersion: input.basePack.header.packVersion,
    basePackHash: input.basePack.header.hash,
    proposedPackVersion: input.proposedPack.header.packVersion,
    proposedPackHash: input.proposedPack.header.hash,
    computedProposedPackHash,
    proposedPackHashMatches,
    targetFamilies: families,
    publishValidation: {
      valid: publishValidation.valid,
      canPublish: publishValidation.canPublish,
      issueCount: publishValidation.issues.length,
      issueCodes: uniqueSorted(publishValidation.issues.map((issue) => issue.code)),
      issues: publishValidation.issues.map((issue) => ({
        code: issue.code,
        severity: issue.severity,
        path: issue.path,
      })),
    },
    blockers,
    redaction: {
      rawLegalDocumentsIncluded: false,
      rawFormulaSourceDocumentsIncluded: false,
      rawEmployeeDataIncluded: false,
      rawSalaryDataIncluded: false,
    },
  } satisfies Omit<
    PayrollCountryPackReviewIntakeCertificate,
    "certificateHash"
  >;

  return {
    ...certificateWithoutHash,
    certificateHash: certificateHashFor(certificateWithoutHash),
  };
}
