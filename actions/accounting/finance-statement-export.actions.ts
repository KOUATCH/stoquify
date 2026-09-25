"use server"

import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import {
  enqueueFinanceStatementExport,
  getFinanceStatementExportJobStatus,
} from "@/services/accounting/finance-statement-export.service"
import { getFinanceStatementExportOperationsSnapshot } from "@/services/accounting/finance-statement-export-operations.service"
import { financeStatementExportManifestSchema } from "@/components/DataTableComponents/finance-accounting-contracts"

const enqueueSchema = z.object({ manifest: financeStatementExportManifestSchema }).strict()
const statusSchema = z.object({ jobId: z.string().min(1).max(150) }).strict()

const enqueueProtected = protect<unknown, unknown>(
  {
    permission: "accounting.exports.create",
    auditResource: "FinanceStatementExportJob",
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "accounting",
      surface: "accounting.statement.export",
      accessIntent: "export",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = enqueueSchema.parse(input)
    return enqueueFinanceStatementExport({
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: ctx.freshAuth?.lastAuthAt ?? null,
      manifest: parsed.manifest,
    })
  },
)

export async function enqueueFinanceStatementExportAction(input: unknown) {
  return enqueueProtected(input)
}

const statusProtected = protect<unknown, unknown>(
  {
    permission: "accounting.reports.read",
    auditResource: "FinanceStatementExportJobStatus",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "accounting",
      surface: "accounting.statement.export",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = statusSchema.parse(input)
    return getFinanceStatementExportJobStatus({ organizationId: ctx.orgId, jobId: parsed.jobId })
  },
)

export async function getFinanceStatementExportJobStatusAction(input: unknown) {
  return statusProtected(input)
}

const operationsProtected = protect<unknown, unknown>(
  {
    permission: "accounting.reports.read",
    auditResource: "FinanceStatementExportOperations",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "accounting",
      surface: "accounting.statement.export.operations",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (_input, ctx) => getFinanceStatementExportOperationsSnapshot({ organizationId: ctx.orgId }),
)

export async function getFinanceStatementExportOperationsSnapshotAction(input: unknown) {
  return operationsProtected(input)
}
