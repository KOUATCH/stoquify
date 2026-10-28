#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const root = process.cwd()
const date = "2026-06-16"
const draftRoot = path.join(root, ".codex-skill-drafts", "exam-risk-remediation-suite")
const runRoot = path.join(root, "what-next", "exam-suite-runs")
const suiteReportPath = path.join(root, "what-next", `AQSTOQFLOW_EXAM_RISK_REMEDIATION_SKILL_SUITE_REPORT_${date}.md`)

const sourceReports = [
  "what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md",
  "what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md",
  "what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md",
  "what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md",
]

const commonReads = [
  "what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md",
  "what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md",
  "graphify-out/GRAPH_REPORT.md",
  "prisma/schema.prisma",
]

const suite = [
  {
    order: "001",
    slug: "risk-suite-orchestrator",
    display: "Exam 001 Risk Suite Orchestrator",
    short: "Order AqStoqFlow risk remediation",
    purpose: "orchestrate the ordered AqStoqFlow risk-remediation suite, preserve the current green baseline, select the next eligible skill, and prevent overlapping remediation work",
    risk: "Risk remediation can fragment into duplicate or out-of-order work, leaving high-risk service-boundary problems unresolved while later production features advance.",
    files: ["what-next/*.md", "graphify-out/GRAPH_REPORT.md", "package.json"],
    outputs: ["suite status report", "next-skill recommendation", "blocked-skill register"],
    gates: ["baseline reports exist", "no higher-priority open blocker is skipped", "verification command list is current"],
    tests: ["No app tests required unless orchestrator scripts are changed."],
    verification: ["npm run prisma:validate", "npm run typecheck", "npm run inventory:boundary:fail"],
  },
  {
    order: "002",
    slug: "service-boundary-ratchets",
    display: "Exam 002 Service Boundary Ratchets",
    short: "Enforce service boundary ratchets",
    purpose: "add and ratchet service-boundary gates that detect direct Prisma access outside services and action-owned economic mutations",
    risk: "Direct Prisma in App Router, components, hooks, or server actions can bypass tenant scope, RBAC, typed errors, audit evidence, and service-owned business rules.",
    files: ["app/**/*", "actions/**/*", "components/**/*", "hooks/**/*", "scripts/*gate*.js"],
    outputs: ["service-boundary gate", "allowlist or zero-finding report", "migrated route/action evidence"],
    gates: ["report-mode scan before fail-mode", "no new direct Prisma outside service boundary", "no new action-owned economic mutation"],
    tests: ["scanner fixture tests when a scanner is added", "focused action/service regression tests for migrated callers"],
    verification: ["node scripts/service-boundary-gate.js --mode report", "npm run typecheck", "npm test -- --runInBand"],
  },
  {
    order: "003",
    slug: "tenant-rbac-hardener",
    display: "Exam 003 Tenant RBAC Hardener",
    short: "Harden tenant and RBAC controls",
    purpose: "harden tenant isolation, trusted organization derivation, RBAC, module gates, fresh-auth, and same-actor controls across services/actions/routes",
    risk: "Some legacy actions and routes still accept or pass caller-supplied organization scope, and same-actor segregation is not proven across every sensitive workflow.",
    files: ["lib/security/**/*", "services/_shared/**/*", "actions/**/*", "app/api/**/*", "services/**/*"],
    outputs: ["tenant/RBAC audit fixes", "tests for wrong-tenant and unauthorized actors", "fresh-auth and SoD evidence"],
    gates: ["tenant context derived from trusted auth where possible", "RBAC enforced at service boundary", "same-actor approval blocked where required"],
    tests: ["wrong tenant rejection", "unauthorized actor rejection", "same-actor rejection", "fresh-auth required path"],
    verification: ["npm test -- services/_shared actions --runInBand", "npm run typecheck"],
  },
  {
    order: "004",
    slug: "inventory-item-finalizer",
    display: "Exam 004 Inventory Item Finalizer",
    short: "Finish inventory item migration",
    purpose: "migrate inventory and item legacy actions into service-owned inventory/item workflows, remove mock inventory paths, and preserve the inventory boundary gate",
    risk: "Old inventory and item actions still expose direct item mutation, stock update, transfer/reservation helpers, hard deletes, and mock inventory data adjacent to the modern inventory kernel.",
    files: ["actions/inventory/**/*", "actions/item/**/*", "actions/itemsShow/**/*", "services/inventory/**/*", "services/item/**/*"],
    outputs: ["thin service-backed actions", "removed or quarantined mocks", "inventory/item regression tests"],
    gates: ["no stock mutation outside services/inventory", "mock inventory exports removed or demo-quarantined", "item deletion classified"],
    tests: ["stock update happy path", "unauthorized actor", "wrong tenant", "closed period where applicable", "ledger posting or blocker path"],
    verification: ["npm run inventory:boundary:fail", "npm test -- services/inventory actions/itemsShow --runInBand", "npm run typecheck"],
  },
  {
    order: "005",
    slug: "purchasing-ap-consolidator",
    display: "Exam 005 Purchasing AP Consolidator",
    short: "Consolidate purchasing and AP",
    purpose: "resolve split ownership between legacy purchase-order workflows and newer purchasing/AP controls",
    risk: "AP controls can be bypassed through legacy purchase-order code with raw errors, direct Prisma orchestration, hard deletes, and old receiving workflows.",
    files: ["services/purchase-order/**/*", "services/purchasing/**/*", "actions/purchasing/**/*", "components/**/*purchase*"],
    outputs: ["canonical purchasing/AP service contract", "migrated callers", "AP ledger/reconciliation blocker tests"],
    gates: ["one service owner for PO receipt/invoice/payment", "goods receipt stock effects use inventory services", "no placeholder approval actor"],
    tests: ["PO submit/approve/receive", "AP invoice posting", "payment release", "ledger posting or blocker", "reconciliation exception path"],
    verification: ["npm test -- services/purchasing services/purchase-order actions/purchasing --runInBand", "npm run inventory:boundary:fail", "npm run typecheck"],
  },
  {
    order: "006",
    slug: "hard-delete-immutability-gate",
    display: "Exam 006 Hard Delete Immutability Gate",
    short: "Block unsafe economic deletes",
    purpose: "classify and eliminate unsafe hard deletes for evidence-bearing records while adding a reusable hard-delete policy gate",
    risk: "Hard deletes can remove economic or audit evidence and bypass cancellation, reversal, soft-delete, or corrective event discipline.",
    files: ["actions/**/*delete*", "services/**/*", "prisma/schema.prisma", "scripts/*gate*.js"],
    outputs: ["hard-delete scanner", "delete classification report", "converted deletion workflows"],
    gates: ["posted/final/certified/reconciled records cannot hard-delete", "draft-only deletes are tested", "soft delete or reversal used for evidence records"],
    tests: ["forbidden delete of final records", "draft cleanup allowed", "soft delete audit evidence", "reversal/cancellation evidence"],
    verification: ["node scripts/hard-delete-gate.js --mode report", "npm test -- --runInBand", "npm run typecheck"],
  },
  {
    order: "007",
    slug: "error-response-normalizer",
    display: "Exam 007 Error Response Normalizer",
    short: "Normalize safe error responses",
    purpose: "replace raw errors and unsafe route/action leakage with typed domain errors and safe client responses",
    risk: "Raw throw/rethrow/console error patterns can leak internals, create inconsistent UX, and bypass enterprise error classifications.",
    files: ["lib/error-handling/**/*", "services/**/*", "actions/**/*", "app/api/**/*"],
    outputs: ["typed errors", "safe action/route mappers", "raw-error scanner progress"],
    gates: ["no raw internal errors across client boundary", "domain errors have stable codes", "Prisma errors are classified safely"],
    tests: ["safe error envelope", "RBAC denial mapping", "validation error mapping", "Prisma conflict mapping"],
    verification: ["npm test -- lib/error-handling services/_shared actions --runInBand", "npm run typecheck"],
  },
  {
    order: "008",
    slug: "business-event-audit-standardizer",
    display: "Exam 008 Business Event Audit Standardizer",
    short: "Standardize business events and audit",
    purpose: "migrate older economic workflows to immutable BusinessEvent, AuditLog, idempotency, source-link, outbox, and ledger evidence patterns",
    risk: "Older mutations and deletes may not consistently emit business events, audit logs, outbox evidence, idempotency keys, or ledger source links.",
    files: ["services/events/**/*", "services/accounting/**/*", "services/inventory/**/*", "services/pos/**/*", "services/purchasing/**/*", "actions/**/*"],
    outputs: ["event adoption report", "business event tests", "audit/source-link evidence"],
    gates: ["economic event has source event id", "audit includes actor and org", "outbox and idempotency are present where required"],
    tests: ["event happy path", "idempotent replay", "payload mismatch rejection", "audit written in transaction"],
    verification: ["npm test -- services/events services/accounting services/inventory --runInBand", "npm run typecheck"],
  },
  {
    order: "009",
    slug: "demo-mock-report-trust-cleaner",
    display: "Exam 009 Demo Mock Report Trust Cleaner",
    short: "Remove mock data from reports",
    purpose: "remove or quarantine production-visible mock/demo data and make reports show provenance, freshness, certification, and source status",
    risk: "Mock inventory/report/monitoring paths and report TODOs can make dashboards appear more trustworthy than the backing evidence allows.",
    files: ["actions/inventory/inventoryActions.ts", "components/reports/**/*", "lib/error-handling/monitoring.ts", "app/**/*reports*", "services/**/*report*"],
    outputs: ["mock cleanup diff", "report provenance metadata", "report trust tests"],
    gates: ["no production route/action returns mock business data", "reports expose period/source/freshness/evidence status", "demo-only paths are visibly quarantined"],
    tests: ["report provenance rendering", "no mock data path", "not configured monitoring status"],
    verification: ["rg -n \"Mock implementation|mockItems|mockTransactions|mockAdjustments|mockTransfers|demo route\" actions app components lib services", "npm run typecheck"],
  },
  {
    order: "010",
    slug: "close-certification-hardener",
    display: "Exam 010 Close Certification Hardener",
    short: "Harden close certification evidence",
    purpose: "harden close-pack certification readiness, automatic stale invalidation, inventory valuation annexes, and explicit statutory blockers",
    risk: "System evidence certification exists, but statutory certification must remain blocked while recertification triggers and deeper inventory valuation assurance are incomplete.",
    files: ["services/accounting/close-assurance*", "services/accounting/data-trust.service.ts", "services/inventory/inventory-valuation.service.ts", "services/compliance/**/*", "prisma/schema.prisma"],
    outputs: ["stale invalidation evidence", "inventory valuation annex", "statutory blocker states"],
    gates: ["no legal certification claim without authority adapter and expert review", "certified export blocked on stale inventory valuation evidence", "business event records invalidation"],
    tests: ["stale after ledger change", "stale after inventory change", "valuation mismatch blocker", "authority not configured blocker"],
    verification: ["npm test -- services/accounting services/inventory --runInBand", "npm run prisma:validate", "npm run typecheck"],
  },
  {
    order: "011",
    slug: "offline-pos-replay-finalizer",
    display: "Exam 011 Offline POS Replay Finalizer",
    short: "Finalize offline POS replay",
    purpose: "convert PENDING_REPLAY offline POS envelopes into final POS, inventory, payment, drawer, fiscal, and ledger effects through existing services",
    risk: "Offline POS sync currently captures evidence and blockers, but accepted envelopes cannot yet become final legal/accounting truth safely.",
    files: ["services/pos/offline-sync.service.ts", "services/pos/pos.service.ts", "services/inventory/**/*", "services/compliance/**/*", "services/accounting/**/*", "actions/pos/**/*"],
    outputs: ["safe replay service", "conflict resolution evidence", "replay regression tests"],
    gates: ["idempotent replay", "no bypass of POS/inventory/payment/fiscal/ledger services", "conflicts remain quarantined"],
    tests: ["accepted replay", "duplicate replay", "conflict quarantine", "fiscal blocker", "ledger blocker", "inventory boundary remains green"],
    verification: ["npm test -- services/pos services/inventory services/compliance services/accounting --runInBand", "npm run inventory:boundary:fail", "npm run typecheck"],
  },
  {
    order: "012",
    slug: "compliance-country-pack-production-gate",
    display: "Exam 012 Compliance Country Pack Gate",
    short: "Gate compliance country packs",
    purpose: "move compliance and country-pack readiness toward production without allowing fake statutory claims",
    risk: "Compliance adapters and Cameroon country-pack values still include sandbox and expert-review blockers, so legal production certification must remain blocked.",
    files: ["services/compliance/**/*", "services/regulatory/**/*", "prisma/schema.prisma", "components/compliance/**/*"],
    outputs: ["country-pack readiness gates", "authority adapter blocker UI", "expert-review tests"],
    gates: ["REQUIRES_EXPERT_REVIEW blocks statutory certification", "sandbox adapters cannot claim production", "authority credentials are tenant-scoped and secret-safe"],
    tests: ["expert review blocker", "sandbox-only blocker", "adapter not configured", "country-pack version provenance"],
    verification: ["npm test -- services/compliance services/regulatory --runInBand", "npm run typecheck"],
  },
  {
    order: "013",
    slug: "payment-recon-production-hardener",
    display: "Exam 013 Payment Recon Production Hardener",
    short: "Harden payment reconciliation",
    purpose: "harden payment reconciliation for production provider feeds, statement channels, export signing, suspense posting, and provider-account completeness",
    risk: "Payment reconciliation has durable in-app infrastructure, but production provider credentials/channels, external statements, signing, and completeness gates remain incomplete.",
    files: ["services/payments/**/*", "services/reconciliation/**/*", "actions/payments/**/*", "components/payments/**/*", "prisma/schema.prisma"],
    outputs: ["provider readiness gates", "statement evidence controls", "suspense and close blocker tests"],
    gates: ["provider account mapping complete", "statements are external evidence", "webhooks verify signatures", "suspense blocks close when unresolved"],
    tests: ["provider event signature", "statement import", "matching", "suspense close blocker", "export provenance"],
    verification: ["npm test -- services/payments services/reconciliation --runInBand", "npm run typecheck"],
  },
  {
    order: "014",
    slug: "payroll-statutory-hardener",
    display: "Exam 014 Payroll Statutory Hardener",
    short: "Harden payroll statutory controls",
    purpose: "harden payroll statutory parameters, country-pack integration, filing readiness, approval/payment immutability, corrective runs, and payroll ledger evidence",
    risk: "Payroll foundations exist, but real statutory country parameters, filing adapters, expert validation, and operational hardening remain incomplete.",
    files: ["services/payroll/**/*", "actions/payroll/**/*", "components/payroll/**/*", "services/regulatory/**/*", "prisma/schema.prisma"],
    outputs: ["payroll country-pack gates", "corrective run controls", "payroll ledger tests"],
    gates: ["country rates are versioned data", "approved payslips immutable", "corrections use corrective runs", "payroll posts liabilities to leaf accounts"],
    tests: ["payroll approval", "same-actor rejection", "corrective run", "country parameter missing blocker", "ledger posting or blocker"],
    verification: ["npm test -- services/payroll actions/payroll --runInBand", "npm run typecheck"],
  },
  {
    order: "015",
    slug: "ci-release-gate-modernizer",
    display: "Exam 015 CI Release Gate Modernizer",
    short: "Modernize CI release gates",
    purpose: "modernize CI and release gates so Prisma, typecheck, lint, tests, build, and policy scanners enforce enterprise readiness",
    risk: "Build currently skips lint, next lint is deprecated, and policy gates are not fully ratcheted into a release-ready CI command.",
    files: ["package.json", ".github/**/*", "scripts/**/*", "what-next/**/*"],
    outputs: ["CI verify command", "lint modernization", "policy scanner integration", "release-readiness report"],
    gates: ["linted build available", "deprecated next lint replaced", "policy gates report or fail intentionally", "release report lists blockers"],
    tests: ["script smoke tests", "policy scanner fixtures if added"],
    verification: ["npm run verify:repo", "npm run lint", "npm test -- --runInBand", "npm run build:linted"],
  },
]

