import { expect, test, type APIRequestContext } from "@playwright/test"
import { execFileSync } from "node:child_process"
import { dirname } from "node:path"
import { existsSync, mkdirSync, rmSync } from "node:fs"

const authStatePath =
  process.env.PLAYWRIGHT_INVENTORY_ITEMS_STORAGE_STATE ??
  "playwright/.auth/inventory-items.json"
const organizationId =
  process.env.AQSTOQFLOW_INVENTORY_ITEMS_E2E_ORG_ID ??
  "org_inventory_items_e2e_local"
const requiredPermissions = [
  "inventory.items.read",
  "inventory.items.create",
  "inventory.items.update",
]

test.setTimeout(120_000)

function seedFixture() {
  execFileSync(
    process.execPath,
    ["scripts/inventory-items-e2e-fixture.js", "seed"],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    },
  )
}

async function createAuthState(input: {
  request: APIRequestContext
  email: string
  password: string
}) {
  if (existsSync(authStatePath)) rmSync(authStatePath)

  const response = await input.request.post("/api/auth/sign-in/email", {
    data: {
      email: input.email,
      password: input.password,
      rememberMe: true,
    },
  })
  const responseBody = await response.text()
  expect(
    response.ok(),
    `Unable to create the inventory-items Playwright auth state. Response: ${responseBody}`,
  ).toBe(true)

  const permissionsResponse = await input.request.get("/api/me/permissions")
  const permissionsBody = await permissionsResponse.text()
  expect(
    permissionsResponse.ok(),
    `Inventory-items auth state did not resolve to a fresh tenant RBAC context. Response: ${permissionsBody}`,
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
  expect((payload.roles ?? []).map((role) => role.code)).toContain(
    "INVENTORY_ITEMS_E2E",
  )

  mkdirSync(dirname(authStatePath), { recursive: true })
  await input.request.storageState({ path: authStatePath })
}

test("seeds a real tenant item and creates an authorized auth state", async ({
  request,
}) => {
  seedFixture()
  await createAuthState({
    request,
    email:
      process.env.AQSTOQFLOW_INVENTORY_ITEMS_E2E_EMAIL ??
      "inventory.items@stockflow.test",
    password:
      process.env.AQSTOQFLOW_INVENTORY_ITEMS_E2E_PASSWORD ??
      "InventoryItems@2026",
  })
})
