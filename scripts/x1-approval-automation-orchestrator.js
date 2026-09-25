#!/usr/bin/env node

const { createHash, randomUUID } = require("node:crypto")
const { readFileSync, writeFileSync } = require("node:fs")
const { pathToFileURL } = require("node:url")
const path = require("node:path")

const { loadEnvConfig } = require("@next/env")
const { PrismaClient, Prisma } = require("@prisma/client")

const ROOT = process.cwd()
const relative = (value) => path.join(ROOT, value)
const CONFIG_PATH = relative("docs/blockers-docs/X1_APPROVAL_AUTOMATION_CONFIGURATION_2026-08-31.json")
const CONTRACT_MANIFEST_PATH = relative("docs/X1/X1_CONTRACT_ARTIFACT_MANIFEST_2026-09-05.json")
const POLICY_HASH_MANIFEST_PATH = relative("docs/blockers-docs/X1_POLICY_DOCUMENT_HASH_MANIFEST_2026-08-31.json")
const DELEGATION_HASH_MANIFEST_PATH = relative("docs/blockers-docs/STOQ-X1-POL-004_ARTIFACT_HASH_MANIFEST_2026-08-31.json")
const OUTPUT_JSON_PATH = relative("what-next/evidence/finance-x1/x1-approval-automation-readiness-2026-09-05.json")
const OUTPUT_MD_PATH = relative("what-next/evidence/finance-x1/X1_APPROVAL_AUTOMATION_READINESS_2026-09-05.md")
const DRAFT_RECORDS_PATH = relative("what-next/evidence/finance-x1/x1-approval-draft-records-2026-09-05.json")
const FINAL_MANIFEST_PATH = relative("what-next/evidence/finance-x1/x1-approval-final-manifest-2026-09-05.json")

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])
const DISPOSABLE_DATABASE_PATTERN = /(?:dev|test|local|reconcile|referral|replay|disposable)/i
const X1_AGENT_KEY = "x1-finance-table-approval-automation"
const REQUIRED_ROLE_CODES = [
  "product_approver",
  "security_owner",
  "sre_owner",
  "owner",
  "qa_owner",
  "external_accountant",
]
const REQUIRED_CONFIG_PATHS = [
  "approvalPlatform",
  "approvalWorkspaceId",
  "approvalTemplateId",
  "providerAdapterModule",
  "identityProvider",
  "governanceRegisterUri",
  "secretManagerReference",
  "callbackUrl",
  "evidenceStoreUri",
  "retentionPolicyReference",
  "servicePrincipals.approvalOrchestration",
  "servicePrincipals.evidenceCapture",
  "servicePrincipals.independentVerifier",
  "servicePrincipals.implementationCi",
  "signedDelegation.approvalRecordId",
  "signedDelegation.signatureReference",
  "signedDelegation.signedArtifactUri",
  "signedDelegation.signedArtifactSha256",
  "signedDelegation.signedAt",
  "signedDelegation.expiresAt",
  "signedDelegation.signingModel",
]

function parseMode(argv) {
  const index = argv.indexOf("--mode")
  const mode = index >= 0 ? argv[index + 1] : "report"
  if (!["report", "create", "sync"].includes(mode)) throw new Error("Mode must be report, create or sync.")
  return mode
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"))
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex")
}

function nestedValue(value, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => current?.[key], value)
}

function isPresent(value) {
  return typeof value === "string" ? value.trim().length > 0 : value != null
}

function disposableDatabaseTarget() {
  if (process.env.NODE_ENV === "production") return { safe: false, reason: "NODE_ENV is production." }
  const configured = process.env.DATABASE_URL?.trim()
  if (!configured) return { safe: false, reason: "DATABASE_URL is not configured." }
  const expanded = configured.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, key) => process.env[key] ?? "")
  let parsed
  try {
    parsed = new URL(expanded)
  } catch {
    return { safe: false, reason: "DATABASE_URL is invalid." }
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""))
  if (!LOCAL_HOSTS.has(parsed.hostname.toLowerCase()) || !DISPOSABLE_DATABASE_PATTERN.test(databaseName)) {
    return { safe: false, reason: "A named local disposable database is required.", databaseName }
  }
  process.env.DATABASE_URL = expanded
  return { safe: true, databaseName }
}

function displayName(user) {
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
}

