jest.unmock("@/actions/command-center/follow-up.actions");
jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn() }));
jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((_options, handler) => async (input: unknown) => {
    try {
      return {
        success: true,
        data: await handler(input, { orgId: "org", userId: "actor" }),
      };
    } catch {
      return { success: false, code: "FORBIDDEN" };
    }
  }),
}));
jest.mock("@/services/command-center/persistence.service", () => ({
  loadFollowUps: jest.fn(),
  changeFollowUp: jest.fn(),
  reviewFollowUps: jest.fn(),
  followUpCandidates: jest.fn(),
  saveFollowUpPreference: jest.fn(),
  acknowledgeFollowUpNotice: jest.fn(),
}));
import { requireSession } from "@/lib/security/auth-session";
import {
  loadFollowUps,
  changeFollowUp,
  saveFollowUpPreference,
} from "@/services/command-center/persistence.service";
import {
  getCommandCenterFollowUps,
  changeCommandCenterFollowUp,
  saveCommandCenterPreference,
} from "../follow-up.actions";
const query = {
  center: "manager" as const,
  periodStart: "2026-10-24T00:00:00.000Z",
  periodEnd: "2026-10-24T23:59:59.999Z",
};
const session = {
  ctx: { orgId: "org", userId: "actor", permissions: ["dashboard.read"] },
  claims: { sessionId: "session", sessionToken: "synthetic-session-token" },
};
beforeEach(() => {
  jest.clearAllMocks();
  (requireSession as jest.Mock).mockResolvedValue(session);
});
it("derives tenant, actor and session exclusively from verified server context", async () => {
  await getCommandCenterFollowUps(query);
  expect(loadFollowUps).toHaveBeenCalledWith(
    {
      organizationId: "org",
      actorId: "actor",
      session: { id: "session", token: "synthetic-session-token" },
    },
    query,
  );
});
it("rejects injected tenant input before reading source data", async () => {
  expect(
    (
      await getCommandCenterFollowUps({
        ...query,
        organizationId: "foreign",
      } as never)
    ).success,
  ).toBe(false);
  expect(loadFollowUps).not.toHaveBeenCalled();
});
it("rejects a changed authenticated context before invoking the service", async () => {
  (requireSession as jest.Mock)
    .mockResolvedValueOnce(session)
    .mockResolvedValueOnce({
      ...session,
      ctx: { ...session.ctx, orgId: "changed" },
    });
  expect((await getCommandCenterFollowUps(query)).success).toBe(false);
  expect(loadFollowUps).not.toHaveBeenCalled();
});
it("rejects invalid revision and command identity", async () => {
  expect(
    (
      await changeCommandCenterFollowUp({
        ...query,
        requestId: "not-uuid",
        itemId: "bad",
        expectedRevision: 0,
        ownerId: "actor",
        state: "ASSIGNED",
        dueAt: null,
      })
    ).success,
  ).toBe(false);
  expect(changeFollowUp).not.toHaveBeenCalled();
});
it("rejects incomplete quiet-hour preferences", async () => {
  expect(
    (
      await saveCommandCenterPreference({
        ...query,
        enabled: true,
        quietStart: 4,
        quietEnd: null,
      })
    ).success,
  ).toBe(false);
  expect(saveFollowUpPreference).not.toHaveBeenCalled();
});
it("rejects an excessive reporting window", async () => {
  expect(
    (
      await getCommandCenterFollowUps({
        ...query,
        periodStart: "2024-01-01T00:00:00.000Z",
      })
    ).success,
  ).toBe(false);
  expect(loadFollowUps).not.toHaveBeenCalled();
});