function titleCase(text) {
  return text
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function write(file, content) {
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, content)
}

function yamlEscape(value) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`
}

function skillName(item) {
  return `exam-${item.order}-aqstoqflow-${item.slug}`
}

function skillDescription(item) {
  return `${item.display} remediates AqStoqFlow risk class ${item.order} by ${item.purpose}. Use when executing the ordered exam risk-remediation suite, hardening this risk area, migrating legacy code into service-owned workflows, adding OHADA controls, or validating this remediation gate.`
}

function skillMd(item) {
  const name = skillName(item)
  const lines = []
  lines.push("---")
  lines.push(`name: ${name}`)
  lines.push(`description: ${skillDescription(item)}`)
  lines.push("---")
  lines.push("")
  lines.push(`# ${item.display}`)
  lines.push("")
  lines.push(`Use this skill to ${item.purpose}.`)
  lines.push("")
  lines.push("## Runtime Boundary")
  lines.push("")
  lines.push(`Risk class: ${item.risk}`)
  lines.push("")
  lines.push("Use when:")
  lines.push("")
  lines.push("- this risk class is the next open item in the exam remediation suite;")
  lines.push("- the user asks to remediate, audit, validate, or continue this exact risk area;")
  lines.push("- a higher-priority exam skill is complete or explicitly deferred with evidence.")
  lines.push("")
  lines.push("Do not use when:")
  lines.push("")
  lines.push("- a lower-numbered exam skill has unresolved blockers that this work depends on;")
  lines.push("- the requested change would bypass tenant isolation, RBAC, audit, ledger, or OHADA evidence rules;")
  lines.push("- the user only wants a report and not code changes, unless running report mode.")
  lines.push("")
  lines.push("## Required First Reads")
  lines.push("")
  ;[...commonReads, ...item.files, "references/risk-brief.md", "references/runtime-boundary.md"].forEach((entry) => {
    lines.push(`- \`${entry}\``)
  })
  lines.push("")
  lines.push("Read only the relevant files for the current slice after the initial reports. Avoid loading unrelated domains.")
  lines.push("")
  lines.push("## Edit Boundary")
  lines.push("")
  lines.push("May edit:")
  lines.push("")
  item.files.forEach((entry) => lines.push(`- \`${entry}\``))
  lines.push("- focused tests and local policy gates needed for this risk class.")
  lines.push("")
  lines.push("Must not edit:")
  lines.push("")
  lines.push("- unrelated modules;")
  lines.push("- unrelated migrations or generated files;")
  lines.push("- historical evidence records through destructive changes;")
  lines.push("- statutory/legal claims without real country authority prerequisites.")
  lines.push("")
  lines.push("## Execution Workflow")
  lines.push("")
  lines.push("1. Confirm all lower-numbered exam skills are complete, not applicable, or explicitly blocked with a saved report.")
  lines.push("2. Read the enterprise examination report, latest scan reports, graph summary, schema, and this skill's risk brief.")
  lines.push("3. Inventory current call sites, service owners, tests, and static gates for this risk class.")
  lines.push("4. Build the smallest complete service-owned remediation slice.")
  lines.push("5. Enforce tenant scope, actor identity, RBAC, typed errors, audit evidence, idempotency, and ledger/close blockers where relevant.")
  lines.push("6. Move callers to canonical service-backed actions/hooks/UI surfaces.")
  lines.push("7. Add focused regression tests before deleting or ratcheting old paths.")
  lines.push("8. Delete legacy code only after usage reaches zero and behavior is covered.")
  lines.push("9. Run focused verification and broaden only when the blast radius requires it.")
  lines.push("10. Save a completion report under `what-next/`.")
  lines.push("")
  lines.push("## Gate Boundary")
  lines.push("")
  item.gates.forEach((gate) => lines.push(`- ${gate}.`))
  lines.push("- No raw internal errors may cross a client boundary.")
  lines.push("- No tenant-scoped read/write may omit organization scope.")
  lines.push("- No economic mutation may skip audit/business-event evidence when applicable.")
  lines.push("")
  lines.push("## Tests")
  lines.push("")
  item.tests.forEach((test) => lines.push(`- ${test}.`))
  lines.push("")
  lines.push("## Verification Commands")
  lines.push("")
  lines.push("Run the focused commands that match the touched files:")
  lines.push("")
  lines.push("```powershell")
  item.verification.forEach((command) => lines.push(command))
  lines.push("```")
  lines.push("")
  lines.push("Always include `npm run prisma:validate`, `npm run typecheck`, and relevant policy gates when schema, service contracts, or boundary rules change.")
  lines.push("")
  lines.push("## Report Mode")
  lines.push("")
  lines.push("If running this skill without implementing code, create a report under `what-next/exam-suite-runs/` that lists:")
  lines.push("")
  lines.push("- reports and files inspected;")
  lines.push("- current status for this risk class;")
  lines.push("- concrete first implementation slice;")
  lines.push("- blocked dependencies;")
  lines.push("- verification commands to run after implementation.")
  lines.push("")
  lines.push("## Completion Report")
  lines.push("")
  lines.push("The final report must include:")
  lines.push("")
  lines.push("- risk class and skill name;")
  lines.push("- files inspected and changed;")
  lines.push("- services added or reused;")
  lines.push("- actions/hooks/UI migrated;")
  lines.push("- controls added;")
  lines.push("- tests added;")
  lines.push("- verification commands and results;")
  lines.push("- remaining blockers;")
  lines.push("- next exam skill to run.")
  lines.push("")
  return lines.join("\n")
}