async function retrieveDatabaseContext(config) {
  const target = disposableDatabaseTarget()
  if (!target.safe) return { status: "BLOCKED", target, organizations: [], roles: [] }
  const prisma = new PrismaClient()
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY")
      const organizations = await tx.organization.findMany({
        where: { id: { in: [config.organizationId, config.foreignProbeOrganizationId] } },
        select: {
          id: true,
          name: true,
          tradeName: true,
          countryCode: true,
          currency: true,
          timezone: true,
          defaultLocale: true,
          requestedModules: true,
          isActive: true,
        },
        orderBy: { id: "asc" },
      })
      const roles = await tx.role.findMany({
        where: { organizationId: config.organizationId, code: { in: REQUIRED_ROLE_CODES } },
        select: {
          id: true,
          code: true,
          nameEn: true,
          nameFr: true,
          description: true,
          permissions: true,
          users: {
            where: { isActive: true, isVerified: true, emailVerified: true },
            select: { id: true, name: true, firstName: true, lastName: true, email: true },
            orderBy: { id: "asc" },
          },
        },
        orderBy: { code: "asc" },
      })
      const existingX1ActivationPackages = await tx.agentActivationPackage.count({
        where: { organizationId: config.organizationId, agentKey: X1_AGENT_KEY },
      })
      return { organizations, roles, existingX1ActivationPackages }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return {
      status: "RETRIEVED_READ_ONLY",
      target,
      ...result,
      roles: result.roles.map((role) => ({
        ...role,
        users: role.users.map((user) => ({ id: user.id, name: displayName(user), accountIdentifier: user.email })),
      })),
    }
  } finally {
    await prisma.$disconnect()
  }
}

function verifyManifestFiles(manifest, predicate = () => true) {
  return (manifest.files ?? []).filter(predicate).map((item) => {
    const filePath = relative(item.path)
    const actualSha256 = sha256File(filePath)
    return { artifact: item.path, expectedSha256: item.sha256, actualSha256, valid: actualSha256 === item.sha256 }
  })
}

function verifyArtifacts() {
  const contractManifest = readJson(CONTRACT_MANIFEST_PATH)
  const policyManifest = readJson(POLICY_HASH_MANIFEST_PATH)
  const delegationManifest = readJson(DELEGATION_HASH_MANIFEST_PATH)
  const checks = [
    ...verifyManifestFiles(contractManifest),
    ...verifyManifestFiles(policyManifest, (item) => ["unsigned-policy-docx", "x1-contract-manifest"].includes(item.artifactType)),
    ...verifyManifestFiles(delegationManifest),
  ]
  return {
    contractArtifactUri: contractManifest.artifactUri,
    contractManifestSha256: sha256File(CONTRACT_MANIFEST_PATH),
    checks,
    valid: checks.length > 0 && checks.every((check) => check.valid),
    policyDocuments: (policyManifest.files ?? []).filter((item) => item.artifactType === "unsigned-policy-docx"),
    delegationArtifacts: delegationManifest.files ?? [],
  }
}

function integrationBlockers(config, artifacts, database) {
  const blockers = REQUIRED_CONFIG_PATHS.filter((field) => !isPresent(nestedValue(config, field))).map((field) => ({
    code: `MISSING_${field.replace(/\./g, "_").toUpperCase()}`,
    description: `${field} is required.`,
    source: "X1 approval automation configuration",
  }))
  if (config.signedDelegation?.status !== "APPROVED") blockers.push({
    code: "DELEGATION_POLICY_NOT_APPROVED",
    description: "STOQ-X1-POL-004 is not signed and approved in an authoritative system.",
    source: "Approval/e-signature system",
  })
  if (!artifacts.valid) blockers.push({
    code: "ARTIFACT_HASH_MISMATCH",
    description: "A contract or policy artifact failed SHA-256 validation.",
    source: "Repository manifests",
  })
  if (database.status !== "RETRIEVED_READ_ONLY") blockers.push({
    code: "DATABASE_CONTEXT_UNAVAILABLE",
    description: database.target.reason,
    source: "Local disposable database",
  })
  if ((database.existingX1ActivationPackages ?? 0) > 0) blockers.push({
    code: "EXISTING_X1_ACTIVATION_REQUIRES_RECONCILIATION",
    description: "An existing X1 activation package must be reconciled before another is created.",
    source: "AgentActivationPackage register",
  })
  const principals = Object.values(config.servicePrincipals ?? {}).filter(isPresent)
  if (new Set(principals).size !== principals.length) blockers.push({
    code: "SERVICE_PRINCIPAL_SEPARATION_FAILED",
    description: "Orchestration, capture, verification and implementation identities must be distinct.",
    source: "Identity provider",
  })
  return blockers
}

