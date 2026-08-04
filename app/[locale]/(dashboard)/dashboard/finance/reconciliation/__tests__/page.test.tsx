import type { SVGProps } from "react"
import { render, screen } from "@testing-library/react"

import { requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

import FinanceReconciliationPage from "../page"

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => <svg data-testid={`icon-${name}`} {...props} />
    return Icon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return createIcon(prop)
      },
    },
  )
})
jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => locale,
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

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

const mockPaymentReconciliationWorkbench = jest.fn(() => (
  <section>Payment reconciliation workbench rendered</section>
))

jest.mock("@/components/finance/PaymentReconciliationWorkbench", () => ({
  __esModule: true,
  default: () => mockPaymentReconciliationWorkbench(),
}))

const mockRequireAnyPermission = requireAnyPermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-session",
    userId: "user-session",
    moduleSlug: "payment_reconciliation",
    surfaceType: "page",
    surface: "/dashboard/finance/reconciliation",
    accessIntent: "read",
    mode: "enforce",
    result: "allow",
    allowed: true,
    wouldBlock: false,
    reason: "Tenant module entitlement is available.",
    entitlement: null,
    missingDependencies: [],
    rbacWildcardPresent: false,
    rbacWildcardBypassedEntitlement: false,
    hardEnforcementEnabled: false,
    evaluatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("FinanceReconciliationPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-session",
      userId: "user-session",
      permissions: ["payments.reconciliation.read"],
    })
    mockObserveModuleAccess.mockResolvedValue(moduleDecision())
  })

  it("enforces route RBAC and payment reconciliation module access before rendering", async () => {
    render(await FinanceReconciliationPage({ params: Promise.resolve({ locale: "en" }) }))

    expect(mockRequireAnyPermission).toHaveBeenCalledWith(
      ["payments.reconciliation.read"],
      { resource: "PaymentReconciliationWorkbench" },
    )
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-session",
      userId: "user-session",
      actorPermissions: ["payments.reconciliation.read"],
      moduleSlug: "payment_reconciliation",
      surfaceType: "page",
      surface: "/dashboard/finance/reconciliation",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
    })
    expect(screen.getByText("Payment reconciliation workbench rendered")).toBeInTheDocument()
  })

  it("renders the unavailable module state without mounting the workbench", async () => {
    mockObserveModuleAccess.mockResolvedValue(moduleDecision({
      result: "deny",
      allowed: false,
      wouldBlock: true,
      reason: "Tenant is not entitled to this module.",
    }))

    render(await FinanceReconciliationPage({ params: Promise.resolve({ locale: "en" }) }))

    expect(screen.getByText("Module locked")).toBeInTheDocument()
    expect(screen.getByText("Payment reconciliation is not enabled for this tenant")).toBeInTheDocument()
    expect(screen.queryByText("Payment reconciliation workbench rendered")).not.toBeInTheDocument()
    expect(mockPaymentReconciliationWorkbench).not.toHaveBeenCalled()
  })
})
