import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import {
  seedComprehensiveCoverageData,
  verifyComprehensiveCoverageCounts,
} from "./comprehensive-seed-coverage";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function assertSafeLocalTarget() {
  const configured = process.env.DATABASE_URL?.trim();
  if (!configured || process.env.NODE_ENV === "production") {
    throw new Error("Coverage completion requires a non-production DATABASE_URL.");
  }
  const target = new URL(configured);
  const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ""));
  if (
    !LOCAL_HOSTS.has(target.hostname.toLowerCase()) ||
    !/(?:dev|test|local|reconcile|referral)/i.test(databaseName)
  ) {
    throw new Error("Coverage completion is restricted to an explicitly named local development database.");
  }
}

async function main() {
  assertSafeLocalTarget();
  const prisma = new PrismaClient();
  try {
    const organizations = await prisma.organization.count({
      where: { id: { startsWith: "rds_org_" } },
    });
    if (organizations !== 2) {
      throw new Error(`Expected two rds_ organizations, found ${organizations}.`);
    }
    await seedComprehensiveCoverageData(prisma);
    await verifyComprehensiveCoverageCounts(prisma);
    console.log("Realistic seed coverage is complete; existing rows were preserved.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Realistic seed coverage completion failed:", error);
  process.exitCode = 1;
});
