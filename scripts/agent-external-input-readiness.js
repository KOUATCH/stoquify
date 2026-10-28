#!/usr/bin/env node

const { mkdirSync, readFileSync, writeFileSync } = require("node:fs")
const { dirname, resolve } = require("node:path")

const DEFAULT_INPUT =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_EXTERNAL_INPUTS_2026-07-25.json"
const DEFAULT_JSON_OUT =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_EXTERNAL_INPUT_READINESS_2026-07-25.json"
const DEFAULT_MD_OUT =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_EXTERNAL_INPUT_READINESS_2026-07-25.md"

const REQUIRED_OWNER_ROLES = [
  "ROLLOUT",
  "ROLLBACK",
  "SUPPORT",
  "PILOT",
  "SECURITY_INCIDENT",
  "ON_CALL_BACKUP",
]
const ENDPOINTS = Object.freeze({
  ci: {
    owner: "ENGINEERING_RELEASE",
    urlEnv: "STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_URL",
    secretEnv: "STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_SECRET",
    command: "npm run agent:ci-release:evidence:apply",
  },
  governance: {
    owner: "PRODUCT_AND_SECURITY",
    urlEnv: "STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_URL",
    secretEnv: "STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_SECRET",
    command: "npm run agent:governance:evidence:apply",
  },
  scheduler: {
    owner: "PLATFORM_SRE",
    urlEnv: "STOQUIFY_AGENT_SCHEDULER_EVIDENCE_URL",
    secretEnv: "STOQUIFY_AGENT_SCHEDULER_EVIDENCE_SECRET",
    command: "npm run agent:scheduler:evidence:apply",
  },
  reconciler: {
    owner: "PLATFORM_SRE",
    urlEnv: "STOQUIFY_AGENT_RECONCILER_BASE_URL",
    secretEnv: "STOQUIFY_AGENT_RECONCILER_SECRET",
    command: "npm run agent:reconciler:evidence:apply",
  },
  alert: {
    owner: "SECURITY_INCIDENT_AND_SRE",
    urlEnv: "STOQUIFY_AGENT_ALERT_EVIDENCE_URL",
    secretEnv: "STOQUIFY_AGENT_ALERT_EVIDENCE_SECRET",
    command: "npm run agent:alert:evidence:apply",
  },
  credential: {
    owner: "SECURITY",
    urlEnv: "STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_URL",
    secretEnv: "STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_SECRET",
    command: "npm run agent:credential-rotation:evidence:apply",
  },
})
const FORBIDDEN_KEYS = new Set([
  "secret",
  "secretvalue",
  "clientsecret",
  "apikey",
  "credentialvalue",
  "password",
  "passwordvalue",
  "token",
  "tokenvalue",
  "accesstoken",
  "refreshtoken",
  "authorizationheader",
  "privatekey",
  "databaseurl",
  "connectionstring",
  "rawenvironment",
  "environmentsnapshot",
])
const COMMIT_PATTERN = /^[a-f0-9]{40}$/i
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/i
const REFERENCE_PATTERN = /^[a-z][a-z0-9+.-]*:\/\/[a-z0-9][a-z0-9._~:/-]*$/i
const IDENTITY_PATTERN = /^(?:directory|identity):\/\/[a-z0-9][a-z0-9._~:/-]*$/i
const SECRET_REFERENCE_PATTERN = /^(?:secret-manager|vault|keyvault):\/\/[a-z0-9][a-z0-9._~:/-]*$/i
const SYNTHETIC_IDENTITY_PATTERN = /(^|[:/._-])(e2e|test|seed|fixture|demo)($|[:/._-])/i

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    mode: "report",
    input: DEFAULT_INPUT,
    jsonOut: DEFAULT_JSON_OUT,
    markdownOut: DEFAULT_MD_OUT,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--mode") options.mode = argv[++index]
    else if (value === "--input") options.input = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else if (value === "--out") options.markdownOut = argv[++index]
    else throw new Error(`Unknown argument: ${value}`)
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Mode must be report or fail.")
  }
  return options
}

