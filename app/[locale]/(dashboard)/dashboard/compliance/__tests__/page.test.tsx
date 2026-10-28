import { render, screen } from "@testing-library/react"

import { getComplianceCenterKernelSnapshotAction } from "@/actions/compliance/compliance-center.actions"
import { requirePermission } from "@/lib/security/rbac"

import ComplianceCenterPage from "../page"

jest.mock("@/lib/security/rbac", () => ({
  RbacError: class MockRbacError extends Error {},
  requireAllPermissions: jest.fn(),
  requireAnyPermission: jest.fn(),
  requirePermission: jest.fn(),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: () => <main />,
}))

jest.mock("@/actions/compliance/compliance-center.actions", () => ({
  getComplianceCenterKernelSnapshotAction: jest.fn(),
}))

const mockComplianceCenterDashboard = jest.fn(
  ({
    initialData,
    initialError,
    initialStatus,
  }: {
    initialData: unknown
    initialError: unknown
    initialStatus: string
  }) => (
    <section>
      <h1>Compliance dashboard rendered</h1>
      <p>{initialStatus}</p>
      <p>{initialData ? "has-data" : "no-data"}</p>
      <p>{initialError ? "has-error" : "no-error"}</p>
    </section>
  ),
)

jest.mock("@/components/compliance/ComplianceCenterDashboard", () => ({
  ComplianceCenterDashboard: (props: {
    initialData: unknown
    initialError: unknown
    initialStatus: string
  }) => mockComplianceCenterDashboard(props),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockGetComplianceCenterKernelSnapshotAction = getComplianceCenterKernelSnapshotAction as jest.Mock

describe("ComplianceCenterPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ orgId: "org-1" })
    mockGetComplianceCenterKernelSnapshotAction.mockResolvedValue({
      success: true,
      status: "success",
      data: { summary: { documents: 1 } },
    })
  })

  it("requires compliance document read permission before loading the compliance snapshot", async () => {
    render(await ComplianceCenterPage({ params: Promise.resolve({ locale: "en" }) }))

    expect(mockRequirePermission).toHaveBeenCalledWith("compliance.documents.read", {
      resource: "ComplianceCenterPage",
      resourceId: undefined,
      auditAllowed: true,
    })
    expect(mockGetComplianceCenterKernelSnapshotAction).toHaveBeenCalledWith({ limit: 50 })
    expect(mockComplianceCenterDashboard).toHaveBeenCalledWith({
      initialData: { summary: { documents: 1 } },
      initialError: null,
      initialStatus: "success",
    })
    expect(screen.getByRole("heading", { name: "Compliance dashboard rendered" })).toBeInTheDocument()
    expect(screen.getByText("has-data")).toBeInTheDocument()
    expect(screen.getByText("no-error")).toBeInTheDocument()
  })

  it("stops before compliance data access when the permission guard denies access", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"))

    await expect(ComplianceCenterPage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("Forbidden")

    expect(mockRequirePermission).toHaveBeenCalledWith("compliance.documents.read", expect.objectContaining({
      resource: "ComplianceCenterPage",
    }))
    expect(mockGetComplianceCenterKernelSnapshotAction).not.toHaveBeenCalled()
    expect(mockComplianceCenterDashboard).not.toHaveBeenCalled()
  })

  it("passes safe action errors to the dashboard after permission succeeds", async () => {
    mockGetComplianceCenterKernelSnapshotAction.mockResolvedValue({
      success: false,
      status: "error",
      error: "Compliance snapshot unavailable",
    })

    render(await ComplianceCenterPage({ params: Promise.resolve({ locale: "en" }) }))

    expect(mockRequirePermission).toHaveBeenCalledWith("compliance.documents.read", expect.objectContaining({
      resource: "ComplianceCenterPage",
    }))
    expect(mockComplianceCenterDashboard).toHaveBeenCalledWith({
      initialData: null,
      initialError: "Compliance snapshot unavailable",
      initialStatus: "error",
    })
    expect(screen.getByText("no-data")).toBeInTheDocument()
    expect(screen.getByText("has-error")).toBeInTheDocument()
  })
})
