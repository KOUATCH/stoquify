#!/usr/bin/env node

const argon2 = require("argon2");
const { Locale, PrismaClient } = require("@prisma/client");
const { assertLocalFixtureAllowed } = require("./supplier-e2e-fixture");

const FIXTURE_SOURCE = "scripts/supplier-locked-e2e-fixture.js";
const ONBOARDING_SOURCE = "local-playwright-supplier-locked";
const ORGANIZATION_ID =
  process.env.AQSTOQFLOW_SUPPLIER_E2E_LOCKED_ORG_ID ??
  "org_supplier_e2e_locked";
const USER_ID = "usr_supplier_e2e_locked";
const EMAIL = (
  process.env.AQSTOQFLOW_SUPPLIER_E2E_LOCKED_EMAIL ??
  "supplier.locked@stockflow.test"
)
  .trim()
  .toLowerCase();
const PASSWORD =
  process.env.AQSTOQFLOW_SUPPLIER_E2E_LOCKED_PASSWORD ??
  process.env.AQSTOQFLOW_SUPPLIER_E2E_PASSWORD ??
  "SupplierE2E@2026";
const PERMISSIONS = [
  "dashboard.read",
  "purchases.suppliers.read",
  "purchasing.ap.invoice.view",
  "finance.payables.read",
];

const SUPPLIER_LOCKED_E2E_FIXTURE_CONTRACT = Object.freeze({
  fixtureSource: FIXTURE_SOURCE,
  fixturePurpose: "supplier history module-lock browser verification",
  productionBackfill: false,
  organizationId: ORGANIZATION_ID,
  userId: USER_ID,
  email: EMAIL,
  roleCode: "SUPPLIER_E2E_LOCKED",
  requestedModules: ["sales"],
  absentModule: "purchasing",
  permissions: [...PERMISSIONS],
});

function expandEnvValue(value) {
  return value.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)}/g,
    (_, key) => process.env[key] ?? "",
  );
}

function resolvedDatabaseUrl(env = process.env) {
  const candidate = expandEnvValue(
    env.DIRECT_URL ??
      env.DATABASE_URL ??
      env.AQSTOQFLOW_SUPPLIER_E2E_DATABASE_URL ??
      "",
  );
  if (
    candidate.startsWith("postgres://") ||
    candidate.startsWith("postgresql://")
  ) {
    return candidate;
  }

  const host = env.DB_HOST ?? env.PGHOST ?? "127.0.0.1";
  const port = env.DB_PORT ?? env.PGPORT ?? "5432";
  const user = env.DB_USER ?? env.PGUSER ?? "postgres";
  const password = env.DB_PASSWORD ?? env.PGPASSWORD ?? "";
  const database =
    env.DB_NAME ?? env.PGDATABASE ?? env.SUPPLIER_E2E_DATABASE ?? "dbakesman";
  const auth =
    encodeURIComponent(user) +
    (password ? ":" + encodeURIComponent(password) : "");
  return "postgresql://" + auth + "@" + host + ":" + port + "/" + database;
}

async function assertOwnedOrganization(prisma) {
  const organization = await prisma.organization.findUnique({
    where: { id: ORGANIZATION_ID },
    select: { id: true, onboardingSource: true },
  });
  if (organization && organization.onboardingSource !== ONBOARDING_SOURCE) {
    throw new Error(
      "Refusing to replace or delete non-fixture organization " +
        organization.id +
        ".",
    );
  }
}

async function cleanupSupplierLockedFixture(prisma) {
  const databaseUrl = resolvedDatabaseUrl();
  assertLocalFixtureAllowed(process.env, databaseUrl);
  await assertOwnedOrganization(prisma);
  await prisma.organization.deleteMany({
    where: {
      id: ORGANIZATION_ID,
      onboardingSource: ONBOARDING_SOURCE,
    },
  });
  await prisma.verification.deleteMany({ where: { identifier: EMAIL } });

  const residual = {
    organizations: await prisma.organization.count({
      where: { id: ORGANIZATION_ID },
    }),
    users: await prisma.user.count({ where: { email: EMAIL } }),
  };
  if (Object.values(residual).some((count) => count !== 0)) {
    throw new Error(
      "Supplier locked E2E cleanup left fixture rows: " +
        JSON.stringify(residual),
    );
  }
  return residual;
}

async function seedSupplierLockedFixture(prisma) {
  const databaseUrl = resolvedDatabaseUrl();
  assertLocalFixtureAllowed(process.env, databaseUrl);
  await cleanupSupplierLockedFixture(prisma);
  const now = new Date();
  const passwordHash = await argon2.hash(PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        id: ORGANIZATION_ID,
        name: "Stoquify Supplier E2E Locked",
        slug: "stoquify-supplier-e2e-locked",
        industry: "Synthetic browser validation",
        country: "Cameroon",
        countryCode: "CM",
        currency: "XAF",
        timezone: "Africa/Douala",
        defaultLocale: Locale.EN,
        requestedModules: ["sales"],
        onboardingSource: ONBOARDING_SOURCE,
        onboardingCompletedAt: now,
        isActive: true,
        updatedAt: now,
      },
    });
    const role = await tx.role.create({
      data: {
        code: "SUPPLIER_E2E_LOCKED",
        nameEn: "Supplier E2E Locked User",
        nameFr: "Utilisateur E2E fournisseurs verrouille",
        description:
          "Authenticated supplier-history role whose tenant lacks Purchasing.",
        permissions: PERMISSIONS,
        organizationId: organization.id,
        updatedAt: now,
      },
    });
    const user = await tx.user.create({
      data: {
        id: USER_ID,
        email: EMAIL,
        firstName: "Supplier",
        lastName: "Locked",
        name: "Supplier Locked",
        jobTitle: "Synthetic supplier module-lock verifier",
        password: passwordHash,
        emailVerified: true,
        isVerified: true,
        isActive: true,
        isLocked: false,
        failedLoginAttempts: 0,
        preferredLocale: Locale.EN,
        organizationId: organization.id,
        roles: { connect: { id: role.id } },
        updatedAt: now,
      },
    });
    await tx.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: passwordHash,
        scope: "profile email",
        updatedAt: now,
      },
    });

    return {
      fixtureSource: FIXTURE_SOURCE,
      productionBackfill: false,
      organizationId: organization.id,
      userId: user.id,
      email: user.email,
      roleCode: role.code,
      requestedModules: ["sales"],
      absentModule: "purchasing",
      permissions: PERMISSIONS,
    };
  });
}

async function main() {
  const mode = String(process.argv[2] ?? "seed")
    .trim()
    .toLowerCase();
  if (!new Set(["seed", "cleanup"]).has(mode)) {
    throw new Error("Unsupported supplier locked E2E fixture mode: " + mode);
  }
  const databaseUrl = resolvedDatabaseUrl();
  assertLocalFixtureAllowed(process.env, databaseUrl);
  process.env.DATABASE_URL = databaseUrl;
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    const result =
      mode === "cleanup"
        ? await cleanupSupplierLockedFixture(prisma)
        : await seedSupplierLockedFixture(prisma);
    console.log(JSON.stringify({ mode, ...result }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  cleanupSupplierLockedFixture,
  seedSupplierLockedFixture,
  SUPPLIER_LOCKED_E2E_FIXTURE_CONTRACT,
};
