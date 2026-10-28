"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  enqueueComplianceSubmission,
  getComplianceCenterKernelSnapshot,
  getEInvoicingMetadataReadiness,
  createFiscalDocumentFromPostedSource,
  type ComplianceCenterKernelSnapshot,
} from "@/services/compliance"
import {
  complianceCenterQuerySchema,
  complianceMetadataResolutionSchema,
  createFiscalDocumentFromPostedSourceSchema,
  enqueueComplianceSubmissionSchema,
} from "@/services/compliance/fiscal-document.schemas"

export type { ComplianceCenterKernelSnapshot }

const COMPLIANCE_MODULE_READ = {
  moduleSlug: "compliance" as const,
  surfaceType: "action" as const,
  accessIntent: "read" as const,
  mode: "enforce" as const,
  audit: true,
}

const COMPLIANCE_MODULE_WRITE = {
  ...COMPLIANCE_MODULE_READ,
  accessIntent: "write" as const,
}

function revalidateCompliancePaths() {
  revalidatePath("/dashboard/compliance", "page")
  revalidatePath("/[locale]/dashboard/compliance", "page")
}

const getKernelSnapshot = protect<unknown, ComplianceCenterKernelSnapshot>(
  {
    permission: "compliance.documents.read",
    auditResource: "ComplianceCenter",
    auditAllowed: false,
    module: {
      ...COMPLIANCE_MODULE_READ,
      surface: "actions/compliance/compliance-center.actions.ts:getComplianceCenterKernelSnapshotAction",
    },
  },
  async (input, ctx) => {
    const parsed = complianceCenterQuerySchema.parse(input ?? {})
    return getComplianceCenterKernelSnapshot({
      organizationId: ctx.orgId,
      countryCode: parsed.countryCode,
      limit: parsed.limit,
    })
  },
)

export async function getComplianceCenterKernelSnapshotAction(input: unknown = {}) {
  return getKernelSnapshot(input)
}

const resolveMetadata = protect<unknown, unknown>(
  {
    permission: "compliance.metadata.read",
    auditResource: "ComplianceCountryPack",
    auditAllowed: false,
    module: {
      ...COMPLIANCE_MODULE_READ,
      surface: "actions/compliance/compliance-center.actions.ts:resolveEInvoicingMetadataAction",
    },
  },
  async (input) => {
    const parsed = complianceMetadataResolutionSchema.parse(input ?? {})
    return getEInvoicingMetadataReadiness(parsed)
  },
)

export async function resolveEInvoicingMetadataAction(input: unknown) {
  return resolveMetadata(input)
}

const createFiscalDocument = protect<unknown, unknown>(
  {
    permission: "compliance.documents.issue",
    auditResource: "FiscalDocument",
    freshAuth: true,
    module: {
      ...COMPLIANCE_MODULE_WRITE,
      surface: "actions/compliance/compliance-center.actions.ts:createFiscalDocumentFromPostedSourceAction",
    },
  },
  async (input, ctx) => {
    const parsed = createFiscalDocumentFromPostedSourceSchema.parse({
      ...(input && typeof input === "object" ? input : {}),
      organizationId: ctx.orgId,
      createdById: ctx.userId,
    })
    const document = await createFiscalDocumentFromPostedSource(parsed)
    revalidateCompliancePaths()
    return document
  },
)

export async function createFiscalDocumentFromPostedSourceAction(input: unknown) {
  return createFiscalDocument(input)
}

const enqueueSubmission = protect<unknown, unknown>(
  {
    permission: "compliance.submissions.retry",
    auditResource: "ComplianceSubmission",
    freshAuth: true,
    module: {
      ...COMPLIANCE_MODULE_WRITE,
      surface: "actions/compliance/compliance-center.actions.ts:enqueueComplianceSubmissionAction",
    },
  },
  async (input, ctx) => {
    const parsed = enqueueComplianceSubmissionSchema.parse({
      ...(input && typeof input === "object" ? input : {}),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
    const submission = await enqueueComplianceSubmission(parsed)
    revalidateCompliancePaths()
    return submission
  },
)

export async function enqueueComplianceSubmissionAction(input: unknown) {
  return enqueueSubmission(input)
}
