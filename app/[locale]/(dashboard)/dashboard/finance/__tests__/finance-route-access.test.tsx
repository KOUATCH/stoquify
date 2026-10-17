import { render, screen } from "@testing-library/react"
import type { SVGProps } from "react"

jest.mock("lucide-react", () => new Proxy({ __esModule: true }, {
  get(target, prop: string) {
    if (prop in target) return target[prop as keyof typeof target]
    return (props: SVGProps<SVGSVGElement>) => <svg {...props} />
  },
}))

jest.mock("@/components/modules/TenantModuleActivationButton", () => ({
  TenantModuleActivationButton: jest.fn(({ labels }: { labels: { button: string } }) => <button>{labels.button}</button>),
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => locale === "fr" ? "fr" : "en",
}))
jest.mock("@/lib/security/rbac", () => ({
  RbacError: class RbacError extends Error {
    constructor(message: string, public readonly code: string, public readonly status: number) { super(message) }
  },
  requireAnyPermission: jest.fn(),
}))

import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { TenantModuleActivationButton } from "@/components/modules/TenantModuleActivationButton"
import { routeByKey, withFinanceSurfaceAccess } from "../finance-route-access"

const requirePermission = requireAnyPermission as jest.Mock
const observeAccess = observeModuleAccess as jest.Mock
const onAllowed = jest.fn(() => <div>Protected finance evidence</div>)

describe("Finance route denied states inside the dashboard shell", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requirePermission.mockResolvedValue({ orgId: "org-a", userId: "user-a", permissions: ["payments.reconciliation.read"] })
    observeAccess.mockResolvedValue({ allowed: false })
  })

  it.each([
    ["en", "Payment reconciliation is not enabled for this organization", "Back to dashboard"],
    ["fr", "Le rapprochement des paiements n’est pas activé pour cette organisation", "Retour au tableau de bord"],
  ])("keeps a module denial embedded and localized in %s", async (locale, title, back) => {
    const content = await withFinanceSurfaceAccess({
      params: Promise.resolve({ locale }), surface: routeByKey("finance-reconciliation")!, onAllowed,
    })
    render(<main>{content}</main>)

    expect(screen.getAllByRole("main")).toHaveLength(1)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getByRole("heading", { name: title })).toBeVisible()
    expect(screen.getByRole("link", { name: back })).toHaveAttribute("href", `/${locale}/dashboard`)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(onAllowed).not.toHaveBeenCalled()
    expect(observeAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-a", accessIntent: "read", mode: "enforce" }))
  })

  it.each([
    ["en", "Enable reconciliation", /missing required Finance or Accounting modules for this organization.*audit logged/, "Confirm your current password"],
    ["fr", "Activer le rapprochement", /Finance ou Comptabilité requis et manquants pour cette organisation.*journalisée/, "Confirmez votre mot de passe actuel"],
  ] as const)("preserves administrator activation scope and authentication disclosure in %s", async (locale, button, confirm, freshAuth) => {
    requirePermission.mockResolvedValue({ orgId: "org-a", userId: "user-a", permissions: ["payments.reconciliation.read", "MANAGE_SYSTEM_SETTINGS"] })
    render(<main>{await withFinanceSurfaceAccess({
      params: Promise.resolve({ locale }), surface: routeByKey("finance-reconciliation")!, onAllowed,
    })}</main>)
    expect(screen.getByRole("button", { name: button })).toBeVisible()
    expect(TenantModuleActivationButton).toHaveBeenCalledWith(expect.objectContaining({
      moduleSlug: "payment_reconciliation",
      labels: expect.objectContaining({
        confirm: expect.stringMatching(confirm),
        freshAuthRequired: expect.stringContaining(freshAuth),
      }),
    }), undefined)
    expect(screen.getAllByRole("main")).toHaveLength(1)
    expect(onAllowed).not.toHaveBeenCalled()
  })

  it("localizes the general French permission denial without an English surface title", async () => {
    requirePermission.mockRejectedValue(new RbacError("Private guard detail", "FORBIDDEN", 403))
    render(<main>{await withFinanceSurfaceAccess({
      params: Promise.resolve({ locale: "fr" }), surface: routeByKey("finance-payments")!, onAllowed,
    })}</main>)
    expect(screen.getByRole("heading", { name: "Cette page financière n’est pas accessible à votre rôle" })).toBeVisible()
    expect(screen.getAllByRole("main")).toHaveLength(1)
    expect(screen.queryByText(/Private guard detail|Finance payments|is not available|RBAC|lecture seule/)).not.toBeInTheDocument()
    expect(screen.getByText(/Demandez à votre administrateur.*Ce refus d’accès a été enregistré/)).toBeVisible()
    expect(observeAccess).not.toHaveBeenCalled()
    expect(onAllowed).not.toHaveBeenCalled()
  })

  it.each([
    ["en", "cash_drawer", "Cash drawer is not enabled for this organization", /An administrator must enable the cash drawer/],
    ["fr", "cash_drawer", "Le module de caisse n’est pas activé pour cette organisation", /Un administrateur doit activer le module de caisse/],
    ["en", "payment_reconciliation", "Payment reconciliation is not enabled for this organization", /An administrator must enable payment reconciliation/],
    ["fr", "payment_reconciliation", "Le rapprochement des paiements n’est pas activé pour cette organisation", /Un administrateur doit activer le rapprochement/],
  ] as const)("explains the actual missing history module in %s: %s", async (locale, moduleSlug, title, message) => {
    observeAccess.mockImplementation(async ({ moduleSlug: slug }) => ({ allowed: slug !== moduleSlug }))
    render(<main>{await withFinanceSurfaceAccess({
      params: Promise.resolve({ locale }), surface: routeByKey("finance-cash-payment-history")!, onAllowed,
    })}</main>)
    expect(screen.getByRole("heading", { name: title })).toBeVisible()
    expect(screen.getByText(message)).toBeVisible()
    expect(screen.getByRole("link")).toHaveAttribute("href", `/${locale}/dashboard`)
    expect(screen.queryByText(/tenant|locataire|surface|entitlement|RBAC/)).not.toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.getAllByRole("main")).toHaveLength(1)
    expect(observeAccess).toHaveBeenLastCalledWith(expect.objectContaining({
      moduleSlug, organizationId: "org-a", userId: "user-a", mode: "enforce", audit: true,
    }))
    expect(observeAccess).toHaveBeenCalledTimes(moduleSlug === "cash_drawer" ? 1 : 2)
    expect(onAllowed).not.toHaveBeenCalled()
  })

  it("propagates unexpected guard failures without presenting a permission denial", async () => {
    const failure = new Error("Authority storage unavailable")
    requirePermission.mockRejectedValue(failure)
    await expect(withFinanceSurfaceAccess({
      params: Promise.resolve({ locale: "fr" }), surface: routeByKey("finance-payments")!, onAllowed,
    })).rejects.toBe(failure)
    expect(observeAccess).not.toHaveBeenCalled()
    expect(onAllowed).not.toHaveBeenCalled()
  })
})
