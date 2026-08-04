#!/usr/bin/env node

const { createHash } = require("node:crypto")
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs")
const { dirname, resolve } = require("node:path")
const { evaluateOperationalReleaseRegister } = require("./agent-operational-release-gate")
const { evaluateRotationRegister } = require("./agent-credential-rotation-gate")
const { collectInput, evaluatePromotion } = require("./agent-phase-promotion-gate")

const PATHS = Object.freeze({
  operational: "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json",
  credentials: "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.json",
  jsonOut: "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_HUMAN_INTERVENTION_PLAN_2026-07-25.json",
  markdownOut: "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_HUMAN_INTERVENTION_PLAN_2026-07-25.md",
})

const INTERVENTIONS = Object.freeze([
  {
    id: "RELEASE_AND_CI",
    title: "Immutable release and protected CI evidence",
    owners: ["ENGINEERING_RELEASE", "QA", "PLATFORM"],
    separation: "The release producer must not be the sole independent CI attester.",
    actions: [
      "Select the reviewer-approved commit and build from a clean checkout.",
      "Publish an inactive immutable artifact and bind its digest to the commit.",
      "Run protected CI and enabled-pilot browser certification against that artifact.",
      "Expose the signed, query-free CI evidence response through the managed evidence endpoint.",
    ],
    acceptedEvidence: "Commit SHA, artifact digest/reference, clean-tree result, CI run/reference, browser-report hash, deployment reference, source authority, attestation digest/timestamp, and invalid-auth rejection.",
    command: "npm run agent:ci-release:evidence:apply",
    downstream: "Operational release and Phase 2B entry",
    prefixes: ["release:", "ci:"],
  },
  {
    id: "GOVERNANCE_AND_OWNERS",
    title: "Product/security approval and operational ownership",
    owners: ["PRODUCT", "SECURITY", "RELEASE_MANAGER"],
    separation: "Product and security approvers must be distinct real identities; every responsibility needs a different primary and backup.",
    actions: [
      "Approve the same frozen commit, artifact, manifest, evidence bundle, and environment.",
      "Assign primary and backup owners for rollout, rollback, support, pilot, security incident, and on-call backup.",
      "Have each owner accept the current runbook and coverage window.",
      "Publish value-free governance evidence from the authoritative directory/workflow system.",
    ],
    acceptedEvidence: "Directory identities, approval references and decisions, binding hashes, acceptance timestamps, coverage windows, escalation references, and independent authority attestation.",
    command: "npm run agent:governance:evidence:apply",
    downstream: "Operational release and enterprise gate 017",
    prefixes: ["governance:", "approval:", "approvals:", "owner:", "owners:"],
  },
  {
    id: "SCHEDULER_DEPLOYMENT",
    title: "Managed scheduler and inactive reconciler deployment",
    owners: ["PLATFORM", "SRE", "SECURITY"],
    separation: "The deployment owner supplies infrastructure proof; security independently approves workload identity and secret scope.",
    actions: [
      "Deploy the inactive reconciler workload at the approved commit and artifact.",
      "Create a five-minute managed schedule with bounded timeout and single-concurrency or lease protection.",
      "Attach managed workload identity, readiness, missing-configuration, and failure-alert checks.",
      "Expose a query-free HTTPS deployment evidence endpoint with invalid-auth rejection.",
    ],
    acceptedEvidence: "Provider schedule, workload and managed-secret references, concurrency proof, deployed commit/artifact, deployment attestation, readiness, failure-alert, and invalid-auth evidence.",
    command: "npm run agent:scheduler:evidence:apply",
    downstream: "Operational release",
    prefixes: ["scheduler:"],
  },
  {
    id: "RECONCILER_WINDOWS",
    title: "Three consecutive reconciliation windows",
    owners: ["SRE", "RECONCILIATION_OWNER"],
    separation: "The operator runs the workload; the reconciliation owner reviews the resulting evidence.",
    actions: [
      "Observe at least three unique consecutive five-minute production-like windows.",
      "Confirm successful completion, fresh readiness and heartbeat, lease/concurrency safety, and invalid-auth rejection.",
      "Publish only value-free run and evidence references.",
    ],
    acceptedEvidence: "Unique run IDs, schedule/completion timestamps, completed status, evidence references, readiness hash, heartbeat validity, and invalid-auth proof.",
    command: "npm run agent:reconciler:evidence:apply",
    downstream: "Operational release",
    prefixes: ["scheduler:WINDOW", "scheduler:READINESS", "scheduler:HEARTBEAT"],
  },
  {
    id: "ALERT_LIFECYCLE",
    title: "Production-like alert lifecycle",
    owners: ["SRE", "SECURITY_INCIDENT", "ON_CALL_BACKUP"],
    separation: "The primary incident owner acknowledges; the named backup receives the independently tested escalation.",
    actions: [
      "Trigger a controlled failure through the real HTTPS alert transport.",
      "Acknowledge within the declared SLO and prove retry, dead-letter, recovery, and escalation.",
      "Rotate the alert secret and prove old-version rejection.",
    ],
    acceptedEvidence: "Transport and managed-secret references, delivery/request identity, acknowledgement identity/timestamp, retry, dead-letter, recovery, escalation, and rotation references.",
    command: "npm run agent:alert:evidence:apply",
    downstream: "Operational release",
    prefixes: ["alert:", "alerting:"],
  },
  {
    id: "CREDENTIAL_ROTATION",
    title: "Credential classification, rotation, and revocation",
    owners: ["SECURITY", "PLATFORM", "WORKLOAD_OWNERS"],
    separation: "A real security owner approves the ceremony; workload owners verify restart and new-version behavior.",
    actions: [
      "Classify all 15 credential classes as rotated/revoked, test-only, or confirmed absent.",
      "For present credentials, rotate in the managed secret store, restart dependants, verify the new version, revoke the old version, and prove rejection.",
      "Publish a release-bound security attestation without credential values.",
    ],
    acceptedEvidence: "Disposition, secret-manager reference, owner identity, ordered rotation/restart/verification/revocation timestamps, evidence reference, security approval, and authority attestation.",
    command: "npm run agent:credential-rotation:evidence:apply && npm run agent:credential-rotation:gate",
    downstream: "Operational release and Phase 2B entry",
    prefixes: [],
  },
  {
    id: "STATUTORY_AND_RELEASE_PREFLIGHT",
    title: "Statutory authority and global release preflight",
    owners: ["OHADA_DOMAIN_REVIEWER", "DATABASE_OWNER", "SECURITY", "RELEASE_MANAGER"],
    separation: "Qualified statutory approval must be independent of the code author; production target and secret readiness require their designated owners.",
    actions: [
      "Verify the statutory source artifact hash and obtain qualified expert approval.",
      "Provision the non-local migration target and production-purpose secret references.",
      "Resolve the global release evidence index without replacing external proof with local fixtures.",
    ],
    acceptedEvidence: "Verified source hash, signed expert approval, migration target evidence, managed-secret preflight, and release evidence index with zero blockers.",
    command: "npm run statutory:country-pack:gate && npm run prisma:migration:release:preflight && npm run release:secrets:preflight:release && npm run release:evidence:gate:release",
    downstream: "Phase 2B entry and enterprise gate 017",
    promotionChecks: ["GLOBAL_RELEASE_READY", "PRODUCTION_SECRETS_READY", "MIGRATION_TARGET_READY", "STATUTORY_AUTHORITY_READY"],
  },
  {
    id: "ENTERPRISE_REVIEW",
    title: "Independent enterprise release decision",
    owners: ["ENTERPRISE_RELEASE_AUTHORITY"],
    separation: "The reviewing authority must be independent from agent execution and cannot waive missing critical evidence silently.",
    actions: [
      "Review one immutable evidence bundle after all narrow gates pass.",
      "Record APPROVED_GO or REJECTED_NO_GO with release binding, conditions, and expiry.",
      "Keep activation as a separate protected ceremony.",
    ],
    acceptedEvidence: "Signed release-bound gate-017 decision, reviewer identity, timestamp, conditions, and immutable evidence-bundle reference.",
    command: "Rerun 017-aqstoqflow-enterprise-release-gate",
    downstream: "Phase 2B activation review",
    promotionChecks: ["ENTERPRISE_GATE_017_GO"],
  },
  {
    id: "PHASE_2B_PILOT",
    title: "Controlled Phase 2B pilot and exit certification",
    owners: ["PILOT", "PRODUCT", "SECURITY", "FINANCE_DOMAIN", "RELEASE"],
    separation: "Activation needs separate authorization; the four exit approvers must be distinct identities.",
    actions: [
      "After gate-017 GO, conduct the protected activation ceremony for allowlisted tenants and roles only.",
      "Observe a bounded pilot with monitoring, support, rollback exercise, and incident handling.",
      "Record safety counters and obtain four distinct pilot-exit approvals.",
    ],
    acceptedEvidence: "Activation decision, hashed tenant/role scopes, observation window, run counts, zero prohibited authority/tenant/secret violations, operations evidence, incidents, and four approvals.",
    command: "npm run agent:phase3:entry:report",
    downstream: "Phase 3 read-and-draft eligibility",
    phase: "phase3",
  },
])

