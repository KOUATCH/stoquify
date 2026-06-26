"use server"

import { revalidatePath } from "next/cache"

import {
  approveAndPostPayrollRun,
  calculatePayrollRun,
  getPayrollWorkbenchData,
  preparePayrollDeclarations,
  releasePayrollPaymentBatch,
  type PayrollWorkbenchData,
} from "@/services/payroll/payroll-control.service"
import {
  recordPayrollDeclarationEvidence,
  recordPayrollDeclarationEvidenceInputSchema,
} from "@/services/payroll/declaration-lifecycle.service"
import {
  approveAndPostPayrollRunInputSchema,
  calculatePayrollRunInputSchema,
  preparePayrollDeclarationsInputSchema,
  releasePayrollPaymentBatchInputSchema,
} from "@/services/payroll/payroll-control.schemas"
import { protect } from "@/services/_shared/protect"

export type { PayrollWorkbenchData }

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input) ? input : {}
}

function revalidatePayrollPaths() {
  revalidatePath("/dashboard/payroll", "page")
  revalidatePath("/dashboard/presence", "page")
  revalidatePath("/[locale]/dashboard/payroll", "page")
  revalidatePath("/[locale]/dashboard/presence", "page")
}

const getWorkbench = protect<unknown, PayrollWorkbenchData>(
  {
    permission: "payroll.read",
    auditResource: "PayrollWorkbench",
    auditAllowed: false,
    module: {
      moduleSlug: "payroll",
      surfaceType: "page",
      surface: "/dashboard/payroll",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const raw = asRecord(input) as { limit?: unknown }
    const limit = typeof raw.limit === "number" ? raw.limit : undefined
    return getPayrollWorkbenchData({
      organizationId: ctx.orgId,
      limit,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
  },
)

export async function getPayrollWorkbenchAction(input: unknown = {}) {
  return getWorkbench(input)
}

const calculateRun = protect<unknown, Awaited<ReturnType<typeof calculatePayrollRun>>>(
  {
    permission: "payroll.runs.calculate",
    auditResource: "PayrollRun",
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.runs.calculate",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = calculatePayrollRunInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      preparedById: ctx.userId,
    })
    const result = await calculatePayrollRun(parsed)
    revalidatePayrollPaths()
    return result
  },
)

export async function calculatePayrollRunAction(input: unknown) {
  return calculateRun(input)
}

const approveRun = protect<unknown, Awaited<ReturnType<typeof approveAndPostPayrollRun>>>(
  {
    permission: "payroll.runs.approve",
    auditResource: "PayrollRun",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.runs.approve",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = approveAndPostPayrollRunInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      approvedById: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: new Date(),
    })
    const result = await approveAndPostPayrollRun(parsed)
    revalidatePayrollPaths()
    return result
  },
)

export async function approveAndPostPayrollRunAction(input: unknown) {
  return approveRun(input)
}

const releasePaymentBatch = protect<unknown, Awaited<ReturnType<typeof releasePayrollPaymentBatch>>>(
  {
    permission: "payroll.payments.release",
    auditResource: "PayrollPaymentBatch",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.payments.release",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = releasePayrollPaymentBatchInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      approvedById: ctx.userId,
      releasedById: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: new Date(),
    })
    const result = await releasePayrollPaymentBatch(parsed)
    revalidatePayrollPaths()
    return result
  },
)

export async function releasePayrollPaymentBatchAction(input: unknown) {
  return releasePaymentBatch(input)
}

const prepareDeclarations = protect<unknown, Awaited<ReturnType<typeof preparePayrollDeclarations>>>(
  {
    permission: "payroll.declarations.prepare",
    auditResource: "PayrollDeclaration",
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.declarations.prepare",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = preparePayrollDeclarationsInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      preparedById: ctx.userId,
    })
    const result = await preparePayrollDeclarations(parsed)
    revalidatePayrollPaths()
    return result
  },
)

export async function preparePayrollDeclarationsAction(input: unknown) {
  return prepareDeclarations(input)
}
const recordDeclarationEvidence = protect<unknown, Awaited<ReturnType<typeof recordPayrollDeclarationEvidence>>>(
  {
    permission: "payroll.declarations.manage",
    auditResource: "PayrollDeclaration",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.declarations.manage",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = recordPayrollDeclarationEvidenceInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: new Date(),
    })
    const result = await recordPayrollDeclarationEvidence(parsed)
    revalidatePayrollPaths()
    return result
  },
)

export async function recordPayrollDeclarationEvidenceAction(input: unknown) {
  return recordDeclarationEvidence(input)
}