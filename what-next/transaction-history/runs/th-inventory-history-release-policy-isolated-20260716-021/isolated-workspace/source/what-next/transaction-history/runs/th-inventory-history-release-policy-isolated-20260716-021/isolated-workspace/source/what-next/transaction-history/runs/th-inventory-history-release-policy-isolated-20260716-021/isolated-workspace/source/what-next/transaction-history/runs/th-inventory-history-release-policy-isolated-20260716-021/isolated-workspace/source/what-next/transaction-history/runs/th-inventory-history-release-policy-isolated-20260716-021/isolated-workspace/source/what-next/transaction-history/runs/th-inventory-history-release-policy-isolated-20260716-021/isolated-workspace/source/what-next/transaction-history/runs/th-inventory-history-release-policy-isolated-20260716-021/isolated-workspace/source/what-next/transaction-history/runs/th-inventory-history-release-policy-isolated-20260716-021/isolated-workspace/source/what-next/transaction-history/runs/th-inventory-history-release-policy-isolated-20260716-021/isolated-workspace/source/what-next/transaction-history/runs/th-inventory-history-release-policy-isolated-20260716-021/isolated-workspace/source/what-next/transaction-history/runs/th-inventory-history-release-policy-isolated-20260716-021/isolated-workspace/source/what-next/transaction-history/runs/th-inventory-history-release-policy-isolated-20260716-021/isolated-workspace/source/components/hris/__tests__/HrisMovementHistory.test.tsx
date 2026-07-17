import { fireEvent, render, screen } from "@testing-library/react"

import { HrisMovementHistoryView } from "../HrisMovementHistory"

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
}))

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

function history() {
  return {
    organizationId: "org-1",
    asOf: "2026-07-15T12:00:00.000Z",
    items: [
      {
        id: "event-salary-1:emp-1",
        domain: "COMPENSATION",
        title: "Salary change approved",
        summary: "A separate reviewer approved the salary change.",
        outcome: "APPROVED",
        risk: "CRITICAL",
        employee: {
          id: "emp-1",
          employeeNumber: "EMP-001",
          displayName: "Ada Payroll",
          department: "Finance",
        },
        effectiveAt: "2026-08-01T00:00:00.000Z",
        recordedAt: "2026-07-15T09:00:00.000Z",
        actor: {
          kind: "AUTHENTICATED_USER",
          label: "Authorized user",
          rawIdentifierIncluded: false,
        },
        source: {
          label: "HRIS compensation",
          eventType: "payroll.salary_change.approved",
          eventSource: "INTERNAL",
        },
        proof: {
          state: "AUDIT_AND_EVENT",
          label: "Event + audit",
          eventStatus: "APPLIED",
          payloadHashPresent: true,
          auditLinked: true,
          sourceRecordPresent: true,
          documentEvidencePresent: true,
          rawHashesIncluded: false,
          consistent: true,
        },
        redaction: {
          policy: "HRIS_MOVEMENT_DEFAULT_REDACTION",
          reasons: [],
        },
        detailHref: "/dashboard/people/emp-1",
        payload: {
          currentBaseSalary: "900000.00",
          proposedBaseSalary: "1100000.00",
          bankAccount: "SECRET-ACCOUNT-1234",
        },
        actorId: "raw-sensitive-actor-id",
        documentHash: "sha256:raw-sensitive-proof",
      },
      {
        id: "payslip-source:payslip-1",
        domain: "PAYSLIP",
        title: "Payslip source recorded",
        summary: "A payslip source record exists; amounts and document references remain redacted.",
        outcome: "RECORDED",
        risk: "MEDIUM",
        employee: {
          id: "emp-1",
          employeeNumber: "EMP-001",
          displayName: "Ada Payroll",
          department: "Finance",
        },
        effectiveAt: "2026-07-14T00:00:00.000Z",
        recordedAt: "2026-07-14T00:00:00.000Z",
        actor: {
          kind: "SYSTEM",
          label: "Payroll process",
          rawIdentifierIncluded: false,
        },
        source: {
          label: "Payroll payslip",
          eventType: "payroll.payslip.source_record",
          eventSource: "SOURCE_RECORD",
        },
        proof: {
          state: "SOURCE_RECORD_ONLY",
          label: "Source record",
          eventStatus: null,
          payloadHashPresent: false,
          auditLinked: false,
          sourceRecordPresent: true,
          documentEvidencePresent: true,
          rawHashesIncluded: false,
          consistent: true,
        },
        redaction: {
          policy: "HRIS_MOVEMENT_DEFAULT_REDACTION",
          reasons: [],
        },
        detailHref: "/dashboard/people/emp-1",
      },
    ],
    summary: {
      matched: 2,
      returned: 2,
      auditAndEvent: 1,
      eventOnly: 0,
      sourceRecordOnly: 1,
      exceptions: 0,
      byDomain: {},
    },
    pagination: { nextBefore: null, limit: 100 },
    accessScope: {
      organizationId: "org-1",
      authority: { label: "Managed-location responsibility" },
      managedLocationCount: 1,
      employeeScopeTruncated: false,
    },
    redaction: {},
    dataOwnership: {},
  } as any
}

describe("HrisMovementHistoryView", () => {
  it("renders only normalized summaries and never renders extra raw payload fields", () => {
    render(<HrisMovementHistoryView history={history()} locale="en" />)

    expect(screen.getByText("Salary change approved")).toBeInTheDocument()
    expect(screen.getAllByText("Event + audit").length).toBeGreaterThan(0)
    expect(document.body.textContent).not.toContain("900000.00")
    expect(document.body.textContent).not.toContain("1100000.00")
    expect(document.body.textContent).not.toContain("SECRET-ACCOUNT-1234")
    expect(document.body.textContent).not.toContain("raw-sensitive-actor-id")
    expect(document.body.textContent).not.toContain("sha256:raw-sensitive-proof")
  })

  it("filters the visible table by proof state", () => {
    render(<HrisMovementHistoryView history={history()} locale="en" />)

    fireEvent.change(screen.getByLabelText("Proof state"), {
      target: { value: "SOURCE_RECORD_ONLY" },
    })

    expect(screen.getByText("Payslip source recorded")).toBeInTheDocument()
    expect(screen.queryByText("Salary change approved")).not.toBeInTheDocument()
    expect(screen.getByText("1 visible movement")).toBeInTheDocument()
  })
})
