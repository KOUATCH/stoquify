import { createHash } from "node:crypto"
import type { WorkflowAssuranceIncident } from "@prisma/client"

/** A compare-and-set token, never an authorization credential or occurrence ID. */
export function assuranceAssignmentRevision(incident: Pick<WorkflowAssuranceIncident,
  "id" | "organizationId" | "sourceHash" | "status" | "ownerId" | "assignedRole" | "dueAt" | "updatedAt" | "occurrenceCount">) {
  return createHash("sha256").update(JSON.stringify([
    "assurance-assignment-v1", incident.organizationId, incident.id, incident.sourceHash,
    incident.status, incident.ownerId, incident.assignedRole, incident.dueAt?.toISOString() ?? null,
    incident.updatedAt.toISOString(), incident.occurrenceCount,
  ])).digest("hex")
}