function riskBrief(item) {
  const lines = []
  lines.push(`# ${item.display} Risk Brief`)
  lines.push("")
  lines.push(`Skill: \`${skillName(item)}\``)
  lines.push("")
  lines.push(`Order: ${item.order}`)
  lines.push("")
  lines.push("## Risk")
  lines.push("")
  lines.push(item.risk)
  lines.push("")
  lines.push("## Primary Files")
  lines.push("")
  item.files.forEach((entry) => lines.push(`- \`${entry}\``))
  lines.push("")
  lines.push("## Expected Outputs")
  lines.push("")
  item.outputs.forEach((entry) => lines.push(`- ${entry}`))
  lines.push("")
  lines.push("## Source Reports")
  lines.push("")
  sourceReports.forEach((entry) => lines.push(`- \`${entry}\``))
  lines.push("")
  return lines.join("\n")
}

function runtimeBoundary(item) {
  const lines = []
  lines.push("# Runtime Boundary Card")
  lines.push("")
  lines.push(`Skill: ${skillName(item)}`)
  lines.push(`Version/date: ${date}`)
  lines.push("")
  lines.push("## Trigger Boundary")
  lines.push("")
  lines.push(`Use when this suite reaches risk class ${item.order}: ${item.display}.`)
  lines.push("")
  lines.push("Do not use when lower-numbered dependencies are unresolved.")
  lines.push("")
  lines.push("## Input Boundary")
  lines.push("")
  lines.push("Must read:")
  lines.push("")
  ;[...commonReads, "references/risk-brief.md"].forEach((entry) => lines.push(`- \`${entry}\``))
  lines.push("")
  lines.push("## Edit Boundary")
  lines.push("")
  lines.push("May edit:")
  lines.push("")
  item.files.forEach((entry) => lines.push(`- \`${entry}\``))
  lines.push("")
  lines.push("Must not edit unrelated modules or make destructive evidence changes.")
  lines.push("")
  lines.push("## Gate Boundary")
  lines.push("")
  item.gates.forEach((gate) => lines.push(`- ${gate}`))
  lines.push("")
  lines.push("## Output Boundary")
  lines.push("")
  lines.push("Final answer and saved report must include changed files, controls, tests, verification, blockers, and next skill.")
  lines.push("")
  return lines.join("\n")
}

