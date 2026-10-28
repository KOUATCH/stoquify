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

function parseArgs(argv = process.argv) {
  const args = { out: null, jsonOut: null };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--out") args.out = path.resolve(argv[++index]);
    else if (argv[index] === "--json-out")
      args.jsonOut = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return args;
}

function safeDatabase(env = process.env) {
  const raw =
    env.PAYROLL_IMMUTABILITY_DATABASE_URL || env.TEST_DATABASE_URL || "";
  if (!raw) {
    throw new Error(
      "Set PAYROLL_IMMUTABILITY_DATABASE_URL or TEST_DATABASE_URL to a dedicated test database.",
    );
  }
  const parsed = new URL(raw);
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !SAFE_HOSTS.has(parsed.hostname) ||
    !SAFE_DATABASE.test(database)
  ) {
    throw new Error(
      "Refusing Payroll Trust Spine certification outside a local disposable test database.",
    );
  }
  return { raw, host: parsed.hostname, database };
}

function buildIds(label, suffix) {
  return {
    organizationId: `trust_cert_org_${label}_${suffix}`,
    periodId: `trust_cert_period_${label}_${suffix}`,
    runId: `trust_cert_run_${label}_${suffix}`,
    reviewEventId: `trust_cert_review_${label}_${suffix}`,
  };
}

async function createReviewedRun(client, ids, suffix) {
  await client.query(
    `INSERT INTO "organizations" ("id", "name", "slug", "updatedAt")
     VALUES ($1, 'Payroll Trust Spine certification', $2, CURRENT_TIMESTAMP)`,
    [ids.organizationId, `payroll-trust-cert-${suffix}`],
  );
  await client.query(
    `INSERT INTO "payroll_periods" (
       "id", "organizationId", "name", "periodStart", "periodEnd", "payDate", "countryCode", "updatedAt"
     ) VALUES (
       $1, $2, 'Trust Spine certification', TIMESTAMP '2026-08-01',
       TIMESTAMP '2026-08-31', TIMESTAMP '2026-08-31', 'CM', CURRENT_TIMESTAMP
     )`,
    [ids.periodId, ids.organizationId],
  );
  await client.query(
    `INSERT INTO "business_events" (
       "id", "organizationId", "eventType", "eventSource", "idempotencyKey",
       "payloadHash", "payload", "occurredAt", "actorId", "status", "processedAt", "updatedAt"
     ) VALUES (
       $1, $2, 'PAYROLL_RUN_REVIEWED', 'INTERNAL', $3,
       'sha256:reviewed-base', '{}'::JSONB, CURRENT_TIMESTAMP, 'reviewer-cert',
       'APPLIED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
     )`,
    [ids.reviewEventId, ids.organizationId, `reviewed-base-${suffix}`],
  );
  await client.query(
    `INSERT INTO "payroll_runs" (
       "id", "organizationId", "payrollPeriodId", "runNumber", "status", "version",
       "countryCode", "countryPackVersion", "countryPackSchemaVersion",
       "countryPackResolutionHash", "countryPackCapabilityStatus", "ruleSetHash",
       "calculationHash", "attendanceSnapshotHash", "preparedById", "reviewedById",
       "reviewedAt", "reviewedBusinessEventId", "updatedAt"
     ) VALUES (
       $1, $2, $3, $4, 'REVIEWED', 2,
       'CM', 'cert-pack', '1', 'sha256:pack', 'EXPERT_REVIEW_REQUIRED', 'sha256:rules',
       'sha256:calculation', 'sha256:attendance', 'preparer-cert', 'reviewer-cert',
       CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP
     )`,
    [ids.runId, ids.organizationId, ids.periodId, `CERT-${suffix}`, ids.reviewEventId],
  );
}

