jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => ({
  db: {
    fiscalDocument: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    complianceSubmission: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    complianceAdapterConfig: {
      findMany: jest.fn(),
    },
  },
}))

import { ComplianceSubmissionStatus, FiscalDocumentStatus } from "@prisma/client"

import { db } from "@/prisma/db"

import { getComplianceCenterKernelSnapshot } from "../compliance-center.service"

const mockDb = db as unknown as {
  fiscalDocument: {
    count: jest.Mock
    findMany: jest.Mock
  }
  complianceSubmission: {
    count: jest.Mock
    findMany: jest.Mock
  }
  complianceAdapterConfig: {
    findMany: jest.Mock
  }
}

describe("compliance center service", () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockDb.fiscalDocument.count.mockResolvedValue(0)
    mockDb.complianceSubmission.count.mockResolvedValue(0)
    mockDb.fiscalDocument.findMany.mockResolvedValue([])
    mockDb.complianceSubmission.findMany.mockResolvedValue([])
    mockDb.complianceAdapterConfig.findMany.mockResolvedValue([
      {
        id: "adapter-config-1",
        countryCode: "CM",
        authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
        adapterKey: "CM_DGI_SANDBOX",
        environment: "SANDBOX",
        status: "ACTIVE",
        countryPackVersion: "CM-2026.1",
        capabilityStatus: "REQUIRES_EXPERT_REVIEW",
        credentialReference: "vault://org-1/cm-dgi-sandbox",
      },
    ])
  })

  it("redacts adapter credential references from dashboard snapshots", async () => {
    const snapshot = await getComplianceCenterKernelSnapshot({ organizationId: "org-1" })

    expect(snapshot.documentCounts).toHaveProperty(FiscalDocumentStatus.DRAFT, 0)
    expect(snapshot.submissionCounts).toHaveProperty(ComplianceSubmissionStatus.PENDING, 0)
    expect(snapshot.adapterConfigs).toEqual([
      {
        id: "adapter-config-1",
        countryCode: "CM",
        authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
        adapterKey: "CM_DGI_SANDBOX",
        environment: "SANDBOX",
        status: "ACTIVE",
        countryPackVersion: "CM-2026.1",
        capabilityStatus: "REQUIRES_EXPERT_REVIEW",
        credentialReferencePresent: true,
      },
    ])
    expect(JSON.stringify(snapshot)).not.toContain("vault://")
    expect(JSON.stringify(snapshot)).not.toContain("cm-dgi-sandbox")
  })
})