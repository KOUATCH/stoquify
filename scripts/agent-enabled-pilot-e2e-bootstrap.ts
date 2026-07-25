import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { db } from "@/prisma/db";
import {
  AGENT_PROTECTED_DATA_FINGERPRINT_VERSION,
  fingerprintAgentProtectedBusinessData,
} from "./agent-protected-data-fingerprint";
import {
  certifyAgentAllowedPersistence,
  countAgentAllowedPersistence,
  type AgentAllowedPersistenceCounts,
} from "./agent-enabled-pilot-persistence-assurance";
import { assertEnabledPilotBrowserCertification } from "./agent-enabled-pilot-browser-report";
import {
  acceptCommandAgentActivationOwnership,
  assignCommandAgentActivationOwner,
  prepareCommandAgentActivationPackage,
  provisionCommandAgentShadow,
  recordCommandAgentActivationApproval,
  recordCommandAgentPilotCertification,
  reviewCommandAgentActivationPackage,
  suspendCommandAgentRelease,
} from "@/services/agents/agent-release-control.service";
import {
  COMMAND_AGENT_RELEASE_MANIFEST_HASH,
  REQUIRED_AGENT_OWNER_RESPONSIBILITIES,
} from "@/services/agents/agent-release-contracts";

const root = process.cwd();
const statePath = resolve(
  root,
  process.env.STOQUIFY_AGENT_E2E_STATE_PATH ??
    "what-next/agents-runtime/command-agent-enabled-e2e-state.json",
);
const reportPath = resolve(
  root,
  process.env.PLAYWRIGHT_JSON_OUTPUT_NAME ??
    "what-next/agents-runtime/command-agent-enabled-playwright.json",
);
const organizationId =
  process.env.AQSTOQFLOW_E2E_ORG_ID ?? "org_payroll_e2e_local";
const primaryEmail = (
  process.env.AQSTOQFLOW_E2E_EMAIL ?? "hr.manager@stockflow.test"
).toLowerCase();
const backupEmail = (
  process.env.AQSTOQFLOW_E2E_REQUESTER_EMAIL ??
  "payroll.requester@stockflow.test"
).toLowerCase();

type BootstrapState = {
  organizationId: string;
  packageId: string;
  releaseVersion: string;
  commitSha: string;
  manifestHash: string;
  preparedAt: string;
  protectedDataFingerprintVersion: typeof AGENT_PROTECTED_DATA_FINGERPRINT_VERSION;
  protectedDataBeforeHash: string;
  protectedDataAfterHash?: string;
  allowedPersistenceBefore: AgentAllowedPersistenceCounts;
  allowedPersistenceAfter?: AgentAllowedPersistenceCounts;
  certifiedAt?: string;
  certificationId?: string;
};

async function main() {
  assertCertificationEnvironment();
  const phase = process.argv[2] ?? "prepare";
  if (phase === "prepare") await prepare();
  else if (phase === "certify") await certify();
  else throw new Error(`Unsupported E2E bootstrap phase: ${phase}`);
}

async function prepare() {
  const [primary, backup] = await Promise.all([
    db.user.findFirst({
      where: { organizationId, email: primaryEmail, isActive: true },
      select: { id: true },
    }),
    db.user.findFirst({
      where: { organizationId, email: backupEmail, isActive: true },
      select: { id: true },
    }),
  ]);
  if (!primary || !backup || primary.id === backup.id) {
    throw new Error(
      "Enabled-pilot certification requires two distinct active seeded users.",
    );
  }

  const previous = await db.agentActivationPackage.findMany({
    where: {
      organizationId,
      agentKey: "command-agent",
      environment: "e2e",
      state: {
        in: ["PROVISIONED_INACTIVE", "PILOT_CERTIFIED", "ACTIVE_INTERNAL"],
      },
    },
    select: { id: true },
  });
  for (const release of previous) {
    await suspendCommandAgentRelease({
      organizationId,
      packageId: release.id,
      actorId: primary.id,
      reason: "Superseded by a new non-production browser certification run.",
    });
  }

  const commitSha = resolveCommitSha();
  const releaseVersion = `e2e-${commitSha.slice(0, 12)}-${Date.now()}`;
  const now = new Date();
  const activationStartsAt = new Date(now.getTime() - 60 * 60_000);
  const activationEndsAt = new Date(now.getTime() + 8 * 60 * 60_000);
  let release = await prepareCommandAgentActivationPackage({
    organizationId,
    releaseVersion,
    environment: "e2e",
    commitSha,
    allowedRoleCodes: ["PAYROLL_E2E"],
    activationStartsAt,
    activationEndsAt,
    residualRisks: {
      environment: "e2e",
      productionActivation: false,
      purpose: "enabled-pilot Playwright certification",
    },
    requestedById: primary.id,
  });
  release = await reviewCommandAgentActivationPackage({
    organizationId,
    packageId: release.id,
    actorId: primary.id,
    expectedVersion: release.version,
  });

  for (const responsibility of REQUIRED_AGENT_OWNER_RESPONSIBILITIES) {
    await assignCommandAgentActivationOwner({
      organizationId,
      packageId: release.id,
      responsibility,
      primaryUserId: primary.id,
      backupUserId: backup.id,
      escalationRouteRef: `runbook://agent-runtime/${responsibility.toLowerCase()}`,
      runbookVersion: "e2e-v1",
      coverageStartsAt: activationStartsAt,
      coverageEndsAt: activationEndsAt,
    });
    await acceptCommandAgentActivationOwnership({
      organizationId,
      packageId: release.id,
      responsibility,
      actorId: primary.id,
    });
  }

  await recordCommandAgentActivationApproval({
    organizationId,
    packageId: release.id,
    idempotencyKey: `approval:product:${releaseVersion}`,
    approvalType: "PRODUCT",
    decision: "APPROVED",
    approverId: primary.id,
    evidenceHash: hash(`product:${releaseVersion}`),
    riskAcceptance: { environment: "e2e", productionAuthority: false },
    decidedAt: now,
    expiresAt: activationEndsAt,
  });
  await recordCommandAgentActivationApproval({
    organizationId,
    packageId: release.id,
    idempotencyKey: `approval:security:${releaseVersion}`,
    approvalType: "SECURITY",
    decision: "APPROVED",
    approverId: backup.id,
    evidenceHash: hash(`security:${releaseVersion}`),
    riskAcceptance: { environment: "e2e", productionAuthority: false },
    decidedAt: new Date(now.getTime() + 1_000),
    expiresAt: activationEndsAt,
  });

  const approved = await db.agentActivationPackage.findFirstOrThrow({
    where: { id: release.id, organizationId },
  });
  const provisioned = await provisionCommandAgentShadow({
    organizationId,
    packageId: approved.id,
    actorId: primary.id,
    expectedVersion: approved.version,
  });
  if (provisioned.state !== "PROVISIONED_INACTIVE") {
    throw new Error(
      "Certification release did not remain provisioned and inactive.",
    );
  }

  const protectedDataBeforeHash =
    await fingerprintAgentProtectedBusinessData(organizationId);
  const allowedPersistenceBefore =
    await countAgentAllowedPersistence(organizationId);

  writeState({
    organizationId,
    packageId: provisioned.id,
    releaseVersion,
    commitSha,
    manifestHash: COMMAND_AGENT_RELEASE_MANIFEST_HASH,
    preparedAt: new Date().toISOString(),
    protectedDataFingerprintVersion: AGENT_PROTECTED_DATA_FINGERPRINT_VERSION,
    protectedDataBeforeHash,
    allowedPersistenceBefore,
  });
  console.log(`Prepared inactive E2E certification package ${provisioned.id}.`);
}

