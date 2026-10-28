import { render, screen } from "@testing-library/react"

import { RbacError, requireAnyPermission } from "@/lib/security/rbac"

import Layout from "../layout"

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "EMAIL_NOT_VERIFIED" | "ACCOUNT_LOCKED" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
      this.name = "RbacError"
    }
  }

  return {
    RbacError: MockRbacError,
    requireAnyPermission: jest.fn(),
  }
})

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({
    kind,
    title,
    message,
    primaryHref,
  }: {
    kind: string
    title: string
    message: string
    primaryHref: string
  }) => (
    <main data-kind={kind} data-primary-href={primaryHref}>
      <h1>{title}</h1>
      <p>{message}</p>
    </main>
  ),
}))

const mockRequireAnyPermission = requireAnyPermission as jest.Mock

describe("purchase supplier layout boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      permissions: ["purchases.suppliers.create"],
    })
  })

  it("allows supplier routes when the actor has any supplier route permission", async () => {
    const ui = await Layout({
      children: <section>supplier child route</section>,
      params: Promise.resolve({ locale: "en" }),
    })
    render(ui)

    expect(mockRequireAnyPermission).toHaveBeenCalledWith([
      "purchases.suppliers.read",
      "purchases.suppliers.create",
      "purchases.suppliers.update",
    ], {
      resource: "SupplierManagement",
    })
    expect(screen.getByText("supplier child route")).toBeInTheDocument()
  })

  it("fails closed before rendering children when supplier route access is denied", async () => {
    mockRequireAnyPermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const ui = await Layout({
      children: <section>supplier child route</section>,
      params: Promise.resolve({ locale: "fr" }),
    })
    render(ui)

    expect(screen.getByRole("heading", { name: "Les routes fournisseurs ne sont pas disponibles pour ce role" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "permission_denied")
    expect(screen.getByRole("main")).toHaveAttribute("data-primary-href", "/fr/dashboard/purchases")
    expect(screen.queryByText("supplier child route")).not.toBeInTheDocument()
  })

  it("fails closed before rendering children when no active organization is available", async () => {
    mockRequireAnyPermission.mockRejectedValue(new RbacError("No active organization", "NO_ACTIVE_ORG", 403))

    const ui = await Layout({
      children: <section>supplier child route</section>,
      params: Promise.resolve({ locale: "en" }),
    })
    render(ui)

    expect(screen.getByRole("heading", { name: "Supplier routes need an active organization" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "no_active_org")
    expect(screen.queryByText("supplier child route")).not.toBeInTheDocument()
  })
})
