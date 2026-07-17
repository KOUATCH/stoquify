import { expect, test, type APIRequestContext } from "@playwright/test"
import { dirname } from "node:path"
import { existsSync, mkdirSync, rmSync } from "node:fs"

const managerAuthStatePath =
  process.env.PLAYWRIGHT_STORAGE_STATE ?? "playwright/.auth/payroll.json"
const deniedAuthStatePath =
  process.env.PLAYWRIGHT_RBAC_DENIED_STORAGE_STATE ??
  "playwright/.auth/payroll-requester.json"
const organizationId =
  process.env.AQSTOQFLOW_E2E_ORG_ID ?? "org_payroll_e2e_local"

test.setTimeout(90_000)

async function createTenantAuthState(input: {
  request: APIRequestContext
  label: string
  email: string
  password: string
  authStatePath: string
  requiredPermissions: string[]
  forbiddenPermissions?: string[]
}) {
  if (existsSync(input.authStatePath)) rmSync(input.authStatePath)

  const response = await input.request.post("/api/auth/sign-in/email", {
    data: {
      email: input.email,
      password: input.password,
      rememberMe: true,
    },
  })

  const body = await response.text()
  expect(
    response.ok(),
    "Unable to create " +
      input.label +
      " Playwright auth state for " +
      input.email +
      ". Run npm run seed:e2e:payroll first. Response: " +
      body,
  ).toBe(true)

  const permissionsResponse = await input.request.get("/api/me/permissions")
  const permissionsBody = await permissionsResponse.text()
  expect(
    permissionsResponse.ok(),
    input.label +
      " auth state did not resolve to a fresh tenant RBAC context. Response: " +
      permissionsBody,
  ).toBe(true)

  const permissionsPayload = JSON.parse(permissionsBody) as {
    organizationId?: string
    permissions?: string[]
    roles?: Array<{ code?: string }>
  }
  expect(
    permissionsPayload.organizationId,
    input.label +
      " auth state resolved to organization " +
      (permissionsPayload.organizationId ?? "(missing)"),
  ).toBe(organizationId)

  for (const permission of input.requiredPermissions) {
    expect(
      permissionsPayload.permissions ?? [],
      input.label +
        " auth state is missing " +
        permission +
        ". Roles: " +
        JSON.stringify(permissionsPayload.roles ?? []),
    ).toContain(permission)
  }
  for (const permission of input.forbiddenPermissions ?? []) {
    expect(
      permissionsPayload.permissions ?? [],
      input.label +
        " denied-role fixture unexpectedly grants " +
        permission +
        ".",
    ).not.toContain(permission)
  }

  mkdirSync(dirname(input.authStatePath), { recursive: true })
  await input.request.storageState({ path: input.authStatePath })
}

test("creates a tenant-scoped payroll and HRIS manager auth state", async ({
  request,
}) => {
  await createTenantAuthState({
    request,
    label: "HRIS manager",
    email: process.env.AQSTOQFLOW_E2E_EMAIL ?? "hr.manager@stockflow.test",
    password: process.env.AQSTOQFLOW_E2E_PASSWORD ?? "HrManager@2026",
    authStatePath: managerAuthStatePath,
    requiredPermissions: [
      "payroll.command.read",
      "hris.people.read",
      "hris.people.manage",
      "hris.self_service.read",
    ],
  })
})

test("creates an authenticated payroll requester without HRIS access", async ({
  request,
}) => {
  await createTenantAuthState({
    request,
    label: "HRIS denied requester",
    email:
      process.env.AQSTOQFLOW_E2E_REQUESTER_EMAIL ??
      "payroll.requester@stockflow.test",
    password:
      process.env.AQSTOQFLOW_E2E_REQUESTER_PASSWORD ??
      process.env.AQSTOQFLOW_E2E_PASSWORD ??
      "HrManager@2026",
    authStatePath: deniedAuthStatePath,
    requiredPermissions: ["payroll.command.read"],
    forbiddenPermissions: [
      "hris.people.read",
      "hris.people.manage",
      "hris.self_service.read",
      "hris.self_service.request",
    ],
  })
})
