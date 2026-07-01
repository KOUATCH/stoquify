import { expect, test } from "@playwright/test"
import { dirname } from "node:path"
import { existsSync, mkdirSync, rmSync } from "node:fs"

const authStatePath = process.env.PLAYWRIGHT_STORAGE_STATE ?? "playwright/.auth/payroll.json"
const email = process.env.AQSTOQFLOW_E2E_EMAIL ?? "hr.manager@stockflow.test"
const password = process.env.AQSTOQFLOW_E2E_PASSWORD ?? "HrManager@2026"

test.setTimeout(90_000)

test("creates a tenant-scoped payroll auth storage state", async ({ request }) => {
  if (existsSync(authStatePath)) {
    rmSync(authStatePath)
  }

  const response = await request.post("/api/auth/sign-in/email", {
    data: {
      email,
      password,
      rememberMe: true,
    },
  })

  const body = await response.text()
  expect(response.ok(), `Unable to create payroll Playwright auth state for ${email}. Run npm run auth:payroll:bootstrap from a clean shell, or run npm run seed:e2e:payroll before auth setup, or set AQSTOQFLOW_E2E_EMAIL/AQSTOQFLOW_E2E_PASSWORD for a payroll-enabled test user. Response: ${body}`).toBe(true)

  const permissionsResponse = await request.get("/api/me/permissions")
  const permissionsBody = await permissionsResponse.text()
  expect(permissionsResponse.ok(), `Payroll auth state for ${email} did not resolve to a fresh tenant RBAC context. Response: ${permissionsBody}`).toBe(true)

  const permissionsPayload = JSON.parse(permissionsBody) as {
    organizationId?: string
    permissions?: string[]
    roles?: Array<{ code?: string }>
  }
  expect(
    permissionsPayload.organizationId,
    `Payroll auth state for ${email} resolved to organization ${permissionsPayload.organizationId ?? "(missing)"}`,
  ).toBe(process.env.AQSTOQFLOW_E2E_ORG_ID ?? "org_payroll_e2e_local")
  expect(
    permissionsPayload.permissions ?? [],
    `Payroll auth state for ${email} is missing payroll.command.read. Roles: ${JSON.stringify(permissionsPayload.roles ?? [])}`,
  ).toContain("payroll.command.read")

  mkdirSync(dirname(authStatePath), { recursive: true })
  await request.storageState({ path: authStatePath })
})

