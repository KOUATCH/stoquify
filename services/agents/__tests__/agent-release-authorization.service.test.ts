jest.mock("server-only", () => ({}));

const mockFindFirst = jest.fn();

jest.mock("@/prisma/db", () => ({
  db: {
    agentActivationPackage: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

import {
  COMMAND_AGENT_RELEASE_MANIFEST_HASH,
  REQUIRED_AGENT_OWNER_RESPONSIBILITIES,
} from "../agent-release-contracts";
import {
  AgentReleaseControlError,
  authorizeCommandAgentRelease,
} from "../agent-release-control.service";

const now = new Date("2026-07-24T10:00:00.000Z");

describe("Command Agent release authorization", () => {
  const originalCertificationMode =
    process.env.STOQUIFY_AGENT_CERTIFICATION_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.STOQUIFY_AGENT_CERTIFICATION_MODE;
  });

  afterAll(() => {
    if (originalCertificationMode === undefined) {
      delete process.env.STOQUIFY_AGENT_CERTIFICATION_MODE;
    } else {
      process.env.STOQUIFY_AGENT_CERTIFICATION_MODE =
        originalCertificationMode;
    }
  });

  it("authorizes only a healthy active release in the trusted tenant scope", async () => {
    mockFindFirst.mockResolvedValue(releaseFixture());

    await expect(
      authorizeCommandAgentRelease({
        organizationId: "org-1",
        roleCodes: ["manager"],
        rolloutMode: "internal",
        environment: "pilot",
        now,
      }),
    ).resolves.toEqual({
      packageId: "release-1",
      manifestHash: COMMAND_AGENT_RELEASE_MANIFEST_HASH,
      definitionRolloutMode: "internal",
      certificationSession: false,
    });

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          agentKey: "command-agent",
          environment: "pilot",
          state: { in: ["ACTIVE_INTERNAL"] },
        }),
      }),
    );
  });

  it("fails closed when reconciliation is stale or alert transport is unhealthy", async () => {
    mockFindFirst.mockResolvedValue(
      releaseFixture({
        lastReconciledAt: new Date("2026-07-24T09:00:00.000Z"),
        reconciliationState: "FAILED",
        alertTransportReady: false,
      }),
    );

    await expectReleaseError(
      authorizeCommandAgentRelease({
        organizationId: "org-1",
        roleCodes: ["manager"],
        rolloutMode: "internal",
        environment: "pilot",
        now,
      }),
      "RELEASE_RECONCILIATION_STALE",
    );
  });

  it("denies a role outside the package allowlist", async () => {
    mockFindFirst.mockResolvedValue(releaseFixture());

    await expectReleaseError(
      authorizeCommandAgentRelease({
        organizationId: "org-1",
        roleCodes: ["payroll_requester"],
        rolloutMode: "internal",
        environment: "pilot",
        now,
      }),
      "RELEASE_SCOPE_DENIED",
    );
  });

  it("does not expose draft, inactive, certified, suspended, or retired packages to production-like internal rollout", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expectReleaseError(
      authorizeCommandAgentRelease({
        organizationId: "org-other",
        roleCodes: ["manager"],
        rolloutMode: "internal",
        environment: "pilot",
        now,
      }),
      "RELEASE_NOT_FOUND",
    );

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-other",
          state: { in: ["ACTIVE_INTERNAL"] },
        }),
      }),
    );
  });

  it("permits only a provisioned inactive package in the explicit non-production certification session", async () => {
    process.env.STOQUIFY_AGENT_CERTIFICATION_MODE = "1";
    mockFindFirst.mockResolvedValue(
      releaseFixture({ state: "PROVISIONED_INACTIVE", environment: "e2e" }),
    );

    await expect(
      authorizeCommandAgentRelease({
        organizationId: "org-1",
        roleCodes: ["manager"],
        rolloutMode: "internal",
        environment: "e2e",
        now,
      }),
    ).resolves.toEqual({
      packageId: "release-1",
      manifestHash: COMMAND_AGENT_RELEASE_MANIFEST_HASH,
      definitionRolloutMode: "shadow",
      certificationSession: true,
    });

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          environment: "e2e",
          state: { in: ["PROVISIONED_INACTIVE"] },
        }),
      }),
    );
  });
});

