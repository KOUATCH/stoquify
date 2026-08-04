const fs = require("fs");
const path = require("path");

const {
  assertLocalSeedAllowed,
  INVENTORY_LOSS_E2E_FIXTURE_CONTRACT,
} = require("../seed-inventory-loss-e2e-user");

const source = fs.readFileSync(
  path.join(process.cwd(), "scripts/seed-inventory-loss-e2e-user.js"),
  "utf8",
);

describe("inventory-loss E2E fixture guard", () => {
  it.each([
    ["NODE_ENV", "production"],
    ["AQSTOQFLOW_ENV", "PRODUCTION"],
    ["VERCEL_ENV", "production"],
  ])("refuses %s=%s", (key, value) => {
    expect(() =>
      assertLocalSeedAllowed({
        NODE_ENV: "test",
        AQSTOQFLOW_ENV: "local",
        VERCEL_ENV: "preview",
        [key]: value,
      }),
    ).toThrow(/Local-only inventory-loss browser fixture.*Refusing to run/);
  });

  it("allows an explicitly local test environment", () => {
    expect(() =>
      assertLocalSeedAllowed({
        NODE_ENV: "test",
        AQSTOQFLOW_ENV: "local",
        VERCEL_ENV: "preview",
      }),
    ).not.toThrow();
  });

  it("publishes only the bounded tenant, module, role, and permission contract", () => {
    expect(INVENTORY_LOSS_E2E_FIXTURE_CONTRACT).toEqual({
      fixtureSource: "scripts/seed-inventory-loss-e2e-user.js",
      fixturePurpose: "authenticated inventory-loss browser certification",
      productionBackfill: false,
      organizationId: "org_inventory_loss_e2e_local",
      roleCode: "admin",
      requestedModules: ["inventory"],
      requiredPermissions: ["dashboard.read", "inventory.levels.read"],
    });
  });

  it("contains local-only fixture writes without product activation authority", () => {
    expect(source).toContain("assertLocalSeedAllowed()");
    expect(source).toContain("requestedModules: REQUESTED_MODULES");
    expect(source).toContain("status: AdjustmentStatus.COMPLETED");
    expect(source).toContain("productionBackfill: false");
    expect(source).not.toMatch(
      /CHECK_RUNNERS|scheduleWorkflow|createSafeAction|router|worker|cron|whatsApp|copilot/i,
    );
    expect(source).not.toMatch(
      /stockAdjustment(?:Line)?\.(?:deleteMany|createMany)|\$executeRaw(?:Unsafe)?/,
    );
  });

  it("does not export fixture credentials", () => {
    expect(Object.keys(INVENTORY_LOSS_E2E_FIXTURE_CONTRACT)).not.toContain(
      "password",
    );
    expect(Object.keys(INVENTORY_LOSS_E2E_FIXTURE_CONTRACT)).not.toContain(
      "email",
    );
  });
});