function roleCandidate(database, roleCode) {
  const role = (database.roles ?? []).find((entry) => entry.code === roleCode)
  const user = role?.users?.[0]
  return role ? {
    roleId: role.id,
    roleCode: role.code,
    roleNameEn: role.nameEn,
    roleNameFr: role.nameFr,
    permissionCount: role.permissions.length,
    userId: user?.id ?? null,
    name: user?.name ?? null,
    accountIdentifier: user?.accountIdentifier ?? null,
    technicalIdentityOnly: true,
  } : null
}

function policyArtifact(artifacts, policyId) {
  const item = artifacts.policyDocuments.find((entry) => entry.path.includes(policyId))
  if (!item) throw new Error(`Policy artifact is missing for ${policyId}.`)
  return item
}

function createApprovalRequests(config, artifacts, database) {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + Number(config.proposedValidityDays || 30) * 86400000)
  const common = {
    correlationId: randomUUID(),
    organizationId: config.organizationId,
    foreignProbeOrganizationId: config.foreignProbeOrganizationId,
    environment: config.environment,
    contractArtifactUri: artifacts.contractArtifactUri,
    contractManifestSha256: artifacts.contractManifestSha256,
    proposedEffectiveAt: now.toISOString(),
    proposedExpiresAt: expiresAt.toISOString(),
    decisionOptions: ["APPROVE", "REJECT", "REVISE"],
    humanAuthenticationRequired: true,
  }
  return [
    { ...common, policyId: "STOQ-X1-POL-001", decisionType: "PRODUCT_PERFORMANCE_BUDGET", policyArtifact: policyArtifact(artifacts, "POL-001"), candidateApprovers: [roleCandidate(database, "product_approver")], requiredAuthorityScopes: ["product-budget-authority"] },
    { ...common, policyId: "STOQ-X1-POL-002", decisionType: "NONPRODUCTION_SECURITY_TENANT_EVIDENCE", policyArtifact: policyArtifact(artifacts, "POL-002"), candidateApprovers: [roleCandidate(database, "security_owner"), roleCandidate(database, "sre_owner"), roleCandidate(database, "owner")], requiredAuthorityScopes: ["security-control-authority", "managed-secrets-authority", "fixture-data-tenant-authority"] },
    { ...common, policyId: "STOQ-X1-POL-003", decisionType: "INDEPENDENT_TECHNICAL_GATE_DELEGATION", policyArtifact: policyArtifact(artifacts, "POL-003"), candidateApprovers: [roleCandidate(database, "qa_owner")], requiredAuthorityScopes: ["independent-release-authority"] },
  ].map((request) => ({ ...request, candidateApprovers: request.candidateApprovers.filter(Boolean) }))
}

async function loadProvider(config) {
  if (!isPresent(config.providerAdapterModule)) throw new Error("Provider adapter is not configured.")
  const providersRoot = path.resolve(ROOT, "services/governance/approval-providers")
  const adapterPath = path.resolve(ROOT, config.providerAdapterModule)
  const providerRelative = path.relative(providersRoot, adapterPath)
  if (providerRelative.startsWith("..") || path.isAbsolute(providerRelative)) throw new Error("Provider adapter must be inside services/governance/approval-providers.")
  const imported = await import(pathToFileURL(adapterPath).href)
  const provider = imported.default ?? imported
  for (const method of ["verifyDelegation", "createDraftApprovalPackage", "getApprovalPackage"]) {
    if (typeof provider[method] !== "function") throw new Error(`Provider adapter is missing ${method}().`)
  }
  return provider
}

function validateDraftPackage(result, requests) {
  if (!isPresent(result?.packageId) || !isPresent(result?.packageUri)) throw new Error("Provider package ID or URI is missing.")
  if (!Array.isArray(result.records) || result.records.length !== 3) throw new Error("Provider must return exactly three draft records.")
  for (const request of requests) {
    const record = result.records.find((entry) => entry.policyId === request.policyId)
    if (!record || record.status !== "DRAFT" || !isPresent(record.recordId) || !isPresent(record.recordUri) || !isPresent(record.createdAt)) throw new Error(`Invalid draft record for ${request.policyId}.`)
  }
}

