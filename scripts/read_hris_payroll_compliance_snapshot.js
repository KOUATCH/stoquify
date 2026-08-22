"use strict"

require("dotenv/config")

if (process.env.DATABASE_URL?.includes("${")) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
    /\$\{([^}]+)\}/g,
    (_match, key) => process.env[key] || ""
  )
}

const crypto = require("node:crypto")
const fs = require("node:fs")
const path = require("node:path")
const { Client } = require("pg")

const root = path.resolve(__dirname, "..")
const sourcePath = path.join(
  root,
  "docs",
  "blockers-and-gates",
  "COMPLIANCE_AUTHORIZATION_G1_PREFILL_STATUS_2026-08-19.json"
)
const defaultOutputPath = path.join(
  root,
  "docs",
  "blockers-and-gates",
  "hris-payroll-compliance-prefill",
  "HRIS_PAYROLL_DATABASE_READ_ONLY_SNAPSHOT_2026-08-19.json"
)

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function compactName(value) {
  return normalizeName(value).replace(/\s+/g, "")
}

function bigrams(value) {
  const compact = compactName(value)
  if (compact.length < 2) return compact ? [compact] : []
  const result = []
  for (let index = 0; index < compact.length - 1; index += 1) {
    result.push(compact.slice(index, index + 2))
  }
  return result
}

function diceSimilarity(left, right) {
  const a = bigrams(left)
  const b = bigrams(right)
  if (!a.length && !b.length) return 1
  if (!a.length || !b.length) return 0
  const remaining = new Map()
  for (const item of b) remaining.set(item, (remaining.get(item) || 0) + 1)
  let overlap = 0
  for (const item of a) {
    const count = remaining.get(item) || 0
    if (count > 0) {
      overlap += 1
      remaining.set(item, count - 1)
    }
  }
  return (2 * overlap) / (a.length + b.length)
}

function safeDate(value) {
  return value ? new Date(value).toISOString() : null
}

function maskIdentifier(value) {
  const text = String(value || "").trim()
  if (!text) return null
  if (text.length <= 4) return "*".repeat(text.length)
  return `${text.slice(0, 2)}${"*".repeat(Math.min(8, text.length - 4))}${text.slice(-2)}`
}

function connectionFingerprint() {
  const raw = process.env.DATABASE_URL || ""
  if (!raw) return null
  try {
    const url = new URL(raw)
    return sha256(`${url.protocol}//${url.hostname}:${url.port || "default"}${url.pathname}`)
  } catch {
    return sha256("configured-unparseable-database-url")
  }
}

function personNames(person) {
  return [person.name, person.legalName, person.displayName, person.composedName]
    .filter(Boolean)
}

function rankCandidates(candidateName, people) {
  const candidateCompact = compactName(candidateName)
  return people
    .map((person) => {
      const names = personNames(person)
      const comparisons = names.map((name) => ({
        name,
        normalized: normalizeName(name),
        compact: compactName(name),
        score: diceSimilarity(candidateName, name),
      }))
      comparisons.sort((left, right) => right.score - left.score)
      const best = comparisons[0] || { name: null, normalized: "", compact: "", score: 0 }
      return {
        sourceType: person.sourceType,
        databaseName: best.name,
        databaseNormalizedName: best.normalized,
        exactNormalizedMatch: best.compact === candidateCompact,
        similarity: Number(best.score.toFixed(4)),
        organizationId: person.organizationId,
        stableSubjectId: best.compact === candidateCompact ? person.stableSubjectId : null,
        payrollEmployeeId: best.compact === candidateCompact ? person.payrollEmployeeId : null,
        userId: best.compact === candidateCompact ? person.userId : null,
        employmentStatus: person.employmentStatus || null,
        applicationRoleCodes: person.applicationRoleCodes || [],
        classification: best.compact === candidateCompact
          ? "CANDIDATE_EXACT_NAME_MATCH_NOT_IDENTITY_VERIFIED"
          : "POSSIBLE_NAME_SIMILARITY_NOT_IDENTITY_EVIDENCE",
      }
    })
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, 3)
}

function quoteIdentifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`)
  }
  return `"${value}"`
}

async function catalog(client) {
  const tableResult = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()"
  )
  const columnResult = await client.query(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()"
  )
  const tables = new Set(tableResult.rows.map((row) => row.table_name))
  const columns = new Map()
  for (const row of columnResult.rows) {
    if (!columns.has(row.table_name)) columns.set(row.table_name, new Set())
    columns.get(row.table_name).add(row.column_name)
  }
  return { tables, columns }
}

async function fetchRows(client, databaseCatalog, table, requestedColumns) {
  if (!databaseCatalog.tables.has(table)) return []
  const available = databaseCatalog.columns.get(table) || new Set()
  const selected = requestedColumns.filter((column) => available.has(column))
  if (!selected.length) return []
  const order = available.has("id") ? " ORDER BY \"id\" ASC" : ""
  const result = await client.query(
    `SELECT ${selected.map(quoteIdentifier).join(", ")} FROM ${quoteIdentifier(table)}${order}`
  )
  return result.rows
}

async function main() {
  const prefill = JSON.parse(fs.readFileSync(sourcePath, "utf8"))
  const candidates = prefill.roles.map((role) => ({
    canonicalRole: role.role,
    candidateName: role.candidateName,
    source: role.page6Source,
  }))
  const outputArgumentIndex = process.argv.indexOf("--out")
  const outputPath = outputArgumentIndex >= 0 && process.argv[outputArgumentIndex + 1]
    ? path.resolve(process.argv[outputArgumentIndex + 1])
    : defaultOutputPath

  const client = new Client({ connectionString: process.env.DATABASE_URL })
  let transactionStarted = false
  let transactionRolledBack = false
  let snapshot

  try {
    await client.connect()
    await client.query("BEGIN")
    transactionStarted = true
    await client.query("SET TRANSACTION READ ONLY")
    const databaseCatalog = await catalog(client)

    const organizations = await fetchRows(client, databaseCatalog, "organizations", [
      "id", "name", "slug", "tradeName", "country", "countryCode", "address",
      "taxIdentifier", "isActive", "deletedAt",
    ])
    const users = await fetchRows(client, databaseCatalog, "users", [
      "id", "name", "firstName", "lastName", "jobTitle", "organizationId",
      "isActive", "isVerified", "emailVerified", "mfaEnabledAt",
    ])
    const roles = await fetchRows(client, databaseCatalog, "roles", [
      "id", "code", "nameEn", "organizationId",
    ])
    const roleLinks = await fetchRows(client, databaseCatalog, "_RoleToUser", ["A", "B"])
    const employees = await fetchRows(client, databaseCatalog, "payroll_employees", [
      "id", "organizationId", "userId", "employeeNumber", "displayName", "legalName",
      "status", "hireDate", "terminationDate", "countryCode", "department", "jobTitle",
      "taxIdentifierMasked", "taxIdentifierHash", "socialIdentifierMasked",
      "socialIdentifierHash", "deletedAt",
    ])
    const contracts = await fetchRows(client, databaseCatalog, "payroll_contracts", [
      "id", "organizationId", "employeeId", "contractNumber", "type", "status",
      "effectiveFrom", "effectiveTo", "signedDocumentHash", "deletedAt",
    ])
    const orgUnits = await fetchRows(client, databaseCatalog, "hris_org_units", [
      "id", "organizationId", "code", "name", "type", "status", "effectiveFrom", "effectiveTo",
    ])
    const positions = await fetchRows(client, databaseCatalog, "hris_positions", [
      "id", "organizationId", "orgUnitId", "code", "title", "status", "effectiveFrom", "effectiveTo",
    ])
    const assignments = await fetchRows(client, databaseCatalog, "hris_employment_assignments", [
      "id", "organizationId", "employeeId", "positionId", "orgUnitId", "type", "status",
      "effectiveFrom", "effectiveTo",
    ])
    const reportingRelationships = await fetchRows(client, databaseCatalog, "hris_reporting_relationships", [
      "id", "organizationId", "managerEmployeeId", "reportEmployeeId", "type", "status",
      "effectiveFrom", "effectiveTo", "approvalEvidenceHash", "approvedById",
    ])
    const delegations = await fetchRows(client, databaseCatalog, "hris_manager_delegations", [
      "id", "organizationId", "delegatorEmployeeId", "delegateEmployeeId", "scopeOrgUnitId",
      "authority", "status", "effectiveFrom", "effectiveTo", "approvalEvidenceHash",
      "approvedById", "revokedAt",
    ])
    const sessions = await fetchRows(client, databaseCatalog, "sessions", ["assuranceVerifiedAt"])

    await client.query("ROLLBACK")
    transactionRolledBack = true

    const roleById = new Map(roles.map((role) => [role.id, role]))
    const userIds = new Set(users.map((user) => user.id))
    const roleIdsByUser = new Map()
    for (const link of roleLinks) {
      const roleId = roleById.has(link.A) ? link.A : roleById.has(link.B) ? link.B : null
      const userId = userIds.has(link.A) ? link.A : userIds.has(link.B) ? link.B : null
      if (!roleId || !userId) continue
      if (!roleIdsByUser.has(userId)) roleIdsByUser.set(userId, [])
      roleIdsByUser.get(userId).push(roleId)
    }
    for (const user of users) {
      user.roles = (roleIdsByUser.get(user.id) || [])
        .map((roleId) => roleById.get(roleId))
        .filter(Boolean)
    }

    const contractsByEmployee = new Map()
    for (const contract of contracts) {
      if (!contractsByEmployee.has(contract.employeeId)) contractsByEmployee.set(contract.employeeId, [])
      contractsByEmployee.get(contract.employeeId).push(contract)
    }
    const userById = new Map(users.map((user) => [user.id, user]))
    const people = [
      ...users.map((user) => ({
        sourceType: "User",
        stableSubjectId: user.id,
        payrollEmployeeId: null,
        userId: user.id,
        organizationId: user.organizationId,
        name: user.name,
        composedName: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
        applicationRoleCodes: user.roles.map((role) => role.code).sort(),
      })),
      ...employees.map((employee) => {
        const user = employee.userId ? userById.get(employee.userId) : null
        return {
          sourceType: "PayrollEmployee",
          stableSubjectId: employee.userId || null,
          payrollEmployeeId: employee.id,
          userId: employee.userId,
          organizationId: employee.organizationId,
          displayName: employee.displayName,
          legalName: employee.legalName,
          employmentStatus: employee.status,
          applicationRoleCodes: user ? user.roles.map((role) => role.code).sort() : [],
        }
      }),
    ]

    const identityReconciliation = candidates.map((candidate) => {
      const ranked = rankCandidates(candidate.candidateName, people)
      const exact = ranked.filter((entry) => entry.exactNormalizedMatch)
      return {
        ...candidate,
        normalizedCandidateName: normalizeName(candidate.candidateName),
        exactNormalizedMatches: exact,
        exactMatchCount: exact.length,
        topSimilarityCandidates: ranked.filter((entry) => !entry.exactNormalizedMatch),
        resolution: exact.length === 1
          ? "CANDIDATE_EXACT_NAME_MATCH_REQUIRES_HR_SECURITY_VERIFICATION"
          : exact.length > 1
            ? "CONFLICTED_MULTIPLE_EXACT_NAME_MATCHES"
            : "UNRESOLVED_NO_EXACT_NAME_MATCH",
      }
    })

    snapshot = {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      transaction: "READ ONLY; rolled back after retrieval",
      dataSourceFingerprint: connectionFingerprint(),
      recordCounts: {
        organizations: organizations.length,
        users: users.length,
        payrollEmployees: employees.length,
        orgUnits: orgUnits.length,
        positions: positions.length,
        employmentAssignments: assignments.length,
        reportingRelationships: reportingRelationships.length,
        managerDelegations: delegations.length,
        freshAssuranceSessions: sessions.filter((session) => session.assuranceVerifiedAt).length,
      },
      organizationEvidence: organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        tradeName: organization.tradeName,
        country: organization.country,
        countryCode: organization.countryCode,
        addressPresent: Boolean(organization.address),
        taxIdentifierMasked: maskIdentifier(organization.taxIdentifier),
        taxIdentifierHash: organization.taxIdentifier ? sha256(organization.taxIdentifier) : null,
        isActive: organization.isActive,
        deletedAt: safeDate(organization.deletedAt),
        classification: "APPLICATION_TENANT_RECORD_NOT_CORPORATE_AUTHORITY_EVIDENCE",
      })),
      applicationRoleInventory: Array.from(new Set(roles.map((role) => role.code))).sort(),
      applicationRoleLinkCount: roleLinks.length,
      usersWithApplicationRoles: users.filter((user) => user.roles.length > 0).length,
      potentialCustodianApplicationAccounts: users
        .filter((user) => user.roles.some((role) => /(ADMIN|OWNER|HR|SECURITY|GOVERNANCE)/i.test(role.code)))
        .map((user) => ({
          userId: user.id,
          name: user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
          organizationId: user.organizationId,
          jobTitle: user.jobTitle,
          roleCodes: user.roles.map((role) => role.code).sort(),
          accountActive: user.isActive,
          accountVerified: user.isVerified,
          emailVerified: user.emailVerified,
          mfaEnabled: Boolean(user.mfaEnabledAt),
          classification: "APPLICATION_RBAC_CLUE_NOT_GOVERNANCE_AUTHORITY",
        })),
      identityReconciliation,
      employeeEvidence: employees.map((employee) => ({
        payrollEmployeeId: employee.id,
        userId: employee.userId,
        organizationId: employee.organizationId,
        displayName: employee.displayName,
        legalName: employee.legalName,
        employeeNumberHash: sha256(employee.employeeNumber),
        status: employee.status,
        hireDate: safeDate(employee.hireDate),
        terminationDate: safeDate(employee.terminationDate),
        countryCode: employee.countryCode,
        department: employee.department,
        jobTitle: employee.jobTitle,
        taxIdentifierMasked: employee.taxIdentifierMasked,
        taxIdentifierHashPresent: Boolean(employee.taxIdentifierHash),
        socialIdentifierMasked: employee.socialIdentifierMasked,
        socialIdentifierHashPresent: Boolean(employee.socialIdentifierHash),
        deletedAt: safeDate(employee.deletedAt),
        contracts: (contractsByEmployee.get(employee.id) || []).map((contract) => ({
          id: contract.id,
          contractNumberHash: sha256(contract.contractNumber),
          type: contract.type,
          status: contract.status,
          effectiveFrom: safeDate(contract.effectiveFrom),
          effectiveTo: safeDate(contract.effectiveTo),
          signedDocumentHash: contract.signedDocumentHash,
          deletedAt: safeDate(contract.deletedAt),
        })),
        classification: "HRIS_RECORD_REQUIRES_SOURCE_EVIDENCE_AND_INDEPENDENT_VERIFICATION",
      })),
      orgUnits: orgUnits.map((item) => ({ ...item, effectiveFrom: safeDate(item.effectiveFrom), effectiveTo: safeDate(item.effectiveTo) })),
      positions: positions.map((item) => ({ ...item, effectiveFrom: safeDate(item.effectiveFrom), effectiveTo: safeDate(item.effectiveTo) })),
      employmentAssignments: assignments.map((item) => ({ ...item, effectiveFrom: safeDate(item.effectiveFrom), effectiveTo: safeDate(item.effectiveTo) })),
      reportingRelationships: reportingRelationships.map((item) => ({ ...item, effectiveFrom: safeDate(item.effectiveFrom), effectiveTo: safeDate(item.effectiveTo) })),
      managerDelegations: delegations.map((item) => ({ ...item, effectiveFrom: safeDate(item.effectiveFrom), effectiveTo: safeDate(item.effectiveTo), revokedAt: safeDate(item.revokedAt) })),
      safety: {
        emailsIncluded: false,
        compensationIncluded: false,
        rawTaxIdentifiersIncluded: false,
        rawSocialIdentifiersIncluded: false,
        applicationRolesAcceptedAsGovernanceAuthority: false,
        displayNameAcceptedAsIdentityKey: false,
        databaseWritesPerformed: false,
      },
    }
  } finally {
    if (transactionStarted && !transactionRolledBack) {
      try { await client.query("ROLLBACK") } catch {}
    }
    await client.end()
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8")
  process.stdout.write(`${JSON.stringify({
    output: path.relative(root, outputPath).replaceAll("\\", "/"),
    transaction: snapshot.transaction,
    recordCounts: snapshot.recordCounts,
    reconciledCandidates: snapshot.identityReconciliation.length,
    exactNameCandidates: snapshot.identityReconciliation.reduce((sum, item) => sum + item.exactMatchCount, 0),
    databaseWritesPerformed: snapshot.safety.databaseWritesPerformed,
  }, null, 2)}\n`)
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
  process.exitCode = 1
})
