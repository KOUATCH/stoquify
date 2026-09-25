/* Isolated workflow proof. No production imports are altered on disk. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID, randomBytes, createHash } = require("node:crypto");
const { AsyncLocalStorage } = require("node:async_hooks");
const ROOT = path.resolve(__dirname, "../../../../..");
process.chdir(ROOT);
const guard = require(path.join(ROOT, "scripts/run-modern-modules-postgres-smoke.js"));
const { REQUIRED_MIGRATIONS } = require(path.join(ROOT, "scripts/modern-modules-local-verification.js"));
const { PrismaClient } = require("@prisma/client");
const mode = process.argv[2];
assert.ok(["preflight", "run", "statement"].includes(mode), "Expected preflight, run or statement");
const target = guard.targetUrl();
assert.equal(target.pathname.slice(1), guard.DATABASE_NAME);
assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname));
assert.notEqual(process.env.NODE_ENV, "production");
process.env.DATABASE_URL = target.toString();
process.env.DIRECT_URL = target.toString();
process.env.NODE_ENV = "test";
process.env.NEXTAUTH_URL = "http://127.0.0.1:3107";
process.env.NEXT_PUBLIC_BASE_URL = "http://127.0.0.1:3107";
const secrets = new Set([target.toString()]);
for (const key of ["AUTH_SECRET", "NEXTAUTH_SECRET", "BETTER_AUTH_SECRET", "PUBLIC_IDENTITY_ABUSE_HASH_SECRET", "AQSTOQFLOW_STATEMENT_TOKEN_SECRET"]) {
  process.env[key] = randomBytes(32).toString("hex"); secrets.add(process.env[key]);
}
for (const key of ["RESEND_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]) delete process.env[key];
const outbound = [];
globalThis.fetch = async function networkTripwire(input) {
  let origin = "unknown";
  try { origin = new URL(typeof input === "string" ? input : input.url).origin; } catch {}
  outbound.push(origin);
  throw new Error("Isolated workflow verification blocks outbound fetch");
};
const real = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [], transactionOptions: { maxWait: 15000, timeout: 30000 } });
const callScope = new AsyncLocalStorage();
function bind(object, property) { const value = Reflect.get(object, property); return typeof value === "function" ? value.bind(object) : value; }
const proxy = new Proxy(real, { get(object, property) {
  if (property === "user") return new Proxy(object.user, { get(delegate, key) {
    if (key === "findFirst") return async (args) => {
      const result = await delegate.findFirst(args);
      const scope = callScope.getStore();
      if (scope?.barrier && result?.id === scope.userId && args.where?.verificationToken) await scope.barrier();
      return result;
    };
    return bind(delegate, key);
  } });
  if (property === "$transaction") return (work, options) => {
    if (typeof work !== "function") return object.$transaction(work, options);
    return object.$transaction(async tx => {
      const scope = callScope.getStore();
      const wrapped = new Proxy(tx, { get(transaction, key) {
        if (key === "user") return new Proxy(transaction.user, { get(delegate, method) {
          if (method === "updateMany") return async args => {
            if (scope && args.where?.id === scope.userId && args.where.verificationToken) {
              const rows = await transaction.$queryRaw`SELECT pg_backend_pid() AS pid`;
              scope.backendPids?.push(rows[0].pid);
              const result = await delegate.updateMany(args);
              scope.consumed?.push(result.count);
              return result;
            }
            return delegate.updateMany(args);
          };
          return bind(delegate, method);
        } });
        if (key === "account" && scope?.failCredential) return new Proxy(transaction.account, { get(delegate, method) {
          if (method === "upsert") return async args => {
            assert.equal(args.create?.userId, scope.userId, "Fault scope must match owned identity");
            throw new Error("OWNED_TEST_CREDENTIAL_TRANSACTION_FAILURE");
          };
          return bind(delegate, method);
        } });
        return bind(transaction, key);
      } });
      return work(wrapped);
    }, options);
  };
  return bind(object, property);
} });
globalThis.prisma = proxy;
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "commonjs", moduleResolution: "node", jsx: "react-jsx" });
require(path.join(ROOT, "scripts/server-only-node-shim.js"));
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");
const SOURCES = ["services/users/user-identity.service.ts", "lib/security/auth-credentials.ts", "lib/auth.ts", "lib/password.ts", "lib/security/password-utils.ts", "services/auth/password-policy.ts", "lib/security/hibp.ts", "services/security/public-identity-abuse.service.ts", "lib/security/audit-log.ts", "services/accounting/customer-statement-recipient-action.service.ts", "services/accounting/customer-statement-access.service.ts", "services/accounting/customer-statement-token.ts", "services/_shared/signed-external-access-token.ts", "services/events/business-event.service.ts", "prisma/schema.prisma"];
const digest = value => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
const sources = () => Object.fromEntries(SOURCES.map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))]));
const runId = randomUUID().replaceAll("-", "").slice(0, 12);
const receipt = { runId, mode, database: guard.DATABASE_NAME, startedAt: new Date().toISOString(), sourceBefore: sources(), checks: [], ownedOrganizations: [], limitations: ["HIBP network deliberately unavailable: production offline handling exercised, online breach service unverified", "Synthetic immutable statement input: snapshot generation and ledger provenance unverified", "Internal service calls: public transport behavior is separate coverage"], network: { actualRequestsSent: 0, blockedFetchOrigins: [] } };
const safeError = error => {
  let result = `${error?.name ?? "Error"}: ${error?.message ?? "verification failed"}`;
  for (const secret of secrets) result = result.split(secret).join("[redacted]");
  return result.replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL redacted]").split("Failing row contains")[0].slice(0, 1100);
};
async function check(name, work) {
  const start = Date.now();
  try { const detail = await work(); receipt.checks.push({ name, passed: true, durationMs: Date.now() - start, detail }); }
  catch (error) { receipt.checks.push({ name, passed: false, durationMs: Date.now() - start, error: safeError(error) }); }
}
async function ownedActor(purpose) {
  const organizationId = `org_modules_service_smoke_workflow_${runId}_${purpose}`;
  const id = `usr_workflow_${runId}_${purpose}`;
  const email = `${runId}.${purpose}@workflow.stockflow.test`;
  const password = `Local!${randomBytes(14).toString("hex")}7Z`;
  secrets.add(password);
  const { hashPassword } = require(path.join(ROOT, "lib/password.ts"));
  const passwordHash = await hashPassword(password);
  await real.$transaction(async tx => {
    await tx.organization.create({ data: { id: organizationId, name: `Synthetic workflow ${purpose}`, slug: `workflow-${runId}-${purpose}`, onboardingSource: guard.SOURCE, isActive: true } });
    await tx.user.create({ data: { id, organizationId, email, name: "Synthetic workflow verifier", password: passwordHash, mfaBackupCodes: [], isActive: true, isVerified: true, emailVerified: true } });
    await tx.account.create({ data: { userId: id, providerId: "credential", accountId: id, password: passwordHash } });
    await tx.passwordHistory.create({ data: { userId: id, passwordHash } });
  });
  receipt.ownedOrganizations.push(organizationId);
  return { organizationId, id, email, password };
}
async function identityState(actor) {
  const [user, account, history, sessions] = await Promise.all([
    real.user.findUniqueOrThrow({ where: { id: actor.id }, select: { password: true, verificationToken: true, verificationTokenExpires: true } }),
    real.account.findUniqueOrThrow({ where: { providerId_accountId: { providerId: "credential", accountId: actor.id } }, select: { password: true } }),
    real.passwordHistory.findMany({ where: { userId: actor.id }, orderBy: { id: "asc" }, select: { id: true, passwordHash: true } }),
    real.session.findMany({ where: { userId: actor.id }, orderBy: { id: "asc" }, select: { id: true, token: true } }),
  ]);
  return { user, account, history, sessions };
}
function newToken() { const token = randomBytes(16).toString("hex"); secrets.add(token); return token; }
function newPassword() { const password = `Rivers!${randomBytes(12).toString("hex")}8Q`; secrets.add(password); return password; }
async function setToken(actor, token, expiresAt = new Date(Date.now() + 600000)) {
  assert.ok(actor.organizationId.startsWith(`org_modules_service_smoke_workflow_${runId}_`));
  await real.user.update({ where: { id: actor.id }, data: { verificationToken: token, verificationTokenExpires: expiresAt } });
}
async function main() {
  const guardRows = await real.$queryRaw`SELECT current_database() AS name`;
  assert.equal(guardRows[0].name, guard.DATABASE_NAME);
  const organizations = await real.organization.findMany({ select: { id: true, onboardingSource: true } });
  assert.ok(organizations.every(row => row.onboardingSource === guard.SOURCE && row.id.startsWith("org_modules_service_smoke_")), "Controls ownership mismatch");
  const migrations = await real.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  assert.ok(REQUIRED_MIGRATIONS.every(name => migrations.some(row => row.migration_name === name)), "Required integration migrations missing");
  receipt.guard = { verified: true, existingOwnedOrganizations: organizations.length, completedMigrations: migrations.length, browserDatabaseUntouched: true };
  const { completePasswordResetWorkflow } = require(path.join(ROOT, "services/users/user-identity.service.ts"));
  const { auth } = require(path.join(ROOT, "lib/auth.ts"));
  const { verifyPassword } = require(path.join(ROOT, "lib/password.ts"));
  const access = require(path.join(ROOT, "services/accounting/customer-statement-access.service.ts"));
  const { submitCustomerStatementRecipientAction } = require(path.join(ROOT, "services/accounting/customer-statement-recipient-action.service.ts"));
  const { hashBusinessPayload } = require(path.join(ROOT, "services/events/business-event.service.ts"));
  receipt.runtimeImports = "Current production services and real Better Auth loaded";
  if (mode === "preflight") return;

  if (mode === "run") await check("concurrent current-token resets commit exactly one credential change and revoke genuine session", async () => {
    const actor = await ownedActor("reset_race");
    const signIn = await auth.api.signInEmail({ body: { email: actor.email, password: actor.password }, headers: new Headers({ origin: "http://127.0.0.1:3107" }) });
    assert.ok(signIn?.token && signIn?.user?.id === actor.id, "Real credential sign-in required"); secrets.add(signIn.token);
    const token = newToken(); await setToken(actor, token);
    const before = await identityState(actor);
    assert.equal(before.sessions.length, 1, "One genuine authentication session must exist");
    let arrivals = 0; let release;
    const ready = new Promise(resolve => { release = resolve; });
    const barrier = async () => { if (++arrivals === 2) release(); await ready; };
    const passwords = [newPassword(), newPassword()];
    const traces = passwords.map(() => ({ userId: actor.id, barrier, consumed: [], backendPids: [] }));
    const results = await Promise.all(passwords.map((password, index) => callScope.run(traces[index], () => completePasswordResetWorkflow(actor.email, token, password))));
    assert.deepEqual(results.map(result => result.status).sort(), [200, 404], "Exactly one reset winner");
    assert.equal(arrivals, 2, "Both calls observed the current token before either transaction");
    assert.deepEqual(traces.flatMap(trace => trace.consumed).sort(), [0, 1]);
    assert.equal(new Set(traces.flatMap(trace => trace.backendPids)).size, 2, "Independent PostgreSQL connections required");
    const after = await identityState(actor);
    assert.equal(after.user.verificationToken, null);
    assert.equal(after.user.verificationTokenExpires, null);
    assert.ok(after.user.password === after.account.password, "User and credential Account hashes agree");
    assert.equal(after.history.length - before.history.length, 1);
    assert.equal(after.sessions.length, 0);
    const verified = await Promise.all(passwords.map(password => verifyPassword(password, after.account.password)));
    assert.deepEqual(verified, results.map(result => result.status === 200), "Only winning replacement password verifies");
    assert.equal(await real.auditLog.count({ where: { organizationId: actor.organizationId, action: "AUTH_PASSWORD_RESET_COMPLETED" } }), 1);
    return { statuses: results.map(result => result.status), transactions: 2, distinctBackendConnections: 2, credentialHistoryDelta: 1, sessionsBefore: 1, sessionsAfter: 0, snapshotHash: digest(after) };
  });
  if (mode === "run") await check("expired replaced and malformed reset tokens preserve identity state", async () => {
    const actor = await ownedActor("reset_denials");
    const oldToken = newToken(); await setToken(actor, oldToken, new Date(Date.now() - 1000));
    let before = await identityState(actor);
    assert.equal((await completePasswordResetWorkflow(actor.email, oldToken, newPassword())).status, 404);
    assert.ok(digest(await identityState(actor)) === digest(before), "Expired token caused no identity effects");
    const currentToken = newToken(); await setToken(actor, currentToken);
    before = await identityState(actor);
    for (const rejected of [oldToken, "123456", "x".repeat(31)]) {
      assert.equal((await completePasswordResetWorkflow(actor.email, rejected, newPassword())).status, 404);
      assert.ok(digest(await identityState(actor)) === digest(before), "Rejected token caused no identity effects");
    }
    return { denials: 4, identityStateUnchanged: true };
  });
  if (mode === "run") await check("credential transaction failure rolls back token consumption and retry succeeds", async () => {
    const actor = await ownedActor("reset_rollback");
    const signIn = await auth.api.signInEmail({ body: { email: actor.email, password: actor.password }, headers: new Headers({ origin: "http://127.0.0.1:3107" }) });
    assert.ok(signIn?.token && signIn?.user?.id === actor.id); secrets.add(signIn.token);
    const token = newToken(); await setToken(actor, token);
    const before = await identityState(actor); const password = newPassword();
    const trace = { userId: actor.id, failCredential: true, consumed: [], backendPids: [] };
    await assert.rejects(callScope.run(trace, () => completePasswordResetWorkflow(actor.email, token, password)), /OWNED_TEST_CREDENTIAL_TRANSACTION_FAILURE/);
    assert.deepEqual(trace.consumed, [1], "Real conditional token update ran before injected failure");
    assert.ok(digest(await identityState(actor)) === digest(before), "Rollback must preserve token and all identity effects");
    assert.equal((await completePasswordResetWorkflow(actor.email, token, password)).status, 200);
    const after = await identityState(actor);
    assert.equal(after.history.length - before.history.length, 1);
    assert.equal(after.sessions.length, 0);
    assert.equal(after.user.verificationToken, null);
    return { consumedBeforeRollback: 1, rolledBackExactly: true, retryStatus: 200, historyDelta: 1, genuineSessionRevoked: true };
  });

  await check("real signed statement promise late retry and negative boundaries preserve one action", async () => {
    const actor = await ownedActor("statement");
    const customer = await real.customer.create({ data: { organizationId: actor.organizationId, name: "Synthetic recipient retry input", code: `WF-${runId}` } });
    const now = new Date(); const day = 86400000;
    const payload = { fixture: "synthetic immutable recipient-workflow input", currency: "XAF", closingBalance: "25.00", lines: [] };
    const contentHash = hashBusinessPayload(payload);
    const snapshot = await real.customerStatementSnapshot.create({ data: {
      organizationId: actor.organizationId, customerId: customer.id, statementNumber: `WF-${runId}`, version: 1,
      periodStart: new Date(now.getTime() - 30 * day), periodEnd: now, asOf: now, recordedThrough: now, generatedAt: now,
      currency: "XAF", currencyPrecision: 2, openingBalance: 25, periodDebits: 0, periodCredits: 0, closingBalance: 25, overdueBalance: 0,
      itemCount: 0, movementCount: 0, sourceItemCount: 0, includedItemCount: 0, itemLimit: 1000, truncated: false,
      organizationSnapshot: { synthetic: true }, customerSnapshot: { synthetic: true }, statementPayload: payload,
      sourceTables: [], sourceDocumentHashes: [], sourceStateHashes: [], sourceLedgerEntryIds: [], contentHash,
      idempotencyKey: `workflow-snapshot-${runId}`, idempotencyPayloadHash: contentHash, correlationId: `workflow-snapshot-${runId}`,
      generatedById: actor.id, businessEventId: `synthetic-input-${runId}`,
    } });
    const issued = await real.$transaction(tx => access.issueCustomerStatementAccessTokenInTx(tx, { organizationId: actor.organizationId, statementSnapshotId: snapshot.id, issuedById: actor.id, allowPromiseToPay: true, now, ttlSeconds: 30 * 86400 }));
    secrets.add(issued.token);
    const input = { statementSnapshotId: snapshot.id, token: issued.token, actionType: "PROMISE_TO_PAY", requestedAmount: "20.00", promisedFor: new Date(now.getTime() + day), note: "Synthetic promise, no customer contact", idempotencyKey: `workflow-promise-${runId}`, correlationId: `workflow-promise-${runId}`, now };
    const initial = await submitCustomerStatementRecipientAction(input);
    assert.equal(initial.replayed, false);
    const counts = async () => ({ actions: await real.customerStatementRecipientAction.count({ where: { organizationId: actor.organizationId } }), states: await real.customerStatementRecipientActionState.count({ where: { organizationId: actor.organizationId } }), events: await real.businessEvent.count({ where: { organizationId: actor.organizationId, eventType: "customer.statement.recipient_action.created" } }) });
    const late = new Date(now.getTime() + 2 * day);
    const replay = await submitCustomerStatementRecipientAction({ ...input, now: late });
    assert.equal(replay.replayed, true);
    assert.equal(replay.actionId, initial.actionId); assert.equal(replay.stateHash, initial.stateHash); assert.equal(replay.payloadHash, initial.payloadHash);
    assert.deepEqual(await counts(), { actions: 1, states: 1, events: 1 });
    await assert.rejects(submitCustomerStatementRecipientAction({ ...input, requestedAmount: "21.00", now: late }), error => error?.code === "CONFLICT");
    await assert.rejects(submitCustomerStatementRecipientAction({ ...input, idempotencyKey: `new-promise-${runId}`, correlationId: `new-promise-${runId}`, now: late }), error => error?.code === "BUSINESS_RULE_VIOLATION");
    await assert.rejects(submitCustomerStatementRecipientAction({ ...input, now: new Date(now.getTime() + 31 * day) }));
    await assert.rejects(submitCustomerStatementRecipientAction({ ...input, statementSnapshotId: `foreign-snapshot-${runId}`, now: late }));
    await real.$transaction(tx => access.revokeCustomerStatementAccessTokenInTx(tx, { organizationId: actor.organizationId, tokenId: issued.tokenId, revokedById: actor.id, reason: "Synthetic negative access case", now: late }));
    await assert.rejects(submitCustomerStatementRecipientAction({ ...input, now: late }));
    assert.deepEqual(await counts(), { actions: 1, states: 1, events: 1 });
    assert.equal((await real.customerStatementSnapshot.findUniqueOrThrow({ where: { id: snapshot.id } })).contentHash, contentHash);
    return { first: "created", lateRetry: "same recorded action", negatives: ["changed payload conflict", "new past-dated promise", "expired token", "foreign snapshot", "revoked token"], counts: await counts(), snapshotHash: contentHash, actionStateHash: initial.stateHash };
  });
}
main().catch(error => { receipt.fatal = safeError(error); }).finally(async () => {
  await real.$disconnect();
  receipt.sourceAfter = sources();
  receipt.sourceStable = JSON.stringify(receipt.sourceBefore) === JSON.stringify(receipt.sourceAfter);
  receipt.driverHash = digest(fs.readFileSync(__filename));
  receipt.network.blockedFetchOrigins = outbound;
  receipt.completedAt = new Date().toISOString();
  receipt.passed = receipt.checks.filter(check => check.passed).length;
  receipt.failed = receipt.checks.filter(check => !check.passed).length + Number(Boolean(receipt.fatal));
  receipt.status = receipt.failed ? "FAILED" : mode === "preflight" ? "READY_READ_ONLY" : "PASSED";
  const output = path.join(__dirname, `postgres-${mode}-${runId}.json`);
  fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ status: receipt.status, passed: receipt.passed, failed: receipt.failed, evidence: path.relative(ROOT, output) }));
  if (receipt.failed) process.exitCode = 1;
});