function buildInterventionPlan({ operationalResult, credentialResult, phase2bResult, phase3Result, activation, phase3Authorized, now = new Date() }) {
  const promotionFailures = new Set(phase2bResult.checks.filter((check) => !check.passed).map((check) => check.id))
  const items = INTERVENTIONS.map((definition) => {
    let blockers = definition.prefixes
      ? operationalResult.blockers.filter((blocker) => definition.prefixes.some((prefix) => blocker.startsWith(prefix)))
      : []
    if (definition.id === "CREDENTIAL_ROTATION") blockers = credentialResult.blockers
    if (definition.promotionChecks) {
      blockers = [...blockers, ...definition.promotionChecks.filter((id) => promotionFailures.has(id))]
    }
    if (definition.phase === "phase3") blockers = phase3Result.blockers
    return {
      ...definition,
      status: blockers.length === 0 ? "EVIDENCE_READY" : "HUMAN_INTERVENTION_REQUIRED",
      blockerCount: blockers.length,
      blockers,
      interventionTreatment: [
        "Capture through the named authoritative collector or signed decision system.",
        "Bind to the exact release commit, artifact, manifest/evidence bundle, and environment.",
        "Reject secrets, synthetic identities, self-approval, stale timestamps, hash mismatch, or changed release identity.",
        "Rerun this intervention's narrow gate, then operational release, Phase 2B entry, and later Phase 3 entry as applicable.",
        "Recapture expired evidence; retain the superseded reference in the authoritative audit system.",
      ],
    }
  })
  const safeguardsIntact =
    activation?.requested === false &&
    activation?.authorized === false &&
    activation?.activatedAt === null &&
    phase3Authorized === false
  return {
    schemaVersion: 1,
    planId: "stoquify-agent-runtime-human-intervention-plan-2026-07-25",
    generatedAt: now.toISOString(),
    status: items.every((item) => item.status === "EVIDENCE_READY")
      ? "READY_FOR_SEPARATE_ACTIVATION_REVIEW"
      : "EXTERNAL_AND_HUMAN_INTERVENTION_REQUIRED",
    safeguardsIntact,
    activationAuthorizedByPlan: false,
    phase3AuthorizedByPlan: false,
    summary: {
      interventions: items.length,
      evidenceReady: items.filter((item) => item.status === "EVIDENCE_READY").length,
      humanInterventionRequired: items.filter((item) => item.status === "HUMAN_INTERVENTION_REQUIRED").length,
      operationalBlockers: operationalResult.blockerCount,
      credentialBlockers: credentialResult.blockerCount,
      phase2bBlockers: phase2bResult.summary.blockers,
      phase3Blockers: phase3Result.summary.blockers,
    },
    items,
    subsequentInterventionPolicy: {
      appendOnlyAuthorityRecord: true,
      releaseBindingRequired: true,
      narrowGateBeforeComposedGate: true,
      staleEvidenceRejected: true,
      syntheticEvidenceRejected: true,
      secretValuesForbidden: true,
      activationRemainsSeparate: true,
    },
  }
}