function approvalArtifacts(ids, contender) {
  return {
    actorId: `approver-${contender}`,
    eventId: `${ids.runId}_approval_event_${contender}`,
    eventKey: `${ids.runId}_approval_key_${contender}`,
    outboxId: `${ids.runId}_approval_outbox_${contender}`,
    auditId: `${ids.runId}_approval_audit_${contender}`,
    transitionId: `${ids.runId}_approval_transition_${contender}`,
    transitionKey: `${ids.runId}_transition_key_${contender}`,
  };
}

async function prepareApprovalAttempt(connectionString, ids, artifacts) {
  const client = new Client({ connectionString });
  await client.connect();
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  try {
    await client.query(
      `INSERT INTO "business_events" (
         "id", "organizationId", "eventType", "eventSource", "idempotencyKey",
         "payloadHash", "payload", "occurredAt", "actorId", "updatedAt"
       ) VALUES (
         $1, $2, 'PAYROLL_RUN_APPROVED', 'INTERNAL', $3,
         $4, '{}'::JSONB, CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP
       )`,
      [
        artifacts.eventId,
        ids.organizationId,
        artifacts.eventKey,
        `sha256:${artifacts.eventKey}`,
        artifacts.actorId,
      ],
    );
    await client.query(
      `INSERT INTO "business_event_outbox" (
         "id", "organizationId", "businessEventId", "channel", "eventName", "destination",
         "idempotencyKey", "payloadHash", "payload", "updatedAt"
       ) VALUES (
         $1, $2, $3, 'NOTIFICATION', 'payroll_run.approved', 'payroll',
         $4, $5, '{}'::JSONB, CURRENT_TIMESTAMP
       )`,
      [
        artifacts.outboxId,
        ids.organizationId,
        artifacts.eventId,
        artifacts.eventKey,
        `sha256:${artifacts.eventKey}`,
      ],
    );
    await client.query(
      `INSERT INTO "audit_logs" (
         "id", "entityType", "entityId", "action", "changes", "organizationId"
       ) VALUES ($1, 'PayrollRun', $2, 'PAYROLL_RUN_APPROVED', '{}'::JSONB, $3)`,
      [artifacts.auditId, ids.runId, ids.organizationId],
    );
    return client;
  } catch (error) {
    await client.query("ROLLBACK");
    await client.end();
    throw error;
  }
}

async function finishApprovalAttempt(client, ids, artifacts, injectFailure) {
  try {
    await client.query(
      `INSERT INTO "payroll_run_transitions" (
         "id", "organizationId", "payrollRunId", "sequence", "fromStatus", "toStatus",
         "fromVersion", "toVersion", "actorId", "transitionedAt", "businessEventId",
         "idempotencyKey", "payloadHash", "origin", "evidenceStatus"
       ) VALUES (
         $1, $2, $3, 1, 'REVIEWED', 'APPROVED', 2, 3, $4,
         CURRENT_TIMESTAMP, $5, $6, $7, 'RUNTIME', 'VERIFIED'
       )`,
      [
        artifacts.transitionId,
        ids.organizationId,
        ids.runId,
        artifacts.actorId,
        artifacts.eventId,
        artifacts.transitionKey,
        `sha256:${artifacts.transitionKey}`,
      ],
    );
    const compareAndSet = await client.query(
      `UPDATE "payroll_runs"
       SET "status" = 'APPROVED', "version" = 3, "approvedById" = $1,
           "approvedAt" = CURRENT_TIMESTAMP, "approvedBusinessEventId" = $2,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "organizationId" = $3 AND "id" = $4
         AND "status" = 'REVIEWED' AND "version" = 2`,
      [artifacts.actorId, artifacts.eventId, ids.organizationId, ids.runId],
    );
    if (compareAndSet.rowCount !== 1) {
      const error = new Error("Payroll approval compare-and-set lost");
      error.code = "CAS_LOST";
      throw error;
    }
    await client.query(
      `UPDATE "business_events"
       SET "status" = 'APPLIED', "processedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "organizationId" = $1 AND "id" = $2`,
      [ids.organizationId, artifacts.eventId],
    );
    if (injectFailure) throw new Error("INJECTED_AFTER_CAS_BEFORE_COMMIT");
    await client.query("COMMIT");
    return { won: true, code: null, artifacts };
  } catch (error) {
    await client.query("ROLLBACK");
    return {
      won: false,
      code: error.code || error.message,
      artifacts,
    };
  } finally {
    await client.end();
  }
}

