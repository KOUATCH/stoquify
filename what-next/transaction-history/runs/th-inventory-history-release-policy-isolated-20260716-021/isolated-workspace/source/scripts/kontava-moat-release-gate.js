#!/usr/bin/env node

const fs = require("fs")
const os = require("os")
const path = require("path")

const MODES = new Set(["report", "warn", "fail"])

const SEED_SCENARIOS = [
  {
    id: "full_evidence_chain",
    title: "Full evidence chain",
    businessStory: "Sale to payment to ledger to reconciliation to close/trust proof.",
    requirements: [
      textRequirement("prisma/comprehensive-seed.ts", /accountingSourceLink/i, "Accounting source links seeded"),
      textRequirement("prisma/comprehensive-seed.ts", /journalEntry/i, "Journal entries seeded"),
      textRequirement("prisma/comprehensive-seed.ts", /payment/i, "Payments seeded"),
      textRequirement("prisma/schema.prisma", /model CloseRun\b/, "Close run schema exists"),
      fileRequirement("services/evidence/proof-trail.service.ts", "Proof trail service exists"),
    ],
  },
  {
    id: "cash_leakage",
    title: "Cash leakage",
    businessStory: "Drawer variance, refund activity, duplicate provider references, and open suspense risk.",
    requirements: [
      textRequirement("prisma/comprehensive-seed.ts", /cashDrawer/i, "Cash drawer data seeded"),
      textRequirement("prisma/comprehensive-seed.ts", /paymentRefund/i, "Refund data seeded"),
      textRequirement("prisma/schema.prisma", /duplicateFingerprint|providerReference/i, "Duplicate/provider reference fields exist"),
      textRequirement("prisma/schema.prisma", /model SuspenseItem\b|model PaymentException\b/, "Suspense/exception schema exists"),
    ],
  },
  {
    id: "inventory_cash_risk",
    title: "Inventory cash risk",
    businessStory: "Dead stock, low stock, supplier obligations, and reorder affordability.",
    requirements: [
      textRequirement("prisma/comprehensive-seed.ts", /inventoryLevel/i, "Inventory levels seeded"),
      textRequirement("prisma/comprehensive-seed.ts", /purchaseOrder/i, "Purchase orders seeded"),
      textRequirement("prisma/comprehensive-seed.ts", /supplier/i, "Supplier data seeded"),
      fileRequirement("services/snapshots/inventory-cash-snapshot.service.ts", "Inventory cash snapshot exists"),
    ],
  },
  {
    id: "payroll_exposure",
    title: "Payroll exposure",
    businessStory: "Approved or posted payroll with unresolved payment/reconciliation exposure.",
    requirements: [
      textRequirement("prisma/schema.prisma", /model PayrollRun\b/, "Payroll run schema exists"),
      textRequirement("prisma/schema.prisma", /model PayrollPaymentBatch\b/, "Payroll payment batch schema exists"),
      fileRequirement("services/payroll/payroll-control.service.ts", "Payroll control service exists"),
      fileRequirement("services/security/redaction-policy.service.ts", "Payroll redaction policy exists"),
    ],
  },
  {
    id: "accountant_multi_client",
    title: "Accountant multi-client",
    businessStory: "Accountant sees several tenants with trust grades and close blockers.",
    requirements: [
      textRequirement("prisma/comprehensive-seed.ts", /ORG_COUNT|seedOrganizations/i, "Multiple organizations are seeded"),
      textRequirement("prisma/comprehensive-seed.ts", /auditor|accountant/i, "Accountant/auditor role is seeded"),
      fileRequirement("services/evidence/evidence-grade.service.ts", "Evidence grade service exists"),
      fileRequirement("services/snapshots/close-readiness-snapshot.service.ts", "Close readiness snapshot exists"),
    ],
  },
  {
    id: "limited_modules",
    title: "Limited modules",
    businessStory: "POS plus inventory tenant cannot see/use finance or payroll modules.",
    requirements: [
      textRequirement("prisma/schema.prisma", /requestedModules\s+String\[\]/, "Requested modules are stored on organizations"),
      textRequirement("prisma/comprehensive-seed.ts", /REGISTER_WORKFLOW_MODULES|requestedModules/i, "Registration module selections are seeded"),
      fileRequirement("services/modules/module-entitlement.service.ts", "Module entitlement evaluator exists"),
      fileRequirement("services/modules/__tests__/module-entitlement.service.test.ts", "Module entitlement tests exist"),
    ],
  },
  {
    id: "suspended_read_only",
    title: "Suspended/read-only",
    businessStory: "Historical read remains possible while risky mutations are blocked.",
    requirements: [
      textRequirement("services/modules/module-control-contracts.ts", /read_only|suspended/i, "Read-only and suspended statuses exist"),
      textRequirement("services/modules/__tests__/module-entitlement.service.test.ts", /read-only|suspended/i, "Read-only/suspended behavior is tested"),
      fileRequirement("services/security/moat-guard.service.ts", "Composite moat guard exists"),
    ],
  },
  {
    id: "partner_consent",
    title: "Partner consent",
    businessStory: "Future lender/fintech export requires scoped consent and revocation safety.",
    requirements: [
      textRequirement("prisma/schema.prisma", /revokedAt|consent/i, "Revocation/consent-capable schema field exists"),
      fileRequirement("services/security/moat-guard.service.ts", "Consent-aware moat guard exists"),
      textRequirement("services/security/__tests__/moat-guard.service.test.ts", /require_consent|partner consent/i, "Consent guard tests exist"),
    ],
  },
]

