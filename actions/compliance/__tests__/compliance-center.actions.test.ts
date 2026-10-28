import {
  AccountingSourceType,
  ComplianceAdapterEnvironment,
  ComplianceSubmissionOperation,
  FiscalDocumentType,
} from "@prisma/client"

const mockRevalidatePath = jest.fn()

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

jest.mock("@/lib/security/auth-session", () => {
  class MockFreshAuthRequiredError extends Error {
    constructor(message = "Fresh authentication required") {
      super(message)
      this.name = "FreshAuthRequiredError"
    }
  }

  return {
    FreshAuthRequiredError: MockFreshAuthRequiredError,
    requireFreshAuth: jest.fn(),
  }
})

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
      this.name = "RbacError"
    }
  }

  return {
    RbacError: MockRbacError,
    assertCanUseOrganization: jest.fn(),
    isRbacError: (error: unknown) => error instanceof MockRbacError,
    requirePermission: jest.fn(),
  }
})

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/compliance", () => ({
  enqueueComplianceSubmission: jest.fn(),
  getComplianceCenterKernelSnapshot: jest.fn(),
  getEInvoicingMetadataReadiness: jest.fn(),
  createFiscalDocumentFromPostedSource: jest.fn(),
}))

import { requireFreshAuth } from "@/lib/security/auth-session"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  createFiscalDocumentFromPostedSource,
  enqueueComplianceSubmission,
  getComplianceCenterKernelSnapshot,
  getEInvoicingMetadataReadiness,
} from "@/services/compliance"

import {
  createFiscalDocumentFromPostedSourceAction,
  enqueueComplianceSubmissionAction,
  getComplianceCenterKernelSnapshotAction,
  resolveEInvoicingMetadataAction,
} from "../compliance-center.actions"

const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetKernelSnapshot = getComplianceCenterKernelSnapshot as jest.Mock
const mockResolveMetadata = getEInvoicingMetadataReadiness as jest.Mock
const mockCreateFiscalDocument = createFiscalDocumentFromPostedSource as jest.Mock
const mockEnqueueSubmission = enqueueComplianceSubmission as jest.Mock

function expectComplianceModuleGate(input: {
  surface: string
  permission: string
  accessIntent: "read" | "write"
}) {
  expect(mockObserveModuleAccess).toHaveBeenCalledWith({
    organizationId: "org-1",
    userId: "operator-1",
    actorPermissions: [input.permission],
    moduleSlug: "compliance",
    surfaceType: "action",
    surface: input.surface,
    accessIntent: input.accessIntent,
    mode: "enforce",
    audit: true,
  })
}

const createFiscalDocumentInput = {
  organizationId: "spoofed-org",
  createdById: "spoofed-user",
  documentType: FiscalDocumentType.POS_RECEIPT,
  sourceType: AccountingSourceType.POS_SALE,
  sourceId: "sale-1",
  sourceNumber: "POS-0001",
  sourceDate: "2026-06-14T09:30:00.000Z",
  issueDate: "2026-06-14T09:31:00.000Z",
  countryCode: "cm",
  currency: "xaf",
  idempotencyKey: "fd-sale-1",
  subtotal: "1000.00",
  taxAmount: "192.50",
  discountAmount: "0.00",
  totalAmount: "1192.50",
  taxBreakdown: { standard: "192.50" },
  lines: [
    {
      lineNumber: 1,
      description: "Retail sale",
      quantity: "1",
      unitPrice: "1000.00",
      discountAmount: "0.00",
      taxRateBps: 1925,
      taxCode: "TVA",
      taxAmount: "192.50",
      lineSubtotal: "1000.00",
      lineTotal: "1192.50",
    },
  ],
  enqueueCertification: false,
}

const enqueueSubmissionInput = {
  organizationId: "spoofed-org",
  actorId: "spoofed-user",
  fiscalDocumentId: "fiscal-doc-1",
  operation: ComplianceSubmissionOperation.CERTIFY,
  authorityChannel: "FAKE_SANDBOX",
  environment: ComplianceAdapterEnvironment.FAKE_SANDBOX,
  idempotencyKey: "submission-key",
  payloadHash: "sha256:fiscal-doc",
  requestSummary: { sourceType: "POS_SALE" },
}

