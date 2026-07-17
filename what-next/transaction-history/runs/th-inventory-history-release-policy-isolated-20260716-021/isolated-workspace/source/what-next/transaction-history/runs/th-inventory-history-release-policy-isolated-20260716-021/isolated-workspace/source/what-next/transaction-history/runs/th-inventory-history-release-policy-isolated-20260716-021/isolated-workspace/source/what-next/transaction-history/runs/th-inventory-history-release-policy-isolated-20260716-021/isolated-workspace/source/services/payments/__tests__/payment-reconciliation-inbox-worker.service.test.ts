jest.mock("server-only", () => ({}));

import {
  PaymentReconciliationInboxSource,
  PaymentReconciliationInboxStatus,
} from "@prisma/client";

import { ConflictError } from "@/services/_shared/action-errors";

import {
  completePaymentReconciliationInboxItem,
  failPaymentReconciliationInboxItem,
  leasePaymentReconciliationInboxItems,
} from "../payment-reconciliation-inbox-worker.service";

type InboxRow = {
  id: string;
  organizationId: string;
  providerAccountId: string | null;
  source: PaymentReconciliationInboxSource;
  status: PaymentReconciliationInboxStatus;
  idempotencyKey: string;
  externalId: string | null;
  payloadHash: string;
  payloadSummary: Record<string, unknown> | null;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: Date | null;
  leasedBy: string | null;
  leaseToken: string | null;
  processedAt: Date | null;
  correlationId: string | null;
  updatedAt: Date;
};

function inboxRow(overrides: Partial<InboxRow> = {}): InboxRow {
  return {
    id: "inbox-1",
    organizationId: "org-1",
    providerAccountId: "provider-1",
    source: PaymentReconciliationInboxSource.PROVIDER_EVENT,
    status: PaymentReconciliationInboxStatus.RECEIVED,
    idempotencyKey: "idem-1",
    externalId: "provider-event-1",
    payloadHash: "sha256:payload",
    payloadSummary: { providerEventId: "provider-event-1", eventType: "PAYMENT_SETTLED" },
    attempts: 0,
    lastError: null,
    nextAttemptAt: null,
    leasedBy: null,
    leaseToken: null,
    processedAt: null,
    correlationId: "corr-1",
    updatedAt: new Date("2026-06-30T08:00:00.000Z"),
    ...overrides,
  };
}

function sameDate(left: Date | null | undefined, right: Date | null | undefined) {
  if (!left || !right) return left === right;
  return left.getTime() === right.getTime();
}

function applyMutation(row: InboxRow, data: Record<string, any>) {
  if (data.status !== undefined) row.status = data.status;
  if (data.attempts?.increment) row.attempts += data.attempts.increment;
  if (data.lastError !== undefined) row.lastError = data.lastError;
  if (data.nextAttemptAt !== undefined) row.nextAttemptAt = data.nextAttemptAt;
  if (data.leasedBy !== undefined) row.leasedBy = data.leasedBy;
  if (data.leaseToken !== undefined) row.leaseToken = data.leaseToken;
  if (data.processedAt !== undefined) row.processedAt = data.processedAt;
  if (data.correlationId !== undefined) row.correlationId = data.correlationId;
  if (data.payloadSummary !== undefined) row.payloadSummary = data.payloadSummary as Record<string, unknown>;
  row.updatedAt = new Date("2026-06-30T08:30:00.000Z");
}

function buildClient(rows: InboxRow[], raceIds = new Set<string>()) {
  const client = {
    paymentReconciliationInboxItem: {
      findMany: jest.fn().mockResolvedValue(rows),
      findFirst: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(
          rows.find(
            (row) =>
              row.id === where.id &&
              row.organizationId === where.organizationId,
          ) ?? null,
        ),
      ),
      updateMany: jest.fn().mockImplementation(({ where, data }) => {
        const row = rows.find(
          (candidate) =>
            candidate.id === where.id &&
            candidate.organizationId === where.organizationId &&
            candidate.status === where.status &&
            candidate.attempts === where.attempts &&
            sameDate(candidate.nextAttemptAt, where.nextAttemptAt) &&
            candidate.leasedBy === where.leasedBy &&
            candidate.leaseToken === where.leaseToken,
        );
        if (!row || raceIds.has(where.id)) return Promise.resolve({ count: 0 });
        applyMutation(row, data);
        return Promise.resolve({ count: 1 });
      }),
    },
  };

  return client as any;
}