const BACKFILL_CHECKS = [
  {
    id: "evidence_grade_classification",
    title: "Evidence grade classification",
    requirements: [
      fileRequirement("services/evidence/evidence-grade.service.ts", "Evidence grade service exists"),
      textRequirement("services/evidence/evidence-contracts.ts", /raw|operational|posted|reconciled|certified|blocked/i, "Conservative evidence grade vocabulary exists"),
    ],
  },
  {
    id: "source_link_coverage",
    title: "Source-link coverage",
    requirements: [
      textRequirement("prisma/schema.prisma", /model AccountingSourceLink\b/, "Accounting source link model exists"),
      textRequirement("prisma/comprehensive-seed.ts", /accountingSourceLink/i, "Seed creates accounting source links"),
    ],
  },
  {
    id: "business_event_quality",
    title: "Business event quality",
    requirements: [
      textRequirement("prisma/schema.prisma", /model BusinessEvent\b/, "Business event model exists"),
      textRequirement("prisma/schema.prisma", /model BusinessEventOutbox\b/, "Business event outbox model exists"),
      fileRequirement("services/events/business-event.service.ts", "Business event service exists"),
    ],
  },
  {
    id: "payment_reconciliation_evidence",
    title: "Payment reconciliation evidence",
    requirements: [
      textRequirement("prisma/schema.prisma", /model ProviderEvent\b|model ProviderStatement\b|model ReconciliationRun\b/, "Provider/reconciliation schema exists"),
      fileRequirement("services/reconciliation/payment-reconciliation-certification.service.ts", "Reconciliation certification service exists"),
      fileRequirement("services/snapshots/payment-truth-snapshot.service.ts", "Payment truth snapshot exists"),
    ],
  },
  {
    id: "close_evidence_coverage",
    title: "Close evidence coverage",
    requirements: [
      textRequirement("prisma/schema.prisma", /model CloseEvidenceItem\b/, "Close evidence item model exists"),
      fileRequirement("services/snapshots/close-readiness-snapshot.service.ts", "Close readiness snapshot exists"),
    ],
  },
  {
    id: "idempotent_seed_markers",
    title: "Idempotent tenant-scoped seed markers",
    requirements: [
      textRequirement("prisma/comprehensive-seed.ts", /seededOrganizationWhere/i, "Tenant-scoped seed cleanup marker exists"),
      textRequirement("prisma/comprehensive-seed.ts", /deleteMany\(\{\s*where:\s*seededOrganizationWhere/i, "Tenant-scoped deleteMany cleanup exists"),
      textRequirement("prisma/comprehensive-seed.ts", /function id\(|const id\s*=/i, "Stable seed IDs exist"),
    ],
  },
]

const RELEASE_GATE_CHECKS = [
  gateCheck("tenant_isolation", "Tenant isolation", [
    textRequirement("prisma/comprehensive-seed.ts", /organizationId/i, "Seed assigns organization IDs"),
    textRequirement("prisma/schema.prisma", /@@index\(\[organizationId/i, "Tenant indexes exist"),
  ]),
  gateCheck("rbac", "RBAC", [
    fileRequirement("lib/security/rbac-permissions.ts", "RBAC permission evaluator exists"),
    fileRequirement("lib/security/__tests__/rbac-permissions.test.ts", "RBAC tests exist"),
  ]),
  gateCheck("module_entitlement", "Module entitlement", [
    fileRequirement("services/modules/module-entitlement.service.ts", "Module entitlement service exists"),
    fileRequirement("services/modules/__tests__/module-entitlement.service.test.ts", "Module entitlement tests exist"),
  ]),
  gateCheck("proof_redaction", "Proof-trail redaction", [
    fileRequirement("services/evidence/evidence-redaction.service.ts", "Evidence redaction service exists"),
    fileRequirement("services/security/redaction-policy.service.ts", "Security redaction policy exists"),
  ]),
  gateCheck("snapshot_freshness", "Snapshot freshness", [
    fileRequirement("services/snapshots/snapshot-contracts.ts", "Snapshot contracts exist"),
    fileRequirement("services/snapshots/snapshot-rebuild.service.ts", "Snapshot rebuild service exists"),
  ]),
  gateCheck("export_fresh_auth", "Export and fresh-auth safety", [
    fileRequirement("services/controls/sensitive-action.service.ts", "Sensitive action backbone exists"),
    fileRequirement("services/security/export-safety.service.ts", "Export safety service exists"),
    fileRequirement("services/security/__tests__/export-safety.service.test.ts", "Export safety tests exist"),
  ]),
  gateCheck("business_signals_action_queue", "Business signals and action queue", [
    fileRequirement("services/signals/business-signal-contracts.ts", "Business signal contracts exist"),
    fileRequirement("services/signals/business-signal-rules.service.ts", "Business signal rules service exists"),
    fileRequirement("services/signals/action-queue.service.ts", "Action queue service exists"),
    fileRequirement("services/signals/__tests__/action-queue.service.test.ts", "Action queue tests exist"),
  ]),
  gateCheck("policy_gates", "Existing policy gates", [
    fileRequirement("scripts/service-boundary-gate.js", "Service boundary gate exists"),
    fileRequirement("scripts/demo-report-trust-gate.js", "Demo/report trust gate exists"),
    fileRequirement("scripts/hard-delete-gate.js", "Hard-delete gate exists"),
    fileRequirement("scripts/raw-error-boundary-gate.js", "Raw-error boundary gate exists"),
  ]),
]

function textRequirement(file, expression, label) {
  return { type: "text", file, expression, label }
}

function fileRequirement(file, label) {
  return { type: "file", file, label }
}

function gateCheck(id, title, requirements) {
  return { id, title, requirements }
}

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    mode: "report",
    out: null,
    jsonOut: null,
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--root") args.root = path.resolve(argv[++index])
    else if (arg === "--mode") args.mode = argv[++index]
    else if (arg === "--out") args.out = path.resolve(argv[++index])
    else if (arg === "--json-out") args.jsonOut = path.resolve(argv[++index])
    else if (arg === "--help" || arg === "-h") {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!MODES.has(args.mode)) throw new Error("--mode must be one of: report, warn, fail")
  return args
}

function printHelp() {
  console.log(`Kontava moat seed/backfill/release gate

Usage:
  node scripts/kontava-moat-release-gate.js [--mode report|warn|fail] [--out file] [--json-out file]

Modes:
  report  Generate a readiness report and exit 0.
  warn    Generate a readiness report, print blockers, and exit 0.
  fail    Exit 1 when critical seed/backfill/release blockers remain.
`)
}

function evaluateReleaseGate(root = process.cwd()) {
  const resolvedRoot = path.resolve(root)
  const scenarios = SEED_SCENARIOS.map((scenario) => evaluateGroup(resolvedRoot, scenario))
  const backfill = BACKFILL_CHECKS.map((check) => evaluateGroup(resolvedRoot, check))
  const releaseGates = RELEASE_GATE_CHECKS.map((check) => evaluateGroup(resolvedRoot, check))
  const allGroups = [...scenarios, ...backfill, ...releaseGates]
  const blockers = allGroups.filter((group) => group.status !== "ready")
  const criticalBlockers = blockers.filter((group) => group.status === "missing")

  return {
    generatedAt: new Date().toISOString(),
    root: resolvedRoot,
    summary: {
      scenarioCount: scenarios.length,
      readyScenarioCount: countStatus(scenarios, "ready"),
      partialScenarioCount: countStatus(scenarios, "partial"),
      missingScenarioCount: countStatus(scenarios, "missing"),
      backfillCheckCount: backfill.length,
      readyBackfillCheckCount: countStatus(backfill, "ready"),
      releaseGateCount: releaseGates.length,
      readyReleaseGateCount: countStatus(releaseGates, "ready"),
      blockerCount: blockers.length,
      criticalBlockerCount: criticalBlockers.length,
      releaseStatus: criticalBlockers.length > 0 ? "blocked" : blockers.length > 0 ? "ready_with_warnings" : "ready",
    },
    scenarios,
    backfill,
    releaseGates,
    blockers: blockers.map((group) => ({
      id: group.id,
      title: group.title,
      status: group.status,
      missing: group.requirements.filter((item) => !item.passed).map((item) => item.label),
    })),
    rollbackPlan: [
      "Keep module entitlements in observe mode until would-block reports are clean.",
      "Do not mark legacy data Certified during backfill; classify old unsupported records as operational or blocked.",
      "Run backfills tenant-by-tenant and batch large tenants.",
      "Before enforcement, archive the generated readiness report and compare the next report for regressions.",
      "Rollback hard enforcement by returning surfaces to observe mode and disabling only the new guard caller, not the shared RBAC/accounting foundations.",
    ],
  }
}

function evaluateGroup(root, group) {
  const requirements = group.requirements.map((requirement) => evaluateRequirement(root, requirement))
  const passedCount = requirements.filter((item) => item.passed).length
  const status = passedCount === requirements.length ? "ready" : passedCount > 0 ? "partial" : "missing"

  return {
    id: group.id,
    title: group.title,
    businessStory: group.businessStory,
    status,
    passedCount,
    totalCount: requirements.length,
    requirements,
  }
}

function evaluateRequirement(root, requirement) {
  const absolute = path.join(root, requirement.file)
  const exists = fs.existsSync(absolute)

  if (requirement.type === "file") {
    return {
      ...requirement,
      passed: exists,
      evidence: exists ? "file exists" : "file missing",
    }
  }

  const text = exists ? fs.readFileSync(absolute, "utf8") : ""
  const passed = exists && requirement.expression.test(text)
  return {
    ...requirement,
    passed,
    expression: requirement.expression.toString(),
    evidence: passed ? "pattern found" : exists ? "pattern missing" : "file missing",
  }
}

function countStatus(groups, status) {
  return groups.filter((group) => group.status === status).length
}

function renderMarkdown(report, mode = "report") {
  const lines = []
  lines.push("# Kontava Moat Seed Backfill Release Gate Report")
  lines.push("")
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push(`Mode: \`${mode}\``)
  lines.push(`Root: \`${report.root}\``)
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`- Release status: \`${report.summary.releaseStatus}\``)
  lines.push(`- Seed scenarios ready: ${report.summary.readyScenarioCount}/${report.summary.scenarioCount}`)
  lines.push(`- Backfill checks ready: ${report.summary.readyBackfillCheckCount}/${report.summary.backfillCheckCount}`)
  lines.push(`- Release gates ready: ${report.summary.readyReleaseGateCount}/${report.summary.releaseGateCount}`)
  lines.push(`- Blockers: ${report.summary.blockerCount}`)
  lines.push(`- Critical blockers: ${report.summary.criticalBlockerCount}`)
  lines.push("")
  renderGroupTable(lines, "Seed Scenario Coverage", report.scenarios)
  renderGroupTable(lines, "Backfill Readiness", report.backfill)
  renderGroupTable(lines, "Release Gate Readiness", report.releaseGates)
  lines.push("## Blockers")
  lines.push("")

  if (report.blockers.length === 0) {
    lines.push("No seed/backfill/release blockers detected by the static gate.")
  } else {
    for (const blocker of report.blockers) {
      lines.push(`- \`${blocker.status}\` ${blocker.title}: ${blocker.missing.join("; ")}`)
    }
  }

  lines.push("")
  lines.push("## Rollback Plan")
  lines.push("")
  for (const step of report.rollbackPlan) lines.push(`- ${step}`)
  lines.push("")
  lines.push("## Validation Ladder")
  lines.push("")
  lines.push("- `report`: generate readiness evidence without blocking.")
  lines.push("- `warn`: surface blockers but exit 0.")
  lines.push("- `fail`: block promotion when missing critical foundations remain.")
  lines.push("")
  lines.push("## Important Safety Notes")
  lines.push("")
  lines.push("- This gate is read-only and does not reset, reseed, migrate, or mutate tenant data.")
  lines.push("- It proves static readiness. Live tenant data-quality checks should be added once the team approves a tenant-scoped backfill runner.")
  lines.push("- Legacy records must not be marked Certified by this gate.")

  return lines.join(os.EOL)
}

function renderGroupTable(lines, title, groups) {
  lines.push(`## ${title}`)
  lines.push("")
  lines.push("| Status | Area | Passed | Missing |")
  lines.push("| --- | --- | ---: | --- |")
  for (const group of groups) {
    const missing = group.requirements
      .filter((item) => !item.passed)
      .map((item) => item.label)
      .join("; ")
    lines.push(`| ${group.status} | ${escapePipes(group.title)} | ${group.passedCount}/${group.totalCount} | ${escapePipes(missing || "None")} |`)
  }
  lines.push("")
}

function escapePipes(value) {
  return String(value).replace(/\|/g, "\\|")
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function writeOutputs(report, args) {
  if (args.out) {
    ensureDirectory(args.out)
    fs.writeFileSync(args.out, renderMarkdown(report, args.mode), "utf8")
  }
  if (args.jsonOut) {
    ensureDirectory(args.jsonOut)
    fs.writeFileSync(args.jsonOut, `${JSON.stringify(report, null, 2)}${os.EOL}`, "utf8")
  }
}

function main(argv = process.argv) {
  const args = parseArgs(argv)
  const report = evaluateReleaseGate(args.root)
  writeOutputs(report, args)

  const markdown = renderMarkdown(report, args.mode)
  console.log(markdown)

  if (args.mode === "fail" && report.summary.criticalBlockerCount > 0) return 1
  if (args.mode === "warn" && report.summary.blockerCount > 0) {
    console.warn(`Kontava moat release gate found ${report.summary.blockerCount} blocker(s).`)
  }
  return 0
}

if (require.main === module) {
  process.exitCode = main(process.argv)
}

module.exports = {
  BACKFILL_CHECKS,
  RELEASE_GATE_CHECKS,
  SEED_SCENARIOS,
  evaluateReleaseGate,
  main,
  parseArgs,
  renderMarkdown,
}
