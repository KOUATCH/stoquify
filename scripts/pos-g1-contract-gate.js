#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

const CONTRACT_PATH =
  "docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json"
const CONTRACT_MD_PATH =
  "docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.md"
const APPROVAL_REGISTER_PATH =
  "docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json"
const MASTER_ROADMAP_PATH =
  "docs/pos-enterprise-grade-audit/STOQUIFY_POS_AND_SALES_TO_CASH_MASTER_IMPLEMENTATION_ROADMAP_2026-08-17.md"
const LEGACY_ROADMAP_PATH =
  "docs/pos-enterprise-grade-audit/STOQUIFY_ENTERPRISE_SALES_TO_CASH_IMPLEMENTATION_ROADMAP_2026-08-17.md"
const DEFAULT_OUT =
  "docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_GATE_REASSESSMENT.md"
const DEFAULT_JSON_OUT =
  "docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_GATE_REASSESSMENT.json"

const EXPECTED_DECISION_IDS = Array.from({ length: 11 }, (_, index) =>
  `D-${String(index + 1).padStart(2, "0")}`,
)

const EXPECTED_STATE_MACHINE_IDS = [
  "POS_CART",
  "POS_SALE_COMMIT",
  "PAYMENT_ATTEMPT",
  "SETTLEMENT_ITEM",
  "RECEIPT_FISCAL_SOURCE",
  "RECEIPT_DELIVERY",
  "CASHIER_SESSION",
  "BUSINESS_DAY",
  "SALES_ORDER",
  "RESERVATION",
  "FULFILLMENT",
  "CUSTOMER_INVOICE",
  "RETURN",
  "RECONCILIATION_RUN",
]

const EXPECTED_EVENT_TYPES = [
  "pos.sale.finalized",
  "pos.sale.stock_issued",
  "pos.refund.issued",
  "pos.refund.stock_returned",
  "pos.void.stock_returned",
  "pos.sale.voided",
  "pos.shift.closed",
  "pos.sale.fiscalization.requested",
  "payment.provider.state_changed",
  "sales_order.confirmed",
  "inventory.reservation.changed",
  "fulfillment.goods_issued",
  "customer.invoice.issued",
  "customer.return.dispositioned",
  "business_day.closed",
]

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    mode: "report",
    out: DEFAULT_OUT,
    jsonOut: DEFAULT_JSON_OUT,
    write: true,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--root") options.root = path.resolve(argv[++index])
    else if (value === "--mode") options.mode = argv[++index]
    else if (value === "--out") options.out = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else if (value === "--no-write") options.write = false
    else throw new Error(`Unknown argument: ${value}`)
  }
  if (!new Set(["report", "fail"]).has(options.mode)) {
    throw new Error(`Unsupported mode: ${options.mode}`)
  }
  return options
}

function readText(root, relativePath) {
  return fs.readFileSync(path.resolve(root, relativePath), "utf8")
}

function readJson(root, relativePath) {
  return JSON.parse(readText(root, relativePath))
}

function exactIds(values) {
  return JSON.stringify([...new Set(values)].sort())
}

function hasApprovalEvidence(decision) {
  if (decision.approvalStatus !== "APPROVED") return false
  if (!Array.isArray(decision.approvals) || decision.approvals.length === 0) return false
  if (!Array.isArray(decision.requiredApproverRoles) || decision.requiredApproverRoles.length === 0) {
    return false
  }
  const approvalsAreValid = decision.approvals.every(
    (approval) =>
      approval &&
      approval.accountableApprover &&
      approval.approverRole &&
      approval.authorityReference &&
      approval.freshAuthenticatedAt &&
      approval.approvedAt &&
      approval.signatureReference &&
      /^[a-f0-9]{64}$/.test(approval.signatureEvidenceSha256 || "") &&
      Number.isFinite(Date.parse(approval.freshAuthenticatedAt)) &&
      Number.isFinite(Date.parse(approval.approvedAt)) &&
      Date.parse(approval.approvedAt) >= Date.parse(approval.freshAuthenticatedAt) &&
      Date.parse(approval.approvedAt) - Date.parse(approval.freshAuthenticatedAt) <= 10 * 60 * 1000,
  )
  if (!approvalsAreValid) return false
  const approvedRoles = new Set(
    decision.approvals.map((approval) => approval.approverRole.trim().toLowerCase()),
  )
  return decision.requiredApproverRoles.every((role) =>
    approvedRoles.has(role.trim().toLowerCase()),
  )
}

