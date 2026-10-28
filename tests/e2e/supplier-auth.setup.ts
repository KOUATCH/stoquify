import { expect, test, type APIRequestContext } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, rmSync } from "node:fs";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  "http://127.0.0.1:" + (process.env.PLAYWRIGHT_PORT ?? "3000");
const permittedStatePath =
  process.env.PLAYWRIGHT_SUPPLIER_STORAGE_STATE ??
  "playwright/.auth/supplier.json";
const deniedStatePath =
  process.env.PLAYWRIGHT_SUPPLIER_DENIED_STORAGE_STATE ??
  "playwright/.auth/supplier-denied.json";
const organizationId =
  process.env.AQSTOQFLOW_SUPPLIER_E2E_ORG_ID ?? "org_supplier_e2e_local";
const evidenceDir =
  process.env.PLAYWRIGHT_SUPPLIER_EVIDENCE_DIR ??
  join(
    process.cwd(),
    "what-next",
    "evidence",
    "purchasing-ap-supplier-presentation-2026-08-10",
  );
const requiredPermissions = [
  "purchases.suppliers.read",
  "purchases.suppliers.create",
  "purchases.suppliers.update",
  "purchases.suppliers.delete",
  "purchasing.ap.invoice.view",
  "finance.payables.read",
  "reports.export",
];
const forbiddenPermissions = [...requiredPermissions];

test.setTimeout(180_000);

function seedFixture() {
  if (existsSync(evidenceDir)) rmSync(evidenceDir, { recursive: true });
  execFileSync(process.execPath, ["scripts/supplier-e2e-fixture.js", "seed"], {
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

  let permissionsDetail = "request not attempted";
  let payload:
    | {
        organizationId?: string;
        permissions?: string[];
        roles?: Array<{ code?: string }>;
      }
    | undefined;
  for (const delay of [0, 500, 1_000, 2_000, 3_000]) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const permissionsResponse = await input.request.get("/api/me/permissions");
    const permissionsBody = await permissionsResponse.text();
    permissionsDetail =
      String(permissionsResponse.status()) + ": " + permissionsBody;
    if (!permissionsResponse.ok()) continue;
    try {
      payload = JSON.parse(permissionsBody) as {
        organizationId?: string;
        permissions?: string[];
        roles?: Array<{ code?: string }>;
      };
      break;
    } catch {
      // Retry transient dev-server manifest reads that return incomplete JSON.
    }
  }
  expect(
    payload,
    input.label + " permissions failed. Last response: " + permissionsDetail,
  ).toBeDefined();
  if (!payload) throw new Error(input.label + " permissions response was empty");
  expect(payload.organizationId).toBe(organizationId);
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

test("seeds supplier fixtures and creates permitted plus denied auth states", async ({
  playwright,
}) => {
  seedFixture();

  const permittedRequest = await playwright.request.newContext({ baseURL });
  const deniedRequest = await playwright.request.newContext({ baseURL });
  try {
    await createAuthState({
      request: permittedRequest,
      label: "supplier permitted user",
      email:
        process.env.AQSTOQFLOW_SUPPLIER_E2E_EMAIL ??
        "supplier.admin@stockflow.test",
      password:
        process.env.AQSTOQFLOW_SUPPLIER_E2E_PASSWORD ?? "SupplierE2E@2026",
      statePath: permittedStatePath,
      required: requiredPermissions,
      roleCode: "SUPPLIER_E2E_ADMIN",
    });
    await createAuthState({
      request: deniedRequest,
      label: "supplier denied user",
      email:
        process.env.AQSTOQFLOW_SUPPLIER_E2E_DENIED_EMAIL ??
        "supplier.denied@stockflow.test",
      password:
        process.env.AQSTOQFLOW_SUPPLIER_E2E_DENIED_PASSWORD ??
        process.env.AQSTOQFLOW_SUPPLIER_E2E_PASSWORD ??
        "SupplierE2E@2026",
      statePath: deniedStatePath,
      required: ["dashboard.read"],
      forbidden: forbiddenPermissions,
      roleCode: "SUPPLIER_E2E_DENIED",
    });
  } finally {
    await permittedRequest.dispose();
    await deniedRequest.dispose();
  }
});
