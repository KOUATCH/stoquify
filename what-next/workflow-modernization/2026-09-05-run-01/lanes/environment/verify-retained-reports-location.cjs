"use strict";
// Prepared only. `preflight` reads the guarded target; `run` creates uniquely owned synthetic records.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { randomUUID, createHash } = require("node:crypto");
const ROOT = path.resolve(__dirname, "../../../../.."); process.chdir(ROOT);
const guard = require(path.join(ROOT, "scripts/run-modern-modules-postgres-smoke.js"));
const { REQUIRED_MIGRATIONS } = require(path.join(ROOT, "scripts/modern-modules-local-verification.js"));
const { PrismaClient } = require("@prisma/client");
const mode = process.argv[2]; assert.ok(["preflight", "run"].includes(mode), "Use preflight or run");
const target = guard.targetUrl(); assert.equal(target.pathname.slice(1), guard.DATABASE_NAME);
assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname)); assert.notEqual(process.env.NODE_ENV, "production");
process.env.DATABASE_URL = target.toString(); process.env.DIRECT_URL = target.toString(); process.env.NODE_ENV = "test";
const db = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [], transactionOptions: { maxWait: 10000, timeout: 30000 } }); globalThis.prisma = db;
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "commonjs", moduleResolution: "node", jsx: "react-jsx" });
require(path.join(ROOT, "scripts/server-only-node-shim.js")); require("ts-node/register/transpile-only"); require("tsconfig-paths/register");
const outbound = []; globalThis.fetch = async input => { let origin = "unknown"; try { origin = new URL(typeof input === "string" ? input : input.url).origin; } catch {} outbound.push(origin); throw new Error("Owned verification blocks outbound fetch"); };
const accounts = require(path.join(ROOT, "services/accounting/accounts.service.ts"));
const journals = require(path.join(ROOT, "services/accounting/journals.service.ts"));
const posting = require(path.join(ROOT, "services/accounting/posting.service.ts"));
const reports = require(path.join(ROOT, "services/accounting/reports.service.ts"));
const statements = require(path.join(ROOT, "services/accounting/financial-statements.service.ts"));
const locations = require(path.join(ROOT, "services/location/location.service.ts"));
const attempt = randomUUID().replaceAll("-", "").slice(0, 12);
const prefix = `org_modules_service_smoke_retained_${attempt}`;
const files = ["services/accounting/accounts.service.ts", "services/accounting/journals.service.ts", "services/accounting/posting.service.ts", "services/accounting/reports.service.ts", "services/accounting/financial-statements.service.ts", "services/accounting/invariants.ts", "services/accounting/periods.service.ts", "services/accounting/journal-close-invalidation.service.ts", "services/controls/sensitive-action.service.ts", "services/location/location.service.ts", "services/modules/module-admission.service.ts", "prisma/schema.prisma"];
const sha = value => createHash("sha256").update(Buffer.isBuffer(value) || typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const sources = () => Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
const receipt = { mode, attempt, database: guard.DATABASE_NAME, startedAt: new Date().toISOString(), sourcesBefore: sources(), checks: [], ownedOrganizations: [], limitations: ["Direct service proof; action/session authorization is separate.", "Posting/reversal permission and fresh-auth timestamps are explicitly synthetic service-control inputs, not a real sign-in, human signature, professional approval or release evidence.", "No missing/foreign historical account row is fabricated by disabling constraints; malformed-evidence guards retain their unit-test scope.", "No claim of concurrent manager reassignment safety or certified statutory reporting." ] };
const date = value => new Date(`${value}T12:00:00.000Z`);
const control = permission => { const now = new Date(); return { actorPermissions: [permission], lastAuthAt: now, now }; };
const financialNow = new Date("2026-06-30T23:59:59.999Z");
async function check(name, work) { const start = Date.now(); const detail = await work(); receipt.checks.push({ name, passed: true, durationMs: Date.now() - start, detail }); }
async function preflight() {
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, guard.DATABASE_NAME);
  const organizations = await db.organization.findMany({ select: { id: true, onboardingSource: true } });
  assert.ok(organizations.every(row => row.onboardingSource === guard.SOURCE && row.id.startsWith("org_modules_service_smoke_")), "Unknown controls DB ownership");
  const migrations = await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  assert.ok(REQUIRED_MIGRATIONS.every(name => migrations.some(row => row.migration_name === name)), "Required existing migrations missing; runner never migrates");
  receipt.targetGuardPassed = true;
}
async function fixture() {
  const main = `${prefix}_main`; const foreign = `${prefix}_foreign`;
  const maker = `${prefix}_maker`; const poster = `${prefix}_poster`; const foreignManager = `${prefix}_foreign_manager`; const inactive = `${prefix}_inactive`;
  await db.$transaction(async tx => {
    for (const [id, suffix] of [[main, "main"], [foreign, "foreign"]]) await tx.organization.create({ data: { id, name: `Synthetic retained-report ${suffix}`, slug: `retained-${attempt}-${suffix}`, country: "CM", currency: "XAF", isActive: true, onboardingSource: guard.SOURCE } });
    for (const [id, organizationId, isActive] of [[maker, main, true], [poster, main, true], [foreignManager, foreign, true], [inactive, main, false]]) await tx.user.create({ data: { id, organizationId, email: `${id}@retained-workflow.stockflow.test`, name: "Synthetic controls actor", isActive, isVerified: true, emailVerified: true, mfaBackupCodes: [] } });
  });
  receipt.ownedOrganizations.push(main, foreign);
  const year = await db.fiscalYear.create({ data: { organizationId: main, name: "Synthetic 2026", startDate: new Date("2026-01-01T00:00:00Z"), endDate: new Date("2026-12-31T23:59:59.999Z"), status: "OPEN" } });
  const may = await db.accountingPeriod.create({ data: { organizationId: main, fiscalYearId: year.id, periodNumber: 5, name: "Synthetic May", startDate: new Date("2026-05-01T00:00:00Z"), endDate: new Date("2026-05-31T23:59:59.999Z"), status: "OPEN" } });
  const june = await db.accountingPeriod.create({ data: { organizationId: main, fiscalYearId: year.id, periodNumber: 6, name: "Synthetic June", startDate: new Date("2026-06-01T00:00:00Z"), endDate: financialNow, status: "OPEN" } });
  const allJournals = await journals.ensureDefaultJournals(main, maker);
  const journal = allJournals.find(row => row.code === "GEN"); assert.ok(journal, "Actual default manual journal required");
  const chart = {};
  for (const [key, code, type, normalBalance] of [["cash", "571", "ASSET", "DEBIT"], ["equity", "101", "EQUITY", "CREDIT"], ["revenue", "701", "REVENUE", "CREDIT"], ["expense", "601", "EXPENSE", "DEBIT"]]) chart[key] = await accounts.createChartAccount(main, { code, nameEn: `Synthetic ${key}`, type, normalBalance, allowManualPost: true, currency: "XAF" }, maker);
  const foreignAccount = await accounts.createChartAccount(foreign, { code: "571", nameEn: "Synthetic foreign cash", type: "ASSET", normalBalance: "DEBIT", allowManualPost: true, currency: "XAF" }, foreignManager);
  return { main, foreign, maker, poster, foreignManager, inactive, may, june, journal, chart, foreignAccount };
}
async function reportProof(f) {
  const entryInput = (debit, credit, amount, day) => ({ journalId: f.journal.id, entryDate: date(day), memo: "Synthetic retained report fixture", lines: [{ accountId: debit, debit: amount, credit: 0, currency: "XAF" }, { accountId: credit, debit: 0, credit: amount, currency: "XAF" }] });
  await check("Foreign and missing accounts are rejected by the real draft owner before writes", async () => {
    const before = await db.journalEntry.count({ where: { organizationId: f.main } });
    for (const accountId of [f.foreignAccount.id, `${prefix}_missing_account`]) await assert.rejects(journals.createManualJournalEntry(f.main, entryInput(accountId, f.chart.revenue.id, 10, "2026-06-08"), f.maker), /not found/i);
    assert.equal(await db.journalEntry.count({ where: { organizationId: f.main } }), before);
    return { rejectedCases: 2, createdEntries: 0 };
  });
  const entries = [];
  for (const [debit, credit, amount, day] of [["cash", "equity", 500, "2026-05-05"], ["cash", "revenue", 120, "2026-06-10"], ["expense", "cash", 30, "2026-06-15"], ["cash", "revenue", 40, "2026-06-20"]]) {
    const draft = await journals.createManualJournalEntry(f.main, entryInput(f.chart[debit].id, f.chart[credit].id, amount, day), f.maker);
    if (entries.length === 0) await check("Posting retains maker-checker denial", async () => { await assert.rejects(posting.postJournalEntry(f.main, draft.id, f.maker, control("accounting.journal.post"))); assert.equal((await db.journalEntry.findUniqueOrThrow({ where: { id: draft.id } })).status, "DRAFT"); return { stillDraft: true }; });
    entries.push(await posting.postJournalEntry(f.main, draft.id, f.poster, control("accounting.journal.post")));
  }
  const reversed = await posting.reverseJournalEntry(f.main, entries[3].id, f.maker, "Synthetic correction for archived-history report proof", date("2026-06-25"), control("accounting.journal.reverse"));
  assert.ok(reversed);
  await journals.createManualJournalEntry(f.main, entryInput(f.chart.cash.id, f.chart.revenue.id, 777, "2026-06-28"), f.maker);
  const read = async () => {
    const { generatedAt, ...statementValues } = await statements.getFinancialStatements({ organizationId: f.main, periodId: f.june.id, now: financialNow });
    return { trial: await reports.getTrialBalance({ organizationId: f.main, includeZeroBalance: false }), june: await reports.getTrialBalance({ organizationId: f.main, periodId: f.june.id, includeZeroBalance: false }), ledger: await reports.getGeneralLedger({ organizationId: f.main, accountId: f.chart.cash.id }), statements: statementValues };
  };
  const before = await read();
  await check("Balanced posted/reversed nonzero history is present before archiving", async () => {
    assert.equal(before.trial.totals.activityDebit, "730.00"); assert.equal(before.trial.totals.activityCredit, "730.00"); assert.equal(before.trial.totals.isBalanced, true);
    assert.equal(before.june.totals.activityDebit, "230.00"); assert.equal(before.june.totals.activityCredit, "230.00");
    assert.equal(before.statements.profitAndLoss.totals.revenue, "120.00"); assert.equal(before.statements.profitAndLoss.totals.netIncome, "90.00");
    assert.equal(before.statements.balanceSheet.totals.assets, "590.00"); assert.equal(before.statements.balanceSheet.totals.equity, "500.00"); assert.equal(before.statements.balanceSheet.totals.isBalanced, true);
    assert.equal(before.ledger.length, 5); assert.equal(before.ledger.at(-1).runningBalance, "590.00");
    assert.equal(await db.journalEntry.count({ where: { organizationId: f.main, status: "REVERSED" } }), 1);
    return { trialTotals: before.trial.totals, juneTotals: before.june.totals, profit: before.statements.profitAndLoss.totals.netIncome, assets: before.statements.balanceSheet.totals.assets, cashRows: before.ledger.length, excludedDraftAmount: "777.00" };
  });
  const linesBefore = await db.journalEntryLine.count({ where: { organizationId: f.main } });
  for (const account of Object.values(f.chart)) { const archived = await accounts.archiveChartAccount(f.main, account.id, f.maker); assert.equal(archived.isActive, false); assert.ok(archived.deletedAt); }
  await check("Real archive retains exact reports and ledger history", async () => { const after = await read(); assert.deepEqual(after, before); assert.equal(await db.journalEntryLine.count({ where: { organizationId: f.main } }), linesBefore); return { exactReportsUnchanged: true, comparisonExcludes: ["generatedAt: report-render time"], archivedAccounts: 4, retainedLines: linesBefore, reportHash: sha(after) }; });
  await check("Archived history does not re-enable new journal posting or leak foreign scope", async () => {
    const count = await db.journalEntry.count({ where: { organizationId: f.main } });
    await assert.rejects(journals.createManualJournalEntry(f.main, entryInput(f.chart.cash.id, f.chart.revenue.id, 1, "2026-06-29"), f.maker));
    assert.equal(await db.journalEntry.count({ where: { organizationId: f.main } }), count);
    assert.deepEqual(await reports.getGeneralLedger({ organizationId: f.foreign, accountId: f.chart.cash.id }), []);
    await assert.rejects(statements.getFinancialStatements({ organizationId: f.foreign, periodId: f.june.id }), /unavailable for this organization/i);
    return { newDraftRejected: true, foreignLedgerRows: 0, foreignPeriodRejected: true };
  });
}
async function locationProof(f) {
  const own = await locations.createLocationForManagement(f.main, { name: "Synthetic managed location", code: "WF-MAIN", type: "WAREHOUSE", managerId: f.maker, isDefault: false });
  const other = await locations.createLocationForManagement(f.foreign, { name: "Synthetic foreign location", code: "WF-FOREIGN", type: "WAREHOUSE", managerId: f.foreignManager, isDefault: false });
  await check("Legacy location owner rejects foreign, inactive and missing manager atomically", async () => {
    const before = await db.location.findUniqueOrThrow({ where: { id: own.id } });
    for (const managerId of [f.foreignManager, f.inactive, `${prefix}_missing_manager`]) { await assert.rejects(locations.updateLegacyLocationByIdForOrg(f.main, own.id, { managerId, name: "Must not persist" }), /does not belong/i); assert.deepEqual(await db.location.findUniqueOrThrow({ where: { id: own.id } }), before); }
    await assert.rejects(locations.updateLegacyLocationByIdForOrg(f.main, other.id, { managerId: f.maker }), /not found/i);
    return { deniedManagers: 3, foreignLocationDenied: true, partialUpdates: 0 };
  });
  await check("Valid, omitted and cleared manager assignments preserve organization scope", async () => {
    await locations.updateLegacyLocationByIdForOrg(f.main, own.id, { managerId: ` ${f.poster} `, name: "Synthetic assigned", organizationId: f.foreign });
    let row = await db.location.findUniqueOrThrow({ where: { id: own.id } }); assert.equal(row.managerId, f.poster); assert.equal(row.organizationId, f.main);
    await locations.updateLegacyLocationByIdForOrg(f.main, own.id, { name: "Synthetic omitted manager" }); row = await db.location.findUniqueOrThrow({ where: { id: own.id } }); assert.equal(row.managerId, f.poster);
    await locations.updateLegacyLocationByIdForOrg(f.main, own.id, { managerId: null }); assert.equal((await db.location.findUniqueOrThrow({ where: { id: own.id } })).managerId, null);
    await locations.updateLegacyLocationByIdForOrg(f.main, own.id, { managerId: f.maker });
    await locations.updateLegacyLocationByIdForOrg(f.main, own.id, { managerId: "" }); assert.equal((await db.location.findUniqueOrThrow({ where: { id: own.id } })).managerId, null);
    return { sameTenantAssigned: true, omissionPreserved: true, explicitClearCases: 2, suppliedForeignOrganizationIgnored: true };
  });
}
(async () => { await preflight(); if (mode === "preflight") return; const f = await fixture(); receipt.fixture = { organizationIds: [f.main, f.foreign], actorIds: [f.maker, f.poster, f.foreignManager, f.inactive], periodIds: [f.may.id, f.june.id], accountIds: Object.values(f.chart).map(row => row.id) }; await reportProof(f); await locationProof(f); })().catch(error => { receipt.error = `${error.name}: ${String(error.message).split(target.toString()).join("[redacted]").split("Failing row contains")[0].slice(0, 1500)}`; }).finally(async () => {
  await db.$disconnect(); receipt.blockedFetchOrigins = outbound; receipt.completedAt = new Date().toISOString(); receipt.sourcesAfter = sources(); receipt.sourceStable = JSON.stringify(receipt.sourcesBefore) === JSON.stringify(receipt.sourcesAfter); receipt.driverSha256 = sha(fs.readFileSync(__filename)); receipt.passed = receipt.checks.length; receipt.failed = Number(Boolean(receipt.error));
  const file = path.join(__dirname, `retained-reports-location-${mode}-${attempt}.json`); fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" }); console.log(JSON.stringify({ passed: receipt.passed, failed: receipt.failed, evidence: path.relative(ROOT, file) })); if (receipt.failed) process.exitCode = 1;
});
