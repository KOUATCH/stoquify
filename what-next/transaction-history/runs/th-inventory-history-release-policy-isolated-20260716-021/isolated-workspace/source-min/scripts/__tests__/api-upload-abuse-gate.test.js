const fs = require("fs")
const os = require("os")
const path = require("path")

const { buildApiRouteGuardInventory } = require("../api-route-guard-inventory")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "api-upload-abuse-gate-"))
}

function writeFile(root, relativePath, lines) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, lines.join(String.fromCharCode(10)), "utf8")
}

describe("API upload abuse gate", () => {
  it("accepts the inventory item media write boundary", () => {
    const root = makeTempRepo()
    writeFile(root, "app/api/uploadthing/core.ts", [
      "export async function requireUploadAuth() {",
      "  const authz = await requireApiSessionForCurrentOrg()",
      "  await requireApiModuleAccess({",
      "    organizationId: authz.organizationId,",
      "    user: authz.session.user,",
      "    moduleSlug: \"inventory\",",
      "    surfaceType: \"api\",",
      "    accessIntent: \"write\",",
      "    audit: true,",
      "  })",
      "  requireAnyAppPermission(authz.session.user, [",
      "    \"inventory.items.create\",",
      "    \"inventory.items.update\",",
      "  ])",
      "}",
      "export const ourFileRouter = { itemImageUpload: {} }",
    ])

    const report = buildApiRouteGuardInventory(root, { mode: "fail" })
    const uploadCore = report.records.find((record) => record.file.endsWith("api/uploadthing/core.ts"))

    expect(uploadCore).toMatchObject({
      permission: "inventory.items.create | inventory.items.update",
      moduleSlug: "inventory",
      moduleAccessIntent: "write",
      expectedModuleSlug: "inventory",
      issues: [],
    })
    expect(report.summary.status).toBe("ready")
  })

  it("blocks dashboard-read upload writes and unused generic endpoints", () => {
    const root = makeTempRepo()
    writeFile(root, "app/api/uploadthing/core.ts", [
      "export async function requireUploadAuth() {",
      "  const authz = await requireApiSessionForCurrentOrg()",
      "  await requireApiModuleAccess({",
      "    organizationId: authz.organizationId,",
      "    user: authz.session.user,",
      "    moduleSlug: \"dashboard\",",
      "    surfaceType: \"api\",",
      "    accessIntent: \"write\",",
      "    audit: true,",
      "  })",
      "  requireAppPermission(authz.session.user, \"dashboard.read\")",
      "}",
      "export const ourFileRouter = {",
      "  itemImageUpload: {},",
      "  fileUploads: {},",
      "  mailAttachments: {},",
      "}",
    ])

    const report = buildApiRouteGuardInventory(root, { mode: "fail" })
    const uploadCore = report.records.find((record) => record.file.endsWith("api/uploadthing/core.ts"))

    expect(uploadCore.issues).toEqual(expect.arrayContaining([
      "module_entitlement_slug_mismatch_expected_inventory",
      "upload_write_permission_inventory_item_create_or_update_required",
      "unused_upload_endpoint_exposed_fileUploads",
      "unused_upload_endpoint_exposed_mailAttachments",
    ]))
    expect(report.summary.status).toBe("blocked")
  })
})
