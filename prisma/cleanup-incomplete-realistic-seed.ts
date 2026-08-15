import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function assertSafeLocalTarget() {
  const configured = process.env.DATABASE_URL?.trim();
  if (!configured || process.env.NODE_ENV === "production") {
    throw new Error("Incomplete seed cleanup requires a non-production DATABASE_URL.");
  }
  const target = new URL(configured);
  const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ""));
  if (
    !LOCAL_HOSTS.has(target.hostname.toLowerCase()) ||
    !/(?:dev|test|local|reconcile|referral)/i.test(databaseName)
  ) {
    throw new Error("Incomplete seed cleanup is restricted to an explicitly named local development database.");
  }
}

async function main() {
  assertSafeLocalTarget();
  const prisma = new PrismaClient();
  try {
    const organizations = await prisma.organization.count({
      where: { id: { startsWith: "rds_org_" } },
    });
    const immutableEvidence = await prisma.payrollDeclarationEvidence.count({
      where: { organizationId: { startsWith: "rds_org_" } },
    });
    if (organizations === 0) {
      console.log("No incomplete rds_ seed organizations exist.");
      return;
    }
    if (immutableEvidence > 0) {
      throw new Error(
        "Refusing cleanup because immutable rds_ payroll evidence exists. Preserve the dataset and use a fresh database.",
      );
    }
  } finally {
    await prisma.$disconnect();
  }

  const { clearSeededData, disconnectComprehensiveSeed } = await import(
    "./comprehensive-seed"
  );
  try {
    await clearSeededData();
    console.log("Incomplete synthetic rds_ seed records removed; npm run seed can recreate them.");
  } finally {
    await disconnectComprehensiveSeed();
  }
}

main().catch((error) => {
  console.error("Incomplete realistic seed cleanup failed:", error);
  process.exitCode = 1;
});
