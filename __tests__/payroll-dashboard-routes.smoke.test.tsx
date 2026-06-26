import { cleanup, render, screen } from "@testing-library/react"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { getPayrollCommandReadModelAction } from "@/actions/payroll/payroll-command-read-model.actions"
import { getMyPayrollPayslipsAction } from "@/actions/payroll/payroll-payslip-self-service.actions"
import { getPayrollRegisterAction } from "@/actions/payroll/payroll-register.actions"
import PayrollWorkbenchPage from "@/app/[locale]/(dashboard)/dashboard/payroll/page"
import PayrollPayslipsPage from "@/app/[locale]/(dashboard)/dashboard/payroll/payslips/page"
import PayrollRegisterPage from "@/app/[locale]/(dashboard)/dashboard/payroll/register/page"
import { requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

jest.mock("lucide-react", () => {
  const React = require("react")

  return new Proxy(
    {},
    {
      get: (_target, iconName) => {
        const Icon = (props: Record<string, unknown>) =>
          React.createElement("svg", {
            "aria-hidden": "true",
            "data-icon": String(iconName),
            ...props,
          })
        Icon.displayName = String(iconName)
        return Icon
      },
    },
  )
})

jest.mock("next/link", () => {
  const React = require("react")

  return {
    __esModule: true,
    default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
      React.createElement("a", { href, ...props }, children),
  }
})

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale?: string) => locale || "en",
}))

jest.mock("@/lib/security/rbac", () => {
  class RbacError extends Error {
    code: string
    status: number

    constructor(message = "Forbidden", code = "FORBIDDEN", status = 403) {
      super(message)
      this.name = "RbacError"
      this.code = code
      this.status = status
    }
  }

  return {
    RbacError,
    requireAnyPermission: jest.fn(),
  }
})

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/actions/payroll/payroll-command-read-model.actions", () => ({
  getPayrollCommandReadModelAction: jest.fn(),
}))

jest.mock("@/actions/payroll/payroll-payslip-self-service.actions", () => ({
  getMyPayrollPayslipsAction: jest.fn(),
}))

jest.mock("@/actions/payroll/payroll-register.actions", () => ({
  getPayrollRegisterAction: jest.fn(),
}))

jest.mock("@/components/payroll/PayrollCommandCenter", () => {
  const React = require("react")

  return {
    __esModule: true,
    default: ({ data, error, locale }: { data: { marker?: string } | null; error: { message?: string } | null; locale: string }) =>
      React.createElement(
        "section",
        { "data-testid": "payroll-command-center" },
        React.createElement("h1", null, "Payroll command center smoke"),
        React.createElement("span", null, locale),
        React.createElement("span", null, data?.marker ?? error?.message ?? "no-data"),
      ),
  }
})

jest.mock("@/components/payroll/PayrollPayslipSelfService", () => {
  const React = require("react")

  return {
    __esModule: true,
    default: ({ data, error, locale }: { data: { marker?: string } | null; error: { message?: string } | null; locale: string }) =>
      React.createElement(
        "section",
        { "data-testid": "payroll-payslip-self-service" },
        React.createElement("h1", null, "Payroll payslip self-service smoke"),
        React.createElement("span", null, locale),
        React.createElement("span", null, data?.marker ?? error?.message ?? "no-data"),
      ),
  }
})

jest.mock("@/components/payroll/PayrollRegisterTieOut", () => {
  const React = require("react")

  return {
    __esModule: true,
    default: ({ data, error, locale }: { data: { marker?: string } | null; error: { message?: string } | null; locale: string }) =>
      React.createElement(
        "section",
        { "data-testid": "payroll-register-tie-out" },
        React.createElement("h1", null, "Payroll register tie-out smoke"),
        React.createElement("span", null, locale),
        React.createElement("span", null, data?.marker ?? error?.message ?? "no-data"),
      ),
  }
})

