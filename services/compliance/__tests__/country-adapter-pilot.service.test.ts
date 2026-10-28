import {
  ComplianceAdapterConfigStatus,
  ComplianceAdapterEnvironment,
  ComplianceAdapterReviewStatus,
} from "@prisma/client"

import {
  configureCountryAdapterPilot,
  disableCountryAdapter,
  recordCountryAdapterReview,
  rotateCountryAdapterCredential,
} from "../country-adapter-pilot.service"

function configFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "adapter-config-1",
    organizationId: "org-1",
    countryCode: "CM",
    authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
    adapterKey: "CM_DGI_SANDBOX",
    environment: ComplianceAdapterEnvironment.SANDBOX,
    status: ComplianceAdapterConfigStatus.ACTIVE,
    countryPackVersion: "CM-2026.1",
    countryPackResolutionHash: `sha256:${"1".repeat(64)}`,
    capabilityStatus: "REQUIRES_EXPERT_REVIEW",
    credentialReference: "vault://org-1/cm-dgi-sandbox",
    credentialExpiresAt: new Date("2027-06-30T00:00:00.000Z"),
    credentialRotatedAt: new Date("2026-07-01T00:00:00.000Z"),
    officialSpecTitle: "DGI technical specification",
    officialSpecVersion: "DGI-API-1.0",
    officialSpecPublishedAt: new Date("2026-06-01T00:00:00.000Z"),
    officialSpecEffectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
    officialSpecReference: "https://www.impots.cm/specification",
    officialSpecHash: `sha256:${"a".repeat(64)}`,
    reviewStatus: ComplianceAdapterReviewStatus.REQUIRES_EXPERT_REVIEW,
    reviewedById: null,
    reviewedAt: null,
    reviewerQualification: null,
    reviewerConflictDeclared: null,
    reviewEvidenceHash: null,
    configHash: `sha256:${"c".repeat(64)}`,
    createdById: "maker-1",
    disabledAt: null,
    ...overrides,
  }
}

function createTx() {
  return {
    complianceAdapterConfig: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    businessEvent: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (args) => ({
        id: "business-event-1",
        organizationId: args.data.organizationId,
        eventSource: args.data.eventSource,
        idempotencyKey: args.data.idempotencyKey,
        payloadHash: args.data.payloadHash,
        outboxMessages: args.data.outboxMessages.create,
      })),
      update: jest.fn(),
    },
  }
}

function dbLike(tx: ReturnType<typeof createTx>) {
  return {
    $transaction: jest.fn(async (callback) => callback(tx)),
  }
}

