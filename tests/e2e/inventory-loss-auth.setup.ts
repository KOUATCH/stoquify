import { expect, test, type APIRequestContext } from "@playwright/test";
import { dirname } from "node:path";
import { existsSync, mkdirSync, rmSync } from "node:fs";

const inventoryLossAuthStatePath =
  process.env.PLAYWRIGHT_INVENTORY_LOSS_STORAGE_STATE ??
  "playwright/.auth/inventory-loss.json";
const inventoryLossOrganizationId =
  process.env.AQSTOQFLOW_INVENTORY_LOSS_E2E_ORG_ID ??
  "org_inventory_loss_e2e_local";

const requiredPermissions = ["dashboard.read", "inventory.levels.read"];

test.setTimeout(90_000);

async function createInventoryLossAuthState(input: {
  request: APIRequestContext;
  email: string;
  password: string;
}) {
  if (existsSync(inventoryLossAuthStatePath)) {
    rmSync(inventoryLossAuthStatePath);
  }

  const response = await input.request.post("/api/auth/sign-in/email", {
    data: {
      email: input.email,
      password: input.password,
      rememberMe: true,
    },
  });

  const body = await response.text();
  expect(
    response.ok(),
    "Unable to create inventory-loss Playwright auth state for " +
      input.email +
      ". Run npm run seed:e2e:inventory-loss first. Response: " +
      body,
  ).toBe(true);

  const permissionsResponse = await input.request.get("/api/me/permissions");
  const permissionsBody = await permissionsResponse.text();
  expect(
    permissionsResponse.ok(),
    "Inventory-loss auth state did not resolve to a fresh tenant RBAC context. Response: " +
      permissionsBody,
  ).toBe(true);

  const permissionsPayload = JSON.parse(permissionsBody) as {
    organizationId?: string;
    permissions?: string[];
    roles?: Array<{ code?: string }>;
  };
  expect(permissionsPayload.organizationId).toBe(inventoryLossOrganizationId);

  for (const permission of requiredPermissions) {
    expect(
      permissionsPayload.permissions ?? [],
      "Inventory-loss auth state is missing " +
        permission +
        ". Roles: " +
        JSON.stringify(permissionsPayload.roles ?? []),
    ).toContain(permission);
  }

  expect(
    (permissionsPayload.roles ?? []).map((role) =>
      String(role.code ?? "").toLowerCase(),
    ),
  ).toContain("admin");

  mkdirSync(dirname(inventoryLossAuthStatePath), { recursive: true });
  await input.request.storageState({ path: inventoryLossAuthStatePath });
}

test("creates a tenant-scoped inventory-loss auth state", async ({
  request,
}) => {
  await createInventoryLossAuthState({
    request,
    email:
      process.env.AQSTOQFLOW_INVENTORY_LOSS_E2E_EMAIL ??
      "inventory.loss@stockflow.test",
    password:
      process.env.AQSTOQFLOW_INVENTORY_LOSS_E2E_PASSWORD ??
      "InventoryLoss@2026",
  });
});
