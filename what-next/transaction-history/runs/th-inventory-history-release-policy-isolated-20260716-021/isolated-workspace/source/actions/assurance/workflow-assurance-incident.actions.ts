"use server"

import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import {
  acknowledgeWorkflowAssuranceIncident,
  approveWorkflowAssuranceWaiver,
  assignWorkflowAssuranceIncident,
  reopenWorkflowAssuranceIncident,
  requestWorkflowAssuranceWaiver,
  resolveWorkflowAssuranceIncident,
  suppressWorkflowAssuranceIncident,
} from "@/services/assurance/assurance-incident.service"
import type {
  WorkflowAssuranceIncidentDto,
  WorkflowAssuranceWaiverDto,
} from "@/services/assurance/assurance-incident-contracts"

const idSchema = z.string().min(1)
const optionalDateSchema = z.string().datetime().optional().transform((value) => (value ? new Date(value) : undefined))
const requiredDateSchema = z.string().datetime().transform((value) => new Date(value))

const incidentTransitionSchema = z.object({
  incidentId: idSchema,
  note: z.string().min(3).max(1200).optional(),
})

const assignIncidentSchema = z.object({
  incidentId: idSchema,
  ownerId: idSchema,
  assignedRole: z.string().min(2).max(80).optional(),
  dueAt: optionalDateSchema,
})

const suppressIncidentSchema = z.object({
  incidentId: idSchema,
  reason: z.string().min(8).max(1200),
  suppressedUntil: optionalDateSchema,
})

const requestWaiverSchema = z.object({
  incidentId: idSchema,
  reason: z.string().min(8).max(1200),
  evidenceHash: z.string().min(12).max(160),
  expiresAt: requiredDateSchema,
})

const approveWaiverSchema = z.object({
  waiverId: idSchema,
  note: z.string().min(3).max(1200).optional(),
})

export type WorkflowAssuranceIncidentTransitionInput = z.input<typeof incidentTransitionSchema>
export type AssignWorkflowAssuranceIncidentActionInput = z.input<typeof assignIncidentSchema>
export type SuppressWorkflowAssuranceIncidentActionInput = z.input<typeof suppressIncidentSchema>
export type RequestWorkflowAssuranceWaiverActionInput = z.input<typeof requestWaiverSchema>
export type ApproveWorkflowAssuranceWaiverActionInput = z.input<typeof approveWaiverSchema>

const acknowledgeIncident = protect<WorkflowAssuranceIncidentTransitionInput, WorkflowAssuranceIncidentDto>(
  {
    permission: "controls.audit.read",
    auditResource: "WorkflowAssuranceIncident",
    auditAllowed: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = incidentTransitionSchema.parse(input)
    return acknowledgeWorkflowAssuranceIncident({
      ...parsed,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
  },
)

const assignIncident = protect<AssignWorkflowAssuranceIncidentActionInput, WorkflowAssuranceIncidentDto>(
  {
    permission: "controls.manage",
    auditResource: "WorkflowAssuranceIncident",
    auditAllowed: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = assignIncidentSchema.parse(input)
    return assignWorkflowAssuranceIncident({
      ...parsed,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
  },
)

const resolveIncident = protect<WorkflowAssuranceIncidentTransitionInput, WorkflowAssuranceIncidentDto>(
  {
    permission: "controls.manage",
    auditResource: "WorkflowAssuranceIncident",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = incidentTransitionSchema.parse(input)
    return resolveWorkflowAssuranceIncident({
      ...parsed,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
  },
)

const suppressIncident = protect<SuppressWorkflowAssuranceIncidentActionInput, WorkflowAssuranceIncidentDto>(
  {
    permission: "controls.manage",
    auditResource: "WorkflowAssuranceIncident",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = suppressIncidentSchema.parse(input)
    return suppressWorkflowAssuranceIncident({
      ...parsed,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
  },
)

const reopenIncident = protect<WorkflowAssuranceIncidentTransitionInput, WorkflowAssuranceIncidentDto>(
  {
    permission: "controls.manage",
    auditResource: "WorkflowAssuranceIncident",
    auditAllowed: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = incidentTransitionSchema.parse(input)
    return reopenWorkflowAssuranceIncident({
      ...parsed,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
  },
)

const requestWaiver = protect<RequestWorkflowAssuranceWaiverActionInput, WorkflowAssuranceWaiverDto>(
  {
    permission: "controls.manage",
    auditResource: "WorkflowAssuranceWaiver",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = requestWaiverSchema.parse(input)
    return requestWorkflowAssuranceWaiver({
      ...parsed,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
  },
)

const approveWaiver = protect<ApproveWorkflowAssuranceWaiverActionInput, WorkflowAssuranceWaiverDto>(
  {
    permission: "controls.manage",
    auditResource: "WorkflowAssuranceWaiver",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = approveWaiverSchema.parse(input)
    return approveWorkflowAssuranceWaiver({
      ...parsed,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    })
  },
)

export async function acknowledgeWorkflowAssuranceIncidentAction(input: WorkflowAssuranceIncidentTransitionInput) {
  return acknowledgeIncident(input)
}

export async function assignWorkflowAssuranceIncidentAction(input: AssignWorkflowAssuranceIncidentActionInput) {
  return assignIncident(input)
}

export async function resolveWorkflowAssuranceIncidentAction(input: WorkflowAssuranceIncidentTransitionInput) {
  return resolveIncident(input)
}

export async function suppressWorkflowAssuranceIncidentAction(input: SuppressWorkflowAssuranceIncidentActionInput) {
  return suppressIncident(input)
}

export async function reopenWorkflowAssuranceIncidentAction(input: WorkflowAssuranceIncidentTransitionInput) {
  return reopenIncident(input)
}

export async function requestWorkflowAssuranceWaiverAction(input: RequestWorkflowAssuranceWaiverActionInput) {
  return requestWaiver(input)
}

export async function approveWorkflowAssuranceWaiverAction(input: ApproveWorkflowAssuranceWaiverActionInput) {
  return approveWaiver(input)
}