async function expectReleaseError(
  promise: Promise<unknown>,
  code:
    | "RELEASE_NOT_FOUND"
    | "RELEASE_SCOPE_DENIED"
    | "RELEASE_RECONCILIATION_STALE",
) {
  try {
    await promise;
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AgentReleaseControlError);
    expect((error as AgentReleaseControlError).code).toBe(code);
  }
}

function releaseFixture(
  overrides: Partial<{
    state: "ACTIVE_INTERNAL" | "PROVISIONED_INACTIVE";
    environment: string;
    lastReconciledAt: Date;
    reconciliationState: "PASSED" | "FAILED";
    alertTransportReady: boolean;
  }> = {},
) {
  const activationStartsAt = new Date("2026-07-24T09:00:00.000Z");
  const activationEndsAt = new Date("2026-07-24T18:00:00.000Z");
  return {
    id: "release-1",
    organizationId: "org-1",
    agentKey: "command-agent",
    releaseVersion: "2026.07.24.1",
    environment: overrides.environment ?? "pilot",
    commitSha: "abcdef1234567890",
    manifestHash: COMMAND_AGENT_RELEASE_MANIFEST_HASH,
    manifest: {},
    modelProviderPolicy: {},
    allowedRoleCodes: ["manager"],
    activationStartsAt,
    activationEndsAt,
    residualRisks: null,
    state: overrides.state ?? "ACTIVE_INTERNAL",
    version: 12,
    requestedById: "requester",
    activatedById: "release-operator",
    activatedAt: new Date("2026-07-24T09:45:00.000Z"),
    suspendedAt: null,
    suspensionReason: null,
    retiredAt: null,
    retiredById: null,
    retirementReason: null,
    lastReconciledAt:
      overrides.lastReconciledAt ??
      new Date("2026-07-24T09:58:00.000Z"),
    reconciliationState: overrides.reconciliationState ?? "PASSED",
    alertTransportReady: overrides.alertTransportReady ?? true,
    createdAt: now,
    updatedAt: now,
    approvals: [
      approval("PRODUCT", "product-approver"),
      approval("SECURITY", "security-approver"),
    ],
    owners: REQUIRED_AGENT_OWNER_RESPONSIBILITIES.map(
      (responsibility, index) => ({
        id: `owner-${index}`,
        packageId: "release-1",
        responsibility,
        primaryUserId: `primary-${index}`,
        backupUserId: `backup-${index}`,
        escalationRouteRef: `runbook://agent/${responsibility.toLowerCase()}`,
        runbookVersion: "1.0.0",
        acceptedAt: new Date("2026-07-24T08:30:00.000Z"),
        validUntil: new Date("2026-07-25T18:00:00.000Z"),
        coverageStartsAt: activationStartsAt,
        coverageEndsAt: activationEndsAt,
        createdAt: now,
        updatedAt: now,
      }),
    ),
    certifications: [
      {
        id: "cert-1",
        packageId: "release-1",
        idempotencyKey: "certification:ci-123",
        requestHash: `sha256:${"f".repeat(64)}`,
        commitSha: "abcdef1234567890",
        manifestHash: COMMAND_AGENT_RELEASE_MANIFEST_HASH,
        suiteVersion: "command-agent-enabled-v1",
        ciRunId: "ci-123",
        result: "PASSED",
        reportHash: `sha256:${"c".repeat(64)}`,
        passedAt: new Date("2026-07-24T09:30:00.000Z"),
        expiresAt: activationEndsAt,
        createdAt: now,
      },
    ],
  };
}

function approval(
  approvalType: "PRODUCT" | "SECURITY",
  approverId: string,
) {
  return {
    id: `${approvalType.toLowerCase()}-approval`,
    packageId: "release-1",
    idempotencyKey: `approval:${approvalType.toLowerCase()}:release-1`,
    requestHash: `sha256:${"d".repeat(64)}`,
    approvalType,
    decision: "APPROVED",
    approverId,
    evidenceHash: `sha256:${"a".repeat(64)}`,
    riskAcceptance: null,
    decidedAt: new Date("2026-07-24T08:00:00.000Z"),
    expiresAt: new Date("2026-07-25T08:00:00.000Z"),
    revokedAt: null,
    createdAt: now,
  };
}
