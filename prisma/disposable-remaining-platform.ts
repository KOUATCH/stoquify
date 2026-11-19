/** Owned disposable fixtures: real platform service transitions; no external calls. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { paymentReconciliationAuthority } from '../services/purchasing/payment-reconciliation-authority';
import { getModuleCompositionData, previewModuleComposition, saveModuleCompositionDraft, applyModuleComposition } from '../services/modules/module-composition.service';
import { observeModuleAccess } from '../services/modules/module-entitlement.service';
import { configureCountryAdapterPilot } from '../services/compliance/country-adapter-pilot.service';
import { recordBusinessEvent } from '../services/events/business-event.service';
import { COMMAND_AGENT_CODE_MANIFEST, resolveActiveCommandAgentDefinition } from '../services/agents/agent-definition.service';
import { COMMAND_AGENT_RELEASE_MANIFEST_HASH, REQUIRED_AGENT_OWNER_RESPONSIBILITIES } from '../services/agents/agent-release-contracts';
import { prepareCommandAgentActivationPackage, reviewCommandAgentActivationPackage, assignCommandAgentActivationOwner, acceptCommandAgentActivationOwnership, recordCommandAgentActivationApproval, provisionCommandAgentShadow, recordCommandAgentPilotCertification, evaluateAgentActivationReadiness } from '../services/agents/agent-release-control.service';
import { runDeterministicAgent, prismaAgentRunStore } from '../services/agents/agent-runner.service';
import { AgentToolRegistry } from '../services/agents/agent-tool-registry.service';
import { COMMAND_AGENT_TOOL_DEFINITIONS, readRoleDailyDigest } from '../services/agents/tools/command-tool-adapters';
import { MVP_AGENT_TOOL_DEFINITIONS } from '../services/agents/tools/command-tools';
import { getInventoryCashSnapshot } from '../services/snapshots/inventory-cash-snapshot.service';
import { getDailyHabitDigestData } from '../services/daily-habit/daily-habit-digest.service';
import { recordCommandAgentFeedback } from '../services/agents/agent-feedback.service';
import { resolveAgentReconcilerInvocationEnvelope, beginAgentReconcilerInvocation, completeAgentReconcilerInvocation, failAgentReconcilerInvocation } from '../services/agents/agent-reconciler-invocation.service';
import { reconcileAgentRuntimeControlPlane } from '../services/agents/agent-control-plane-reconciliation.service';
import type { AgentExecutionContext } from '../services/agents/agent-contracts';
import { createCopilotProposal, decideCopilotProposal } from '../services/ai/copilot-proposal.service';
import { runWorkflowAssuranceRegistry } from '../services/assurance/assurance-registry.service';
import { acknowledgeWorkflowAssuranceIncident, requestWorkflowAssuranceWaiver } from '../services/assurance/assurance-incident.service';
import { loadFollowUps, changeFollowUp, reviewFollowUps, saveFollowUpPreference } from '../services/command-center/persistence.service';

type Actor = { organizationId: string; actorId: string; sessionId: string; sessionToken: string; actorPermissions: string[]; lastAuthAt: Date };
const FIXED = '2026-10-28T20:00:00.000Z';
const END = '2026-10-29T20:00:00.000Z';
const COMMIT = '80e4abb283216b9f8e04b94e5020393f7dcabf62';
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
function ensure(c: unknown, message: string): asserts c { if (!c) throw new Error(message); }

export async function seedRemainingPlatform(org: string, actors: Record<string, Actor>, out: string) {
  const { OUT, NAME, assertManifestTarget } = require('../scripts/disposable-business-dataset.cjs');
  ensure(process.env.NODE_ENV === 'test' && ['synth12_douala', 'synth12_yaounde', 'synth12_bafoussam'].includes(org), 'Owned synthetic test organization required');
  ensure(path.resolve(out) === path.resolve(OUT), 'Owned output directory required');
  const target = new URL(process.env.DATABASE_URL || ''), manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  ensure(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) && NAME.test(decodeURIComponent(target.pathname.slice(1))), 'Local disposable target required');
  ensure(manifest.status === 'schema-verified', 'Schema-verified target required');
  assertManifestTarget(target, manifest);
  ensure((await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`)[0].name === manifest.target.database, 'Database identity mismatch');
  if (manifest.schemaSha256) ensure(sha(readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'))) === manifest.schemaSha256, 'Schema differs from manifest');
  ensure(new Date().toISOString() === FIXED, 'Parent must install Date-only synthetic clock');
  for (const role of ['owner', 'checker', 'accountant', 'manager']) ensure(actors[role]?.organizationId === org, `Scoped ${role} required`);
  ensure(new Set(['owner', 'checker', 'accountant', 'manager'].map(r => actors[r].actorId)).size === 4, 'Independent synthetic application actors required');
  const owner = actors.owner;
  const authority = await db.$transaction(tx => paymentReconciliationAuthority(tx, { organizationId: org, actorId: owner.actorId, sessionId: owner.sessionId, sessionToken: owner.sessionToken }, 'propose', true));
  const actor = { organizationId: org, actorId: owner.actorId, actorPermissions: authority.permissions };
  const documents = path.join(out, 'synthetic-documents'); mkdirSync(documents, { recursive: true });
  const retain = (name: string, value: unknown) => {
    const bytes = JSON.stringify({ classification: 'SYNTHETIC_TEST_ONLY', externalCallsPerformed: false, productionReadinessClaimed: false, value }, null, 2) + '\n';
    const file = path.join(documents, name + '.json');
    if (existsSync(file)) ensure(readFileSync(file, 'utf8') === bytes, `Retained platform artifact changed: ${name}`); else writeFileSync(file, bytes);
    return { file, sha256: sha(bytes), uri: `http://127.0.0.1:3188/${name}.json` };
  };
  const marker = `${org}-remaining-platform-v1`;
  const outcomes: Record<string, unknown> = {}, issues: Array<{ scenario: string; message: string }> = [];
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try { outcomes[name] = await fn(); }
    catch (error) { const message = error instanceof Error ? error.message : String(error); issues.push({ scenario: name, message }); outcomes[name] = { status: 'FAILED', message }; }
  };

  await step('module_composition', async () => {
    const existing = await db.tenantModuleConfigurationCommand.findFirst({ where: { organizationId: org, idempotencyKey: marker + ':apply' } });
    if (existing) {
      ensure(existing.state !== 'FAILED', `Retained composition failed: ${existing.errorCode}`);
      const state = await getModuleCompositionData(actor);
      ensure(!state.newWorkStoppedModules.length, 'Synthetic composition must never stop existing work');
      return { commandId: existing.id, state: existing.state, replayed: true, activeModules: state.activeModules };
    }
    const before = await getModuleCompositionData(actor);
    const selection = { selectedModules: before.selectedModules, expectedRevision: before.revision, stopNewWorkModules: [] };
    const evidence = retain(marker + '-module-selection', { ...selection, previousActiveModules: before.activeModules, purpose: 'Persist existing access without changing entitlements or stopping work' });
    await saveModuleCompositionDraft(actor, { ...selection, idempotencyKey: marker + ':draft' });
    const preview = await previewModuleComposition(actor, selection);
    ensure(preview.canApply, `Current-access composition is blocked: ${JSON.stringify(preview.issues)}`);
    const result = await applyModuleComposition(actor, { ...selection, idempotencyKey: marker + ':apply', previewHash: preview.previewHash });
    ensure(result.state !== 'FAILED', `Composition failed: ${JSON.stringify(result.issue)}`);
    ensure(before.activeModules.every(m => result.data.activeModules.includes(m)) && !result.data.newWorkStoppedModules.length, 'Existing active module access changed');
    return { commandId: result.commandId, state: result.state, evidence, preservedActiveModules: before.activeModules, lifecycle: result.data.lifecycle };
  });

  await step('compliance_sandbox_configuration', async () => {
    const existing = await db.complianceAdapterConfig.findFirst({ where: { organizationId: org, countryCode: 'CM', environment: 'SANDBOX' } });
    const result = existing ?? await configureCountryAdapterPilot({ organizationId: org, actorId: owner.actorId });
    return { result, limitation: 'Sandbox configuration only; no credential, official specification, expert approval or authority submission invented.' };
  });

  await step('business_event_idempotency_conflict', async () => {
    const key = marker + ':event-conflict';
    const input = { organizationId: org, actorId: owner.actorId, eventSource: 'INTERNAL' as const, eventType: 'synthetic.platform.idempotency.probe', sourceEntityType: 'synthetic_platform_probe', sourceId: marker, idempotencyKey: key, occurredAt: new Date(FIXED), payload: { synthetic: true, version: 1, value: 'original' } };
    const recorded = await recordBusinessEvent(input);
    ensure(recorded, 'Business-event recorder must return the retained local event');
    const prior = await db.businessEventAnomaly.findFirst({ where: { organizationId: org, businessEventId: recorded.event.id } });
    if (!prior) {
      let rejected = false;
      try { await recordBusinessEvent({ ...input, payload: { synthetic: true, version: 1, value: 'conflicting-replay' } }); } catch { rejected = true; }
      ensure(rejected, 'Conflicting event payload must be rejected');
    }
    const anomaly = await db.businessEventAnomaly.findFirstOrThrow({ where: { organizationId: org, businessEventId: recorded.event.id } });
    return { anomalyId: anomaly.id, externalDeliveryRequested: false };
  });

  await step('agent_governance', async () => {
    const m = COMMAND_AGENT_CODE_MANIFEST;
    // The shipped provisioner writes these exact code-backed reference definitions.
    // Empty updates avoid downgrading definitions provisioned by another tenant.
    await db.agentToolDefinition.upsert({ where: { key: m.tool.key }, update: {}, create: { key: m.tool.key, ownerService: m.tool.ownerService, moduleSlug: m.tool.moduleSlug, requiredPermission: m.tool.requiredPermission, riskLevel: 'READ_ONLY', toolType: 'READ_ONLY', inputSchemaHash: m.tool.inputSchemaHash, outputSchemaHash: m.tool.outputSchemaHash, approvalPolicy: 'none', idempotencyMode: 'request_key', status: 'DRAFT' } });
    await db.agentSkillDefinition.upsert({ where: { key_version: { key: m.skill.key, version: m.skill.version } }, update: {}, create: { key: m.skill.key, version: m.skill.version, domain: 'daily-habit', promptHash: m.skill.promptHash, ownerModuleSlug: 'dashboard', requiredPermissions: [m.tool.requiredPermission], redactionCategories: ['proof_hidden_identifier', 'reconciliation_suspense_detail', 'payroll_person_amount'], status: 'DRAFT' } });
    await db.agentDefinition.upsert({ where: { key: m.agentKey }, update: {}, create: { key: m.agentKey, name: 'Stoquify Command Agent', description: 'Deterministic evidence-backed read-only Daily Digest; disposable synthetic governance fixture.', ownerModuleSlug: 'dashboard', status: 'DRAFT', rolloutMode: 'SHADOW', riskLevel: 'READ_ONLY', allowedToolKeys: [m.tool.key], allowedSkillKeys: [m.skill.key] } });
    let release = await db.agentActivationPackage.findFirst({ where: { organizationId: org, releaseVersion: marker, environment: 'synthetic-test' } });
    if (!release) release = await prepareCommandAgentActivationPackage({ organizationId: org, releaseVersion: marker, environment: 'synthetic-test', commitSha: COMMIT, allowedRoleCodes: ['owner'], activationStartsAt: FIXED, activationEndsAt: END, requestedById: owner.actorId, residualRisks: { synthetic: true, actualHumanSignoffClaimed: false, deploymentAuthorized: false, noExternalModels: true, sourceState: 'working-tree scenario helper; tracked base commit retained separately' } });
    const reload = () => db.agentActivationPackage.findUniqueOrThrow({ where: { id: release!.id }, include: { approvals: true, owners: true, certifications: true } });
    if (release.state === 'DRAFT') release = await reviewCommandAgentActivationPackage({ organizationId: org, packageId: release.id, actorId: actors.checker.actorId, expectedVersion: release.version });
    for (const responsibility of REQUIRED_AGENT_OWNER_RESPONSIBILITIES) {
      let assigned = await db.agentActivationOwner.findFirst({ where: { packageId: release.id, responsibility } });
      if (!assigned) {
        await assignCommandAgentActivationOwner({ organizationId: org, packageId: release.id, responsibility, primaryUserId: actors.manager.actorId, backupUserId: actors.checker.actorId, escalationRouteRef: 'synthetic-local-only:' + responsibility, runbookVersion: marker, coverageStartsAt: FIXED, coverageEndsAt: END, validUntil: END });
        assigned = await db.agentActivationOwner.findFirstOrThrow({ where: { packageId: release.id, responsibility } });
      }
      if (!assigned.acceptedAt) await acceptCommandAgentActivationOwnership({ organizationId: org, packageId: release.id, responsibility, actorId: actors.manager.actorId, acceptedAt: new Date(FIXED) });
    }
    for (const [approvalType, role] of [['PRODUCT', 'checker'], ['SECURITY', 'accountant']] as const) {
      const evidence = retain(marker + '-' + approvalType.toLowerCase() + '-fixture-review', { manifestHash: COMMAND_AGENT_RELEASE_MANIFEST_HASH, actorId: actors[role].actorId, recordedAt: FIXED, scope: 'Synthetic application approval flow only; shadow reference provisioning', realHumanApproval: false, productionActivation: false });
      await recordCommandAgentActivationApproval({ organizationId: org, packageId: release.id, idempotencyKey: marker + ':' + approvalType, approvalType, decision: 'APPROVED', approverId: actors[role].actorId, evidenceHash: 'sha256:' + evidence.sha256, riskAcceptance: { syntheticFixture: true, productionActivation: false }, decidedAt: FIXED, expiresAt: END });
    }
    release = await reload();
    if (release.state === 'APPROVED') release = await provisionCommandAgentShadow({ organizationId: org, packageId: release.id, actorId: owner.actorId, expectedVersion: release.version });
    ensure(release.state === 'PROVISIONED_INACTIVE', 'Synthetic agent must stay provisioned but inactive');
    const cert = await db.agentPilotCertification.findFirst({ where: { packageId: release.id, idempotencyKey: marker + ':negative-pilot' } });
    if (!cert) {
      const readiness = evaluateAgentActivationReadiness(await reload(), new Date(FIXED));
      ensure(!readiness.ready && readiness.blockers.includes('RELEASE_CERTIFICATION_INVALID'), 'Negative pilot requires an observed genuine readiness failure');
      const proof = retain(marker + '-negative-pilot-readiness', { executedAt: FIXED, source: 'evaluateAgentActivationReadiness', readiness, testResult: 'Release admission is not ready; positive production certification is deliberately absent', commitSha: COMMIT });
      await recordCommandAgentPilotCertification({ organizationId: org, packageId: release.id, idempotencyKey: marker + ':negative-pilot', commitSha: COMMIT, manifestHash: COMMAND_AGENT_RELEASE_MANIFEST_HASH, suiteVersion: 'local-synthetic-readiness-probe-v1', ciRunId: 'local:' + marker, result: 'FAILED', reportHash: 'sha256:' + proof.sha256, passedAt: FIXED, expiresAt: END });
    }
    return { packageId: release.id, state: 'PROVISIONED_INACTIVE', certification: 'FAILED', externalActivation: false };
  });

  await step('agent_runtime_and_proposal', async () => {
    const user = await db.user.findFirstOrThrow({ where: { id: owner.actorId, organizationId: org }, include: { roles: true } });
    const permissions = user.roles.flatMap(r => r.permissions);
    const context: AgentExecutionContext = { organizationId: org, organizationName: org, actorId: owner.actorId, roleCodes: user.roles.map(r => r.code), permissions, isSuperUser: permissions.includes('*'), requestedAgentKey: 'command-agent', sourceRoute: '/dashboard/daily-digest', locale: 'en', currency: 'XAF', periodStart: new Date('2026-10-01T00:00:00.000Z'), periodEnd: new Date(FIXED), resolvedAt: FIXED, moduleDecisions: { dashboard: await observeModuleAccess({ organizationId: org, userId: owner.actorId, moduleSlug: 'dashboard', surfaceType: 'job', surface: 'synthetic-platform-agent-kernel', actorPermissions: permissions, audit: false }) } };
    const provenance = await resolveActiveCommandAgentDefinition('shadow');
    const correlationId = marker + ':digest-read';
    let completed = await db.agentRun.findFirst({ where: { organizationId: org, actorId: owner.actorId, correlationId } });
    if (!completed) {
      const digest = await getDailyHabitDigestData({ organizationId: org, actorId: owner.actorId, actorPermissions: permissions, actorRoleCodes: context.roleCodes, isSuperUser: context.isSuperUser, locale: 'en', periodStart: context.periodStart, periodEnd: context.periodEnd });
      const selected = digest.digests[0];
      ensure(selected, 'Current organization must expose a role-scoped Daily Digest');
      retain(marker + '-digest-kernel-input', { selectedDigestId: selected.id, digest });
      await runDeterministicAgent({ context, correlationId, provenance, invocations: [{ toolKey: COMMAND_AGENT_CODE_MANIFEST.tool.key, input: { digestId: selected.id } }], executeTool: ({ toolInput, context: execution }) => readRoleDailyDigest(toolInput, execution, { loadDigest: async () => digest }) }, { registry: new AgentToolRegistry([...COMMAND_AGENT_TOOL_DEFINITIONS]), store: prismaAgentRunStore, now: () => new Date(FIXED) });
      completed = await db.agentRun.findFirstOrThrow({ where: { organizationId: org, actorId: owner.actorId, correlationId } });
    }
    ensure(completed.status === 'COMPLETED', `Daily Digest kernel status: ${completed.status}/${completed.failureCode}`);
    let blocked = await db.agentRun.findFirst({ where: { organizationId: org, actorId: owner.actorId, correlationId: marker + ':unknown-tool' } });
    if (!blocked) {
      await runDeterministicAgent({ context, correlationId: marker + ':unknown-tool', provenance, invocations: [{ toolKey: 'synthetic-unregistered-write-operation', input: {} }], executeTool: async () => { throw new Error('Unknown tool must never execute'); } }, { registry: new AgentToolRegistry([...COMMAND_AGENT_TOOL_DEFINITIONS]), store: prismaAgentRunStore, now: () => new Date(FIXED) });
      blocked = await db.agentRun.findFirstOrThrow({ where: { organizationId: org, actorId: owner.actorId, correlationId: marker + ':unknown-tool' } });
    }
    ensure(blocked.status === 'BLOCKED', 'Unregistered tool must produce a policy rejection');
    // No billing provider is involved. Record measured zero external consumption,
    // retaining provenance instead of pretending an LLM returned generated tokens.
    const cost = await db.agentCostLedger.upsert({ where: { id: marker + ':zero-cost' }, update: {}, create: { id: marker + ':zero-cost', runId: completed.id, organizationId: org, modelProvider: 'none', modelName: 'deterministic-local-digest', promptTokens: 0, completionTokens: 0, estimatedCost: new Prisma.Decimal(0), currency: 'XAF', budgetBucket: 'SYNTHETIC_LOCAL_NO_EXTERNAL_USAGE' } });
    ensure(cost.runId === completed.id && cost.estimatedCost.isZero() && cost.promptTokens === 0 && cost.completionTokens === 0, 'Retained zero-cost runtime measurement differs');
    if (!await db.agentFeedback.findFirst({ where: { runId: completed.id, actorId: owner.actorId } })) await recordCommandAgentFeedback({ runId: completed.id, organizationId: org, actorId: owner.actorId, kind: 'helpful' });
    // The digest may correctly be blocked by aggregate accounting/close gates.
    // A separate, explicitly synthetic inventory agent reads an actual available
    // source, preserving its grade instead of rewriting the digest's blockers.
    const inventoryTool = MVP_AGENT_TOOL_DEFINITIONS.find(t => t.key === 'readInventoryCashSnapshot')!;
    const inventoryAgentKey = 'synthetic-local-inventory-review';
    const inventorySkillKey = inventoryAgentKey + '-snapshot-v1';
    const inventoryPromptHash = 'sha256:' + sha('SYNTHETIC_TEST_ONLY: deterministic readInventoryCashSnapshot; no model; no business write; v1');
    await db.agentToolDefinition.upsert({ where: { key: inventoryTool.key }, update: {}, create: { key: inventoryTool.key, ownerService: inventoryTool.ownerService, moduleSlug: inventoryTool.moduleSlug, requiredPermission: inventoryTool.requiredPermission, riskLevel: 'READ_ONLY', toolType: 'READ_ONLY', inputSchemaHash: inventoryTool.inputSchemaHash, outputSchemaHash: inventoryTool.outputSchemaHash, approvalPolicy: 'none', idempotencyMode: 'request_key', status: 'ACTIVE' } });
    await db.agentSkillDefinition.upsert({ where: { key_version: { key: inventorySkillKey, version: 1 } }, update: {}, create: { key: inventorySkillKey, version: 1, domain: 'inventory', promptHash: inventoryPromptHash, ownerModuleSlug: 'inventory', requiredPermissions: [inventoryTool.requiredPermission], redactionCategories: [], status: 'ACTIVE' } });
    const inventoryDefinition = await db.agentDefinition.upsert({ where: { key: inventoryAgentKey }, update: {}, create: { key: inventoryAgentKey, name: 'Synthetic local inventory review', description: 'SYNTHETIC_TEST_ONLY reference registry for a local deterministic kernel reading the shipped inventory snapshot service. No external model, production rollout or business-write authority.', ownerModuleSlug: 'inventory', status: 'ACTIVE', rolloutMode: 'SHADOW', riskLevel: 'READ_ONLY', allowedToolKeys: [inventoryTool.key], allowedSkillKeys: [inventorySkillKey] } });
    const inventoryContext: AgentExecutionContext = { ...context, requestedAgentKey: inventoryAgentKey, sourceRoute: '/dashboard/inventory/items', moduleDecisions: { inventory: await observeModuleAccess({ organizationId: org, userId: owner.actorId, moduleSlug: 'inventory', surfaceType: 'job', surface: 'synthetic-inventory-kernel', actorPermissions: permissions, audit: false }) } };
    let inventoryRun = await db.agentRun.findFirst({ where: { organizationId: org, actorId: owner.actorId, correlationId: marker + ':inventory-read' } });
    if (!inventoryRun) {
      const snapshot = await getInventoryCashSnapshot({ organizationId: org, periodStart: context.periodStart, periodEnd: context.periodEnd, now: new Date(FIXED) });
      ensure(snapshot.evidenceGrade !== 'blocked' && !['blocked', 'failed'].includes(snapshot.status), 'Actual inventory source must be available before proposing review');
      retain(marker + '-inventory-kernel-source', snapshot);
      await runDeterministicAgent({ context: inventoryContext, correlationId: marker + ':inventory-read', provenance: { agentDefinitionId: inventoryDefinition.id, skillKey: inventorySkillKey, skillVersion: 1, promptHash: inventoryPromptHash }, invocations: [{ toolKey: inventoryTool.key, input: { organizationId: org } }], executeTool: async () => ({ output: snapshot, safeSummary: 'Actual inventory snapshot retained for synthetic read-only review; no write was performed.', evidence: [{ subjectType: 'inventory.cash', subjectId: org + ':inventory:2026-10', sourceModule: 'inventory', sourceTable: 'inventory_levels', sourceHash: snapshot.sourceHash, evidenceGrade: snapshot.evidenceGrade, freshness: snapshot.freshness.stale ? 'stale' : snapshot.status === 'partial' ? 'partial' : 'fresh', available: true, blockerCount: snapshot.blockers.length, redactionCount: snapshot.redactions.length }] }) }, { registry: new AgentToolRegistry([inventoryTool]), store: prismaAgentRunStore, now: () => new Date(FIXED) });
      inventoryRun = await db.agentRun.findFirstOrThrow({ where: { organizationId: org, actorId: owner.actorId, correlationId: marker + ':inventory-read' } });
    }
    ensure(inventoryRun.status === 'COMPLETED', 'Inventory read-only kernel must complete');
    await db.agentCostLedger.upsert({ where: { id: marker + ':inventory-zero-cost' }, update: {}, create: { id: marker + ':inventory-zero-cost', runId: inventoryRun.id, organizationId: org, modelProvider: 'none', modelName: 'deterministic-local-inventory', promptTokens: 0, completionTokens: 0, estimatedCost: new Prisma.Decimal(0), currency: 'XAF', budgetBucket: 'SYNTHETIC_LOCAL_NO_EXTERNAL_USAGE' } });
    const proof = await db.agentEvidenceLink.findFirstOrThrow({ where: { runId: inventoryRun.id, available: true, evidenceGrade: { not: 'blocked' }, freshness: { notIn: ['BLOCKED', 'FAILED'] } } });
    let proposal = await db.aiActionProposal.findFirst({ where: { organizationId: org, idempotencyKey: marker + ':review-proposal' } });
    if (!proposal) {
      const created = await createCopilotProposal(org, owner.actorId, permissions, { runId: inventoryRun.id, proposalType: 'REQUEST_HUMAN_REVIEW', targetRoute: '/dashboard/inventory/items', requiredPermission: 'inventory.levels.read', title: 'Synthetic inventory review request', detail: 'Disposable scenario: review the retained inventory snapshot; no business write or external model is authorized.', evidence: [{ id: proof.id, subjectType: proof.subjectType, subjectId: proof.subjectId, sourceModule: proof.sourceModule, sourceHash: proof.sourceHash, evidenceGrade: proof.evidenceGrade as 'operational', freshness: proof.freshness.toLowerCase() as 'fresh' | 'stale' | 'partial' | 'empty' | 'unknown', available: true }], periodStart: context.periodStart!, periodEnd: context.periodEnd!, asOf: new Date(FIXED), expiresAt: new Date('2026-10-28T21:00:00.000Z'), idempotencyKey: marker + ':review-proposal' });
      proposal = await db.aiActionProposal.findUniqueOrThrow({ where: { id: created.id } });
    }
    if (proposal.status === 'DRAFT') await decideCopilotProposal(org, owner.actorId, permissions, { proposalId: proposal.id, decision: 'REJECTED', reason: 'Synthetic persona declines optional follow-up; no autonomous business action is permitted.' });
    return { completedRunId: completed.id, inventoryRunId: inventoryRun.id, blockedRunId: blocked.id, proposalId: proposal.id, modelProvider: 'none', scope: 'Actual blocked digest retained honestly; separate synthetic read-only inventory agent uses real inventory evidence. Production admission and external model transport are not exercised.' };
  });

  await step('assurance_control_plane', async () => {
    // An APPROVED package genuinely lacking ownership is a valid negative
    // control-plane scenario. Inactive packages need no passing pilot yet.
    const negativeVersion = marker + '-missing-owners';
    let negative = await db.agentActivationPackage.findFirst({ where: { organizationId: org, releaseVersion: negativeVersion, environment: 'synthetic-test' } });
    if (!negative) negative = await prepareCommandAgentActivationPackage({ organizationId: org, releaseVersion: negativeVersion, environment: 'synthetic-test', commitSha: COMMIT, allowedRoleCodes: ['owner'], activationStartsAt: FIXED, activationEndsAt: END, requestedById: owner.actorId, residualRisks: { synthetic: true, purpose: 'Negative owner-readiness scenario', productionActivation: false } });
    if (negative.state === 'DRAFT') negative = await reviewCommandAgentActivationPackage({ organizationId: org, packageId: negative.id, actorId: actors.checker.actorId, expectedVersion: negative.version });
    for (const [approvalType, role] of [['PRODUCT', 'checker'], ['SECURITY', 'accountant']] as const) {
      const evidence = retain(marker + '-missing-owners-' + approvalType, { packageId: negative.id, approvalType, actorId: actors[role].actorId, scope: 'Synthetic application approval for negative owner-readiness probe; no provisioning or activation allowed', synthetic: true });
      await recordCommandAgentActivationApproval({ organizationId: org, packageId: negative.id, idempotencyKey: marker + ':missing-owners:' + approvalType, approvalType, decision: 'APPROVED', approverId: actors[role].actorId, evidenceHash: 'sha256:' + evidence.sha256, riskAcceptance: { syntheticFixture: true, productionActivation: false }, decidedAt: FIXED, expiresAt: END });
    }
    ensure(await db.agentActivationOwner.count({ where: { packageId: negative.id } }) === 0, 'Negative ownership fixture must remain unprovisioned');
    const envelope = resolveAgentReconcilerInvocationEnvelope({ runId: marker + ':missing-owners-reconciler', scheduledAt: FIXED, environment: 'synthetic-test', now: new Date(FIXED) });
    const start = await beginAgentReconcilerInvocation({ envelope, now: new Date(FIXED) });
    ensure(start.kind !== 'in_progress', 'Retained reconciler lease is still in progress; diagnose before retry');
    if (start.kind === 'replayed') ensure(['COMPLETED', 'COMPLETED_WITH_WARNINGS'].includes(start.invocation.status), 'Prior reconciler invocation failed; inspect retained failure before resuming');
    if (start.kind === 'acquired') {
      try {
        const result = await reconcileAgentRuntimeControlPlane({ executionKey: marker + ':missing-owners-scan', correlationId: marker, now: new Date(FIXED) });
        await completeAgentReconcilerInvocation({ invocationId: start.invocation.id, result, completedWithWarnings: result.failed > 0 || !result.alertTransportReady, now: new Date(FIXED) });
      } catch (error) {
        await failAgentReconcilerInvocation({ invocationId: start.invocation.id, failureCode: 'SYNTHETIC_SCENARIO_EXECUTION_FAILED', now: new Date(FIXED) });
        throw error;
      }
    }
    const executionKey = marker + ':ledger-registry';
    if (!await db.workflowAssuranceCheckRun.findFirst({ where: { organizationId: org, executionKey } })) await runWorkflowAssuranceRegistry({ organizationId: org, actorId: owner.actorId, actorPermissions: authority.permissions, executionKey, checkKey: 'ledger.journal_entry.balanced', runType: 'manual' });
    const incident = await db.workflowAssuranceIncident.findFirstOrThrow({ where: { organizationId: org, sourceId: negative.id, checkKey: 'agent.runtime.control_plane.integrity' } });
    if (incident.status === 'OPEN') await acknowledgeWorkflowAssuranceIncident({ organizationId: org, incidentId: incident.id, actorId: actors.checker.actorId, note: 'Synthetic inactive release has expected incomplete pilot/transport controls; keep activation disabled.' });
    const existingWaiver = await db.workflowAssuranceWaiver.findFirst({ where: { organizationId: org, incidentId: incident.id, requesterId: actors.manager.actorId } });
    if (existingWaiver) {
      const file = path.join(documents, marker + '-waiver-request.json');
      ensure(existsSync(file) && sha(readFileSync(file)) === existingWaiver.evidenceHash, 'Original waiver-request evidence bytes must remain intact');
    } else {
      const proof = retain(marker + '-waiver-request', { incidentId: incident.id, sourceHash: incident.sourceHash, reason: 'Request a limited test-only exception review for the intentionally unprovisioned owner-incomplete release. No waiver approval or production activation is granted.', expiresAt: END });
      await requestWorkflowAssuranceWaiver({ organizationId: org, incidentId: incident.id, actorId: actors.manager.actorId, reason: 'Time-bounded synthetic scenario review; activation stays disabled and the request remains unapproved.', evidenceHash: proof.sha256, expiresAt: new Date(END), metadata: { synthetic: true, retainedDocumentUri: proof.uri } });
    }
    const alerts = await db.workflowAssuranceAlertDelivery.findMany({ where: { organizationId: org, incidentId: incident.id } });
    ensure(alerts.length > 0 && alerts.every(a => a.status === 'PENDING'), 'Expected only queued, undispatched local alert evidence');
    return { invocation: start.kind, incidentId: incident.id, alertIds: alerts.map(a => a.id), deliveriesAttempted: 0, waiverApproval: false };
  });

  await step('command_center', async () => {
    const previous = process.env.COMMAND_CENTER_PERSISTENCE_ENABLED;
    process.env.COMMAND_CENTER_PERSISTENCE_ENABLED = 'true';
    try {
      const identity = { organizationId: org, actorId: owner.actorId, session: { id: owner.sessionId, token: owner.sessionToken } };
      // A location scope excludes payroll/global sources; loss and stock evidence
      // are read through the actual snapshot services without altering them.
      const query = { center: 'digest' as const, locationId: `${org}_loc_1`, periodStart: '2025-11-01T00:00:00.000Z', periodEnd: FIXED };
      await saveFollowUpPreference(identity, { ...query, enabled: true, quietStart: null, quietEnd: null });
      let snapshot = await loadFollowUps(identity, query);
      const item = snapshot.items.find(i => i.condition === 'ACTIVE' && i.canAssign);
      ensure(item, 'Expected an actionable real stock/loss/receiving follow-up');
      if (item.ownerId !== owner.actorId || item.coordination !== 'ASSIGNED') snapshot = await changeFollowUp(identity, { ...query, requestId: marker + ':assign', itemId: item.id, expectedRevision: item.revision, ownerId: owner.actorId, state: 'ASSIGNED', dueAt: END });
      const receipt = await db.commandCenterReviewReceipt.findFirst({ where: { organizationId: org, actorId: owner.actorId, requestId: marker + ':review' } });
      if (!receipt) snapshot = await reviewFollowUps(identity, { ...query, requestId: marker + ':review', expectedRevision: snapshot.revision, evidenceKey: snapshot.evidenceKey });
      const notices = await db.commandCenterNotice.count({ where: { organizationId: org, recipientId: owner.actorId, occurrenceId: item.id } });
      ensure(notices > 0, 'Assignment must retain an in-app follow-up notice');
      return { occurrenceId: item.id, reviewCurrent: snapshot.review.current, notices, externalMessagesSent: 0 };
    } finally {
      if (previous === undefined) delete process.env.COMMAND_CENTER_PERSISTENCE_ENABLED; else process.env.COMMAND_CENTER_PERSISTENCE_ENABLED = previous;
    }
  });
  return { organizationId: org, classification: 'SYNTHETIC_TEST_ONLY', outcomes, issues };
}
