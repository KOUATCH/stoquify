jest.mock("server-only", () => ({}));
jest.mock("@/prisma/db", () => ({ db: {} }));

import {
  COMMAND_AGENT_RELEASE_MANIFEST_HASH,
  REQUIRED_AGENT_OWNER_RESPONSIBILITIES,
  assignAgentOwnerSchema,
  hashAgentReleaseCommand,
  recordAgentApprovalSchema,
  recordAgentPilotCertificationSchema,
} from "../agent-release-contracts";
import { evaluateAgentActivationReadiness } from "../agent-release-control.service";

const now = new Date("2026-07-24T10:00:00.000Z");

function releaseFixture() {
  return {
    id: "release-1",
    organizationId: "org-1",
    agentKey: "command-agent",
    releaseVersion: "2026.07.24.1",
    environment: "pilot",
    commitSha: "abcdef1234567890",
    manifestHash: COMMAND_AGENT_RELEASE_MANIFEST_HASH,
    manifest: {},
    modelProviderPolicy: {},
    allowedRoleCodes: ["manager"],
    activationStartsAt: new Date("2026-07-24T09:00:00.000Z"),
    activationEndsAt: new Date("2026-07-24T18:00:00.000Z"),
    residualRisks: null,
    state: "PILOT_CERTIFIED" as const,
    version: 12,
    requestedById: "requester",
    activatedById: null,
    activatedAt: null,
    suspendedAt: null,
    suspensionReason: null,
    lastReconciledAt: new Date("2026-07-24T09:58:00.000Z"),
    reconciliationState: "PASSED",
    alertTransportReady: true,
    createdAt: now,
    updatedAt: now,
    approvals: [
      {
        id: "product-approval",
        packageId: "release-1",
        idempotencyKey: "approval:product:release-1",
        requestHash: `sha256:${"d".repeat(64)}`,
        approvalType: "PRODUCT" as const,
        decision: "APPROVED" as const,
        approverId: "product-approver",
        evidenceHash: `sha256:${"a".repeat(64)}`,
        riskAcceptance: null,
        decidedAt: new Date("2026-07-24T08:00:00.000Z"),
        expiresAt: new Date("2026-07-25T08:00:00.000Z"),
        revokedAt: null,
        createdAt: now,
      },
      {
        id: "security-approval",
        packageId: "release-1",
        idempotencyKey: "approval:security:release-1",
        requestHash: `sha256:${"e".repeat(64)}`,
        approvalType: "SECURITY" as const,
        decision: "APPROVED" as const,
        approverId: "security-approver",
        evidenceHash: `sha256:${"b".repeat(64)}`,
        riskAcceptance: null,
        decidedAt: new Date("2026-07-24T08:05:00.000Z"),
        expiresAt: new Date("2026-07-25T08:05:00.000Z"),
        revokedAt: null,
        createdAt: now,
      },
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
        coverageStartsAt: new Date("2026-07-24T09:00:00.000Z"),
        coverageEndsAt: new Date("2026-07-24T18:00:00.000Z"),
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
        result: "PASSED" as const,
        reportHash: `sha256:${"c".repeat(64)}`,
        passedAt: new Date("2026-07-24T09:30:00.000Z"),
        expiresAt: new Date("2026-07-24T18:00:00.000Z"),
        createdAt: now,
      },
    ],
  };
}

describe("agent release activation readiness", () => {
  it("passes only with current, separated, complete evidence", () => {
    expect(evaluateAgentActivationReadiness(releaseFixture(), now)).toEqual({
      ready: true,
      blockers: [],
    });
  });

  it("fails closed for stale reconciliation, unavailable alerting, and missing certification", () => {
    const release = releaseFixture();
    release.lastReconciledAt = new Date("2026-07-24T09:00:00.000Z");
    release.alertTransportReady = false;
    release.certifications = [];
    expect(evaluateAgentActivationReadiness(release, now)).toEqual({
      ready: false,
      blockers: [
        "RELEASE_CERTIFICATION_INVALID",
        "RELEASE_RECONCILIATION_STALE",
        "RELEASE_ALERT_TRANSPORT_UNHEALTHY",
      ],
    });
  });

  it("hashes equivalent replay payloads deterministically, including dates", () => {
    const decidedAt = new Date("2026-07-24T08:00:00.000Z");
    expect(
      hashAgentReleaseCommand({
        decision: "APPROVED",
        decidedAt,
        evidence: { b: 2, a: 1 },
      }),
    ).toBe(
      hashAgentReleaseCommand({
        evidence: { a: 1, b: 2 },
        decidedAt: new Date(decidedAt.toISOString()),
        decision: "APPROVED",
      }),
    );
  });

  it("requires valid idempotency keys for approvals and certifications", () => {
    const common = {
      organizationId: "org-1",
      packageId: "release-1",
      commitSha: "abcdef1234567890",
      manifestHash: COMMAND_AGENT_RELEASE_MANIFEST_HASH,
      suiteVersion: "enabled-v1",
      ciRunId: "ci-123",
      result: "PASSED" as const,
      reportHash: `sha256:${"c".repeat(64)}`,
      passedAt: now,
      expiresAt: new Date(now.getTime() + 60_000),
    };
    expect(
      recordAgentPilotCertificationSchema.safeParse({
        ...common,
        idempotencyKey: "short",
      }).success,
    ).toBe(false);
    expect(
      recordAgentPilotCertificationSchema.safeParse({
        ...common,
        idempotencyKey: "certification:ci-123",
      }).success,
    ).toBe(true);
  });
  it("requires tenant scope and rejects one person as primary and backup owner", () => {
    expect(
      recordAgentApprovalSchema.safeParse({ packageId: "release-1" }).success,
    ).toBe(false);
    expect(
      assignAgentOwnerSchema.safeParse({
        organizationId: "org-1",
        packageId: "release-1",
        responsibility: "ROLLOUT",
        primaryUserId: "same-user",
        backupUserId: "same-user",
        escalationRouteRef: "runbook://agent/rollout",
        runbookVersion: "1.0.0",
        coverageStartsAt: now,
        coverageEndsAt: new Date(now.getTime() + 60_000),
      }).success,
    ).toBe(false);
  });
});