const authContext = {
  orgId: "org-1",
  userId: "user-1",
  permissions: ["payroll.command.read", "payroll.payslips.self.read", "payroll.reports.read"],
}

function mockHappyPath() {
  ;(requireAnyPermission as jest.Mock).mockResolvedValue(authContext)
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({
    allowed: true,
    reason: "allowed",
  })
  ;(getPayrollCommandReadModelAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "command-data" },
  })
  ;(getMyPayrollPayslipsAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "payslip-data" },
  })
  ;(getPayrollRegisterAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "register-data" },
  })
}

function params(locale = "en") {
  return Promise.resolve({ locale })
}

function searchParams(runId?: string) {
  return Promise.resolve({ runId })
}

describe("payroll dashboard route smoke", () => {
  afterEach(() => {
    cleanup()
    jest.clearAllMocks()
  })

  it("loads implemented payroll routes through RBAC, module entitlement, and protected payroll actions", async () => {
    mockHappyPath()

    render(await PayrollWorkbenchPage({ params: params() }))

    expect(screen.getByRole("heading", { name: "Payroll command center smoke" })).toBeInTheDocument()
    expect(requireAnyPermission).toHaveBeenCalledWith(["payroll.command.read"], {
      resource: "PayrollCommandReadModel",
    })
    expect(observeModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        accessIntent: "read",
        mode: "enforce",
        moduleSlug: "payroll",
        surface: "/dashboard/payroll",
        surfaceType: "page",
      }),
    )
    expect(getPayrollCommandReadModelAction).toHaveBeenCalledWith({ limit: 25 })

    cleanup()
    jest.clearAllMocks()
    mockHappyPath()

    render(await PayrollPayslipsPage({ params: params() }))

    expect(screen.getByRole("heading", { name: "Payroll payslip self-service smoke" })).toBeInTheDocument()
    expect(requireAnyPermission).toHaveBeenCalledWith(["payroll.payslips.self.read"], {
      resource: "PayrollPayslip",
    })
    expect(observeModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        accessIntent: "read",
        mode: "enforce",
        moduleSlug: "payroll",
        surface: "/dashboard/payroll/payslips",
        surfaceType: "page",
      }),
    )
    expect(getMyPayrollPayslipsAction).toHaveBeenCalledWith({ limit: 18 })

    cleanup()
    jest.clearAllMocks()
    mockHappyPath()

    render(await PayrollRegisterPage({ params: params(), searchParams: searchParams("payroll-run-1") }))

    expect(screen.getByRole("heading", { name: "Payroll register tie-out smoke" })).toBeInTheDocument()
    expect(requireAnyPermission).toHaveBeenCalledWith(["payroll.reports.read"], {
      resource: "PayrollRegister",
    })
    expect(observeModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        accessIntent: "read",
        mode: "enforce",
        moduleSlug: "payroll",
        surface: "/dashboard/payroll/register",
        surfaceType: "page",
      }),
    )
    expect(getPayrollRegisterAction).toHaveBeenCalledWith({ payrollRunId: "payroll-run-1", limit: 100 })
  })

  it("stops payroll route execution before protected actions when module entitlement denies access", async () => {
    mockHappyPath()
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: "module_not_enabled",
    })

    render(await PayrollWorkbenchPage({ params: params() }))
    expect(screen.getByRole("heading", { name: "HR and Payroll is not enabled for this organization" })).toBeInTheDocument()
    expect(getPayrollCommandReadModelAction).not.toHaveBeenCalled()

    cleanup()
    jest.clearAllMocks()
    mockHappyPath()
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: "module_not_enabled",
    })

    render(await PayrollPayslipsPage({ params: params() }))
    expect(screen.getByRole("heading", { name: "Payslips are not enabled for this organization" })).toBeInTheDocument()
    expect(getMyPayrollPayslipsAction).not.toHaveBeenCalled()

    cleanup()
    jest.clearAllMocks()
    mockHappyPath()
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: "module_not_enabled",
    })

    render(await PayrollRegisterPage({ params: params(), searchParams: searchParams("payroll-run-1") }))
    expect(screen.getByRole("heading", { name: "Payroll register is not enabled for this organization" })).toBeInTheDocument()
    expect(getPayrollRegisterAction).not.toHaveBeenCalled()
  })

  it("renders safe RBAC denial states without calling payroll actions", async () => {
    const { RbacError } = jest.requireMock("@/lib/security/rbac")

    ;(requireAnyPermission as jest.Mock).mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await PayrollWorkbenchPage({ params: params() }))
    expect(screen.getByRole("heading", { name: "HR and Payroll is not available for this role" })).toBeInTheDocument()
    expect(getPayrollCommandReadModelAction).not.toHaveBeenCalled()

    cleanup()
    jest.clearAllMocks()
    ;(requireAnyPermission as jest.Mock).mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await PayrollPayslipsPage({ params: params() }))
    expect(screen.getByRole("heading", { name: "Payslips are not available for this role" })).toBeInTheDocument()
    expect(getMyPayrollPayslipsAction).not.toHaveBeenCalled()

    cleanup()
    jest.clearAllMocks()
    ;(requireAnyPermission as jest.Mock).mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await PayrollRegisterPage({ params: params(), searchParams: searchParams("payroll-run-1") }))
    expect(screen.getByRole("heading", { name: "Payroll register is not available for this role" })).toBeInTheDocument()
    expect(getPayrollRegisterAction).not.toHaveBeenCalled()
  })

  it("keeps the payroll dashboard surface limited to implemented service-backed routes", () => {
    const routeContracts = [
      {
        file: "app/[locale]/(dashboard)/dashboard/payroll/page.tsx",
        action: "getPayrollCommandReadModelAction",
        component: "PayrollCommandCenter",
      },
      {
        file: "app/[locale]/(dashboard)/dashboard/payroll/payslips/page.tsx",
        action: "getMyPayrollPayslipsAction",
        component: "PayrollPayslipSelfService",
      },
      {
        file: "app/[locale]/(dashboard)/dashboard/payroll/register/page.tsx",
        action: "getPayrollRegisterAction",
        component: "PayrollRegisterTieOut",
      },
    ]

    for (const contract of routeContracts) {
      const absolutePath = path.join(process.cwd(), contract.file)
      expect(existsSync(absolutePath)).toBe(true)

      const source = readFileSync(absolutePath, "utf8")
      expect(source).toContain(contract.action)
      expect(source).toContain(contract.component)
      expect(source).toContain("requireAnyPermission")
      expect(source).toContain("observeModuleAccess")
      expect(source).toContain("overflow-x-hidden")
      expect(source).toContain("min-w-0")
      expect(source).toContain("max-w-[1920px]")
    }

    const uiSurfaceFiles = [
      "app/[locale]/(dashboard)/dashboard/payroll/page.tsx",
      "app/[locale]/(dashboard)/dashboard/payroll/payslips/page.tsx",
      "app/[locale]/(dashboard)/dashboard/payroll/register/page.tsx",
      "components/dashboard/todays-operating-truth.ts",
      "components/payroll/PayrollCommandCenter.tsx",
      "components/payroll/PayrollPayslipSelfService.tsx",
      "components/payroll/PayrollRegisterTieOut.tsx",
    ]

    const uiSurfaceSource = uiSurfaceFiles
      .map((file) => readFileSync(path.join(process.cwd(), file), "utf8"))
      .join("\n")
    const unsupportedRoutes = [
      "/dashboard/payroll/contracts",
      "/dashboard/payroll/declarations",
      "/dashboard/payroll/employees",
      "/dashboard/payroll/payments",
      "/dashboard/payroll/runs",
      "/dashboard/payroll/setup",
      "/dashboard/presence",
    ]

    for (const unsupportedRoute of unsupportedRoutes) {
      expect(uiSurfaceSource).not.toContain(unsupportedRoute)
    }
  })
})
