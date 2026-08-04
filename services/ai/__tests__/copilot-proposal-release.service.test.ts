jest.mock("server-only", () => ({}))

import {
  COPILOT_PROPOSAL_RELEASE_MANIFEST_HASH,
  authorizeCopilotProposalRelease,
} from "../copilot-proposal-release.service"

const now = new Date("2026-07-27T12:00:00.000Z")
const COMMIT_SHA = "a".repeat(40)

describe("copilot proposal release authorization", () => {
  const originalKillSwitch =
    process.env.STOQUIFY_COPILOT_PROPOSAL_KILL_SWITCH
  const originalReleaseCommit =
    process.env.STOQUIFY_AGENT_RELEASE_COMMIT_SHA

  beforeEach(() => {
    delete process.env.STOQUIFY_COPILOT_PROPOSAL_KILL_SWITCH
    process.env.STOQUIFY_AGENT_RELEASE_COMMIT_SHA = COMMIT_SHA
  })

  afterAll(() => {
    if (originalKillSwitch === undefined) {
      delete process.env.STOQUIFY_COPILOT_PROPOSAL_KILL_SWITCH
    } else {
      process.env.STOQUIFY_COPILOT_PROPOSAL_KILL_SWITCH = originalKillSwitch
    }
    if (originalReleaseCommit === undefined) {
      delete process.env.STOQUIFY_AGENT_RELEASE_COMMIT_SHA
    } else {
      process.env.STOQUIFY_AGENT_RELEASE_COMMIT_SHA = originalReleaseCommit
    }
  })

  it("authorizes an active governed release with no execution authority", async () => {
    const loadRelease = jest.fn().mockResolvedValue(releaseFixture())

    await expect(
      authorizeCopilotProposalRelease(
        {
          organizationId: "org-1",
          roleCodes: ["Finance Manager"],
          environment: "pilot",
          now,
        },
        { loadRelease },
      ),
    ).resolves.toEqual({
      packageId: "proposal-release-1",
      manifestHash: COPILOT_PROPOSAL_RELEASE_MANIFEST_HASH,
      executionAuthority: "NONE",
    })

    expect(loadRelease).toHaveBeenCalledWith({
      organizationId: "org-1",
      environment: "pilot",
    })
  })

  it.each([
    ["missing release", null],
    ["manifest mismatch", releaseFixture({ manifestHash: "sha256:invalid" })],
    [
      "stale reconciliation",
      releaseFixture({
        lastReconciledAt: new Date("2026-07-27T11:00:00.000Z"),
      }),
    ],
    ["unhealthy alerts", releaseFixture({ alertTransportReady: false })],
    ["expired window", releaseFixture({ activationEndsAt: now })],
    ["missing owner evidence", releaseFixture({ owners: [] })],
    ["missing certification", releaseFixture({ certifications: [] })],
  ])("fails closed for %s", async (_case, release) => {
    await expect(
      authorizeCopilotProposalRelease(
        {
          organizationId: "org-1",
          roleCodes: ["finance_manager"],
          environment: "pilot",
          now,
        },
        { loadRelease: jest.fn().mockResolvedValue(release) },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("fails closed for a role outside the approved pilot scope", async () => {
    await expect(
      authorizeCopilotProposalRelease(
        {
          organizationId: "org-1",
          roleCodes: ["cashier"],
          environment: "pilot",
          now,
        },
        { loadRelease: jest.fn().mockResolvedValue(releaseFixture()) },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("fails closed when the deployed commit identity is missing", async () => {
    delete process.env.STOQUIFY_AGENT_RELEASE_COMMIT_SHA

    await expect(
      authorizeCopilotProposalRelease(
        {
          organizationId: "org-1",
          roleCodes: ["finance_manager"],
          environment: "pilot",
          now,
        },
        { loadRelease: jest.fn().mockResolvedValue(releaseFixture()) },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("fails closed when the active package does not match the deployed commit", async () => {
    const release = releaseFixture({ commitSha: "b".repeat(40) })
    release.certifications = release.certifications.map((certification) => ({
      ...certification,
      commitSha: release.commitSha,
    }))

    await expect(
      authorizeCopilotProposalRelease(
        {
          organizationId: "org-1",
          roleCodes: ["finance_manager"],
          environment: "pilot",
          now,
        },
        { loadRelease: jest.fn().mockResolvedValue(release) },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it.each([
    [
      "future reconciliation evidence",
      () =>
        releaseFixture({
          lastReconciledAt: new Date("2026-07-27T12:00:00.001Z"),
        }),
    ],
    [
      "one approver acting for product and security",
      () =>
        releaseFixture({
          approvals: [
            approval("PRODUCT", "shared-approver"),
            approval("SECURITY", "shared-approver"),
          ],
        }),
    ],
    [
      "future owner acceptance",
      () => {
        const release = baseRelease()
        release.owners = release.owners.map((owner, index) =>
          index === 0
            ? {
                ...owner,
                acceptedAt: new Date("2026-07-27T12:00:00.001Z"),
              }
            : owner,
        )
        return release
      },
    ],
    [
      "future certification",
      () => {
        const release = baseRelease()
        release.certifications = release.certifications.map((certification) => ({
          ...certification,
          passedAt: new Date("2026-07-27T12:00:00.001Z"),
        }))
        return release
      },
    ],
  ])("rejects non-current governance evidence: %s", async (_case, buildRelease) => {
    await expect(
      authorizeCopilotProposalRelease(
        {
          organizationId: "org-1",
          roleCodes: ["finance_manager"],
          environment: "pilot",
          now,
        },
        { loadRelease: jest.fn().mockResolvedValue(buildRelease()) },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("fails closed when the emergency kill switch is active", async () => {
    process.env.STOQUIFY_COPILOT_PROPOSAL_KILL_SWITCH = "1"
    const loadRelease = jest.fn()

    await expect(
      authorizeCopilotProposalRelease(
        {
          organizationId: "org-1",
          roleCodes: ["finance_manager"],
          environment: "pilot",
          now,
        },
        { loadRelease },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })

    expect(loadRelease).not.toHaveBeenCalled()
  })
})

function releaseFixture(
  overrides: Partial<ReturnType<typeof baseRelease>> = {},
) {
  return { ...baseRelease(), ...overrides }
}

function baseRelease() {
  return {
    id: "proposal-release-1",
    manifestHash: COPILOT_PROPOSAL_RELEASE_MANIFEST_HASH,
    commitSha: COMMIT_SHA,
    allowedRoleCodes: ["finance_manager"],
    activationStartsAt: new Date("2026-07-27T11:00:00.000Z"),
    activationEndsAt: new Date("2026-07-27T18:00:00.000Z"),
    lastReconciledAt: new Date("2026-07-27T11:58:00.000Z"),
    reconciliationState: "PASSED",
    alertTransportReady: true,
    approvals: [
      approval("PRODUCT", "product-approver"),
      approval("SECURITY", "security-approver"),
    ],
    owners: [
      "ROLLOUT",
      "ROLLBACK",
      "SUPPORT",
      "PILOT",
      "SECURITY_INCIDENT",
      "ON_CALL_BACKUP",
    ].map((responsibility, index) => ({
      responsibility,
      primaryUserId: `primary-${index}`,
      backupUserId: `backup-${index}`,
      escalationRouteRef: `runbook://copilot/${responsibility.toLowerCase()}`,
      runbookVersion: "1.0.0",
      acceptedAt: new Date("2026-07-27T10:00:00.000Z"),
      validUntil: new Date("2026-07-28T18:00:00.000Z"),
      coverageStartsAt: new Date("2026-07-27T11:00:00.000Z"),
      coverageEndsAt: new Date("2026-07-27T18:00:00.000Z"),
    })),
    certifications: [
      {
        commitSha: COMMIT_SHA,
        manifestHash: COPILOT_PROPOSAL_RELEASE_MANIFEST_HASH,
        result: "PASSED",
        passedAt: new Date("2026-07-27T11:30:00.000Z"),
        expiresAt: new Date("2026-07-27T18:00:00.000Z"),
      },
    ],
  }
}

function approval(approvalType: string, approverId: string) {
  return {
    approvalType,
    decision: "APPROVED",
    approverId,
    decidedAt: new Date("2026-07-27T10:00:00.000Z"),
    expiresAt: new Date("2026-07-28T10:00:00.000Z"),
    revokedAt: null,
  }
}
