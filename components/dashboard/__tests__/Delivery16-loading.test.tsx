import { render, screen, cleanup } from "@testing-library/react"
import { DashboardLoadingState } from "../DashboardLoadingState"
import DashboardLoader from "@/app/[locale]/(dashboard)/loading"
import InventoryLoading from "@/app/[locale]/(dashboard)/dashboard/inventory/loading"
import FinanceLoading from "@/app/[locale]/(dashboard)/dashboard/finance/loading"
import OwnerLoading from "@/app/[locale]/(dashboard)/dashboard/owner-war-room/loading"
import ManagerLoading from "@/app/[locale]/(dashboard)/dashboard/manager-action-center/loading"
import PurchaseLoading from "@/app/[locale]/(dashboard)/dashboard/purchase-orders/loading"
import OnboardingLoading from "@/app/[locale]/(dashboard)/dashboard/settings/data-onboarding/loading"
import SalesLoading from "@/app/[locale]/(dashboard)/dashboard/sales/loading"
import CustomersLoading from "@/app/[locale]/(dashboard)/dashboard/customers/loading"
import { dashboardRoleLabel } from "@/lib/dashboard/role-label"

let mockLocale = "fr"
jest.mock("next-intl", () => ({ useLocale: () => mockLocale, useTranslations: () => (key: string) => key }))

describe("Delivery 16 loading boundaries", () => {
  afterEach(cleanup)
  it.each([
    [InventoryLoading, "Préparation de l’espace de stock"],
    [FinanceLoading, "Chargement des données financières…"],
    [OwnerLoading, "Préparation du point quotidien du dirigeant"],
    [ManagerLoading, "Préparation du programme quotidien du responsable"],
    [PurchaseLoading, "Chargement des bons de commande"],
    [OnboardingLoading, "Chargement"],
    [SalesLoading, "Chargement des ventes…"],
    [CustomersLoading, "Chargement des clients…"],
  ])("announces a French pending state inside one shell main", (Loading, title) => {
    mockLocale = "fr"
    render(<main><Loading /></main>)
    expect(screen.getAllByRole("main")).toHaveLength(1)
    expect(screen.getByRole("status")).toHaveTextContent(title)
    expect(screen.getByRole("status")).not.toHaveAttribute("aria-busy", "true")
    expect(screen.queryByText("Trusted dashboard data is loading.")).not.toBeInTheDocument()
  })

  it.each(["en", "fr"])("keeps a standalone landmark for the outer %s boundary", (locale) => {
    mockLocale = locale
    render(<DashboardLoader />)
    expect(screen.getAllByRole("main")).toHaveLength(1)
    expect(screen.getByRole("status")).toHaveTextContent(locale === "fr" ? "Préparation du tableau de bord" : "Preparing dashboard command center")
  })

  it("preserves explicit copy overrides", () => {
    render(<DashboardLoadingState locale="fr" loadingLabel="Synchronisation" title="Étape spécifique" subtitle="Attente du registre" />)
    expect(screen.getByRole("status")).toHaveTextContent("SynchronisationÉtape spécifiqueAttente du registre")
  })

  it("selects supplied role translations without changing role identity", () => {
    const role = Object.freeze({ code: "ACCOUNTANT", name: "Accountant", nameEn: "Accountant", nameFr: "Comptable" })
    expect(dashboardRoleLabel(role, "fr")).toBe("Comptable")
    expect(dashboardRoleLabel(role, "en")).toBe("Accountant")
    expect(role.code).toBe("ACCOUNTANT")
    expect(dashboardRoleLabel({ name: "Custom reviewer", nameFr: " " }, "fr")).toBe("Custom reviewer")
    expect(dashboardRoleLabel({ code: "SPECIAL_ROLE" }, "fr")).toBe("SPECIAL_ROLE")
    expect(dashboardRoleLabel(undefined, "fr")).toBe("Utilisateur")
  })
})
