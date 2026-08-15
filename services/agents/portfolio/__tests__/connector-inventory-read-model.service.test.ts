import {
  PaymentReconciliationInboxStatus,
  ProviderAccountStatus,
  ProviderEventStatus,
  ReconciliationRunStatus,
  StatementFileStatus,
} from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    providerAccount: { findMany: jest.fn() },
    providerEvent: { findMany: jest.fn() },
    statementFile: { findMany: jest.fn() },
    reconciliationRun: { findMany: jest.fn() },
    paymentReconciliationInboxItem: { findMany: jest.fn() },
  },
}))

import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { getConnectorInventoryReadModel } from "../connector-inventory-read-model.service"
import { PortfolioControlError } from "../evidence-trust.contracts"

const asOf = "2026-08-02T10:00:00.000Z"

const mockDb = db as unknown as {
  providerAccount: { findMany: jest.Mock }
  providerEvent: { findMany: jest.Mock }
  statementFile: { findMany: jest.Mock }
  reconciliationRun: { findMany: jest.Mock }
  paymentReconciliationInboxItem: { findMany: jest.Mock }
}

const accountBase = {
  id: "provider-1",
  providerCode: "MOMO",
  displayName: "Momo Account",
  status: ProviderAccountStatus.ACTIVE,
  countryCode: "CM",
  currencyCode: "XAF",
  statementSource: "webhook",
  metadata: null,
  updatedAt: new Date("2026-08-02T08:00:00.000Z"),
  paymentRail: { code: "mobile-money" },
}

function resetMocks() {
  mockDb.providerAccount.findMany.mockResolvedValue([accountBase])
  mockDb.providerEvent.findMany.mockResolvedValue([])
  mockDb.statementFile.findMany.mockResolvedValue([])
  mockDb.reconciliationRun.findMany.mockResolvedValue([])
  mockDb.paymentReconciliationInboxItem.findMany.mockResolvedValue([])
}

