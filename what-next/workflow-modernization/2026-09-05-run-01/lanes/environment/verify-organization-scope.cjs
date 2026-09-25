"use strict";
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { randomUUID, createHash } = require("node:crypto");
const ROOT = path.resolve(__dirname, "../../../../.."); process.chdir(ROOT);
const helper = require(path.join(ROOT, "scripts/modern-modules-local-verification.js"));
const { PrismaClient } = require("@prisma/client");
const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), helper.DATABASE_NAME);
assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname));
process.env.DATABASE_URL = target.toString(); process.env.DIRECT_URL = target.toString(); process.env.NODE_ENV = "test";
const db = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [] });
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "commonjs", moduleResolution: "node", jsx: "react-jsx" });
require(path.join(ROOT, "scripts/server-only-node-shim.js")); require("ts-node/register/transpile-only"); require("tsconfig-paths/register");
const attempt = randomUUID().slice(0, 8);
const files = ["services/organization/organization-settings.service.ts", "prisma/schema.prisma"];
const sha = data => createHash("sha256").update(data).digest("hex");
const sources = () => Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
const receipt = { attempt, startedAt: new Date().toISOString(), sourcesBefore: sources(), database: helper.DATABASE_NAME, checks: [], readOnly: true, boundary: "Real organization-listing service and PostgreSQL queries, pinned to one READ ONLY transaction. Permission arrays are service inputs, not grants or authenticated sessions. The action/session authorization boundary is outside this proof." };
(async () => {
  await db.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const connection = (await tx.$queryRaw`SELECT current_database() AS database, current_setting('transaction_read_only') AS readonly, pg_backend_pid() AS pid`)[0];
    assert.equal(connection.database, helper.DATABASE_NAME); assert.equal(connection.readonly, "on"); receipt.connection = connection;
    const ids = ["org_modules_legacy_en_desktop", "org_modules_retailer_en_desktop"];
    const organizations = await tx.organization.findMany({ where: { id: { in: ids } }, select: { id: true, onboardingSource: true, deletedAt: true } });
    assert.equal(organizations.length, 2); assert.ok(organizations.every(row => row.onboardingSource === helper.FIXTURE_SOURCE && !row.deletedAt));
    // Test-only transaction adapter: the imported production service uses this actual Prisma transaction.
    globalThis.prisma = tx;
    const { getOrganizationManagementRowsForActor } = require(path.join(ROOT, "services/organization/organization-settings.service.ts"));
    for (const organizationId of ids) {
      const expected = {};
      for (const [field, model] of [["usersCount", "user"], ["itemsCount", "item"], ["locationsCount", "location"], ["suppliersCount", "supplier"], ["customersCount", "customer"], ["purchaseOrdersCount", "purchaseOrder"], ["salesOrdersCount", "salesOrder"], ["paymentsCount", "payment"]]) expected[field] = await tx[model].count({ where: { organizationId } });
      const paid = await tx.payment.aggregate({ where: { organizationId, deletedAt: null, status: "PAID" }, _sum: { amount: true }, _count: { _all: true } });
      expected.paidRevenue = Number(paid._sum.amount ?? 0);
      for (const permissions of [["system.organization.read"], ["COMPANY_READ"], ["*"]]) {
        const rows = await getOrganizationManagementRowsForActor({ organizationId, actor: { permissions } });
        assert.equal(rows.length, 1); assert.equal(rows[0].id, organizationId);
        for (const [field, value] of Object.entries(expected)) assert.equal(rows[0][field], value);
        receipt.checks.push({ organizationId, serviceInputPermissions: permissions, returnedIds: rows.map(row => row.id), counts: expected, realPaidPaymentCount: paid._count._all, passed: true });
      }
    }
    const missingId = "org_modules_missing_workflow_scope_20260905";
    assert.equal(await tx.organization.count({ where: { id: missingId } }), 0);
    assert.deepEqual(await getOrganizationManagementRowsForActor({ organizationId: missingId, actor: { permissions: ["*"] } }), []);
    receipt.checks.push({ name: "Missing requested tenant does not return other tenants", passed: true });
    assert.equal((await tx.$queryRaw`SELECT current_setting('transaction_read_only') AS readonly`)[0].readonly, "on");
  }, { timeout: 30000, isolationLevel: "RepeatableRead" });
})().catch(error => { receipt.error = error.name + ": " + String(error.message).split(target.toString()).join("[redacted]").slice(0, 1200); }).finally(async () => {
  await db.$disconnect(); receipt.completedAt = new Date().toISOString(); receipt.sourcesAfter = sources(); receipt.sourceStable = JSON.stringify(receipt.sourcesBefore) === JSON.stringify(receipt.sourcesAfter); receipt.driverSha256 = sha(fs.readFileSync(__filename)); receipt.passed = receipt.checks.filter(item => item.passed).length; receipt.failed = Number(Boolean(receipt.error));
  const file = path.join(__dirname, `organization-scope-${attempt}.json`); fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" }); console.log(JSON.stringify({ passed: receipt.passed, failed: receipt.failed, evidence: path.relative(ROOT, file) })); if (receipt.failed) process.exitCode = 1;
});
