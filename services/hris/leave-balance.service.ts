import "server-only"

import { createHash } from "node:crypto"

import { Prisma } from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"

type Client = typeof db | Prisma.TransactionClient

export const postHrisLeaveBalanceEntryInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  employeeId: z.string().trim().min(1),
  leavePolicyId: z.string().trim().min(1),
  deltaMinutes: z.number().int().refine((value) => value !== 0),
  effectiveAt: z.coerce.date(),
  entryType: z.enum([
    "OPENING_BALANCE",
    "ACCRUAL",
    "CARRY_OVER",
    "MANUAL_ADJUSTMENT",
    "CORRECTION",
  ]),
  sourceType: z.string().trim().min(1).max(80),
  sourceId: z.string().trim().min(1).max(160),
  sourceEvidenceHash: z.string().trim().min(8).max(256),
  idempotencyKey: z.string().trim().min(8).max(160),
})

function hash(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`
}

export async function postHrisLeaveBalanceEntry(
  input: z.input<typeof postHrisLeaveBalanceEntryInputSchema>,
  client: Client = db,
) {
  const parsed = postHrisLeaveBalanceEntryInputSchema.parse(input)
  if (!hasAnyRbacPermission(parsed.actorPermissions, ["hris.people.manage"])) {
    throw new ForbiddenError("Missing permission for leave balance posting.")
  }
  await resolveHrisPeopleAccessScope({
    ...parsed,
    limit: 1,
    asOf: parsed.effectiveAt,
  }, client)
  const policy = await client.hrisLeavePolicy.findFirst({
    where: {
      id: parsed.leavePolicyId,
      organizationId: parsed.organizationId,
      status: "ACTIVE",
      effectiveFrom: { lte: parsed.effectiveAt },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: parsed.effectiveAt } },
      ],
    },
    select: { id: true },
  })
  if (!policy) throw new NotFoundError("Active leave policy was not found.")

  const existing = await client.hrisLeaveBalanceEntry.findUnique({
    where: {
      organizationId_idempotencyKey: {
        organizationId: parsed.organizationId,
        idempotencyKey: parsed.idempotencyKey,
      },
    },
  })
  const sourceHash = hash({
    employeeId: parsed.employeeId,
    leavePolicyId: parsed.leavePolicyId,
    deltaMinutes: parsed.deltaMinutes,
    effectiveAt: parsed.effectiveAt.toISOString(),
    sourceEvidenceHash: parsed.sourceEvidenceHash,
  })
  if (existing) {
    if (existing.sourceHash !== sourceHash) {
      throw new BusinessRuleError(
        "IDEMPOTENCY_CONFLICT: Leave balance key was reused for different evidence.",
      )
    }
    return { entry: existing, created: false }
  }
  const current = await client.hrisLeaveBalanceEntry.aggregate({
    where: {
      organizationId: parsed.organizationId,
      employeeId: parsed.employeeId,
      leavePolicyId: parsed.leavePolicyId,
      effectiveAt: { lte: parsed.effectiveAt },
    },
    _sum: { deltaMinutes: true },
  })
  if ((current._sum.deltaMinutes ?? 0) + parsed.deltaMinutes < 0) {
    throw new BusinessRuleError(
      "HRIS_LEAVE_BALANCE_NEGATIVE: A balance posting cannot create negative available leave.",
    )
  }

  const entry = await client.hrisLeaveBalanceEntry.create({
    data: {
      organizationId: parsed.organizationId,
      employeeId: parsed.employeeId,
      leavePolicyId: parsed.leavePolicyId,
      deltaMinutes: parsed.deltaMinutes,
      effectiveAt: parsed.effectiveAt,
      entryType: parsed.entryType,
      sourceType: parsed.sourceType,
      sourceId: parsed.sourceId,
      sourceHash,
      idempotencyKey: parsed.idempotencyKey,
      createdById: parsed.actorId,
    },
  })
  await client.auditLog.create({
    data: {
      entityType: "HrisLeaveBalanceEntry",
      entityId: entry.id,
      action: "HRIS_LEAVE_BALANCE_POSTED",
      userId: parsed.actorId,
      organizationId: parsed.organizationId,
      changes: {
        employeeId: parsed.employeeId,
        leavePolicyId: parsed.leavePolicyId,
        deltaMinutes: parsed.deltaMinutes,
        entryType: parsed.entryType,
        sourceEvidencePresent: true,
      },
    },
  })
  return { entry, created: true }
}
