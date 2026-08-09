#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

require("dotenv").config();

const DEFAULT_MANIFEST =
  "what-next/referrals/CUSTOMER_REFERRAL_PILOT_EVIDENCE_INPUT.template.json";
const DEFAULT_MARKDOWN_OUT =
  "what-next/referrals/customer-referral-pilot-evidence-readiness.md";
const DEFAULT_JSON_OUT =
  "what-next/referrals/customer-referral-pilot-evidence-readiness.json";
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const GIT_REVISION_PATTERN = /^[a-f0-9]{40}$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/;

const PILOT_EVIDENCE_SQL = String.raw`
WITH statement_row AS (
  SELECT s.*
  FROM customer_statement_snapshots s
  WHERE s.id = $1
    AND s."organizationId" = $2
    AND s."generatedAt" >= $4::timestamptz
    AND s."generatedAt" <= $5::timestamptz
),
statement_attribution AS (
  SELECT a.*
  FROM referral_attributions a
  JOIN statement_row s
    ON s."organizationId" = a."organizationId"
   AND s.id = a."statementSnapshotId"
  WHERE a."sourceType" = 'CUSTOMER_STATEMENT'
    AND a."sourceId" = s.id
    AND a."createdAt" >= $4::timestamptz
    AND a."createdAt" <= $5::timestamptz
),
eligible_tokens AS (
  SELECT t.*, a.id AS attribution_id, s."contentHash" AS statement_content_hash
  FROM customer_statement_access_tokens t
  JOIN statement_row s
    ON s."organizationId" = t."organizationId"
   AND s.id = t."statementSnapshotId"
  JOIN statement_attribution a
    ON a."organizationId" = t."organizationId"
   AND a.id = t."referralAttributionId"
  WHERE t."statementContentHash" = s."contentHash"
    AND t."allowView" = true
    AND (
      $6 = 'EITHER'
      AND (t."allowDispute" = true OR t."allowPromiseToPay" = true)
      OR $6 = 'DISPUTE' AND t."allowDispute" = true
      OR $6 = 'PROMISE_TO_PAY' AND t."allowPromiseToPay" = true
    )
),
sent_deliveries AS (
  SELECT d.*, latest_state."occurredAt" AS sent_at
  FROM customer_statement_deliveries d
  JOIN statement_row s
    ON s."organizationId" = d."organizationId"
   AND s.id = d."statementSnapshotId"
  JOIN eligible_tokens t
    ON t."organizationId" = d."organizationId"
   AND t.id = d."tokenId"
   AND t.attribution_id = d."attributionId"
  JOIN LATERAL (
    SELECT state.status, state."occurredAt"
    FROM customer_statement_delivery_states state
    WHERE state."organizationId" = d."organizationId"
      AND state."deliveryId" = d.id
    ORDER BY state.version DESC, state."occurredAt" DESC
    LIMIT 1
  ) latest_state ON true
  WHERE latest_state.status = 'SENT'
    AND d."statementContentHash" = s."contentHash"
    AND ($7 = 'EITHER' OR d.channel::text = $7)
    AND d."createdAt" >= $4::timestamptz
    AND d."createdAt" <= $5::timestamptz
    AND latest_state."occurredAt" >= $4::timestamptz
    AND latest_state."occurredAt" <= $5::timestamptz
),
view_logs AS (
  SELECT log.*
  FROM customer_statement_access_logs log
  JOIN statement_row s
    ON s."organizationId" = log."organizationId"
   AND s.id = log."statementSnapshotId"
  JOIN eligible_tokens t
    ON t."organizationId" = log."organizationId"
   AND t.id = log."tokenId"
  WHERE log.action = 'VIEW'
    AND log.outcome = 'GRANTED'
    AND log."statementContentHash" = s."contentHash"
    AND log."occurredAt" >= $4::timestamptz
    AND log."occurredAt" <= $5::timestamptz
    AND t."issuedAt" <= log."occurredAt"
    AND t."expiresAt" >= log."occurredAt"
    AND (t."revokedAt" IS NULL OR t."revokedAt" >= log."occurredAt")
),
recipient_actions AS (
  SELECT action.*, latest_state.status AS latest_status,
         latest_state."stateHash" AS latest_state_hash,
         latest_state."evidenceHash" AS latest_evidence_hash
  FROM customer_statement_recipient_actions action
  JOIN statement_row s
    ON s."organizationId" = action."organizationId"
   AND s.id = action."statementSnapshotId"
  JOIN eligible_tokens t
    ON t."organizationId" = action."organizationId"
   AND t.id = action."tokenId"
  JOIN LATERAL (
    SELECT state.status, state."stateHash", state."evidenceHash"
    FROM customer_statement_recipient_action_states state
    WHERE state."organizationId" = action."organizationId"
      AND state."actionId" = action.id
    ORDER BY state.version DESC, state."effectiveAt" DESC
    LIMIT 1
  ) latest_state ON true
  WHERE ($6 = 'EITHER' OR action."actionType"::text = $6)
    AND latest_state.status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')
    AND action."createdAt" >= $4::timestamptz
    AND action."createdAt" <= $5::timestamptz
),
response_logs AS (
  SELECT DISTINCT action.id AS action_id, log.id AS log_id
  FROM recipient_actions action
  JOIN customer_statement_access_logs log
    ON log."organizationId" = action."organizationId"
   AND log."statementSnapshotId" = action."statementSnapshotId"
   AND log."tokenId" = action."tokenId"
   AND log.action::text = action."actionType"::text
   AND log.outcome = 'GRANTED'
   AND log."responseHash" IS NOT NULL
   AND log."occurredAt" >= action."createdAt"
   AND log."occurredAt" <= action."createdAt" + interval '5 minutes'
),
impression_events AS (
  SELECT event.*
  FROM referral_attribution_events event
  JOIN statement_attribution a
    ON a."organizationId" = event."organizationId"
   AND a.id = event."attributionId"
  JOIN view_logs log ON log.id = event."sourceEventKey"
  WHERE event."eventType" = 'IMPRESSION'
    AND event."occurredAt" >= $4::timestamptz
    AND event."occurredAt" <= $5::timestamptz
),
click_events AS (
  SELECT event.*
  FROM referral_attribution_events event
  JOIN statement_attribution a
    ON a."organizationId" = event."organizationId"
   AND a.id = event."attributionId"
  WHERE event."eventType" = 'CLICK'
    AND event."occurredAt" >= $4::timestamptz
    AND event."occurredAt" <= $5::timestamptz
),
conversion_events AS (
  SELECT event.*
  FROM referral_attribution_events event
  JOIN statement_attribution a
    ON a."organizationId" = event."organizationId"
   AND a.id = event."attributionId"
  WHERE event."eventType" = 'CONVERSION'
    AND event."targetOrganizationId" = $3
    AND event."sourceEventKey" = $3
    AND event."occurredAt" >= $4::timestamptz
    AND event."occurredAt" <= $5::timestamptz
),
target_organization AS (
  SELECT organization.*
  FROM organizations organization
  WHERE organization.id = $3
    AND organization.id <> $2
    AND organization."isActive" = true
    AND organization."deletedAt" IS NULL
    AND organization."onboardingSource" = 'aqstoqflow-register-v2'
    AND organization."onboardingCompletedAt" IS NOT NULL
    AND organization."createdAt" >= $4::timestamptz
    AND organization."createdAt" <= $5::timestamptz
    AND EXISTS (
      SELECT 1
      FROM unnest(organization."requestedModules") module_name
      WHERE lower(module_name) = 'accounting'
    )
),
target_users AS (
  SELECT app_user.*
  FROM users app_user
  JOIN target_organization organization
    ON organization.id = app_user."organizationId"
  WHERE app_user."isActive" = true
    AND app_user."emailVerified" = true
    AND app_user."isVerified" = true
    AND app_user."lastLogin" >= $4::timestamptz
    AND app_user."lastLogin" <= $5::timestamptz
),
sequence_evidence AS (
  SELECT 1
  FROM statement_row statement
  JOIN sent_deliveries delivery ON true
  JOIN view_logs view_log
    ON view_log."occurredAt" >= delivery.sent_at
  JOIN recipient_actions action
    ON action."createdAt" >= view_log."occurredAt"
  JOIN response_logs response_log ON response_log.action_id = action.id
  JOIN click_events click_event
    ON click_event."occurredAt" >= view_log."occurredAt"
  JOIN conversion_events conversion_event
    ON conversion_event."occurredAt" >= click_event."occurredAt"
  JOIN target_organization target ON true
  JOIN target_users target_user ON true
  WHERE delivery.sent_at >= statement."generatedAt"
  LIMIT 1
)
SELECT
  EXISTS (SELECT 1 FROM statement_row) AS statement_exists,
  EXISTS (
    SELECT 1 FROM statement_row s
    WHERE s."contentHash" ~ '^[a-f0-9]{64}$'
      AND s."idempotencyPayloadHash" ~ '^[a-f0-9]{64}$'
      AND s.truncated = false
      AND s."itemCount" > 0
      AND s."includedItemCount" = s."sourceItemCount"
      AND jsonb_typeof(s."statementPayload"::jsonb) = 'object'
      AND jsonb_typeof(s."sourceDocumentHashes"::jsonb) = 'array'
      AND jsonb_array_length(s."sourceDocumentHashes"::jsonb) > 0
  ) AS statement_integrity,
  (SELECT count(*)::int FROM eligible_tokens) AS token_count,
  EXISTS (
    SELECT 1 FROM eligible_tokens t
    WHERE t."tokenHash" ~ '^[a-f0-9]{64}$'
      AND t."jtiHash" ~ '^[a-f0-9]{64}$'
      AND t."statementContentHash" = t.statement_content_hash
  ) AS token_integrity,
  (SELECT count(*)::int FROM sent_deliveries) AS sent_delivery_count,
  EXISTS (
    SELECT 1 FROM sent_deliveries d
    WHERE d."destinationHash" ~ '^[a-f0-9]{64}$'
      AND d."consentEvidenceHash" ~ '^[a-f0-9]{64}$'
      AND length(trim(d."redactedDestination")) > 0
  ) AS delivery_integrity,
  (SELECT count(*)::int FROM view_logs) AS granted_view_count,
  EXISTS (
    SELECT 1 FROM view_logs log
    WHERE length(log."tokenHashPrefix") = 12
      AND log."responseHash" ~ '^[a-f0-9]{64}$'
      AND (log."ipHash" IS NULL OR log."ipHash" ~ '^[a-f0-9]{64}$')
      AND (log."userAgentHash" IS NULL OR log."userAgentHash" ~ '^[a-f0-9]{64}$')
  ) AS redacted_view_evidence,
  (SELECT count(*)::int FROM recipient_actions) AS recipient_action_count,
  (SELECT count(*)::int FROM response_logs) AS response_log_count,
  EXISTS (
    SELECT 1 FROM recipient_actions action
    WHERE action."payloadHash" ~ '^[a-f0-9]{64}$'
      AND action."noteHash" ~ '^[a-f0-9]{64}$'
      AND action.latest_state_hash ~ '^[a-f0-9]{64}$'
      AND action.latest_evidence_hash ~ '^[a-f0-9]{64}$'
  ) AS recipient_action_integrity,
  (SELECT count(*)::int FROM impression_events) AS impression_count,
  (SELECT count(*)::int FROM click_events) AS click_count,
  (SELECT count(*)::int FROM conversion_events) AS conversion_count,
  EXISTS (
    SELECT 1 FROM conversion_events event
    WHERE event."payloadHash" ~ '^[a-f0-9]{64}$'
      AND event."subjectHash" ~ '^[a-f0-9]{64}$'
      AND event.metadata->>'source' = 'ORGANIZATION_REGISTRATION'
      AND event.metadata->>'sourceType' = 'CUSTOMER_STATEMENT'
  ) AS conversion_integrity,
  EXISTS (SELECT 1 FROM target_organization) AS target_organization_ready,
  EXISTS (SELECT 1 FROM target_users) AS target_user_ready,
  EXISTS (SELECT 1 FROM sequence_evidence) AS sequence_complete
`;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    mode: "report",
    manifest: DEFAULT_MANIFEST,
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") options.root = path.resolve(argv[++index]);
    else if (value === "--mode") options.mode = argv[++index];
    else if (value === "--manifest") options.manifest = argv[++index];
    else if (value === "--out") options.out = argv[++index];
    else if (value === "--json-out") options.jsonOut = argv[++index];
    else throw new Error("Unknown argument: " + value);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Unsupported mode: " + options.mode);
  }
  return options;
}

