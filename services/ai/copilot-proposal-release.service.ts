import "server-only"

import { createHash } from "node:crypto"

import { db } from "@/prisma/db"
import { ForbiddenError } from "@/services/_shared/action-errors"
import {
  AGENT_RELEASE_RECONCILIATION_MAX_AGE_MS,
  REQUIRED_AGENT_OWNER_RESPONSIBILITIES,
} from "@/services/agents/agent-release-contracts"

export const COPILOT_PROPOSAL_AGENT_KEY = "cash-reconciliation-agent"

export const COPILOT_PROPOSAL_RELEASE_MANIFEST = Object.freeze({
  schemaVersion: 1,
  agentKey: COPILOT_PROPOSAL_AGENT_KEY,
  phase: "PHASE_3_READ_AND_DRAFT",
  riskLevel: "DRAFT",
  capabilities: ["RECONCILIATION_ACTION_DRAFT"],
  executionAuthority: "NONE",
  prohibitedAuthorities: [
    "CASH_ADJUSTMENT",
    "LEDGER_POSTING",
    "PAYMENT_MUTATION",
    "PROVIDER_MUTATION",
  ],
})

export const COPILOT_PROPOSAL_RELEASE_MANIFEST_HASH =
  hashManifest(COPILOT_PROPOSAL_RELEASE_MANIFEST)

const COMMIT_SHA_PATTERN = /^[a-f0-9]{40}$/i

type ProposalRelease = {
  id: string
  manifestHash: string
  commitSha: string
  allowedRoleCodes: string[]
  activationStartsAt: Date
  activationEndsAt: Date
  lastReconciledAt: Date | null
  reconciliationState: string | null
  alertTransportReady: boolean
  approvals: Array<{
    approvalType: string
    decision: string
    approverId: string
    decidedAt: Date
    expiresAt: Date
    revokedAt: Date | null
  }>
  owners: Array<{
    responsibility: string
    primaryUserId: string
    backupUserId: string | null
    escalationRouteRef: string
    runbookVersion: string
    acceptedAt: Date | null
    validUntil: Date | null
    coverageStartsAt: Date
    coverageEndsAt: Date
  }>
  certifications: Array<{
    commitSha: string
    manifestHash: string
    result: string
    passedAt: Date
    expiresAt: Date
  }>
}

type Dependencies = {
  loadRelease: (input: {
    organizationId: string
    environment: string
  }) => Promise<ProposalRelease | null>
  deployedCommitSha?: () => string | undefined
}

const DEFAULT_DEPENDENCIES: Dependencies = {
  loadRelease: ({ organizationId, environment }) =>
    db.agentActivationPackage.findFirst({
      where: {
        organizationId,
        environment,
        agentKey: COPILOT_PROPOSAL_AGENT_KEY,
        state: "ACTIVE_INTERNAL",
      },
      include: {
        approvals: true,
        owners: true,
        certifications: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  deployedCommitSha: () => process.env.STOQUIFY_AGENT_RELEASE_COMMIT_SHA,
}

export async function authorizeCopilotProposalRelease(
  input: {
    organizationId: string
    roleCodes: readonly string[]
    environment?: string
    now?: Date
  },
  dependencies: Dependencies = DEFAULT_DEPENDENCIES,
) {
  if (process.env.STOQUIFY_COPILOT_PROPOSAL_KILL_SWITCH === "1") {
    throw proposalReleaseDenied()
  }

  const environment = (
    input.environment ??
    process.env.STOQUIFY_AGENT_RELEASE_ENVIRONMENT ??
    "local"
  ).toLowerCase()
  const now = input.now ?? new Date()
  const release = await dependencies.loadRelease({
    organizationId: input.organizationId,
    environment,
  })
  const deployedCommitSha =
    dependencies.deployedCommitSha?.() ??
    process.env.STOQUIFY_AGENT_RELEASE_COMMIT_SHA

  if (
    !release ||
    !deployedCommitSha ||
    !COMMIT_SHA_PATTERN.test(deployedCommitSha) ||
    !proposalReleaseReady(release, input.roleCodes, deployedCommitSha, now)
  ) {
    throw proposalReleaseDenied()
  }

  return {
    packageId: release.id,
    manifestHash: release.manifestHash,
    executionAuthority: "NONE" as const,
  }
}

function proposalReleaseReady(
  release: ProposalRelease,
  roleCodes: readonly string[],
  deployedCommitSha: string,
  now: Date,
) {
  if (
    release.manifestHash !== COPILOT_PROPOSAL_RELEASE_MANIFEST_HASH ||
    release.commitSha.toLowerCase() !== deployedCommitSha.toLowerCase()
  ) {
    return false
  }
  if (
    now < release.activationStartsAt ||
    now >= release.activationEndsAt ||
    !release.alertTransportReady ||
    release.reconciliationState !== "PASSED" ||
    !release.lastReconciledAt ||
    release.lastReconciledAt > now ||
    now.getTime() - release.lastReconciledAt.getTime() >
      AGENT_RELEASE_RECONCILIATION_MAX_AGE_MS
  ) {
    return false
  }

  const allowedRoles = new Set(release.allowedRoleCodes.map(normalizeRole))
  if (!roleCodes.some((role) => allowedRoles.has(normalizeRole(role)))) {
    return false
  }

  const approvals = ["PRODUCT", "SECURITY"].map((approvalType) =>
    latestByDate(
      release.approvals.filter(
        (approval) => approval.approvalType === approvalType,
      ),
      (approval) => approval.decidedAt,
    ),
  )
  if (
    approvals.some(
      (approval) =>
        !approval ||
        approval.decision !== "APPROVED" ||
        approval.revokedAt !== null ||
        approval.decidedAt > now ||
        approval.expiresAt <= now,
    ) ||
    approvals[0]?.approverId === approvals[1]?.approverId
  ) {
    return false
  }

  if (
    !REQUIRED_AGENT_OWNER_RESPONSIBILITIES.every((responsibility) => {
      const owner = release.owners.find(
        (candidate) => candidate.responsibility === responsibility,
      )
      return Boolean(
        owner?.primaryUserId &&
          owner.backupUserId &&
          owner.escalationRouteRef &&
          owner.runbookVersion &&
          owner.acceptedAt &&
          owner.acceptedAt <= now &&
          owner.validUntil &&
          owner.validUntil > now &&
          owner.coverageStartsAt <= now &&
          owner.coverageEndsAt > now,
      )
    })
  ) {
    return false
  }

  const certification = latestByDate(
    release.certifications,
    (candidate) => candidate.passedAt,
  )
  return Boolean(
    certification?.result === "PASSED" &&
      certification.passedAt <= now &&
      certification.commitSha.toLowerCase() ===
        release.commitSha.toLowerCase() &&
      certification.manifestHash === release.manifestHash &&
      certification.expiresAt > now,
  )
}

function latestByDate<T>(values: readonly T[], date: (value: T) => Date) {
  return [...values].sort(
    (left, right) => date(right).getTime() - date(left).getTime(),
  )[0]
}

function normalizeRole(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function hashManifest(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(stableStringify(value))
    .digest("hex")}`
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}

function proposalReleaseDenied() {
  return new ForbiddenError(
    "Copilot proposal drafts are unavailable until a governed Phase 3 release is active.",
  )
}