function validateApprovedPackage(result, draft, now = new Date()) {
  if (!Array.isArray(result?.records) || result.records.length !== 3) throw new Error("Provider must return exactly three decisions.")
  for (const pending of draft.records) {
    const record = result.records.find((entry) => entry.recordId === pending.recordId)
    const required = ["approverDirectoryId", "authorityAppointmentReference", "signatureReference", "decidedAt", "expiresAt"]
    if (!record || record.status !== "APPROVED" || record.decision !== "APPROVED") throw new Error(`Approval is incomplete for ${pending.policyId}.`)
    if (required.some((field) => !isPresent(record[field]))) throw new Error(`Approved record ${record.recordId} is incomplete.`)
    const decidedAt = Date.parse(record.decidedAt)
    const expiresAt = Date.parse(record.expiresAt)
    if (!Number.isFinite(decidedAt) || !Number.isFinite(expiresAt) || decidedAt > now.getTime() || expiresAt <= decidedAt || expiresAt <= now.getTime()) throw new Error(`Approved record ${record.recordId} has an invalid or expired window.`)
  }
}

function renderMarkdown(report) {
  const blockers = report.blockers.length ? report.blockers.map((item) => `| ${item.code} | ${item.description} | ${item.source} |`).join("\n") : "| None | All prerequisites are present. | Verified sources |"
  const roles = (report.database.roles ?? []).map((role) => `| ${role.code} | ${role.id} | ${role.users.map((user) => `${user.name} (${user.id})`).join("; ") || "None"} | ${role.permissions.length} |`).join("\n")
  return `# X1 approval automation readiness\n\n**Generated:** ${report.generatedAt}  \n**Mode:** ${report.mode}  \n**Status:** ${report.status}  \n**External records created:** ${report.externalRecordsCreated}  \n**Stoquify database mutated:** false\n\n## Decision\n\n${report.decision}\n\n## Blockers\n\n| Code | Description | Source |\n| --- | --- | --- |\n${blockers}\n\n## Read-only database context\n\nDatabase status: ${report.database.status}. Target: ${report.database.target.databaseName ?? "unavailable"}.\n\n| Role | Role ID | Active verified candidates | Permissions |\n| --- | --- | --- | ---: |\n${roles || "| None | None | None | 0 |"}\n\nExisting X1 activation packages: ${report.database.existingX1ActivationPackages ?? "not checked"}.\n\n## Artifact integrity\n\nContract URI: \`${report.artifacts.contractArtifactUri}\`  \nContract manifest SHA-256: \`${report.artifacts.contractManifestSha256}\`  \nAll checked hashes valid: ${report.artifacts.valid}.\n\n## Safe next action\n\n${report.safeNextAction}\n`
}

function writeReport(report) {
  writeJson(OUTPUT_JSON_PATH, report)
  writeFileSync(OUTPUT_MD_PATH, renderMarkdown(report), "utf8")
}

async function createDrafts(config, artifacts, database, report) {
  const provider = await loadProvider(config)
  const delegation = await provider.verifyDelegation({ signedDelegation: config.signedDelegation, delegationArtifacts: artifacts.delegationArtifacts, governanceRegisterUri: config.governanceRegisterUri, secretManagerReference: config.secretManagerReference })
  if (delegation?.verified !== true || delegation.approvalRecordId !== config.signedDelegation.approvalRecordId || delegation.signatureReference !== config.signedDelegation.signatureReference) throw new Error("The provider could not verify signed POL-004.")
  const requests = createApprovalRequests(config, artifacts, database)
  const result = await provider.createDraftApprovalPackage({ workspaceId: config.approvalWorkspaceId, templateId: config.approvalTemplateId, callbackUrl: config.callbackUrl, evidenceStoreUri: config.evidenceStoreUri, retentionPolicyReference: config.retentionPolicyReference, servicePrincipalId: config.servicePrincipals.approvalOrchestration, secretManagerReference: config.secretManagerReference, delegation, requests })
  validateDraftPackage(result, requests)
  const state = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    provider: config.approvalPlatform,
    packageId: result.packageId,
    packageUri: result.packageUri,
    delegationApprovalRecordId: delegation.approvalRecordId,
    records: result.records,
    prefillValues: requests.map((request) => {
      const record = result.records.find((entry) => entry.policyId === request.policyId)
      return { policyId: request.policyId, recordId: record.recordId, recordUri: record.recordUri, proposedEffectiveAt: request.proposedEffectiveAt, proposedExpiresAt: request.proposedExpiresAt, contractArtifactUri: request.contractArtifactUri, contractManifestSha256: request.contractManifestSha256 }
    }),
    status: "DRAFT_AWAITING_AUTHENTICATED_HUMAN_DECISIONS",
  }
  writeJson(DRAFT_RECORDS_PATH, state)
  return { ...report, status: "DRAFT_RECORDS_CREATED", externalRecordsCreated: true, decision: "Three authoritative draft records were created; human decisions remain required.", safeNextAction: "Authorized signers authenticate and decide, then run table:x1:approval:sync.", draftPackage: state }
}

