import type { SVGProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import type { InventoryLossQueryResult } from "@/actions/inventory/inventoryLossReadActions";
import type { useInventoryLossWorkbench } from "@/hooks/useInventoryLossWorkbench";

type HookState = ReturnType<typeof useInventoryLossWorkbench>;
type InventoryLossData = InventoryLossQueryResult["data"];

let mockHookState: HookState;

jest.mock("next-intl", () => ({
  useLocale: () => "en",
}));

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const MockIcon = (props: SVGProps<SVGSVGElement>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    MockIcon.displayName = `Mock${name}Icon`;
    return MockIcon;
  };

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        return prop in target
          ? target[prop as keyof typeof target]
          : createIcon(prop);
      },
    },
  );
});

jest.mock("@/hooks/useInventoryLossWorkbench", () => ({
  inventoryLossErrorState: (error: { status?: number } | null) =>
    error?.status === 403 ? "permission_denied" : "error",
  useInventoryLossWorkbench: () => mockHookState,
}));

const completeResult: InventoryLossData = {
  period: {
    from: "2026-07-01T00:00:00.000Z",
    to: "2026-08-01T00:00:00.000Z",
    boundary: "HALF_OPEN",
    timezone: "Africa/Douala",
  },
  filters: {
    locationId: null,
    locationIds: ["location-1"],
    itemId: null,
    approverId: null,
  },
  summary: {
    lossLineCount: 1,
    adjustmentCount: 1,
    totalLossValue: "12500.00",
    currency: "XAF",
    complete: true,
  },
  groups: {
    byProduct: [
      {
        key: "item-1",
        label: "Rice",
        sku: "RICE-01",
        unit: "kg",
        quantityLost: "5.000",
        lineCount: 1,
        adjustmentCount: 1,
        lossValue: "12500.00",
        currency: "XAF",
      },
    ],
    byLocation: [
      {
        key: "location-1",
        label: "Main Store",
        lineCount: 1,
        adjustmentCount: 1,
        lossValue: "12500.00",
        currency: "XAF",
      },
    ],
    byApprovingActor: [
      {
        key: "user-1",
        label: "Awa Manager",
        lineCount: 1,
        adjustmentCount: 1,
        lossValue: "12500.00",
        currency: "XAF",
      },
    ],
    byCategory: [
      {
        key: "WRITE_OFF",
        label: "WRITE_OFF",
        lineCount: 1,
        adjustmentCount: 1,
        lossValue: "12500.00",
        currency: "XAF",
      },
    ],
    byPeriod: [
      {
        key: "2026-07",
        label: "2026-07",
        lineCount: 1,
        adjustmentCount: 1,
        lossValue: "12500.00",
        currency: "XAF",
      },
    ],
  },
  records: [
    {
      id: "line-1",
      adjustment: {
        id: "adjustment-1",
        number: "ADJ-001",
        type: "WRITE_OFF",
        category: "WRITE_OFF",
        reason: "Damaged during handling",
        occurredAt: "2026-07-31T08:00:00.000Z",
        sourceCountSessionId: "count-1",
      },
      product: {
        id: "item-1",
        sku: "RICE-01",
        name: "Rice",
        unit: "kg",
      },
      location: {
        id: "location-1",
        name: "Main Store",
      },
      approvingActor: {
        id: "user-1",
        name: "Awa Manager",
      },
      quantityLost: "5.000",
      unitCost: "2500.00",
      lossValue: "12500.00",
      currency: "XAF",
      evidence: {
        present: true,
        lineEvidenceHash: "line-hash",
        adjustmentEvidenceHash: null,
        documentHash: null,
      },
    },
  ],
  coverage: {
    evidence: { covered: 1, total: 1, percent: 100 },
    valuation: { covered: 1, total: 1, percent: 100 },
    approvingActor: { covered: 1, total: 1, percent: 100 },
  },
  attribution: {
    dimension: "APPROVER",
    meaning:
      "The actor approved the recorded adjustment; this is not evidence that the actor caused the loss.",
  },
  snapshot: {
    generatedAt: "2026-08-01T09:00:00.000Z",
    sourceLineLimit: 5000,
    sourceLineCount: 1,
    truncated: false,
  },
  completeness: {
    state: "complete",
    sources: [
      { source: "stock_adjustment_lines", state: "complete" },
      { source: "adjustment_evidence", state: "complete" },
      { source: "inventory_valuation", state: "complete" },
      { source: "approval_attribution", state: "complete" },
    ],
  },
};