function classifyDatabaseUrl(rawUrl) {
  if (!rawUrl) return { configured: false, supported: false, targetClass: "unconfigured" };
  try {
    const parsed = new URL(rawUrl);
    const supported = ["postgres:", "postgresql:"].includes(parsed.protocol);
    return {
      configured: true,
      supported,
      targetClass: supported ? "postgresql" : "unsupported",
    };
  } catch {
    return { configured: true, supported: false, targetClass: "invalid" };
  }
}

function readManifest(root, manifestPath) {
  const target = path.resolve(root, manifestPath);
  if (!fs.existsSync(target)) {
    return { exists: false, parsed: null, errors: ["manifest_missing"] };
  }
  try {
    return {
      exists: true,
      parsed: JSON.parse(fs.readFileSync(target, "utf8")),
      errors: [],
    };
  } catch {
    return { exists: true, parsed: null, errors: ["manifest_unparseable"] };
  }
}

function validateManifest(value, now = new Date()) {
  const errors = [];
  const manifest = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const safeIdFields = [
    "pilotId",
    "sourceOrganizationId",
    "statementSnapshotId",
    "targetOrganizationId",
  ];
  if (manifest.version !== 1) errors.push("manifest_version");
  for (const field of safeIdFields) {
    if (!SAFE_ID_PATTERN.test(String(manifest[field] || ""))) {
      errors.push(`manifest_${field}`);
    }
  }
  if (
    manifest.sourceOrganizationId &&
    manifest.sourceOrganizationId === manifest.targetOrganizationId
  ) {
    errors.push("manifest_source_target_must_differ");
  }
  if (!GIT_REVISION_PATTERN.test(String(manifest.releaseRevision || ""))) {
    errors.push("manifest_release_revision");
  }
  if (!["DISPUTE", "PROMISE_TO_PAY", "EITHER"].includes(manifest.requiredRecipientAction)) {
    errors.push("manifest_required_recipient_action");
  }
  if (!["EMAIL", "WHATSAPP", "EITHER"].includes(manifest.requiredDeliveryChannel)) {
    errors.push("manifest_required_delivery_channel");
  }
  const startedAt = new Date(String(manifest.pilotStartedAt || ""));
  const completedAt = new Date(String(manifest.pilotCompletedAt || ""));
  const approvedAt = new Date(String(manifest.approvedAt || ""));
  if (Number.isNaN(startedAt.getTime())) errors.push("manifest_pilot_started_at");
  if (Number.isNaN(completedAt.getTime())) errors.push("manifest_pilot_completed_at");
  if (Number.isNaN(approvedAt.getTime())) errors.push("manifest_approved_at");
  if (
    !Number.isNaN(startedAt.getTime()) &&
    !Number.isNaN(completedAt.getTime()) &&
    completedAt <= startedAt
  ) {
    errors.push("manifest_pilot_window_order");
  }
  if (
    !Number.isNaN(completedAt.getTime()) &&
    !Number.isNaN(approvedAt.getTime()) &&
    approvedAt < completedAt
  ) {
    errors.push("manifest_approval_before_completion");
  }
  if (!Number.isNaN(approvedAt.getTime()) && approvedAt > new Date(now.getTime() + 300_000)) {
    errors.push("manifest_approval_in_future");
  }
  if (typeof manifest.approvedBy !== "string" || manifest.approvedBy.trim().length < 3) {
    errors.push("manifest_approved_by");
  }
  const references = Array.isArray(manifest.evidenceReferences)
    ? manifest.evidenceReferences
    : [];
  if (
    references.length === 0 ||
    references.length > 10 ||
    references.some(
      (reference) =>
        typeof reference !== "string" ||
        reference.trim().length < 3 ||
        reference.length > 256 ||
        /[\r\n]/.test(reference),
    )
  ) {
    errors.push("manifest_evidence_references");
  }
  const requiredAttestations = [
    "realUserPilot",
    "productionEnvironment",
    "tenantConsentConfirmed",
    "testAndSeedDataExcluded",
    "piiExcludedFromManifest",
  ];
  for (const field of requiredAttestations) {
    if (manifest[field] !== true) errors.push(`manifest_${field}`);
  }
  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    manifest,
    evidenceReferenceCount: references.length,
    evidenceReferenceDigest: references.length
      ? sha256(references.map((reference) => reference.trim()).sort().join("\n"))
      : null,
    scopeDigest:
      safeIdFields.every((field) => SAFE_ID_PATTERN.test(String(manifest[field] || "")))
        ? sha256(
            [
              manifest.pilotId,
              manifest.sourceOrganizationId,
              manifest.statementSnapshotId,
              manifest.targetOrganizationId,
              manifest.pilotStartedAt,
              manifest.pilotCompletedAt,
              manifest.releaseRevision,
            ].join("|"),
          )
        : null,
  };
}

