const fs = require("fs")
const path = require("path")
const { writeGeneratedReportFile } = require("./generated-report-writer")

const DEFAULT_JSON_OUT = "what-next/offline-pos-fiscal-replay-readiness.json"
const DEFAULT_MARKDOWN_OUT = "what-next/offline-pos-fiscal-replay-readiness.md"

function parseArgs(argv = process.argv.slice(2)) {
  const options = { mode: "report", root: process.cwd(), out: DEFAULT_MARKDOWN_OUT, jsonOut: DEFAULT_JSON_OUT }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--mode") options.mode = argv[++index]
    else if (value === "--root") options.root = argv[++index]
    else if (value === "--out") options.out = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else throw new Error("Unknown argument: " + value)
  }

  if (!["report", "fail"].includes(options.mode)) throw new Error("Unsupported mode: " + options.mode)
  return options
}

function read(root, relativePath) {
  const target = path.join(root, relativePath)
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : ""
}

function markersInOrder(source, markers) {
  let cursor = -1
  for (const marker of markers) {
    cursor = source.indexOf(marker, cursor + 1)
    if (cursor < 0) return false
  }
  return true
}

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  if (start < 0) return ""
  const end = source.indexOf(endMarker, start + startMarker.length)
  return end < 0 ? source.slice(start) : source.slice(start, end)
}

function buildOfflinePOSReplayReadiness(root = process.cwd(), options = {}) {
  const localQueue = read(root, "lib/pos/offline-local-queue.ts")
  const syncService = read(root, "services/pos/offline-sync.service.ts")
  const syncSchemas = read(root, "services/pos/offline-sync.schemas.ts")
  const receiptService = read(root, "services/pos/receipt.service.ts")
  const assurance = read(root, "services/assurance/assurance-registry.service.ts")
  const packageJson = read(root, "package.json")
  const syncActions = read(root, "actions/pos/sync.actions.ts")
  const prismaSchema = read(root, "prisma/schema.prisma")
  const migration = read(root, "prisma/migrations/20260727110000_offline_pos_sync_foundation/migration.sql")
  const statusStrip = read(root, "components/pos/offline/OfflineSyncStatusStrip.tsx")
  const ingestSection = section(syncService, "async function ingestBatchInTx", "async function refreshCertificate")
  const replaySection = section(syncService, "export async function replayPendingOfflineSaleEnvelope", "async function ingestBatchInTx")
  const markReplaySection = section(syncService, "async function markOfflineSaleReplayed", "async function blockOfflineSaleReplay")

  const checks = [
    {
      id: "provisional_receipt_only_client_policy",
      ready: localQueue.includes("FINAL_FISCAL_KEYS") && localQueue.includes("assertProvisionalOnly(input)") &&
        localQueue.includes("PROVISIONAL_ONLY") && localQueue.includes("finalFiscalNumber") &&
        localQueue.includes("finalFiscalNumberingPermitted: false") &&
        !localQueue.includes("allowFinalFiscalNumbering"),
    },
    {
      id: "deterministic_device_hash_chain",
      ready: localQueue.includes("buildOfflineLocalEventEntryHash") && localQueue.includes("payloadHash") &&
        localQueue.includes("prevHash: state.highWaterHash") && localQueue.includes("highWaterHash: entryHash"),
    },
    {
      id: "tenant_terminal_device_scope",
      ready: ingestSection.includes("assertTerminalScope(tx,") && ingestSection.includes("organizationId: context.organizationId") &&
        ingestSection.includes("terminalId: parsed.terminalId") && ingestSection.includes("locationId: parsed.locationId"),
    },
    {
      id: "inactive_device_ingestion_quarantine",
      ready: ingestSection.includes('device.status !== "ACTIVE"') && ingestSection.includes('conflictType: "DEVICE_REVOKED"') &&
        ingestSection.includes('status: "REJECTED"'),
    },
    {
      id: "inactive_device_replay_revalidation",
      ready: replaySection.includes('event.device.status !== "ACTIVE"') &&
        replaySection.includes('blockerCode: "OFFLINE_REPLAY_DEVICE_INACTIVE"') &&
        replaySection.includes('conflictType: "DEVICE_REVOKED"') && markersInOrder(replaySection, [
          'event.status !== "PENDING_REPLAY"',
          'event.device.status !== "ACTIVE"',
          "commitPOSSale({",
        ]),
    },
    {
      id: "sequence_hash_idempotency_quarantine",
      ready: ingestSection.includes("IDEMPOTENCY_PAYLOAD_MISMATCH") && ingestSection.includes("SEQUENCE_DUPLICATE_MISMATCH") &&
        ingestSection.includes("SEQUENCE_GAP") && ingestSection.includes("HASH_CHAIN_FORK") &&
        ingestSection.includes('status: conflictType ? "QUARANTINED" : "PENDING_REPLAY"'),
    },
    {
      id: "accepted_event_pending_replay_proof",
      ready: syncService.includes('eventType: "pos.offline.event.captured"') &&
        syncService.includes('blockerCode: "UNPOSTED_ACCEPTED_EVENT"') &&
        syncService.includes('eventName: "pos.offline.receipt.provisional"'),
    },
    {
      id: "exact_once_pos_finalization_and_recovery",
      ready: replaySection.includes("findCompletedReplayOutcome({") && replaySection.includes("commitPOSSale({") &&
        replaySection.includes("completedAfterRetry") &&
        syncService.includes('idempotencyKey: `offline-event:${input.event.id}:replayed`'),
    },
    {
      id: "receipt_fiscal_and_replay_evidence",
      ready: markReplaySection.includes("receiptDocumentHash(input.receipt)") && markReplaySection.includes("postingBatchId") &&
        markReplaySection.includes("fiscalDocumentId") && markReplaySection.includes("legalDeliveryBlocked") &&
        receiptService.includes("BLOCKED_UNTIL_CERTIFIED"),
    },
    {
      id: "assurance_and_policy_wiring",
      ready: assurance.includes('"offline_pos.replay_sla.visible"') &&
        assurance.includes('"offline_pos.accepted_event_business_event.required"') &&
        assurance.includes('"offline_pos.sequence_hash_conflict.visible"') &&
        assurance.includes('"offline_pos.quarantined_event_conflict.required"') &&
        assurance.includes('"offline_pos.replayed_event_proof.required"') &&
        packageJson.includes('"offline:pos:replay:gate"') && packageJson.includes("npm run offline:pos:replay:gate"),
    },    {
      id: "durable_offline_schema_migration",
      ready: prismaSchema.includes("model POSOfflineDevice") && prismaSchema.includes("model POSOfflineSyncBatch") &&
        prismaSchema.includes("model POSOfflineEvent") && prismaSchema.includes("model POSOfflineSyncConflict") &&
        prismaSchema.includes("model POSOfflineSyncCertificate") &&
        migration.includes('CREATE TABLE "pos_offline_devices"') && migration.includes('CREATE TABLE "pos_offline_events"') &&
        migration.includes('CREATE TABLE "pos_offline_sync_conflicts"') && migration.includes("organizationId_deviceId_deviceSeq_key") &&
        migration.includes("organizationId_idempotencyKey_key"),
    },
    {
      id: "active_cashier_session_scope",
      ready: syncService.includes("assertActiveCashierSession") &&
        ingestSection.includes("requiresActiveCashierSession(parsed.events)") &&
        ingestSection.includes("sessionId: parsed.sessionId") &&
        syncService.includes('status: "ACTIVE"') && syncService.includes("userId: input.userId"),
    },
    {
      id: "cryptographic_device_signature_verification",
      ready: syncService.includes("createPublicKey") && syncService.includes("verifySignature(") &&
        syncService.includes("offlineEventSignatureIsValid") && ingestSection.includes('conflictType = "SIGNATURE_INVALID"') &&
        prismaSchema.includes("signingPublicKeyPem"),
    },
    {
      id: "policy_expiry_and_reference_snapshot_quarantine",
      ready: prismaSchema.includes("policyExpiresAt") && prismaSchema.includes("policySnapshotHash") &&
        prismaSchema.includes("sourceSnapshotHash") && ingestSection.includes('conflictType = "OFFLINE_POLICY_EXPIRED"') &&
        ingestSection.includes('conflictType = "STALE_REFERENCE_SNAPSHOT"') &&
        syncSchemas.includes('"OFFLINE_POLICY_EXPIRED"'),
    },
    {
      id: "stable_offline_action_discriminant",
      ready: syncActions.includes("withOfflineActionContract") && syncActions.includes("ok: true as const") &&
        syncActions.includes("ok: false as const") && syncActions.includes("ProtectedActionResponse") &&
        syncActions.includes("errorCode: offlineActionErrorCode(result)") && syncService.includes("OfflineSyncErrorCode"),
    },
    {
      id: "expired_policy_operator_visibility",
      ready: syncService.includes("stalePolicyDeviceCount") && syncService.includes('code: "OFFLINE_POLICY_EXPIRED"') &&
        statusStrip.includes("stalePolicyCount") && statusStrip.includes("t.stalePolicy"),
    },
  ]

  const blockers = checks.filter((check) => !check.ready).map((check) => check.id)
  return {
    summary: {
      generatedAt: new Date().toISOString(), mode: options.mode || "report", status: blockers.length ? "blocked" : "ready",
      checkCount: checks.length, readyCount: checks.filter((check) => check.ready).length, blockerCount: blockers.length,
    },
    checks,
    blockers,
  }
}

