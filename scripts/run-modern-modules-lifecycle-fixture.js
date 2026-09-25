#!/usr/bin/env node
"use strict";
const { PrismaClient } = require("@prisma/client");
const { targetUrl, FIXTURES } = require("./modern-modules-local-verification");

async function main() {
  const [, , fixtureKey, stage] = process.argv;
  if (process.argv.length !== 4 || process.env.MODERN_MODULES_LOCAL_VERIFICATION !== "1") throw new Error("Fixture command must run within isolated browser verification.");
  const fixture = FIXTURES.find(value => value.key === fixtureKey);
  if (!fixture || !["waiting", "accounting", "provider", "pos", "inventory-denial"].includes(stage)) throw new Error("Unknown isolated fixture or preparation stage.");
  const target = targetUrl();
  process.env.DATABASE_URL = target.toString();
  process.env.DIRECT_URL = target.toString();
  process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "commonjs", moduleResolution: "node" });
  const prisma = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [] });
  globalThis.prisma = prisma;
  require("./server-only-node-shim");
  require("ts-node/register/transpile-only");
  require("tsconfig-paths/register");
  try {
    const { prepareModernModulesLifecycleFixture } = require("./modern-modules-lifecycle-fixture.ts");
    await prepareModernModulesLifecycleFixture(prisma, fixture.organizationId, stage);
    console.log(JSON.stringify({ fixture: fixture.key, stage, synthetic: true, productionApproval: false }));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => {
  console.error(error.code ? `Synthetic lifecycle fixture failed (${error.code}).` : String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL redacted]"));
  process.exitCode = 1;
});