function asCount(row, key) {
  const value = Number(row?.[key] || 0);
  return Number.isFinite(value) ? value : 0;
}

function buildReport({ mode = "report", manifestResult, database, query }) {
  const row = query.row || {};
  const attestationReady =
    manifestResult.valid &&
    manifestResult.manifest.realUserPilot === true &&
    manifestResult.manifest.productionEnvironment === true &&
    manifestResult.manifest.tenantConsentConfirmed === true &&
    manifestResult.manifest.testAndSeedDataExcluded === true;
  const checks = [
    { id: "pilot_manifest_valid", ready: manifestResult.valid },
    {
      id: "exact_release_revision_attested",
      ready: GIT_REVISION_PATTERN.test(
        String(manifestResult.manifest.releaseRevision || ""),
      ),
    },
    { id: "real_user_production_pilot_attested", ready: attestationReady },
    { id: "pilot_database_is_postgresql", ready: database.supported },
    { id: "read_only_evidence_query_succeeded", ready: query.succeeded === true },
    { id: "immutable_statement_snapshot_exists", ready: row.statement_exists === true },
    { id: "statement_hash_and_source_evidence_valid", ready: row.statement_integrity === true },
    {
      id: "statement_specific_referral_token_valid",
      ready: asCount(row, "token_count") > 0 && row.token_integrity === true,
    },
    {
      id: "consented_statement_delivery_sent",
      ready:
        asCount(row, "sent_delivery_count") > 0 && row.delivery_integrity === true,
    },
    {
      id: "redacted_external_view_logged",
      ready:
        asCount(row, "granted_view_count") > 0 &&
        row.redacted_view_evidence === true,
    },
    {
      id: "recipient_response_captured_and_logged",
      ready:
        asCount(row, "recipient_action_count") > 0 &&
        asCount(row, "response_log_count") > 0 &&
        row.recipient_action_integrity === true,
    },
    {
      id: "referral_impression_logged",
      ready: asCount(row, "impression_count") > 0,
    },
    { id: "referral_click_logged", ready: asCount(row, "click_count") > 0 },
    {
      id: "referral_conversion_attributed",
      ready:
        asCount(row, "conversion_count") > 0 && row.conversion_integrity === true,
    },
    {
      id: "referred_organization_activated",
      ready:
        row.target_organization_ready === true && row.target_user_ready === true,
    },
    { id: "end_to_end_event_sequence_complete", ready: row.sequence_complete === true },
  ];
  const blockers = checks.filter((check) => !check.ready).map((check) => check.id);
  return {
    summary: {
      generatedAt: new Date().toISOString(),
      mode,
      status: blockers.length ? "blocked" : "ready",
      checkCount: checks.length,
      readyCount: checks.filter((check) => check.ready).length,
      blockerCount: blockers.length,
    },
    pilot: {
      pilotId: SAFE_ID_PATTERN.test(String(manifestResult.manifest.pilotId || ""))
        ? manifestResult.manifest.pilotId
        : null,
      releaseRevision: GIT_REVISION_PATTERN.test(
        String(manifestResult.manifest.releaseRevision || ""),
      )
        ? manifestResult.manifest.releaseRevision
        : null,
      pilotStartedAt: manifestResult.valid
        ? manifestResult.manifest.pilotStartedAt
        : null,
      pilotCompletedAt: manifestResult.valid
        ? manifestResult.manifest.pilotCompletedAt
        : null,
      approvedAt: manifestResult.valid ? manifestResult.manifest.approvedAt : null,
      approvedByRecorded: Boolean(
        manifestResult.manifest.approvedBy?.trim?.(),
      ),
      evidenceReferenceCount: manifestResult.evidenceReferenceCount,
      evidenceReferenceDigest: manifestResult.evidenceReferenceDigest,
      scopeDigest: manifestResult.scopeDigest,
      manifestErrors: manifestResult.errors,
    },
    database: {
      configured: database.configured,
      targetClass: database.targetClass,
      querySucceeded: query.succeeded === true,
      queryErrorCode: query.succeeded
        ? null
        : query.errorCode || "not_attempted",
    },
    counts: {
      tokenCount: asCount(row, "token_count"),
      sentDeliveryCount: asCount(row, "sent_delivery_count"),
      grantedViewCount: asCount(row, "granted_view_count"),
      recipientActionCount: asCount(row, "recipient_action_count"),
      responseLogCount: asCount(row, "response_log_count"),
      impressionCount: asCount(row, "impression_count"),
      clickCount: asCount(row, "click_count"),
      conversionCount: asCount(row, "conversion_count"),
    },
    checks,
    blockers,
    safety: {
      databaseReadOnlyTransaction: true,
      databaseUrlRetained: false,
      personalDataPrinted: false,
      rawEvidenceReferencesPrinted: false,
      seedAndTestDataForbidden: true,
      exactReleaseRevisionRequired: true,
    },
  };
}

