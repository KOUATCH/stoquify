const fs = require("fs")
const path = require("path")

const DEFAULT_JSON_OUT = "what-next/ap-fraud-control-readiness.json"
const DEFAULT_MARKDOWN_OUT = "what-next/ap-fraud-control-readiness.md"
const VALID_MODES = new Set(["report", "warn", "fail"])

function parseArgs(argv = process.argv) {
  const args = { mode: "report", out: DEFAULT_MARKDOWN_OUT, jsonOut: DEFAULT_JSON_OUT }
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--mode") args.mode = argv[++index] || "report"
    else if (arg === "--out") args.out = argv[++index] || DEFAULT_MARKDOWN_OUT
    else if (arg === "--json-out") args.jsonOut = argv[++index] || DEFAULT_JSON_OUT
    else if (arg === "--root") args.root = argv[++index]
    else throw new Error(`Unknown argument: ${arg}`)
  }
  if (!VALID_MODES.has(args.mode)) throw new Error(`Unsupported mode: ${args.mode}`)
  return args
}

function readFile(root, relativePath) {
  try {
    return fs.readFileSync(path.join(root, relativePath), "utf8")
  } catch {
    return ""
  }
}

function includesAll(source, needles) {
  return needles.every((needle) => source.includes(needle))
}

function makeCheck({ id, title, risk, files, ready, evidence, missing, recommendation }) {
  const status = ready ? "ready" : "gap"
  return {
    id,
    title,
    risk,
    status,
    files,
    evidence,
    missing: ready ? [] : missing,
    recommendation: ready ? null : recommendation,
  }
}