async function readAtomicState(client, ids, contenders) {
  const artifactIds = contenders.map((entry) => entry.eventId);
  const run = await client.query(
    `SELECT "status", "version", "approvedById", "approvedBusinessEventId"
     FROM "payroll_runs" WHERE "organizationId" = $1 AND "id" = $2`,
    [ids.organizationId, ids.runId],
  );
  const transitions = await client.query(
    `SELECT "businessEventId", "actorId" FROM "payroll_run_transitions"
     WHERE "organizationId" = $1 AND "payrollRunId" = $2`,
    [ids.organizationId, ids.runId],
  );
  const events = await client.query(
    `SELECT "id" FROM "business_events"
     WHERE "organizationId" = $1 AND "id" = ANY($2::TEXT[])`,
    [ids.organizationId, artifactIds],
  );
  const outbox = await client.query(
    `SELECT "businessEventId" FROM "business_event_outbox"
     WHERE "organizationId" = $1 AND "businessEventId" = ANY($2::TEXT[])`,
    [ids.organizationId, artifactIds],
  );
  const audits = await client.query(
    `SELECT "id" FROM "audit_logs"
     WHERE "organizationId" = $1 AND "entityType" = 'PayrollRun'
       AND "entityId" = $2 AND "action" = 'PAYROLL_RUN_APPROVED'`,
    [ids.organizationId, ids.runId],
  );
  return {
    run: run.rows[0] || null,
    transitions: transitions.rows,
    eventIds: events.rows.map((row) => row.id),
    outboxEventIds: outbox.rows.map((row) => row.businessEventId),
    auditCount: audits.rowCount,
  };
}