function gateResultForReport(report, mode = "report") {
  return { status: report.summary.status, exitCode: mode === "fail" && report.blockers.length ? 1 : 0 }
}

function renderMarkdown(report) {
  const lines = [
    "# Offline POS Fiscal Replay Readiness Gate", "", "Generated: " + report.summary.generatedAt,
    "Mode: " + report.summary.mode, "Status: " + report.summary.status, "", "## Summary", "",
    "- Checks ready: " + report.summary.readyCount + "/" + report.summary.checkCount,
    "- Blockers: " + report.summary.blockerCount, "", "## Checks", "",
    ...report.checks.map((check) => "- " + (check.ready ? "ready" : "blocked") + ": " + check.id),
    "", "## Blockers", "", ...(report.blockers.length ? report.blockers.map((blocker) => "- " + blocker) : ["- None"]),
    "", "## Safety", "", "- This gate is static and read-only.",
    "- It does not replay sales or mutate stock, cash, ledger, receipts, or fiscal documents.",
    "- It verifies internal replay controls, not hardware, connectivity, authority, or statutory certification.",
  ]
  return lines.join(String.fromCharCode(10)) + String.fromCharCode(10)
}

function writeReport(root, options, report) {
  const jsonTarget = path.resolve(root, options.jsonOut)
  const markdownTarget = path.resolve(root, options.out)
  writeGeneratedReportFile(jsonTarget, JSON.stringify(report, null, 2) + String.fromCharCode(10), "utf8")
  writeGeneratedReportFile(markdownTarget, renderMarkdown(report), "utf8")
}

if (require.main === module) {
  try {
    const options = parseArgs()
    const root = path.resolve(options.root)
    const report = buildOfflinePOSReplayReadiness(root, options)
    writeReport(root, options, report)
    console.log(renderMarkdown(report))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = { buildOfflinePOSReplayReadiness, gateResultForReport, markersInOrder, parseArgs, renderMarkdown, section }
