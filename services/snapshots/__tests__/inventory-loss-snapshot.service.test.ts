import {
  readInventoryLossSummary,
  type InventoryLossCategory,
} from "@/services/inventory/inventory-loss-read.service";

import { getInventoryLossSnapshot } from "../inventory-loss-snapshot.service";

jest.mock("@/services/inventory/inventory-loss-read.service", () => ({
  readInventoryLossSummary: jest.fn(),
}));

type InventoryLossSummary = Awaited<
  ReturnType<typeof readInventoryLossSummary>
>;

const mockReadInventoryLossSummary =
  readInventoryLossSummary as jest.MockedFunction<
    typeof readInventoryLossSummary
  >;
const sourceGeneratedAt = "2026-02-02T09:00:00.000Z";

function categoryGroup(
  key: InventoryLossCategory,
  lineCount = 1,
  lossValue = "100.00",
) {
  return {
    key,
    label: key,
    lineCount,
    adjustmentCount: lineCount,
    lossValue,
    currency: "XAF",
  };
}

function makeSummary(
  overrides: Partial<InventoryLossSummary> = {},
): InventoryLossSummary {
  const base = {
    period: {
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-02-01T00:00:00.000Z",
      boundary: "HALF_OPEN" as const,
      timezone: "Africa/Douala",
    },
    filters: {
      locationId: null,
      locationIds: null,
      itemId: null,
      approverId: null,
    },
    summary: {
      lossLineCount: 5,
      adjustmentCount: 5,
      totalLossValue: "500.00",
      currency: "XAF",
      complete: true,
    },
    groups: {
      byProduct: [],
      byLocation: [],
      byApprovingActor: [],
      byCategory: [
        categoryGroup("COUNT_VARIANCE"),
        categoryGroup("DAMAGED"),
        categoryGroup("EXPIRED"),
        categoryGroup("RECORDED_THEFT"),
        categoryGroup("WRITE_OFF"),
      ],
      byPeriod: [],
    },
    records: [],
    coverage: {
      evidence: { covered: 5, total: 5, percent: 100 },
      valuation: { covered: 5, total: 5, percent: 100 },
      approvingActor: { covered: 5, total: 5, percent: 100 },
    },
    attribution: {
      dimension: "APPROVER" as const,
      meaning:
        "The actor approved the recorded adjustment; this is not evidence that the actor caused the loss.",
    },
    snapshot: {
      generatedAt: sourceGeneratedAt,
      sourceLineLimit: 5_000,
      sourceLineCount: 5,
      truncated: false,
    },
    completeness: {
      state: "complete" as const,
      sources: [
        { source: "stock_adjustment_lines", state: "complete" as const },
        { source: "adjustment_evidence", state: "complete" as const },
        { source: "inventory_valuation", state: "complete" as const },
        { source: "approval_attribution", state: "complete" as const },
      ],
    },
  };

  return { ...base, ...overrides } as InventoryLossSummary;
}

