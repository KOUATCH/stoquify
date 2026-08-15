"use strict";

const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const argon2 = require("argon2");
const {
  Locale,
  LocationType,
  PaymentStatus,
  PrismaClient,
  SalesOrderStatus,
} = require("@prisma/client");

function expandEnvValue(value) {
  return value.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g,
    (_, key) => process.env[key] || "",
  );
}

function loadLocalEnv() {
  for (const fileName of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), fileName);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim();
      if (process.env[key]) continue;
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = expandEnvValue(value);
    }
  }
}

loadLocalEnv();

const NOTICE =
  "Local/CI-only synthetic customer browser fixture; never production customer truth.";
const FIXTURE_SOURCE = "scripts/customer-e2e-fixture.js";
const ONBOARDING_SOURCE = "local-playwright-customer";
const ORGANIZATION_ID =
  process.env.AQSTOQFLOW_CUSTOMER_E2E_ORG_ID || "org_customer_e2e_local";
const FOREIGN_ORGANIZATION_ID =
  process.env.AQSTOQFLOW_CUSTOMER_E2E_FOREIGN_ORG_ID ||
  "org_customer_e2e_foreign";
const LOCKED_ORGANIZATION_ID =
  process.env.AQSTOQFLOW_CUSTOMER_E2E_LOCKED_ORG_ID ||
  "org_customer_e2e_locked";
const EMAIL = (
  process.env.AQSTOQFLOW_CUSTOMER_E2E_EMAIL || "customer.admin@stockflow.test"
)
  .trim()
  .toLowerCase();
const DENIED_EMAIL = (
  process.env.AQSTOQFLOW_CUSTOMER_E2E_DENIED_EMAIL ||
  "customer.denied@stockflow.test"
)
  .trim()
  .toLowerCase();
const LOCKED_EMAIL = (
  process.env.AQSTOQFLOW_CUSTOMER_E2E_LOCKED_EMAIL ||
  "customer.locked@stockflow.test"
)
  .trim()
  .toLowerCase();
const PASSWORD =
  process.env.AQSTOQFLOW_CUSTOMER_E2E_PASSWORD || "CustomerE2E@2026";
const DENIED_PASSWORD =
  process.env.AQSTOQFLOW_CUSTOMER_E2E_DENIED_PASSWORD || PASSWORD;
const LOCKED_PASSWORD =
  process.env.AQSTOQFLOW_CUSTOMER_E2E_LOCKED_PASSWORD || PASSWORD;
const PERMITTED_USER_ID = "usr_customer_e2e_local";
const PRIMARY_CUSTOMER_ID = "customer_customer_e2e_primary";
const EMPTY_CUSTOMER_ID = "customer_customer_e2e_empty";
const FOREIGN_CUSTOMER_ID = "customer_customer_e2e_foreign";
const LOCATION_ID = "location_customer_e2e_local";
const ORDER_ID = "sales_order_customer_e2e_primary";
const REQUIRED_PERMISSIONS = [
  "dashboard.read",
  "customers.read",
  "customers.create",
  "customers.update",
  "customers.delete",
  "customers.analytics.read",
  "customers.orders.read",
  "customers.export",
  "sales.read",
  "finance.read",
  "finance.receivables.read",
  "accounting.exports.create",
];
const DENIED_PERMISSIONS = ["dashboard.read"];
const LOCKED_PERMISSIONS = [
  "dashboard.read",
  "customers.read",
  "customers.analytics.read",
  "customers.orders.read",
  "accounting.exports.create",
];

const CUSTOMER_E2E_FIXTURE_CONTRACT = Object.freeze({
  fixtureSource: FIXTURE_SOURCE,
  fixturePurpose: "authenticated customer workflow browser verification",
  productionBackfill: false,
  organizationId: ORGANIZATION_ID,
  foreignOrganizationId: FOREIGN_ORGANIZATION_ID,
  lockedOrganizationId: LOCKED_ORGANIZATION_ID,
  roleCode: "CUSTOMER_E2E_ADMIN",
  deniedRoleCode: "CUSTOMER_E2E_DENIED",
  lockedRoleCode: "CUSTOMER_E2E_LOCKED",
  primaryCustomerId: PRIMARY_CUSTOMER_ID,
  emptyCustomerId: EMPTY_CUSTOMER_ID,
  foreignCustomerId: FOREIGN_CUSTOMER_ID,
  requestedModules: ["sales", "accounting", "finance", "reports"],
  lockedRequestedModules: ["sales"],
  requiredPermissions: [...REQUIRED_PERMISSIONS],
  deniedPermissions: [...DENIED_PERMISSIONS],
  lockedPermissions: [...LOCKED_PERMISSIONS],
});