async function certify() {
  const state = readState();
  const protectedDataAfterHash = await fingerprintAgentProtectedBusinessData(
    state.organizationId,
  );
  if (protectedDataAfterHash !== state.protectedDataBeforeHash) {
    throw new Error(
      "Enabled-pilot execution mutated protected business or access-control data.",
    );
  }
  const allowedPersistenceAfter = await countAgentAllowedPersistence(
    state.organizationId,
  );
  const allowedPersistence = certifyAgentAllowedPersistence(
    state.allowedPersistenceBefore,
    allowedPersistenceAfter,
  );
  const reportJson = JSON.parse(
    readFileSync(reportPath, "utf8"),
  ) as Record<string, unknown>;
  assertEnabledPilotBrowserCertification(reportJson);
  reportJson.certificationAssurance = {
    protectedBusinessDataUnchanged: true,
    fingerprintVersion: state.protectedDataFingerprintVersion,
    beforeHash: state.protectedDataBeforeHash,
    afterHash: protectedDataAfterHash,
    allowedPersistence,
  };
  writeFileSync(reportPath, `${JSON.stringify(reportJson, null, 2)}\n`, "utf8");
  const report = readFileSync(reportPath);
  if (report.length === 0)
    throw new Error("Playwright certification report is empty.");
  const now = new Date();
  const ciRunId =
    process.env.GITHUB_RUN_ID ??
    `local-${now.toISOString().replace(/[^0-9]/g, "")}`;
  const certification = await recordCommandAgentPilotCertification({
    organizationId: state.organizationId,
    packageId: state.packageId,
    idempotencyKey: `certification:${ciRunId}`,
    commitSha: state.commitSha,
    manifestHash: state.manifestHash,
    suiteVersion: "command-agent-enabled-playwright-v1",
    ciRunId,
    result: "PASSED",
    reportHash: hash(report),
    passedAt: now,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60_000),
  });
  const release = await db.agentActivationPackage.findFirstOrThrow({
    where: { id: state.packageId, organizationId: state.organizationId },
  });
  if (release.state !== "PILOT_CERTIFIED" || release.activatedAt) {
    throw new Error("Browser certification must not activate the release.");
  }
  writeState({
    ...state,
    protectedDataAfterHash,
    allowedPersistenceAfter,
    certifiedAt: now.toISOString(),
    certificationId: certification.record.id,
  });
  console.log(
    `Recorded browser certification ${certification.record.id}; activation remains disabled.`,
  );
}

function assertCertificationEnvironment() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.STOQUIFY_AGENT_RELEASE_ENVIRONMENT !== "e2e" ||
    process.env.STOQUIFY_AGENT_CERTIFICATION_MODE !== "1"
  ) {
    throw new Error(
      "Refusing to run enabled-pilot bootstrap outside the guarded E2E environment.",
    );
  }
}

function resolveCommitSha() {
  const configured = process.env.GITHUB_SHA?.trim();
  const value =
    configured ||
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (!/^[a-f0-9]{7,64}$/i.test(value))
    throw new Error("A valid commit SHA is required.");
  return value.toLowerCase();
}

function hash(value: string | Buffer) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function readState(): BootstrapState {
  return JSON.parse(readFileSync(statePath, "utf8")) as BootstrapState;
}

function writeState(state: BootstrapState) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