function renderMarkdown(report) {
  return [
    "# Customer Referral Pilot Evidence Readiness",
    "",
    `Generated: ${report.summary.generatedAt}`,
    `Status: \`${report.summary.status}\``,
    `Checks ready: ${report.summary.readyCount}/${report.summary.checkCount}`,
    "",
    "## Pilot binding",
    "",
    `- Pilot ID: ${report.pilot.pilotId || "not supplied"}`,
    `- Exact release revision: ${report.pilot.releaseRevision || "not supplied"}`,
    `- Scope digest: ${report.pilot.scopeDigest || "not available"}`,
    `- Evidence references recorded: ${report.pilot.evidenceReferenceCount}`,
    `- Evidence reference digest: ${report.pilot.evidenceReferenceDigest || "not available"}`,
    "- Raw evidence references printed: no",
    "- Personal data printed: no",
    "",
    "## Database evidence",
    "",
    `- PostgreSQL target configured: ${report.database.configured ? "yes" : "no"}`,
    `- Read-only query succeeded: ${report.database.querySucceeded ? "yes" : "no"}`,
    `- Statement tokens: ${report.counts.tokenCount}`,
    `- Sent deliveries: ${report.counts.sentDeliveryCount}`,
    `- Granted external views: ${report.counts.grantedViewCount}`,
    `- Recipient actions: ${report.counts.recipientActionCount}`,
    `- Response access logs: ${report.counts.responseLogCount}`,
    `- Referral impressions: ${report.counts.impressionCount}`,
    `- Referral clicks: ${report.counts.clickCount}`,
    `- Referral conversions: ${report.counts.conversionCount}`,
    "",
    "## Checks",
    "",
    ...report.checks.map(
      (check) => `- ${check.ready ? "ready" : "blocked"}: ${check.id}`,
    ),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length
      ? report.blockers.map((blocker) => `- ${blocker}`)
      : ["- None"]),
    "",
    "## Safety",
    "",
    "- The database query runs in a repeatable-read, read-only transaction.",
    "- The scoped database URL is never written to evidence.",
    "- The manifest must attest a real production cohort, tenant consent, and exclusion of seed/test data.",
    "- The report binds the pilot IDs and evidence references through SHA-256 digests without retaining PII.",
    "- Readiness requires the exact deployed Git revision and the full statement-to-activation event sequence.",
    "",
  ].join("\n");
}

