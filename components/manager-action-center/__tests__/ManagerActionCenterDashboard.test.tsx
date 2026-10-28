import type { SVGProps } from "react";
import { render, screen } from "@testing-library/react";

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    return Icon;
  };

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target];
        return createIcon(prop);
      },
    },
  );
});

jest.mock(
  "@/components/manager-action-center/PaymentReconciliationSignOffCommand",
  () => ({
    PaymentReconciliationSignOffCommand: ({
      command,
    }: {
      command: { provider: { displayName: string } };
    }) => (
      <button type="button" data-testid="reconciliation-sign-command">
        Sign {command.provider.displayName}
      </button>
    ),
  }),
);

import { ManagerActionCenterDashboard } from "../ManagerActionCenterDashboard";
import type { ManagerActionCenterData } from "@/services/manager-action-center/manager-action-center-contracts";
import type { BIFreshness, BIProvenance } from "@/services/bi/bi-contracts";

const generatedAt = "2026-06-20T10:00:00.000Z";

const freshness: BIFreshness = {
  state: "fresh",
  generatedAt,
  sourceMaxUpdatedAt: generatedAt,
  maxAgeMinutes: 1440,
  stale: false,
  staleReason: null,
};

const provenance: BIProvenance = {
  organizationId: "org-1",
  locationId: null,
  sourceKind: "tenant.operating",
  sourceHash: "tenant-hash",
  sourceModules: ["dashboard", "payments"],
  generatedAt,
  periodStart: "2026-06-01T00:00:00.000Z",
  periodEnd: "2026-06-20T23:59:59.999Z",
};

const actionLink = {
  id: "action-link-1",
  label: "Open",
  href: "/dashboard/finance/payments/reconciliation",
  requiredPermission: "payments.reconciliation.read",
  moduleSlug: "payment_reconciliation" as const,
  disabled: false,
  disabledReason: null,
};