function evaluateExternalInputs(input, { now = new Date() } = {}) {
  assertShape(input)
  const checks = []
  const add = (id, title, owner, blockers, nextCommand) => {
    checks.push({
      id,
      title,
      owner,
      ready: blockers.length === 0,
      blockers,
      nextCommand,
    })
  }

  add(
    "RELEASE_IDENTITY",
    "Deployment target and immutable artifact details",
    "ENGINEERING_RELEASE",
    evaluateRelease(input.release),
    ENDPOINTS.ci.command,
  )
  add(
    "PRODUCT_SECURITY_APPROVALS",
    "Product and Security approver identities",
    "PRODUCT_AND_SECURITY",
    evaluateApprovers(input.approvers, now),
    ENDPOINTS.governance.command,
  )
  add(
    "OPERATIONAL_OWNERS",
    "Six primary and backup operational-owner assignments",
    "RELEASE_MANAGER",
    evaluateOwners(input.owners, now),
    ENDPOINTS.governance.command,
  )
  for (const [name, definition] of Object.entries(ENDPOINTS)) {
    add(
      `ENDPOINT_${name.toUpperCase()}`,
      `${name} evidence HTTPS endpoint and managed collector credential`,
      definition.owner,
      evaluateEndpoint(input.evidenceEndpoints[name], name),
      definition.command,
    )
  }
  add(
    "MANAGED_CREDENTIALS",
    "Managed workload and collector identities",
    "SECURITY_AND_PLATFORM",
    evaluateManagedCredentials(input.managedCredentials),
    "npm run agent:credential-rotation:evidence:apply",
  )
  add(
    "STATUTORY_APPROVAL",
    "Qualified statutory reviewer approval",
    "OHADA_DOMAIN_REVIEWER",
    evaluateStatutory(input.statutoryApproval, now),
    "npm run statutory:country-pack:gate",
  )
  add(
    "PHASE_2B_PILOT_AUTHORITY",
    "Phase 2B pilot cohort and activation authority",
    "PILOT_AND_RELEASE_AUTHORITY",
    evaluatePilot(input.pilot, now),
    "npm run agent:phase2b:entry:gate",
  )
  add(
    "SAFETY_BOUNDARY",
    "Inactive pre-promotion safety boundary",
    "ENTERPRISE_RELEASE_AUTHORITY",
    evaluateSafety(input.safety),
    "npm run agent:runtime:gates",
  )

  const blockers = checks.flatMap((check) =>
    check.blockers.map((code) => `${check.id}:${code}`),
  )
  return {
    schemaVersion: 1,
    reportId: "stoquify-agent-runtime-external-input-readiness-2026-07-25",
    evaluatedAt: now.toISOString(),
    status: blockers.length === 0 ? "READY_TO_CAPTURE_AUTHORITATIVE_EVIDENCE" : "EXTERNAL_INPUTS_REQUIRED",
    ready: blockers.length === 0,
    activationAuthorizedByGate: false,
    phase3AuthorizedByGate: false,
    summary: {
      checks: checks.length,
      passed: checks.filter((check) => check.ready).length,
      blockers: blockers.length,
      secretValuesPrinted: false,
    },
    checks,
    blockers,
    endpointBindings: Object.fromEntries(
      Object.entries(ENDPOINTS).map(([name, definition]) => [
        name,
        {
          urlEnvironmentVariable: definition.urlEnv,
          secretEnvironmentVariable: definition.secretEnv,
          managedSecretReference:
            input.evidenceEndpoints[name]?.managedSecretReference || null,
          collectorCommand: definition.command,
        },
      ]),
    ),
    handling: {
      manifestMutated: false,
      operationalRegisterMutated: false,
      credentialsRotated: false,
      approvalsCreated: false,
      ownersCreated: false,
      activationAttempted: false,
      secretValuesAccepted: false,
    },
  }
}

function assertShape(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("External input manifest must be an object.")
  }
  assertNoForbiddenKeys(input)
  if (input.schemaVersion !== 1) {
    throw new Error("External input manifest schemaVersion must be 1.")
  }
  for (const field of [
    "release",
    "approvers",
    "evidenceEndpoints",
    "managedCredentials",
    "statutoryApproval",
    "pilot",
    "safety",
  ]) {
    if (!input[field] || typeof input[field] !== "object" || Array.isArray(input[field])) {
      throw new Error(`External input manifest ${field} must be an object.`)
    }
  }
  if (!Array.isArray(input.owners)) {
    throw new Error("External input manifest owners must be an array.")
  }
}

function assertNoForbiddenKeys(value) {
  if (Array.isArray(value)) return value.forEach(assertNoForbiddenKeys)
  if (!value || typeof value !== "object") return
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error(`External input manifest contains forbidden secret-bearing field: ${key}`)
    }
    assertNoForbiddenKeys(child)
  }
}

