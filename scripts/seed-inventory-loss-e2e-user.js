#!/usr/bin/env node

const { createHash } = require("crypto");
const { existsSync, readFileSync } = require("fs");
const { resolve } = require("path");
const argon2 = require("argon2");
const {
  AdjustmentStatus,
  AdjustmentType,
  Locale,
  PrismaClient,
  UnitType,
} = require("@prisma/client");

function expandEnvValue(value) {
  return value.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)}/g,
    (_, key) => process.env[key] || "",
  );
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
      process.env[match[1]] = expandEnvValue(value).replace(/\\n/g, "\n");
    }
  }

  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    if (process.env[key]?.includes("$" + "{")) {
      process.env[key] = expandEnvValue(process.env[key]);
    }
  }
}

loadLocalEnv();

const DEMO_ONLY_NOTICE =
  "Local-only inventory-loss browser fixture. This is not production inventory truth or a production backfill.";
const ORGANIZATION_ID =
  process.env.AQSTOQFLOW_INVENTORY_LOSS_E2E_ORG_ID ||
  "org_inventory_loss_e2e_local";
const ORGANIZATION_SLUG =
  process.env.AQSTOQFLOW_INVENTORY_LOSS_E2E_ORG_SLUG ||
  "stoquify-inventory-loss-e2e-local";
const USER_ID =
  process.env.AQSTOQFLOW_INVENTORY_LOSS_E2E_USER_ID ||
  "usr_inventory_loss_e2e_local";
const EMAIL = (
  process.env.AQSTOQFLOW_INVENTORY_LOSS_E2E_EMAIL ||
  "inventory.loss@stockflow.test"
)
  .trim()
  .toLowerCase();
const PASSWORD =
  process.env.AQSTOQFLOW_INVENTORY_LOSS_E2E_PASSWORD || "InventoryLoss@2026";
const ROLE_CODE = "admin";
const REQUIRED_PERMISSIONS = ["dashboard.read", "inventory.levels.read"];
const REQUESTED_MODULES = ["inventory"];
const UNIT_ID = "unit_inventory_loss_e2e_each";
const LOCATIONS = [
  {
    id: "loc_inventory_loss_e2e_douala",
    code: "LOSS-DLA",
    name: "Douala Loss Control",
    isDefault: true,
  },
  {
    id: "loc_inventory_loss_e2e_bafoussam",
    code: "LOSS-BFM",
    name: "Bafoussam Loss Control",
    isDefault: false,
  },
];
const ITEMS = [
  {
    id: "item_inventory_loss_e2e_cocoa",
    slug: "inventory-loss-e2e-cocoa",
    sku: "LOSS-COCOA-001",
    nameEn: "Cocoa cartons",
    nameFr: "Cartons de cacao",
    costPrice: "1500.00",
    sellingPrice: "2200.00",
  },
  {
    id: "item_inventory_loss_e2e_milk",
    slug: "inventory-loss-e2e-milk",
    sku: "LOSS-MILK-002",
    nameEn: "Powdered milk tins",
    nameFr: "Boites de lait en poudre",
    costPrice: "2500.00",
    sellingPrice: "3400.00",
  },
];

const INVENTORY_LOSS_E2E_FIXTURE_CONTRACT = Object.freeze({
  fixtureSource: "scripts/seed-inventory-loss-e2e-user.js",
  fixturePurpose: "authenticated inventory-loss browser certification",
  productionBackfill: false,
  organizationId: ORGANIZATION_ID,
  roleCode: ROLE_CODE,
  requestedModules: [...REQUESTED_MODULES],
  requiredPermissions: [...REQUIRED_PERMISSIONS],
});

function assertLocalSeedAllowed(env = process.env) {
  const productionMarkers = [
    env.NODE_ENV,
    env.AQSTOQFLOW_ENV,
    env.VERCEL_ENV,
  ].map((value) =>
    String(value || "")
      .trim()
      .toLowerCase(),
  );

  if (productionMarkers.includes("production")) {
    throw new Error(
      DEMO_ONLY_NOTICE +
        " Refusing to run while an environment marker is production.",
    );
  }
}

function sha256(value) {
  return "sha256:" + createHash("sha256").update(String(value)).digest("hex");
}

function fixtureMetadata(extra = {}) {
  return {
    demoOnly: true,
    productionBackfill: false,
    fixtureSource: INVENTORY_LOSS_E2E_FIXTURE_CONTRACT.fixtureSource,
    fixturePurpose: INVENTORY_LOSS_E2E_FIXTURE_CONTRACT.fixturePurpose,
    warning: DEMO_ONLY_NOTICE,
    ...extra,
  };
}

function utcDaysAgo(now, days) {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - days,
      12,
    ),
  );
}

