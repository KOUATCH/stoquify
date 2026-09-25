import { render, screen } from "@testing-library/react"
import Page from "../page"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { getSupplierPoAcknowledgementWorkbench } from "@/services/purchase-order/supplier-po-acknowledgement.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getTranslations } from "next-intl/server"
import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
jest.mock("next-intl/server", () => ({ getTranslations: jest.fn() }))
jest.mock("lucide-react", () => { const React = jest.requireActual("react"); const Icon = (props: Record<string, unknown>) => React.createElement("svg", props); return { AlertTriangle: Icon, Building2: Icon, Clock3: Icon, LockKeyhole: Icon, PackageX: Icon, SearchX: Icon } })
jest.mock("next-intl/routing", () => ({ defineRouting: (value: unknown) => value }))
jest.mock("next/navigation", () => ({ notFound: () => { throw new Error("not found") } }))
jest.mock("@/lib/security/rbac", () => ({ RbacError: class extends Error { constructor(message: string, public code: string, public status: number) { super(message) } }, requirePermission: jest.fn(), requireAllPermissions: jest.fn(), requireAnyPermission: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/purchase-order/supplier-po-acknowledgement.service", () => ({ getSupplierPoAcknowledgementWorkbench: jest.fn() }))
jest.mock("@/components/purchase-orders/SupplierPoAcknowledgementWorkbench", () => ({ SupplierPoAcknowledgementWorkbench: () => <div data-testid="allowed-workbench" /> }))
const permission = requirePermission as jest.Mock, read = getSupplierPoAcknowledgementWorkbench as jest.Mock, moduleAccess = observeModuleAccess as jest.Mock
beforeEach(() => {
  jest.clearAllMocks(); permission.mockResolvedValue({ orgId: "current-org", userId: "current-buyer", permissions: ["purchases.orders.read"] }); moduleAccess.mockResolvedValue({ allowed: true }); read.mockResolvedValue({})
  ;(getTranslations as jest.Mock).mockImplementation(async ({ locale }: { locale: string }) => (key: string) => (locale === "fr" ? fr : en).supplierPoAcknowledgement.buyerWorkbench[key as keyof typeof en.supplierPoAcknowledgement.buyerWorkbench])
})
it("loads only the scoped current buyer's order after the page guards", async () => {
  render(await Page({ params: Promise.resolve({ locale: "en", id: "po" }) })); expect(screen.getByTestId("allowed-workbench")).toBeVisible()
  expect(read).toHaveBeenCalledWith({ organizationId: "current-org", actorId: "current-buyer", purchaseOrderId: "po" }); expect(moduleAccess).toHaveBeenCalledWith(expect.objectContaining({ moduleSlug: "purchasing", accessIntent: "read", mode: "enforce" }))
})
it.each(["en", "fr"])("localizes permission denial and never calls the read service: %s", async locale => {
  permission.mockRejectedValue(new RbacError("denied", "FORBIDDEN", 403)); render(await Page({ params: Promise.resolve({ locale, id: "po" }) })); const copy = (locale === "fr" ? fr : en).supplierPoAcknowledgement.buyerWorkbench
  expect(screen.getByRole("heading", { name: copy.deniedTitle })).toBeVisible(); expect(screen.getByRole("link", { name: copy.backToDashboard })).toHaveAttribute("href", `/${locale}/dashboard`); expect(read).not.toHaveBeenCalled()
})
it("localizes missing organization and module denial without an empty history", async () => {
  permission.mockRejectedValueOnce(new RbacError("no organization", "NO_ACTIVE_ORG", 403)); const view = render(await Page({ params: Promise.resolve({ locale: "fr", id: "po" }) })); expect(screen.getByRole("heading", { name: fr.supplierPoAcknowledgement.buyerWorkbench.organizationTitle })).toBeVisible(); view.unmount()
  moduleAccess.mockResolvedValue({ allowed: false }); render(await Page({ params: Promise.resolve({ locale: "fr", id: "po" }) })); expect(screen.getByRole("heading", { name: fr.supplierPoAcknowledgement.buyerWorkbench.moduleTitle })).toBeVisible(); expect(read).not.toHaveBeenCalled()
})
it.each([[new ForbiddenError(), "deniedTitle"], [new NotFoundError(), "missingTitle"]] as const)("handles a changed boundary between page guard and service", async (error, key) => {
  read.mockRejectedValue(error); render(await Page({ params: Promise.resolve({ locale: "fr", id: "po" }) })); expect(screen.getByRole("heading", { name: fr.supplierPoAcknowledgement.buyerWorkbench[key] })).toBeVisible(); expect(screen.queryByTestId("allowed-workbench")).not.toBeInTheDocument()
})
it("keeps unexpected failures visible to the route error boundary", async () => {
  read.mockRejectedValue(new Error("database unavailable")); await expect(Page({ params: Promise.resolve({ locale: "en", id: "po" }) })).rejects.toThrow("database unavailable")
})
