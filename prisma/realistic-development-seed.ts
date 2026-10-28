import "dotenv/config";

import { randomBytes } from "crypto";
import { existsSync } from "fs";
import { chmod, mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";

import { PrismaClient } from "@prisma/client";
import {
  COMPLIANCE_HRIS_ROLE_COUNT,
  ensureComplianceHrisRoleCoverage,
} from "./compliance-hris-role-seed";
import { reuseCompleteRealisticSeed } from "./realistic-seed-rerun";

const ARTIFACT_DIRECTORY = path.join(process.cwd(), ".seed-artifacts");
const CREDENTIAL_ARTIFACT = path.join(
  ARTIFACT_DIRECTORY,
  "seed-login-credentials.json",
);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

type ExistingCredentialArtifact = {
  credentials?: Array<{ password?: string }>;
};

function expandEnvValue(value: string) {
  return value.replace(/\$\{([^}]+)\}/g, (_match, key: string) => process.env[key] ?? "");
}

function assertSafeSeedTarget() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Realistic development seed refuses NODE_ENV=production.");
  }

  const configured = process.env.DATABASE_URL?.trim();
  if (!configured) throw new Error("DATABASE_URL is required for development seeding.");

  const target = new URL(expandEnvValue(configured));
  const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ""));
  if (
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    !LOCAL_HOSTS.has(target.hostname.toLowerCase()) ||
    !/(?:dev|test|local|reconcile|referral)/i.test(databaseName)
  ) {
    throw new Error(
      "Realistic development seed requires an explicitly named local development/test PostgreSQL database.",
    );
  }
}

function validateDemoPassword(password: string) {
  if (
    password.length < 16 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      "STOQUIFY_SEED_DEMO_PASSWORD must be at least 16 characters and include upper-case, lower-case, numeric, and special characters.",
    );
  }
  return password;
}

async function resolveDemoPassword() {
  const configured = process.env.STOQUIFY_SEED_DEMO_PASSWORD?.trim();
  if (configured) return validateDemoPassword(configured);

  if (existsSync(CREDENTIAL_ARTIFACT)) {
    const parsed = JSON.parse(
      await readFile(CREDENTIAL_ARTIFACT, "utf8"),
    ) as ExistingCredentialArtifact;
    const saved = parsed.credentials?.[0]?.password?.trim();
    if (saved) return validateDemoPassword(saved);
  }

  return validateDemoPassword(
    `Stoquify-${randomBytes(18).toString("base64url")}!7a`,
  );
}

function intendedScenario(role: string) {
  const normalized = role.toLowerCase();
  if (normalized.includes("cashier")) return "POS catalog, cart, tender, receipt, and cash-drawer testing";
  if (normalized.includes("inventory")) return "Catalog, stock, count, transfer, and adjustment testing";
  if (normalized.includes("purchaser")) return "Supplier, purchase-order, receipt, and AP testing";
  if (normalized.includes("accountant")) return "Ledger, reconciliation, reporting, and close testing";
  if (normalized.includes("hr")) return "HRIS, attendance, payroll, and payslip testing";
  if (normalized.includes("auditor")) return "Read-only audit, evidence, and compliance testing";
  if (normalized.includes("manager")) return "Branch oversight, approvals, and operating-control testing";
  if (normalized.includes("admin")) return "Tenant administration, RBAC, module, and configuration testing";
  return "General authenticated development testing";
}

