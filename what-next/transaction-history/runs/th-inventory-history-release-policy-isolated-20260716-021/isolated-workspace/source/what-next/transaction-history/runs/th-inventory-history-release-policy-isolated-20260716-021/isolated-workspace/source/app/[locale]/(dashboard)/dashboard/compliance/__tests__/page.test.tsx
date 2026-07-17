import { render, screen } from "@testing-library/react"

import { getComplianceCenterKernelSnapshotAction } from "@/actions/compliance/compliance-center.actions"
import { checkPermission } from "@/config/useAuth"

import ComplianceCenterPage from "../page"

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
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

const mockCheckPermission = checkPermission as jest.Mock
const mockGetComplianceCenterKernelSnapshotAction = getComplianceCenterKernelSnapshotAction as jest.Mock

describe("ComplianceCenterPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockGetComplianceCenterKernelSnapshotAction.mockResolvedValue({
      success: true,
      status: "success",
      data: { summary: { documents: 1 } },
    })
  })

  it("requires compliance document read permission before loading the compliance snapshot", async () => {
    render(await ComplianceCenterPage())

    expect(mockCheckPermission).toHaveBeenCalledWith("compliance.documents.read")
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
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(ComplianceCenterPage()).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith("compliance.documents.read")
    expect(mockGetComplianceCenterKernelSnapshotAction).not.toHaveBeenCalled()
    expect(mockComplianceCenterDashboard).not.toHaveBeenCalled()
  })

  it("passes safe action errors to the dashboard after permission succeeds", async () => {
    mockGetComplianceCenterKernelSnapshotAction.mockResolvedValue({
      success: false,
      status: "error",
      error: "Compliance snapshot unavailable",
    })

    render(await ComplianceCenterPage())

    expect(mockCheckPermission).toHaveBeenCalledWith("compliance.documents.read")
    expect(mockComplianceCenterDashboard).toHaveBeenCalledWith({
      initialData: null,
      initialError: "Compliance snapshot unavailable",
      initialStatus: "error",
    })
    expect(screen.getByText("no-data")).toBeInTheDocument()
    expect(screen.getByText("has-error")).toBeInTheDocument()
  })
})