function resolvedDatabaseUrl(env = process.env) {
  const candidate = expandEnvValue(
    env.DIRECT_URL ||
      env.DATABASE_URL ||
      env.AQSTOQFLOW_CUSTOMER_E2E_DATABASE_URL ||
      "",
  );
  if (
    candidate.startsWith("postgres://") ||
    candidate.startsWith("postgresql://")
  )
    return candidate;
  const host = env.DB_HOST || env.PGHOST || "127.0.0.1";
  const port = env.DB_PORT || env.PGPORT || "5432";
  const user = env.DB_USER || env.PGUSER || "postgres";
  const password = env.DB_PASSWORD || env.PGPASSWORD || "";
  const database =
    env.DB_NAME || env.PGDATABASE || env.CUSTOMER_E2E_DATABASE || "dbakesman";
  const auth =
    encodeURIComponent(user) +
    (password ? ":" + encodeURIComponent(password) : "");
  return "postgresql://" + auth + "@" + host + ":" + port + "/" + database;
}

function assertLocalFixtureAllowed(
  env = process.env,
  databaseUrl = "postgresql://postgres@127.0.0.1:5432/stoquify",
) {
  const markers = [env.NODE_ENV, env.AQSTOQFLOW_ENV, env.VERCEL_ENV].map(
    (value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
  );
  if (markers.includes("production")) {
    throw new Error(
      NOTICE +
        " Refusing to seed or delete fixtures while an environment marker is production.",
    );
  }
  const hostname = new URL(databaseUrl).hostname.toLowerCase();
  if (
    !new Set(["127.0.0.1", "localhost", "::1", "[::1]"]).has(hostname) &&
    env.AQSTOQFLOW_CUSTOMER_E2E_ALLOW_NONLOCAL !== "1"
  ) {
    throw new Error(
      NOTICE +
        " Refusing a nonlocal database without AQSTOQFLOW_CUSTOMER_E2E_ALLOW_NONLOCAL=1.",
    );
  }
}

async function assertOwnedOrganizations(prisma) {
  const ids = [
    ORGANIZATION_ID,
    FOREIGN_ORGANIZATION_ID,
    LOCKED_ORGANIZATION_ID,
  ];
  const organizations = await prisma.organization.findMany({
    where: { id: { in: ids } },
    select: { id: true, onboardingSource: true },
  });
  for (const organization of organizations) {
    if (organization.onboardingSource !== ONBOARDING_SOURCE) {
      throw new Error(
        "Refusing to replace or delete non-fixture organization " +
          organization.id +
          ".",
      );
    }
  }
}

async function cleanupCustomerFixture(prisma) {
  assertLocalFixtureAllowed(process.env, resolvedDatabaseUrl());
  await assertOwnedOrganizations(prisma);
  const ids = [
    ORGANIZATION_ID,
    FOREIGN_ORGANIZATION_ID,
    LOCKED_ORGANIZATION_ID,
  ];
  await prisma.salesOrder.deleteMany({
    where: { organizationId: { in: ids } },
  });
  await prisma.organization.deleteMany({
    where: { id: { in: ids }, onboardingSource: ONBOARDING_SOURCE },
  });
  await prisma.verification.deleteMany({
    where: { identifier: { in: [EMAIL, DENIED_EMAIL, LOCKED_EMAIL] } },
  });
  const residual = {
    organizations: await prisma.organization.count({
      where: { id: { in: ids } },
    }),
    users: await prisma.user.count({
      where: { email: { in: [EMAIL, DENIED_EMAIL, LOCKED_EMAIL] } },
    }),
    customers: await prisma.customer.count({
      where: { organizationId: { in: ids } },
    }),
    salesOrders: await prisma.salesOrder.count({
      where: { organizationId: { in: ids } },
    }),
  };
  if (Object.values(residual).some((count) => count !== 0)) {
    throw new Error(
      "Customer E2E cleanup left fixture rows: " + JSON.stringify(residual),
    );
  }
  return residual;
}

async function createUser(tx, input) {
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  const user = await tx.user.create({
    data: {
      id: input.id,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      name: input.firstName + " " + input.lastName,
      jobTitle: input.jobTitle,
      password: passwordHash,
      emailVerified: true,
      isVerified: true,
      isActive: true,
      isLocked: false,
      failedLoginAttempts: 0,
      preferredLocale: Locale.EN,
      organizationId: input.organizationId,
      roles: { connect: { id: input.roleId } },
      updatedAt: input.now,
    },
  });
  await tx.account.create({
    data: {
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: passwordHash,
      scope: "profile email",
      updatedAt: input.now,
    },
  });
  return user;
}

async function createOrganization(tx, input) {
  return tx.organization.create({
    data: {
      id: input.id,
      name: input.name,
      slug: input.slug,
      industry: "Synthetic browser validation",
      country: "Cameroon",
      countryCode: "CM",
      currency: "XAF",
      timezone: "Africa/Douala",
      defaultLocale: Locale.EN,
      requestedModules: input.requestedModules,
      onboardingSource: ONBOARDING_SOURCE,
      onboardingCompletedAt: input.now,
      isActive: true,
      updatedAt: input.now,
    },
  });
}

async function seedCustomerFixture(prisma) {
  assertLocalFixtureAllowed(process.env, resolvedDatabaseUrl());
  await cleanupCustomerFixture(prisma);
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const organization = await createOrganization(tx, {
      id: ORGANIZATION_ID,
      name: "Stoquify Customer E2E",
      slug: "stoquify-customer-e2e-local",
      requestedModules: ["sales", "accounting", "finance", "reports"],
      now,
    });
    const foreignOrganization = await createOrganization(tx, {
      id: FOREIGN_ORGANIZATION_ID,
      name: "Stoquify Customer E2E Foreign",
      slug: "stoquify-customer-e2e-foreign",
      requestedModules: ["sales"],
      now,
    });
    const lockedOrganization = await createOrganization(tx, {
      id: LOCKED_ORGANIZATION_ID,
      name: "Stoquify Customer E2E Locked",
      slug: "stoquify-customer-e2e-locked",
      requestedModules: ["sales"],
      now,
    });

    const role = await tx.role.create({
      data: {
        code: "CUSTOMER_E2E_ADMIN",
        nameEn: "Customer E2E Administrator",
        nameFr: "Administrateur E2E clients",
        description:
          "Local-only role for authenticated customer browser verification.",
        permissions: ["*", ...REQUIRED_PERMISSIONS],
        organizationId: organization.id,
        updatedAt: now,
      },
    });
    const deniedRole = await tx.role.create({
      data: {
        code: "CUSTOMER_E2E_DENIED",
        nameEn: "Customer E2E Denied User",
        nameFr: "Utilisateur E2E clients refuse",
        description: "Authenticated role without customer permissions.",
        permissions: DENIED_PERMISSIONS,
        organizationId: organization.id,
        updatedAt: now,
      },
    });
    const lockedRole = await tx.role.create({
      data: {
        code: "CUSTOMER_E2E_LOCKED",
        nameEn: "Customer E2E Locked User",
        nameFr: "Utilisateur E2E clients verrouille",
        description:
          "Authenticated role whose tenant has Sales but not Accounting.",
        permissions: LOCKED_PERMISSIONS,
        organizationId: lockedOrganization.id,
        updatedAt: now,
      },
    });

    const user = await createUser(tx, {
      id: PERMITTED_USER_ID,
      email: EMAIL,
      password: PASSWORD,
      firstName: "Customer",
      lastName: "Administrator",
      jobTitle: "Synthetic customer workflow verifier",
      organizationId: organization.id,
      roleId: role.id,
      now,
    });
    await createUser(tx, {
      id: "usr_customer_e2e_denied",
      email: DENIED_EMAIL,
      password: DENIED_PASSWORD,
      firstName: "Customer",
      lastName: "Denied",
      jobTitle: "Synthetic customer denial verifier",
      organizationId: organization.id,
      roleId: deniedRole.id,
      now,
    });
    await createUser(tx, {
      id: "usr_customer_e2e_locked",
      email: LOCKED_EMAIL,
      password: LOCKED_PASSWORD,
      firstName: "Customer",
      lastName: "Locked",
      jobTitle: "Synthetic customer entitlement verifier",
      organizationId: lockedOrganization.id,
      roleId: lockedRole.id,
      now,
    });

    const location = await tx.location.create({
      data: {
        id: LOCATION_ID,
        name: "Customer E2E Store",
        code: "CUS-E2E-STORE",
        type: LocationType.STORE,
        isActive: true,
        isDefault: true,
        organizationId: organization.id,
        updatedAt: now,
      },
    });
    await tx.customer.create({
      data: {
        id: PRIMARY_CUSTOMER_ID,
        name: "Playwright Tenant Customer",
        code: "CUS-E2E-PRIMARY",
        email: "customer.primary@stockflow.test",
        phone: "+237600000101",
        address: "Synthetic Avenue, Douala",
        taxId: "SYNTHETIC-CUSTOMER-TAX",
        creditLimit: "100000.00",
        paymentTerms: 30,
        notes: NOTICE,
        preferredLocale: Locale.EN,
        currentBalance: "45000.00",
        organizationId: organization.id,
        updatedAt: now,
      },
    });
    await tx.customer.create({
      data: {
        id: EMPTY_CUSTOMER_ID,
        name: "Playwright Empty Customer",
        code: "CUS-E2E-EMPTY",
        email: "customer.empty@stockflow.test",
        creditLimit: "0.00",
        paymentTerms: 15,
        notes: NOTICE,
        preferredLocale: Locale.FR,
        organizationId: organization.id,
        updatedAt: now,
      },
    });
    await tx.customer.create({
      data: {
        id: FOREIGN_CUSTOMER_ID,
        name: "Foreign Tenant Customer Must Not Appear",
        code: "CUS-E2E-FOREIGN",
        email: "customer.foreign@stockflow.test",
        notes: NOTICE,
        preferredLocale: Locale.EN,
        organizationId: foreignOrganization.id,
        updatedAt: now,
      },
    });
    await tx.salesOrder.create({
      data: {
        id: ORDER_ID,
        orderNumber: "SO-CUS-E2E-001",
        status: SalesOrderStatus.DELIVERED,
        orderDate: new Date("2026-08-01T09:00:00.000Z"),
        dueDate: new Date("2026-08-31T09:00:00.000Z"),
        notes: NOTICE,
        subtotal: "125000.00",
        total: "125000.00",
        paymentStatus: PaymentStatus.PENDING,
        customerId: PRIMARY_CUSTOMER_ID,
        locationId: location.id,
        organizationId: organization.id,
        createdById: user.id,
        updatedAt: now,
      },
    });

    return {
      fixtureSource: FIXTURE_SOURCE,
      productionBackfill: false,
      organizationId: organization.id,
      foreignOrganizationId: foreignOrganization.id,
      lockedOrganizationId: lockedOrganization.id,
      userId: user.id,
      email: user.email,
      permissions: REQUIRED_PERMISSIONS,
      primaryCustomerId: PRIMARY_CUSTOMER_ID,
      emptyCustomerId: EMPTY_CUSTOMER_ID,
      foreignCustomerId: FOREIGN_CUSTOMER_ID,
      salesOrderId: ORDER_ID,
    };
  });
}

async function main() {
  const mode = String(process.argv[2] || "seed")
    .trim()
    .toLowerCase();
  if (!new Set(["seed", "cleanup"]).has(mode))
    throw new Error("Unsupported customer E2E fixture mode: " + mode);
  const databaseUrl = resolvedDatabaseUrl();
  assertLocalFixtureAllowed(process.env, databaseUrl);
  process.env.DATABASE_URL = databaseUrl;
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    const result =
      mode === "cleanup"
        ? await cleanupCustomerFixture(prisma)
        : await seedCustomerFixture(prisma);
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
  assertLocalFixtureAllowed,
  cleanupCustomerFixture,
  seedCustomerFixture,
  CUSTOMER_E2E_FIXTURE_CONTRACT,
};