function antiPatterns(item) {
  const lines = []
  lines.push("# Anti-Pattern Register")
  lines.push("")
  lines.push(`## Anti-Pattern: Skipping risk class ${item.order}`)
  lines.push("")
  lines.push("Failure signature:")
  lines.push("")
  lines.push("- Work starts on a lower-priority or more visible feature while this risk class still has open blockers.")
  lines.push("")
  lines.push("Root cause:")
  lines.push("")
  lines.push("- Newer enterprise kernels coexist with older legacy paths and the suite order is ignored.")
  lines.push("")
  lines.push("Veto rule:")
  lines.push("")
  lines.push("- Do not proceed until the current risk is remediated, explicitly not applicable, or blocked with evidence.")
  lines.push("")
  lines.push("Repair pattern:")
  lines.push("")
  lines.push("- Return to the ordered exam skill, implement the smallest service-owned slice, and save a completion report.")
  lines.push("")
  return lines.join("\n")
}

function openaiYaml(item) {
  const name = skillName(item)
  return [
    "interface:",
    `  display_name: ${yamlEscape(item.display)}`,
    `  short_description: ${yamlEscape(item.short)}`,
    `  default_prompt: ${yamlEscape(`Use $${name} to remediate AqStoqFlow risk class ${item.order}: ${item.display}.`)}`,
    "",
  ].join("\n")
}