function renderMarkdown(plan) {
  const lines = [
    "# Stoquify Agent Runtime Human Intervention Plan",
    "",
    `**Generated:** ${plan.generatedAt}<br>`,
    `**Status:** \`${plan.status}\`<br>`,
    `**Safeguards intact:** ${plan.safeguardsIntact ? "Yes" : "No"}<br>`,
    "**Activation authorized by this plan:** No<br>",
    "**Phase 3 authorized by this plan:** No",
    "",
    "## Current Position",
    "",
    `- ${plan.summary.evidenceReady}/${plan.summary.interventions} intervention groups have sufficient evidence.`,
    `- Operational release blockers: ${plan.summary.operationalBlockers}.`,
    `- Credential blockers: ${plan.summary.credentialBlockers}.`,
    `- Phase 2B entry blockers: ${plan.summary.phase2bBlockers}.`,
    `- Phase 3 entry blockers: ${plan.summary.phase3Blockers}.`,
    "",
    "Repository controls can validate evidence, but they cannot truthfully create real approvals, people, infrastructure events, credential ceremonies, or pilot outcomes.",
    "",
  ]
  plan.items.forEach((item, index) => {
    lines.push(
      `## ${index + 1}. ${item.title}`,
      "",
      `**Status:** \`${item.status}\`  `,
      `**Accountable owners:** ${item.owners.join(", ")}  `,
      `**Segregation:** ${item.separation}  `,
      `**Downstream gate:** ${item.downstream}`,
      "",
      "### Human actions",
      "",
      ...item.actions.map((action) => `- ${action}`),
      "",
      "### Accepted evidence",
      "",
      item.acceptedEvidence,
      "",
      "### Evidence application",
      "",
      `Run \`${item.command}\` only after the real-world action and authoritative evidence exist.`,
      "",
      "### Subsequent interventions",
      "",
      ...item.interventionTreatment.map((rule) => `- ${rule}`),
      "",
      `### Current blockers (${item.blockerCount})`,
      "",
      ...(item.blockers.length > 0
        ? item.blockers.map((blocker) => `- \`${blocker}\``)
        : ["- None. Evidence is ready for the next independent review; no authority is granted automatically."]),
      "",
    )
  })
  lines.push(
    "## Gate-Lifting Sequence",
    "",
    "1. Capture immutable release and CI evidence.",
    "2. Capture governance approvals and six-role owner coverage.",
    "3. Capture scheduler deployment, three reconciler windows, and the alert lifecycle.",
    "4. Complete credential rotation and statutory/release preflights.",
    "5. Run `npm run agent:credential-rotation:gate` and `npm run agent:operational-release:gate`.",
    "6. Run `npm run agent:phase2b:entry:gate`, then obtain an independent gate-017 decision.",
    "7. Conduct a separately authorized Phase 2B pilot.",
    "8. Capture pilot exit evidence and run `npm run agent:phase3:entry:gate`.",
    "",
    "At every stage, activation and Phase 3 authority remain separate human decisions.",
    "",
  )
  return lines.join("\n")
}

