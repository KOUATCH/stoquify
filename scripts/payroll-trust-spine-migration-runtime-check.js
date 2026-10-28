#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const SAFE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "host.docker.internal",
]);
const SAFE_DATABASE = /(test|ci|local|sandbox|immutability)/i;
const MIGRATION_NAME = "20260821210000_payroll_trust_spine_transition_ledger";

function parseArgs(argv) {
  const args = { out: null, jsonOut: null };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--out") args.out = path.resolve(argv[++index]);
    else if (argv[index] === "--json-out")
      args.jsonOut = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return args;
}

function safeDatabase() {
  const raw =
    process.env.PAYROLL_IMMUTABILITY_DATABASE_URL ||
    process.env.TEST_DATABASE_URL ||
    "";
  if (!raw) {
    throw new Error(
      "Set PAYROLL_IMMUTABILITY_DATABASE_URL or TEST_DATABASE_URL to a dedicated test database.",
    );
  }
  const parsed = new URL(raw);
  const database = parsed.pathname.replace(/^\//, "");
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !SAFE_HOSTS.has(parsed.hostname) ||
    !SAFE_DATABASE.test(database)
  ) {
    throw new Error(
      "Refusing Payroll Trust Spine migration proof outside a local disposable test database.",
    );
  }
  return { raw, host: parsed.hostname, database };
}

function extractBackfillSql() {
  const migration = fs.readFileSync(
    path.join(
      process.cwd(),
      "prisma",
      "migrations",
      MIGRATION_NAME,
      "migration.sql",
    ),
    "utf8",
  );
  const start = migration.indexOf('INSERT INTO "payroll_run_transitions"');
  const end = migration.indexOf(
    'CREATE OR REPLACE FUNCTION "payroll_run_transition_validate_runtime"',
  );
  if (start < 0 || end <= start)
    throw new Error("Backfill SQL markers are missing.");
  return migration.slice(start, end).trim();
}

async function expectRejected(client, sql) {
  await client.query("SAVEPOINT expected_rejection");
  try {
    await client.query(sql);
    await client.query("ROLLBACK TO SAVEPOINT expected_rejection");
    return { rejected: false, sqlState: null };
  } catch (error) {
    await client.query("ROLLBACK TO SAVEPOINT expected_rejection");
    return { rejected: true, sqlState: error.code || null };
  }
}

