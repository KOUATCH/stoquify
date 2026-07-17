import { CloseRunStatus } from "@prisma/client";

jest.mock("../../../prisma/db", () => ({
  db: {},
}));

import {
  buildPayrollFinalReleaseReadinessPack,
  formatPayrollFinalReleaseReadinessPack,
} from "../payroll-final-release-readiness.service";

const ORGANIZATION_ID = "org-1";
const PAYROLL_RUN_ID = "run-1";
const ACCOUNTING_PERIOD_ID = "accounting-period-1";
const PILOT_CERTIFICATE_HASH = "sha256:pilot-certificate";
const PROOF_BACKFILL_CERTIFICATE_HASH = "sha256:proof-backfill-certificate";
const ADAPTER_CHAOS_HASH = "sha256:adapter-chaos-release-gate";
const STATUTORY_SCENARIO_COVERAGE_HASH = "sha256:statutory-scenario-coverage";
const COUNTRY_PACK_REVIEW_APPROVAL_HASH = "sha256:country-pack-review-approval";

function statutoryScenarioCoverage(overrides: Record<string, unknown> = {}) {
  return {
    status: "READY",
    countryCode: "CM",
    packVersion: "CM-2026.1",
    coverageHash: STATUTORY_SCENARIO_COVERAGE_HASH,
    executableScenarioCount: 12,
    readyFamilyCount: 9,
    requiredFamilyCount: 9,
    blockerCodes: [],
    requiredReviewTopics: ["taxableSalaryBase", "bracketsAndRates"],
    reviewEvidence: {
      presentCount: 12,
      missingCount: 0,
      reviewedBy: ["Qualified Cameroon payroll tax reviewer"],
      reviewedOn: ["2026-06-28"],
      legalRefs: ["CM_PAYROLL_REVIEWED_SOURCE"],
      sourceEvidenceHashes: ["sha256:statutory-review-evidence"],
    },
    reviewedProofChain: {
      status: "READY",
      coverageHash: STATUTORY_SCENARIO_COVERAGE_HASH,
      reviewEvidenceSourceHashes: ["sha256:statutory-review-evidence"],
      readyFamilyCount: 9,
      requiredFamilyCount: 9,
      registerProofGapCount: 0,
      declarationRegisterProofGapCount: 0,
      paymentSettlementRegisterProofGapCount: 0,
      correctionIntentCount: 2,
      requiredDownstreamProofs: [
        "payroll-register-proof",
        "correction-recalculation-lifecycle-evidence",
        "accounting-tieout-proof",
      ],
      blockerCodes: [],
    },
    families: [
      {
        family: "IRPP_PERIOD",
        status: "READY",
        capabilityStatus: "SUPPORTED",
        executableScenarioCount: 1,
        passedScenarioCount: 1,
        failedScenarioCount: 0,
        certificationStatus: "EXPERT_REVIEWED",
        reviewStatuses: ["EXPERT_REVIEWED"],
        sourceEvidenceHashCount: 1,
        requiredReviewTopics: ["taxableSalaryBase", "bracketsAndRates"],
        blockerCode: null,
      },
    ],
    ...overrides,
  };
}

function pilotAudit(overrides: Record<string, unknown> = {}) {
  return {
    id: "pilot-audit-1",
    entityId: PAYROLL_RUN_ID,
    createdAt: new Date("2026-06-30T08:10:00.000Z"),
    changes: {
      status: "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW",
      generatedAt: "2026-06-30T08:00:00.000Z",
      certificateHash: PILOT_CERTIFICATE_HASH,
      proofContinuity: {
        expectedAdapterChaosReleaseGateHash: ADAPTER_CHAOS_HASH,
        declarationAdapterChaosReleaseGateHashes: [ADAPTER_CHAOS_HASH],
        paymentAdapterChaosReleaseGateHashes: [ADAPTER_CHAOS_HASH],
        proofBackfillAdapterChaosReleaseGateHash: ADAPTER_CHAOS_HASH,
        proofBackfillAdapterChaosMatchesExpected: true,
      },
      signoff: { missingRoles: [] },
      blockers: [],
      redaction: {
        policy: "payroll-controlled-pilot-cycle-certificate-redaction",
      },
      ...overrides,
    },
  };
}

