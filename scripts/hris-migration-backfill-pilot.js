#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

for (const candidate of [".env.local", ".env"]) {
  const target = path.resolve(process.cwd(), candidate);
  if (fs.existsSync(target)) dotenv.config({ path: target, override: false });
}

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "commonjs",
  moduleResolution: "node",
});

require("ts-node/register/transpile-only");

const Module = require("module");
const rootDir = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;
const originalLoad = Module._load;

Module._resolveFilename = function hrisMigrationResolve(
  request,
  parent,
  isMain,
  options,
) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      path.join(rootDir, request.slice(2)),
      parent,
      isMain,
      options,
    );
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

Module._load = function hrisMigrationLoad(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};

const { db } = require("../prisma/db");
const {
  runHrisMigrationBackfillPilotCli,
} = require("./hris-migration-backfill-pilot.ts");

runHrisMigrationBackfillPilotCli(process.argv.slice(2))
  .then(({ exitCode }) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
