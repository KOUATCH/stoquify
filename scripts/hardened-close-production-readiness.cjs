// Offline evidence admission only. No dotenv, network, database, provider calls,
// application startup, sends, migration, deployment or secret-value hashing.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), net = require('node:net');
const { buildReleaseSecretPreflight, hasAcceptableStrength } = require('./release-secret-preflight.js');
const { buildDeploymentDecision, resolveEnvironment } = require('./prisma-production-migration-gate.js');
const release = require('./release-artifact.cjs');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const digest = file => sha(fs.readFileSync(file));
const isSha = value => /^[a-f0-9]{64}$/.test(value || '');
const text = value => typeof value === 'string' && value.trim().length > 0 && !/^(?:unknown|undecided|todo|tbd|null|placeholder|example)$/i.test(value.trim());
function publicHost(value) {
  if (typeof value !== 'string' || value !== value.toLowerCase() || net.isIP(value) || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value)) return false;
  return !/(?:^|\.)(?:localhost|local|internal|private|lan|home|intranet|corp|test|invalid|example|onion|alt|arpa)$/.test(value) && !/(?:^|\.)example\.(?:com|net|org)$/.test(value);
}
function publicOrigin(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && publicHost(url.hostname) && !url.username && !url.password && !url.port && url.origin === value && url.pathname === '/' && !url.search && !url.hash; } catch { return false; }
}
function publicAddress(value) {
  const type = net.isIP(value); if (!type) return false;
  const blocked = new net.BlockList();
  if (type === 4) {
    for (const [host, bits] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]]) blocked.addSubnet(host, bits, 'ipv4');
    return !blocked.check(value, 'ipv4');
  }
  const global = new net.BlockList(); global.addSubnet('2000::', 3, 'ipv6');
  for (const [host, bits] of [['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20]]) blocked.addSubnet(host, bits, 'ipv6');
  return global.check(value, 'ipv6') && !blocked.check(value, 'ipv6');
}
function regular(file) {
  const absolute = path.resolve(file), root = path.parse(absolute).root; let cursor = root;
  for (const part of absolute.slice(root.length).split(path.sep).filter(Boolean)) { cursor = path.join(cursor, part); if (fs.lstatSync(cursor).isSymbolicLink()) throw Error('Linked input refused'); }
  if (!fs.statSync(absolute).isFile()) throw Error('Regular file required'); return absolute;
}
function evidenceFile(file) {
  const absolute = path.resolve(file);
  if (absolute.split(path.sep).some(part => /^\.env(?:\.|$)/i.test(part) || /^(?:credentials?|environment)\.private\./i.test(part)) || !/\.(?:json|log|txt)$/i.test(absolute) || /\.(?:pem|key|pfx)$/i.test(absolute)) throw Error('Private/unsupported evidence path refused');
  return regular(absolute);
}
function assess(plan, options = {}) {
  const env = options.environment || {}, now = options.now || new Date(), base = path.resolve(options.base || '.'), blockers = [], files = [];
  const check = (condition, id) => { if (!condition) blockers.push(id); return Boolean(condition); };
  const verifyArtifact = options.verifyArtifact || release.verify;
  check(plan.version === 1 && plan.purpose === 'hardened-close-production', 'plan_contract_invalid');
  check(options.trustedPlan === true, 'plan_digest_not_independently_pinned');
  const target = plan.target || {}, candidate = plan.candidate || {}, database = plan.database || {}, delivery = plan.delivery || {};
  for (const key of ['provider', 'projectId', 'region', 'platform', 'architecture']) check(text(target[key]), 'target_' + key + '_missing');
  check(['linux', 'win32'].includes(target.platform), 'target_platform_unsupported'); check(['x64', 'arm64'].includes(target.architecture), 'target_architecture_unsupported');
  check(Number.isInteger(target.nodeMajor) && target.nodeMajor >= 20, 'target_node_version_missing'); check(publicOrigin(target.origin), 'target_origin_not_public_https');
  check(target.artifactFormat === 'stoquify-standalone-v2', 'provider_artifact_format_not_qualified');
  // No Vercel Build Output adapter is implemented or qualified by this gate.
  if (String(target.provider).toLowerCase() === 'vercel') blockers.push('vercel_build_output_adapter_not_qualified');
  for (const key of ['provider', 'projectId', 'branchId']) check(text(database[key]), 'database_' + key + '_missing');
  check(database.environment === 'production' && database.connectionMode === 'direct' && database.schema === 'public', 'database_attestation_invalid');
  check(publicHost(database.endpointHost), 'database_endpoint_not_public');
  check(delivery.statementChannel === 'email', 'statement_email_scope_required');
  for (const key of ['resendAccountId', 'statementSender', 'inviteSender']) check(text(delivery[key]), 'delivery_' + key + '_missing');
  const live = value => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
  check(live(env.STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS) && live(env.STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS), 'both_email_capabilities_must_be_explicitly_enabled_in_controlled_environment');
  check(env.RESEND_FROM_EMAIL === delivery.statementSender && (env.STOQUIFY_ACCOUNTANT_INVITE_FROM_EMAIL || env.RESEND_FROM_EMAIL) === delivery.inviteSender, 'sender_environment_binding_mismatch');
  for (const key of ['NEXTAUTH_URL', 'NEXT_PUBLIC_BASE_URL', 'NEXT_PUBLIC_APP_URL', 'APP_URL']) if (key === 'NEXTAUTH_URL' || env[key]) check(env[key] === target.origin, 'origin_environment_mismatch_' + key);
  const preflight = buildReleaseSecretPreflight({ release: 'on', environment: env });
  // Match the runtime's nullish preference; an empty AUTH_SECRET must not hide
  // behind an otherwise usable NEXTAUTH_SECRET.
  check(hasAcceptableStrength(env.AUTH_SECRET ?? env.NEXTAUTH_SECRET), 'runtime_auth_secret_missing_or_weak');
  check(env.NODE_ENV === 'production', 'controlled_environment_must_be_production');
  for (const id of preflight.blockers) blockers.push('secret_preflight_' + id);
  const decision = buildDeploymentDecision(resolveEnvironment('auto', env), env);
  check(decision.shouldDeploy && decision.blockers.length === 0, 'existing_production_target_decision_blocked');
  check(env.AQSTOQFLOW_DATABASE_TARGET === 'production', 'production_target_attestation_missing');
  try {
    const url = new URL(env.DATABASE_URL);
    check(url.hostname === database.endpointHost && publicHost(url.hostname) && !url.hash && (url.searchParams.get('schema') || 'public') === 'public', 'private_database_target_binding_invalid');
    check(!env.DIRECT_URL || env.DIRECT_URL === env.DATABASE_URL, 'private_database_direct_url_mismatch');
    check(![...url.searchParams.keys()].some(key => !['schema', 'connection_limit', 'connect_timeout', 'pool_timeout', 'sslmode'].includes(key)), 'private_database_connection_override');
    check(url.searchParams.get('sslmode') === 'require' || url.searchParams.get('sslmode') === 'verify-full', 'private_database_tls_required');
  } catch { blockers.push('private_database_url_missing_or_invalid'); }
  for (const key of ['sourceManifestSha256', 'artifactSha256', 'catalogSha256']) check(isSha(candidate[key]), 'candidate_' + key + '_missing');
  check(text(candidate.buildId), 'candidate_build_id_missing');
  let artifact, candidateLockSha256;
  try {
    check(text(candidate.directory) && text(candidate.artifactDirectory), 'candidate_paths_missing');
    if (text(candidate.directory) && text(candidate.artifactDirectory) && isSha(candidate.artifactSha256)) {
      artifact = verifyArtifact(path.resolve(base, candidate.directory), path.resolve(base, candidate.artifactDirectory), candidate.artifactSha256);
      check(artifact.buildId === candidate.buildId && sha(JSON.stringify(artifact.source)) === candidate.sourceManifestSha256, 'artifact_source_or_build_mismatch');
      const engines = (artifact.files || []).filter(item => /query_engine.*\.(?:dll|so)\.node$/.test(item.path));
      check(engines.length > 0 && engines.every(item => target.platform === 'win32' ? /query_engine-windows\.dll\.node$/.test(item.path) && target.architecture === 'x64' : /\.so\.node$/.test(item.path) && (target.architecture === 'arm64' ? /arm64|aarch64/.test(item.path) : !/arm64|aarch64/.test(item.path))), 'artifact_native_platform_mismatch');
      const catalog = regular(path.resolve(base, candidate.directory, 'prisma/migration-catalog-manifest.json'));
      check(digest(catalog) === candidate.catalogSha256, 'candidate_catalog_changed'); files.push({ path: catalog, sha256: digest(catalog) });
      const lock = regular(path.resolve(base, candidate.directory, 'package-lock.json'));
      candidateLockSha256 = digest(lock); files.push({ path: lock, sha256: candidateLockSha256 });
    }
  } catch { blockers.push('actual_artifact_verification_failed'); }
  const ageHours = plan.evidenceMaxAgeHours;
  check(Number.isInteger(ageHours) && ageHours > 0 && ageHours <= 168, 'evidence_freshness_policy_invalid');
  function evidence(name) {
    try {
      const pointer = plan.evidence?.[name]; if (!pointer || !text(pointer.path) || !isSha(pointer.sha256)) throw Error('Missing pointer');
      const filename = evidenceFile(path.resolve(base, pointer.path)); if (digest(filename) !== pointer.sha256) throw Error('Evidence bytes changed');
      const value = JSON.parse(fs.readFileSync(filename, 'utf8')); files.push({ path: filename, sha256: pointer.sha256 });
      if (value.kind !== name || value.sourceManifestSha256 !== candidate.sourceManifestSha256 || value.artifactSha256 !== candidate.artifactSha256 || value.buildId !== candidate.buildId || value.origin !== target.origin) throw Error('Evidence subject differs');
      const observed = Date.parse(value.observedAt); if (!Number.isFinite(observed) || observed > now.getTime() || now.getTime() - observed > ageHours * 3600000) throw Error('Stale/future evidence');
      if (!text(value.observer) || !text(value.externalRecordId) || !Array.isArray(value.records) || value.records.length === 0) throw Error('Boolean-only or unattributed evidence');
      for (const record of value.records) {
        if (!isSha(record.sha256) || !text(record.path)) throw Error('Missing raw record binding');
        const raw = evidenceFile(path.resolve(path.dirname(filename), record.path)); if (digest(raw) !== record.sha256) throw Error('Raw record changed'); files.push({ path: raw, sha256: record.sha256 });
      }
      return value;
    } catch { blockers.push('evidence_' + name + '_missing_invalid_stale_or_changed'); return null; }
  }
  const proofs = Object.fromEntries(['build', 'worker', 'hosting', 'database', 'recovery', 'sender', 'scheduler', 'statementAcceptance', 'inviteAcceptance'].map(name => [name, evidence(name)]));
  const build = proofs.build;
  if (build) check(build.platform === target.platform && build.architecture === target.architecture && build.nodeMajor === target.nodeMajor && build.artifactFormat === target.artifactFormat && build.catalogSha256 === candidate.catalogSha256 && text(build.runtimeQualificationId) && text(build.privateConfigExclusionReportId), 'qualified_build_platform_origin_or_catalog_mismatch');
  const worker = proofs.worker;
  if (worker) check(isSha(worker.workerArtifactSha256) && worker.workerArtifactSha256 !== candidate.artifactSha256, 'delivery_worker_must_have_separate_artifact_identity');
  if (worker) check(worker.platform === target.platform && worker.architecture === target.architecture && worker.nodeMajor === target.nodeMajor && worker.sourceEntryPoint === 'scripts/referral-delivery-worker.ts' && isSha(candidateLockSha256) && worker.packageLockSha256 === candidateLockSha256 && isSha(worker.workerArtifactSha256) && text(worker.runtimeQualificationId) && text(worker.nativeRuntimeQualificationId) && text(worker.privateConfigExclusionReportId) && Array.isArray(worker.consumerCapabilities) && ['statement-email', 'accountant-invitation-email'].every(capability => worker.consumerCapabilities.includes(capability)), 'qualified_delivery_worker_runtime_missing_or_mismatched');
  const hosting = proofs.hosting;
  if (hosting) check(hosting.provider === target.provider && hosting.projectId === target.projectId && hosting.region === target.region && text(hosting.protectedEnvironmentId) && text(hosting.promotionMechanismId) && text(hosting.requiredChecksExportId) && text(hosting.tlsVerificationId) && Array.isArray(hosting.resolvedAddresses) && hosting.resolvedAddresses.length > 0 && hosting.resolvedAddresses.every(publicAddress), 'hosting_protection_dns_tls_or_promotion_evidence_missing');
  const db = proofs.database;
  if (db) check(db.provider === database.provider && db.projectId === database.projectId && db.branchId === database.branchId && db.endpointHost === database.endpointHost && db.connectionMode === 'direct' && db.schema === 'public' && db.catalogSha256 === candidate.catalogSha256 && text(db.targetHistoryReportId) && text(db.pendingRiskReportId) && text(db.baselineDecisionId), 'database_history_risk_or_identity_evidence_missing');
  const recovery = proofs.recovery;
  if (recovery) check(recovery.databaseProjectId === database.projectId && recovery.databaseBranchId === database.branchId && Number.isFinite(recovery.retentionDays) && recovery.retentionDays > 0 && Number.isFinite(recovery.approvedRpoSeconds) && recovery.approvedRpoSeconds >= 0 && Number.isFinite(recovery.approvedRtoSeconds) && recovery.approvedRtoSeconds > 0 && Number.isFinite(recovery.measuredRpoSeconds) && recovery.measuredRpoSeconds >= 0 && recovery.measuredRpoSeconds <= recovery.approvedRpoSeconds && Number.isFinite(recovery.measuredRtoSeconds) && recovery.measuredRtoSeconds > 0 && recovery.measuredRtoSeconds <= recovery.approvedRtoSeconds && text(recovery.providerBackupExportId) && text(recovery.restoreDrillId) && text(recovery.recoveryPoint) && text(recovery.incidentCommander) && text(recovery.recoveryOperator) && text(recovery.domainAcceptor), 'hosted_recovery_or_named_approval_evidence_missing');
  const sender = proofs.sender;
  if (sender) check(sender.provider === 'resend' && sender.accountId === delivery.resendAccountId && sender.domainStatus === 'verified' && text(sender.domainId) && text(sender.dnsVerificationId) && Array.isArray(sender.senders) && [delivery.statementSender, delivery.inviteSender].every(address => sender.senders.includes(address)), 'resend_verified_sender_evidence_missing');
  const scheduler = proofs.scheduler;
  if (scheduler) check(text(scheduler.provider) && text(scheduler.scheduleId) && text(scheduler.executionId) && text(scheduler.workerRevision) && worker && isSha(scheduler.workerArtifactSha256) && scheduler.workerArtifactSha256 === worker.workerArtifactSha256 && Array.isArray(scheduler.consumerCapabilities) && scheduler.consumerCapabilities.includes('statement-email') && scheduler.consumerCapabilities.includes('accountant-invitation-email') && scheduler.invocationKind === 'private-cli' && scheduler.entryPoint === 'scripts/referral-delivery-worker.ts' && Array.isArray(scheduler.organizationIds) && scheduler.organizationIds.length > 0 && scheduler.organizationIds.every(text) && text(scheduler.workerId) && Number.isInteger(scheduler.limit) && scheduler.limit > 0 && scheduler.limit <= 100 && text(scheduler.jobIdentityId) && text(scheduler.secretManagerBindingId) && text(scheduler.signedInvocationReceiptId), 'both_delivery_worker_schedule_evidence_missing');
  for (const [name, capability, expectedSender] of [['statementAcceptance', 'statement-email', delivery.statementSender], ['inviteAcceptance', 'accountant-invitation-email', delivery.inviteSender]]) {
    const value = proofs[name];
    if (value) check(value.provider === 'resend' && value.accountId === delivery.resendAccountId && value.capability === capability && value.sender === expectedSender && value.recipientClass === 'owned-test' && text(value.recipientReference) && text(value.deliveryId) && text(value.idempotencyKey) && text(value.messageId) && text(value.providerRequestId) && [200, 201, 202].includes(value.providerHttpStatus) && value.eventType === 'email.delivered' && text(value.providerEventId) && text(value.operatorReceiptId), 'provider_' + name + '_acceptance_missing');
  }
  const unique = [...new Set(blockers)];
  return { status: unique.length ? 'BLOCKED' : 'READY_FOR_CONTROLLED_PRODUCTION_REVIEW', readyForOperatorReview: unique.length === 0, deploymentApproved: false, schemaPromoted: false, applicationDeployed: false,
    checkedAt: now.toISOString(), blockers: unique, target: { provider: text(target.provider) ? target.provider : null, projectId: text(target.projectId) ? target.projectId : null, origin: publicOrigin(target.origin) ? target.origin : null },
    secretVariablePresence: Object.fromEntries(['DATABASE_URL', 'DIRECT_URL', 'AUTH_SECRET', 'NEXTAUTH_SECRET', 'PUBLIC_IDENTITY_ABUSE_HASH_SECRET', 'AQSTOQFLOW_RECEIPT_TOKEN_SECRET', 'AQSTOQFLOW_HISTORY_CURSOR_SECRET', 'AQSTOQFLOW_STATEMENT_TOKEN_SECRET', 'AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY', 'AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL'].map(key => [key, Boolean(env[key])])),
    evidenceFiles: files, limitations: ['Offline admission of independently reviewed, digest-pinned evidence; no fresh provider/DNS/database query or proof of external authenticity.', 'No deployment, migration, sends, backup/restore or live acceptance is executed. Independent authorization and controlled environment remain required.'] };
}
function main(argv = process.argv.slice(2)) {
  if (argv.length !== 4 || argv[0] !== '--plan' || argv[2] !== '--trusted-plan-sha256' || !isSha(argv[3])) throw Error('Usage: --plan <reviewed-plan.json> --trusted-plan-sha256 <independently-retained-sha256>');
  const filename = regular(argv[1]); if (digest(filename) !== argv[3]) throw Error('Trusted plan digest mismatch');
  const report = assess(JSON.parse(fs.readFileSync(filename, 'utf8')), { environment: process.env, base: path.dirname(filename), trustedPlan: true });
  // stdout only; caller may retain this non-secret report. Do not hash the environment.
  console.log(JSON.stringify(report, null, 2)); if (!report.readyForOperatorReview) process.exitCode = 1;
}
if (require.main === module) { try { main(); } catch { console.error('Readiness input refused; verify reviewed plan, trusted digest and file paths. No action executed.'); process.exitCode = 1; } }
module.exports = { assess, publicHost, publicOrigin, publicAddress };