async function syncDecisions(config, artifacts, report) {
  const draft = readJson(DRAFT_RECORDS_PATH)
  const provider = await loadProvider(config)
  const result = await provider.getApprovalPackage({ workspaceId: config.approvalWorkspaceId, packageId: draft.packageId, recordIds: draft.records.map((record) => record.recordId), servicePrincipalId: config.servicePrincipals.approvalOrchestration, secretManagerReference: config.secretManagerReference })
  validateApprovedPackage(result, draft)
  const finalManifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: "APPROVAL_PACKAGE_APPROVED",
    x1TechnicalGateStatus: "BLOCKED_AWAITING_AUTHENTICATED_EVIDENCE_AND_TECHNICAL_VALIDATION",
    packageId: draft.packageId,
    packageUri: draft.packageUri,
    contractArtifactUri: artifacts.contractArtifactUri,
    contractManifestSha256: artifacts.contractManifestSha256,
    delegationApprovalRecordId: draft.delegationApprovalRecordId,
    records: result.records,
    notes: ["Approval does not prove authenticated evidence.", "The finance X1 evidence gate must pass before promotion.", "This orchestrator did not mutate the Stoquify database."],
  }
  writeJson(FINAL_MANIFEST_PATH, finalManifest)
  return { ...report, status: "APPROVALS_SYNCHRONIZED", decision: "All three authoritative decisions were retrieved.", safeNextAction: "Run authenticated X1 evidence capture and the fail-closed evidence gate.", finalManifest }
}

async function main() {
  loadEnvConfig(process.cwd())
  const mode = parseMode(process.argv.slice(2))
  const noWrite = process.argv.includes("--no-write")
  if (noWrite && mode !== "report") throw new Error("--no-write is supported only in report mode.")
  const config = readJson(CONFIG_PATH)
  const artifacts = verifyArtifacts()
  const database = await retrieveDatabaseContext(config)
  const blockers = integrationBlockers(config, artifacts, database)
  let report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode,
    status: blockers.length ? "BLOCKED_AWAITING_EXTERNAL_CONFIGURATION_AND_SIGNATURE" : "READY",
    decision: blockers.length ? "Repository automation is prepared, but authoritative record creation is blocked." : "The configured provider and signed delegation may be used.",
    externalRecordsCreated: false,
    databaseMutated: false,
    blockers,
    database,
    artifacts,
    safeNextAction: blockers.length ? "Complete the non-secret configuration, sign POL-004, and add the approved provider adapter." : mode === "report" ? "Run table:x1:approval:create." : "Proceed with the configured operation.",
  }
  if (mode === "create" && blockers.length === 0) report = await createDrafts(config, artifacts, database, report)
  if (mode === "sync" && blockers.length === 0) report = await syncDecisions(config, artifacts, report)
  if (!noWrite) writeReport(report)
  if (mode !== "report" && blockers.length) process.exitCode = 2
  process.stdout.write(`${JSON.stringify(noWrite ? report : { status: report.status, blockerCount: report.blockers.length, output: path.relative(ROOT, OUTPUT_JSON_PATH) })}\n`)
}

if (require.main === module) main().catch((error) => {
  const failure = { schemaVersion: 1, generatedAt: new Date().toISOString(), status: "FAILED_CLOSED", externalRecordsCreated: false, databaseMutated: false, error: error instanceof Error ? error.message : "Unknown failure" }
  if (!process.argv.includes("--no-write")) {
    writeJson(OUTPUT_JSON_PATH, failure)
    writeFileSync(OUTPUT_MD_PATH, `# X1 approval automation readiness\n\n**Status:** FAILED_CLOSED\n\n${failure.error}\n`, "utf8")
    process.stderr.write(`${failure.error}\n`)
  } else {
    process.stderr.write("X1 read-only readiness failed; inspect configuration and database availability locally.\n")
  }
  process.exitCode = 1
})

module.exports = { integrationBlockers, verifyArtifacts, validateApprovedPackage }
