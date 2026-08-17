const {
  assertCertificationTarget,
  REQUESTED_MODULES,
  REQUIRED_PERMISSIONS,
} = require("../pos-g0-e2e-fixture")

describe("POS G0 synthetic browser fixture", () => {
  it("accepts only the named local certification database and schema", () => {
    expect(() =>
      assertCertificationTarget({
        NODE_ENV: "test",
        DATABASE_URL:
          "postgresql://operator:redacted@localhost:5432/stoquify_dev_migrated_20260814?schema=codex_pos_commit_result_cert_20260817",
      }),
    ).not.toThrow()
    expect(() =>
      assertCertificationTarget({
        NODE_ENV: "test",
        DATABASE_URL:
          "postgresql://operator:redacted@example.com:5432/stoquify_dev_migrated_20260814?schema=codex_pos_commit_result_cert_20260817",
      }),
    ).toThrow(/local PostgreSQL host/)
    expect(() =>
      assertCertificationTarget({
        NODE_ENV: "production",
        DATABASE_URL:
          "postgresql://operator:redacted@localhost:5432/stoquify_dev_migrated_20260814?schema=codex_pos_commit_result_cert_20260817",
      }),
    ).toThrow(/production-marked/)
  })

  it("declares the POS, accounting, finance, and close entitlements and RBAC", () => {
    expect(REQUESTED_MODULES).toEqual(
      expect.arrayContaining(["pos", "accounting", "finance", "payment_reconciliation", "close_assurance"]),
    )
    expect(REQUIRED_PERMISSIONS).toEqual(
      expect.arrayContaining([
        "dashboard.read",
        "OPERATE_POS",
        "finance.read",
        "payments.reconciliation.read",
        "accounting.close.read",
      ]),
    )
  })
})