function buildAPFraudControlReadiness(root = process.cwd(), options = {}) {
  const mode = options.mode || "report"
  const actions = readFile(root, "actions/purchasing/ap-control.actions.ts")
  const service = readFile(root, "services/purchasing/ap-control.service.ts")
  const schemas = readFile(root, "services/purchasing/ap-control.schemas.ts")
  const sensitiveActions = readFile(root, "services/controls/sensitive-action.service.ts")
  const permissions = readFile(root, "config/permissions.ts")
  const rbac = readFile(root, "lib/security/rbac-permissions.ts")
  const actionTests = readFile(root, "actions/purchasing/__tests__/ap-control.actions.test.ts")
  const serviceTests = readFile(root, "services/purchasing/__tests__/ap-control.service.test.ts")
  const sensitiveActionTests = readFile(root, "services/controls/__tests__/sensitive-action.service.test.ts")

  const checks = [
    makeCheck({
      id: "supplier-bank-request.action-boundary",
      title: "Supplier bank change request uses tenant and actor from protected action context",
      risk: "high",
      files: ["actions/purchasing/ap-control.actions.ts", "services/purchasing/ap-control.schemas.ts"],
      ready: includesAll(actions, [
        'permission: "purchasing.supplier.bank.request"',
        'tenantGuard: "handler-derived"',
        "requestedById: ctx.userId",
        "requestSupplierBankChange(parsed)",
      ]) && includesAll(schemas, ["requestSupplierBankChangeInputSchema", "requestedById: idSchema"]),
      evidence: [
        "Action requires purchasing.supplier.bank.request.",
        "Action derives organizationId and requestedById from the RBAC context.",
        "Schema keeps request payload explicit before service handling.",
      ],
      missing: ["Protected supplier bank request action or context-derived requester evidence is missing."],
      recommendation: "Keep supplier bank request as maker-side pending workflow; do not apply bank destination changes without approval.",
    }),
    makeCheck({
      id: "supplier-bank-approval.action-boundary",
      title: "Supplier bank approval requires fresh auth and trusted actor controls",
      risk: "critical",
      files: ["actions/purchasing/ap-control.actions.ts", "actions/purchasing/__tests__/ap-control.actions.test.ts"],
      ready: includesAll(actions, [
        'permission: "purchasing.supplier.bank.approve"',
        "freshAuth: true",
        "approvedById: ctx.userId",
        "approveSupplierBankChangeWithControls(parsed",
        "actorPermissions: ctx.permissions",
      ]) && includesAll(actionTests, [
        "requires fresh auth before approving supplier bank changes",
        "delegates supplier bank approval to the AP service with trusted actor controls",
      ]),
      evidence: [
        "Action requires purchasing.supplier.bank.approve.",
        "Fresh authentication is configured before RBAC/service work.",
        "Client-supplied approvedById and organizationId are overwritten with RBAC context values.",
      ],
      missing: ["Fresh-auth action boundary or trusted actor forwarding for supplier bank approval is missing."],
      recommendation: "Route all supplier bank approvals through the protected action and AP control service.",
    }),
    makeCheck({
      id: "supplier-bank-approval.shared-control-policy",
      title: "Supplier bank approval has shared sensitive-action policy",
      risk: "critical",
      files: [
        "services/controls/sensitive-action.service.ts",
        "services/controls/__tests__/sensitive-action.service.test.ts",
        "lib/security/rbac-permissions.ts",
        "config/permissions.ts",
      ],
      ready: includesAll(sensitiveActions, [
        '"supplier.bank-change.approve"',
        'permission: "purchasing.supplier.bank.approve"',
        'riskTier: "critical"',
        "freshAuthMaxAgeSeconds: 300",
        "blockSelfApproval: true",
        "SUPPLIER_BANK_CHANGE_APPROVE_CONTROL",
      ]) && includesAll(sensitiveActionTests, ["blocks self-approval for supplier bank changes"]) &&
        includesAll(rbac, ['"purchasing.supplier.bank.approve": "crit"']) &&
        permissions.includes('"purchasing.supplier.bank.approve"'),
      evidence: [
        "Shared sensitive-action policy marks supplier bank approval critical.",
        "Policy requires fresh auth, self-approval blocking, audit action, and detector signals.",
        "RBAC risk catalog classifies purchasing.supplier.bank.approve as critical.",
      ],
      missing: ["Shared sensitive-action policy for supplier bank approval is incomplete."],
      recommendation: "Keep supplier bank approval in the shared control plane; do not implement local UI-only approval checks.",
    }),
    makeCheck({
      id: "supplier-bank-approval.service-control",
      title: "Supplier bank approval blocks self-approval and writes audit/business evidence",
      risk: "critical",
      files: ["services/purchasing/ap-control.service.ts", "services/purchasing/__tests__/ap-control.service.test.ts"],
      ready: includesAll(service, [
        "approveSupplierBankChangeWithControls",
        'action: "supplier.bank-change.approve"',
        "subjectActorId: change?.requestedById",
        "auditDeniedSensitiveAction",
        "auditAllowedSensitiveAction",
        "A separate approver is required for supplier bank changes.",
        'eventType: "supplier.bank_change.approved"',
        'action: "SUPPLIER_BANK_CHANGE_APPROVED"',
      ]) && includesAll(serviceTests, [
        "audits and blocks supplier bank self-approval in AP service controls",
      ]),
      evidence: [
        "Service loads the requested bank-change subject before sensitive-action evaluation.",
        "Service blocks requester self-approval before bank account mutation.",
        "Allowed approval writes business event and audit evidence inside the service transaction.",
      ],
      missing: ["Supplier bank approval service-level maker-checker or audit evidence is missing."],
      recommendation: "Keep bank destination mutation inside the AP service transaction with audit and business-event evidence.",
    }),
    makeCheck({
      id: "supplier-payment-release.action-boundary",
      title: "Supplier payment release requires fresh auth and trusted actor controls",
      risk: "critical",
      files: ["actions/purchasing/ap-control.actions.ts", "actions/purchasing/__tests__/ap-control.actions.test.ts"],
      ready: includesAll(actions, [
        'permission: "purchasing.ap.payment.release"',
        "freshAuth: true",
        "supplierPaymentId: raw.supplierPaymentId",
        "releasedById: ctx.userId",
        "releaseSupplierPaymentWithControls(parsed",
        "actorPermissions: ctx.permissions",
      ]) && includesAll(actionTests, ["injects only the releaser ID for supplier payment release"]),
      evidence: [
        "Action requires purchasing.ap.payment.release.",
        "Fresh authentication is configured before RBAC/service work.",
        "Client-supplied approval actors are not forwarded by the release action; the releaser is derived from RBAC context.",
      ],
      missing: ["Fresh-auth action boundary or trusted actor forwarding for supplier payment release is missing."],
      recommendation: "Keep supplier payment release behind protected action and AP control service.",
    }),    makeCheck({
      id: "supplier-payment-release.shared-control-policy",
      title: "Supplier payment release has shared sensitive-action policy",
      risk: "critical",
      files: [
        "services/controls/sensitive-action.service.ts",
        "services/controls/__tests__/sensitive-action.service.test.ts",
        "lib/security/rbac-permissions.ts",
        "config/permissions.ts",
      ],
      ready: includesAll(sensitiveActions, [
        '"supplier.payment.release"',
        'permission: "purchasing.ap.payment.release"',
        'riskTier: "critical"',
        "freshAuthMaxAgeSeconds: 300",
        "blockSelfApproval: true",
        "SUPPLIER_PAYMENT_RELEASE_CONTROL",
      ]) && includesAll(sensitiveActionTests, ["requires fresh release authority for supplier payments"]) &&
        includesAll(rbac, ['"purchasing.ap.payment.release": "crit"']) &&
        permissions.includes('"purchasing.ap.payment.release"'),
      evidence: [
        "Shared sensitive-action policy marks supplier payment release critical.",
        "Policy requires fresh auth, self-approval blocking, audit action, and detector signals.",
        "RBAC risk catalog classifies purchasing.ap.payment.release as critical.",
      ],
      missing: ["Shared sensitive-action policy for supplier payment release is incomplete."],
      recommendation: "Keep supplier payment release in the shared control plane; do not implement local release overrides.",
    }),
    makeCheck({
      id: "supplier-payment-release.service-control",
      title: "Supplier payment release blocks unsafe release and writes ledger/reconciliation evidence",
      risk: "critical",
      files: ["services/purchasing/ap-control.service.ts", "services/purchasing/__tests__/ap-control.service.test.ts"],
      ready: includesAll(service, [
        "releaseSupplierPaymentWithControls",
        'action: "supplier.payment.release"',
        "subjectActorId: subject?.requestedById",
        "auditDeniedSensitiveAction",
        "auditAllowedSensitiveAction",
        "A separate approver is required before releasing supplier payments.",
        "A separate releaser is required before releasing supplier payments.",
        "A separate releaser is required from the supplier payment approver before release.",
        "Supplier payment must be approved before release.",
        "Payment is blocked while a supplier bank change is pending approval.",
        "Payment is blocked until the supplier bank destination is approved.",
        'eventType: "supplier.payment.released"',
        "queueOutboundSupplierPaymentReconciliation",
        'action: "SUPPLIER_PAYMENT_RELEASED"',
      ]) && includesAll(serviceTests, [
        "audits and blocks supplier payment self-release in AP service controls",
        "blocks supplier payment release by the stored approver",
        "blocks supplier payment release when a bank change is pending",
        "creates approved supplier payment evidence without release side effects",
        "releases approved supplier payments with bank evidence, allocations, event evidence, and ledger blocker",
        "rejects mutated supplier payment idempotency replays before release side effects",
      ]),
      evidence: [
        "Service blocks requester/approver, requester/releaser, and approver/releaser conflicts.",
        "Service blocks release while supplier bank changes are pending or destination is unapproved.",
        "Release requires an approved supplier payment before writing supplier ledger, business event, audit, ledger posting status, and reconciliation queue evidence.",
      ],
      missing: ["Supplier payment release service controls or evidence tests are incomplete."],
      recommendation: "Keep supplier payment release inside AP service transaction with idempotency and reconciliation evidence.",
    }),    makeCheck({
      id: "supplier-payment-approval.action-boundary",
      title: "Supplier payment approval has a separate action boundary",
      risk: "critical",
      files: ["actions/purchasing/ap-control.actions.ts", "services/purchasing/ap-control.service.ts", "services/controls/sensitive-action.service.ts"],
      ready: actions.includes('permission: "purchasing.ap.payment.approve"') &&
        actions.includes("approveSupplierPaymentWithControls") &&
        service.includes('action: "supplier.payment.approve"'),
      evidence: [
        "Shared policy exists for supplier.payment.approve.",
        "Action scan expects a dedicated purchasing.ap.payment.approve boundary before release enforcement hardens.",
      ],
      missing: [
        "No dedicated supplier payment approval action boundary was found.",
        "Supplier payment approval must remain a dedicated fresh-auth boundary before release hardening can be trusted.",
      ],
      recommendation: "Add a separate supplier payment approval workflow before hard-enforcing full payment maker-approver-releaser separation.",
    }),  ]

  const summary = {
    generatedAt: new Date().toISOString(),
    mode,
    totalChecks: checks.length,
    ready: checks.filter((check) => check.status === "ready").length,
    gaps: checks.filter((check) => check.status === "gap").length,
    criticalGaps: checks.filter((check) => check.status === "gap" && check.risk === "critical").length,
  }

  return { summary, checks }
}