function evaluateRelease(release) {
  const blockers = []
  requireText(release.packageId, "PACKAGE_ID_MISSING", blockers)
  requireText(release.releaseVersion, "RELEASE_VERSION_MISSING", blockers)
  if (!COMMIT_PATTERN.test(release.commitSha || "")) blockers.push("COMMIT_SHA_INVALID")
  for (const field of ["artifactDigest", "manifestHash", "evidenceBundleHash", "browserReportHash"]) {
    if (!HASH_PATTERN.test(release[field] || "")) blockers.push(`${constant(field)}_INVALID`)
  }
  for (const field of ["artifactReference", "deploymentReference", "pilotAllowlistReference", "roleAllowlistReference"]) {
    if (!isReference(release[field])) blockers.push(`${constant(field)}_INVALID`)
  }
  return blockers
}

function evaluateApprovers(approvers, now) {
  const blockers = []
  const entries = ["product", "security"].map((role) => [role, approvers[role]])
  for (const [role, approval] of entries) {
    if (!approval || typeof approval !== "object") {
      blockers.push(`${role.toUpperCase()}_APPROVAL_MISSING`)
      continue
    }
    if (approval.decision !== "APPROVED") blockers.push(`${role.toUpperCase()}_NOT_APPROVED`)
    if (!isRealIdentity(approval.actorDirectoryId)) blockers.push(`${role.toUpperCase()}_IDENTITY_INVALID`)
    if (!isReference(approval.approvalReference)) blockers.push(`${role.toUpperCase()}_REFERENCE_INVALID`)
    requirePastTimestamp(approval.decidedAt, now, `${role.toUpperCase()}_DECIDED_AT_INVALID`, blockers)
    requireFutureTimestamp(approval.expiresAt, now, `${role.toUpperCase()}_EXPIRES_AT_INVALID`, blockers)
  }
  const product = approvers.product?.actorDirectoryId
  const security = approvers.security?.actorDirectoryId
  if (isRealIdentity(product) && product === security) blockers.push("APPROVER_SEGREGATION_REQUIRED")
  return blockers
}

function evaluateOwners(owners, now) {
  const blockers = []
  const seen = new Set()
  for (const role of REQUIRED_OWNER_ROLES) {
    const matches = owners.filter((owner) => owner.role === role)
    if (matches.length !== 1) {
      blockers.push(`${role}_ASSIGNMENT_COUNT_INVALID`)
      continue
    }
    const owner = matches[0]
    seen.add(role)
    if (!isRealIdentity(owner.primaryDirectoryId)) blockers.push(`${role}_PRIMARY_INVALID`)
    if (!isRealIdentity(owner.backupDirectoryId)) blockers.push(`${role}_BACKUP_INVALID`)
    if (owner.primaryDirectoryId && owner.primaryDirectoryId === owner.backupDirectoryId) {
      blockers.push(`${role}_PRIMARY_BACKUP_MUST_DIFFER`)
    }
    requireText(owner.acceptedRunbookVersion, `${role}_RUNBOOK_NOT_ACCEPTED`, blockers)
    requirePastTimestamp(owner.acceptedAt, now, `${role}_ACCEPTED_AT_INVALID`, blockers)
    requirePastOrCurrentTimestamp(owner.coverageStartsAt, now, `${role}_COVERAGE_START_INVALID`, blockers)
    requireFutureTimestamp(owner.coverageEndsAt, now, `${role}_COVERAGE_END_INVALID`, blockers)
    if (!isReference(owner.escalationReference)) blockers.push(`${role}_ESCALATION_REFERENCE_INVALID`)
  }
  owners
    .filter((owner) => !REQUIRED_OWNER_ROLES.includes(owner.role))
    .forEach((owner) => blockers.push(`UNEXPECTED_ROLE_${constant(owner.role || "missing")}`))
  if (seen.size !== REQUIRED_OWNER_ROLES.length) blockers.push("OWNER_ROLE_COVERAGE_INCOMPLETE")
  return blockers
}

function evaluateEndpoint(endpoint, name) {
  const blockers = []
  if (!endpoint || typeof endpoint !== "object") return ["ENDPOINT_CONFIGURATION_MISSING"]
  if (!isSecureUrl(endpoint.url)) blockers.push("HTTPS_QUERY_FREE_URL_REQUIRED")
  if (!SECRET_REFERENCE_PATTERN.test(endpoint.managedSecretReference || "")) {
    blockers.push("MANAGED_SECRET_REFERENCE_INVALID")
  }
  if (!isReference(endpoint.sourceSystemReference)) blockers.push("SOURCE_SYSTEM_REFERENCE_INVALID")

  return blockers
}