function runReport(item) {
  const lines = []
  lines.push(`# ${item.display} Report-Mode Run`)
  lines.push("")
  lines.push(`Date: ${date}`)
  lines.push("")
  lines.push(`Skill: \`${skillName(item)}\``)
  lines.push("")
  lines.push("Mode: report-only first run. No application code changed.")
  lines.push("")
  lines.push("## Risk Class")
  lines.push("")
  lines.push(item.risk)
  lines.push("")
  lines.push("## Inputs Read")
  lines.push("")
  sourceReports.forEach((entry) => lines.push(`- \`${entry}\``))
  lines.push("- `graphify-out/GRAPH_REPORT.md`")
  lines.push("")
  lines.push("## First Implementation Slice")
  lines.push("")
  lines.push(`Use \`$${skillName(item)}\` to ${item.purpose}.`)
  lines.push("")
  lines.push("Start with these files/patterns:")
  lines.push("")
  item.files.forEach((entry) => lines.push(`- \`${entry}\``))
  lines.push("")
  lines.push("## Required Gates")
  lines.push("")
  item.gates.forEach((gate) => lines.push(`- ${gate}`))
  lines.push("")
  lines.push("## Verification To Run After Implementation")
  lines.push("")
  lines.push("```powershell")
  item.verification.forEach((command) => lines.push(command))
  lines.push("```")
  lines.push("")
  lines.push("## Status")
  lines.push("")
  lines.push("Ready for implementation in the ordered suite. Do not skip lower-numbered unresolved risk classes.")
  lines.push("")
  return lines.join("\n")
}

