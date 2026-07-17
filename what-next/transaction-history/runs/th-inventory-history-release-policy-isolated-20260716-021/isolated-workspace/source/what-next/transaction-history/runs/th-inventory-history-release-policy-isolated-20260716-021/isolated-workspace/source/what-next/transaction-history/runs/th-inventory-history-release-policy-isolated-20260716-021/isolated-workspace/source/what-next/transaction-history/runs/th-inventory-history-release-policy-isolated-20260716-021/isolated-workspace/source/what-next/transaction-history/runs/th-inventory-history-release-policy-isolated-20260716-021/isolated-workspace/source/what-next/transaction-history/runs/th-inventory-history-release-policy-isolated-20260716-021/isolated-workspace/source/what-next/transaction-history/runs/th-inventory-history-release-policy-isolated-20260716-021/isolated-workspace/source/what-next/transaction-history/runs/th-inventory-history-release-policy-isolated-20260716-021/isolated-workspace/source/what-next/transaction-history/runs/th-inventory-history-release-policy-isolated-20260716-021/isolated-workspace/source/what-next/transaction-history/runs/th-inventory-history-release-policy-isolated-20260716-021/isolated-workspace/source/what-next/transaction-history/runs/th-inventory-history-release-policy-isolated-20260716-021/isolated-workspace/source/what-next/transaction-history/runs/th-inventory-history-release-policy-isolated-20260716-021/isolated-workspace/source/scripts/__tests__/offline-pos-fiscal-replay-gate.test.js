const fs = require("fs")
const os = require("os")
const path = require("path")

const { buildOfflinePOSReplayReadiness, gateResultForReport } = require("../offline-pos-fiscal-replay-gate")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "offline-pos-replay-gate-"))
}

function write(root, relativePath, source) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, source, "utf8")
}

function writeReadyFixture(root) {
  write(root, "lib/pos/offline-local-queue.ts", [
    "FINAL_FISCAL_KEYS finalFiscalNumber", "assertProvisionalOnly(input)", "PROVISIONAL_ONLY",
    "buildOfflineLocalEventEntryHash payloadHash", "prevHash: state.highWaterHash", "highWaterHash: entryHash",
  ].join("\n"))
  write(root, "services/pos/offline-sync.service.ts", [
    'eventType: "pos.offline.event.captured"', 'blockerCode: "UNPOSTED_ACCEPTED_EVENT"',
    'eventName: "pos.offline.receipt.provisional"', 'idempotencyKey: `offline-event:${input.event.id}:replayed`',
    "async function markOfflineSaleReplayed", "receiptDocumentHash(input.receipt)",
    "postingBatchId fiscalDocumentId legalDeliveryBlocked", "async function blockOfflineSaleReplay",
    "export async function replayPendingOfflineSaleEnvelope", 'event.status !== "PENDING_REPLAY"',
    'event.device.status !== "ACTIVE"', 'blockerCode: "OFFLINE_REPLAY_DEVICE_INACTIVE"',
    'conflictType: "DEVICE_REVOKED"', "findCompletedReplayOutcome({", "commitPOSSale({", "completedAfterRetry",
    "async function ingestBatchInTx", "assertTerminalScope(tx,", "organizationId: context.organizationId",
    "terminalId: parsed.terminalId", "locationId: parsed.locationId", 'device.status !== "ACTIVE"',
    'conflictType: "DEVICE_REVOKED"', 'status: "REJECTED"', "IDEMPOTENCY_PAYLOAD_MISMATCH",
    "SEQUENCE_DUPLICATE_MISMATCH", "SEQUENCE_GAP", "HASH_CHAIN_FORK",
    'status: conflictType ? "QUARANTINED" : "PENDING_REPLAY"', "async function refreshCertificate",
  ].join("\n"))
  write(root, "services/pos/receipt.service.ts", "BLOCKED_UNTIL_CERTIFIED")
  write(root, "services/assurance/assurance-registry.service.ts", [
    '"offline_pos.replay_sla.visible"', '"offline_pos.accepted_event_business_event.required"',
    '"offline_pos.sequence_hash_conflict.visible"', '"offline_pos.quarantined_event_conflict.required"',
    '"offline_pos.replayed_event_proof.required"',
  ].join("\n"))
  write(root, "package.json", '{"scripts":{"offline:pos:replay:gate":"node gate","policy:gates":"npm run offline:pos:replay:gate"}}')
}

describe("offline POS fiscal replay gate", () => {
  it("passes a complete offline replay evidence spine", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const report = buildOfflinePOSReplayReadiness(root, { mode: "fail" })
    expect(report.summary).toMatchObject({ status: "ready", readyCount: 10, blockerCount: 0 })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("blocks when replay-time inactive-device enforcement is removed", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const target = path.join(root, "services/pos/offline-sync.service.ts")
    const source = fs.readFileSync(target, "utf8")
    fs.writeFileSync(target, source.replace('blockerCode: "OFFLINE_REPLAY_DEVICE_INACTIVE"', 'blockerCode: "missing"'), "utf8")
    const report = buildOfflinePOSReplayReadiness(root, { mode: "fail" })
    expect(report.blockers).toContain("inactive_device_replay_revalidation")
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks when provisional receipt policy is removed", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(root, "lib/pos/offline-local-queue.ts", "buildOfflineLocalEventEntryHash payloadHash prevHash: state.highWaterHash highWaterHash: entryHash")
    const report = buildOfflinePOSReplayReadiness(root, { mode: "fail" })
    expect(report.blockers).toContain("provisional_receipt_only_client_policy")
  })
})