function hasDecisionApprovalEvidence(decision, approvalRecord) {
  if (!approvalRecord || approvalRecord.decisionId !== decision.id) return false
  if (approvalRecord.selectedOption !== decision.selectedOption) return false
  if (typeof approvalRecord.rationale !== "string" || approvalRecord.rationale.trim() === "") {
    return false
  }
  if (typeof approvalRecord.effectiveVersion !== "string" || approvalRecord.effectiveVersion.trim() === "") {
    return false
  }
  if (!Number.isFinite(Date.parse(approvalRecord.reviewOrExpiryAt))) return false
  if (!Array.isArray(approvalRecord.evidenceLinks) || approvalRecord.evidenceLinks.length === 0) {
    return false
  }
  if (
    !Array.isArray(approvalRecord.affectedCapabilities) ||
    approvalRecord.affectedCapabilities.length === 0
  ) {
    return false
  }
  if (
    typeof approvalRecord.rollbackOrDisablePolicy !== "string" ||
    approvalRecord.rollbackOrDisablePolicy.trim() === ""
  ) {
    return false
  }
  return hasApprovalEvidence({
    ...approvalRecord,
    requiredApproverRoles: decision.requiredApproverRoles,
  })
}

function buildG1ContractGate(root = process.cwd()) {
  const contract = readJson(root, CONTRACT_PATH)
  const approvalRegister = readJson(root, APPROVAL_REGISTER_PATH)
  const contractMarkdown = readText(root, CONTRACT_MD_PATH)
  const masterRoadmap = readText(root, MASTER_ROADMAP_PATH)
  const legacyRoadmap = readText(root, LEGACY_ROADMAP_PATH)
  const posService = readText(root, "services/pos/pos.service.ts")
  const posComponent = readText(root, "components/pos/ProfessionalPOSSystem.tsx")
  const tenderActions = readText(root, "actions/pos/tender.actions.ts")
  const inventoryService = readText(root, "services/inventory/inventory-stock-event.service.ts")

  const decisionIds = contract.decisions.map((decision) => decision.id)
  const stateMachineIds = contract.stateMachines.map((machine) => machine.id)
  const eventTypes = contract.eventContracts.map((event) => event.eventType)
  const contractSha256 = crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.resolve(root, CONTRACT_PATH)))
    .digest("hex")
  const approvalRecords = Array.isArray(approvalRegister.decisionApprovals)
    ? approvalRegister.decisionApprovals
    : []
  const approvalRecordByDecisionId = new Map(
    approvalRecords.map((record) => [record.decisionId, record]),
  )
  const detachedApprovalRegisterReady =
    approvalRegister.contractArtifactId === contract.artifactId &&
    approvalRegister.contractVersion === contract.contractVersion &&
    approvalRegister.contractPath === CONTRACT_PATH &&
    approvalRegister.contractSha256 === contractSha256 &&
    new Set(approvalRecords.map((record) => record.decisionId)).size === approvalRecords.length &&
    approvalRecords.every((record) => EXPECTED_DECISION_IDS.includes(record.decisionId))
  const approvedDecisionIds = contract.decisions
    .filter((decision) =>
      detachedApprovalRegisterReady
        ? hasDecisionApprovalEvidence(decision, approvalRecordByDecisionId.get(decision.id))
        : false,
    )
    .map((decision) => decision.id)
  const explicitRuntimeGaps = contract.stateMachines.every(
    (machine) =>
      machine.implementationStatus === "IMPLEMENTED_SCHEMA_CONTRACT" ||
      typeof machine.gap === "string",
  )

  const technicalChecks = [
    {
      id: "canonical_g1_numbering",
      ready:
        masterRoadmap.includes("| G1 | Architecture/control freeze |") &&
        legacyRoadmap.includes("Gate-numbering notice") &&
        legacyRoadmap.includes("G0 → canonical G1"),
    },
    {
      id: "decision_set_d01_through_d11",
      ready: exactIds(decisionIds) === exactIds(EXPECTED_DECISION_IDS),
    },
    {
      id: "decisions_have_selected_fail_closed_options",
      ready: contract.decisions.every(
        (decision) =>
          typeof decision.selectedOption === "string" &&
          decision.selectedOption.length > 0 &&
          typeof decision.technicalValidity === "string" &&
          typeof decision.implementationStatus === "string",
      ),
    },
    {
      id: "limited_development_scope_is_fail_closed",
      ready:
        contract.currentAuthorizedScope.storeCredit === "DISABLED" &&
        contract.currentAuthorizedScope.electronicCapture === "DISABLED" &&
        contract.currentAuthorizedScope.offlineCapture === "DISABLED" &&
        contract.currentAuthorizedScope.receipt === "NON_STATUTORY_DEVELOPMENT_ONLY" &&
        contract.currentAuthorizedScope.tenders.length === 1 &&
        contract.currentAuthorizedScope.tenders[0] === "CASH",
    },
    {
      id: "state_machine_catalog_complete",
      ready: exactIds(stateMachineIds) === exactIds(EXPECTED_STATE_MACHINE_IDS),
    },
    {
      id: "runtime_mappings_and_gaps_are_explicit",
      ready: explicitRuntimeGaps,
    },
    {
      id: "accounting_inventory_event_catalog_complete",
      ready: EXPECTED_EVENT_TYPES.every((eventType) => eventTypes.includes(eventType)),
    },
    {
      id: "single_sale_finalizer_preserved",
      ready:
        posService.includes("export async function commitPOSSale") &&
        contract.eventContracts.some(
          (event) => event.eventType === "pos.sale.finalized" && event.owner === "commitPOSSale transaction",
        ),
    },
    {
      id: "cash_only_and_store_credit_runtime_control",
      ready:
        posService.includes("assertSupportedSaleTenders") &&
        posService.includes("STORE_CREDIT_TENDER_UNAVAILABLE_MESSAGE") &&
        posComponent.includes('const tenderMethods: TenderMethod[] = ["CASH"]'),
    },
    {
      id: "refund_void_fresh_auth_and_compensation_contract",
      ready:
        tenderActions.match(/refundPOSSaleAction[\s\S]*?freshAuth: \{ maxAgeSeconds: 300 \}/) !== null &&
        tenderActions.match(/voidPOSSaleAction[\s\S]*?freshAuth: \{ maxAgeSeconds: 300 \}/) !== null &&
        posService.includes('eventType: "pos.refund.issued"') &&
        posService.includes('eventType: "pos.sale.voided"'),
    },
    {
      id: "stock_and_cogs_event_ownership",
      ready:
        inventoryService.includes('eventType: "pos.sale.stock_issued"') &&
        inventoryService.includes('eventType: input.correctionType === "VOID" ? "pos.void.stock_returned" : "pos.refund.stock_returned"'),
    },
    {
      id: "contract_candidate_disclaims_approval",
      ready:
        contract.status === "READY_FOR_ACCOUNTABLE_REVIEW_NOT_APPROVED" &&
        contract.productionAuthorized === false &&
        contractMarkdown.includes("NOT APPROVED"),
    },
    {
      id: "detached_approval_register_binds_exact_contract_hash",
      ready: detachedApprovalRegisterReady,
    },
  ]

  const approvalChecks = contract.decisions.map((decision) => ({
    id: `${decision.id.toLowerCase()}_accountable_approval`,
    decisionId: decision.id,
    ready: detachedApprovalRegisterReady
      ? hasDecisionApprovalEvidence(decision, approvalRecordByDecisionId.get(decision.id))
      : false,
    requiredApproverRoles: decision.requiredApproverRoles,
    status:
      approvalRecordByDecisionId.get(decision.id)?.approvalStatus ||
      decision.approvalStatus,
  }))

  const technicalReady = technicalChecks.every((check) => check.ready)
  const approvalsReady = approvalChecks.every((check) => check.ready)
  const status = technicalReady && approvalsReady ? "PASSED" : "BLOCKED"

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    gateId: "G1",
    status,
    technicalStatus: technicalReady ? "READY_FOR_ACCOUNTABLE_REVIEW" : "TECHNICAL_CONTRACT_INVALID",
    runtimeConformance: "PARTIAL_WITH_EXPLICIT_GAPS",
    approvalStatus: approvalsReady
      ? "APPROVED_11_OF_11"
      : `BLOCKED_${approvedDecisionIds.length}_OF_${EXPECTED_DECISION_IDS.length}`,
    productionAuthorized: status === "PASSED" && contract.productionAuthorized === true,
    summary: {
      technicalChecks: technicalChecks.length,
      technicalReady: technicalChecks.filter((check) => check.ready).length,
      decisions: EXPECTED_DECISION_IDS.length,
      approvedDecisions: approvedDecisionIds.length,
      stateMachines: contract.stateMachines.length,
      eventContracts: contract.eventContracts.length,
    },
    technicalChecks,
    approvalChecks,
    blockers: [
      ...technicalChecks.filter((check) => !check.ready).map((check) => check.id),
      ...approvalChecks.filter((check) => !check.ready).map((check) => check.id),
    ],
    nonClaims: [
      "Technical validity does not approve a business, accounting, security or country-pack decision.",
      "Runtime mappings marked partial or missing are not frozen production behavior.",
      "Development authorization does not authorize production or statutory use.",
    ],
  }
}

