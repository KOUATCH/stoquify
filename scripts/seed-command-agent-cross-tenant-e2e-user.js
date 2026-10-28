#!/usr/bin/env node

const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const argon2 = require("argon2");

loadLocalEnv();

const { Locale, PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const organizationId =
  process.env.AQSTOQFLOW_AGENT_CROSS_TENANT_ORG_ID ??
  "org_command_agent_cross_tenant_e2e";
const organizationSlug =
  process.env.AQSTOQFLOW_AGENT_CROSS_TENANT_ORG_SLUG ??
  "command-agent-cross-tenant-e2e";
const userId =
  process.env.AQSTOQFLOW_AGENT_CROSS_TENANT_USER_ID ??
  "usr_command_agent_cross_tenant_e2e";
const email = (
  process.env.AQSTOQFLOW_AGENT_CROSS_TENANT_EMAIL ??
  "command.agent.cross-tenant@stockflow.test"
)
  .trim()
  .toLowerCase();
const password =
  process.env.AQSTOQFLOW_AGENT_CROSS_TENANT_PASSWORD ?? "AgentCrossTenant@2026";
const roleCode = "PAYROLL_E2E";

async function main() {
  assertLocalOnly();
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.upsert({
      where: { id: organizationId },
      update: {
        name: "Command Agent Cross-Tenant E2E",
        industry: "Local browser validation",
        country: "Cameroon",
        countryCode: "CM",
        currency: "XAF",
        timezone: "Africa/Douala",
        defaultLocale: Locale.EN,
        requestedModules: { set: [] },
        onboardingSource: "local-command-agent-cross-tenant-e2e",
        onboardingCompletedAt: now,
        isActive: true,
        deletedAt: null,
        updatedAt: now,
      },
      create: {
        id: organizationId,
        slug: organizationSlug,
        name: "Command Agent Cross-Tenant E2E",
        industry: "Local browser validation",
        country: "Cameroon",
        countryCode: "CM",
        currency: "XAF",
        timezone: "Africa/Douala",
        defaultLocale: Locale.EN,
        requestedModules: [],
        onboardingSource: "local-command-agent-cross-tenant-e2e",
        onboardingCompletedAt: now,
        isActive: true,
        updatedAt: now,
      },
    });
    const role = await tx.role.upsert({
      where: {
        organizationId_code: {
          organizationId: organization.id,
          code: roleCode,
        },
      },
      update: {
        nameEn: "Command Agent Cross-Tenant E2E",
        nameFr: "Agent Commande Locataire Croise E2E",
        description:
          "Local-only identity for browser tenant-isolation certification.",
        permissions: { set: ["dashboard.read", "accounting.close.read"] },
        updatedAt: now,
      },
      create: {
        id: `${organization.id}_role_${roleCode.toLowerCase()}`,
        organizationId: organization.id,
        code: roleCode,
        nameEn: "Command Agent Cross-Tenant E2E",
        nameFr: "Agent Commande Locataire Croise E2E",
        description:
          "Local-only identity for browser tenant-isolation certification.",
        permissions: ["dashboard.read", "accounting.close.read"],
        updatedAt: now,
      },
    });
    const existing = await tx.user.findUnique({
      where: { email },
      select: { id: true, organizationId: true },
    });
    if (existing && existing.organizationId !== organization.id) {
      throw new Error(
        `Refusing to move cross-tenant E2E user from ${existing.organizationId}.`,
      );
    }
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            name: "Command Agent Cross-Tenant User",
            firstName: "Cross-Tenant",
            lastName: "Operator",
            jobTitle: "Local Browser Isolation Fixture",
            password: passwordHash,
            emailVerified: true,
            isVerified: true,
            isActive: true,
            isLocked: false,
            lockedUntil: null,
            failedLoginAttempts: 0,
            lastFailedLogin: null,
            preferredLocale: Locale.EN,
            roles: { set: [{ id: role.id }] },
            updatedAt: now,
          },
        })
      : await tx.user.create({
          data: {
            id: userId,
            organizationId: organization.id,
            email,
            name: "Command Agent Cross-Tenant User",
            firstName: "Cross-Tenant",
            lastName: "Operator",
            jobTitle: "Local Browser Isolation Fixture",
            password: passwordHash,
            emailVerified: true,
            isVerified: true,
            isActive: true,
            isLocked: false,
            failedLoginAttempts: 0,
            preferredLocale: Locale.EN,
            roles: { connect: { id: role.id } },
            updatedAt: now,
          },
        });
    await tx.account.upsert({
      where: {
        providerId_accountId: {
          providerId: "credential",
          accountId: user.id,
        },
      },
      update: {
        userId: user.id,
        password: passwordHash,
        scope: "profile email",
        updatedAt: now,
      },
      create: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: passwordHash,
        scope: "profile email",
        updatedAt: now,
      },
    });
    const revokedSessions = await tx.session.deleteMany({
      where: { userId: user.id },
    });
    return {
      organizationId: organization.id,
      userId: user.id,
      email: user.email,
      roleCode: role.code,
      permissions: role.permissions,
      revokedSessionCount: revokedSessions.count,
      releasePackageCreated: false,
    };
  });

  console.log(JSON.stringify(result, null, 2));
}

function assertLocalOnly() {
  const markers = [
    process.env.NODE_ENV,
    process.env.AQSTOQFLOW_ENV,
    process.env.VERCEL_ENV,
  ].map((value) => (value ?? "").toLowerCase());
  if (markers.includes("production")) {
    throw new Error(
      "Refusing to seed the Command Agent cross-tenant fixture in production.",
    );
  }
}

function loadLocalEnv() {
  for (const envPath of [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
  ]) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = expand(value).replace(/\\n/g, "\n");
    }
  }
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    if (process.env[key]?.includes("${")) {
      process.env[key] = expand(process.env[key]);
    }
  }
}

function expand(value) {
  return value.replace(
    /\${([A-Za-z_][A-Za-z0-9_]*)}/g,
    (_, key) => process.env[key] ?? "",
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
