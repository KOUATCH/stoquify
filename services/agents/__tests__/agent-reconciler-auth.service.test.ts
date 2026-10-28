import {
  isAgentReconcilerConfigured,
  isAuthorizedAgentReconciler,
  resolveAgentReconcilerPolicy,
} from "../agent-reconciler-auth.service";

const SECRET = "0123456789abcdef0123456789abcdef";
const PREVIOUS_SECRET = "fedcba9876543210fedcba9876543210";

describe("agent reconciler controls", () => {
  it("requires a server-side secret with at least 32 characters", () => {
    expect(isAgentReconcilerConfigured(undefined)).toBe(false);
    expect(isAgentReconcilerConfigured("short")).toBe(false);
    expect(isAgentReconcilerConfigured("x".repeat(513))).toBe(false);
    expect(isAgentReconcilerConfigured(SECRET)).toBe(true);
  });

  it("fails closed for missing, short, or mismatched secrets", () => {
    expect(
      isAuthorizedAgentReconciler({
        authorizationHeader: `Bearer ${SECRET}`,
        configuredSecret: undefined,
      }),
    ).toBe(false);
    expect(
      isAuthorizedAgentReconciler({
        authorizationHeader: "Bearer short",
        configuredSecret: "short",
      }),
    ).toBe(false);
    expect(
      isAuthorizedAgentReconciler({
        authorizationHeader: `Bearer ${SECRET.slice(0, -1)}0`,
        configuredSecret: SECRET,
      }),
    ).toBe(false);
  });

  it("accepts the exact current or bounded previous bearer secret", () => {
    expect(
      isAuthorizedAgentReconciler({
        authorizationHeader: `Bearer ${SECRET}`,
        configuredSecret: SECRET,
        previousSecret: PREVIOUS_SECRET,
      }),
    ).toBe(true);
    expect(
      isAuthorizedAgentReconciler({
        authorizationHeader: `Bearer ${PREVIOUS_SECRET}`,
        configuredSecret: SECRET,
        previousSecret: PREVIOUS_SECRET,
      }),
    ).toBe(true);
  });

  it("bounds the global worker batch and abandonment window", () => {
    expect(
      resolveAgentReconcilerPolicy({
        STOQUIFY_AGENT_RECONCILE_AFTER_MINUTES: "1",
        STOQUIFY_AGENT_RECONCILE_LIMIT: "900",
      }),
    ).toEqual({ olderThanMinutes: 5, limit: 500 });
  });
});
