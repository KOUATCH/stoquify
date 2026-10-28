import "server-only"

import { db } from "@/prisma/db"
import {
  auditExportSafetyDecision,
  type ExportSafetyDecision,
} from "@/services/security/export-safety.service"

export async function auditSupplierExportDecision(decision: ExportSafetyDecision) {
  return db.$transaction(async (tx) => {
    return auditExportSafetyDecision(tx, decision)
  })
}
