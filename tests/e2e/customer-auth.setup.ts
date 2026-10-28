import { expect, test, type APIRequestContext } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { existsSync, mkdirSync, rmSync } from "node:fs";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  "http://127.0.0.1:" + (process.env.PLAYWRIGHT_PORT ?? "3000");
const permittedStatePath =
  process.env.PLAYWRIGHT_CUSTOMER_STORAGE_STATE ??
  "playwright/.auth/customer.json";
const deniedStatePath =
  process.env.PLAYWRIGHT_CUSTOMER_DENIED_STORAGE_STATE ??
  "playwright/.auth/customer-denied.json";
const lockedStatePath =
  process.env.PLAYWRIGHT_CUSTOMER_LOCKED_STORAGE_STATE ??
  "playwright/.auth/customer-locked.json";
const organizationId =
  process.env.AQSTOQFLOW_CUSTOMER_E2E_ORG_ID ?? "org_customer_e2e_local";
const lockedOrganizationId =
  process.env.AQSTOQFLOW_CUSTOMER_E2E_LOCKED_ORG_ID ??
  "org_customer_e2e_locked";
const requiredPermissions = [
  "customers.read",
  "customers.create",
  "customers.update",
  "customers.analytics.read",
  "customers.orders.read",
  "customers.export",
  "sales.read",
  "accounting.exports.create",
];

test.setTimeout(180_000);

function seedFixture() {
  execFileSync(process.execPath, ["scripts/customer-e2e-fixture.js", "seed"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
}

async function createAuthState(input: {
  request: APIRequestContext;
  label: string;
  email: string;
  password: string;
  statePath: string;
  organizationId: string;
  required: string[];
  forbidden?: string[];
  roleCode: string;
}) {
  if (existsSync(input.statePath)) rmSync(input.statePath);

  const response = await input.request.post("/api/auth/sign-in/email", {
    data: {
      email: input.email,
      password: input.password,
      rememberMe: true,
    },
  });
  const responseBody = await response.text();
  expect(
    response.ok(),
    "Unable to create " +
      input.label +
      " auth state. Response: " +
      responseBody,
  ).toBe(true);

  const permissionsResponse = await input.request.get("/api/me/permissions");
  const permissionsBody = await permissionsResponse.text();
  expect(
    permissionsResponse.ok(),
    input.label + " permissions failed. Response: " + permissionsBody,
  ).toBe(true);

  const payload = JSON.parse(permissionsBody) as {
    organizationId?: string;
    permissions?: string[];
    roles?: Array<{ code?: string }>;
  };
  expect(payload.organizationId).toBe(input.organizationId);
  for (const permission of input.required) {
    expect(payload.permissions ?? []).toContain(permission);
  }
  for (const permission of input.forbidden ?? []) {
    expect(payload.permissions ?? []).not.toContain(permission);
  }
  expect((payload.roles ?? []).map((role) => role.code)).toContain(
    input.roleCode,
  );

  mkdirSync(dirname(input.statePath), { recursive: true });
  await input.request.storageState({ path: input.statePath });
}

test("seeds customer fixtures and creates permitted, denied, and locked auth states", async ({
  playwright,
}) => {
  seedFixture();

  const permittedRequest = await playwright.request.newContext({ baseURL });
  const deniedRequest = await playwright.request.newContext({ baseURL });
  const lockedRequest = await playwright.request.newContext({ baseURL });
  try {
    await createAuthState({
      request: permittedRequest,
      label: "customer permitted user",
      email:
        process.env.AQSTOQFLOW_CUSTOMER_E2E_EMAIL ??
        "customer.admin@stockflow.test",
      password:
        process.env.AQSTOQFLOW_CUSTOMER_E2E_PASSWORD ?? "CustomerE2E@2026",
      statePath: permittedStatePath,
      organizationId,
      required: requiredPermissions,
      roleCode: "CUSTOMER_E2E_ADMIN",
    });
    await createAuthState({
      request: deniedRequest,
      label: "customer denied user",
      email:
        process.env.AQSTOQFLOW_CUSTOMER_E2E_DENIED_EMAIL ??
        "customer.denied@stockflow.test",
      password:
        process.env.AQSTOQFLOW_CUSTOMER_E2E_DENIED_PASSWORD ??
        process.env.AQSTOQFLOW_CUSTOMER_E2E_PASSWORD ??
        "CustomerE2E@2026",
      statePath: deniedStatePath,
      organizationId,
      required: ["dashboard.read"],
      forbidden: ["customers.read", "accounting.exports.create"],
      roleCode: "CUSTOMER_E2E_DENIED",
    });
    await createAuthState({
      request: lockedRequest,
      label: "customer locked-module user",
      email:
        process.env.AQSTOQFLOW_CUSTOMER_E2E_LOCKED_EMAIL ??
        "customer.locked@stockflow.test",
      password:
        process.env.AQSTOQFLOW_CUSTOMER_E2E_LOCKED_PASSWORD ??
        process.env.AQSTOQFLOW_CUSTOMER_E2E_PASSWORD ??
        "CustomerE2E@2026",
      statePath: lockedStatePath,
      organizationId: lockedOrganizationId,
      required: ["customers.read", "accounting.exports.create"],
      roleCode: "CUSTOMER_E2E_LOCKED",
    });
  } finally {
    await permittedRequest.dispose();
    await deniedRequest.dispose();
    await lockedRequest.dispose();
  }
});