async function runProof(safety) {
  const client = new Client({ connectionString: safety.raw });
  await client.connect();
  const checks = [];
  const add = (name, passed, details) =>
    checks.push({ name, passed: Boolean(passed), details });

  try {
    const migration = await client.query(
      'SELECT finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name = $1',
      [MIGRATION_NAME],
    );
    add(
      "migration_applied",
      migration.rowCount === 1 &&
        migration.rows[0].finished_at &&
        !migration.rows[0].rolled_back_at,
      { rows: migration.rowCount },
    );

    const columns = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'payroll_run_transitions'`,
    );
    const columnNames = new Set(columns.rows.map((row) => row.column_name));
    const requiredColumns = [
      "organizationId",
      "payrollRunId",
      "sequence",
      "fromStatus",
      "toStatus",
      "fromVersion",
      "toVersion",
      "actorId",
      "businessEventId",
      "idempotencyKey",
      "payloadHash",
      "origin",
      "evidenceStatus",
    ];
    add(
      "transition_columns_present",
      requiredColumns.every((column) => columnNames.has(column)),
      {
        present: requiredColumns.filter((column) => columnNames.has(column))
          .length,
        total: requiredColumns.length,
      },
    );

    const constraints = await client.query(
      `SELECT conname, convalidated
       FROM pg_constraint
       WHERE conrelid = 'payroll_run_transitions'::regclass`,
    );
    const constraintNames = new Set(constraints.rows.map((row) => row.conname));
    add(
      "tenant_and_evidence_constraints_present",
      [
        "payroll_run_transitions_run_tenant_fkey",
        "payroll_run_transitions_event_tenant_fkey",
        "payroll_run_transitions_evidence_check",
        "payroll_run_transitions_sequence_check",
      ].every((name) => constraintNames.has(name)) &&
        constraints.rows.every((row) => row.convalidated),
      { count: constraints.rowCount },
    );

    const triggers = await client.query(
      `SELECT tgname
       FROM pg_trigger
       WHERE tgrelid = 'payroll_run_transitions'::regclass AND NOT tgisinternal`,
    );
    const triggerNames = new Set(triggers.rows.map((row) => row.tgname));
    add(
      "runtime_and_append_only_triggers_present",
      [
        "payroll_run_transitions_validate_runtime",
        "payroll_run_transitions_append_only",
      ].every((name) => triggerNames.has(name)),
      { triggers: [...triggerNames].sort() },
    );

    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const organizationId = `trust_spine_org_${suffix}`;
    const periodId = `trust_spine_period_${suffix}`;
    const runId = `trust_spine_run_${suffix}`;

    await client.query("BEGIN");
    await client.query(
      `INSERT INTO "organizations" ("id", "name", "slug", "updatedAt")
       VALUES ($1, 'Trust Spine Migration Proof', $2, CURRENT_TIMESTAMP)`,
      [organizationId, `trust-spine-${suffix}`],
    );
    await client.query(
      `INSERT INTO "payroll_periods" (
         "id", "organizationId", "name", "periodStart", "periodEnd", "payDate", "countryCode", "updatedAt"
       ) VALUES (
         $1, $2, 'Migration proof', TIMESTAMP '2026-08-01', TIMESTAMP '2026-08-31', TIMESTAMP '2026-08-31', 'CM', CURRENT_TIMESTAMP
       )`,
      [periodId, organizationId],
    );
    await client.query(
      `INSERT INTO "payroll_runs" (
         "id", "organizationId", "payrollPeriodId", "runNumber", "status", "version",
         "countryCode", "countryPackVersion", "countryPackSchemaVersion",
         "countryPackResolutionHash", "countryPackCapabilityStatus", "ruleSetHash",
         "calculationHash", "attendanceSnapshotHash", "postedById", "postedAt", "updatedAt"
       ) VALUES (
         $1, $2, $3, $4, 'POSTED', 7,
         'CM', 'proof-pack', '1', 'sha256:pack', 'EXPERT_REVIEW_REQUIRED', 'sha256:rules',
         'sha256:calculation', 'sha256:attendance', 'poster-proof', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )`,
      [runId, organizationId, periodId, `TRUST-${suffix}`],
    );

    const backfillSql = extractBackfillSql();
    const firstBackfill = await client.query(backfillSql);
    const secondBackfill = await client.query(backfillSql);
    const legacyRows = await client.query(
      `SELECT "origin", "evidenceStatus", "fromStatus", "fromVersion", "toStatus", "toVersion",
              "idempotencyKey", "payloadHash"
       FROM "payroll_run_transitions"
       WHERE "organizationId" = $1 AND "payrollRunId" = $2`,
      [organizationId, runId],
    );
    const legacy = legacyRows.rows[0] || {};
    add(
      "legacy_backfill_is_idempotent",
      firstBackfill.rowCount === 1 &&
        secondBackfill.rowCount === 0 &&
        legacyRows.rowCount === 1,
      {
        firstInsertCount: firstBackfill.rowCount,
        secondInsertCount: secondBackfill.rowCount,
        finalCount: legacyRows.rowCount,
      },
    );
    add(
      "legacy_backfill_is_honestly_partial",
      legacy.origin === "LEGACY_BACKFILL" &&
        legacy.evidenceStatus === "LEGACY_PARTIAL_EVIDENCE" &&
        legacy.fromStatus === null &&
        legacy.fromVersion === null &&
        legacy.toStatus === "POSTED" &&
        legacy.toVersion === 7 &&
        legacy.idempotencyKey === null &&
        legacy.payloadHash === null,
      {
        origin: legacy.origin,
        evidenceStatus: legacy.evidenceStatus,
        toStatus: legacy.toStatus,
        toVersion: legacy.toVersion,
      },
    );

    const reviewRunId = `trust_spine_review_run_${suffix}`;
    const reviewEventId = `trust_spine_review_event_${suffix}`;
    await client.query(
      `INSERT INTO "payroll_runs" (
         "id", "organizationId", "payrollPeriodId", "runNumber", "status", "version",
         "countryCode", "countryPackVersion", "countryPackSchemaVersion",
         "countryPackResolutionHash", "countryPackCapabilityStatus", "ruleSetHash",
         "calculationHash", "attendanceSnapshotHash", "preparedById", "updatedAt"
       ) VALUES (
         $1, $2, $3, $4, 'CALCULATED', 1,
         'CM', 'proof-pack', '1', 'sha256:pack', 'EXPERT_REVIEW_REQUIRED', 'sha256:rules',
         'sha256:calculation', 'sha256:attendance', 'preparer-proof', CURRENT_TIMESTAMP
       )`,
      [reviewRunId, organizationId, periodId, `TRUST-REVIEW-${suffix}`],
    );
    await client.query(
      `INSERT INTO "business_events" (
         "id", "organizationId", "eventType", "idempotencyKey", "payloadHash", "payload",
         "occurredAt", "actorId", "updatedAt"
       ) VALUES ($1, $2, 'PAYROLL_RUN_REVIEWED', $3, 'sha256:review', '{}'::JSONB,
                 CURRENT_TIMESTAMP, 'reviewer-proof', CURRENT_TIMESTAMP)`,
      [reviewEventId, organizationId, `review-event-${suffix}`],
    );
    const validRuntime = await client.query(
      `INSERT INTO "payroll_run_transitions" (
         "id", "organizationId", "payrollRunId", "sequence", "fromStatus", "toStatus",
         "fromVersion", "toVersion", "actorId", "transitionedAt", "businessEventId",
         "idempotencyKey", "payloadHash", "origin", "evidenceStatus"
       ) VALUES ($1, $2, $3, 1, 'CALCULATED', 'REVIEWED', 1, 2, 'reviewer-proof',
                 CURRENT_TIMESTAMP, $4, $5, 'sha256:review', 'RUNTIME', 'VERIFIED')`,
      [
        `trust_spine_review_transition_${suffix}`,
        organizationId,
        reviewRunId,
        reviewEventId,
        `review-transition-${suffix}`,
      ],
    );
    add(
      "complete_runtime_transition_is_accepted",
      validRuntime.rowCount === 1,
      {
        inserted: validRuntime.rowCount,
      },
    );

    const missingActorRunId = `trust_spine_missing_actor_run_${suffix}`;
    const missingActorEventId = `trust_spine_missing_actor_event_${suffix}`;
    await client.query(
      `INSERT INTO "payroll_runs" (
         "id", "organizationId", "payrollPeriodId", "runNumber", "status", "version",
         "countryCode", "countryPackVersion", "countryPackSchemaVersion",
         "countryPackResolutionHash", "countryPackCapabilityStatus", "ruleSetHash",
         "calculationHash", "attendanceSnapshotHash", "updatedAt"
       ) VALUES (
         $1, $2, $3, $4, 'CALCULATED', 1,
         'CM', 'proof-pack', '1', 'sha256:pack', 'EXPERT_REVIEW_REQUIRED', 'sha256:rules',
         'sha256:calculation', 'sha256:attendance', CURRENT_TIMESTAMP
       )`,
      [missingActorRunId, organizationId, periodId, `TRUST-MISSING-${suffix}`],
    );
    await client.query(
      `INSERT INTO "business_events" (
         "id", "organizationId", "eventType", "idempotencyKey", "payloadHash", "payload",
         "occurredAt", "actorId", "updatedAt"
       ) VALUES ($1, $2, 'PAYROLL_RUN_REVIEWED', $3, 'sha256:missing', '{}'::JSONB,
                 CURRENT_TIMESTAMP, 'reviewer-proof', CURRENT_TIMESTAMP)`,
      [missingActorEventId, organizationId, `missing-event-${suffix}`],
    );
    const missingActor = await expectRejected(
      client,
      `INSERT INTO "payroll_run_transitions" (
         "id", "organizationId", "payrollRunId", "sequence", "fromStatus", "toStatus",
         "fromVersion", "toVersion", "actorId", "transitionedAt", "businessEventId",
         "idempotencyKey", "payloadHash", "origin", "evidenceStatus"
       ) VALUES ('trust_spine_missing_transition_${suffix}', '${organizationId}', '${missingActorRunId}',
                 1, 'CALCULATED', 'REVIEWED', 1, 2, 'reviewer-proof', CURRENT_TIMESTAMP,
                 '${missingActorEventId}', 'missing-transition-${suffix}', 'sha256:missing',
                 'RUNTIME', 'VERIFIED')`,
    );
    add(
      "missing_source_actor_fails_closed",
      missingActor.rejected && missingActor.sqlState === "23514",
      { sqlState: missingActor.sqlState },
    );

    const otherOrganizationId = `trust_spine_other_org_${suffix}`;
    const crossedEventId = `trust_spine_crossed_event_${suffix}`;
    const crossedRunId = `trust_spine_crossed_run_${suffix}`;
    await client.query(
      `INSERT INTO "organizations" ("id", "name", "slug", "updatedAt")
       VALUES ($1, 'Trust Spine Other Tenant', $2, CURRENT_TIMESTAMP)`,
      [otherOrganizationId, `trust-spine-other-${suffix}`],
    );
    await client.query(
      `INSERT INTO "business_events" (
         "id", "organizationId", "eventType", "idempotencyKey", "payloadHash", "payload",
         "occurredAt", "actorId", "updatedAt"
       ) VALUES ($1, $2, 'PAYROLL_RUN_REVIEWED', $3, 'sha256:crossed', '{}'::JSONB,
                 CURRENT_TIMESTAMP, 'reviewer-proof', CURRENT_TIMESTAMP)`,
      [crossedEventId, otherOrganizationId, `crossed-event-${suffix}`],
    );
    await client.query(
      `INSERT INTO "payroll_runs" (
         "id", "organizationId", "payrollPeriodId", "runNumber", "status", "version",
         "countryCode", "countryPackVersion", "countryPackSchemaVersion",
         "countryPackResolutionHash", "countryPackCapabilityStatus", "ruleSetHash",
         "calculationHash", "attendanceSnapshotHash", "preparedById", "updatedAt"
       ) VALUES (
         $1, $2, $3, $4, 'CALCULATED', 1,
         'CM', 'proof-pack', '1', 'sha256:pack', 'EXPERT_REVIEW_REQUIRED', 'sha256:rules',
         'sha256:calculation', 'sha256:attendance', 'preparer-proof', CURRENT_TIMESTAMP
       )`,
      [crossedRunId, organizationId, periodId, `TRUST-CROSSED-${suffix}`],
    );
    const crossedEvent = await expectRejected(
      client,
      `INSERT INTO "payroll_run_transitions" (
         "id", "organizationId", "payrollRunId", "sequence", "fromStatus", "toStatus",
         "fromVersion", "toVersion", "actorId", "transitionedAt", "businessEventId",
         "idempotencyKey", "payloadHash", "origin", "evidenceStatus"
       ) VALUES ('trust_spine_crossed_transition_${suffix}', '${organizationId}', '${crossedRunId}',
                 1, 'CALCULATED', 'REVIEWED', 1, 2, 'reviewer-proof', CURRENT_TIMESTAMP,
                 '${crossedEventId}', 'crossed-transition-${suffix}', 'sha256:crossed',
                 'RUNTIME', 'VERIFIED')`,
    );
    add(
      "cross_tenant_event_fails_closed",
      crossedEvent.rejected && crossedEvent.sqlState === "23514",
      { sqlState: crossedEvent.sqlState },
    );

    const update = await expectRejected(
      client,
      `UPDATE "payroll_run_transitions" SET "legacyNote" = 'mutated' WHERE "organizationId" = '${organizationId}' AND "payrollRunId" = '${runId}'`,
    );
    const deletion = await expectRejected(
      client,
      `DELETE FROM "payroll_run_transitions" WHERE "organizationId" = '${organizationId}' AND "payrollRunId" = '${runId}'`,
    );
    add(
      "transition_evidence_is_append_only",
      update.rejected &&
        deletion.rejected &&
        update.sqlState === "23514" &&
        deletion.sqlState === "23514",
      { updateSqlState: update.sqlState, deleteSqlState: deletion.sqlState },
    );

    await client.query("ROLLBACK");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    await client.end();
  }

  return checks;
}

function render(report) {
  const lines = [
    "# Payroll Trust Spine migration runtime proof",
    "",
    `Generated: ${report.generatedAt}`,
    `Target: ${report.target.host}/${report.target.database}`,
    `Decision: ${report.ready ? "READY" : "BLOCKED"}`,
    "",
    "| Check | Result |",
    "| --- | --- |",
    ...report.checks.map(
      (check) => `| ${check.name} | ${check.passed ? "PASS" : "FAIL"} |`,
    ),
    "",
    `Blockers: ${report.blockers.length ? report.blockers.join(", ") : "none"}`,
    "",
    "This is isolated local PostgreSQL engineering evidence, not production-database evidence.",
  ];
  return `${lines.join("\n")}\n`;
}

function writeOutputs(report, args) {
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, render(report), "utf8");
  }
  if (args.jsonOut) {
    fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true });
    fs.writeFileSync(
      args.jsonOut,
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
  }
}

async function main(argv = process.argv) {
  const args = parseArgs(argv);
  const safety = safeDatabase();
  const checks = await runProof(safety);
  const blockers = checks
    .filter((check) => !check.passed)
    .map((check) => check.name);
  const report = {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    target: {
      host: safety.host,
      database: safety.database,
      scope: "ISOLATED_LOCAL_TEST",
    },
    migration: MIGRATION_NAME,
    ready: blockers.length === 0,
    checks,
    blockers,
  };
  writeOutputs(report, args);
  console.log(render(report));
  return report.ready ? 0 : 1;
}

if (require.main === module) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { parseArgs, safeDatabase, extractBackfillSql, runProof };