describe("payment reconciliation inbox worker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("leases due inbox items and dead-letters max-attempt items with redacted output", async () => {
    const rows = [
      inboxRow(),
      inboxRow({
        id: "inbox-2",
        status: PaymentReconciliationInboxStatus.FAILED,
        attempts: 5,
        lastError: "PROVIDER_TIMEOUT",
        nextAttemptAt: new Date("2026-06-30T07:55:00.000Z"),
      }),
    ];
    const client = buildClient(rows);

    const result = await leasePaymentReconciliationInboxItems(
      {
        organizationId: "org-1",
        leasedBy: "worker-1",
        now: "2026-06-30T08:00:00.000Z",
        leaseSeconds: 120,
        maxAttempts: 5,
        leaseToken: "lease-token-1",
      },
      client,
    );

    expect(client.paymentReconciliationInboxItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: "org-1",
        OR: expect.arrayContaining([
          { status: PaymentReconciliationInboxStatus.RECEIVED },
          expect.objectContaining({ status: PaymentReconciliationInboxStatus.FAILED }),
          expect.objectContaining({ status: PaymentReconciliationInboxStatus.PROCESSING }),
        ]),
      }),
      orderBy: [{ nextAttemptAt: "asc" }, { updatedAt: "asc" }],
      take: 25,
    }));
    expect(result.leasedItems).toHaveLength(1);
    expect(result.leasedItems[0]).toMatchObject({
      id: "inbox-1",
      status: PaymentReconciliationInboxStatus.PROCESSING,
      attempts: 1,
      nextAttemptAt: "2026-06-30T08:02:00.000Z",
      leasedBy: "worker-1",
      leaseToken: "lease-token-1",
      action: "LEASED",
      redacted: true,
    });
    expect(result.deadLetteredItems[0]).toMatchObject({
      id: "inbox-2",
      status: PaymentReconciliationInboxStatus.DEAD_LETTER,
      attempts: 6,
      lastErrorCode: "MAX_ATTEMPTS_EXCEEDED",
      action: "DEAD_LETTERED",
    });
    expect(result.redaction).toMatchObject({
      rawPayloadsIncluded: false,
      payloadSummariesReturned: false,
      credentialSecretsIncluded: false,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("secretToken");
    expect(serialized).not.toContain("do-not-return");
  });

  it("dead-letters unsafe payload summaries instead of leasing provider payloads", async () => {
    const rows = [
      inboxRow({
        payloadSummary: { providerEventId: "provider-event-1", secretToken: "do-not-return" },
      }),
    ];
    const client = buildClient(rows);

    const result = await leasePaymentReconciliationInboxItems(
      {
        organizationId: "org-1",
        leasedBy: "worker-1",
        now: "2026-06-30T08:00:00.000Z",
      },
      client,
    );

    expect(result.leasedItems).toHaveLength(0);
    expect(result.deadLetteredItems[0]).toMatchObject({
      id: "inbox-1",
      status: PaymentReconciliationInboxStatus.DEAD_LETTER,
      lastErrorCode: "PAYLOAD_SUMMARY_REDACTION_REQUIRED",
      leasedBy: null,
      leaseToken: null,
      action: "DEAD_LETTERED",
    });
    const storedSummary = JSON.stringify(rows[0].payloadSummary);
    expect(storedSummary).toContain("PAYLOAD_SUMMARY_REDACTION_REQUIRED");
    expect(storedSummary).not.toContain("secretToken");
    expect(storedSummary).not.toContain("do-not-return");
  });

  it("reports skipped leases when another worker wins the guard", async () => {
    const client = buildClient([inboxRow()], new Set(["inbox-1"]));

    const result = await leasePaymentReconciliationInboxItems(
      {
        organizationId: "org-1",
        leasedBy: "worker-2",
        now: "2026-06-30T08:00:00.000Z",
      },
      client,
    );

    expect(result.leasedItems).toHaveLength(0);
    expect(result.skippedRaceCount).toBe(1);
  });

  it("completes a processing item and clears retry state", async () => {
    const rows = [
      inboxRow({
        status: PaymentReconciliationInboxStatus.PROCESSING,
        attempts: 1,
        nextAttemptAt: new Date("2026-06-30T08:05:00.000Z"),
        leasedBy: "worker-1",
        leaseToken: "lease-token-1",
        lastError: "PROVIDER_TIMEOUT",
      }),
    ];
    const client = buildClient(rows);

    const result = await completePaymentReconciliationInboxItem(
      {
        organizationId: "org-1",
        inboxItemId: "inbox-1",
        leasedBy: "worker-1",
        leaseToken: "lease-token-1",
        processedBy: "worker-1",
        now: "2026-06-30T08:04:00.000Z",
      },
      client,
    );

    expect(result.item).toMatchObject({
      status: PaymentReconciliationInboxStatus.PROCESSED,
      processedAt: "2026-06-30T08:04:00.000Z",
      nextAttemptAt: null,
      leasedBy: null,
      leaseToken: null,
      lastErrorCode: null,
      action: "COMPLETED",
    });
  });

  it("schedules retry with exponential backoff and stable error codes", async () => {
    const rows = [
      inboxRow({
        status: PaymentReconciliationInboxStatus.PROCESSING,
        attempts: 2,
        nextAttemptAt: new Date("2026-06-30T08:05:00.000Z"),
        leasedBy: "worker-1",
        leaseToken: "lease-token-1",
      }),
    ];
    const client = buildClient(rows);

    const result = await failPaymentReconciliationInboxItem(
      {
        organizationId: "org-1",
        inboxItemId: "inbox-1",
        leasedBy: "worker-1",
        leaseToken: "lease-token-1",
        processedBy: "worker-1",
        errorCode: "PROVIDER_TIMEOUT",
        retryBaseSeconds: 60,
        maxAttempts: 5,
        now: "2026-06-30T08:00:00.000Z",
      },
      client,
    );

    expect(result.item).toMatchObject({
      status: PaymentReconciliationInboxStatus.FAILED,
      attempts: 2,
      nextAttemptAt: "2026-06-30T08:02:00.000Z",
      leasedBy: null,
      leaseToken: null,
      lastErrorCode: "PROVIDER_TIMEOUT",
      action: "RETRY_SCHEDULED",
    });
  });

  it("normalizes raw failure text and dead-letters after max attempts", async () => {
    const retryRows = [
      inboxRow({
        status: PaymentReconciliationInboxStatus.PROCESSING,
        attempts: 1,
        nextAttemptAt: new Date("2026-06-30T08:05:00.000Z"),
        leasedBy: "worker-1",
        leaseToken: "lease-token-1",
      }),
    ];
    const retryClient = buildClient(retryRows);

    const retryResult = await failPaymentReconciliationInboxItem(
      {
        organizationId: "org-1",
        inboxItemId: "inbox-1",
        leasedBy: "worker-1",
        leaseToken: "lease-token-1",
        errorCode: "raw provider stack password=secret",
        now: "2026-06-30T08:00:00.000Z",
      },
      retryClient,
    );

    expect(retryResult.item.lastErrorCode).toBe("PROVIDER_INBOX_WORKER_FAILED");
    expect(JSON.stringify(retryResult)).not.toContain("password");
    expect(JSON.stringify(retryResult)).not.toContain("secret");

    const deadLetterRows = [
      inboxRow({
        status: PaymentReconciliationInboxStatus.PROCESSING,
        attempts: 5,
        nextAttemptAt: new Date("2026-06-30T08:05:00.000Z"),
        leasedBy: "worker-1",
        leaseToken: "lease-token-1",
      }),
    ];
    const deadLetterClient = buildClient(deadLetterRows);

    const deadLetterResult = await failPaymentReconciliationInboxItem(
      {
        organizationId: "org-1",
        inboxItemId: "inbox-1",
        leasedBy: "worker-1",
        leaseToken: "lease-token-1",
        errorCode: "PROVIDER_TIMEOUT",
        maxAttempts: 5,
        now: "2026-06-30T08:00:00.000Z",
      },
      deadLetterClient,
    );

    expect(deadLetterResult.item).toMatchObject({
      status: PaymentReconciliationInboxStatus.DEAD_LETTER,
      nextAttemptAt: null,
      leasedBy: null,
      leaseToken: null,
      lastErrorCode: "MAX_ATTEMPTS_EXCEEDED",
      action: "DEAD_LETTERED",
    });
  });

  it("rejects completion or failure for non-leased items", async () => {
    const client = buildClient([inboxRow({ status: PaymentReconciliationInboxStatus.RECEIVED })]);

    await expect(
      completePaymentReconciliationInboxItem(
        {
          organizationId: "org-1",
          inboxItemId: "inbox-1",
          leasedBy: "worker-1",
          leaseToken: "lease-token-1",
        },
        client,
      ),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      failPaymentReconciliationInboxItem(
        {
          organizationId: "org-1",
          inboxItemId: "inbox-1",
          leasedBy: "worker-1",
          leaseToken: "lease-token-1",
          errorCode: "PROVIDER_TIMEOUT",
        },
        client,
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects completion and failure when the worker does not own the lease token", async () => {
    const client = buildClient([
      inboxRow({
        status: PaymentReconciliationInboxStatus.PROCESSING,
        attempts: 1,
        nextAttemptAt: new Date("2026-06-30T08:05:00.000Z"),
        leasedBy: "worker-1",
        leaseToken: "lease-token-1",
      }),
    ]);

    await expect(
      completePaymentReconciliationInboxItem(
        {
          organizationId: "org-1",
          inboxItemId: "inbox-1",
          leasedBy: "worker-2",
          leaseToken: "lease-token-2",
        },
        client,
      ),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      failPaymentReconciliationInboxItem(
        {
          organizationId: "org-1",
          inboxItemId: "inbox-1",
          leasedBy: "worker-2",
          leaseToken: "lease-token-2",
          errorCode: "PROVIDER_TIMEOUT",
        },
        client,
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
