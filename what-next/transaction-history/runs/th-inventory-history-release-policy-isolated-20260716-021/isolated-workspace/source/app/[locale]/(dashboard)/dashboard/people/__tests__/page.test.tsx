import { render, screen } from "@testing-library/react"

import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { getHrisEmployeeDirectory } from "@/services/hris/employee.service"

import PeopleWorkspacePage from "../page"

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

jest.mock("@/services/hris/employee.service", () => ({
  getHrisEmployeeDirectory: jest.fn(),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({ title, message, primaryHref }: { title: string; message: string; primaryHref: string }) => (
    <main>
      <h1>{title}</h1>
      <p>{message}</p>
      <a href={primaryHref}>Back to dashboard</a>
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
const mockGetDirectory = getHrisEmployeeDirectory as jest.Mock

function params(locale = "en") {
  return Promise.resolve({ locale })
}

function directoryResult() {
  return {
    organizationId: "org-1",
    asOf: "2026-07-14T00:00:00.000Z",
    employees: [
      {
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
    ],
    summary: {
      totalEmployees: 1,
      linkedUsers: 1,
      unmappedEmployees: 0,
      orphanedUserMappings: 0,
      activeContractReady: 1,
      frozenAttendanceReady: 1,
      payrollReadyCandidates: 1,
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

describe("PeopleWorkspacePage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-1",
      userId: "reader-1",
      permissions: ["hris.people.read"],
    })
    mockGetDirectory.mockResolvedValue(directoryResult())
  })

  it("loads the tenant-scoped redacted directory behind HRIS read access", async () => {
    render(await PeopleWorkspacePage({ params: params("en") }))

    expect(mockRequireAnyPermission).toHaveBeenCalledWith(["hris.people.read"], {
      resource: "HrisPeopleWorkspace",
    })
    expect(mockGetDirectory).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "reader-1",
      actorPermissions: ["hris.people.read"],
      limit: 50,
    })
    expect(screen.getByRole("heading", { name: "Employee directory" })).toBeInTheDocument()
    expect(screen.getByText("Alice Ngono")).toBeInTheDocument()
    expect(screen.getByText("Managed-location responsibility")).toBeInTheDocument()
    expect(screen.getByText(/not direct-report authority/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open Alice Ngono profile" })).toHaveAttribute(
      "href",
      "/en/dashboard/people/emp-1",
    )
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute(
      "href",
      "/en/dashboard/people/history",
    )
    expect(document.body.textContent).not.toMatch(/EMP-001|user-1|tax-hash|bank-account/i)
  })

  it("returns a safe denied state before employee data is loaded", async () => {
    mockRequireAnyPermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await PeopleWorkspacePage({ params: params("fr") }))

    expect(screen.getByRole("heading", { name: "People workspace is not available for this role" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/fr/dashboard")
    expect(mockGetDirectory).not.toHaveBeenCalled()
  })
})