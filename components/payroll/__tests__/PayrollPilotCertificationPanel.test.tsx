import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { certifyPayrollPilotCycleAction } from "@/actions/payroll/payroll-pilot-certification.actions"

import PayrollPilotCertificationPanel from "../PayrollPilotCertificationPanel"

jest.mock("@/actions/payroll/payroll-pilot-certification.actions", () => ({
  certifyPayrollPilotCycleAction: jest.fn(),
}))

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

const mockCertifyPayrollPilotCycle = certifyPayrollPilotCycleAction as jest.Mock

function certificate(overrides: Record<string, unknown> = {}) {
  return {
    kind: "AQSTOQFLOW_PAYROLL_PILOT_CYCLE_CERTIFICATE",
    version: 1,
    status: "READY_FOR_SIGNOFF",
    certificateHash: "sha256:pilot-certificate",
    generatedAt: "2026-06-30T10:00:00.000Z",
    payrollRunId: "run-1",
    signoff: { missingRoles: [] },
    blockers: [],
    releaseGates: [],
    ...overrides,
  } as any
}

function commandData(overrides: Record<string, unknown> = {}) {
  return {
    evidence: {
      pilotCertification: {
        status: "READY_FOR_SIGNOFF",
        certificateHash: "sha256:existing-pilot-certificate",
      },
      pilotCertificationInput: {
        payrollRunId: "run-1",
        runNumber: "PR-2026-06",
        expectedSourceRegisterHash: "sha256:run-evidence",
        expectedAdapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
        expectedProofBackfillCertificateHash: "sha256:proof-backfill-certificate",
        proofBackfillStatus: "READY_FOR_CLOSE_RECHECK",
        proofBackfillAuditLogId: "proof-backfill-audit-1",
        inputComplete: true,
        missingInputs: [],
      },
    },
    ...overrides,
  } as any
}

describe("PayrollPilotCertificationPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCertifyPayrollPilotCycle.mockResolvedValue({
      success: true,
      data: certificate(),
      error: null,
      status: 200,
    })
  })

  it("renders service-owned pilot certification inputs", () => {
    render(<PayrollPilotCertificationPanel data={commandData()} />)

    expect(screen.getByRole("heading", { name: "Pilot certification gate" })).toBeInTheDocument()
    expect(screen.getByText("PR-2026-06")).toBeInTheDocument()
    expect(screen.getByText("sha256:run-evidence")).toBeInTheDocument()
    expect(screen.getByText("sha256:adapter-chaos-gate")).toBeInTheDocument()
    expect(screen.getByText("sha256:proof-backfill-certificate")).toBeInTheDocument()
    expect(screen.getByText("READY_FOR_CLOSE_RECHECK")).toBeInTheDocument()
    expect(screen.getByText("INPUT_READY")).toBeInTheDocument()
  })

  it("evaluates the pilot without persisting a certificate", async () => {
    render(<PayrollPilotCertificationPanel data={commandData()} />)

    fireEvent.click(screen.getByRole("button", { name: "Evaluate pilot" }))

    await waitFor(() => {
      expect(mockCertifyPayrollPilotCycle).toHaveBeenCalledWith(
        expect.objectContaining({
          payrollRunId: "run-1",
          expectedSourceRegisterHash: "sha256:run-evidence",
          expectedAdapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
          expectedProofBackfillCertificateHash: "sha256:proof-backfill-certificate",
          persistCertificate: false,
        }),
      )
    })
    expect(await screen.findByText("sha256:pilot-certificate; missing signoffs 0")).toBeInTheDocument()
  })

  it("persists a certificate with operator signoff evidence", async () => {
    render(<PayrollPilotCertificationPanel data={commandData()} />)

    fireEvent.change(screen.getAllByLabelText("Approver")[0], {
      target: { value: "payroll-admin-1" },
    })
    fireEvent.change(screen.getAllByLabelText("Approved at")[0], {
      target: { value: "2026-06-30T09:59:00.000Z" },
    })
    fireEvent.change(screen.getAllByLabelText("Evidence hash")[0], {
      target: { value: "sha256:payroll-admin-signoff" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Persist certificate" }))

    await waitFor(() => {
      expect(mockCertifyPayrollPilotCycle).toHaveBeenCalledWith(
        expect.objectContaining({
          persistCertificate: true,
          signoffBundle: expect.objectContaining({
            payrollAdmin: {
              approvedById: "payroll-admin-1",
              approvedAt: "2026-06-30T09:59:00.000Z",
              evidenceHash: "sha256:payroll-admin-signoff",
            },
          }),
        }),
      )
    })
  })

  it("renders denied fresh-auth state returned by the server action", async () => {
    mockCertifyPayrollPilotCycle.mockResolvedValueOnce({
      success: false,
      data: null,
      error: "Fresh authentication required",
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    })

    render(<PayrollPilotCertificationPanel data={commandData()} />)

    fireEvent.click(screen.getByRole("button", { name: "Persist certificate" }))

    expect(await screen.findByText("FRESH_AUTH_REQUIRED")).toBeInTheDocument()
    expect(screen.getByText("Fresh authentication required")).toBeInTheDocument()
  })
})