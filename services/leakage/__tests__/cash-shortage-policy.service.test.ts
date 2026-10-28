import { Prisma } from "@prisma/client";

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    cashShortagePolicy: { findMany: jest.fn() },
    businessEvent: { findUnique: jest.fn() },
  },
}));

jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual("@/services/events/business-event.service");
  return {
    ...actual,
    recordBusinessEventInTx: jest.fn(),
    markBusinessEventAppliedInTx: jest.fn(),
  };
});

import { db } from "@/prisma/db";
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service";

import { createCashShortagePolicyDraftInputSchema } from "../cash-shortage-policy.schemas";
import {
  approveCashShortagePolicy,
  createCashShortagePolicyDraft,
  resolveApprovedCashShortagePolicy,
} from "../cash-shortage-policy.service";
import {
  POS_SHIFT_CASH_SHORTAGE_POLICY_KIND,
  type CashShortagePolicyV1,
} from "../pos-shift-cash-shortage-contracts";

const mockDb = db as unknown as {
  $transaction: jest.Mock;
  cashShortagePolicy: { findMany: jest.Mock };
  businessEvent: { findUnique: jest.Mock };
};
const mockedRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock;
const mockedMarkBusinessEventAppliedInTx =
  markBusinessEventAppliedInTx as jest.Mock;

function policyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "policy-1",
    organizationId: "org-1",
    version: 1,
    currency: "XAF",
    reviewThreshold: new Prisma.Decimal("2000"),
    highThreshold: new Prisma.Decimal("10000"),
    minorUnitScale: 0,
    roundingMode: "HALF_UP" as const,
    effectiveFrom: new Date("2026-07-20T00:00:00.000Z"),
    effectiveTo: new Date("2026-08-01T00:00:00.000Z"),
    mode: "OBSERVE" as const,
    status: "DRAFT" as const,
    createdById: "maker-1",
    approvedById: null,
    approvedAt: null,
    documentHash: null,
    createdAt: new Date("2026-07-19T10:00:00.000Z"),
    updatedAt: new Date("2026-07-19T10:00:00.000Z"),
    ...overrides,
  };
}

function approvedPolicyEvidence(overrides: Record<string, unknown> = {}) {
  const row = policyRow({
    status: "APPROVED",
    approvedById: "checker-1",
    approvedAt: new Date("2026-07-19T11:00:00.000Z"),
    ...overrides,
  });
  const policy: CashShortagePolicyV1 = {
    kind: POS_SHIFT_CASH_SHORTAGE_POLICY_KIND,
    policyId: row.id,
    version: row.version,
    currency: row.currency,
    reviewThreshold: row.reviewThreshold.toFixed(row.minorUnitScale),
    highThreshold: row.highThreshold.toFixed(row.minorUnitScale),
    minorUnitScale: row.minorUnitScale,
    roundingMode: row.roundingMode,
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
    approvalStatus: "approved",
    approvedAt: row.approvedAt!.toISOString(),
    approvedById: row.approvedById,
    mode: "observe",
  };
  const policyHash = hashBusinessPayload(policy);
  row.documentHash = policyHash;
  const payload = {
    evidenceVersion: 1,
    organizationId: row.organizationId,
    policy,
    policyHash,
  };
  const event = {
    id: "event-1",
    eventType: "cash_shortage.policy.approved",
    schemaVersion: 1,
    status: "APPLIED",
    actorId: row.approvedById,
    sourceType: "MANUAL",
    sourceId: row.id,
    documentHash: policyHash,
    occurredAt: row.approvedAt,
    payload,
    payloadHash: hashBusinessPayload(payload),
  };
  return { row, policy, policyHash, event };
}

function buildTx() {
  return {
    organization: {
      findFirst: jest.fn().mockResolvedValue({ id: "org-1" }),
    },
    user: {
      findMany: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
          Promise.resolve(where.id.in.map((id) => ({ id }))),
        ),
    },
    cashShortagePolicy: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    businessEvent: { findUnique: jest.fn() },
  };
}

function useTransaction(tx: ReturnType<typeof buildTx>) {
  mockDb.$transaction.mockImplementation(
    async (callback: (client: unknown) => Promise<unknown>) => callback(tx),
  );
}

const draftInput = {
  organizationId: "org-1",
  currency: "xaf",
  reviewThreshold: "2000",
  highThreshold: "10000",
  minorUnitScale: 0,
  roundingMode: "HALF_UP" as const,
  effectiveFrom: "2026-07-20T00:00:00.000Z",
  effectiveTo: "2026-08-01T00:00:00.000Z",
};

const managerControl = {
  actorId: "maker-1",
  actorPermissions: ["controls.manage"],
};