function renderMarkdown(report) {
  const lines = [
    "# AP Fraud Control Readiness Inventory",
    "",
    "Report mode: this inventory is read-only and does not enable hard enforcement.",
    "",
    "## Summary",
    "",
    `- Generated at: ${report.summary.generatedAt}`,
    `- Mode: ${report.summary.mode}`,
    `- Checks: ${report.summary.totalChecks}`,
    `- Ready: ${report.summary.ready}`,
    `- Gaps: ${report.summary.gaps}`,
    `- Critical gaps: ${report.summary.criticalGaps}`,
    "",
    "## Checks",
    "",
    "| ID | Risk | Status | Evidence | Missing | Recommendation |",
    "|---|---|---|---|---|---|",
  ]

  for (const check of report.checks) {
    lines.push([
      check.id,
      check.risk,
      check.status,
      check.evidence.join("<br>"),
      check.missing.join("<br>"),
      check.recommendation || "",
    ].map((value) => String(value).replace(/\|/g, "\\|")).join(" | ").replace(/^/, "| ").replace(/$/, " |"))
  }

  return `${lines.join("\n")}\n`
}

function writeReport(root, args, report) {
  const jsonTarget = path.join(root, args.jsonOut)
  const markdownTarget = path.join(root, args.out)
  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true })
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true })
  fs.writeFileSync(jsonTarget, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  fs.writeFileSync(markdownTarget, renderMarkdown(report), "utf8")
}

if (require.main === module) {
  const args = parseArgs(process.argv)
  const root = args.root ? path.resolve(args.root) : process.cwd()
  const report = buildAPFraudControlReadiness(root, { mode: args.mode })
  writeReport(root, args, report)
  console.log(`AP fraud control readiness wrote ${report.summary.totalChecks} checks to ${args.jsonOut}`)
  if (args.mode === "fail" && report.summary.criticalGaps > 0) process.exit(1)
}

module.exports = {
  buildAPFraudControlReadiness,
  parseArgs,
  renderMarkdown,
}
