"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { hasRbacPermission, requireAnyPermission, requirePermission } from "@/lib/security/rbac"
import {
  approveMasterDataImport,
  commitMasterDataImport,
  createMasterDataImportMapping,
  getMasterDataImportEvidence,
  getMasterDataOnboardingDashboard,
  getTenantMasterDataCsvTemplate,
  stageMasterDataImport,
  waiveMasterDataReadiness,
} from "@/services/onboarding/master-data-import.service"
import {
  MASTER_DATA_IMPORT_MAX_BYTES,
  MASTER_DATA_IMPORT_TARGETS,
} from "@/services/onboarding/master-data-csv"

const targetSchema = z.enum(MASTER_DATA_IMPORT_TARGETS)
const targetPermissions = {
  CUSTOMER: { read: "customers.read", write: "customers.create" },
  SUPPLIER: { read: "purchases.suppliers.read", write: "purchases.suppliers.create" },
  ITEM: { read: "inventory.items.read", write: "inventory.items.create" },
} as const

const stageSchema = z.object({
  target: targetSchema,
  sourceFilename: z.string().trim().min(1).max(255),
  sourceMimeType: z.string().trim().max(100).optional(),
  content: z.string().min(1).max(MASTER_DATA_IMPORT_MAX_BYTES),
  mappingVersion: z.number().int().positive().optional(),
})

const batchCommandSchema = z.object({
  target: targetSchema,
  batchId: z.string().trim().min(1),
  expectedApprovalDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
})

function revalidateOnboarding() {
  revalidatePath("/[locale]/dashboard/settings/data-onboarding", "page")
  revalidatePath("/[locale]/dashboard", "page")
}

async function requireTargetWrite(target: keyof typeof targetPermissions) {
  return requirePermission(targetPermissions[target].write, {
    resource: "MasterDataOnboarding",
    auditAllowed: true,
  })
}

export async function getMasterDataCsvTemplateAction(targetInput: unknown) {
  const target = targetSchema.parse(targetInput)
  const ctx = await requirePermission(targetPermissions[target].read, {
    resource: "MasterDataOnboardingTemplate",
  })
  return getTenantMasterDataCsvTemplate(ctx.orgId, target)
}

export async function createMasterDataMappingAction(input: unknown) {
  const parsed = z.object({
    target: targetSchema,
    fieldMap: z.record(z.string().trim().min(1), z.string().trim().min(1)),
  }).parse(input)
  const ctx = await requireTargetWrite(parsed.target)
  return createMasterDataImportMapping({
    organizationId: ctx.orgId,
    target: parsed.target,
    actorId: ctx.userId,
    fieldMap: parsed.fieldMap,
  })
}

export async function stageMasterDataImportAction(input: unknown) {
  const parsed = stageSchema.parse(input)
  const ctx = await requireTargetWrite(parsed.target)
  const result = await stageMasterDataImport({
    organizationId: ctx.orgId,
    actorId: ctx.userId,
    ...parsed,
  })
  revalidateOnboarding()
  return result
}

export async function approveMasterDataImportAction(input: unknown) {
  const parsed = batchCommandSchema.parse(input)
  const ctx = await requireTargetWrite(parsed.target)
  const result = await approveMasterDataImport({
    organizationId: ctx.orgId,
    actorId: ctx.userId,
    batchId: parsed.batchId,
    expectedTarget: parsed.target,
    expectedApprovalDigest: parsed.expectedApprovalDigest,
  })
  revalidateOnboarding()
  return result
}

export async function commitMasterDataImportAction(input: unknown) {
  const parsed = batchCommandSchema.parse(input)
  const ctx = await requireTargetWrite(parsed.target)
  const result = await commitMasterDataImport({
    organizationId: ctx.orgId,
    actorId: ctx.userId,
    batchId: parsed.batchId,
    expectedTarget: parsed.target,
    expectedApprovalDigest: parsed.expectedApprovalDigest,
  })
  revalidateOnboarding()
  return result
}

export async function waiveMasterDataReadinessAction(input: unknown) {
  const parsed = z.object({
    target: targetSchema,
    reason: z.string().trim().min(10).max(500),
  }).parse(input)
  const ctx = await requireTargetWrite(parsed.target)
  const result = await waiveMasterDataReadiness({
    organizationId: ctx.orgId,
    actorId: ctx.userId,
    target: parsed.target,
    reason: parsed.reason,
  })
  revalidateOnboarding()
  return result
}

export async function getMasterDataOnboardingDashboardAction() {
  const ctx = await requireAnyPermission(
    Object.values(targetPermissions).map((permission) => permission.read),
    { resource: "MasterDataOnboarding" },
  )
  const allowedTargets = MASTER_DATA_IMPORT_TARGETS.filter((target) =>
    hasRbacPermission(ctx.permissions, targetPermissions[target].read),
  )
  return getMasterDataOnboardingDashboard(ctx.orgId, allowedTargets)
}

export async function getMasterDataImportEvidenceAction(input: unknown) {
  const parsed = z.object({ target: targetSchema, batchId: z.string().trim().min(1) }).parse(input)
  const ctx = await requirePermission(targetPermissions[parsed.target].read, {
    resource: "MasterDataOnboardingEvidence",
    resourceId: parsed.batchId,
  })
  return getMasterDataImportEvidence(ctx.orgId, parsed.batchId, parsed.target)
}