function writeReport(root, options, report) {
  const markdownTarget = path.resolve(root, options.out);
  const jsonTarget = path.resolve(root, options.jsonOut);
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true });
  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true });
  fs.writeFileSync(markdownTarget, renderMarkdown(report), "utf8");
  fs.writeFileSync(jsonTarget, JSON.stringify(report, null, 2) + "\n", "utf8");
}

async function queryPilotEvidence(
  databaseUrl,
  manifest,
  clientFactory = (connectionString) => new Client({ connectionString }),
) {
  if (!databaseUrl) {
    return { succeeded: false, errorCode: "pilot_database_url_missing", row: null };
  }
  const client = clientFactory(databaseUrl);
  let transactionStarted = false;
  try {
    await client.connect();
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    transactionStarted = true;
    await client.query("SET LOCAL statement_timeout = '30s'");
    const result = await client.query(PILOT_EVIDENCE_SQL, [
      manifest.statementSnapshotId,
      manifest.sourceOrganizationId,
      manifest.targetOrganizationId,
      manifest.pilotStartedAt,
      manifest.pilotCompletedAt,
      manifest.requiredRecipientAction,
      manifest.requiredDeliveryChannel,
    ]);
    await client.query("ROLLBACK");
    transactionStarted = false;
    return { succeeded: true, errorCode: null, row: result.rows[0] || {} };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original safe error code.
      }
    }
    return {
      succeeded: false,
      errorCode:
        typeof error?.code === "string"
          ? `pilot_evidence_query_failed_${error.code}`
          : "pilot_evidence_query_failed",
      row: null,
    };
  } finally {
    await client.end();
  }
}