describe("cash-shortage policy governance service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRecordBusinessEventInTx.mockResolvedValue({
      event: { id: "event-1" },
      created: true,
    });
    mockedMarkBusinessEventAppliedInTx.mockResolvedValue({ id: "event-1" });
  });

  it.each([
    [{ ...draftInput, reviewThreshold: "0" }, "reviewThreshold"],
    [{ ...draftInput, highThreshold: "1999" }, "highThreshold"],
    [
      { ...draftInput, reviewThreshold: "2000.5", highThreshold: "10000.0" },
      "minor-unit scale",
    ],
    [
      { ...draftInput, effectiveTo: "2026-07-20T00:00:00.000Z" },
      "effective window",
    ],
  ])("rejects invalid governed policy input %#", (input) => {
    expect(
      createCashShortagePolicyDraftInputSchema.safeParse(input).success,
    ).toBe(false);
  });

  it("creates the next tenant/currency draft version with normalized Decimal values", async () => {
    const tx = buildTx();
    tx.cashShortagePolicy.findFirst.mockResolvedValue({ version: 2 });
    tx.cashShortagePolicy.create.mockResolvedValue(
      policyRow({
        version: 3,
        reviewThreshold: new Prisma.Decimal("2000.0000"),
        highThreshold: new Prisma.Decimal("10000.0000"),
      }),
    );
    useTransaction(tx);

    const result = await createCashShortagePolicyDraft(
      draftInput,
      managerControl,
    );

    expect(result.policy).toMatchObject({
      policyId: "policy-1",
      version: 3,
      currency: "XAF",
      approvalStatus: "draft",
      mode: "observe",
    });
    expect(tx.cashShortagePolicy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        version: 3,
        currency: "XAF",
        status: "DRAFT",
        mode: "OBSERVE",
        createdById: "maker-1",
      }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CASH_SHORTAGE_POLICY_DRAFT_CREATED",
        organizationId: "org-1",
      }),
    });
  });

  it("rejects draft creation without policy-management permission", async () => {
    await expect(
      createCashShortagePolicyDraft(draftInput, {
        actorId: "maker-1",
        actorPermissions: [],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it("fails closed when the draft actor is not an active member of the tenant", async () => {
    const tx = buildTx();
    tx.user.findMany.mockResolvedValue([]);
    useTransaction(tx);

    await expect(
      createCashShortagePolicyDraft(draftInput, managerControl),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(tx.cashShortagePolicy.create).not.toHaveBeenCalled();
  });

  it("retries one serializable version race", async () => {
    const tx = buildTx();
    tx.cashShortagePolicy.findFirst.mockResolvedValue(null);
    tx.cashShortagePolicy.create.mockResolvedValue(policyRow());
    const race = Object.assign(new Error("serialization"), {
      name: "PrismaClientKnownRequestError",
      code: "P2034",
    });
    mockDb.$transaction
      .mockRejectedValueOnce(race)
      .mockImplementationOnce(
        async (callback: (client: unknown) => Promise<unknown>) => callback(tx),
      );

    await expect(
      createCashShortagePolicyDraft(draftInput, managerControl),
    ).resolves.toBeDefined();
    expect(mockDb.$transaction).toHaveBeenCalledTimes(2);
  });

  it("audits and blocks maker self-approval before policy mutation", async () => {
    const tx = buildTx();
    tx.cashShortagePolicy.findFirst.mockResolvedValue(policyRow());
    useTransaction(tx);

    await expect(
      approveCashShortagePolicy(
        { organizationId: "org-1", policyId: "policy-1" },
        {
          actorId: "maker-1",
          actorPermissions: ["controls.manage"],
          lastAuthAt: Date.now(),
        },
      ),
    ).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" });
    expect(tx.cashShortagePolicy.updateMany).not.toHaveBeenCalled();
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CASH_SHORTAGE_POLICY_APPROVAL_CONTROL_DENIED",
      }),
    });
  });

  it("requires fresh authentication for an independent checker", async () => {
    const tx = buildTx();
    tx.cashShortagePolicy.findFirst.mockResolvedValue(policyRow());
    useTransaction(tx);
    const now = Date.now();

    await expect(
      approveCashShortagePolicy(
        { organizationId: "org-1", policyId: "policy-1" },
        {
          actorId: "checker-1",
          actorPermissions: ["controls.manage"],
          lastAuthAt: now - 301_000,
          now,
        },
      ),
    ).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" });
    expect(tx.cashShortagePolicy.updateMany).not.toHaveBeenCalled();
  });

  it("rejects approval when an approved window overlaps", async () => {
    const tx = buildTx();
    tx.cashShortagePolicy.findFirst
      .mockResolvedValueOnce(policyRow())
      .mockResolvedValueOnce({ id: "policy-existing", version: 1 });
    useTransaction(tx);

    await expect(
      approveCashShortagePolicy(
        { organizationId: "org-1", policyId: "policy-1" },
        {
          actorId: "checker-1",
          actorPermissions: ["controls.manage"],
          lastAuthAt: Date.now(),
        },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(tx.cashShortagePolicy.updateMany).not.toHaveBeenCalled();
  });

  it("approves once with immutable hash, business event, and audit evidence", async () => {
    const tx = buildTx();
    tx.cashShortagePolicy.findFirst
      .mockResolvedValueOnce(policyRow())
      .mockResolvedValueOnce(null);
    tx.cashShortagePolicy.updateMany.mockResolvedValue({ count: 1 });
    useTransaction(tx);
    const now = new Date("2026-07-19T11:00:00.000Z");

    const result = await approveCashShortagePolicy(
      { organizationId: "org-1", policyId: "policy-1" },
      {
        actorId: "checker-1",
        actorPermissions: ["controls.manage"],
        lastAuthAt: now,
        now,
      },
    );

    expect(result).toMatchObject({
      created: true,
      businessEventId: "event-1",
      policy: {
        approvalStatus: "approved",
        approvedById: "checker-1",
        approvedAt: now.toISOString(),
      },
    });
    expect(result.policyHash).toBe(hashBusinessPayload(result.policy));
    expect(tx.cashShortagePolicy.updateMany).toHaveBeenCalledWith({
      where: { id: "policy-1", organizationId: "org-1", status: "DRAFT" },
      data: expect.objectContaining({
        status: "APPROVED",
        approvedById: "checker-1",
        approvedAt: now,
        documentHash: result.policyHash,
      }),
    });
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "cash_shortage.policy.approved",
        eventSource: "INTERNAL",
        sourceType: "MANUAL",
        sourceId: "policy-1",
        documentHash: result.policyHash,
        payload: expect.objectContaining({ policyHash: result.policyHash }),
      }),
    );
    expect(mockedMarkBusinessEventAppliedInTx).toHaveBeenCalledWith(
      tx,
      "org-1",
      "event-1",
    );
  });

  it("returns an evidence-verified approval replay without mutating the policy", async () => {
    const tx = buildTx();
    const evidence = approvedPolicyEvidence();
    tx.cashShortagePolicy.findFirst.mockResolvedValue(evidence.row);
    tx.businessEvent.findUnique.mockResolvedValue(evidence.event);
    mockedRecordBusinessEventInTx.mockResolvedValue({
      event: { id: "event-1" },
      created: false,
    });
    useTransaction(tx);

    const result = await approveCashShortagePolicy(
      { organizationId: "org-1", policyId: "policy-1" },
      {
        actorId: "checker-1",
        actorPermissions: ["controls.manage"],
        lastAuthAt: Date.now(),
      },
    );

    expect(result).toMatchObject({
      created: false,
      policyHash: evidence.policyHash,
    });
    expect(tx.cashShortagePolicy.updateMany).not.toHaveBeenCalled();
    expect(tx.businessEvent.findUnique).toHaveBeenCalled();
    expect(mockedMarkBusinessEventAppliedInTx).not.toHaveBeenCalled();
  });

  it("returns null without substituting a policy when no tenant/time match exists", async () => {
    mockDb.cashShortagePolicy.findMany.mockResolvedValue([]);

    await expect(
      resolveApprovedCashShortagePolicy({
        organizationId: "org-2",
        currency: "xaf",
        effectiveAt: "2026-07-21T00:00:00.000Z",
      }),
    ).resolves.toBeNull();
    expect(mockDb.cashShortagePolicy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-2",
          currency: "XAF",
          status: "APPROVED",
        }),
        take: 2,
      }),
    );
  });

  it("resolves one exact approved policy only after event and hash verification", async () => {
    const evidence = approvedPolicyEvidence();
    mockDb.cashShortagePolicy.findMany.mockResolvedValue([evidence.row]);
    mockDb.businessEvent.findUnique.mockResolvedValue(evidence.event);

    await expect(
      resolveApprovedCashShortagePolicy({
        organizationId: "org-1",
        currency: "XAF",
        effectiveAt: "2026-07-21T00:00:00.000Z",
      }),
    ).resolves.toEqual(evidence.policy);
  });

  it("fails closed on overlapping approved rows", async () => {
    const first = approvedPolicyEvidence().row;
    const second = approvedPolicyEvidence({ id: "policy-2", version: 2 }).row;
    mockDb.cashShortagePolicy.findMany.mockResolvedValue([first, second]);

    await expect(
      resolveApprovedCashShortagePolicy({
        organizationId: "org-1",
        currency: "XAF",
        effectiveAt: "2026-07-21T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mockDb.businessEvent.findUnique).not.toHaveBeenCalled();
  });

  it("fails closed when an approved row hash drifts", async () => {
    const evidence = approvedPolicyEvidence();
    evidence.row.documentHash = "0".repeat(64);
    mockDb.cashShortagePolicy.findMany.mockResolvedValue([evidence.row]);

    await expect(
      resolveApprovedCashShortagePolicy({
        organizationId: "org-1",
        currency: "XAF",
        effectiveAt: "2026-07-21T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mockDb.businessEvent.findUnique).not.toHaveBeenCalled();
  });

  it("fails closed when approval event evidence is missing", async () => {
    const evidence = approvedPolicyEvidence();
    mockDb.cashShortagePolicy.findMany.mockResolvedValue([evidence.row]);
    mockDb.businessEvent.findUnique.mockResolvedValue(null);

    await expect(
      resolveApprovedCashShortagePolicy({
        organizationId: "org-1",
        currency: "XAF",
        effectiveAt: "2026-07-21T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