function suiteReport() {
  const lines = []
  lines.push("# AqStoqFlow Exam Risk-Remediation Skill Suite")
  lines.push("")
  lines.push(`Date: ${date}`)
  lines.push("")
  lines.push("## Source Reports")
  lines.push("")
  sourceReports.forEach((entry) => lines.push(`- \`${entry}\``))
  lines.push("- `graphify-out/GRAPH_REPORT.md`")
  lines.push("")
  lines.push("## Installed Skills")
  lines.push("")
  lines.push("| Order | Skill | Risk class | First output |")
  lines.push("| --- | --- | --- | --- |")
  suite.forEach((item) => {
    lines.push(`| ${item.order} | \`${skillName(item)}\` | ${item.risk.replace(/\|/g, "\\|")} | ${item.outputs[0]} |`)
  })
  lines.push("")
  lines.push("## Execution Rule")
  lines.push("")
  lines.push("Run skills in numeric order unless a production breakage requires a narrow emergency fix. Each skill must save a report under `what-next/` before the next skill starts.")
  lines.push("")
  lines.push("## Validation")
  lines.push("")
  lines.push("Validate each installed skill with:")
  lines.push("")
  lines.push("```powershell")
  lines.push('python "C:\\Users\\J COMPUTER\\.codex\\skills\\.system\\skill-creator\\scripts\\quick_validate.py" "C:\\Users\\J COMPUTER\\.codex\\skills\\<skill-name>"')
  lines.push("```")
  lines.push("")
  return lines.join("\n")
}