describe("connector inventory read model", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetMocks()
  })

  it("returns a healthy connector inventory row with ALLOW evidence decision", async () => {
    mockDb.providerEvent.findMany.mockResolvedValue([
      {
        id: "event-1",
        providerAccountId: "provider-1",
        status: ProviderEventStatus.PROCESSED,
        receivedAt: new Date("2026-08-02T09:55:00.000Z"),
        processedAt: new Date("2026-08-02T09:56:00.000Z"),
        signatureValid: true,
      },
    ])
    mockDb.statementFile.findMany.mockResolvedValue([
      {
        id: "statement-1",
        providerAccountId: "provider-1",
        status: StatementFileStatus.IMPORTED,
        fileHash: "sha256:a",
        importedAt: new Date("2026-08-02T09:50:00.000Z"),
      },
    ])
    mockDb.reconciliationRun.findMany.mockResolvedValue([
      {
        id: "run-1",
        providerAccountId: "provider-1",
        status: ReconciliationRunStatus.SIGNED,
        updatedAt: new Date("2026-08-02T09:58:00.000Z"),
        metadata: null,
      },
    ])

    const result = await getConnectorInventoryReadModel({
      trustedOrganizationId: "org-1",
      organizationId: "org-1",
      actorAuthorized: true,
      correlationId: "corr-1",
      asOf,
      defaultFreshnessSlaMinutes: 60,
    })

    expect(result.summary.totalConnectors).toBe(1)
    expect(result.summary.healthy).toBe(1)
    expect(result.summary.blocked).toBe(0)
    expect(result.connectors[0]).toMatchObject({
      connectorId: "provider-1",
      connectorState: "HEALTHY",
      evidenceRelianceDecision: expect.objectContaining({ decision: "ALLOW" }),
    })
    expect(mockDb.providerAccount.findMany).toHaveBeenCalled()
    expect(mockDb.providerEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          providerAccountId: { in: ["provider-1"] },
        }),
      }),
    )
  })

  it("returns blocked connector when freshness SLA is breached", async () => {
    mockDb.providerEvent.findMany.mockResolvedValue([
      {
        id: "event-1",
        providerAccountId: "provider-1",
        status: ProviderEventStatus.PROCESSED,
        receivedAt: new Date("2026-08-02T08:40:00.000Z"),
        processedAt: new Date("2026-08-02T08:41:00.000Z"),
        signatureValid: true,
      },
    ])

    const result = await getConnectorInventoryReadModel({
      trustedOrganizationId: "org-1",
      organizationId: "org-1",
      actorAuthorized: true,
      correlationId: "corr-2",
      asOf,
      defaultFreshnessSlaMinutes: 15,
    })

    expect(result.summary.blocked).toBe(1)
    expect(result.connectors[0]).toMatchObject({
      connectorState: "BLOCKED",
      evidenceRelianceDecision: expect.objectContaining({ decision: "BLOCK" }),
      reasons: ["Connector data is outside its approved freshness SLA."],
    })
  })

  it("returns degraded connector for replay/duplicate marker", async () => {
    mockDb.providerEvent.findMany.mockResolvedValue([
      {
        id: "event-1",
        providerAccountId: "provider-1",
        status: ProviderEventStatus.PROCESSED,
        receivedAt: new Date("2026-08-02T09:55:00.000Z"),
        processedAt: new Date("2026-08-02T09:56:00.000Z"),
        signatureValid: true,
      },
      {
        id: "event-2",
        providerAccountId: "provider-1",
        status: ProviderEventStatus.REPLAYED,
        receivedAt: new Date("2026-08-02T09:58:00.000Z"),
        processedAt: null,
        signatureValid: true,
      },
    ])

    const result = await getConnectorInventoryReadModel({
      trustedOrganizationId: "org-1",
      organizationId: "org-1",
      actorAuthorized: true,
      correlationId: "corr-3",
      asOf,
      defaultFreshnessSlaMinutes: 60,
    })

    expect(result.summary.degraded).toBe(1)
    expect(result.connectors[0]).toMatchObject({
      connectorState: "DEGRADED",
      evidenceRelianceDecision: expect.objectContaining({ decision: "ALLOW_WITH_WARNING" }),
    })
  })

  it("exports credential warning, drift, risk and replay controls from metadata baselines", async () => {
    mockDb.providerAccount.findMany.mockResolvedValue([
      {
        ...accountBase,
        metadata: {
          credentialExpiresAt: "2026-08-09T10:00:00.000Z",
          credentialWarningWindowDays: 10,
          connectorHealthBaseline: {
            gapCount: 0,
            deadLetterCount: 0,
            credentialExpiresAt: "2026-08-20T10:00:00.000Z",
          },
        },
      },
    ])
    mockDb.providerEvent.findMany.mockResolvedValue([
      {
        id: "event-1",
        providerAccountId: "provider-1",
        status: ProviderEventStatus.PROCESSED,
        receivedAt: new Date("2026-08-02T09:55:00.000Z"),
        processedAt: new Date("2026-08-02T09:56:00.000Z"),
        signatureValid: true,
      },
    ])
    mockDb.paymentReconciliationInboxItem.findMany.mockResolvedValue([
      {
        id: "inbox-1",
        providerAccountId: "provider-1",
        status: PaymentReconciliationInboxStatus.DEAD_LETTER,
      },
    ])

    const result = await getConnectorInventoryReadModel({
      trustedOrganizationId: "org-1",
      organizationId: "org-1",
      actorAuthorized: true,
      correlationId: "corr-drift",
      asOf,
      defaultFreshnessSlaMinutes: 60,
    })

    expect(result.summary).toMatchObject({
      degraded: 1,
      credentialWarnings: 1,
      worseningDrift: 1,
      highRiskConnectors: 1,
      criticalRiskConnectors: 0,
    })
    expect(result.connectors[0]).toMatchObject({
      connectorState: "DEGRADED",
      evidenceRelianceDecision: expect.objectContaining({ decision: "ALLOW_WITH_WARNING" }),
      risk: { level: "HIGH", score: 45 },
      credential: expect.objectContaining({
        daysUntilExpiry: 7,
        warningWindowDays: 10,
        warning: true,
        expired: false,
      }),
      drift: expect.objectContaining({
        gapDelta: 0,
        deadLetterDelta: 1,
        credentialExpiryDeltaDays: -11,
        worsening: true,
        improving: false,
      }),
      mayReplayDeadLettersAutomatically: false,
    })
    expect(result.connectors[0].findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "CREDENTIAL_EXPIRING_SOON" }),
        expect.objectContaining({ code: "CREDENTIAL_EXPIRY_DRIFT" }),
        expect.objectContaining({ code: "DEAD_LETTER_EVENTS" }),
        expect.objectContaining({ code: "DEAD_LETTER_DRIFT" }),
      ]),
    )
  })

  it("fails on tenant scope mismatch", async () => {
    await expect(
      getConnectorInventoryReadModel({
        trustedOrganizationId: "org-1",
        organizationId: "org-2",
        actorAuthorized: true,
        correlationId: "corr-4",
        asOf,
      }),
    ).rejects.toThrow(expect.objectContaining<Partial<PortfolioControlError>>({ code: "TENANT_SCOPE_VIOLATION" }))
  })

  it.each([
    [{ correlationId: "corr-invalid" }, "requires trustedOrganizationId"],
    [{ trustedOrganizationId: "org-1", organizationId: "org-1", correlationId: "corr-invalid", asOf: "not-a-date" }, "valid timestamp"],
    [{ trustedOrganizationId: "org-1", organizationId: "org-1", correlationId: "corr-invalid", defaultFreshnessSlaMinutes: 0 }, "positive integer"],
    [{ trustedOrganizationId: "org-1", organizationId: "org-1", correlationId: "corr-invalid", limit: 1001 }, "between 1 and 1000"],
  ])("returns a typed business-rule error for invalid input %#", async (input, message) => {
    await expect(
      getConnectorInventoryReadModel({
        actorAuthorized: true,
        ...input,
      } as Parameters<typeof getConnectorInventoryReadModel>[0]),
    ).rejects.toEqual(
      expect.objectContaining<Partial<BusinessRuleError>>({
        code: "BUSINESS_RULE_VIOLATION",
        message: expect.stringContaining(message),
        status: 422,
      }),
    )
  })

  it("returns dead-letter and gap counts in connector summary", async () => {
    mockDb.providerEvent.findMany.mockResolvedValue([
      {
        id: "event-1",
        providerAccountId: "provider-1",
        status: ProviderEventStatus.RECEIVED,
        receivedAt: new Date("2026-08-02T09:40:00.000Z"),
        processedAt: null,
        signatureValid: true,
      },
    ])
    mockDb.paymentReconciliationInboxItem.findMany.mockResolvedValue([
      {
        id: "inbox-1",
        providerAccountId: "provider-1",
        status: PaymentReconciliationInboxStatus.DEAD_LETTER,
      },
    ])

    const result = await getConnectorInventoryReadModel({
      trustedOrganizationId: "org-1",
      organizationId: "org-1",
      actorAuthorized: true,
      correlationId: "corr-5",
      asOf,
      defaultFreshnessSlaMinutes: 120,
    })

    expect(result.connectors[0]).toMatchObject({
      gapCount: 1,
      deadLetterCount: 1,
    })
    expect(result.summary.connectorsWithGaps).toBe(1)
    expect(result.summary.connectorsWithDeadLetters).toBe(1)
  })
})
