const { validateApprovedPackage } = require("../x1-approval-automation-orchestrator");

const now = new Date("2026-09-02T12:00:00Z");
const draft = { records: [1, 2, 3].map((id) => ({ recordId: `record-${id}`, policyId: `POL-00${id}` })) };
function decisions(overrides = {}) {
  return { records: draft.records.map((record) => ({ ...record, status: "APPROVED", decision: "APPROVED", approverDirectoryId: "reviewer", authorityAppointmentReference: "authority", signatureReference: "signature", decidedAt: "2026-09-01T12:00:00Z", expiresAt: "2026-09-03T12:00:00Z", ...overrides })) };
}

describe("X1 approval decision validity at synchronization", () => {
  it("accepts complete currently valid decisions", () => {
    expect(() => validateApprovedPackage(decisions(), draft, now)).not.toThrow();
  });
  it.each([
    { expiresAt: "2026-09-02T11:59:59Z" },
    { expiresAt: "2026-09-02T12:00:00Z" },
    { expiresAt: "not-a-date" },
    { decidedAt: "not-a-date" },
    { decidedAt: "2026-09-02T12:00:01Z" },
    { expiresAt: "2026-09-01T12:00:00Z" },
  ])("rejects expired, malformed, future or empty decision windows: %j", (overrides) => {
    expect(() => validateApprovedPackage(decisions(overrides), draft, now)).toThrow(/invalid or expired window/);
  });
  it("still requires real decision fields and all three records", () => {
    expect(() => validateApprovedPackage(decisions({ signatureReference: "" }), draft, now)).toThrow(/incomplete/);
    expect(() => validateApprovedPackage({ records: [] }, draft, now)).toThrow(/three decisions/);
  });
});