function proofBackfillAudit(afterOverrides: Record<string, unknown> = {}) {
  return {
    id: "proof-backfill-audit-1",
    entityId: "proof-backfill-reconciliation-1",
    createdAt: new Date("2026-06-30T08:20:00.000Z"),
    changes: {
      before: null,
      after: {
        kind: "AQSTOQFLOW_PAYROLL_PROOF_BACKFILL_RECONCILIATION_CERTIFICATE",
        status: "READY_FOR_CLOSE_RECHECK",
        generatedAt: "2026-06-30T08:15:00.000Z",
        certificateHash: PROOF_BACKFILL_CERTIFICATE_HASH,
        sourceCertificate: {
          adapterChaosReleaseGateHash: ADAPTER_CHAOS_HASH,
          adapterChaosReleaseGateHashMatches: true,
          correctionIntentCount: 2,
        },
        currentProofBackfill: {
          totalBlockingGaps: 0,
          postMigrationProofGapsCleared: true,
        },
        dataTrustProofGate: {
          status: "READY",
          blockerIds: [],
        },
        setupGate: {
          status: "READY",
          blockerCodes: [],
          statutoryScenarioCoverage: statutoryScenarioCoverage(),
        },
        redaction: {
          policy: "payroll-proof-backfill-reconciliation-redaction",
        },
        ...afterOverrides,
      },
    },
  };
}

function countryPackReviewIntakeApprovalAudit(
  afterOverrides: Record<string, unknown> = {},
) {
  return {
    id: "country-pack-approval-audit-1",
    entityId: "sha256:intake-certificate",
    createdAt: new Date("2026-06-30T08:25:00.000Z"),
    changes: {
      before: null,
      after: {
        kind: "AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_LEGAL_OWNER_APPROVAL",
        version: 1,
        status: "APPROVED",
        approvedAt: "2026-06-30T08:24:00.000Z",
        organizationRef: ORGANIZATION_ID,
        actorRef: "legal-owner-1",
        sourceCertificate: {
          auditLogRef: "country-pack-intake-audit-1",
          certificateHash: "sha256:intake-certificate",
          countryCode: "CM",
          proposedPackVersion: "CM-2026.2",
          proposedPackHash: "sha256:proposed-pack",
          status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
          targetFamilies: ["IRPP_PERIOD"],
          reviewEvidenceSourceHashes: ["sha256:taxable-salary-base-review"],
          fixtureEvidenceHashes: ["sha256:fixture-provenance"],
        },
        approval: {
          approvalEvidenceHash: "sha256:legal-owner-approval",
          lastAuthAt: "2026-06-30T08:23:00.000Z",
          freshAuthMaxAgeSeconds: 300,
          freshAuthSatisfied: true,
        },
        redaction: {
          approvalNotesIncluded: false,
        },
        approvalHash: COUNTRY_PACK_REVIEW_APPROVAL_HASH,
        ...afterOverrides,
      },
    },
  };
}
function readyEvidenceSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    payrollImmutabilityRuntime: {
      generatedAt: "2026-06-30T08:30:00.000Z",
      status: "ready",
      summary: {
        blockerCount: 0,
        requiredTriggers: 9,
        presentTriggers: 9,
        blockedMutations: 14,
        expectedBlockedMutations: 14,
      },
    },
    browserAccessibility: {
      checkedAt: "2026-06-30T08:35:00.000Z",
      results: [
        {
          route: "/dashboard/payroll",
          renderState: "surface",
          seriousViolationCount: 0,
          mobileLayout: { hasDocumentOverflow: false },
        },
        {
          route: "/dashboard/payroll/runs",
          renderState: "surface",
          seriousViolationCount: 0,
          mobileLayout: { hasDocumentOverflow: false },
        },
      ],
    },
    routeSmoke: {
      checkedAt: "2026-06-30T08:36:00.000Z",
      ok: true,
      routeCount: 11,
    },
    ...overrides,
  };
}