ensureDir(draftRoot)
ensureDir(runRoot)

const manifest = {
  date,
  sourceReports,
  skills: suite.map((item) => ({
    order: item.order,
    name: skillName(item),
    display: item.display,
    purpose: item.purpose,
    risk: item.risk,
    files: item.files,
    verification: item.verification,
  })),
}

for (const item of suite) {
  const name = skillName(item)
  const dir = path.join(draftRoot, name)
  write(path.join(dir, "SKILL.md"), skillMd(item))
  write(path.join(dir, "agents", "openai.yaml"), openaiYaml(item))
  write(path.join(dir, "references", "risk-brief.md"), riskBrief(item))
  write(path.join(dir, "references", "runtime-boundary.md"), runtimeBoundary(item))
  write(path.join(dir, "references", "anti-pattern-register.md"), antiPatterns(item))
  write(path.join(runRoot, `EXAM_${item.order}_${item.slug.toUpperCase().replace(/-/g, "_")}_RUN_REPORT_${date}.md`), runReport(item))
}

write(path.join(draftRoot, "manifest.json"), JSON.stringify(manifest, null, 2))
write(suiteReportPath, suiteReport())

console.log(`Generated ${suite.length} exam skills in ${draftRoot}`)
console.log(`Generated report-mode runs in ${runRoot}`)
console.log(`Generated suite report at ${suiteReportPath}`)