function hookState(overrides: Partial<HookState> = {}): HookState {
  const scope = {
    kind: "LOCATIONS" as const,
    authorizedLocationIds: ["location-1"],
  };

  return {
    filters: { from: "2026-07-01", to: "2026-07-31" },
    periodError: null,
    response: { scope, data: completeResult },
    result: completeResult,
    scope,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    updateFilters: jest.fn(),
    resetFilters: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  };
}

const { InventoryLossWorkbench } = require("../InventoryLossWorkbench");

describe("InventoryLossWorkbench", () => {
  beforeEach(() => {
    mockHookState = hookState();
  });

  it("renders trusted managed scope, source values, and non-causal approval evidence", () => {
    render(<InventoryLossWorkbench />);

    expect(
      screen.getByRole("heading", { name: "Inventory Loss Control" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("1 managed locations authorized"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Rice").length).toBeGreaterThan(0);
    expect(screen.getByText("Main Store")).toBeInTheDocument();
    expect(screen.getAllByText("Recorded").length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: "Products" })).toHaveAttribute(
      "tabindex",
      "0",
    );

    expect(
      screen.getByText(/Approval does not establish who or what caused/i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open loss record details: ADJ-001",
      }),
    );
    expect(screen.getByText("Awa Manager")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Approval does not establish who or what caused/i)
        .length,
    ).toBeGreaterThan(0);
  });

  it("keeps partial totals visible with the service-owned reason", () => {
    const partialResult: InventoryLossData = {
      ...completeResult,
      summary: { ...completeResult.summary, complete: false },
      snapshot: { ...completeResult.snapshot, truncated: true },
      completeness: {
        state: "partial",
        sources: [
          {
            source: "stock_adjustment_lines",
            state: "partial",
            reason: "Source line limit 5000 was reached; totals are partial.",
          },
        ],
      },
    };
    mockHookState = hookState({
      result: partialResult,
      response: {
        scope: {
          kind: "LOCATIONS",
          authorizedLocationIds: ["location-1"],
        },
        data: partialResult,
      },
    });

    render(<InventoryLossWorkbench />);

    expect(screen.getByText("Totals are partial")).toBeInTheDocument();
    expect(
      screen.getByText(/Source line limit 5000 was reached/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Rice").length).toBeGreaterThan(0);
  });

  it("renders the explicit empty state without inventing loss findings", () => {
    const emptyResult: InventoryLossData = {
      ...completeResult,
      summary: {
        lossLineCount: 0,
        adjustmentCount: 0,
        totalLossValue: "0.00",
        currency: "XAF",
        complete: true,
      },
      groups: {
        byProduct: [],
        byLocation: [],
        byApprovingActor: [],
        byCategory: [],
        byPeriod: [],
      },
      records: [],
      coverage: {
        evidence: { covered: 0, total: 0, percent: 100 },
        valuation: { covered: 0, total: 0, percent: 100 },
        approvingActor: { covered: 0, total: 0, percent: 100 },
      },
      snapshot: {
        ...completeResult.snapshot,
        sourceLineCount: 0,
      },
    };
    mockHookState = hookState({
      result: emptyResult,
      response: {
        scope: {
          kind: "LOCATIONS",
          authorizedLocationIds: ["location-1"],
        },
        data: emptyResult,
      },
    });

    render(<InventoryLossWorkbench />);

    expect(screen.getByText("No recorded inventory loss")).toBeInTheDocument();
    expect(screen.queryByText("Recent source records")).not.toBeInTheDocument();
  });

  it("renders permission denial without exposing stale data", () => {
    mockHookState = hookState({
      response: undefined,
      result: undefined,
      scope: undefined,
      isError: true,
      error: Object.assign(new Error("Forbidden"), { status: 403 }),
    });

    render(<InventoryLossWorkbench />);

    expect(
      screen.getByText("Inventory loss access is unavailable"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Rice")).not.toBeInTheDocument();
  });
});