function buildClient(options: {
  pilot?: ReturnType<typeof pilotAudit> | null;
  proofBackfill?: ReturnType<typeof proofBackfillAudit> | null;
  countryPackReviewIntake?: ReturnType<typeof countryPackReviewIntakeApprovalAudit> | null;
  closeRun?: Record<string, unknown> | null;
} = {}) {
  const pilot = options.pilot === undefined ? pilotAudit() : options.pilot;
  const proofBackfill =
    options.proofBackfill === undefined
      ? proofBackfillAudit()
      : options.proofBackfill;
  const countryPackReviewIntake =
    options.countryPackReviewIntake === undefined
      ? countryPackReviewIntakeApprovalAudit()
      : options.countryPackReviewIntake;
  const closeRun =
    options.closeRun === undefined
      ? {
          id: "close-run-1",
          status: CloseRunStatus.CERTIFIED,
          readinessScore: 100,
          criticalBlockerCount: 0,
          highBlockerCount: 0,
          asOf: new Date("2026-06-30T08:40:00.000Z"),
        }
      : options.closeRun;

  return {
    auditLog: {
      findFirst: jest.fn(async (query: { where?: { entityType?: string } }) => {
        if (query.where?.entityType === "PayrollPilotCycleCertification") {
          return pilot;
        }
        if (
          query.where?.entityType ===
          "PayrollProofBackfillReconciliationCertificate"
        ) {
          return proofBackfill;
        }
        if (
          query.where?.entityType === "PayrollCountryPackReviewIntakeApproval"
        ) {
          return countryPackReviewIntake;
        }
        return null;
      }),
      create: jest.fn(async () => ({ id: "final-pack-audit-1" })),
    },
    payrollRun: {
      findFirst: jest.fn(async () => ({
        id: PAYROLL_RUN_ID,
        payrollPeriod: { accountingPeriodId: ACCOUNTING_PERIOD_ID },
      })),
    },
    closeRun: {
      findFirst: jest.fn(async () => closeRun),
    },
  };
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: ORGANIZATION_ID,
    payrollRunId: PAYROLL_RUN_ID,
    actorId: "release-controller-1",
    actorPermissions: ["payroll.command.read"],
    now: "2026-06-30T09:00:00.000Z",
    evidenceSnapshot: readyEvidenceSnapshot(),
    persistPack: false,
    ...overrides,
  };
}