function renderMarkdown(report) {
  const technicalRows = report.technicalChecks.map(
    (check) => `| ${check.id} | ${check.ready ? "PASS" : "BLOCKED"} |`,
  )
  const approvalRows = report.approvalChecks.map(
    (check) =>
      `| ${check.decisionId} | ${check.ready ? "APPROVED" : "PENDING"} | ${check.requiredApproverRoles.join(", ")} |`,
  )
  return [
    "# G1 contract gate reassessment",
    "",
    `Status: **${report.status}**`,
    `Technical contract: **${report.technicalStatus}**`,
    `Runtime conformance: **${report.runtimeConformance}**`,
    `Accountable approval: **${report.approvalStatus}**`,
    "",
    "## Technical checks",
    "",
    "| Check | Result |",
    "| --- | --- |",
    ...technicalRows,
    "",
    "## D-01 through D-11 approvals",
    "",
    "| Decision | Result | Required roles |",
    "| --- | --- | --- |",
    ...approvalRows,
    "",
    "## Blockers",
    "",
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ["- None"]),
    "",
    "Production remains unauthorized unless the gate is PASSED and a separate release gate authorizes activation.",
    "",
  ].join("\n")
}

function writeReport(root, options, report) {
  const markdownPath = path.resolve(root, options.out)
  const jsonPath = path.resolve(root, options.jsonOut)
  fs.mkdirSync(path.dirname(markdownPath), { recursive: true })
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true })
  fs.writeFileSync(markdownPath, renderMarkdown(report), "utf8")
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
}

if (require.main === module) {
  try {
    const options = parseArgs()
    const report = buildG1ContractGate(options.root)
    if (options.write) writeReport(options.root, options, report)
    process.stdout.write(renderMarkdown(report))
    if (options.mode === "fail" && report.status !== "PASSED") process.exitCode = 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  APPROVAL_REGISTER_PATH,
  CONTRACT_PATH,
  EXPECTED_DECISION_IDS,
  EXPECTED_EVENT_TYPES,
  EXPECTED_STATE_MACHINE_IDS,
  buildG1ContractGate,
  hasDecisionApprovalEvidence,
  hasApprovalEvidence,
  parseArgs,
  renderMarkdown,
}