describe("country adapter pilot controls", () => {
  it("configures a tenant-scoped sandbox pilot without returning the credential reference", async () => {
    const tx = createTx()
    tx.complianceAdapterConfig.upsert.mockImplementation(async (args) =>
      configFixture({
        ...args.create,
        countryPackResolutionHash: args.create.countryPackResolutionHash,
        configHash: args.create.configHash,
      }),
    )

    const result = await configureCountryAdapterPilot(
      {
        organizationId: "org-1",
        actorId: "maker-1",
        credentialReference: "vault://org-1/cm-dgi-sandbox",
        credentialExpiresAt: "2027-06-30T00:00:00.000Z",
        officialSpec: {
          title: "DGI technical specification",
          version: "DGI-API-1.0",
          publishedAt: "2026-06-01T00:00:00.000Z",
          reference: "https://www.impots.cm/specification",
          documentHash: `sha256:${"a".repeat(64)}`,
        },
      },
      dbLike(tx) as never,
    )

    expect(result).toMatchObject({
      organizationId: "org-1",
      adapterKey: "CM_DGI_SANDBOX",
      environment: "SANDBOX",
      status: "ACTIVE",
      credentialReferencePresent: true,
      officialSpec: {
        recorded: true,
        version: "DGI-API-1.0",
      },
      review: {
        status: "REQUIRES_EXPERT_REVIEW",
      },
      productionSubmissionAllowed: false,
    })
    expect(JSON.stringify(result)).not.toContain("vault://")
    expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain("vault://")
    expect(tx.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "AUTHORITY_ADAPTER_CONFIGURED",
          payload: expect.objectContaining({
            credentialReferencePresent: true,
            productionSubmissionAllowed: false,
          }),
        }),
      }),
    )
  })

  it("preserves existing credential and specification evidence when an update omits them", async () => {
    const tx = createTx()
    const existing = configFixture()
    tx.complianceAdapterConfig.findFirst.mockResolvedValue(existing)
    tx.complianceAdapterConfig.upsert.mockImplementation(async (args) => ({
      ...existing,
      ...args.update,
    }))

    const result = await configureCountryAdapterPilot(
      {
        organizationId: "org-1",
        actorId: "operator-2",
      },
      dbLike(tx) as never,
    )

    expect(result).toMatchObject({
      status: "ACTIVE",
      credentialReferencePresent: true,
      officialSpec: {
        recorded: true,
        version: "DGI-API-1.0",
      },
    })
    expect(tx.complianceAdapterConfig.upsert.mock.calls[0][0].update).toMatchObject({
      credentialReference: "vault://org-1/cm-dgi-sandbox",
      officialSpecVersion: "DGI-API-1.0",
    })
    expect(JSON.stringify(result)).not.toContain("vault://")
  })
  it("rejects inline or unapproved credential locations before writing", async () => {
    const tx = createTx()

    await expect(
      configureCountryAdapterPilot(
        {
          organizationId: "org-1",
          actorId: "maker-1",
          credentialReference: "https://user:secret@example.com/token",
        },
        dbLike(tx) as never,
      ),
    ).rejects.toThrow(/secret manager URI/i)
    expect(tx.complianceAdapterConfig.upsert).not.toHaveBeenCalled()
  })

  it("rotates credential references with redacted audit and business-event evidence", async () => {
    const tx = createTx()
    tx.complianceAdapterConfig.findFirst.mockResolvedValue(configFixture())
    tx.complianceAdapterConfig.update.mockImplementation(async (args) =>
      configFixture(args.data),
    )

    const result = await rotateCountryAdapterCredential(
      {
        organizationId: "org-1",
        actorId: "operator-2",
        adapterConfigId: "adapter-config-1",
        credentialReference: "azure-keyvault://stoquify/cm-dgi-sandbox-v2",
        credentialExpiresAt: "2027-12-31T00:00:00.000Z",
        reason: "Scheduled credential rotation",
      },
      dbLike(tx) as never,
    )

    expect(result.credentialReferencePresent).toBe(true)
    expect(JSON.stringify(result)).not.toContain("azure-keyvault://")
    expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain(
      "azure-keyvault://",
    )
    expect(tx.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "AUTHORITY_CREDENTIAL_ROTATED",
        }),
      }),
    )
  })

  it("enforces maker-checker review separation and official-spec evidence", async () => {
    const tx = createTx()
    tx.complianceAdapterConfig.findFirst.mockResolvedValue(
      configFixture({ createdById: "maker-1" }),
    )

    await expect(
      recordCountryAdapterReview(
        {
          organizationId: "org-1",
          actorId: "maker-1",
          adapterConfigId: "adapter-config-1",
          reviewStatus: "EXPERT_APPROVED",
          reviewedAt: "2026-07-27T00:00:00.000Z",
          reviewerQualification: "Licensed tax and accounting reviewer",
          reviewerConflictDeclared: true,
          reviewEvidenceHash: `sha256:${"d".repeat(64)}`,
        },
        dbLike(tx) as never,
      ),
    ).rejects.toThrow(/cannot independently approve/i)
    expect(tx.complianceAdapterConfig.update).not.toHaveBeenCalled()
  })

  it("records an independent review without enabling production submission", async () => {
    const tx = createTx()
    tx.complianceAdapterConfig.findFirst.mockResolvedValue(configFixture())
    tx.complianceAdapterConfig.update.mockImplementation(async (args) =>
      configFixture(args.data),
    )

    const result = await recordCountryAdapterReview(
      {
        organizationId: "org-1",
        actorId: "reviewer-2",
        adapterConfigId: "adapter-config-1",
        reviewStatus: "EXPERT_APPROVED",
        reviewedAt: "2026-07-27T00:00:00.000Z",
        reviewerQualification: "Licensed tax and accounting reviewer",
        reviewerConflictDeclared: true,
        reviewEvidenceHash: `sha256:${"d".repeat(64)}`,
      },
      dbLike(tx) as never,
    )

    expect(result.review.status).toBe("EXPERT_APPROVED")
    expect(result.productionSubmissionAllowed).toBe(false)
  })

  it("disables only the scoped tenant adapter and records that POS posting is unaffected", async () => {
    const tx = createTx()
    tx.complianceAdapterConfig.findFirst.mockResolvedValue(configFixture())
    tx.complianceAdapterConfig.update.mockImplementation(async (args) =>
      configFixture(args.data),
    )

    const result = await disableCountryAdapter(
      {
        organizationId: "org-1",
        actorId: "operator-2",
        adapterConfigId: "adapter-config-1",
        reason: "Authority outage containment",
      },
      dbLike(tx) as never,
    )

    expect(tx.complianceAdapterConfig.findFirst).toHaveBeenCalledWith({
      where: {
        id: "adapter-config-1",
        organizationId: "org-1",
      },
    })
    expect(result.status).toBe("DISABLED")
    expect(tx.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "AUTHORITY_ADAPTER_DISABLED",
          payload: expect.objectContaining({ posPostingAffected: false }),
        }),
      }),
    )
  })
  it("rejects a cross-tenant adapter identifier without updating any configuration", async () => {
    const tx = createTx()
    tx.complianceAdapterConfig.findFirst.mockResolvedValue(null)

    await expect(
      disableCountryAdapter(
        {
          organizationId: "org-2",
          actorId: "operator-2",
          adapterConfigId: "adapter-config-1",
          reason: "Cross-tenant isolation check",
        },
        dbLike(tx) as never,
      ),
    ).rejects.toThrow(/not found/i)

    expect(tx.complianceAdapterConfig.findFirst).toHaveBeenCalledWith({
      where: {
        id: "adapter-config-1",
        organizationId: "org-2",
      },
    })
    expect(tx.complianceAdapterConfig.update).not.toHaveBeenCalled()
  })
})