describe("ManagerActionCenterDashboard", () => {
  it("renders the daily run sheet above generic KPI grids", () => {
    render(
      <ManagerActionCenterDashboard
        data={buildData()}
        locale="en"
        title="Manager Action Center"
        subtitle="Handle today's operating work."
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Manager daily run sheet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Do first today" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Daily run sheet" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Resolve payment suspense").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Critical pressure")).toBeInTheDocument();
  });

  it("renders the executable reconciliation control only for the command discriminant", () => {
    render(
      <ManagerActionCenterDashboard
        data={buildData(reconciliationAction(true))}
        locale="fr"
        title="Centre d'actions manager"
        subtitle="Travail operationnel."
      />,
    );

    expect(screen.getByTestId("reconciliation-sign-command")).toHaveTextContent(
      "Sign MTN settlement",
    );
    expect(
      screen.getAllByText("Valider le rapprochement des paiements").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "Verifier les totaux fournisseur et appliquer une validation independante avec une authentification recente.",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("keeps a read-only reconciliation source action link-only", () => {
    render(
      <ManagerActionCenterDashboard
        data={buildData(reconciliationAction(false))}
        locale="en"
        title="Manager Action Center"
        subtitle="Operating work."
      />,
    );

    expect(
      screen.queryByTestId("reconciliation-sign-command"),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Review the ready reconciliation evidence. Signing is unavailable for this actor.",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("wraps long business-signal action labels within the action surface", () => {
    const label =
      "Settle, refund, or review employee balance recovery cases before payment and close claims are trusted.";
    const data = buildData();
    data.insights = [
      {
        id: "insight-1",
        organizationId: "org-1",
        moduleSlug: "payroll",
        sourceModules: ["payroll"],
        title: "Employee balance recovery requires action",
        detail: "An open recovery case needs review.",
        businessImpact: "Payroll and close claims remain blocked.",
        severity: "high",
        state: "ready",
        evidenceGrade: "operational",
        trustState: "operational",
        freshness,
        blockers: [],
        redactions: [],
        actionLink: { ...actionLink, label },
        drillThrough: null,
      },
    ];

    render(
      <ManagerActionCenterDashboard
        data={data}
        locale="en"
        title="Manager Action Center"
        subtitle="Operating work."
      />,
    );

    expect(screen.getByRole("link", { name: label })).toHaveClass(
      "h-auto",
      "max-w-full",
      "whitespace-normal",
      "break-words",
      "text-left",
    );
  });
});

function buildData(
  actionOverride?: ManagerActionCenterData["actionItems"][number],
): ManagerActionCenterData {
  const action = actionOverride ?? {
    origin: "SIGNAL" as const,
    kind: "LINK" as const,
    sourceCommand: null,
    id: "act-1",
    signalId: "sig-1",
    title: "Resolve payment suspense",
    nextStep: "Classify or match suspense items before cash review.",
    actionPath: "/dashboard/finance/payments/reconciliation",
    requiredPermission: "payments.reconciliation.read",
    status: "open" as const,
    severity: "critical" as const,
    severityScore: 98,
    assignedRole: "finance" as const,
    dueAt: "2026-06-20T12:00:00.000Z",
    dueState: "due_today" as const,
    evidenceGrade: "blocked" as const,
    trustState: "blocked" as const,
    state: "blocked" as const,
    blockers: [],
    redactions: [],
    actionLink,
  };

  return {
    organizationId: "org-1",
    generatedAt,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-20T23:59:59.999Z",
    commandBrief: {
      id: "manager-daily-run-sheet:org-1",
      organizationId: "org-1",
      title: "Manager daily run sheet",
      summary:
        "1 visible action: 0 overdue, 1 critical or high, 0 blocked, and 0 hidden by permission.",
      conclusion: "Handle critical pressure before scanning routine KPIs.",
      mode: "brief",
      generatedAt,
      periodStart: "2026-06-01T00:00:00.000Z",
      periodEnd: "2026-06-20T23:59:59.999Z",
      state: "blocked",
      evidenceGrade: "blocked",
      trustState: "blocked",
      freshness,
      provenance,
      sourceModules: ["dashboard", "payments"],
      blockers: [],
      redactions: [],
      primaryAction: actionLink,
      drillThrough: null,
      reviewState: {
        organizationId: "org-1",
        reviewerId: null,
        reviewerRole: "manager",
        state: "blocked",
        reviewedAt: null,
        previousReviewedAt: null,
        nextReviewDueAt: null,
        freshness,
        blockers: [],
      },
    },
    runSheetGroups: [
      {
        id: "critical",
        title: "Critical pressure",
        detail:
          "Critical or high-risk actions that can block cash, stock, close, or control trust.",
        state: "blocked",
        count: 1,
        actions: [action],
      },
    ],
    kpis: [],
    insights: [],
    actionItems: [action],
    actionQueue: {
      organizationId: "org-1",
      generatedAt,
      signals: [],
      actionItems: [],
      filteredOutCount: 0,
      summary: {
        total: 1,
        open: 1,
        assigned: 0,
        stale: 0,
        expired: 0,
        redacted: 0,
        bySeverity: {
          info: 0,
          low: 0,
          medium: 0,
          high: 0,
          critical: 1,
        },
        byRole: { finance: 1 },
      },
    },
    summary: {
      total: 1,
      open: 1,
      assigned: 0,
      stale: 0,
      expired: 0,
      critical: 1,
      high: 0,
      redacted: 0,
      blocked: 1,
      overdue: 0,
      dueToday: 1,
      hiddenByPermission: 0,
    },
    assuranceIncidents: [],
  };
}

function reconciliationAction(
  executable: boolean,
): ManagerActionCenterData["actionItems"][number] {
  const linkAction = buildData().actionItems[0];
  const command = {
    commandId: "payment-reconciliation-sign:run-ready-1",
    actionPath: "/dashboard/finance/reconciliation" as const,
    requiredPermission: "payments.reconciliation.sign" as const,
    source: {
      type: "ReconciliationRun" as const,
      id: "run-ready-1",
      status: "READY_FOR_SIGNOFF" as const,
      updatedAt: "2026-06-20T09:30:00.000Z",
      versionHash: `sha256:${"a".repeat(64)}`,
    },
    provider: {
      id: "provider-account-1",
      displayName: "MTN settlement",
      currencyCode: "XAF",
    },
    businessDate: "2026-06-20T00:00:00.000Z",
    periodStart: "2026-06-20T00:00:00.000Z",
    periodEnd: "2026-06-20T23:59:59.999Z",
    makerActorId: "maker-1",
    totals: {
      internalAmount: "10000.00",
      externalAmount: "10000.00",
      matchedAmount: "10000.00",
      suspenseAmount: "0.00",
    },
    matchCount: 1,
    exceptionCount: 0,
  };
  const base = {
    ...linkAction,
    origin: "SOURCE_COMMAND" as const,
    id: command.commandId,
    signalId: command.source.id,
    title: "Sign payment reconciliation",
    nextStep: "Server-owned reconciliation action.",
    actionPath: command.actionPath,
    requiredPermission: executable
      ? command.requiredPermission
      : "payments.reconciliation.read",
    state: executable ? ("ready" as const) : ("permission_denied" as const),
    actionLink: {
      ...actionLink,
      href: command.actionPath,
    },
  };

  if (executable) {
    return {
      ...base,
      kind: "PAYMENT_RECONCILIATION_SIGN_OFF",
      sourceCommand: command,
    };
  }

  return {
    ...base,
    kind: "LINK",
    sourceCommand: null,
  };
}
