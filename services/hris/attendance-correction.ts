import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors"

export const correctionEvidenceSchema = z.object({
  entryId: z.string().min(1),
  baseHash: z.string().min(8),
  before: z.object({ workedMinutes: z.number().int().nonnegative(), absenceMinutes: z.number().int().nonnegative() }),
  after: z.object({ workedMinutes: z.number().int().nonnegative(), absenceMinutes: z.number().int().nonnegative() }),
})

export function attendanceHash(value: unknown) {
  return "sha256:" + createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

export function attendanceMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export async function lockOperationalEmployeeInTx(tx: Prisma.TransactionClient, organizationId: string, employeeId: string) {
  const rows = await tx.$queryRaw<Array<{ isolationLevel: string }>>(Prisma.sql`SELECT current_setting('transaction_isolation') AS "isolationLevel"`)
  if (rows[0]?.isolationLevel !== "read committed") throw new ConflictError("Attendance changes require Read Committed isolation.")
  const key = JSON.stringify(["hris-operational-employee-v1", organizationId, employeeId])
  await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`)
}

type Entry = { id: string; sourceHash: string; workDate: Date; scheduledMinutes: number; workedMinutes: number; absenceMinutes: number; overtimeMinutes: number }
type Correction = { id: string; type: string; status: string; metadata: unknown; sourceHash: string; approvalEvidenceHash: string | null; reviewedAt: Date | null }

export function correctedAttendanceEntry<T extends Entry>(entry: T, requests: Correction[]) {
  let current = { ...entry }
  let currentHash = attendanceHash([entry.id, entry.sourceHash, entry.workDate.toISOString(), entry.scheduledMinutes, entry.workedMinutes, entry.absenceMinutes, entry.overtimeMinutes])
  const appliedHashes: string[] = []
  const approved = requests.filter(item => item.type === "ATTENDANCE_CORRECTION" && item.status === "APPROVED")
    .sort((a, b) => (a.reviewedAt?.getTime() ?? 0) - (b.reviewedAt?.getTime() ?? 0) || a.id.localeCompare(b.id))
  for (const request of approved) {
    const parsed = correctionEvidenceSchema.safeParse(attendanceMetadata(request.metadata).correction)
    if (!parsed.success) throw new BusinessRuleError("HRIS_CORRECTION_EVIDENCE_INCOMPLETE: Re-submit legacy corrections with a reviewed target and values.")
    const correction = parsed.data
    if (correction.entryId !== entry.id) continue
    if (correction.baseHash !== currentHash || !request.approvalEvidenceHash
        || correction.before.workedMinutes !== current.workedMinutes || correction.before.absenceMinutes !== current.absenceMinutes) {
      throw new ConflictError("HRIS_CORRECTION_STALE: The corrected time changed; request a fresh review.")
    }
    current = { ...current, ...correction.after }
    currentHash = attendanceHash([currentHash, request.id, request.sourceHash, request.approvalEvidenceHash, correction.after])
    appliedHashes.push(attendanceHash([request.id, request.sourceHash, request.approvalEvidenceHash]))
  }
  return { entry: current, sourceHash: currentHash, appliedHashes }
}

export async function loadCorrectableAttendance(tx: Prisma.TransactionClient, scope: { organizationId: string; employeeId: string }, entryId: string) {
  const entry = await tx.hrisTimeEntry.findFirst({ where: { id: entryId, ...scope, status: "VALIDATED" } })
  if (!entry) throw new BusinessRuleError("HRIS_CORRECTION_TARGET_MISSING: Select a validated entry belonging to this employee.")
  const requests = await tx.hrisTimeRequest.findMany({ where: { ...scope, type: "ATTENDANCE_CORRECTION", status: "APPROVED" } })
  return correctedAttendanceEntry(entry, requests)
}

export async function assertOperationalCorrectionsCertified(
  tx: Prisma.TransactionClient,
  scope: { organizationId: string; employeeId: string },
  period: { periodStart: Date; periodEnd: Date },
  snapshotMetadata: unknown,
) {
  const requests = await tx.hrisTimeRequest.findMany({ where: { ...scope,
    type: "ATTENDANCE_CORRECTION", status: { in: ["REQUESTED", "APPROVED"] },
    periodStart: { lte: period.periodEnd }, periodEnd: { gte: period.periodStart },
  } })
  const payload = attendanceMetadata(attendanceMetadata(snapshotMetadata).sourcePayload)
  const hashes = attendanceMetadata(payload.evidence).approvedCorrectionHashes
  const retained = new Set(Array.isArray(hashes) ? hashes : [])
  if (requests.some(item => item.status === "REQUESTED" || !item.approvalEvidenceHash
      || !retained.has(attendanceHash([item.id, item.sourceHash, item.approvalEvidenceHash])))) {
    throw new BusinessRuleError("HRIS_ATTENDANCE_CORRECTION_NOT_CERTIFIED: Resolve and certify the current attendance corrections before calculating payroll.")
  }
}
