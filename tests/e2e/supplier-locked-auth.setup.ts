import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  "http://127.0.0.1:" + (process.env.PLAYWRIGHT_PORT ?? "3000");
const lockedStatePath =
  process.env.PLAYWRIGHT_SUPPLIER_LOCKED_STORAGE_STATE ??
  "playwright/.auth/supplier-locked.json";
const lockedOrganizationId =
  process.env.AQSTOQFLOW_SUPPLIER_E2E_LOCKED_ORG_ID ??
  "org_supplier_e2e_locked";

test.setTimeout(180_000);

test("seeds the supplier module-locked tenant and creates its auth state", async ({
  playwright,
}) => {
  execFileSync(
    process.execPath,
    ["scripts/supplier-locked-e2e-fixture.js", "seed"],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    },
  );
  if (existsSync(lockedStatePath)) rmSync(lockedStatePath);

  const request = await playwright.request.newContext({ baseURL });
  try {
    const response = await request.post("/api/auth/sign-in/email", {
      data: {
        email:
          process.env.AQSTOQFLOW_SUPPLIER_E2E_LOCKED_EMAIL ??
          "supplier.locked@stockflow.test",
        password:
          process.env.AQSTOQFLOW_SUPPLIER_E2E_LOCKED_PASSWORD ??
          process.env.AQSTOQFLOW_SUPPLIER_E2E_PASSWORD ??
          "SupplierE2E@2026",
        rememberMe: true,
      },
    });
    const responseBody = await response.text();
    expect(
      response.ok(),
      "Unable to create supplier locked auth state. Response: " + responseBody,
    ).toBe(true);

    const permissionsResponse = await request.get("/api/me/permissions");
    const permissionsBody = await permissionsResponse.text();
    expect(
      permissionsResponse.ok(),
      "Supplier locked permissions failed. Response: " + permissionsBody,
    ).toBe(true);

    const payload = JSON.parse(permissionsBody) as {
      organizationId?: string;
      permissions?: string[];
      roles?: Array<{ code?: string }>;
    };
    expect(payload.organizationId).toBe(lockedOrganizationId);
    expect(payload.permissions ?? []).toEqual(
      expect.arrayContaining([
        "purchases.suppliers.read",
        "purchasing.ap.invoice.view",
      ]),
    );
    expect((payload.roles ?? []).map((role) => role.code)).toContain(
      "SUPPLIER_E2E_LOCKED",
    );

    mkdirSync(dirname(lockedStatePath), { recursive: true });
    await request.storageState({ path: lockedStatePath });
  } finally {
    await request.dispose();
  }
});
