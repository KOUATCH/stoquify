import { expect, test } from "@playwright/test"
import { execFileSync } from "node:child_process"
import { dirname } from "node:path"
import { existsSync, mkdirSync, rmSync } from "node:fs"

const authStatePath =
  process.env.PLAYWRIGHT_POS_G0_STORAGE_STATE ?? "playwright/.auth/pos-g0.json"
const organizationId =
  process.env.AQSTOQFLOW_POS_G0_ORG_ID ?? "org_stoquify_pos_g0_cert_001"
const email = "pos.g0.certifier@stoquify.invalid"
const password = process.env.AQSTOQFLOW_POS_G0_PASSWORD ?? "PosG0Synthetic@2026"
const requiredPermissions = [
  "dashboard.read",
  "OPERATE_POS",
  "finance.read",
  "payments.reconciliation.read",
  "accounting.close.read",
]

test.setTimeout(120_000)

test("seeds the synthetic POS tenant and creates a fresh tenant-scoped auth state", async ({
  request,
}) => {
  execFileSync(process.execPath, ["scripts/pos-g0-e2e-fixture.js"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  })

  if (existsSync(authStatePath)) rmSync(authStatePath)
  const response = await request.post("/api/auth/sign-in/email", {
    data: { email, password, rememberMe: true },
  })
  const responseBody = await response.text()
  expect(response.ok(), `Unable to create POS G0 auth state. Response: ${responseBody}`).toBe(true)

  const permissionsResponse = await request.get("/api/me/permissions")
  const permissionsBody = await permissionsResponse.text()
  expect(
    permissionsResponse.ok(),
    `POS G0 auth state did not resolve to fresh tenant RBAC. Response: ${permissionsBody}`,
  ).toBe(true)
  const payload = JSON.parse(permissionsBody) as {
    organizationId?: string
    permissions?: string[]
    roles?: Array<{ code?: string }>
  }
  expect(payload.organizationId).toBe(organizationId)
  for (const permission of requiredPermissions) {
    expect(payload.permissions ?? []).toContain(permission)
  }
  expect((payload.roles ?? []).map((role) => role.code)).toContain("ADMINISTRATOR")

  mkdirSync(dirname(authStatePath), { recursive: true })
  await request.storageState({ path: authStatePath })
})
