import { render, screen } from "@testing-library/react"
import type { SVGProps } from "react"

jest.mock("lucide-react", () => new Proxy({ __esModule: true }, {
  get(target, prop: string) {
    if (prop in target) return target[prop as keyof typeof target]
    return (props: SVGProps<SVGSVGElement>) => <svg {...props} />
  },
}))

// Keep the real finance route guard; isolate the unused activation component's server imports.
jest.mock("@/components/modules/TenantModuleActivationButton", () => ({
  TenantModuleActivationButton: () => null,
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/components/cash-command/CashCommandDashboard", () => ({
  CashCommandDashboard: ({
    data,
    locale,
  }: {
    data: { organizationId: string; commandBrief: { title?: string; summary?: string } }
    locale: string
  }) => <div>{`${data.organizationId}:${locale}`}<p>{data.commandBrief.title}</p><p>{data.commandBrief.summary}</p></div>,
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/lib/security/rbac", () => ({
  RbacError: class RbacError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly status: number,
    ) {
      super(message)
      this.name = "RbacError"
    }
  },
  requireAnyPermission: jest.fn(),
}))

jest.mock("@/services/cash-command/cash-command.service", () => ({
  getCashCommandData: jest.fn(),
}))

import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { getCashCommandData } from "@/services/cash-command/cash-command.service"
import CashCommandPage from "../page"

const mockRequireAnyPermission = requireAnyPermission as jest.Mock
const mockGetCashCommandData = getCashCommandData as jest.Mock

describe("CashCommandPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-session",
      userId: "user-session",
      permissions: ["finance.read", "dashboard.read"],
      roles: [{ code: "administrator" }],
      isSuperUser: false,
    })
    mockGetCashCommandData.mockResolvedValue({ organizationId: "org-session", commandBrief: { primaryAction: null, drillThrough: null }, cards: [], changes: [], risks: [], actionsToday: [] })
  })

  it("passes tenant context to the service and renders dashboard content", async () => {
    render(await CashCommandPage({ params: Promise.resolve({ locale: "en" }) }))

    expect(mockRequireAnyPermission).toHaveBeenCalledWith(["finance.read", "dashboard.read"], {
      resource: "KontavaCashCommand",
    })
    expect(mockGetCashCommandData).toHaveBeenCalledWith({
      organizationId: "org-session",
      actorId: "user-session",
      actorPermissions: ["finance.read", "dashboard.read"],
      actorRoleCodes: ["administrator"],
      isSuperUser: false,
    })
    expect(screen.getByText("org-session:en")).toBeInTheDocument()
  })

  it.each([
    ["en", "Cash Command Intelligence is not available for this role", "Back to dashboard"],
    ["fr", "Le pilotage de la trésorerie n’est pas accessible à votre rôle", "Retour au tableau de bord"],
  ])("renders the localized route permission denial inside the shell in %s", async (locale, title, back) => {
    mockRequireAnyPermission.mockRejectedValue(
      new RbacError("Forbidden: Cash Command requires tenant-wide operating authority", "FORBIDDEN", 403),
    )

    render(<main>{await CashCommandPage({ params: Promise.resolve({ locale }) })}</main>)

    expect(screen.getByRole("heading", { name: title })).toBeVisible()
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole("main")).toHaveLength(1)
    expect(screen.getByRole("link", { name: back })).toHaveAttribute("href", `/${locale}/dashboard`)
    expect(mockGetCashCommandData).not.toHaveBeenCalled()
  })

  it.each([
    ["en", "Cash Command Intelligence needs an active organization", "Refresh your session from the dashboard"],
    ["fr", "Une organisation active est requise", "Actualisez votre session depuis le tableau de bord"],
  ])("explains missing organization without loading sources in %s", async (locale, title, recovery) => {
    mockRequireAnyPermission.mockRejectedValue(new RbacError("Private organization detail", "NO_ACTIVE_ORG", 403))
    render(<main>{await CashCommandPage({ params: Promise.resolve({ locale }) })}</main>)

    expect(screen.getByRole("heading", { name: title })).toBeVisible()
    expect(screen.getByText(new RegExp(recovery))).toBeVisible()
    expect(screen.getAllByRole("main")).toHaveLength(1)
    expect(screen.queryByText(/Private organization detail/)).not.toBeInTheDocument()
    expect(mockGetCashCommandData).not.toHaveBeenCalled()
  })

  it.each([
    ["en", "Cash Command requires organization-wide authority", "Ask your organization administrator"],
    ["fr", "Le pilotage de la trésorerie exige une autorisation pour toute l’organisation", "Demandez à votre administrateur"],
  ])("explains service authority denial in %s after route admission", async (locale, title, recovery) => {
    mockGetCashCommandData.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))
    render(<main>{await CashCommandPage({ params: Promise.resolve({ locale }) })}</main>)
    expect(mockGetCashCommandData).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("heading", { name: title })).toBeVisible()
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole("main")).toHaveLength(1)
    expect(screen.getByRole("link")).toHaveAttribute("href", `/${locale}/dashboard`)
    expect(screen.getByText(new RegExp(recovery))).toBeVisible()
    expect(screen.queryByText(`org-session:${locale}`)).not.toBeInTheDocument()
  })

  it("propagates a failed source query instead of presenting denied or empty data", async () => {
    const error = new Error("Source timed out")
    mockGetCashCommandData.mockRejectedValue(error)
    await expect(CashCommandPage({ params: Promise.resolve({ locale: "fr" }) })).rejects.toBe(error)
  })

  it("presents the authorized empty read model in French", async () => {
    mockGetCashCommandData.mockResolvedValue({ organizationId: "org-session", commandBrief: {
      title: "Cash command brief", summary: "No cash indicators are available with your current access.",
      conclusion: "Custom explanation", primaryAction: null, drillThrough: null,
      freshness: { state: "unknown", staleReason: null }, blockers: [], redactions: [],
    }, cards: [], changes: [], risks: [], actionsToday: [], trustSignals: [], proofSubjects: [] })
    render(await CashCommandPage({ params: Promise.resolve({ locale: "fr" }) }))
    expect(screen.getByText("org-session:fr")).toBeVisible()
    expect(screen.getByText("Synthèse de trésorerie")).toBeVisible()
    expect(screen.getByText("Aucun indicateur de trésorerie n’est accessible avec vos droits actuels.")).toBeVisible()
  })
})
