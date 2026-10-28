import { execFileSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"

type Fixture = {
  organizationId: string
  email: string
  password: string
  permissions: string[]
  roleCode: string
  storageStatePath: string
}

const fixturePath = resolve(process.cwd(), "playwright/.auth/supplier-po-ack-fixture.json")

test("seed supplier PO acknowledgement fixture and create fresh buyer session", async ({ request }) => {
  execFileSync(process.execPath, ["scripts/supplier-po-ack-e2e-fixture.js", "seed"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  })
  expect(existsSync(fixturePath)).toBe(true)
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture

  const response = await request.post("/api/auth/sign-in/email", {
    data: { email: fixture.email, password: fixture.password, rememberMe: true },
  })
  expect(response.ok(), await response.text()).toBe(true)

  execFileSync(process.execPath, ["scripts/supplier-po-ack-e2e-fixture.js", "assure"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  })

  const permissionsResponse = await request.get("/api/me/permissions")
  expect(permissionsResponse.ok(), await permissionsResponse.text()).toBe(true)
  const permissions = await permissionsResponse.json() as {
    organizationId?: string
    permissions?: string[]
    roles?: Array<{ code?: string }>
  }
  expect(permissions.organizationId).toBe(fixture.organizationId)
  for (const permission of fixture.permissions) {
    expect(permissions.permissions ?? []).toContain(permission)
  }
  expect((permissions.roles ?? []).map((role) => role.code)).toContain(fixture.roleCode)

  mkdirSync(dirname(fixture.storageStatePath), { recursive: true })
  await request.storageState({ path: fixture.storageStatePath })
})
