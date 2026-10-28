const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const test = global.test || require("node:test")

const { classifyInventory, renderMarkdown } = require("./classify-settings-surfaces")

function write(root, relativePath, source) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, source, "utf8")
}

function inventoryRecord(file, overrides = {}) {
  return {
    file,
    surfaceType: "action",
    moduleSlug: null,
    permission: null,
    guard: "none",
    observeOrEnforce: "report-only",
    classification: "unmapped, missing permission, enforcement candidate",
    ...overrides,
  }
}

test("classifies public identity, helpers, shims, canonical RBAC, legacy auth, and unresolved actions", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stoquify-settings-classifier-"))
  write(root, "actions/users/createInvitedUser.ts", `"use server"; acceptInvitationWorkflow(data)`)
  write(root, "actions/roles/role-utils.ts", `export const displayRoleName = (role) => role.nameEn`)
  write(root, "actions/roles/createRole.ts", `"use server"; requireFreshAuth(300); const ctx = requirePermission("roles.create"); resolveActionOrganization(input.orgId); observeModuleAccess({ moduleSlug: "settings" })`)
  write(root, "actions/brands/getOrgBrands.ts", `"use server"
import { getOrgBrands } from "./getBrandsAction"
export { getOrgBrands }
export default getOrgBrands`)
  write(root, "actions/units/deleteUnit.ts", `"use server"; const user = await getAuthenticatedUser(); user.organizationId`)
  write(root, "actions/storage/photo-upload-actions.ts", `"use server"; export async function uploadPhoto() { return null }`)
  write(root, "actions/modules/module-control.actions.ts", `"use server"; const action = protect<unknown, Data>({ permission: "MANAGE_SYSTEM_SETTINGS" }, async (_input, ctx) => { observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId }) })`)

  const report = classifyInventory(root, {
    summary: { generatedAt: "2026-07-11T00:00:00.000Z" },
    records: [
      inventoryRecord("actions/users/createInvitedUser.ts"),
      inventoryRecord("actions/roles/role-utils.ts"),
      inventoryRecord("actions/roles/createRole.ts", { moduleSlug: "settings", permission: "roles.create", guard: "requirePermission" }),
      inventoryRecord("actions/brands/getOrgBrands.ts"),
      inventoryRecord("actions/units/deleteUnit.ts"),
      inventoryRecord("actions/storage/photo-upload-actions.ts"),
      inventoryRecord("actions/modules/module-control.actions.ts", { moduleSlug: "settings", permission: "MANAGE_SYSTEM_SETTINGS", guard: "protect" }),
    ],
  })

  const byFile = new Map(report.records.map((record) => [record.file, record]))
  assert.equal(byFile.get("actions/users/createInvitedUser.ts").status, "allowed-public")
  assert.equal(byFile.get("actions/users/createInvitedUser.ts").authorizationBoundary, "token-bound-invitation")
  assert.equal(byFile.get("actions/roles/role-utils.ts").status, "helper")
  assert.equal(byFile.get("actions/roles/createRole.ts").status, "protected")
  assert.equal(byFile.get("actions/brands/getOrgBrands.ts").status, "delegated")
  assert.equal(byFile.get("actions/units/deleteUnit.ts").authorizationBoundary, "legacy-manual-auth")
  assert.ok(byFile.get("actions/units/deleteUnit.ts").findings.includes("canonical-permission-not-enforced"))
  assert.equal(byFile.get("actions/storage/photo-upload-actions.ts").status, "review-required")
  assert.ok(byFile.get("actions/storage/photo-upload-actions.ts").findings.includes("executable-action-without-approved-auth-boundary"))
  assert.equal(byFile.get("actions/modules/module-control.actions.ts").status, "protected")
  assert.ok(byFile.get("actions/modules/module-control.actions.ts").guardMarkers.includes("protect("))
  assert.match(renderMarkdown(report), /Active Findings/)
})
