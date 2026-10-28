import { createHash } from "node:crypto";

import { z } from "zod";

import { COMMAND_AGENT_CODE_MANIFEST } from "./agent-definition.service";

export const AGENT_RELEASE_CONTROL_VERSION = 1 as const;
export const AGENT_RELEASE_RECONCILIATION_MAX_AGE_MS = 10 * 60_000;

export const REQUIRED_AGENT_OWNER_RESPONSIBILITIES = [
  "ROLLOUT",
  "ROLLBACK",
  "SUPPORT",
  "PILOT",
  "SECURITY_INCIDENT",
  "ON_CALL_BACKUP",
] as const;

export const commandAgentReleaseManifest = Object.freeze({
  controlVersion: AGENT_RELEASE_CONTROL_VERSION,
  agentKey: COMMAND_AGENT_CODE_MANIFEST.agentKey,
  riskLevel: COMMAND_AGENT_CODE_MANIFEST.riskLevel,
  modelProvider: "none",
  skill: COMMAND_AGENT_CODE_MANIFEST.skill,
  tool: {
    key: COMMAND_AGENT_CODE_MANIFEST.tool.key,
    ownerService: COMMAND_AGENT_CODE_MANIFEST.tool.ownerService,
    moduleSlug: COMMAND_AGENT_CODE_MANIFEST.tool.moduleSlug,
    requiredPermission: COMMAND_AGENT_CODE_MANIFEST.tool.requiredPermission,
    riskLevel: COMMAND_AGENT_CODE_MANIFEST.tool.riskLevel,
    toolType: COMMAND_AGENT_CODE_MANIFEST.tool.toolType,
    inputSchemaHash: COMMAND_AGENT_CODE_MANIFEST.tool.inputSchemaHash,
    outputSchemaHash: COMMAND_AGENT_CODE_MANIFEST.tool.outputSchemaHash,
  },
});

export const COMMAND_AGENT_RELEASE_MANIFEST_HASH = hashAgentReleaseManifest(
  commandAgentReleaseManifest,
);

const sha256Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const actorIdSchema = z.string().trim().min(1).max(191);
export const agentReleaseIdempotencyKeySchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,190}$/);

export const prepareAgentActivationPackageSchema = z
  .object({
    organizationId: z.string().trim().min(1).max(191),
    releaseVersion: z.string().trim().min(1).max(80),
    environment: z.string().trim().min(1).max(40),
    commitSha: z
      .string()
      .trim()
      .regex(/^[a-f0-9]{7,64}$/i),
    allowedRoleCodes: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
    activationStartsAt: z.coerce.date(),
    activationEndsAt: z.coerce.date(),
    residualRisks: z.record(z.string(), z.unknown()).optional(),
    requestedById: actorIdSchema,
  })
  .strict()
  .refine((value) => value.activationEndsAt > value.activationStartsAt, {
    message: "Activation end must be after activation start.",
    path: ["activationEndsAt"],
  });

export const recordAgentApprovalSchema = z
  .object({
    organizationId: z.string().trim().min(1).max(191),
    packageId: z.string().trim().min(1).max(191),
    idempotencyKey: agentReleaseIdempotencyKeySchema,
    approvalType: z.enum(["PRODUCT", "SECURITY"]),
    decision: z.enum(["APPROVED", "REJECTED", "REVOKED"]),
    approverId: actorIdSchema,
    evidenceHash: sha256Schema,
    riskAcceptance: z.record(z.string(), z.unknown()).optional(),
    decidedAt: z.coerce.date(),
    expiresAt: z.coerce.date(),
  })
  .strict()
  .refine((value) => value.expiresAt > value.decidedAt, {
    message: "Approval expiry must be after its decision time.",
    path: ["expiresAt"],
  });

export const assignAgentOwnerSchema = z
  .object({
    organizationId: z.string().trim().min(1).max(191),
    packageId: z.string().trim().min(1).max(191),
    responsibility: z.enum(REQUIRED_AGENT_OWNER_RESPONSIBILITIES),
    primaryUserId: actorIdSchema,
    backupUserId: actorIdSchema.optional(),
    escalationRouteRef: z.string().trim().min(1).max(300),
    runbookVersion: z.string().trim().min(1).max(80),
    acceptedAt: z.coerce.date().optional(),
    validUntil: z.coerce.date().optional(),
    coverageStartsAt: z.coerce.date(),
    coverageEndsAt: z.coerce.date(),
  })
  .strict()
  .refine((value) => value.backupUserId !== value.primaryUserId, {
    message: "Primary and backup owners must be different people.",
    path: ["backupUserId"],
  })
  .refine((value) => value.coverageEndsAt > value.coverageStartsAt, {
    message: "Owner coverage end must be after coverage start.",
    path: ["coverageEndsAt"],
  });

export const recordAgentPilotCertificationSchema = z
  .object({
    organizationId: z.string().trim().min(1).max(191),
    packageId: z.string().trim().min(1).max(191),
    idempotencyKey: agentReleaseIdempotencyKeySchema,
    commitSha: z
      .string()
      .trim()
      .regex(/^[a-f0-9]{7,64}$/i),
    manifestHash: sha256Schema,
    suiteVersion: z.string().trim().min(1).max(80),
    ciRunId: z.string().trim().min(1).max(191),
    result: z.enum(["PASSED", "FAILED", "INVALIDATED"]),
    reportHash: sha256Schema,
    passedAt: z.coerce.date(),
    expiresAt: z.coerce.date(),
  })
  .strict();

export function hashAgentReleaseManifest(value: unknown) {
  return `sha256:${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

export function hashAgentReleaseCommand(value: unknown) {
  return hashAgentReleaseManifest(value);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}