function evaluateManagedCredentials(credentials) {
  const blockers = []
  for (const field of [
    "workloadIdentityReference",
    "collectorIdentityReference",
    "rotationAuthorityReference",
    "credentialInventoryReference",
  ]) {
    if (!isReference(credentials[field])) blockers.push(`${constant(field)}_INVALID`)
  }
  if (!SECRET_REFERENCE_PATTERN.test(credentials.secretManagerNamespaceReference || "")) {
    blockers.push("SECRET_MANAGER_NAMESPACE_REFERENCE_INVALID")
  }
  return blockers
}

function evaluateStatutory(approval, now) {
  const blockers = []
  if (approval.decision !== "APPROVED") blockers.push("DECISION_NOT_APPROVED")
  if (!isRealIdentity(approval.reviewerDirectoryId)) blockers.push("REVIEWER_IDENTITY_INVALID")
  if (!isReference(approval.qualificationReference)) blockers.push("QUALIFICATION_REFERENCE_INVALID")
  if (!HASH_PATTERN.test(approval.sourceArtifactHash || "")) blockers.push("SOURCE_ARTIFACT_HASH_INVALID")
  if (!isReference(approval.approvalArtifactReference)) blockers.push("APPROVAL_ARTIFACT_REFERENCE_INVALID")
  if (!HASH_PATTERN.test(approval.approvalArtifactHash || "")) blockers.push("APPROVAL_ARTIFACT_HASH_INVALID")
  requirePastTimestamp(approval.reviewedAt, now, "REVIEWED_AT_INVALID", blockers)
  return blockers
}

function evaluatePilot(pilot, now) {
  const blockers = []
  for (const field of ["cohortReference", "supportCoverageReference", "rollbackPlanReference", "activationDecisionReference"]) {
    if (!isReference(pilot[field])) blockers.push(`${constant(field)}_INVALID`)
  }
  for (const field of ["tenantScopeHash", "roleScopeHash"]) {
    if (!HASH_PATTERN.test(pilot[field] || "")) blockers.push(`${constant(field)}_INVALID`)
  }
  if (!isRealIdentity(pilot.activationAuthorityDirectoryId)) blockers.push("ACTIVATION_AUTHORITY_IDENTITY_INVALID")
  if (pilot.activationDecision !== "APPROVED") blockers.push("ACTIVATION_DECISION_NOT_APPROVED")
  requirePastTimestamp(pilot.activationDecidedAt, now, "ACTIVATION_DECIDED_AT_INVALID", blockers)
  return blockers
}

function evaluateSafety(safety) {
  const blockers = []
  if (safety.activationRequested !== false) blockers.push("ACTIVATION_REQUESTED_MUST_REMAIN_FALSE")
  if (safety.activationAuthorized !== false) blockers.push("ACTIVATION_AUTHORIZED_MUST_REMAIN_FALSE")
  if (safety.activatedAt !== null) blockers.push("ACTIVATED_AT_MUST_REMAIN_NULL")
  if (safety.phase3Authorized !== false) blockers.push("PHASE3_AUTHORIZED_MUST_REMAIN_FALSE")
  if (safety.secretValuesIncluded !== false) blockers.push("SECRET_VALUES_MUST_NOT_BE_INCLUDED")
  return blockers
}

function isRealIdentity(value) {
  return IDENTITY_PATTERN.test(value || "") && !SYNTHETIC_IDENTITY_PATTERN.test(value)
}

function isReference(value) {
  return REFERENCE_PATTERN.test(value || "")
}

function isSecureUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash
  } catch {
    return false
  }
}

function requireText(value, code, blockers) {
  if (typeof value !== "string" || value.trim().length === 0) blockers.push(code)
}

function requirePastTimestamp(value, now, code, blockers) {
  const timestamp = Date.parse(value || "")
  if (!Number.isFinite(timestamp) || timestamp > now.getTime()) blockers.push(code)
}

function requirePastOrCurrentTimestamp(value, now, code, blockers) {
  requirePastTimestamp(value, now, code, blockers)
}

function requireFutureTimestamp(value, now, code, blockers) {
  const timestamp = Date.parse(value || "")
  if (!Number.isFinite(timestamp) || timestamp <= now.getTime()) blockers.push(code)
}

function constant(value) {
  return String(value).replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()
}

