import { render, screen } from "@testing-library/react"
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
jest.mock("@/components/dashboard/DashboardRouteState", () => ({ DashboardRouteState: (props: any) => <div data-testid="state" data-kind={props.kind}>{props.message}{props.secondaryHref && <a href={props.secondaryHref}>{props.secondaryLabel}</a>}</div> }))
jest.mock("@/lib/security/rbac", () => ({
  RbacError: class extends Error { constructor(message: string, public code: string, public status: number) { super(message) } },
  requirePermission: jest.fn(), requireAllPermissions: jest.fn(), requireAnyPermission: jest.fn(),
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/access-requests/access-request-entry", () => ({ getItemAccessRequestDenial: jest.fn() }))
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { getItemAccessRequestDenial } from "@/services/access-requests/access-request-entry"
import { withInventorySurfaceAccess } from "../../inventory/inventory-route-access"
const surface = { key: "inventory-items", route: "/dashboard/inventory/items", title: "Items", resource: "Item", permissions: ["inventory.items.read"] }
const run = (key = surface.key) => withInventorySurfaceAccess({ params: Promise.resolve({ locale: "fr" }), surface: { ...surface, key }, permissionOptions: { resourceId: "protected-record" }, onAllowed: () => <div>allowed</div> })
beforeEach(() => {
  jest.clearAllMocks()
  ;(requirePermission as jest.Mock).mockRejectedValue(new RbacError("Denied", "FORBIDDEN", 403))
  ;(getItemAccessRequestDenial as jest.Mock).mockResolvedValue({ moduleBlocked: false, requestHref: "/dashboard/access-requests?target=items" })
})
it("connects a verified item-read denial to a safe localized task", async () => {
  render(await run())
  const link = screen.getByRole("link", { name: "Demander un examen des accès" })
  expect(link).toHaveAttribute("href", "/fr/dashboard/access-requests?target=items")
  expect(link.getAttribute("href")).not.toContain("protected-record")
})
it("does not offer read access for an unrelated mutation denial", async () => {
  render(await run("inventory-items-create"))
  expect(getItemAccessRequestDenial).not.toHaveBeenCalled(); expect(screen.queryByRole("link")).not.toBeInTheDocument()
})
it("shows module blockage separately and offers no permission request", async () => {
  ;(getItemAccessRequestDenial as jest.Mock).mockResolvedValue({ moduleBlocked: true, requestHref: null })
  render(await run()); expect(screen.getByTestId("state")).toHaveAttribute("data-kind", "locked_module"); expect(screen.queryByRole("link")).not.toBeInTheDocument()
})
it("never offers a request for an expired session", async () => {
  ;(requirePermission as jest.Mock).mockRejectedValue(new RbacError("Expired", "UNAUTHENTICATED", 401))
  render(await run()); expect(screen.getByTestId("state")).toHaveAttribute("data-kind", "stale_session"); expect(getItemAccessRequestDenial).not.toHaveBeenCalled()
})