function sha256Prefixed(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`
}

function main() {
  const root = process.cwd()
  const operationalPath = resolve(root, PATHS.operational)
  const credentialPath = resolve(root, PATHS.credentials)
  const operationalRegister = JSON.parse(readFileSync(operationalPath, "utf8"))
  const credentialBuffer = readFileSync(credentialPath)
  const credentialRegister = JSON.parse(credentialBuffer.toString("utf8"))
  const promotionInput = collectInput(root)
  const plan = buildInterventionPlan({
    operationalResult: evaluateOperationalReleaseRegister(operationalRegister, {
      credentialRegister,
      credentialRegisterSha256: sha256Prefixed(credentialBuffer),
    }),
    credentialResult: evaluateRotationRegister(credentialRegister),
    phase2bResult: evaluatePromotion(promotionInput, "phase2b"),
    phase3Result: evaluatePromotion(promotionInput, "phase3"),
    activation: operationalRegister.activation,
    phase3Authorized: promotionInput.promotionLedger.phase3Authorized,
  })
  const jsonOut = resolve(root, PATHS.jsonOut)
  const markdownOut = resolve(root, PATHS.markdownOut)
  mkdirSync(dirname(jsonOut), { recursive: true })
  mkdirSync(dirname(markdownOut), { recursive: true })
  writeFileSync(jsonOut, `${JSON.stringify(plan, null, 2)}\n`, "utf8")
  writeFileSync(markdownOut, renderMarkdown(plan), "utf8")
  process.stdout.write(`${JSON.stringify({
    status: plan.status,
    evidenceReady: plan.summary.evidenceReady,
    humanInterventionRequired: plan.summary.humanInterventionRequired,
    safeguardsIntact: plan.safeguardsIntact,
    activationAuthorizedByPlan: false,
    phase3AuthorizedByPlan: false,
    report: PATHS.markdownOut,
  }, null, 2)}\n`)
  if (!plan.safeguardsIntact) process.exitCode = 1
}

if (require.main === module) main()

module.exports = { INTERVENTIONS, PATHS, buildInterventionPlan, renderMarkdown }
