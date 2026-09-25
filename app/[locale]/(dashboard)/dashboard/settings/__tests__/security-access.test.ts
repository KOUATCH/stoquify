import { getSettingsRouteSurface } from "../settings-route-data-access"
import { hasRbacPermission, isKnownPermission } from "@/lib/security/rbac-permissions"
it("allows a canonical self-profile reader without unknown legacy requirements", () => {
  const surface = getSettingsRouteSurface("settings-security")!
  expect(surface.permissions.every(isKnownPermission)).toBe(true)
  expect(surface.permissions.every(permission => hasRbacPermission(["profile.read"], permission))).toBe(true)
  expect(surface.permissions.some(permission => hasRbacPermission(["dashboard.read"], permission))).toBe(false)
})