describe("buildPayrollFinalReleaseReadinessPack", () => {
  it("builds a ready full-production approval pack when all evidence passes", async () => {
    const client = buildClient();

    const result = await buildPayrollFinalReleaseReadinessPack(
      baseInput({ persistPack: true }),
      client as never,
    );

    expect(result.decision).toBe("READY_FOR_FULL_PRODUCTION_APPROVAL");
    expect(result.blockers).toEqual([]);
    expect(result.gates.every((gate) => gate.status === "PASS")).toBe(true);
    expect(result.gates.find((gate) => gate.key === "statutory_setup")).toEqual(
      expect.objectContaining({
        evidenceHash: STATUTORY_SCENARIO_COVERAGE_HASH,
        summary: expect.objectContaining({
          statutoryScenarioCoverageStatus: "READY",
          statutoryScenarioFamilies: "9/9",
          missingReviewEvidenceCount: 0,
          sourceEvidenceHashCount: 1,
          requiredReviewTopicCount: 2,
          requiredReviewTopics: "taxableSalaryBase, bracketsAndRates",
          reviewedProofChainStatus: "READY",
          reviewedProofChainBlockerCount: 0,
          reviewedProofChainRegisterProofGapCount: 0,
          reviewedProofChainCorrectionIntentCount: 2,
        }),
      }),
    );
    expect(result.evidence.proofBackfill).toEqual(
      expect.objectContaining({
        setupStatutoryScenarioCoverageStatus: "READY",
        setupStatutoryScenarioCoverageHash: STATUTORY_SCENARIO_COVERAGE_HASH,
        setupStatutoryScenarioSourceEvidenceHashCount: 1,
        setupStatutoryScenarioRequiredReviewTopicCount: 2,
        setupStatutoryScenarioRequiredReviewTopics:
          "taxableSalaryBase, bracketsAndRates",
        reviewedProofChainStatus: "READY",
        reviewedProofChainCoverageHash: STATUTORY_SCENARIO_COVERAGE_HASH,
        reviewedProofChainBlockerCodes: [],
        reviewedProofChainReviewEvidenceSourceHashes: [
          "sha256:statutory-review-evidence",
        ],
        reviewedProofChainRegisterProofGapCount: 0,
        reviewedProofChainDeclarationRegisterProofGapCount: 0,
        reviewedProofChainPaymentSettlementRegisterProofGapCount: 0,
        reviewedProofChainCorrectionIntentCount: 2,
      }),
    );
    expect(
      result.gates.find((gate) => gate.key === "country_pack_review_intake"),
    ).toEqual(
      expect.objectContaining({
        status: "PASS",
        evidenceHash: COUNTRY_PACK_REVIEW_APPROVAL_HASH,
        summary: expect.objectContaining({
          status: "APPROVED",
          approvalHashPresent: true,
          certificateHashPresent: true,
          proposedPackVersion: "CM-2026.2",
          targetFamilyCount: 1,
          targetFamilies: "IRPP_PERIOD",
          freshAuthSatisfied: true,
          approvalEvidenceHashPresent: true,
          reviewEvidenceSourceHashCount: 1,
          fixtureEvidenceHashCount: 1,
          setupReadyFamilyCount: 1,
          setupReadyFamiliesMissingApproval: null,
        }),
      }),
    );
    expect(result.evidence.countryPackReviewIntake).toEqual(
      expect.objectContaining({
        status: "APPROVED",
        approvalHash: COUNTRY_PACK_REVIEW_APPROVAL_HASH,
        certificateHash: "sha256:intake-certificate",
        proposedPackVersion: "CM-2026.2",
        targetFamilyCount: 1,
        targetFamilies: ["IRPP_PERIOD"],
        freshAuthSatisfied: true,
        approvalEvidenceHashPresent: true,
        reviewEvidenceSourceHashCount: 1,
        fixtureEvidenceHashCount: 1,
        reviewEvidenceSourceHashes: ["sha256:taxable-salary-base-review"],
        fixtureEvidenceHashes: ["sha256:fixture-provenance"],
        setupReadyFamilyCount: 1,
        setupReadyFamiliesMissingApproval: [],
      }),
    );
    expect(result.packHash).toMatch(/^sha256:/);
    expect(result.persistence).toEqual({
      requested: true,
      persisted: true,
      auditLogId: "final-pack-audit-1",
      entityType: "PayrollFinalReleaseReadinessPack",
      auditAction: "PAYROLL_FINAL_RELEASE_READINESS_PACK_EVALUATED",
    });
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "PayrollFinalReleaseReadinessPack",
          entityId: PAYROLL_RUN_ID,
          action: "PAYROLL_FINAL_RELEASE_READINESS_PACK_EVALUATED",
          userId: "release-controller-1",
          organizationId: ORGANIZATION_ID,
        }),
      }),
    );

    const formatted = formatPayrollFinalReleaseReadinessPack(result);
    expect(formatted).toContain("# Payroll Final Release Readiness Pack");
    expect(formatted).toContain("Decision: READY_FOR_FULL_PRODUCTION_APPROVAL");
  });

  it("blocks full release when country-pack review intake approval evidence is missing", async () => {
    const result = await buildPayrollFinalReleaseReadinessPack(
      baseInput(),
      buildClient({ countryPackReviewIntake: null }) as never,
    );

    const countryPackGate = result.gates.find(
      (gate) => gate.key === "country_pack_review_intake",
    );
    expect(result.decision).toBe("NOT_READY");
    expect(countryPackGate).toEqual(
      expect.objectContaining({
        status: "BLOCKED",
        blockerCodes: expect.arrayContaining([
          "FINAL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_MISSING",
          "FINAL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_HASH_MISSING",
          "FINAL_COUNTRY_PACK_REVIEW_INTAKE_CERTIFICATE_HASH_MISSING",
          "FINAL_COUNTRY_PACK_REVIEW_INTAKE_FRESH_AUTH_MISSING",
        ]),
      }),
    );
    expect(result.evidence.countryPackReviewIntake).toEqual(
      expect.objectContaining({
        status: null,
        approvalHash: null,
        certificateHash: null,
        targetFamilyCount: 0,
        targetFamilies: [],
        freshAuthSatisfied: null,
      }),
    );
  });

  it("blocks final approval when country-pack approval lacks fixture provenance hashes", async () => {
    const result = await buildPayrollFinalReleaseReadinessPack(
      baseInput(),
      buildClient({
        countryPackReviewIntake: countryPackReviewIntakeApprovalAudit({
          sourceCertificate: {
            auditLogRef: "country-pack-intake-audit-1",
            certificateHash: "sha256:intake-certificate",
            countryCode: "CM",
            proposedPackVersion: "CM-2026.2",
            proposedPackHash: "sha256:proposed-pack",
            status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
            targetFamilies: ["IRPP_PERIOD"],
          },
        }),
      }) as never,
    );

    expect(result.decision).toBe("NOT_READY");
    expect(result.gates.find((gate) => gate.key === "country_pack_review_intake")).toEqual(
      expect.objectContaining({
        status: "BLOCKED",
        blockerCodes: expect.arrayContaining([
          "FINAL_COUNTRY_PACK_REVIEW_INTAKE_FIXTURE_PROVENANCE_MISSING",
        ]),
        summary: expect.objectContaining({
          reviewEvidenceSourceHashCount: 0,
          fixtureEvidenceHashCount: 0,
        }),
      }),
    );
  });

  it("blocks final approval when legal-owner approval omits setup-ready statutory families", async () => {
    const result = await buildPayrollFinalReleaseReadinessPack(
      baseInput(),
      buildClient({
        proofBackfill: proofBackfillAudit({
          setupGate: {
            status: "READY",
            blockerCodes: [],
            statutoryScenarioCoverage: statutoryScenarioCoverage({
              readyFamilyCount: 2,
              requiredFamilyCount: 2,
              families: [
                {
                  family: "IRPP_PERIOD",
                  status: "READY",
                  capabilityStatus: "SUPPORTED",
                },
                {
                  family: "IRPP_YTD",
                  status: "READY",
                  capabilityStatus: "SUPPORTED",
                },
              ],
            }),
          },
        }),
      }) as never,
    );

    expect(result.decision).toBe("NOT_READY");
    expect(result.gates.find((gate) => gate.key === "country_pack_review_intake")).toEqual(
      expect.objectContaining({
        status: "BLOCKED",
        blockerCodes: expect.arrayContaining([
          "FINAL_COUNTRY_PACK_REVIEW_INTAKE_READY_FAMILY_COVERAGE_MISSING",
        ]),
        summary: expect.objectContaining({
          setupReadyFamilyCount: 2,
          setupReadyFamiliesMissingApproval: "IRPP_YTD",
        }),
      }),
    );
    expect(result.evidence.countryPackReviewIntake).toEqual(
      expect.objectContaining({
        targetFamilies: ["IRPP_PERIOD"],
        setupReadyFamilyCount: 2,
        setupReadyFamiliesMissingApproval: ["IRPP_YTD"],
      }),
    );
  });

  it("blocks final approval when approved country-pack families are missing from statutory setup coverage", async () => {
    const result = await buildPayrollFinalReleaseReadinessPack(
      baseInput(),
      buildClient({
        countryPackReviewIntake: countryPackReviewIntakeApprovalAudit({
          sourceCertificate: {
            auditLogRef: "country-pack-intake-audit-1",
            certificateHash: "sha256:intake-certificate",
            countryCode: "CM",
            proposedPackVersion: "CM-2026.2",
            proposedPackHash: "sha256:proposed-pack",
            status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
            targetFamilies: ["IRPP_CORRECTIONS"],
          },
        }),
      }) as never,
    );

    expect(result.decision).toBe("NOT_READY");
    expect(result.gates.find((gate) => gate.key === "statutory_setup")).toEqual(
      expect.objectContaining({
        status: "BLOCKED",
        blockerCodes: expect.arrayContaining([
          "FINAL_STATUTORY_APPROVED_TARGET_FAMILY_COVERAGE_MISMATCH",
        ]),
        summary: expect.objectContaining({
          approvedTargetFamilies: "IRPP_CORRECTIONS",
          approvedTargetFamiliesReadyInCoverage: false,
          missingApprovedTargetFamilies: "IRPP_CORRECTIONS",
        }),
      }),
    );
    expect(result.evidence.proofBackfill).toEqual(
      expect.objectContaining({
        setupStatutoryScenarioReadyFamilies: ["IRPP_PERIOD"],
        setupStatutoryScenarioMissingApprovedFamilies: ["IRPP_CORRECTIONS"],
      }),
    );
  });

  it("blocks legal-owner approvals that do not name certified target families", async () => {
    const result = await buildPayrollFinalReleaseReadinessPack(
      baseInput(),
      buildClient({
        countryPackReviewIntake: countryPackReviewIntakeApprovalAudit({
          sourceCertificate: {
            auditLogRef: "country-pack-intake-audit-1",
            certificateHash: "sha256:intake-certificate",
            countryCode: "CM",
            proposedPackVersion: "CM-2026.2",
            proposedPackHash: "sha256:proposed-pack",
            status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
            targetFamilies: [],
          },
        }),
      }) as never,
    );

    expect(result.decision).toBe("NOT_READY");
    expect(result.gates.find((gate) => gate.key === "country_pack_review_intake")).toEqual(
      expect.objectContaining({
        status: "BLOCKED",
        blockerCodes: expect.arrayContaining([
          "FINAL_COUNTRY_PACK_REVIEW_INTAKE_TARGET_FAMILIES_MISSING",
        ]),
      }),
    );
  });
  it("keeps authenticated safe-error browser evidence as action-required", async () => {
    const result = await buildPayrollFinalReleaseReadinessPack(
      baseInput({
        evidenceSnapshot: readyEvidenceSnapshot({
          browserAccessibility: {
            checkedAt: "2026-06-30T08:35:00.000Z",
            results: [
              {
                route: "/dashboard/payroll",
                renderState: "surface",
                seriousViolationCount: 0,
                mobileLayout: { hasDocumentOverflow: false },
              },
              {
                route: "/dashboard/payroll/runs",
                renderState: "safe-error",
                seriousViolationCount: 0,
                mobileLayout: { hasDocumentOverflow: false },
              },
            ],
          },
        }),
      }),
      buildClient() as never,
    );

    const browserGate = result.gates.find(
      (gate) => gate.key === "browser_validation",
    );
    expect(result.decision).toBe("NOT_READY");
    expect(browserGate).toEqual(
      expect.objectContaining({
        status: "ACTION_REQUIRED",
        blockerCodes: ["FINAL_BROWSER_SAFE_ERROR_STATES_REMAIN"],
      }),
    );
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "FINAL_BROWSER_SAFE_ERROR_STATES_REMAIN",
          severity: "medium",
        }),
      ]),
    );
  });

  it("blocks final approval when statutory scenario coverage proof is missing from proof-backfill setup evidence", async () => {
    const result = await buildPayrollFinalReleaseReadinessPack(
      baseInput(),
      buildClient({
        proofBackfill: proofBackfillAudit({
          setupGate: {
            status: "READY",
            blockerCodes: [],
            statutoryScenarioCoverage: statutoryScenarioCoverage({
              status: "BLOCKED",
              coverageHash: null,
              readyFamilyCount: 8,
              requiredFamilyCount: 9,
              blockerCodes: [
                "PAYROLL_STATUTORY_SCENARIO_COVERAGE_INCOMPLETE",
              ],
              reviewEvidence: {
                presentCount: 11,
                missingCount: 1,
                reviewedBy: ["Qualified Cameroon payroll tax reviewer"],
                reviewedOn: ["2026-06-28"],
                legalRefs: ["CM_PAYROLL_REVIEWED_SOURCE"],
                sourceEvidenceHashes: [],
              },
            }),
          },
        }),
      }) as never,
    );

    expect(result.decision).toBe("NOT_READY");
    expect(result.gates.find((gate) => gate.key === "statutory_setup")).toEqual(
      expect.objectContaining({
        status: "BLOCKED",
        blockerCodes: [
          "FINAL_STATUTORY_SCENARIO_COVERAGE_NOT_READY",
          "FINAL_STATUTORY_SCENARIO_COVERAGE_HASH_MISSING",
          "FINAL_STATUTORY_SCENARIO_REVIEW_EVIDENCE_MISSING",
        ],
      }),
    );
  });

  it("blocks final approval when persisted pilot certification lacks hash or carries blockers", async () => {
    const result = await buildPayrollFinalReleaseReadinessPack(
      baseInput(),
      buildClient({
        pilot: pilotAudit({
          certificateHash: null,
          blockers: [
            {
              code: "PILOT_PAYMENT_BATCH_NOT_SETTLED",
              severity: "critical",
              domain: "payment",
            },
          ],
        }),
      }) as never,
    );

    expect(result.decision).toBe("NOT_READY");
    expect(result.gates.find((gate) => gate.key === "pilot_cycle")).toEqual(
      expect.objectContaining({
        status: "BLOCKED",
        blockerCodes: expect.arrayContaining([
          "FINAL_PILOT_CERTIFICATE_HASH_MISSING",
          "FINAL_PILOT_CERTIFICATE_BLOCKERS_OPEN",
        ]),
      }),
    );
    expect(result.evidence.pilotCycle).toEqual(
      expect.objectContaining({
        certificateHash: null,
        blockerCount: 1,
      }),
    );
  });

  it("blocks when pilot and proof-backfill adapter chaos continuity is missing", async () => {
    const result = await buildPayrollFinalReleaseReadinessPack(
      baseInput(),
      buildClient({
        pilot: pilotAudit({
          proofContinuity: {
            expectedAdapterChaosReleaseGateHash: null,
            declarationAdapterChaosReleaseGateHashes: [],
            paymentAdapterChaosReleaseGateHashes: [],
            proofBackfillAdapterChaosReleaseGateHash: null,
            proofBackfillAdapterChaosMatchesExpected: false,
          },
        }),
        proofBackfill: proofBackfillAudit({
          sourceCertificate: {
            adapterChaosReleaseGateHash: ADAPTER_CHAOS_HASH,
            adapterChaosReleaseGateHashMatches: false,
          },
        }),
      }) as never,
    );

    expect(result.decision).toBe("NOT_READY");
    expect(result.gates.find((gate) => gate.key === "adapter_chaos")).toEqual(
      expect.objectContaining({
        status: "BLOCKED",
        blockerCodes: [
          "FINAL_ADAPTER_CHAOS_HASH_MISSING",
          "FINAL_ADAPTER_CHAOS_BACKFILL_MISMATCH",
        ],
      }),
    );
  });

  it("redacts identifiers and excludes raw sensitive payload classes", async () => {
    const result = await buildPayrollFinalReleaseReadinessPack(
      baseInput({
        evidenceSnapshot: readyEvidenceSnapshot({
          browserAccessibility: {
            checkedAt: "2026-06-30T08:35:00.000Z",
            results: [
              {
                route: "/dashboard/payroll",
                renderState: "surface",
                seriousViolationCount: 0,
                mobileLayout: { hasDocumentOverflow: false },
                rawProviderPayload: "provider-secret",
                bankAccountNumber: "0123456789",
              },
            ],
          },
        }),
      }),
      buildClient() as never,
    );

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(ORGANIZATION_ID);
    expect(serialized).not.toContain(PAYROLL_RUN_ID);
    expect(serialized).not.toContain("pilot-audit-1");
    expect(serialized).not.toContain("proof-backfill-audit-1");
    expect(serialized).not.toContain("provider-secret");
    expect(serialized).not.toContain("0123456789");
    expect(result.redaction).toEqual(
      expect.objectContaining({
        rawPersonDataIncluded: false,
        rawSalaryIncluded: false,
        rawPaymentDestinationIncluded: false,
        rawProviderPayloadIncluded: false,
        rawAuthorityPayloadIncluded: false,
        rawAuditLogIdsIncluded: false,
      }),
    );
  });
});
