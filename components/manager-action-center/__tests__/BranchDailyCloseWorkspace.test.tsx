import type { SVGProps } from "react"
import { render, screen } from "@testing-library/react"

import type {
  BranchDailyCloseCompletionResult,
  BranchDailyCloseCompletionState,
} from "@/services/end-of-day-close/branch-daily-close-completion-contracts"

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

jest.mock("@/components/manager-action-center/BranchDailyCloseReviewCommand", () => ({
  BranchDailyCloseReviewCommand: ({ locationId, businessDate }: { locationId: string; businessDate: string }) => (
    <button type="button" data-location-id={locationId} data-business-date={businessDate}>
      Start review
    </button>
  ),
}))

jest.mock("@/components/manager-action-center/BranchDailyCloseSignOffCommand", () => ({
  BranchDailyCloseSignOffCommand: ({ locationId, businessDate }: { locationId: string; businessDate: string }) => (
    <button type="button" data-location-id={locationId} data-business-date={businessDate}>
      Sign daily close
    </button>
  ),
}))

import {
  BranchDailyCloseWorkspace,
  type BranchDailyCloseWorkspaceModel,
} from "../BranchDailyCloseWorkspace"

describe("BranchDailyCloseWorkspace", () => {
  it("renders safe empty, date-selection, and invalid-date states without loading evidence", () => {
    const { rerender } = renderWorkspace({ kind: "SELECT_LOCATION" })

    expect(screen.getByRole("heading", { name: "Select a managed location" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Business date")).not.toBeInTheDocument()
    expect(screen.queryByText("Central Store")).not.toBeInTheDocument()

    rerender(workspace({ kind: "SELECT_DATE", locationId: "location-central" }))
    expect(screen.getByLabelText("Business date")).toBeRequired()
    expect(screen.getByRole("button", { name: "Load close evidence" })).toBeInTheDocument()
    expect(document.querySelector('input[name="locationId"]')).toHaveValue("location-central")

    rerender(workspace({ kind: "INVALID_DATE", locationId: "location-central", businessDate: "2026-02-30" }))
    expect(screen.getByRole("heading", { name: "Enter a valid business date" })).toBeInTheDocument()
    expect(screen.queryByText("Central Store")).not.toBeInTheDocument()
  })

  it.each([
    ["ACCESS_DENIED" as const, "Daily close is not available for this role"],
    ["ACCESS_OR_SCOPE" as const, "Permission or operating scope is unavailable"],
    ["UNAVAILABLE" as const, "Daily-close evidence is unavailable"],
  ])("renders the safe %s state without fabricated branch evidence", (kind, heading) => {
    const model: BranchDailyCloseWorkspaceModel = kind === "ACCESS_DENIED"
      ? { kind }
      : {
          kind: "ERROR",
          errorKind: kind,
          locationId: "caller-supplied-location",
          businessDate: "2026-07-18",
          message: "Safe failure",
        }

    renderWorkspace(model)

    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument()
    expect(screen.queryByText("Central Store")).not.toBeInTheDocument()
    expect(screen.queryByText("caller-supplied-location")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /sign|review|revoke|supersede/i })).not.toBeInTheDocument()
  })

  it.each([
    ["NOT_STARTED" as const, "Not started"],
    ["BLOCKED" as const, "Blocked"],
    ["AWAITING_SIGN_OFF" as const, "Awaiting sign-off"],
    ["SIGNED" as const, "Signed"],
    ["EVIDENCE_DRIFTED" as const, "Evidence drifted"],
  ])("renders the %s completion state from the versioned read model", (state, label) => {
    const { container } = renderWorkspace({ kind: "READY", data: buildCompletion(state), canStartReview: false, canSign: false })

    expect(container.querySelector("[data-close-state]")).toHaveAttribute("data-close-state", state)
    expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    expect(screen.getAllByText("Central Store").length).toBeGreaterThan(0)
    expect(screen.getByText("BR-01 / location-central")).toBeInTheDocument()
    expect(screen.getByText("Cash drawer remains open")).toBeInTheDocument()
    expect(screen.getByText("PAYMENT_RECONCILIATION")).toBeInTheDocument()
  })

  it("renders coverage, blockers, safe sign metadata, and explicit non-claims without command controls", () => {
    renderWorkspace({ kind: "READY", data: buildCompletion("SIGNED"), canStartReview: false, canSign: false })

    expect(screen.getByText("v1.0")).toBeInTheDocument()
    expect(screen.getByText("COMPLETE")).toBeInTheDocument()
    expect(screen.getByText("manager-2")).toBeInTheDocument()
    expect(screen.getAllByText("Not claimed")).toHaveLength(3)
    expect(screen.getByText("Payment reconciliation")).toBeInTheDocument()
    expect(screen.getByText("Readiness promotion")).toBeInTheDocument()
    expect(screen.getByText("Final accounting close")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Load close evidence" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /review|sign|revoke|supersede|authenticate/i })).not.toBeInTheDocument()
    expect(screen.queryByText("source-hash-secret")).not.toBeInTheDocument()
    expect(screen.queryByText("composition-hash-secret")).not.toBeInTheDocument()
  })

  it("renders the review command only for an authorized NOT_STARTED completion", () => {
    renderWorkspace({ kind: "READY", data: buildCompletion("NOT_STARTED"), canStartReview: true, canSign: false })

    const command = screen.getByRole("button", { name: "Start review" })
    expect(command).toHaveAttribute("data-location-id", "location-central")
    expect(command).toHaveAttribute("data-business-date", "2026-07-18")
  })

  it("withholds the review command when the trusted capability is absent", () => {
    renderWorkspace({ kind: "READY", data: buildCompletion("NOT_STARTED"), canStartReview: false, canSign: false })

    expect(screen.queryByRole("button", { name: "Start review" })).not.toBeInTheDocument()
  })

  it.each([
    "BLOCKED",
    "AWAITING_SIGN_OFF",
    "SIGNED",
    "EVIDENCE_DRIFTED",
  ] as const)("withholds the review command for existing lifecycle state %s", (state) => {
    renderWorkspace({ kind: "READY", data: buildCompletion(state), canStartReview: true, canSign: false })

    expect(screen.queryByRole("button", { name: "Start review" })).not.toBeInTheDocument()
  })

  it("renders the sign command only for an authorized AWAITING_SIGN_OFF completion", () => {
    renderWorkspace({ kind: "READY", data: buildCompletion("AWAITING_SIGN_OFF"), canStartReview: false, canSign: true })

    const command = screen.getByRole("button", { name: "Sign daily close" })
    expect(command).toHaveAttribute("data-location-id", "location-central")
    expect(command).toHaveAttribute("data-business-date", "2026-07-18")
  })

  it("withholds the sign command when the trusted capability is absent", () => {
    renderWorkspace({ kind: "READY", data: buildCompletion("AWAITING_SIGN_OFF"), canStartReview: false, canSign: false })

    expect(screen.queryByRole("button", { name: "Sign daily close" })).not.toBeInTheDocument()
  })

  it.each([
    "NOT_STARTED",
    "BLOCKED",
    "SIGNED",
    "EVIDENCE_DRIFTED",
  ] as const)("withholds the sign command for ineligible lifecycle state %s", (state) => {
    renderWorkspace({ kind: "READY", data: buildCompletion(state), canStartReview: false, canSign: true })

    expect(screen.queryByRole("button", { name: "Sign daily close" })).not.toBeInTheDocument()
  })

  it("localizes the date control and safe completion state in French", () => {
    render(
      <BranchDailyCloseWorkspace
        locale="fr"
        model={{ kind: "READY", data: buildCompletion("AWAITING_SIGN_OFF"), canStartReview: false, canSign: false }}
        workspaceHref="/fr/dashboard/manager-action-center/daily-close"
        backHref="/fr/dashboard/manager-action-center"
      />,
    )

    expect(screen.getByRole("heading", { name: "Cloture quotidienne du site" })).toBeInTheDocument()
    expect(screen.getByLabelText("Date d'activite")).toBeRequired()
    expect(screen.getAllByText("En attente de validation").length).toBeGreaterThan(0)
    expect(screen.getByRole("link", { name: "Centre d'actions manager" })).toHaveAttribute("href", "/fr/dashboard/manager-action-center")
  })
})

function renderWorkspace(model: BranchDailyCloseWorkspaceModel) {
  return render(workspace(model))
}

function workspace(model: BranchDailyCloseWorkspaceModel) {
  return (
    <BranchDailyCloseWorkspace
      locale="en"
      model={model}
      workspaceHref="/en/dashboard/manager-action-center/daily-close"
      backHref="/en/dashboard/manager-action-center"
    />
  )
}

function buildCompletion(state: BranchDailyCloseCompletionState): BranchDailyCloseCompletionResult {
  const signed = state === "SIGNED" || state === "EVIDENCE_DRIFTED"
  const blocked = state === "BLOCKED"
  const reviewPresent = state !== "NOT_STARTED"

  return {
    kind: "BRANCH_DAILY_CLOSE_COMPLETION",
    contractVersion: "1.0",
    organizationId: "org-1",
    actorId: "manager-1",
    generatedAt: "2026-07-18T18:30:00.000Z",
    businessDate: "2026-07-18",
    authority: { kind: "LOCATION_RESPONSIBILITY", basis: "Location.managerId" },
    scope: { kind: "LOCATION", locationId: "location-central" },
    location: { id: "location-central", name: "Central Store", code: "BR-01" },
    state,
    preSignReadiness: {
      kind: "BRANCH_END_OF_DAY_CLOSE_READINESS",
      organizationId: "org-1",
      actorId: "manager-1",
      generatedAt: "2026-07-18T18:30:00.000Z",
      businessDate: "2026-07-18",
      periodStart: "2026-07-18T00:00:00.000Z",
      periodEnd: "2026-07-18T23:59:59.999Z",
      authority: { kind: "LOCATION_RESPONSIBILITY", basis: "Location.managerId" },
      scope: { kind: "LOCATION", locationId: "location-central" },
      location: { id: "location-central", name: "Central Store", code: "BR-01" },
      readiness: blocked ? "ACTION_REQUIRED" : "READY_FOR_REVIEW",
      evidenceCoverage: {
        state: "COMPLETE",
        supportedItemCount: 6,
        unsupportedItemCount: 1,
        complete: true,
      },
      completion: {
        state: "NOT_AVAILABLE",
        signOffSupported: false,
        signedOff: false,
        signedOffAt: null,
        signedOffBy: null,
        reasonCode: "NO_DURABLE_DAILY_CLOSE_SIGN_OFF_SOURCE",
      },
      facts: {
        branchSnapshotStatus: "fresh",
        posSessionCount: 2,
        closedOrReconciledSessionCount: 1,
        activeSessionCount: 1,
        suspendedSessionCount: 0,
        inconsistentSessionCount: 0,
        cashDrawerCount: 1,
        openCashDrawerCount: 1,
        attributedPaymentCount: 4,
        attributedPaymentStatusCounts: {} as never,
        attributedPaymentMethodCounts: {} as never,
      },
      checklist: [
        {
          key: "LOCATION_ACTIVE",
          status: "READY",
          title: "Location is active",
          detail: "The authorized location is active.",
          evidence: {
            sourceType: "LOCATION",
            sourceIds: ["location-central"],
            sourceHash: "location-hash-secret",
            observedAt: "2026-07-18T18:00:00.000Z",
            freshness: null,
            evidenceGrade: "operational",
          },
        },
        {
          key: "PAYMENT_RECONCILIATION",
          status: "UNSUPPORTED",
          title: "Payment reconciliation is unsupported",
          detail: "No payment-reconciliation completion is claimed.",
          evidence: {
            sourceType: "PAYMENT_RECONCILIATION",
            sourceIds: [],
            sourceHash: null,
            observedAt: null,
            freshness: null,
            evidenceGrade: "blocked",
          },
        },
      ],
      blockers: [
        {
          code: "OPEN_CASH_DRAWER",
          severity: "critical",
          gate: "cash-drawer-close",
          title: "Cash drawer remains open",
          detail: "The branch drawer has not been closed.",
          sourceTables: ["CashDrawer"],
          nextAction: "Close or investigate the drawer.",
        },
      ],
      sourceHash: "source-hash-secret",
    },
    postReviewSignOffState: {
      kind: "BRANCH_DAILY_CLOSE_SIGN_OFF_STATE",
      organizationId: "org-1",
      actorId: "manager-1",
      generatedAt: "2026-07-18T18:30:00.000Z",
      businessDate: "2026-07-18",
      authority: { kind: "LOCATION_RESPONSIBILITY", basis: "Location.managerId" },
      scope: { kind: "LOCATION", locationId: "location-central" },
      location: { id: "location-central", name: "Central Store", code: "BR-01" },
      state: state === "EVIDENCE_DRIFTED" ? "SIGNED" : state,
      review: reviewPresent
        ? {
            id: "review-1",
            status: blocked ? "BLOCKED" : "IN_REVIEW",
            readinessState: blocked ? "ACTION_REQUIRED" : "READY_FOR_REVIEW",
            evidenceCoverageState: "COMPLETE",
            supportedItemCount: 6,
            unsupportedItemCount: 1,
            blockerCount: 1,
            evidenceObservedAt: "2026-07-18T18:00:00.000Z",
            readinessSourceHash: "source-hash-secret",
            evidenceHash: "review-hash-secret",
            startedById: "manager-1",
            startedAt: "2026-07-18T18:05:00.000Z",
          }
        : null,
      signOff: signed
        ? {
            id: "sign-off-1",
            status: "ACTIVE",
            signedReadinessSourceHash: "source-hash-secret",
            signedEvidenceHash: "review-hash-secret",
            signedEvidenceObservedAt: "2026-07-18T18:00:00.000Z",
            signedById: "manager-2",
            signedAt: "2026-07-18T18:20:00.000Z",
            authAssuranceLevel: "L1",
            freshAuthAt: "2026-07-18T18:19:00.000Z",
          }
        : null,
      history: {
        totalCount: signed ? 1 : 0,
        activeCount: signed ? 1 : 0,
        revokedCount: 0,
        supersededCount: 0,
        terminalCount: 0,
        latestTerminalAt: null,
      },
      controls: {
        projectionPurpose: "SIGN_OFF_STATE_ONLY",
        preSignReadinessSourceHashIncludesSignOff: false,
        readinessPromoted: false,
        finalCloseClaimed: false,
      },
      projectionHash: "projection-hash-secret",
    },
    alignment: {
      state: state === "EVIDENCE_DRIFTED" ? "DRIFTED" : reviewPresent ? "CURRENT" : "NOT_APPLICABLE",
      reasons: state === "EVIDENCE_DRIFTED" ? ["READINESS_SOURCE_HASH_CHANGED"] : [],
      preSignSourceHash: "source-hash-secret",
      postReviewProjectionHash: "projection-hash-secret",
    },
    completion: {
      state,
      signOffSupported: true,
      activeSignOffPresent: signed,
      completionSatisfied: state === "SIGNED",
      reviewId: reviewPresent ? "review-1" : null,
      signedOffAt: signed ? "2026-07-18T18:20:00.000Z" : null,
      signedOffBy: signed ? "manager-2" : null,
      reasonCode:
        state === "SIGNED"
          ? "SIGNED_EVIDENCE_CURRENT"
          : state === "EVIDENCE_DRIFTED"
            ? "REVIEW_EVIDENCE_DRIFTED"
            : state === "AWAITING_SIGN_OFF"
              ? "AWAITING_SIGN_OFF"
              : state === "BLOCKED"
                ? "REVIEW_BLOCKED"
                : "NO_REVIEW",
    },
    controls: {
      compositionPurpose: "VERSIONED_COMPLETION_READ_MODEL",
      preSignReadinessPreserved: true,
      preSignSourceHashIncludesSignOff: false,
      readinessPromoted: false,
      paymentReconciliationClaimed: false,
      finalCloseClaimed: false,
    },
    compositionHash: "composition-hash-secret",
  }
}
