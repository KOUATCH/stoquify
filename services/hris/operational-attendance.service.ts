import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { buildOperationalAttendanceCertification } from "./operational-time.service"
import { attendanceMetadata, lockOperationalEmployeeInTx } from "./attendance-correction"
import { hrisTimeLeaveAttendanceCertificationSchema } from "./time-leave.contract"
import { certifyHrisTimeLeaveAttendance, correctCertifiedHrisTimeLeaveAttendance, snapshotReadModel, HRIS_TIME_LEAVE_ATTENDANCE_OWNERSHIP } from "./time-leave.service"
import { resolveHrisPeopleAccessScope } from "./org.service"

type Input = Parameters<typeof buildOperationalAttendanceCertification>[0]
type Client = typeof db | Prisma.TransactionClient

/** The retained snapshot chain is the sole source-revision owner. */
export async function certifyOperationalAttendance(input: Input, client: Client = db) {
  const operation = async (tx: Prisma.TransactionClient) => {
    await lockOperationalEmployeeInTx(tx, input.organizationId, input.employeeId)
    const draft = await buildOperationalAttendanceCertification(input, tx)
    const current = await tx.payrollAttendanceSnapshot.findFirst({ where: {
      organizationId: input.organizationId, employeeId: input.employeeId, payrollPeriodId: input.payrollPeriodId, status: "FROZEN",
    }, orderBy: [{ frozenAt: "desc" }, { id: "desc" }] })
    const actor = { organizationId: input.organizationId, actorId: input.actorId, actorPermissions: input.actorPermissions }
    if (!current) return certifyHrisTimeLeaveAttendance({ ...draft, ...actor }, tx)

    const previous = hrisTimeLeaveAttendanceCertificationSchema.safeParse(attendanceMetadata(current.metadata).sourcePayload)
    if (!previous.success) throw new BusinessRuleError("HRIS_TIME_LEGACY_SNAPSHOT: Review legacy evidence through the explicit correction workflow.")
    const source = (value: typeof draft.sourcePayload | typeof previous.data) => ({ policy: value.policy, evidence: value.evidence, totals: value.totals })
    if (hashBusinessPayload(source(previous.data)) === hashBusinessPayload(source(draft.sourcePayload))) {
      if (hashBusinessPayload(previous.data.approval) !== hashBusinessPayload(draft.sourcePayload.approval)) {
        throw new ConflictError("HRIS_TIME_REPLAY_APPROVAL_CHANGED: Retained review evidence differs from this retry.")
      }
      const scope = await resolveHrisPeopleAccessScope({ ...actor, employeeId: input.employeeId }, tx)
      return { organizationId: input.organizationId, employeeId: input.employeeId,
        attendanceSnapshot: snapshotReadModel(current), created: false, businessEventId: null,
        accessScope: { organizationId: scope.organizationId, authority: scope.authority, managedLocationCount: scope.managedLocations.length },
        dataOwnership: HRIS_TIME_LEAVE_ATTENDANCE_OWNERSHIP }
    }
    if (previous.data.approval.approvalEvidenceHash === draft.sourcePayload.approval.approvalEvidenceHash) {
      throw new ConflictError("HRIS_TIME_FRESH_APPROVAL_REQUIRED: Changed attendance inputs require a fresh independent review.")
    }
    const revision = previous.data.sourceRevision + 1
    return correctCertifiedHrisTimeLeaveAttendance({ ...draft, ...actor,
      sourceRevision: revision, originalAttendanceSnapshotId: current.id,
      correctionReason: "Approved operational attendance source revision",
      correctionEvidenceHash: "sha256:" + hashBusinessPayload(source(draft.sourcePayload)),
      idempotencyKey: `operational-attendance:${input.employeeId}:${input.payrollPeriodId}:${revision}`,
    }, tx)
  }
  return "$transaction" in client ? client.$transaction(operation) : operation(client)
}