describe("compliance center actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({ claims: { lastAuthAt: Date.now() } })
    mockRequirePermission.mockImplementation(async (permission: string) => ({
      orgId: "org-1",
      userId: "operator-1",
      permissions: [permission],
      roles: [],
      isSuperUser: false,
      fetchedAt: Date.now(),
      source: "better-auth",
    }))
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
    mockGetKernelSnapshot.mockResolvedValue({ organizationId: "org-1", documentCounts: {} })
    mockResolveMetadata.mockReturnValue({ countryCode: "CM", state: "READY" })
    mockCreateFiscalDocument.mockResolvedValue({ id: "fiscal-doc-1", organizationId: "org-1" })
    mockEnqueueSubmission.mockResolvedValue({ id: "submission-1", organizationId: "org-1" })
  })

  it("enforces compliance module access before reading the compliance center snapshot", async () => {
    const result = await getComplianceCenterKernelSnapshotAction({ countryCode: "cm", limit: 10 })

    expect(result).toEqual(expect.objectContaining({ success: true, status: 200 }))
    expect(mockRequirePermission).toHaveBeenCalledWith("compliance.documents.read", {
      resource: "ComplianceCenter",
      auditAllowed: false,
    })
    expectComplianceModuleGate({
      surface: "actions/compliance/compliance-center.actions.ts:getComplianceCenterKernelSnapshotAction",
      permission: "compliance.documents.read",
      accessIntent: "read",
    })
    expect(mockGetKernelSnapshot).toHaveBeenCalledWith({
      organizationId: "org-1",
      countryCode: "CM",
      limit: 10,
    })
  })

  it("denies compliance center snapshot reads when the compliance module is unavailable", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: false, wouldBlock: true, result: "deny" })

    const result = await getComplianceCenterKernelSnapshotAction({ countryCode: "cm" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
    }))
    expect(mockGetKernelSnapshot).not.toHaveBeenCalled()
  })

  it("enforces compliance module access before resolving e-invoicing metadata", async () => {
    const result = await resolveEInvoicingMetadataAction({ countryCode: "cm", date: "2026-06-14" })

    expect(result).toEqual(expect.objectContaining({ success: true, status: 200 }))
    expectComplianceModuleGate({
      surface: "actions/compliance/compliance-center.actions.ts:resolveEInvoicingMetadataAction",
      permission: "compliance.metadata.read",
      accessIntent: "read",
    })
    expect(mockResolveMetadata).toHaveBeenCalledWith({
      countryCode: "CM",
      date: new Date("2026-06-14T00:00:00.000Z"),
    })
  })

  it("enforces compliance module access before issuing fiscal documents", async () => {
    const result = await createFiscalDocumentFromPostedSourceAction(createFiscalDocumentInput)

    expect(result).toEqual(expect.objectContaining({ success: true, status: 200 }))
    expect(mockRequireFreshAuth).toHaveBeenCalled()
    expectComplianceModuleGate({
      surface: "actions/compliance/compliance-center.actions.ts:createFiscalDocumentFromPostedSourceAction",
      permission: "compliance.documents.issue",
      accessIntent: "write",
    })
    expect(mockCreateFiscalDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        createdById: "operator-1",
        countryCode: "CM",
        currency: "XAF",
      }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/compliance", "page")
  })

  it("denies fiscal document issuance before service execution when compliance is unavailable", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: false, wouldBlock: true, result: "deny" })

    const result = await createFiscalDocumentFromPostedSourceAction(createFiscalDocumentInput)

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
    }))
    expect(mockCreateFiscalDocument).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it("enforces compliance module access before queueing certification submissions", async () => {
    const result = await enqueueComplianceSubmissionAction(enqueueSubmissionInput)

    expect(result).toEqual(expect.objectContaining({ success: true, status: 200 }))
    expectComplianceModuleGate({
      surface: "actions/compliance/compliance-center.actions.ts:enqueueComplianceSubmissionAction",
      permission: "compliance.submissions.retry",
      accessIntent: "write",
    })
    expect(mockEnqueueSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorId: "operator-1",
        fiscalDocumentId: "fiscal-doc-1",
      }),
    )
  })

  it("denies certification submission queueing before service execution when compliance is unavailable", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: false, wouldBlock: true, result: "deny" })

    const result = await enqueueComplianceSubmissionAction(enqueueSubmissionInput)

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
    }))
    expect(mockEnqueueSubmission).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})