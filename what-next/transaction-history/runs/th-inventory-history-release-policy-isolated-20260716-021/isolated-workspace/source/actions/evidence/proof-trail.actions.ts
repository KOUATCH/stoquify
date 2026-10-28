"use server"

import { z } from "zod"

import { BusinessRuleError } from "@/services/_shared/action-errors"
import { protect } from "@/services/_shared/protect"
import {
  isProofTrailSubjectType,
  SUBJECT_PERMISSION_MAP,
  type ProofTrailResult,
  type ProofTrailSubjectType,
} from "@/services/evidence/evidence-contracts"
import { getProofTrail } from "@/services/evidence/proof-trail.service"

export type { ProofTrailResult }

const proofTrailInputSchema = z.object({
  subjectType: z.string().min(1),
  subjectId: z.string().min(1),
})

const subjectOnlyInputSchema = z.object({
  subjectId: z.string().min(1),
})

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input) ? input : {}
}

function requireSubjectType(value: unknown): ProofTrailSubjectType {
  if (isProofTrailSubjectType(value)) return value
  throw new BusinessRuleError("Unsupported proof-trail subject type")
}

const getJournalEntryProofTrail = protect<unknown, ProofTrailResult>(
  {
    permission: SUBJECT_PERMISSION_MAP["journal.entry"],
    auditResource: "EvidenceProofTrail",
    auditAllowed: true,
  },
  async (input, ctx) => {
    const parsed = subjectOnlyInputSchema.parse(asRecord(input))
    return getProofTrail({
      organizationId: ctx.orgId,
      subjectType: "journal.entry",
      subjectId: parsed.subjectId,
      actorId: ctx.userId,
    })
  },
)

const getReconciliationRunProofTrail = protect<unknown, ProofTrailResult>(
  {
    permission: SUBJECT_PERMISSION_MAP["reconciliation.run"],
    auditResource: "EvidenceProofTrail",
    auditAllowed: true,
  },
  async (input, ctx) => {
    const parsed = subjectOnlyInputSchema.parse(asRecord(input))
    return getProofTrail({
      organizationId: ctx.orgId,
      subjectType: "reconciliation.run",
      subjectId: parsed.subjectId,
      actorId: ctx.userId,
    })
  },
)

const getCloseRunProofTrail = protect<unknown, ProofTrailResult>(
  {
    permission: SUBJECT_PERMISSION_MAP["close.run"],
    auditResource: "EvidenceProofTrail",
    auditAllowed: true,
  },
  async (input, ctx) => {
    const parsed = subjectOnlyInputSchema.parse(asRecord(input))
    return getProofTrail({
      organizationId: ctx.orgId,
      subjectType: "close.run",
      subjectId: parsed.subjectId,
      actorId: ctx.userId,
    })
  },
)

const getPaymentTransactionProofTrail = protect<unknown, ProofTrailResult>(
  {
    permission: SUBJECT_PERMISSION_MAP["payment.transaction"],
    auditResource: "EvidenceProofTrail",
    auditAllowed: true,
  },
  async (input, ctx) => {
    const parsed = subjectOnlyInputSchema.parse(asRecord(input))
    return getProofTrail({
      organizationId: ctx.orgId,
      subjectType: "payment.transaction",
      subjectId: parsed.subjectId,
      actorId: ctx.userId,
    })
  },
)

export async function getProofTrailAction(input: unknown) {
  const parsed = proofTrailInputSchema.parse(asRecord(input))
  const subjectType = requireSubjectType(parsed.subjectType)

  switch (subjectType) {
    case "journal.entry":
      return getJournalEntryProofTrail({ subjectId: parsed.subjectId })
    case "reconciliation.run":
      return getReconciliationRunProofTrail({ subjectId: parsed.subjectId })
    case "close.run":
      return getCloseRunProofTrail({ subjectId: parsed.subjectId })
    case "payment.transaction":
      return getPaymentTransactionProofTrail({ subjectId: parsed.subjectId })
  }
}

export async function getJournalEntryProofTrailAction(input: unknown) {
  return getJournalEntryProofTrail(input)
}

export async function getReconciliationRunProofTrailAction(input: unknown) {
  return getReconciliationRunProofTrail(input)
}

export async function getCloseRunProofTrailAction(input: unknown) {
  return getCloseRunProofTrail(input)
}
export async function getPaymentTransactionProofTrailAction(input: unknown) {
  return getPaymentTransactionProofTrail(input)
}