async function runCertification(safety) {
  const setup = new Client({ connectionString: safety.raw });
  await setup.connect();
  const checks = [];
  const add = (name, passed, details) =>
    checks.push({ name, passed: Boolean(passed), details });
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const raceIds = buildIds("race", suffix);
    await createReviewedRun(setup, raceIds, `race-${suffix}`);
    const contenderA = approvalArtifacts(raceIds, "a");
    const contenderB = approvalArtifacts(raceIds, "b");
    const clientA = await prepareApprovalAttempt(safety.raw, raceIds, contenderA);
    const clientB = await prepareApprovalAttempt(safety.raw, raceIds, contenderB);
    const raceResults = await Promise.all([
      finishApprovalAttempt(clientA, raceIds, contenderA, false),
      finishApprovalAttempt(clientB, raceIds, contenderB, false),
    ]);
    const raceState = await readAtomicState(setup, raceIds, [contenderA, contenderB]);
    const winner = raceResults.find((result) => result.won);
    const committedEventId = winner?.artifacts.eventId || null;
    add(
      "concurrent_approval_has_one_atomic_winner",
      raceResults.filter((result) => result.won).length === 1 &&
        raceResults.filter((result) => !result.won).length === 1 &&
        raceState.run?.status === "APPROVED" &&
        raceState.run?.version === 3 &&
        raceState.run?.approvedBusinessEventId === committedEventId &&
        raceState.transitions.length === 1 &&
        raceState.transitions[0]?.businessEventId === committedEventId &&
        raceState.eventIds.length === 1 &&
        raceState.eventIds[0] === committedEventId &&
        raceState.outboxEventIds.length === 1 &&
        raceState.outboxEventIds[0] === committedEventId &&
        raceState.auditCount === 1,
      {
        winners: raceResults.filter((result) => result.won).length,
        losers: raceResults.filter((result) => !result.won).length,
        loserCodes: raceResults.filter((result) => !result.won).map((result) => result.code),
        transitionCount: raceState.transitions.length,
        eventCount: raceState.eventIds.length,
        outboxCount: raceState.outboxEventIds.length,
        auditCount: raceState.auditCount,
      },
    );

    const beforeDuplicate = JSON.stringify(raceState);
    let duplicateRejected = false;
    let duplicateCode = winner ? null : "NO_CONCURRENCY_WINNER";
    if (winner) {
      const duplicateClient = await prepareApprovalAttempt(
        safety.raw,
        raceIds,
        winner.artifacts,
      ).catch((error) => ({ preparationError: error }));
      if (duplicateClient.preparationError) {
        duplicateRejected = true;
        duplicateCode =
          duplicateClient.preparationError.code ||
          duplicateClient.preparationError.message;
      } else {
        const duplicateResult = await finishApprovalAttempt(
          duplicateClient,
          raceIds,
          winner.artifacts,
          false,
        );
        duplicateRejected = !duplicateResult.won;
        duplicateCode = duplicateResult.code;
      }
    }
    const afterDuplicate = await readAtomicState(setup, raceIds, [contenderA, contenderB]);
    add(
      "duplicate_evidence_is_rejected_without_partial_commit",
      duplicateRejected && beforeDuplicate === JSON.stringify(afterDuplicate),
      { duplicateCode, transitionCount: afterDuplicate.transitions.length },
    );

    const rollbackIds = buildIds("rollback", suffix);
    await createReviewedRun(setup, rollbackIds, `rollback-${suffix}`);
    const rollbackArtifacts = approvalArtifacts(rollbackIds, "injected");
    const rollbackClient = await prepareApprovalAttempt(
      safety.raw,
      rollbackIds,
      rollbackArtifacts,
    );
    const rollbackResult = await finishApprovalAttempt(
      rollbackClient,
      rollbackIds,
      rollbackArtifacts,
      true,
    );
    const rollbackState = await readAtomicState(setup, rollbackIds, [rollbackArtifacts]);
    add(
      "failure_injection_rolls_back_run_event_outbox_audit_and_transition",
      !rollbackResult.won &&
        rollbackResult.code === "INJECTED_AFTER_CAS_BEFORE_COMMIT" &&
        rollbackState.run?.status === "REVIEWED" &&
        rollbackState.run?.version === 2 &&
        rollbackState.run?.approvedById === null &&
        rollbackState.run?.approvedBusinessEventId === null &&
        rollbackState.transitions.length === 0 &&
        rollbackState.eventIds.length === 0 &&
        rollbackState.outboxEventIds.length === 0 &&
        rollbackState.auditCount === 0,
      {
        failureCode: rollbackResult.code,
        runStatus: rollbackState.run?.status,
        runVersion: rollbackState.run?.version,
        transitionCount: rollbackState.transitions.length,
        eventCount: rollbackState.eventIds.length,
        outboxCount: rollbackState.outboxEventIds.length,
        auditCount: rollbackState.auditCount,
      },
    );
  } finally {
    await setup.end();
  }

  return checks;
}

function render(report) {
  const lines = [
    "# Payroll Trust Spine PostgreSQL concurrency and rollback certification",
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
    "This certificate uses a guarded local disposable PostgreSQL database. It is internal engineering evidence, not production-database or statutory evidence.",
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
    fs.writeFileSync(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
}

async function main(argv = process.argv) {
  const args = parseArgs(argv);
  const safety = safeDatabase();
  const checks = await runCertification(safety);
  const blockers = checks.filter((check) => !check.passed).map((check) => check.name);
  const report = {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    target: {
      host: safety.host,
      database: safety.database,
      scope: "ISOLATED_LOCAL_DISPOSABLE_POSTGRESQL",
    },
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
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}

module.exports = {
  buildIds,
  parseArgs,
  runCertification,
  safeDatabase,
};
