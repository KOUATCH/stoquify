import {
  BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL,
  evaluateBranchDailyCloseSignOffControl,
} from "../branch-daily-close-sign-off-control"

describe("branch daily-close sign-off control policy", () => {
  it("freezes the sensitive action, dashboard ownership, write intent, and assurance contract", () => {
    expect(BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL).toMatchObject({
      action: "branch.daily-close.sign",
      permission: "branch.daily-close.sign",
      moduleSlug: "dashboard",
      accessIntent: "write",
      surfaceType: "action",
      surface: "branch.daily-close.sign",
      moduleControlMode: "enforce",
      riskTier: "critical",
      requiredAssurance: "L1",
      freshAuthMaxAgeSeconds: 300,
      blockSelfApproval: true,
      auditAction: "BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL",
      detectorSignals: [
        "branch_daily_close_sign_off_attempt",
        "branch_daily_close_self_approval_attempt",
        "branch_daily_close_evidence_drift",
      ],
    })
  })

  it("allows the control only when sensitive-action and module decisions both allow", () => {
    const decision = evaluateBranchDailyCloseSignOffControl({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["branch.daily-close.sign"],
      subjectActorId: "operator-1",
      lastAuthAt: Date.now(),
    })

    expect(decision).toMatchObject({
      allowed: true,
      sensitiveAction: { allowed: true, reasonCode: "ALLOWED" },
      moduleEntitlement: {
        allowed: true,
        result: "allow",
        moduleSlug: "dashboard",
        accessIntent: "write",
        mode: "enforce",
      },
    })
  })

  it("denies sign-off when the dashboard entitlement is read-only", () => {
    const decision = evaluateBranchDailyCloseSignOffControl({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["branch.daily-close.sign"],
      subjectActorId: "operator-1",
      lastAuthAt: Date.now(),
      explicitEntitlements: [
        {
          moduleSlug: "dashboard",
          status: "read_only",
          source: "manual_override",
          startsAt: null,
          endsAt: null,
          readOnly: true,
          trial: false,
        },
      ],
    })

    expect(decision).toMatchObject({
      allowed: false,
      sensitiveAction: { allowed: true, reasonCode: "ALLOWED" },
      moduleEntitlement: {
        allowed: false,
        wouldBlock: true,
        result: "deny",
        moduleSlug: "dashboard",
        accessIntent: "write",
        mode: "enforce",
      },
    })
  })
})
