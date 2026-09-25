import assert from "node:assert/strict"
import { randomUUID, createHash } from "node:crypto"
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { execFileSync } from "node:child_process"
import { Client } from "pg"
import { db } from "@/prisma/db"
import { applyModuleComposition, getModuleCompositionData, previewModuleComposition, reopenModuleComposition, saveModuleCompositionDraft, resumeModuleComposition, type ModuleCompositionActor } from "@/services/modules/module-composition.service"
import { prepareModernModulesLifecycleFixture } from "./modern-modules-lifecycle-fixture"
import { assertModuleNewWorkInTx, ModuleNewWorkStoppedError } from "@/services/modules/module-admission.service"

const DATABASE_NAME = "stoquify_local_modern_modules_controls_20260905_01"
const SOURCE = "local-modern-modules-postgres-controls"
const PERMISSIONS = ["MANAGE_SYSTEM_SETTINGS", "dashboard.read", "sales.read", "inventory.items.read", "finance.read", "accounting.reports.read", "payments.reconciliation.read", "reports.read"]
const CORE = ["dashboard", "settings", "administration"]
type Check = { name: string; passed: boolean; durationMs: number; detail?: string }

export async function runModernModulesPostgresSmoke() {
  const target = new URL(process.env.DATABASE_URL ?? "")
  assert.equal(process.env.MODERN_MODULES_CONTROLS_DATABASE, DATABASE_NAME)
  assert.equal(decodeURIComponent(target.pathname.slice(1)), DATABASE_NAME)
  assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname.toLowerCase()))
  assert.ok(["postgres:", "postgresql:"].includes(target.protocol))
  assert.equal(process.env.DIRECT_URL, target.toString())
  assert.notEqual(process.env.NODE_ENV, "production")
  const identity = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
  assert.equal(identity[0].name, DATABASE_NAME)

  const runId = randomUUID().replaceAll("-", "").slice(0, 12)
  const checks: Check[] = []
  const organizationIds: string[] = []
  const files = ["services/modules/module-composition.service.ts", "services/modules/module-entitlement.service.ts", "services/modules/module-lifecycle-readiness.service.ts", "services/modules/module-stop-policy.service.ts", "scripts/modern-modules-lifecycle-fixture.ts", "scripts/modern-modules-postgres-smoke.ts", "prisma/schema.prisma", "prisma/migrations/20260905170000_add_tenant_module_composition/migration.sql", "prisma/migrations/20260905173000_protect_module_configuration_authority/migration.sql", "prisma/migrations/20260905200000_add_module_lifecycle_command_state/migration.sql", "prisma/migrations/20260905200100_add_module_lifecycle/migration.sql"]
  const sourceHashes = () => files.map((file) => ({ path: file, sha256: createHash("sha256").update(readFileSync(join(process.cwd(), file))).digest("hex") }))
  const sourcesBefore = sourceHashes()
  const sql = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 })
  await sql.connect()
  const check = async (name: string, work: () => Promise<void>) => {
    const started = Date.now()
    try { await work(); checks.push({ name, passed: true, durationMs: Date.now() - started }) }
    catch (error) {
      const detail = error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL redacted]").slice(0, 800) : "Unknown assertion failure"
      checks.push({ name, passed: false, durationMs: Date.now() - started, detail })
    }
  }
  const createActor = async (label: string, requestedModules: string[] = []): Promise<ModuleCompositionActor> => {
    const organizationId = `org_modules_service_smoke_${runId}_${label}`
    const actorId = `usr_modules_service_smoke_${runId}_${label}`
    await db.organization.create({ data: { id: organizationId, name: `Synthetic module controls ${label}`, slug: `module-controls-${runId}-${label}`, requestedModules, onboardingSource: SOURCE, isActive: true } })
    await db.user.create({ data: { id: actorId, organizationId, email: `${runId}.${label}@module-controls.stockflow.test`, name: "Synthetic service actor", mfaBackupCodes: [], isActive: true, emailVerified: false, isVerified: false } })
    organizationIds.push(organizationId)
    return { organizationId, actorId, actorPermissions: PERMISSIONS }
  }
  const applyInput = async (actor: ModuleCompositionActor, selectedModules: string[], key: string, expectedRevision = 0) => {
    const preview = await previewModuleComposition(actor, { selectedModules, expectedRevision })
    return { selectedModules, expectedRevision, idempotencyKey: `${runId}:${key}`, previewHash: preview.previewHash }
  }
  const rejectedSql = async (statement: string, values: unknown[], expectedCode: string) => {
    await sql.query("BEGIN")
    try {
      let code: string | null = null
      try { await sql.query(statement, values) }
      catch (error) { code = (error as { code?: string }).code ?? null }
      assert.equal(code, expectedCode, "PostgreSQL must reject the attempted invariant violation")
    } finally { await sql.query("ROLLBACK") }
  }

  try {
    const legacy = await createActor("legacy")
    const race = await createActor("race")
    const restricted = await createActor("restricted", ["Inventory"])
    const foreign = await createActor("foreign", ["Sales"])
    const superseded = await createActor("superseded")
    const stopped = await createActor("stopped")
    let legacyCommandId = ""
    let legacyOperationId = ""

    await check("concurrent identical submissions commit once and preserve all 19 legacy grants", async () => {
      const input = await applyInput(legacy, ["payment_reconciliation"], "duplicate")
      const results = await Promise.all([applyModuleComposition(legacy, input), applyModuleComposition(legacy, input)])
      assert.ok(results.every((result) => ["REQUESTED", "PREPARING"].includes(result.state)))
      assert.equal(new Set(results.map((result) => result.commandId)).size, 1)
      assert.equal(results.filter((result) => result.alreadyApplied).length, 1)
      legacyCommandId = results[0].commandId
      legacyOperationId = results[0].data.lifecycle!.id
      const configuration = await db.tenantModuleConfiguration.findUniqueOrThrow({ where: { organizationId: legacy.organizationId } })
      assert.equal(configuration.revision, 1)
      assert.equal(configuration.activeRevision, 0)
      assert.equal(configuration.activeModules.length, 19)
      assert.equal(await db.tenantModuleGrant.count({ where: { organizationId: legacy.organizationId } }), 19)
      assert.equal(await db.tenantModuleConfigurationCommand.count({ where: { organizationId: legacy.organizationId } }), 1)
      assert.equal(await db.auditLog.count({ where: { organizationId: legacy.organizationId, action: "MODULE_CONFIGURATION_REQUESTED" } }), 1)
      assert.deepEqual((await db.organization.findUniqueOrThrow({ where: { id: legacy.organizationId } })).requestedModules, [])
    })

    await check("real missing inputs retain active workspace through requested and preparing events", async () => {
      const operation = await db.tenantModuleLifecycleOperation.findUniqueOrThrow({ where: { id: legacyOperationId }, include: { steps: true, events: { orderBy: { sequence: "asc" } } } })
      assert.equal(operation.state, "REQUESTED")
      assert.ok(operation.steps.some(step => step.code === "ACCOUNTING_SETUP_REQUIRED" && step.state === "WAITING_INPUT"))
      assert.ok(operation.steps.some(step => step.code === "PROVIDER_SETUP_REQUIRED" && step.state === "WAITING_INPUT"))
      assert.ok(operation.events.some(event => event.state === "PREPARING"))
      const count = operation.events.length
      const original = await applyInput(legacy, ["payment_reconciliation"], "new-preview", 1)
      await assert.rejects(applyModuleComposition(legacy, { ...original, expectedRevision: 0 }), (error: unknown) => (error as { code?: string }).code === "CONFLICT")
      assert.equal(await db.tenantModuleLifecycleEvent.count({ where: { operationId: legacyOperationId } }), count)
    })

    await check("real setup then resume completes the same operation without repeating succeeded inputs", async () => {
      await prepareModernModulesLifecycleFixture(db, legacy.organizationId, "accounting")
      const waiting = await resumeModuleComposition(legacy, { operationId: legacyOperationId, expectedRevision: 1, idempotencyKey: `${runId}:accounting-ready` })
      assert.equal(waiting.state, "REQUESTED")
      const accountingStep = await db.tenantModuleLifecycleStep.findFirstOrThrow({ where: { operationId: legacyOperationId, moduleSlug: "accounting" } })
      assert.equal(accountingStep.state, "SUCCEEDED")
      const eventCount = await db.tenantModuleLifecycleEvent.count({ where: { operationId: legacyOperationId } })
      await resumeModuleComposition(legacy, { operationId: legacyOperationId, expectedRevision: 1, idempotencyKey: `${runId}:accounting-ready` })
      assert.equal(await db.tenantModuleLifecycleEvent.count({ where: { operationId: legacyOperationId } }), eventCount)
      await prepareModernModulesLifecycleFixture(db, legacy.organizationId, "provider")
      const input = { operationId: legacyOperationId, expectedRevision: 1, idempotencyKey: `${runId}:provider-ready` }
      const results = await Promise.all([resumeModuleComposition(legacy, input), resumeModuleComposition(legacy, input)])
      assert.ok(results.some(result => result.state === "ACTIVE"))
      const configuration = await db.tenantModuleConfiguration.findUniqueOrThrow({ where: { organizationId: legacy.organizationId } })
      assert.equal(configuration.activeRevision, 1)
      assert.deepEqual([...configuration.activeModules].sort(), [...CORE, "finance", "accounting", "payment_reconciliation"].sort())
      assert.equal((await db.tenantModuleLifecycleStep.findUniqueOrThrow({ where: { id: accountingStep.id } })).attempts, accountingStep.attempts)
      assert.equal(await db.auditLog.count({ where: { organizationId: legacy.organizationId, action: "MODULE_CONFIGURATION_ACTIVATED" } }), 1)
      assert.equal((await db.tenantModuleConfigurationCommand.findUniqueOrThrow({ where: { id: legacyCommandId } })).state, "REQUESTED")
    })

    await check("concurrent different commands have exactly one CAS winner without lost rights", async () => {
      const left = await applyInput(race, ["sales"], "cas-sales")
      const right = await applyInput(race, ["inventory"], "cas-inventory")
      const outcomes = await Promise.allSettled([applyModuleComposition(race, left), applyModuleComposition(race, right)])
      assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1)
      const loser = outcomes.find((outcome) => outcome.status === "rejected") as PromiseRejectedResult
      assert.equal(loser.reason.code, "CONFLICT")
      const configuration = await db.tenantModuleConfiguration.findUniqueOrThrow({ where: { organizationId: race.organizationId } })
      assert.equal(configuration.revision, 1)
      assert.equal(await db.tenantModuleGrant.count({ where: { organizationId: race.organizationId } }), 19)
      assert.equal(await db.tenantModuleConfigurationCommand.count({ where: { organizationId: race.organizationId, state: "REQUESTED" } }), 1)
    })

    await check("failed eligibility keeps the prior active configuration and cannot create grants", async () => {
      const before = await getModuleCompositionData(restricted)
      const input = await applyInput(restricted, ["payment_reconciliation"], "failed")
      const result = await applyModuleComposition(restricted, input)
      assert.equal(result.state, "FAILED")
      assert.equal(result.issue?.code, "ELIGIBILITY_REQUIRED")
      assert.equal(result.data.revision, 0)
      assert.deepEqual(result.data.activeModules, before.activeModules)
      assert.equal(await db.tenantModuleGrant.count({ where: { organizationId: restricted.organizationId } }), 4)
      const row = await db.tenantModuleConfigurationCommand.findUniqueOrThrow({ where: { id: result.commandId } })
      assert.equal(row.state, "FAILED")
      assert.ok(row.reviewSnapshot)
      assert.equal(await db.tenantModuleGrant.count({ where: { organizationId: restricted.organizationId, moduleSlug: "payment_reconciliation" } }), 0)
    })

    await check("recovery uses a new reviewed command and preserves failed evidence", async () => {
      const input = await applyInput(restricted, ["inventory"], "recovery")
      const result = await applyModuleComposition(restricted, input)
      assert.equal(result.state, "ACTIVE")
      assert.equal(result.revision, 1)
      assert.equal(await db.tenantModuleConfigurationCommand.count({ where: { organizationId: restricted.organizationId, state: "FAILED" } }), 1)
    })

    await check("cross-tenant history reference is rejected and same-tenant history opens a new draft", async () => {
      assert.ok(legacyCommandId)
      await assert.rejects(reopenModuleComposition(foreign, { commandId: legacyCommandId, expectedRevision: 0, idempotencyKey: `${runId}:foreign` }), (error: unknown) => (error as { code?: string }).code === "NOT_FOUND")
      const restored = await reopenModuleComposition(legacy, { commandId: legacyCommandId, expectedRevision: 1, idempotencyKey: `${runId}:reopen` })
      assert.equal(restored.state, "DRAFT")
      assert.notEqual(restored.id, legacyCommandId)
      assert.equal((await db.tenantModuleConfiguration.findUniqueOrThrow({ where: { organizationId: legacy.organizationId } })).revision, 1)
    })

    await check("draft storage leaves observed configuration unchanged", async () => {
      const before = await db.tenantModuleConfiguration.findUniqueOrThrow({ where: { organizationId: legacy.organizationId } })
      await saveModuleCompositionDraft(legacy, { selectedModules: ["sales"], expectedRevision: 1, idempotencyKey: `${runId}:draft` })
      const after = await db.tenantModuleConfiguration.findUniqueOrThrow({ where: { organizationId: legacy.organizationId } })
      assert.deepEqual(after.activeModules, before.activeModules)
      assert.equal(after.revision, before.revision)
    })

    await check("superseded preparation cannot overwrite a newer active workspace", async () => {
      const pending = await applyModuleComposition(superseded, await applyInput(superseded, ["payment_reconciliation"], "old-pending"))
      assert.equal(pending.state, "REQUESTED")
      const next = await applyModuleComposition(superseded, await applyInput(superseded, ["sales"], "replacement", 1))
      assert.equal(next.state, "ACTIVE")
      const old = await resumeModuleComposition(superseded, { operationId: pending.data.lifecycle!.id, expectedRevision: 1, idempotencyKey: `${runId}:stale-resume` })
      assert.equal(old.state, "FAILED")
      assert.equal(old.issue?.code, "CONFIGURATION_STALE")
      const configuration = await db.tenantModuleConfiguration.findUniqueOrThrow({ where: { organizationId: superseded.organizationId } })
      assert.equal(configuration.activeRevision, 2)
      assert.deepEqual([...configuration.activeModules].sort(), [...CORE, "sales"].sort())
    })

    await check("supported inventory purchasing and payroll stops deny new work and preserve all historical rights", async () => {
      const stopNewWorkModules = ["inventory", "purchasing", "payroll"]
      const preview = await previewModuleComposition(stopped, { selectedModules: [], stopNewWorkModules, expectedRevision: 0 })
      assert.equal(preview.stopImpact.canStop, true)
      const result = await applyModuleComposition(stopped, { selectedModules: [], stopNewWorkModules, expectedRevision: 0, previewHash: preview.previewHash, idempotencyKey: `${runId}:stop-supported` })
      assert.equal(result.state, "RETAINED", JSON.stringify(result.issue))
      const configuration = await db.tenantModuleConfiguration.findUniqueOrThrow({ where: { organizationId: stopped.organizationId } })
      assert.deepEqual([...configuration.newWorkStoppedModules].sort(), [...stopNewWorkModules].sort())
      assert.equal(await db.tenantModuleGrant.count({ where: { organizationId: stopped.organizationId } }), 19)
      assert.equal((await getModuleCompositionData(stopped)).catalog.filter(item => item.eligible).length, 19)
      for (const moduleSlug of ["inventory", "purchasing", "payroll"] as const) {
        await assert.rejects(db.$transaction(tx => assertModuleNewWorkInTx(tx, { organizationId: stopped.organizationId, moduleSlug, operation: "synthetic.new-work-check" })), (error: unknown) => error instanceof ModuleNewWorkStoppedError)
      }
      const restored = await reopenModuleComposition(stopped, { commandId: result.commandId, expectedRevision: 1, idempotencyKey: `${runId}:stopped-history` })
      assert.deepEqual([...restored.stopNewWorkModules].sort(), [...stopNewWorkModules].sort())
      const resumeStops = ["purchasing", "payroll"]
      const resumePreview = await previewModuleComposition(stopped, { selectedModules: ["inventory"], stopNewWorkModules: resumeStops, expectedRevision: 1 })
      const resumed = await applyModuleComposition(stopped, { selectedModules: ["inventory"], stopNewWorkModules: resumeStops, expectedRevision: 1, previewHash: resumePreview.previewHash, idempotencyKey: `${runId}:inventory-reactivated` })
      assert.equal(resumed.state, "RETAINED")
      await db.$transaction(tx => assertModuleNewWorkInTx(tx, { organizationId: stopped.organizationId, moduleSlug: "inventory", operation: "synthetic.resumed-work-check" }))
      assert.equal(await db.tenantModuleGrant.count({ where: { organizationId: stopped.organizationId } }), 19)
    })

    await check("PostgreSQL lifecycle evidence is immutable and tenant-linked", async () => {
      const event = await db.tenantModuleLifecycleEvent.findFirstOrThrow({ where: { operationId: legacyOperationId } })
      await rejectedSql('UPDATE "tenant_module_lifecycle_events" SET "eventType" = $2 WHERE id = $1', [event.id, "tampered"], "P0001")
      await rejectedSql('DELETE FROM "tenant_module_lifecycle_events" WHERE id = $1', [event.id], "P0001")
      await rejectedSql('INSERT INTO "tenant_module_lifecycle_events" (id,"organizationId","operationId",sequence,"eventKey","eventType",state,"actorId",evidence,"evidenceHash") VALUES ($1,$2,$3,100,$4,$5,$6,$7,$8,$9)', [`foreign_event_${runId}`, foreign.organizationId, legacyOperationId, "foreign-event", "FAKE", "REQUESTED", foreign.actorId, "{}", "a".repeat(64)], "23503")
    })

    await check("PostgreSQL rejects duplicate grants within a tenant", async () => {
      await rejectedSql('INSERT INTO "tenant_module_grants" (id, "organizationId", "moduleSlug", status, source, "updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())', [`duplicate_${runId}`, legacy.organizationId, "sales", "active", "manual_override"], "23505")
    })
    await check("PostgreSQL rejects command evidence update and deletion", async () => {
      await rejectedSql('UPDATE "tenant_module_configuration_commands" SET "errorCode" = $2 WHERE id = $1', [legacyCommandId, "tampered"], "P0001")
      await rejectedSql('DELETE FROM "tenant_module_configuration_commands" WHERE id = $1', [legacyCommandId], "P0001")
    })
    await check("PostgreSQL forbids configuration deletion while authority and history remain", async () => {
      await rejectedSql('DELETE FROM "tenant_module_configurations" WHERE "organizationId" = $1', [legacy.organizationId], "23503")
    })
    await check("PostgreSQL prevents a grant or command from being orphaned", async () => {
      await rejectedSql('INSERT INTO "tenant_module_grants" (id, "organizationId", "moduleSlug", status, source, "updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())', [`orphan_grant_${runId}`, foreign.organizationId, "sales", "active", "manual_override"], "23503")
      await rejectedSql('INSERT INTO "tenant_module_configuration_commands" (id, "organizationId", "idempotencyKey", "payloadHash", "expectedRevision", state, "actorId", "updatedAt") VALUES ($1,$2,$3,$4,0,$5,$6,NOW())', [`orphan_command_${runId}`, foreign.organizationId, `${runId}:orphan`, "a".repeat(64), "DRAFT", foreign.actorId], "23503")
    })
    await check("PostgreSQL rejects invalid grant intervals and statuses", async () => {
      await rejectedSql('UPDATE "tenant_module_grants" SET "startsAt" = $2, "endsAt" = $3 WHERE "organizationId" = $1 AND "moduleSlug" = $4', [legacy.organizationId, "2026-09-05T12:00:00Z", "2026-09-05T11:00:00Z", "sales"], "23514")
      await rejectedSql('UPDATE "tenant_module_grants" SET status = $2 WHERE "organizationId" = $1 AND "moduleSlug" = $3', [legacy.organizationId, "unknown-status", "sales"], "23514")
    })
    await check("history records preserve exact preview and grant evidence", async () => {
      const command = await db.tenantModuleConfigurationCommand.findUniqueOrThrow({ where: { id: legacyCommandId } })
      const review = command.reviewSnapshot as { preview: { previewHash: string; preservedAccess: string[] }; grantAuthority: unknown[]; manifestHash: string }
      assert.equal(review.preview.previewHash, command.previewHash)
      assert.equal(review.preview.preservedAccess.length, 19)
      assert.equal(review.grantAuthority.length, 19)
      assert.match(review.manifestHash, /^[a-f0-9]{64}$/)
    })
  } catch (error) {
    checks.push({ name: "smoke fixture setup or execution", passed: false, durationMs: 0, detail: error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL redacted]").slice(0, 800) : "Unknown setup failure" })
    throw error
  } finally {
    await sql.end()
    const sourcesAfter = sourceHashes()
    checks.push({ name: "tested source bindings remained unchanged throughout execution", passed: JSON.stringify(sourcesBefore) === JSON.stringify(sourcesAfter), durationMs: 0 })
    const evidenceDirectory = join(process.cwd(), "what-next", "modern-modules-integration", "2026-09-05-run-01", "evidence")
    mkdirSync(evidenceDirectory, { recursive: true })
    const evidence = { schemaVersion: 1, runId, generatedAt: new Date().toISOString(), database: DATABASE_NAME, source: SOURCE, synthetic: true, authenticatedBrowserEvidence: false, productionEvidence: false, retainedFixtureOrganizations: organizationIds, commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), sourcesBefore, sourcesAfter, checks, passed: checks.filter((item) => item.passed).length, failed: checks.filter((item) => !item.passed).length }
    writeFileSync(join(evidenceDirectory, `modern-modules-postgres-smoke-${runId}.json`), `${JSON.stringify(evidence, null, 2)}\n`)
    console.log(JSON.stringify({ database: DATABASE_NAME, runId, passed: evidence.passed, failed: evidence.failed, synthetic: true, evidence: `modern-modules-postgres-smoke-${runId}.json` }))
  }
  assert.equal(checks.filter((item) => !item.passed).length, 0, "PostgreSQL module composition smoke checks failed; inspect the retained evidence")
}