async function writeCredentialArtifact(
  password: string,
  seeded: Awaited<ReturnType<typeof import("./comprehensive-seed")["runComprehensiveSeed"]>>,
) {
  const prisma = new PrismaClient();
  try {
    const credentials = [];
    const uniqueSeededCredentials = [
      ...new Map(
        seeded.credentials.map((credential) => [credential.userId, credential]),
      ).values(),
    ];
    for (const seededCredential of uniqueSeededCredentials) {
      const user = await prisma.user.findUnique({
        where: { id: seededCredential.userId },
        select: {
          preferredLocale: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              requestedModules: true,
              locations: {
                where: { isDefault: true, isActive: true },
                select: { id: true, name: true },
                take: 1,
              },
            },
          },
          roles: {
            select: { code: true, nameEn: true, permissions: true },
          },
        },
      });
      if (!user) throw new Error(`Seed credential user missing: ${seededCredential.userId}`);

      const locale = user.preferredLocale.toLowerCase();
      credentials.push({
        organizationId: user.organization.id,
        organizationName: user.organization.name,
        organizationSlug: user.organization.slug,
        loginRoute: `/${locale}/login`,
        locale: user.preferredLocale,
        name: seededCredential.name,
        email: seededCredential.email,
        password,
        role: seededCredential.role,
        roleCodes: user.roles.map((role) => role.code),
        permissions: [...new Set(user.roles.flatMap((role) => role.permissions))].sort(),
        moduleEntitlements: user.organization.requestedModules,
        defaultLocation: user.organization.locations[0] ?? null,
        intendedScenario: intendedScenario(seededCredential.role),
        note: seededCredential.note ?? null,
      });
    }

    const artifact = {
      warning: "SYNTHETIC DEVELOPMENT-ONLY LOGIN CREDENTIALS. NEVER USE IN PRODUCTION.",
      generatedAt: new Date().toISOString(),
      fakerSeed: seeded.fakerSeed,
      credentialCount: credentials.length,
      credentials,
      seedQuality: seeded.quality,
    };

    await mkdir(ARTIFACT_DIRECTORY, { recursive: true });
    const temporaryPath = `${CREDENTIAL_ARTIFACT}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    await rename(temporaryPath, CREDENTIAL_ARTIFACT);
    try {
      await chmod(CREDENTIAL_ARTIFACT, 0o600);
    } catch {
      // Windows ACLs are managed by the current user profile; Git ignore remains mandatory.
    }
    return { credentialCount: credentials.length };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  assertSafeSeedTarget();
  const password = await resolveDemoPassword();
  process.env.STOQUIFY_SEED_DEMO_PASSWORD = password;

  const reuseClient = new PrismaClient();
  try {
    const existingOrganizationCount = await reuseClient.organization.count({
      where: { id: { startsWith: "rds_org_" } },
    });
    let complianceCoverage:
      | Awaited<ReturnType<typeof ensureComplianceHrisRoleCoverage>>
      | null = null;
    if (existingOrganizationCount === 2) {
      complianceCoverage = await ensureComplianceHrisRoleCoverage({
        prisma: reuseClient,
        password,
      });
    }
    const reused = await reuseCompleteRealisticSeed({
      prisma: reuseClient,
      organizationIdPrefix: "rds_org_",
      expectedOrganizationCount: 2,
      password,
      minimumRoleCountPerOrganization: COMPLIANCE_HRIS_ROLE_COUNT,
      minimumUserCountPerOrganization: COMPLIANCE_HRIS_ROLE_COUNT + 2,
    });
    if (reused) {
      const artifact = await writeCredentialArtifact(password, {
        ...reused,
        credentials: [
          ...reused.credentials,
          ...(complianceCoverage?.credentials ?? []),
        ],
        fakerSeed: 20260527,
      });
      console.log(
        `Realistic development seed already complete. ${artifact.credentialCount} login personas saved to .seed-artifacts/seed-login-credentials.json.`,
      );
      console.log("Plaintext passwords were not printed to console output.");
      return;
    }
  } finally {
    await reuseClient.$disconnect();
  }

  const { disconnectComprehensiveSeed, runComprehensiveSeed } = await import(
    "./comprehensive-seed"
  );
  try {
    const seeded = await runComprehensiveSeed();
    const complianceClient = new PrismaClient();
    let complianceCoverage: Awaited<
      ReturnType<typeof ensureComplianceHrisRoleCoverage>
    >;
    try {
      complianceCoverage = await ensureComplianceHrisRoleCoverage({
        prisma: complianceClient,
        password,
      });
    } finally {
      await complianceClient.$disconnect();
    }
    const artifact = await writeCredentialArtifact(password, {
      ...seeded,
      credentials: [...seeded.credentials, ...complianceCoverage.credentials],
    });
    console.log(
      `Realistic development seed completed. ${artifact.credentialCount} login personas saved to .seed-artifacts/seed-login-credentials.json.`,
    );
    console.log("Plaintext passwords were not printed to console output.");
  } finally {
    await disconnectComprehensiveSeed();
  }
}

main().catch((error) => {
  console.error("Realistic development seed failed:", error);
  process.exitCode = 1;
});
