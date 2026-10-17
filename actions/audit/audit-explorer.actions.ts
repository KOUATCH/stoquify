"use server"
import { requireRbacContext } from "@/lib/security/rbac"
import { readAuditExplorer } from "@/services/audit/audit-explorer.service"
import type { AuditExplorerResult } from "@/services/audit/audit-explorer-contracts"
import { ConflictError, ForbiddenError } from "@/services/_shared/action-errors"

export async function readAuditExplorerAction(input: unknown): Promise<{ success: true; data: AuditExplorerResult } | { success: false; reason: "restricted" | "snapshot" | "unavailable" }> {
  try {
    const ctx = await requireRbacContext()
    return { success: true, data: await readAuditExplorer(ctx, input) }
  } catch (error) {
    return { success: false, reason: error instanceof ForbiddenError ? "restricted" : error instanceof ConflictError ? "snapshot" : "unavailable" }
  }
}