async function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function upsertById(tx, delegateName, create) {
  const update = { ...create };
  delete update.id;
  return tx[delegateName].upsert({
    where: { id: create.id },
    update,
    create,
  });
}
async function main() {
  assertLocalSeedAllowed();

  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "AQSTOQFLOW_INVENTORY_LOSS_E2E_EMAIL and AQSTOQFLOW_INVENTORY_LOSS_E2E_PASSWORD must be non-empty.",
    );
  }

  const prisma = new PrismaClient();
  const now = new Date();
  const passwordHash = await hashPassword(PASSWORD);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.upsert({
        where: { id: ORGANIZATION_ID },
        update: {
          name: "Stoquify Inventory Loss E2E",
          slug: ORGANIZATION_SLUG,
          industry: "Local browser validation",
          country: "Cameroon",
          countryCode: "CM",
          currency: "XAF",
          timezone: "Africa/Douala",
          defaultLocale: Locale.EN,
          requestedModules: { set: REQUESTED_MODULES },
          onboardingSource: "local-playwright-inventory-loss",
          onboardingCompletedAt: now,
          isActive: true,
          deletedAt: null,
          updatedAt: now,
        },
        create: {
          id: ORGANIZATION_ID,
          name: "Stoquify Inventory Loss E2E",
          slug: ORGANIZATION_SLUG,
          industry: "Local browser validation",
          country: "Cameroon",
          countryCode: "CM",
          currency: "XAF",
          timezone: "Africa/Douala",
          defaultLocale: Locale.EN,
          requestedModules: REQUESTED_MODULES,
          onboardingSource: "local-playwright-inventory-loss",
          onboardingCompletedAt: now,
          isActive: true,
          updatedAt: now,
        },
      });

      const role = await tx.role.upsert({
        where: {
          organizationId_code: {
            organizationId: organization.id,
            code: ROLE_CODE,
          },
        },
        update: {
          nameEn: "Inventory Loss E2E Administrator",
          nameFr: "Administrateur E2E des pertes de stock",
          description:
            "Local-only administrator role for authenticated inventory-loss browser certification.",
          permissions: { set: REQUIRED_PERMISSIONS },
          updatedAt: now,
        },
        create: {
          code: ROLE_CODE,
          nameEn: "Inventory Loss E2E Administrator",
          nameFr: "Administrateur E2E des pertes de stock",
          description:
            "Local-only administrator role for authenticated inventory-loss browser certification.",
          permissions: REQUIRED_PERMISSIONS,
          organizationId: organization.id,
          updatedAt: now,
        },
      });

      const existingUser = await tx.user.findUnique({
        where: { email: EMAIL },
        select: { id: true, organizationId: true },
      });
      if (existingUser && existingUser.organizationId !== organization.id) {
        throw new Error(
          "Refusing to move existing user " +
            EMAIL +
            " from " +
            existingUser.organizationId +
            " to " +
            organization.id +
            ". Use a different AQSTOQFLOW_INVENTORY_LOSS_E2E_EMAIL.",
        );
      }

      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              firstName: "Inventory",
              lastName: "Verifier",
              name: "Inventory Loss E2E",
              jobTitle: "Inventory control verifier",
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
              id: USER_ID,
              email: EMAIL,
              firstName: "Inventory",
              lastName: "Verifier",
              name: "Inventory Loss E2E",
              jobTitle: "Inventory control verifier",
              password: passwordHash,
              emailVerified: true,
              isVerified: true,
              isActive: true,
              isLocked: false,
              lockedUntil: null,
              failedLoginAttempts: 0,
              lastFailedLogin: null,
              preferredLocale: Locale.EN,
              organizationId: organization.id,
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
      await tx.session.deleteMany({ where: { userId: user.id } });

      for (const location of LOCATIONS) {
        await upsertById(tx, "location", {
          ...location,
          organizationId: organization.id,
          managerId: null,
          isActive: true,
          deletedAt: null,
          updatedAt: now,
        });
      }

      await upsertById(tx, "unit", {
        id: UNIT_ID,
        symbol: "ea",
        type: UnitType.QUANTITY,
        nameEn: "each",
        nameFr: "unite",
        isActive: true,
        organizationId: organization.id,
        updatedAt: now,
      });

      for (const item of ITEMS) {
        await upsertById(tx, "item", {
          ...item,
          imageUrls: [],
          unitId: UNIT_ID,
          trackInventory: true,
          isActive: true,
          isDiscontinued: false,
          deletedAt: null,
          organizationId: organization.id,
          updatedAt: now,
        });
      }

      const sourceSpecs = [
        {
          adjustmentId: "adj_inventory_loss_e2e_damaged",
          lineId: "line_inventory_loss_e2e_damaged",
          number: "LOSS-E2E-DAMAGED",
          type: AdjustmentType.DAMAGED,
          reason: "Damaged cartons recorded during receiving review",
          daysAgo: 4,
          locationId: LOCATIONS[0].id,
          itemId: ITEMS[0].id,
          systemQuantity: "40.000",
          actualQuantity: "36.000",
          adjustedQuantity: "-4.000",
          unitCost: "1500.00",
          totalCost: "-6000.00",
          evidenceComplete: true,
        },
        {
          adjustmentId: "adj_inventory_loss_e2e_expired",
          lineId: "line_inventory_loss_e2e_expired",
          number: "LOSS-E2E-EXPIRED",
          type: AdjustmentType.EXPIRED,
          reason: "Expired tins isolated during shelf rotation",
          daysAgo: 9,
          locationId: LOCATIONS[1].id,
          itemId: ITEMS[1].id,
          systemQuantity: "24.000",
          actualQuantity: "22.000",
          adjustedQuantity: "-2.000",
          unitCost: "2500.00",
          totalCost: "-5000.00",
          evidenceComplete: true,
        },
        {
          adjustmentId: "adj_inventory_loss_e2e_partial",
          lineId: "line_inventory_loss_e2e_partial",
          number: "LOSS-E2E-PARTIAL",
          type: AdjustmentType.PHYSICAL_COUNT,
          reason: "Historical count variance awaiting supporting evidence",
          daysAgo: 45,
          locationId: LOCATIONS[0].id,
          itemId: ITEMS[0].id,
          systemQuantity: "18.000",
          actualQuantity: "17.000",
          adjustedQuantity: "-1.000",
          unitCost: null,
          totalCost: null,
          evidenceComplete: false,
        },
      ];

      for (const spec of sourceSpecs) {
        const adjustmentDate = utcDaysAgo(now, spec.daysAgo);
        const adjustmentEvidenceHash = spec.evidenceComplete
          ? sha256(spec.adjustmentId + ":adjustment-evidence")
          : null;
        const documentHash = spec.evidenceComplete
          ? sha256(spec.adjustmentId + ":document")
          : null;
        const lineEvidenceHash = spec.evidenceComplete
          ? sha256(spec.lineId + ":line-evidence")
          : null;
        const approvingUserId = spec.evidenceComplete ? user.id : null;

        await tx.stockAdjustment.upsert({
          where: { id: spec.adjustmentId },
          update: {
            adjustmentNumber: spec.number,
            type: spec.type,
            reason: spec.reason,
            status: AdjustmentStatus.COMPLETED,
            adjustmentDate,
            notes: DEMO_ONLY_NOTICE,
            deletedAt: null,
            locationId: spec.locationId,
            organizationId: organization.id,
            createdById: user.id,
            approvedById: approvingUserId,
            approvedAt: approvingUserId ? adjustmentDate : null,
            evidenceHash: adjustmentEvidenceHash,
            documentHash,
            metadata: fixtureMetadata({
              evidenceState: spec.evidenceComplete ? "complete" : "partial",
            }),
            updatedAt: now,
          },
          create: {
            id: spec.adjustmentId,
            adjustmentNumber: spec.number,
            type: spec.type,
            reason: spec.reason,
            status: AdjustmentStatus.COMPLETED,
            adjustmentDate,
            notes: DEMO_ONLY_NOTICE,
            locationId: spec.locationId,
            organizationId: organization.id,
            createdById: user.id,
            approvedById: approvingUserId,
            approvedAt: approvingUserId ? adjustmentDate : null,
            evidenceHash: adjustmentEvidenceHash,
            documentHash,
            metadata: fixtureMetadata({
              evidenceState: spec.evidenceComplete ? "complete" : "partial",
            }),
            updatedAt: now,
          },
        });

        await tx.stockAdjustmentLine.upsert({
          where: { id: spec.lineId },
          update: {
            adjustmentId: spec.adjustmentId,
            itemId: spec.itemId,
            systemQuantity: spec.systemQuantity,
            actualQuantity: spec.actualQuantity,
            adjustedQuantity: spec.adjustedQuantity,
            unitCost: spec.unitCost,
            totalCost: spec.totalCost,
            notes: DEMO_ONLY_NOTICE,
            evidenceHash: lineEvidenceHash,
            metadata: fixtureMetadata({
              evidenceState: spec.evidenceComplete ? "complete" : "partial",
            }),
            updatedAt: now,
          },
          create: {
            id: spec.lineId,
            adjustmentId: spec.adjustmentId,
            itemId: spec.itemId,
            systemQuantity: spec.systemQuantity,
            actualQuantity: spec.actualQuantity,
            adjustedQuantity: spec.adjustedQuantity,
            unitCost: spec.unitCost,
            totalCost: spec.totalCost,
            notes: DEMO_ONLY_NOTICE,
            evidenceHash: lineEvidenceHash,
            metadata: fixtureMetadata({
              evidenceState: spec.evidenceComplete ? "complete" : "partial",
            }),
            updatedAt: now,
          },
        });
      }

      return {
        organizationId: organization.id,
        userId: user.id,
        email: user.email,
        roleCode: role.code,
        requestedModules: REQUESTED_MODULES,
        permissions: REQUIRED_PERMISSIONS,
        sourceRecordCount: sourceSpecs.length,
        completePeriodRecordCount: sourceSpecs.filter(
          (spec) => spec.daysAgo <= 30,
        ).length,
        partialPeriodRecordCount: sourceSpecs.filter(
          (spec) => spec.daysAgo > 30,
        ).length,
        productionBackfill: false,
      };
    });

    console.log(JSON.stringify(result, null, 2));
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
  assertLocalSeedAllowed,
  INVENTORY_LOSS_E2E_FIXTURE_CONTRACT,
};
