#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
if (
  process.argv.includes("--activate") ||
  process.argv.includes("--rollout=internal")
) {
  throw new Error(
    "Direct activation is prohibited. Use the governed agent release-control workflow.",
  );
}

const manifest = {
  agentKey: "command-agent",
  skillKey: "role-daily-brief",
  skillVersion: 1,
  promptHash:
    "sha256:4f70962e7461bbac84276c74928f4877616afcb4a97c647e9d3d629e452e3e55",
  toolKey: "readRoleDailyDigest",
};

async function main() {
  if (!apply) {
    console.log(
      JSON.stringify(
        { mode: "dry-run", status: "DRAFT", rollout: "SHADOW", manifest },
        null,
        2,
      ),
    );
    return;
  }
  const status = "DRAFT";
  const rollout = "SHADOW";
  await prisma.$transaction([
    prisma.agentToolDefinition.upsert({
      where: { key: manifest.toolKey },
      create: {
        key: manifest.toolKey,
        ownerService: "services/daily-habit",
        moduleSlug: "dashboard",
        requiredPermission: "dashboard.read",
        riskLevel: "READ_ONLY",
        toolType: "READ_ONLY",
        inputSchemaHash: "agent-schema:role-daily-digest-input:v1",
        outputSchemaHash: "agent-schema:role-daily-digest-output:v1",
        approvalPolicy: "none",
        idempotencyMode: "request_key",
        status,
      },
      update: {
        ownerService: "services/daily-habit",
        moduleSlug: "dashboard",
        requiredPermission: "dashboard.read",
        riskLevel: "READ_ONLY",
        toolType: "READ_ONLY",
        inputSchemaHash: "agent-schema:role-daily-digest-input:v1",
        outputSchemaHash: "agent-schema:role-daily-digest-output:v1",
        approvalPolicy: "none",
        idempotencyMode: "request_key",
        status,
      },
    }),
    prisma.agentSkillDefinition.upsert({
      where: {
        key_version: { key: manifest.skillKey, version: manifest.skillVersion },
      },
      create: {
        key: manifest.skillKey,
        version: manifest.skillVersion,
        domain: "daily-habit",
        promptHash: manifest.promptHash,
        ownerModuleSlug: "dashboard",
        requiredPermissions: ["dashboard.read"],
        redactionCategories: [
          "proof_hidden_identifier",
          "reconciliation_suspense_detail",
          "payroll_person_amount",
        ],
        status,
      },
      update: {
        promptHash: manifest.promptHash,
        requiredPermissions: ["dashboard.read"],
        redactionCategories: [
          "proof_hidden_identifier",
          "reconciliation_suspense_detail",
          "payroll_person_amount",
        ],
        status,
      },
    }),
    prisma.agentDefinition.upsert({
      where: { key: manifest.agentKey },
      create: {
        key: manifest.agentKey,
        name: "Stoquify Command Agent",
        description:
          "Deterministic, evidence-backed, read-only Daily Digest brief.",
        ownerModuleSlug: "dashboard",
        status,
        rolloutMode: rollout,
        riskLevel: "READ_ONLY",
        allowedToolKeys: [manifest.toolKey],
        allowedSkillKeys: [manifest.skillKey],
      },
      update: {
        status,
        rolloutMode: rollout,
        riskLevel: "READ_ONLY",
        allowedToolKeys: [manifest.toolKey],
        allowedSkillKeys: [manifest.skillKey],
      },
    }),
  ]);
  console.log(
    JSON.stringify({ mode: "applied", status, rollout, manifest }, null, 2),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