describe("inventory loss snapshot service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes tenant scope and delegates through the half-open read boundary", async () => {
    mockReadInventoryLossSummary.mockResolvedValue(makeSummary());

    const result = await getInventoryLossSnapshot({
      organizationId: " org-1 ",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      now: "2026-02-02T12:00:00.000Z",
    });

    expect(mockReadInventoryLossSummary).toHaveBeenCalledWith(
      {
        organizationId: "org-1",
        from: new Date("2026-01-01T00:00:00.000Z"),
        to: new Date("2026-02-01T00:00:00.000Z"),
        detailLimit: 0,
        groupLimit: 50,
      },
      { now: expect.any(Function) },
    );
    const options = mockReadInventoryLossSummary.mock.calls[0]?.[1];
    expect(options?.now?.()).toEqual(new Date("2026-02-02T12:00:00.000Z"));
    expect(result).toMatchObject({
      kind: "inventory.loss",
      organizationId: "org-1",
      locationId: null,
      periodStart: "2026-01-01T00:00:00.000Z",
      periodEnd: "2026-01-31T23:59:59.999Z",
      status: "fresh",
      uiState: "redacted",
      evidenceGrade: "operational",
      sourceModules: ["inventory"],
      metrics: {
        lossLineCount: 5,
        adjustmentCount: 5,
        totalLossValue: 500,
        currency: "XAF",
        countVarianceLineCount: 1,
        damagedLineCount: 1,
        expiredLineCount: 1,
        recordedTheftCategoryLineCount: 1,
        writeOffLineCount: 1,
        evidenceCoveredLineCount: 5,
        evidenceCoveragePercent: 100,
        valuationCoveredLineCount: 5,
        valuationCoveragePercent: 100,
        approvalAttributedLineCount: 5,
        approvalCoveragePercent: 100,
        missingEvidenceLineCount: 0,
        missingValuationLineCount: 0,
        missingApprovalAttributionLineCount: 0,
        sourceTruncated: false,
      },
      blockers: [],
      redactions: [
        expect.objectContaining({
          id: "inventory-loss-evidence-hashes-redacted",
          field: "records.evidence.*Hash",
          policy: "INVENTORY_LOSS_EVIDENCE_REDACTION",
        }),
      ],
    });
  });

  it("forwards one server-resolved location without creating plural browser scope", async () => {
    mockReadInventoryLossSummary.mockResolvedValue(makeSummary());

    const result = await getInventoryLossSnapshot({
      organizationId: "org-1",
      locationId: " location-1 ",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      now: "2026-02-02T12:00:00.000Z",
    });

    expect(mockReadInventoryLossSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        locationId: "location-1",
      }),
      expect.any(Object),
    );
    expect(mockReadInventoryLossSummary.mock.calls[0]?.[0]).not.toHaveProperty(
      "locationIds",
    );
    expect(result.locationId).toBe("location-1");
  });

  it("maps missing evidence, valuation, and approval attribution to partial non-causal evidence", async () => {
    mockReadInventoryLossSummary.mockResolvedValue(
      makeSummary({
        coverage: {
          evidence: { covered: 4, total: 5, percent: 80 },
          valuation: { covered: 3, total: 5, percent: 60 },
          approvingActor: { covered: 2, total: 5, percent: 40 },
        },
        completeness: {
          state: "partial",
          sources: [
            {
              source: "stock_adjustment_lines",
              state: "complete",
            },
            {
              source: "adjustment_evidence",
              state: "partial",
              reason: "1 loss line lacks source evidence.",
            },
            {
              source: "inventory_valuation",
              state: "partial",
              reason: "2 loss lines lack valuation evidence.",
            },
            {
              source: "approval_attribution",
              state: "partial",
              reason: "3 loss lines lack an approving actor.",
            },
          ],
        },
      }),
    );

    const result = await getInventoryLossSnapshot({
      organizationId: "org-1",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      now: "2026-02-02T12:00:00.000Z",
    });

    expect(result).toMatchObject({
      status: "partial",
      uiState: "partial",
      evidenceGrade: "raw",
      metrics: {
        missingEvidenceLineCount: 1,
        missingValuationLineCount: 2,
        missingApprovalAttributionLineCount: 3,
      },
    });
    expect(result.blockers).toEqual([
      expect.objectContaining({
        id: "inventory-loss-evidence-missing",
        severity: "medium",
      }),
      expect.objectContaining({
        id: "inventory-loss-valuation-missing",
        severity: "medium",
      }),
      expect.objectContaining({
        id: "inventory-loss-approval-attribution-missing",
        severity: "medium",
      }),
    ]);
    expect(result.blockers[0]?.detail).toContain(
      "does not establish causation",
    );
    expect(result.blockers[2]?.detail).toContain("not causation");
  });

  it("blocks totals when the source line cap truncates evidence", async () => {
    const base = makeSummary();
    mockReadInventoryLossSummary.mockResolvedValue(
      makeSummary({
        summary: { ...base.summary, complete: false },
        snapshot: { ...base.snapshot, truncated: true },
        completeness: {
          state: "partial",
          sources: [
            {
              source: "stock_adjustment_lines",
              state: "partial",
              reason: "Source line limit 5000 was reached.",
            },
            ...base.completeness.sources.slice(1),
          ],
        },
      }),
    );

    const result = await getInventoryLossSnapshot({
      organizationId: "org-1",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      now: "2026-02-02T12:00:00.000Z",
    });

    expect(result).toMatchObject({
      status: "blocked",
      uiState: "blocked",
      evidenceGrade: "blocked",
      metrics: { sourceTruncated: true },
    });
    expect(result.blockers).toEqual([
      expect.objectContaining({
        id: "inventory-loss-source-truncated",
        severity: "high",
        gate: "inventory_loss_source",
      }),
    ]);
  });

  it("keeps a fully covered zero-record source empty without blockers", async () => {
    const base = makeSummary();
    mockReadInventoryLossSummary.mockResolvedValue(
      makeSummary({
        summary: {
          lossLineCount: 0,
          adjustmentCount: 0,
          totalLossValue: "0.00",
          currency: "XAF",
          complete: true,
        },
        groups: { ...base.groups, byCategory: [] },
        coverage: {
          evidence: { covered: 0, total: 0, percent: 100 },
          valuation: { covered: 0, total: 0, percent: 100 },
          approvingActor: { covered: 0, total: 0, percent: 100 },
        },
        snapshot: {
          ...base.snapshot,
          sourceLineCount: 0,
        },
      }),
    );

    const result = await getInventoryLossSnapshot({
      organizationId: "org-1",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      now: "2026-02-02T12:00:00.000Z",
    });

    expect(result).toMatchObject({
      status: "empty",
      uiState: "empty",
      evidenceGrade: "raw",
      metrics: {
        lossLineCount: 0,
        totalLossValue: 0,
        evidenceCoveragePercent: 100,
        valuationCoveragePercent: 100,
        approvalCoveragePercent: 100,
      },
      blockers: [],
    });
  });

  it("keeps generation time out of the source hash while material facts change it", async () => {
    const base = makeSummary();
    mockReadInventoryLossSummary.mockResolvedValueOnce(base);

    const first = await getInventoryLossSnapshot({
      organizationId: "org-1",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      now: "2026-02-02T12:00:00.000Z",
    });

    mockReadInventoryLossSummary.mockResolvedValueOnce(
      makeSummary({
        snapshot: {
          ...base.snapshot,
          generatedAt: "2026-02-03T09:00:00.000Z",
        },
      }),
    );
    const timeOnlyChange = await getInventoryLossSnapshot({
      organizationId: "org-1",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      now: "2026-02-03T12:00:00.000Z",
    });

    const changedCategories = base.groups.byCategory.map((group) =>
      group.key === "DAMAGED"
        ? { ...group, lineCount: 2, lossValue: "200.00" }
        : group,
    );
    mockReadInventoryLossSummary.mockResolvedValueOnce(
      makeSummary({
        summary: {
          ...base.summary,
          lossLineCount: 6,
          totalLossValue: "600.00",
        },
        groups: {
          ...base.groups,
          byCategory: changedCategories,
        },
      }),
    );
    const materialChange = await getInventoryLossSnapshot({
      organizationId: "org-1",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      now: "2026-02-03T12:00:00.000Z",
    });

    expect(first.sourceHash).toBe(timeOnlyChange.sourceHash);
    expect(first.generatedAt).not.toBe(timeOnlyChange.generatedAt);
    expect(materialChange.sourceHash).not.toBe(first.sourceHash);
  });

  it("does not expose record evidence hashes or actor details", async () => {
    const secretEvidenceHash = "sha256:secret-source-evidence";
    const secretActorName = "Sensitive Approver";
    mockReadInventoryLossSummary.mockResolvedValue(
      makeSummary({
        records: [
          {
            id: "line-secret",
            adjustment: {
              approvedBy: {
                id: "user-secret",
                name: secretActorName,
              },
            },
            evidence: {
              lineEvidenceHash: secretEvidenceHash,
              adjustmentEvidenceHash: "sha256:secret-adjustment",
              documentHash: "sha256:secret-document",
            },
          },
        ] as unknown as InventoryLossSummary["records"],
      }),
    );

    const result = await getInventoryLossSnapshot({
      organizationId: "org-1",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      now: "2026-02-02T12:00:00.000Z",
    });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(secretEvidenceHash);
    expect(serialized).not.toContain(secretActorName);
    expect(serialized).not.toContain("sha256:secret-adjustment");
    expect(serialized).not.toContain("sha256:secret-document");
    expect(result.redactions).toEqual([
      expect.objectContaining({
        policy: "INVENTORY_LOSS_EVIDENCE_REDACTION",
      }),
    ]);
  });
});
