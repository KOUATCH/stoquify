import { PayrollContractStatus } from "@prisma/client"

import { ForbiddenError } from "@/services/_shared/action-errors"
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"

import {
  approveHrisContractDocumentEvidence,
  evaluateHrisContractDocumentAccess,
  requestHrisContractDocumentEvidence,
} from "../document-evidence.service"

jest.mock("@/services/hris/org.service", () => ({
  resolveHrisPeopleAccessScope: jest.fn(),
}))

jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual("@/services/events/business-event.service")
  return {
    ...actual,
    recordBusinessEventInTx: jest.fn(),
    markBusinessEventAppliedInTx: jest.fn(),
  }
})

const mockResolveScope = resolveHrisPeopleAccessScope as jest.Mock
const mockRecordEvent = recordBusinessEventInTx as jest.Mock
const mockMarkApplied = markBusinessEventAppliedInTx as jest.Mock

const accessScope = {
  organizationId: "org-1",
  authority: {
    kind: "TENANT_HRIS_ADMIN",
    label: "Tenant HRIS administration",
    basis: "HRIS_PERMISSION",
    reportingLineAuthority: false,
    effectiveDating: "NOT_APPLICABLE",
    historicalAccessSupported: false,
    delegationSupported: false,
  },
  managedLocations: [],
  employeeIds: null,
  limitations: [],
}

function contract(overrides: Record<string, unknown> = {}) {
  return {
    id: "contract-1",
    employeeId: "emp-1",
    contractNumber: "CTR-001",
    status: PayrollContractStatus.DRAFT,
    signedDocumentHash: null,
    activatedBusinessEventId: null,
    metadata: null,
    ...overrides,
  }
}

function txWith(row: ReturnType<typeof contract>) {
  return {
    payrollContract: {
      findFirst: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue(row),
    },
    auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
  }
}

function rootClient(tx: ReturnType<typeof txWith>) {
  return {
    $transaction: jest.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(tx)),
    payrollContract: tx.payrollContract,
    auditLog: tx.auditLog,
  }
}

function pendingMetadata() {
  return {
    hrisDocumentEvidence: {
      pending: {
        requestId: "event-request",
        capturedById: "maker-1",
        capturedAt: "2026-07-15T00:00:00.000Z",
        artifactHash: "sha256:signed-artifact-hash",
        malwareScanEvidenceHash: "sha256:scan-evidence-hash",
        malwareScanProvider: "Defender",
        malwareScannedAt: "2026-07-15T00:00:00.000Z",
        signedAt: "2026-07-14T00:00:00.000Z",
        retentionPolicyCode: "CM_EMPLOYMENT_10Y",
        retentionBasis: "Employment dispute and statutory retention",
        retainUntil: "2036-07-14T00:00:00.000Z",
        legalHold: false,
        legalHoldReasonHash: null,
      },
      current: null,
    },
  }
}

