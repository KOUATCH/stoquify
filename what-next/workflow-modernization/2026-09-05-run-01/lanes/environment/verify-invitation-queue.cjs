"use strict";
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), crypto = require("node:crypto");
const { AsyncLocalStorage } = require("node:async_hooks");
const root = path.resolve(__dirname, "../../../../.."); process.chdir(root);
const guard = require(path.join(root, "scripts/run-modern-modules-postgres-smoke.js"));
const { REQUIRED_MIGRATIONS } = require(path.join(root, "scripts/modern-modules-local-verification.js"));
const target = guard.targetUrl();
assert.equal(target.pathname.slice(1), guard.DATABASE_NAME);
assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname));
assert.notEqual(process.env.NODE_ENV, "production");
process.env.DATABASE_URL = target.toString(); process.env.DIRECT_URL = target.toString(); process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_BASE_URL = "http://127.0.0.1:3107"; process.env.RESEND_FROM_EMAIL = "invites@example.invalid";
delete process.env.STOQUIFY_USER_INVITE_FROM_EMAIL; delete process.env.RESEND_API_KEY;
let blockedFetches = 0; globalThis.fetch = async () => { blockedFetches++; throw new Error("No network in isolated invitation proof"); };
const { PrismaClient } = require("@prisma/client");
const real = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [], transactionOptions: { maxWait: 10000, timeout: 30000 } });
const scope = new AsyncLocalStorage(), bind = (obj, key) => typeof obj[key] === "function" ? obj[key].bind(obj) : obj[key];
const run = crypto.randomUUID().slice(0, 12), prefix = "org_modules_service_smoke_invite_queue_" + run;
globalThis.prisma = new Proxy(real, { get(obj, key) {
  if (key !== "$transaction") return bind(obj, key);
  return (work, options) => obj.$transaction(tx => work(new Proxy(tx, { get(transaction, property) {
    if (property === "auditLog" && scope.getStore()?.failAudit) return new Proxy(transaction.auditLog, { get(delegate, method) {
      if (method === "create") return async args => { assert.ok(args.data.organizationId.startsWith(prefix)); throw new Error("OWNED_QUEUE_AUDIT_FAILURE"); };
      return bind(delegate, method);
    } });
    return bind(transaction, property);
  } })), options);
} });
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "commonjs", moduleResolution: "node", jsx: "react-jsx" });
require(path.join(root, "scripts/server-only-node-shim.js")); require("ts-node/register/transpile-only"); require("tsconfig-paths/register");
const { issueUserInvitation } = require(path.join(root, "services/users/user-invitation-issuance.service.ts"));
const { cancelUserInvitation } = require(path.join(root, "services/users/user-invitation-management.service.ts"));
const { invitationRevision } = require(path.join(root, "services/users/invitation-revision.ts"));
const { runUserInvitationDeliveryWorker } = require(path.join(root, "services/communication/user-invitation-delivery-worker.service.ts"));
const { USER_INVITATION_EVENT } = require(path.join(root, "services/users/user-invitation-delivery-contract.ts"));
const files = ["services/users/user-invitation-issuance.service.ts", "services/users/user-invitation-authority.service.ts", "services/users/user-invitation-delivery-contract.ts", "services/communication/user-invitation-delivery-worker.service.ts", "services/users/invitation-input.ts", "services/security/role-grant-policy.service.ts", "prisma/schema.prisma"];
files.push("services/users/invitation-revision.ts", "services/users/user-invitation-management.service.ts");
const sha = value => crypto.createHash("sha256").update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
const sources = () => Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(path.join(root, file)))]));
const receipt = { run, database: guard.DATABASE_NAME, startedAt: new Date().toISOString(), sourcesBefore: sources(), checks: [], limitations: ["Real PostgreSQL and production service logic; adapters are isolated in-memory receipts only, never actual provider acceptance.", "No production transport is installed; default worker is disabled.", "Legacy invitation provenance and redemption-time permission revision enforcement remain separate work."] };
const check = async (name, work) => { const started = Date.now(); const detail = await work(); receipt.checks.push({ name, passed: true, durationMs: Date.now() - started, detail }); };
async function fixture(name) {
  const organizationId = prefix + "_" + name;
  const permissions = ["users.invite", "users.roles.assign", "items.read"];
  const organization = await real.organization.create({ data: { id: organizationId, name: "Synthetic invitation queue " + name, slug: "invite-queue-" + run + "-" + name, onboardingSource: guard.SOURCE, isActive: true } });
  const issuerRole = await real.role.create({ data: { organizationId, code: "issuer", nameEn: "Synthetic issuer", permissions } });
  const role = await real.role.create({ data: { organizationId, code: "reader", nameEn: "Reader", nameFr: "Lecteur", permissions: ["items.read"] } });
  const actor = await real.user.create({ data: { organizationId, email: run + ".issuer." + name + "@example.invalid", isActive: true, isVerified: true, emailVerified: true, roles: { connect: { id: issuerRole.id } } } });
  const input = { actor: { id: actor.id, organizationId }, actorPermissions: permissions, email: run + ".recipient." + name + "@example.invalid", roleId: role.id, requestId: crypto.randomUUID(), locale: "fr" };
  return { organization, organizationId, actor, role, issuerRole, input };
}
async function rows(f) {
  return { invites: await real.invite.count({ where: { organizationId: f.organizationId } }), events: await real.businessEvent.count({ where: { organizationId: f.organizationId, eventType: USER_INVITATION_EVENT } }), outbox: await real.businessEventOutbox.count({ where: { organizationId: f.organizationId } }), audits: await real.auditLog.count({ where: { organizationId: f.organizationId, action: "INVITE_CREATED" } }) };
}
const queue = f => real.businessEventOutbox.findFirst({ where: { organizationId: f.organizationId }, orderBy: { createdAt: "desc" } });
const worker = async (f, adapter, workerId = "isolated") => {
  // The database clock can be several milliseconds ahead of the Node process.
  // Stage only this test's new pending rows as due, without touching retries or leases.
  if (adapter) await real.businessEventOutbox.updateMany({ where: { organizationId: f.organizationId, status: "PENDING", attempts: 0 }, data: { availableAt: new Date(0) } });
  return runUserInvitationDeliveryWorker({ organizationId: f.organizationId, workerId }, adapter);
};
const authority = async () => sha({ organizations: await real.organization.findMany({ where: { id: { not: { startsWith: prefix } } }, orderBy: { id: "asc" } }), users: await real.user.findMany({ where: { organizationId: { not: { startsWith: prefix } } }, include: { roles: { orderBy: { id: "asc" } } }, orderBy: { id: "asc" } }), grants: await real.tenantModuleGrant.findMany({ orderBy: { id: "asc" } }) });
async function main() {
  assert.equal((await real.$queryRaw`SELECT current_database() AS name`)[0].name, guard.DATABASE_NAME);
  const orgs = await real.organization.findMany({ select: { id: true, onboardingSource: true } });
  assert.ok(orgs.every(row => row.id.startsWith("org_modules_service_smoke_") && row.onboardingSource === guard.SOURCE));
  const migrations = await real.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  assert.ok(REQUIRED_MIGRATIONS.every(name => migrations.some(row => row.migration_name === name)));
  receipt.authorityBefore = await authority();
  await check("concurrent identical requests commit one invitation, event, queue and mandatory audit", async () => {
    const f = await fixture("same"); const responses = await Promise.all([issueUserInvitation(f.input), issueUserInvitation(f.input)]);
    assert.ok(responses.every(row => row.status === 200)); assert.equal(new Set(responses.map(row => row.data.issueId)).size, 1);
    assert.deepEqual(await rows(f), { invites: 1, events: 1, outbox: 1, audits: 1 });
    const outbox = await queue(f), invite = await real.invite.findFirst({ where: { organizationId: f.organizationId } });
    assert.ok(!JSON.stringify(outbox).includes(invite.token)); assert.ok(!JSON.stringify(outbox).includes(invite.email));
    assert.equal((await issueUserInvitation({ ...f.input, email: "changed@example.invalid" })).code, "INVITATION_REQUEST_CONFLICT");
    assert.equal((await worker(f)).state, "disabled"); assert.equal((await queue(f)).attempts, 0);
    return { ...await rows(f), sameIssue: true, noBearerInQueue: true, defaultWorkerDisabled: true };
  });
  await check("competing distinct requests for one recipient create only one pending invitation", async () => {
    const f = await fixture("distinct"); const responses = await Promise.all([issueUserInvitation(f.input), issueUserInvitation({ ...f.input, requestId: crypto.randomUUID() })]);
    assert.deepEqual(responses.map(row => row.status).sort(), [200, 409]); assert.deepEqual(await rows(f), { invites: 1, events: 1, outbox: 1, audits: 1 }); return { statuses: responses.map(row => row.status), ...await rows(f) };
  });
  await check("issuance audit failure rolls back invitation, event and queue; retry completes once", async () => {
    const f = await fixture("audit"); await assert.rejects(scope.run({ failAudit: true }, () => issueUserInvitation(f.input)), /OWNED_QUEUE_AUDIT_FAILURE/);
    assert.deepEqual(await rows(f), { invites: 0, events: 0, outbox: 0, audits: 0 }); assert.equal((await issueUserInvitation(f.input)).status, 200); return await rows(f);
  });
  await check("current issuer revocation and foreign roles cannot create invitations", async () => {
    const f = await fixture("authority"), foreign = await fixture("foreign");
    assert.equal((await issueUserInvitation({ ...f.input, roleId: foreign.role.id })).status, 403);
    await real.user.update({ where: { id: f.actor.id }, data: { isActive: false } });
    assert.equal((await issueUserInvitation(f.input)).status, 403); assert.equal((await rows(f)).invites, 0); return { foreignDenied: true, disabledIssuerDenied: true };
  });
  await check("uncertain delivery retries identical bytes and key; records simulated acceptance separately", async () => {
    const f = await fixture("retry"); await issueUserInvitation(f.input); const calls = [];
    const adapter = async (mail, key) => { calls.push({ bodyHash: sha(mail), key }); return calls.length === 1 ? { state: "unknown", code: "ISOLATED_RESPONSE_LOST" } : { state: "accepted", providerId: "isolated-receipt" }; };
    assert.equal((await worker(f, adapter)).results[0].status, "FAILED"); const first = await queue(f); assert.ok(first.metadata.firstDispatchAt);
    await real.businessEventOutbox.update({ where: { id: first.id }, data: { availableAt: new Date(0) } });
    assert.equal((await worker(f, adapter)).results[0].status, "SENT"); assert.deepEqual(calls[0], calls[1]);
    const last = await queue(f); assert.equal(last.metadata.firstDispatchAt, first.metadata.firstDispatchAt); return { attempts: last.attempts, stableBodyAndKey: true, simulatedAdapterOnly: true };
  });
  await check("stale worker cannot overwrite the new lease's accepted receipt", async () => {
    const f = await fixture("lease"); await issueUserInvitation(f.input); let release, entered;
    const waiting = new Promise(resolve => { entered = resolve; }); const hold = new Promise(resolve => { release = resolve; });
    const first = worker(f, async () => { entered(); await hold; return { state: "unknown", code: "ISOLATED_OLD_RESPONSE" }; }, "old");
    await waiting; const row = await queue(f); await real.businessEventOutbox.update({ where: { id: row.id }, data: { lockedAt: new Date(0) } });
    const newer = await worker(f, async () => ({ state: "accepted", providerId: "isolated-new-lease" }), "new"); release(); const older = await first;
    assert.equal(newer.results[0].status, "SENT"); assert.equal(older.results[0].status, "LEASE_LOST"); assert.equal((await queue(f)).status, "SENT"); return { newLease: "SENT", oldLease: "LEASE_LOST" };
  });
  await check("post-adapter audit failure retains the first attempt for safe recovery", async () => {
    const f = await fixture("deliveryaudit"); await issueUserInvitation(f.input); const calls = [];
    const adapter = async (mail, key) => { calls.push({ bodyHash: sha(mail), key }); return { state: "accepted", providerId: "isolated-repeat-receipt" }; };
    await assert.rejects(scope.run({ failAudit: true }, () => worker(f, adapter)), /OWNED_QUEUE_AUDIT_FAILURE/);
    const row = await queue(f); assert.equal(row.status, "LOCKED"); assert.ok(row.metadata.firstDispatchAt);
    await real.businessEventOutbox.update({ where: { id: row.id }, data: { lockedAt: new Date(0) } }); assert.equal((await worker(f, adapter)).results[0].status, "SENT"); assert.deepEqual(calls[0], calls[1]); return { stableRetry: true, simulatedAdapterOnly: true };
  });
  await check("expired retry window requires review without another adapter call", async () => {
    const f = await fixture("window"); await issueUserInvitation(f.input); const row = await queue(f);
    await real.businessEventOutbox.update({ where: { id: row.id }, data: { metadata: { firstDispatchAt: new Date(Date.now() - 24 * 3600000).toISOString() } } });
    const result = await worker(f, async () => { throw new Error("Adapter must not be called"); }); assert.equal(result.results[0].code, "INVITATION_DELIVERY_REVIEW_REQUIRED"); return { status: (await queue(f)).status };
  });
  await check("role expansion after issuance cancels delivery without granting new authority", async () => {
    const f = await fixture("expanded"); await issueUserInvitation(f.input); await real.role.update({ where: { id: f.role.id }, data: { permissions: ["items.read", "accounting.period.close"] } });
    const result = await worker(f, async () => { throw new Error("Adapter must not be called"); }); assert.equal(result.results[0].status, "CANCELLED"); assert.equal((await rows(f)).invites, 1); return { status: "CANCELLED", identityCreated: false };
  });
  const currentInvite = f => real.invite.findFirst({ where: { organizationId: f.organizationId } });
  const cancellation = (f, invite) => ({ actorId: f.actor.id, organizationId: f.organizationId, actorPermissions: f.input.actorPermissions, request: { inviteId: invite.id, revision: invitationRevision(invite), reason: "Synthetic cancellation proof", requestId: crypto.randomUUID() } });
  const replacement = (f, invite) => ({ ...f.input, requestId: crypto.randomUUID(), replace: { inviteId: invite.id, revision: invitationRevision(invite), reason: "Synthetic replacement proof" } });
  await check("legacy pending invitation can be explicitly replaced with new authority evidence", async () => {
    const f = await fixture("legacyreplace"); const old = await real.invite.create({ data: { organizationId: f.organizationId, email: f.input.email, roleId: f.role.id, token: crypto.randomBytes(32).toString("hex"), expiresAt: new Date(Date.now() + 86400000) } });
    assert.equal((await issueUserInvitation(f.input)).code, "INVITATION_PENDING");
    assert.equal((await issueUserInvitation(replacement(f, old))).status, 200);
    assert.equal(await real.invite.findUnique({ where: { token: old.token } }), null); const current = await currentInvite(f); assert.notEqual(current.token, old.token);
    const event = await real.businessEvent.findFirst({ where: { organizationId: f.organizationId, eventType: USER_INVITATION_EVENT } }); assert.equal(event.payload.actorId, f.actor.id); assert.equal(event.payload.replacement.previousRevision, invitationRevision(old)); return { oldLinkInvalidated: true, actualNewIssuerRecorded: true, ...await rows(f) };
  });
  await check("concurrent replacement requests produce one new revision and retain prior history", async () => {
    const f = await fixture("reissuerace"); await issueUserInvitation(f.input); const old = await currentInvite(f);
    const results = await Promise.all([issueUserInvitation(replacement(f, old)), issueUserInvitation(replacement(f, old))]); assert.deepEqual(results.map(row => row.status).sort(), [200, 409]);
    assert.deepEqual(await rows(f), { invites: 1, events: 2, outbox: 2, audits: 2 });
    const boxes = await real.businessEventOutbox.findMany({ where: { organizationId: f.organizationId } }); assert.deepEqual(boxes.map(row => row.status).sort(), ["CANCELLED", "PENDING"]);
    return { statuses: results.map(row => row.status), ...await rows(f) };
  });
  await check("cancellation and replacement cannot both act on the same reviewed revision", async () => {
    const f = await fixture("cancelrace"); await issueUserInvitation(f.input); const old = await currentInvite(f);
    const results = await Promise.all([cancelUserInvitation(cancellation(f, old)), issueUserInvitation(replacement(f, old))]); assert.deepEqual(results.map(row => row.status).sort(), [200, 409]);
    const current = await currentInvite(f); assert.ok(current.status === "CANCELLED" || current.token !== old.token); return { statuses: results.map(row => row.status), retainedInvites: (await rows(f)).invites };
  });
  await check("cancel audit failure rolls back the link, queue and decision, then retry is idempotent", async () => {
    const f = await fixture("cancelaudit"); await issueUserInvitation(f.input); const old = await currentInvite(f), input = cancellation(f, old);
    await assert.rejects(scope.run({ failAudit: true }, () => cancelUserInvitation(input)), /OWNED_QUEUE_AUDIT_FAILURE/);
    assert.equal((await currentInvite(f)).status, "PENDING"); assert.equal((await queue(f)).status, "PENDING"); assert.equal(await real.businessEvent.count({ where: { organizationId: f.organizationId, eventType: "identity.user_invitation.cancelled.v1" } }), 0);
    const first = await cancelUserInvitation(input), second = await cancelUserInvitation(input); assert.equal(first.status, 200); assert.equal(second.data.cancellationId, first.data.cancellationId); assert.equal(second.data.replayed, true);
    assert.equal(await real.auditLog.count({ where: { organizationId: f.organizationId, action: "INVITE_CANCELLED" } }), 1); return { status: (await currentInvite(f)).status, queue: (await queue(f)).status, oneCancellationAudit: true };
  });
  await check("accepted and foreign invitations cannot be cancelled", async () => {
    const f = await fixture("cancelaccepted"), foreign = await fixture("cancelother"); await issueUserInvitation(f.input); await issueUserInvitation(foreign.input);
    await real.invite.updateMany({ where: { organizationId: f.organizationId }, data: { status: "ACCEPTED" } });
    const current = await currentInvite(f), other = await currentInvite(foreign); assert.equal((await cancelUserInvitation(cancellation(f, current))).code, "INVITATION_ALREADY_ACCEPTED");
    assert.equal((await cancelUserInvitation({ ...cancellation(f, current), request: { ...cancellation(f, current).request, inviteId: other.id, revision: invitationRevision(other) } })).status, 404);
    assert.equal((await currentInvite(f)).status, "ACCEPTED"); assert.equal((await currentInvite(foreign)).status, "PENDING"); return { acceptedRetained: true, foreignUnchanged: true };
  });
  await check("replacement retains a previous simulated provider receipt and records a separate request", async () => {
    const f = await fixture("replacehistory"); await issueUserInvitation(f.input); const old = await currentInvite(f); await worker(f, async () => ({ state: "accepted", providerId: "isolated-history-receipt" }));
    const before = await queue(f); assert.equal(before.status, "SENT"); assert.equal((await issueUserInvitation(replacement(f, old))).status, 200);
    const retained = await real.businessEventOutbox.findUnique({ where: { id: before.id } }); assert.equal(retained.status, "SENT"); assert.equal(retained.metadata.providerId, "isolated-history-receipt");
    assert.equal((await queue(f)).status, "PENDING"); assert.equal(await real.invite.findUnique({ where: { token: old.token } }), null); return { historicalReceiptRetained: true, oldLinkInvalid: true, simulatedAdapterOnly: true };
  });
  assert.equal(blockedFetches, 0); receipt.authorityAfter = await authority(); assert.equal(receipt.authorityBefore, receipt.authorityAfter); receipt.authorityUnchanged = true;
}
main().catch(error => { receipt.error = String(error.message).replaceAll(target.toString(), "[database redacted]").split("Failing row contains")[0].slice(0, 1000); process.exitCode = 1; }).finally(async () => {
  receipt.completedAt = new Date().toISOString(); receipt.sourcesAfter = sources(); receipt.sourceStable = sha(receipt.sourcesBefore) === sha(receipt.sourcesAfter);
  receipt.passed = receipt.checks.length; receipt.failed = receipt.error ? 1 : 0; receipt.blockedFetches = blockedFetches; receipt.driverSha256 = sha(fs.readFileSync(__filename));
  await real.$disconnect(); const output = "invitation-queue-postgres-" + run + ".json"; fs.writeFileSync(path.join(__dirname, output), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ output, passed: receipt.passed, failed: receipt.failed, sourceStable: receipt.sourceStable, authorityUnchanged: receipt.authorityUnchanged }));
});
