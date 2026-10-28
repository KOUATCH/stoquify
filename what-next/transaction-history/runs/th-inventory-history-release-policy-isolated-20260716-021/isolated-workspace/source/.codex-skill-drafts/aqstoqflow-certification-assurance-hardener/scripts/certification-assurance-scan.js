#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const args = process.argv.slice(2)

function argValue(name, fallback) {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

const root = path.resolve(argValue("--root", process.cwd()))
const outPath = argValue("--out", null)
const jsonOutPath = argValue("--json-out", null)

const targets = [
  "what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md",
  "what-next/AQSTOQFLOW_CLOSE_ASSURANCE_CENTER_IMPLEMENTATION_REPORT_2026-06-16.md",
  "what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md",
  "what-next/AQSTOQFLOW_010_ADJUSTMENT_WRITEOFF_COUNT_KERNEL_REPORT_2026-06-15.md",
  "services/accounting/close-assurance.service.ts",
  "services/accounting/close-assurance-pack.service.ts",
  "services/accounting/data-trust.service.ts",
  "services/inventory/inventory-valuation.service.ts",
  "services/events/business-event.service.ts",
  "services/regulatory/country-packs/cameroon.ts",
  "services/compliance/adapters/registry.ts",
  "services/compliance/adapters/cameroon-dgi-sandbox.ts",
  "prisma/schema.prisma",
]

const checks = [
  {
    id: "statutory-scope-explicit",
    label: "Statutory scope is explicitly blocked or limited",
    patterns: [/statutory certification/i, /statutory.*out of scope/i, /statutory.*blocked/i],
    severity: "high",
    recommendation: "Keep statutory certification as an explicit blocker until real authority adapter, verified country pack, and expert/legal approval exist.",
  },
  {
    id: "system-certification-language",
    label: "System evidence certification language exists",
    patterns: [/system-certified/i, /system evidence/i, /DRAFT_NOT_CERTIFIED/i],
    severity: "medium",
    recommendation: "Separate internal system evidence pack status from statutory authority certification status.",
  },
  {
    id: "recertification-invalidation",
    label: "Recertification or stale invalidation logic exists",
    patterns: [/recertification/i, /invalidation/i, /stale/i, /EVIDENCE_STALE/i],
    severity: "high",
    recommendation: "Add service-owned stale detection for post-certification source changes and record audit/business-event evidence.",
  },
  {
    id: "inventory-valuation-assurance",
    label: "Inventory valuation assurance is represented",
    patterns: [/inventory valuation/i, /class 3/i, /valuation.*mismatch/i, /INVENTORY_VALUATION_MISMATCH/i],
    severity: "high",
    recommendation: "Connect inventory valuation reconciliation to close assurance findings, blockers, and close pack annexes.",
  },
  {
    id: "expert-review-blocker",
    label: "Expert review blockers are represented",
    patterns: [/REQUIRES_EXPERT_REVIEW/i, /expert review/i],
    severity: "medium",
    recommendation: "Keep expert-review country-pack values as blockers for statutory certification readiness.",
  },
  {
    id: "authority-adapter-blocker",
    label: "Authority adapter configuration blockers are represented",
    patterns: [/AUTHORITY_NOT_CONFIGURED/i, /adapter.*not configured/i, /sandbox adapter/i, /fakeSandbox/i],
    severity: "medium",
    recommendation: "Expose authority adapter configuration and sandbox-only status as statutory blockers.",
  },
  {
    id: "business-event-evidence",
    label: "Business event evidence is available",
    patterns: [/recordBusinessEvent/i, /BusinessEvent/i, /business-event/i],
    severity: "medium",
    recommendation: "Use business events for certification invalidation and inventory valuation annex evidence.",
  },
]

function read(rel) {
  const full = path.join(root, rel)
  if (!fs.existsSync(full)) return null
  return fs.readFileSync(full, "utf8")
}

function findMatches(text, patterns) {
  const matches = []
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) matches.push(match[0])
  }
  return [...new Set(matches)]
}

const files = targets.map((rel) => {
  const text = read(rel)
  return {
    path: rel,
    exists: text !== null,
    bytes: text ? Buffer.byteLength(text, "utf8") : 0,
    text: text || "",
  }
})

const findings = []

for (const check of checks) {
  const fileHits = []
  for (const file of files) {
    if (!file.exists) continue
    const matches = findMatches(file.text, check.patterns)
    if (matches.length) {
      fileHits.push({ file: file.path, matches })
    }
  }
  findings.push({
    id: check.id,
    label: check.label,
    severity: check.severity,
    present: fileHits.length > 0,
    files: fileHits,
    recommendation: check.recommendation,
  })
}

const missingFiles = files.filter((file) => !file.exists).map((file) => file.path)
const gaps = findings.filter((finding) => !finding.present)

const summary = {
  generatedAt: new Date().toISOString(),
  root,
  filesChecked: files.length,
  missingFiles,
  checks: findings.length,
  presentChecks: findings.filter((finding) => finding.present).length,
  gapChecks: gaps.length,
}

function markdown() {
  const lines = []
  lines.push("# AqStoqFlow Certification Assurance Scan")
  lines.push("")
  lines.push(`Generated: ${summary.generatedAt}`)
  lines.push("")
  lines.push(`Root: \`${root}\``)
  lines.push("")
  lines.push(`Files checked: ${summary.filesChecked}`)
  lines.push("")
  lines.push(`Checks present: ${summary.presentChecks}`)
  lines.push("")
  lines.push(`Gap checks: ${summary.gapChecks}`)
  lines.push("")
  lines.push("## Missing Files")
  lines.push("")
  if (missingFiles.length === 0) {
    lines.push("No target files were missing.")
  } else {
    for (const file of missingFiles) lines.push(`- \`${file}\``)
  }
  lines.push("")
  lines.push("## Checks")
  lines.push("")
  lines.push("| Status | Severity | Check | Evidence Files | Recommendation |")
  lines.push("| --- | --- | --- | --- | --- |")
  for (const finding of findings) {
    const status = finding.present ? "present" : "gap"
    const evidence = finding.files.map((entry) => `\`${entry.file}\``).join(", ") || "-"
    lines.push(`| ${status} | ${finding.severity} | ${finding.label} | ${evidence} | ${finding.recommendation} |`)
  }
  lines.push("")
  lines.push("## First Safe Implementation Slice")
  lines.push("")
  lines.push("Add service-owned certification stale/invalidation evidence, then connect inventory valuation assurance into close findings and close pack annexes. Keep statutory authority certification blocked until country-pack expert review and authority adapter prerequisites are real.")
  lines.push("")
  return lines.join("\n")
}

const md = markdown()
if (outPath) {
  const resolved = path.resolve(root, outPath)
  fs.mkdirSync(path.dirname(resolved), { recursive: true })
  fs.writeFileSync(resolved, md)
} else {
  console.log(md)
}

if (jsonOutPath) {
  const resolved = path.resolve(root, jsonOutPath)
  fs.mkdirSync(path.dirname(resolved), { recursive: true })
  fs.writeFileSync(resolved, JSON.stringify({ summary, findings }, null, 2))
}