describe("HRIS contract document evidence", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockResolveScope.mockResolvedValue(accessScope)
    mockRecordEvent.mockResolvedValue({ event: { id: "event-1" }, created: true })
    mockMarkApplied.mockResolvedValue({ id: "event-1", status: "APPLIED" })
  })

  it("stages scan and retention proof without making the document payroll-eligible", async () => {
    const tx = txWith(contract())
    const client = rootClient(tx)

    const result = await requestHrisContractDocumentEvidence({
      organizationId: "org-1",
      actorId: "maker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      contractId: "contract-1",
      artifactHash: "sha256:signed-artifact-hash",
      malwareScanEvidenceHash: "sha256:scan-evidence-hash",
      malwareScanProvider: "Defender",
      malwareScannedAt: "2026-07-15T00:00:00.000Z",
      signedAt: "2026-07-14T00:00:00.000Z",
      retentionPolicyCode: "CM_EMPLOYMENT_10Y",
      retentionBasis: "Employment dispute and statutory retention",
      retainUntil: "2036-07-14T00:00:00.000Z",
    }, client as never)

    expect(result).toEqual({ contractId: "contract-1", status: "PENDING_REVIEW", requestId: "event-1" })
    expect(tx.payrollContract.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ signedDocumentHash: expect.anything() }),
    }))
    expect(mockRecordEvent).toHaveBeenCalledWith(tx, expect.objectContaining({
      eventType: "hris.contract.document.requested",
      documentHash: "sha256:signed-artifact-hash",
    }))
  })

  it("publishes the signed hash only after independent evidence approval", async () => {
    const tx = txWith(contract({ metadata: pendingMetadata() }))
    const client = rootClient(tx)

    const result = await approveHrisContractDocumentEvidence({
      organizationId: "org-1",
      actorId: "checker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      contractId: "contract-1",
      decisionReason: "Scan, signature, and retention proof verified",
      approvalEvidenceHash: "sha256:approval-evidence-hash",
    }, client as never)

    expect(result).toMatchObject({ status: "APPROVED", documentEvidencePresent: true })
    expect(tx.payrollContract.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ signedDocumentHash: "sha256:signed-artifact-hash" }),
    }))
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "HRIS_CONTRACT_DOCUMENT_EVIDENCE_APPROVED" }),
    }))
  })

  it("prevents the evidence capturer from approving their own upload proof", async () => {
    const tx = txWith(contract({ metadata: pendingMetadata() }))

    await expect(approveHrisContractDocumentEvidence({
      organizationId: "org-1",
      actorId: "maker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      contractId: "contract-1",
      decisionReason: "Self approval attempt",
      approvalEvidenceHash: "sha256:approval-evidence-hash",
    }, rootClient(tx) as never)).rejects.toBeInstanceOf(ForbiddenError)

    expect(tx.payrollContract.update).not.toHaveBeenCalled()
  })

  it("denies raw download without emitting a URL, token, object key, or artifact hash", async () => {
    const client = txWith(contract({
      signedDocumentHash: "sha256:signed-artifact-hash",
      metadata: pendingMetadata(),
    }))

    const result = await evaluateHrisContractDocumentAccess({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-1",
      contractId: "contract-1",
      purpose: "RAW_DOWNLOAD",
    }, client as never)

    expect(result.decision).toEqual({ allowed: false, reasonCode: "RAW_DOCUMENT_ACCESS_NOT_IMPLEMENTED" })
    expect(result.rawAccess).toMatchObject({ available: false, url: null, token: null, objectKey: null })
    expect(JSON.stringify(result)).not.toContain("sha256:signed-artifact-hash")
    expect(client.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "HRIS_CONTRACT_DOCUMENT_RAW_ACCESS_DENIED" }),
    }))
  })

  it("returns a redacted export without evidence hashes or actor identities", async () => {
    const pending = pendingMetadata().hrisDocumentEvidence.pending
    const client = txWith(contract({
      signedDocumentHash: pending.artifactHash,
      metadata: {
        hrisDocumentEvidence: {
          pending: null,
          current: {
            ...pending,
            status: "APPROVED",
            approvedById: "checker-1",
            approvedAt: "2026-07-15T01:00:00.000Z",
            approvalEvidenceHash: "sha256:approval-evidence-hash",
            decisionReasonHash: "sha256:decision-reason-hash",
            approvalBusinessEventId: "event-approved",
          },
        },
      },
    }))

    const result = await evaluateHrisContractDocumentAccess({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      contractId: "contract-1",
      purpose: "REDACTED_EXPORT",
    }, client as never)

    expect(client.payrollContract.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "contract-1", organizationId: "org-1", employeeId: "emp-1", deletedAt: null,
      }),
    }))
    const serialized = JSON.stringify(result)
    expect(result.exportPolicy).toBe("HASHES_AND_ACTOR_DETAILS_EXCLUDED")
    expect(serialized).not.toMatch(/artifactHash|approvalEvidenceHash|malwareScanEvidenceHash|capturedById|approvedById/)
    expect(serialized).not.toContain("sha256:")
    expect(client.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "HRIS_CONTRACT_DOCUMENT_REDACTED_EXPORT",
        changes: expect.objectContaining({ purpose: "REDACTED_EXPORT", allowed: true, rawDocumentIncluded: false }),
      }),
    }))
  })

  it("fails closed before document lookup when employee scope is denied", async () => {
    mockResolveScope.mockRejectedValue(new ForbiddenError("Outside scope"))
    const client = txWith(contract())

    await expect(evaluateHrisContractDocumentAccess({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-2",
      contractId: "contract-2",
      purpose: "METADATA_READ",
    }, client as never)).rejects.toBeInstanceOf(ForbiddenError)

    expect(client.payrollContract.findFirst).not.toHaveBeenCalled()
  })

  it("denies callers without HRIS document authority before scope or document lookup", async () => {
    const client = txWith(contract())

    await expect(evaluateHrisContractDocumentAccess({
      organizationId: "org-1",
      actorId: "unauthorized-1",
      actorPermissions: [],
      employeeId: "emp-1",
      contractId: "contract-1",
      purpose: "METADATA_READ",
    }, client as never)).rejects.toBeInstanceOf(ForbiddenError)

    expect(mockResolveScope).not.toHaveBeenCalled()
    expect(client.payrollContract.findFirst).not.toHaveBeenCalled()
    expect(client.auditLog.create).not.toHaveBeenCalled()
  })
})
