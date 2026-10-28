const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const migration = fs.readFileSync(
  path.join(
    root,
    "prisma",
    "migrations",
    "20260720130000_cash_shortage_policy_governance",
    "migration.sql",
  ),
  "utf8",
);
const schema = fs.readFileSync(
  path.join(root, "prisma", "schema.prisma"),
  "utf8",
);

describe("cash-shortage policy governance migration", () => {
  it("creates a tenant-scoped append-only policy family without seed data", () => {
    expect(migration).toContain('CREATE TABLE "cash_shortage_policies"');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "cash_shortage_policies_organizationId_currency_version_key"',
    );
    expect(migration).toMatch(
      /FOREIGN KEY \("organizationId"\) REFERENCES "organizations"\("id"\) ON DELETE CASCADE/,
    );
    expect(migration).toMatch(
      /FOREIGN KEY \("createdById"\) REFERENCES "users"\("id"\) ON DELETE RESTRICT/,
    );
    expect(migration).toMatch(
      /FOREIGN KEY \("approvedById"\) REFERENCES "users"\("id"\) ON DELETE RESTRICT/,
    );
    expect(migration).not.toMatch(/INSERT\s+INTO\s+"cash_shortage_policies"/i);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"cash_shortage_policies"/i);
    expect(migration).not.toMatch(/UPDATE\s+"cash_shortage_policies"\s+SET/i);
  });

  it("enforces money, effective-window, and approval-evidence checks", () => {
    expect(migration).toContain('"reviewThreshold" > 0');
    expect(migration).toContain('"highThreshold" >= "reviewThreshold"');
    expect(migration).toContain('"minorUnitScale" BETWEEN 0 AND 4');
    expect(migration).toContain('"effectiveTo" > "effectiveFrom"');
    expect(migration).toMatch(
      /"status" = 'DRAFT'[\s\S]*"documentHash" IS NULL/,
    );
    expect(migration).toMatch(
      /"status" = 'APPROVED'[\s\S]*"approvedById" IS NOT NULL[\s\S]*"approvedAt" IS NOT NULL[\s\S]*\^\[a-f0-9\]\{64\}\$/,
    );
  });

  it("prevents updates after approval and keeps enforce mode absent", () => {
    expect(migration).toContain(
      "CREATE TYPE \"CashShortagePolicyMode\" AS ENUM ('OBSERVE')",
    );
    expect(migration).toContain(
      "IF OLD.\"status\" = 'APPROVED' AND NEW IS DISTINCT FROM OLD",
    );
    expect(migration).toContain(
      'CREATE TRIGGER "cash_shortage_policies_approved_immutable"',
    );
    expect(migration).not.toMatch(/\bENFORCE\b/);
  });

  it("matches the Prisma policy model and ownership relations", () => {
    expect(schema).toMatch(
      /model CashShortagePolicy \{[\s\S]*@@unique\(\[organizationId, currency, version\]\)/,
    );
    expect(schema).toContain('@relation("CashShortagePolicyCreatedBy"');
    expect(schema).toContain('@relation("CashShortagePolicyApprovedBy"');
    expect(schema).toMatch(/enum CashShortagePolicyMode \{\s+OBSERVE\s+\}/);
  });
});