function renderMarkdown(input, result) {
  const lines = [
    "# Stoquify Agent Runtime External Input Readiness",
    "",
    `**Evaluated:** ${result.evaluatedAt}<br>`,
    `**Environment:** \`${input.environment}\`<br>`,
    `**Status:** \`${result.status}\`<br>`,
    `**Checks passed:** ${result.summary.passed}/${result.summary.checks}<br>`,
    `**Blockers:** ${result.summary.blockers}<br>`,
    "**Activation authorized by this gate:** No<br>",
    "**Phase 3 authorized by this gate:** No",
    "",
    "## Operating Boundary",
    "",
    "This generator validates external-input references and produces a deterministic handoff. It does not create approvals or identities, read secret values, rotate credentials, deploy workloads, mutate release registers, activate an agent, or grant Phase 3 authority.",
    "",
    "## Readiness",
    "",
    "| Input group | Owner | Status | Blockers | Next command |",
    "|---|---|---:|---:|---|",
    ...result.checks.map(
      (check) =>
        `| ${check.title} | ${check.owner} | ${check.ready ? "READY" : "BLOCKED"} | ${check.blockers.length} | \`${check.nextCommand}\` |`,
    ),
    "",
    "## Collector Bindings",
    "",
    "Secret environment variables must be injected by the deployment platform from the listed managed-secret references. Never place secret values in this manifest.",
    "",
    "| Channel | URL variable | Secret variable | Managed reference | Collector |",
    "|---|---|---|---|---|",
    ...Object.entries(result.endpointBindings).map(
      ([name, binding]) =>
        `| ${name} | \`${binding.urlEnvironmentVariable}\` | \`${binding.secretEnvironmentVariable}\` | ${binding.managedSecretReference || "unresolved"} | \`${binding.collectorCommand}\` |`,
    ),
    "",
    "## Required Sequence",
    "",
    "1. Complete the immutable release identity and deploy the inactive artifact.",
    "2. Record distinct Product and Security approvals and all six owner assignments in the authoritative governance system.",
    "3. Provision six query-free HTTPS evidence channels and bind each collector credential through the secret manager.",
    "4. Apply CI evidence first, then governance, scheduler, reconciler, alert, and credential evidence.",
    "5. Complete statutory expert approval and rerun release preflights.",
    "6. Rerun operational release, Phase 2B entry, and enterprise gate 017.",
    "7. Only after a separate GO, perform the controlled pilot activation ceremony.",
    "",
    "## Current Blockers",
    "",
    ...(result.blockers.length > 0
      ? result.blockers.map((blocker) => `- \`${blocker}\``)
      : ["- None. Inputs are ready for authoritative evidence capture; no activation is granted."]),
    "",
    "## Subsequent Intervention Treatment",
    "",
    "- A changed commit, artifact, manifest, evidence bundle, or environment invalidates dependent evidence.",
    "- Expired approvals or owner coverage must be recaptured from the authoritative system.",
    "- Rotated collector secrets require workload restart, new-version verification, old-version revocation, and rejection proof.",
    "- Evidence is applied only through its narrow collector before composed gates are rerun.",
    "- Superseded references remain in the authoritative audit system; release registers contain only the current validated binding.",
    "",
  ]
  return lines.join("\n")
}

function main() {
  const options = parseArgs()
  const root = process.cwd()
  const input = JSON.parse(readFileSync(resolve(root, options.input), "utf8"))
  const result = evaluateExternalInputs(input)
  const jsonOut = resolve(root, options.jsonOut)
  const markdownOut = resolve(root, options.markdownOut)
  mkdirSync(dirname(jsonOut), { recursive: true })
  mkdirSync(dirname(markdownOut), { recursive: true })
  writeFileSync(jsonOut, `${JSON.stringify(result, null, 2)}\n`, "utf8")
  writeFileSync(markdownOut, renderMarkdown(input, result), "utf8")
  process.stdout.write(
    `${JSON.stringify({
      status: result.status,
      ready: result.ready,
      checks: result.summary.checks,
      passed: result.summary.passed,
      blockers: result.summary.blockers,
      activationAuthorizedByGate: false,
      phase3AuthorizedByGate: false,
      secretValuesPrinted: false,
      report: options.markdownOut,
    }, null, 2)}\n`,
  )
  if (options.mode === "fail" && !result.ready) process.exitCode = 1
}

if (require.main === module) main()

module.exports = {
  ENDPOINTS,
  REQUIRED_OWNER_ROLES,
  evaluateExternalInputs,
  parseArgs,
  renderMarkdown,
}
