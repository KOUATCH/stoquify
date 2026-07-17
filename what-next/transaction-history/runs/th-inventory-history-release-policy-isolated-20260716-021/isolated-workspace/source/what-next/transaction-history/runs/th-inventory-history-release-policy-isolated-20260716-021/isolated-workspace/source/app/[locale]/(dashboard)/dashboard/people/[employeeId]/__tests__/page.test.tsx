import { render, screen } from "@testing-library/react"

import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { getHrisEmployeeProfile } from "@/services/hris/employee.service"

import EmployeeProfilePage from "../page"

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN",
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

jest.mock("@/services/hris/employee.service", () => ({
  getHrisEmployeeProfile: jest.fn(),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({
    title,
    message,
    primaryHref,
    primaryLabel = "Back to dashboard",
  }: {
    title: string
    message: string
    primaryHref: string
    primaryLabel?: string
  }) => (
    <main>
      <h1>{title}</h1>
      <p>{message}</p>
      <a href={primaryHref}>{primaryLabel}</a>
    </main>
  ),
}))

jest.mock("next/link", () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  )
  MockLink.displayName = "MockLink"
  return MockLink
})

jest.mock("lucide-react", () => {
  const React = require("react")
  const createIcon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("svg", { "data-testid": `icon-${name}`, ...props })
    Icon.displayName = name
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

const mockRequireAnyPermission = requireAnyPermission as jest.Mock
const mockGetProfile = getHrisEmployeeProfile as jest.Mock

function params(locale = "en", employeeId = "emp-1") {
  return Promise.resolve({ locale, employeeId })
}

function profileResult() {
  return {
    organizationId: "org-1",
    asOf: "2026-07-14T00:00:00.000Z",
    employee: {
      id: "emp-1",
      employeeNumber: "EMP-001",
      displayName: "Alice Ngono",
      status: "ACTIVE",
      employment: {
        hireDate: "2026-01-01T00:00:00.000Z",
        terminationDate: null,
        countryCode: "CM",
        locationId: "loc-1",
        department: "Operations",
        jobTitle: "Supervisor",
        costCenter: "OPS",
      },
      userMapping: {
        state: "LINKED",
        userDisplayName: "Alice Ngono",
        userEmailMasked: "a***@example.com",
      },
      evidence: {
        referenceCount: 1,
        latestDocumentHash: "[REDACTED:HR_DOCUMENT]",
        referenceTypes: ["IDENTITY"],
        hasTaxIdentifierHash: true,
        hasSocialIdentifierHash: true,
        hasPaymentDestinationHash: true,
      },
      contractReadiness: {
        activeContractCount: 1,
        latestContractStatus: "ACTIVE",
        hasSignedDocumentEvidence: true,
      },
      attendanceReadiness: {
        frozenSnapshotCount: 1,
        latestFrozenPeriodEnd: "2026-06-30T00:00:00.000Z",
        hasFrozenAttendanceSource: true,
      },
      blockers: [],
      dataOwnership: {},
    },
    redaction: {},
    dataOwnership: {},
    accessScope: {
      organizationId: "org-1",
      authority: {
        kind: "LOCATION_RESPONSIBILITY",
        label: "Managed-location responsibility",
        basis: "Location.managerId",
        reportingLineAuthority: false,
        effectiveDating: "CURRENT_ONLY",
        historicalAccessSupported: false,
        delegationSupported: false,
      },
      managedLocations: [{ id: "loc-1", name: "Douala Branch", code: "DLA" }],
      employeeIds: ["emp-1"],
      limitations: [],
    },
  }
}

describe("EmployeeProfilePage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-1",
      userId: "reader-1",
      permissions: ["hris.people.read"],
    })
    mockGetProfile.mockResolvedValue(profileResult())
  })

  it("loads one tenant-scoped redacted profile behind HRIS read access", async () => {
    render(await EmployeeProfilePage({ params: params() }))

    expect(mockRequireAnyPermission).toHaveBeenCalledWith(["hris.people.read"], {
      resource: "HrisEmployeeProfile",
    })
    expect(mockGetProfile).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "reader-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-1",
    })
    expect(screen.getByRole("heading", { name: "Alice Ngono" })).toBeInTheDocument()
    expect(screen.getByText("Operations")).toBeInTheDocument()
    expect(screen.getByText("Managed-location responsibility")).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/EMP-001|user-1|a\*\*\*@example\.com|tax-hash|bank/i)
  })

  it("returns a safe not-found state for a cross-tenant or missing employee reference", async () => {
    mockGetProfile.mockRejectedValue(new NotFoundError("HRIS employee profile not found"))

    render(await EmployeeProfilePage({ params: params("fr", "other-tenant-employee") }))

    expect(screen.getByRole("heading", { name: "Employee profile not found" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to people" })).toHaveAttribute("href", "/fr/dashboard/people")
  })

  it("returns a deliberate denied state for an employee outside current location responsibility", async () => {
    mockGetProfile.mockRejectedValue(
      new ForbiddenError("Payroll employee is outside the manager's assigned scope."),
    )

    render(await EmployeeProfilePage({ params: params("en", "emp-outside-scope") }))

    expect(screen.getByRole("heading", {
      name: "Employee profile is outside your current responsibility",
    })).toBeInTheDocument()
    expect(screen.getByText(/location responsibility is not reporting-line authority/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to people" })).toHaveAttribute(
      "href",
      "/en/dashboard/people",
    )
  })
  it("does not load profile data when HRIS permission is denied", async () => {
    mockRequireAnyPermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await EmployeeProfilePage({ params: params() }))

    expect(screen.getByRole("heading", { name: "Employee profile is not available" })).toBeInTheDocument()
    expect(mockGetProfile).not.toHaveBeenCalled()
  })
})