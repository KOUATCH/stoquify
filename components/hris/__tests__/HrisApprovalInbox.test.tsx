import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"

import { decideHrisApprovalInboxItemAction } from "@/actions/hris/approval-inbox.actions"

import { HrisApprovalInboxView } from "../HrisApprovalInbox"

const mockRefresh = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

jest.mock("@/actions/hris/approval-inbox.actions", () => ({
  decideHrisApprovalInboxItemAction: jest.fn(),getHrisApprovalReviewAction:jest.fn(),
}))

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

const mockDecide = decideHrisApprovalInboxItemAction as jest.Mock

function inbox(eligible = true) {
  return {
    organizationId: "org-1",
    asOf: "2026-07-15T00:00:00.000Z",
    items: [
      {
        id: "SALARY_CHANGE:salary-1",
        domain: "SALARY_CHANGE",
        stage: "REVIEW",
        sourceId: "salary-1",
        employee: { id: "emp-1", displayName: "Ada Payroll" },
        title: "Salary change",
        subject: "Effective 2026-08-01",
        requestedAt: "2026-07-14T00:00:00.000Z",
        effectiveAt: "2026-08-01T00:00:00.000Z",
        potentialActions: ["APPROVE", "REJECT"],
        decision: {
          eligible,
          reasonCode: eligible ? "ACTION_ALLOWED" : "REQUESTER_CANNOT_REVIEW",
        },
        evidence: {
          requestEvidencePresent: true,
          approvalEvidencePresent: false,
          rawDetailsIncluded: false,
        },
        readiness: {
          status: "BLOCKED",
          blockerCode: "COMPENSATION_CHANGE_PENDING",
          impact: "PAYROLL_INPUT",
        },
        reviewHref: "/dashboard/people/emp-1",
      },
    ],
    summary: {
      visiblePending: 1,
      returned: 1,
      review: 1,
      apply: 0,
      actionable: eligible ? 1 : 0,
      selfApprovalBlocked: eligible ? 0 : 1,
      byDomain: {
        LIFECYCLE: 0,
        CONTRACT_ACTIVATION: 0,
        CONTRACT_DOCUMENT: 0,
        COMPENSATION_ASSIGNMENT: 0,
        SALARY_CHANGE: 1,
        PAYMENT_DESTINATION: 0,
      },
    },
    readiness: {
      status: "BLOCKED",
      blockerCount: 1,
      blockerCodes: ["COMPENSATION_CHANGE_PENDING"],
    },
    accessScope: {
      organizationId: "org-1",
      authority: { label: "Managed-location responsibility" },
      managedLocationCount: 1,
    },
    redaction: {},
    dataOwnership: {},
  } as any
}

describe("HrisApprovalInboxView controlled review entry",()=>{
 it("retains independent decision eligibility",()=>{render(<HrisApprovalInboxView inbox={inbox(false)} locale="en"/>);expect(screen.getByRole("button",{name:"Approve"})).toBeDisabled();expect(screen.getByRole("button",{name:"Reject"})).toBeDisabled()})
 it("routes eligible review without a hash-entry form",()=>{render(<HrisApprovalInboxView inbox={inbox(true)} locale="en"/>);expect(screen.getByRole("button",{name:"Approve"})).toBeEnabled();expect(screen.queryByLabelText("Approval evidence hash")).not.toBeInTheDocument()})
})

jest.mock("@/actions/hris/time-review.actions",()=>({getTimeApprovalReviewAction:jest.fn(),decideReviewedTimeApprovalAction:jest.fn()}))