function gateResult(report, mode = "report") {
  return {
    status: report.summary.status,
    exitCode: mode === "fail" && report.blockers.length ? 1 : 0,
  };
}

async function main() {
  const options = parseArgs();
  const root = path.resolve(options.root);
  const manifestFile = readManifest(root, options.manifest);
  const validation = validateManifest(manifestFile.parsed);
  validation.errors = [...new Set([...manifestFile.errors, ...validation.errors])];
  validation.valid = validation.errors.length === 0;
  const databaseUrl =
    process.env.AQSTOQFLOW_REFERRAL_PILOT_DATABASE_URL?.trim() || "";
  const database = classifyDatabaseUrl(databaseUrl);
  const query =
    validation.valid && database.supported
      ? await queryPilotEvidence(databaseUrl, validation.manifest)
      : { succeeded: false, errorCode: "preflight_blocked", row: null };
  const report = buildReport({
    mode: options.mode,
    manifestResult: validation,
    database,
    query,
  });
  writeReport(root, options, report);
  console.log(renderMarkdown(report));
  process.exitCode = gateResult(report, options.mode).exitCode;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  PILOT_EVIDENCE_SQL,
  buildReport,
  classifyDatabaseUrl,
  gateResult,
  parseArgs,
  queryPilotEvidence,
  readManifest,
  renderMarkdown,
  validateManifest,
};
