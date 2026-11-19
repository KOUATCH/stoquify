/** @jest-environment node */
// Direct PostgreSQL structural probes, synthetic OPEN/DRAFT input graphs only.
// The separate monthly suite earns its financial close; this suite does not.
import fs from "node:fs"
import path from "node:path"
import { Client } from "pg"
const { EXPECTED_FKS, EXPECTED_INDEXES, IDENTITY_TABLES, CORE_TABLES, insertRow, rowData, graphScope, makeFixture, snapshotFixture, countScopeViolations, unique, quote, sha } = require("./scope-fixtures.cjs")

const url = new URL(process.env.INTEGRITY_CLOSE_POSTGRES_URL || "")
if (url.hostname !== "localhost" || url.port !== "58033" || url.pathname !== "/" + process.env.INTEGRITY_CLOSE_DATABASE_NAME ||
  !/^\/stoquify_replay_close_monthly_20261110_[a-f0-9]{10}$/.test(url.pathname) || url.searchParams.get("schema") !== "public") throw Error("Exact new owned close-integrity target required")
const evidencePath = path.resolve(process.env.INTEGRITY_CLOSE_PROBE_EVIDENCE || "")
const privateContext = fs.realpathSync(path.dirname(process.env.MONTHLY_CLOSE_PRIVATE_DIRECTORY!))
if (path.dirname(evidencePath) !== privateContext || !path.basename(evidencePath).endsWith(".private.json")) throw Error("Exact owned private integrity evidence path required")
const sql = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 })
const checks: Array<Record<string, unknown>> = []
const proof = (name: string, metrics: Record<string, unknown>) => checks.push({ name, passed: true, ...metrics })
const readRow = async (table: string, id: string) => (await sql.query(`SELECT * FROM ${quote(table)} WHERE id=$1`, [id])).rows[0]
async function denied(invoke: () => Promise<unknown>, codes: string[], fixture?: any) {
  const before = fixture ? JSON.stringify(await snapshotFixture(sql, fixture)) : null
  let error: any
  try { await invoke() } catch (failure) { error = failure }
  if (!error) throw Error("Expected SQL rejection but the statement succeeded")
  if (!codes.includes(error.code)) throw Error(`Unexpected SQLSTATE ${String(error.code)}; constraint=${String(error.constraint || "none")}; message=${String(error.message || "unavailable")}`)
  if (fixture) expect(JSON.stringify(await snapshotFixture(sql, fixture))).toBe(before)
  return error
}
const scopeFields = (row: any) => ({ organizationId: row.organizationId, periodId: row.periodId, closeRunId: row.closeRunId })
const idFor = (graph: any, table: string) => ({ close_runs: graph.run.id, close_checklist_items: graph.checklist.id, close_assurance_findings: graph.finding.id,
  close_evidence_items: graph.evidence.id, close_pack_exports: graph.legacyExport.id, accountant_reviews: graph.review.id, accountant_comments: graph.comment.id } as Record<string, string>)[table]
beforeAll(async () => {
  expect(process.env.NODE_ENV).toBe("test"); await sql.connect()
  const identity = (await sql.query("SELECT current_database() AS name, inet_server_port() AS port")).rows[0]
  expect(identity).toEqual({ name: process.env.INTEGRITY_CLOSE_DATABASE_NAME, port: 58033 })
})
afterAll(async () => {
  fs.writeFileSync(evidencePath, JSON.stringify({ checks, syntheticScopeInputs: true, syntheticDraftCustodySentinel: true, financialTerminalStatesSeeded: false, noProviderOrBrowserCalls: true,
    limits: ["Initial OPEN/DRAFT graphs and retained DRAFT custody sentinel are synthetic inputs, not earned financial certification.", "Role/owner strings remain historical references; dynamic owner authority remains service-owned.", "The concurrent parent-delete probe proves its observed FK serialization, not every interleaving.", "No database reset, production target, browser, provider or delivery worker is used by this suite."] }, null, 2) + "\n", { flag: "wx" })
  await sql.end()
})

it("retains the exact new constraint, index and identity-guard contracts without removing legacy foreign keys", async () => {
  const names = EXPECTED_FKS.map((edge: any) => edge.name)
  const rows = (await sql.query(`SELECT c.conname AS name, child.relname AS "table", parent.relname AS parent,
    ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.num ORDER BY k.ord) AS columns,
    ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.num ORDER BY k.ord) AS "references",
    c.convalidated,c.condeferrable,c.condeferred,c.confdeltype,c.confupdtype,c.confmatchtype
    FROM pg_constraint c JOIN pg_class child ON child.oid=c.conrelid JOIN pg_class parent ON parent.oid=c.confrelid
    WHERE c.connamespace='public'::regnamespace AND c.contype='f' AND c.conname=ANY($1::text[]) ORDER BY c.conname`, [names])).rows
  expect(rows).toHaveLength(14)
  for (const expected of EXPECTED_FKS) expect(rows.find((row: any) => row.name === expected.name)).toEqual({ name: expected.name, table: expected.table, parent: expected.parent,
    columns: expected.columns, references: expected.references, convalidated: true, condeferrable: false, condeferred: false, confdeltype: "a", confupdtype: "r", confmatchtype: "s" })
  const indexes = (await sql.query(`SELECT idx.relname AS name, tab.relname AS "table", i.indisunique,i.indisvalid,i.indisready,
    i.indpred IS NULL AS unfiltered,i.indexprs IS NULL AS plain,
    ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.num ORDER BY k.ord) AS columns
    FROM pg_index i JOIN pg_class idx ON idx.oid=i.indexrelid JOIN pg_class tab ON tab.oid=i.indrelid
    WHERE idx.relnamespace='public'::regnamespace AND idx.relname=ANY($1::text[])`, [EXPECTED_INDEXES.map((index: any) => index.name)])).rows
  expect(indexes).toHaveLength(6)
  for (const expected of EXPECTED_INDEXES) expect(indexes.find((row: any) => row.name === expected.name)).toEqual({ ...expected, indisunique: true, indisvalid: true, indisready: true, unfiltered: true, plain: true })
  const guards = (await sql.query(`SELECT t.tgname AS name,c.relname AS "table",t.tgtype::int AS type,t.tgenabled AS enabled,p.proname AS "function",p.prorettype::regtype::text AS returns
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid
    WHERE NOT t.tgisinternal AND t.tgname=ANY($1::text[])`, [IDENTITY_TABLES.map((table: string) => table + "_scope_identity_guard")])).rows
  expect(guards).toHaveLength(7)
  for (const table of IDENTITY_TABLES) expect(guards.find((row: any) => row.table === table)).toEqual({ name: table + "_scope_identity_guard", table, type: 19, enabled: "O", function: "close_core_scope_identity_immutable", returns: "trigger" })
  const legacy = []
  for (const table of CORE_TABLES) {
    legacy.push({ name: table + "_organizationId_fkey", deletion: "c" }, { name: table + "_periodId_fkey", deletion: "c" })
    if (table !== "close_runs") legacy.push({ name: table + "_closeRunId_fkey", deletion: "c" })
  }
  for (const [table, column] of [["close_assurance_findings", "checklistItemId"], ["close_evidence_items", "checklistItemId"], ["close_evidence_items", "findingId"], ["accountant_comments", "findingId"], ["accountant_comments", "evidenceItemId"], ["accountant_comments", "reviewId"]]) legacy.push({ name: table + "_" + column + "_fkey", deletion: "n" })
  const old = (await sql.query(`SELECT conname AS name,confdeltype AS deletion,confupdtype AS updating,convalidated FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname=ANY($1::text[])`, [legacy.map(row => row.name)])).rows
  expect(old).toHaveLength(26)
  for (const expected of legacy) expect(old.find((row: any) => row.name === expected.name)).toEqual({ ...expected, updating: "c", convalidated: true })
  proof("metadata-contract-preserved", { scopedForeignKeys: 14, uniqueIndexes: 6, identityGuards: 7, legacyForeignKeysPreserved: 26, allValidated: true })
})

it("accepts nullable optional links and aligned multiple references", async () => {
  const f = await makeFixture(sql, { retained: false }), scope = graphScope(f.a)
  const nullFinding = await insertRow(sql, "close_assurance_findings", rowData("close_assurance_findings", f.a))
  const nullEvidence = await insertRow(sql, "close_evidence_items", rowData("close_evidence_items", f.a))
  const nullComment = await insertRow(sql, "accountant_comments", rowData("accountant_comments", f.a))
  expect([nullFinding.checklistItemId, nullEvidence.checklistItemId, nullEvidence.findingId, nullComment.findingId, nullComment.evidenceItemId, nullComment.reviewId]).toEqual([null, null, null, null, null, null])
  const aligned = await insertRow(sql, "accountant_comments", rowData("accountant_comments", f.a, { findingId: f.a.finding.id, evidenceItemId: f.a.evidence.id, reviewId: f.a.review.id }))
  expect(scopeFields(aligned)).toEqual(scope)
  expect((await countScopeViolations(sql)).every((row: any) => row.violations === 0)).toBe(true)
  proof("nullable-and-aligned-links", { nullableReferencesAccepted: 6, alignedMultiReferenceAccepted: true, noScopeViolations: true })
})

it("rejects wrong-scope inserts for every declared parent edge", async () => {
  const f = await makeFixture(sql, { retained: false })
  for (const edge of EXPECTED_FKS) {
    const data = rowData(edge.table, f.a)
    if (edge.table === "accounting_periods") data.fiscalYearId = f.b.year.id
    else if (edge.table === "close_runs") data.periodId = f.b.period.id
    else if (!edge.optional) data.closeRunId = f.b.run.id
    else data[edge.optional] = edge.parent === "close_checklist_items" ? f.b.checklist.id : edge.parent === "close_assurance_findings" ? f.b.finding.id : edge.parent === "close_evidence_items" ? f.b.evidence.id : f.b.review.id
    const error = await denied(() => insertRow(sql, edge.table, data), ["23503"], f)
    expect(error.constraint).toBe(edge.name)
  }
  proof("cross-scope-inserts-rejected", { edges: 14, exactSqlState: "23503", exactConstraintNames: true, fullFixtureSnapshotsUnchanged: true })
})

it("rejects changing optional links to foreign existing parents", async () => {
  const f = await makeFixture(sql, { retained: false }), edges = EXPECTED_FKS.filter((edge: any) => edge.optional)
  for (const edge of edges) {
    const target = edge.parent === "close_checklist_items" ? f.b.checklist.id : edge.parent === "close_assurance_findings" ? f.b.finding.id : edge.parent === "close_evidence_items" ? f.b.evidence.id : f.b.review.id
    const error = await denied(() => sql.query(`UPDATE ${quote(edge.table)} SET ${quote(edge.optional)}=$1 WHERE id=$2`, [target, idFor(f.a, edge.table)]), ["23503"], f)
    expect(error.constraint).toBe(edge.name)
  }
  proof("optional-link-updates-rejected", { edges: 6, exactSqlState: "23503", fullFixtureSnapshotsUnchanged: true })
})

it("freezes all seven core identities even for otherwise coherent reparenting", async () => {
  const f = await makeFixture(sql, { retained: false }); let variants = 0
  for (const table of IDENTITY_TABLES) {
    const id = idFor(f.a, table)
    const changes: Array<Record<string, string>> = [{ id: unique("new-id") }, { organizationId: f.b.run.organizationId }, { periodId: f.b.period.id },
      { organizationId: f.b.run.organizationId, periodId: f.b.period.id, ...(table === "close_runs" ? {} : { closeRunId: f.b.run.id }) }]
    if (table !== "close_runs") changes.push({ closeRunId: f.b.run.id })
    for (const fields of changes) {
      const columns = Object.keys(fields)
      const error = await denied(() => sql.query(`UPDATE ${quote(table)} SET ${columns.map((field, index) => `${quote(field)}=$${index + 1}`).join(',')} WHERE id=$${columns.length + 1}`, [...Object.values(fields), id]), ["23514"], f)
      expect(error.message).toBe("Close record scope identity cannot be changed")
      variants++
    }
  }
  proof("core-identities-immutable", { tables: 7, attemptedIdentityChanges: variants, exactSqlState: "23514", coherentLeafMovesDenied: true, fullFixtureSnapshotsUnchanged: true })
})

it("rejects tenant drift in fiscal-year, period and run parent cohorts", async () => {
  const f = await makeFixture(sql, { retained: false })
  await denied(() => sql.query('UPDATE fiscal_years SET "organizationId"=$1 WHERE id=$2', [f.b.run.organizationId, f.a.year.id]), ["23503"], f)
  await denied(() => sql.query('UPDATE accounting_periods SET "fiscalYearId"=$1 WHERE id=$2', [f.b.year.id, f.a.period.id]), ["23503"], f)
  await denied(() => sql.query('UPDATE accounting_periods SET "organizationId"=$1,"fiscalYearId"=$2,"periodNumber"=99 WHERE id=$3', [f.b.run.organizationId, f.b.year.id, f.a.period.id]), ["23503", "23514"], f)
  await denied(() => sql.query('UPDATE close_runs SET "organizationId"=$1,"periodId"=$2 WHERE id=$3', [f.b.run.organizationId, f.b.period.id, f.a.run.id]), ["23514"], f)
  proof("parent-scope-drift-rejected", { variants: 4, fiscalLineageScoped: true, parentAndChildSnapshotsUnchanged: true })
})

it("allows ordinary workflow, owner, resolution and stale annotations", async () => {
  const f = await makeFixture(sql, { retained: false })
  await sql.query('UPDATE close_runs SET status=\'RUNNING\',metadata=$1 WHERE id=$2', [{ stale: true }, f.a.run.id])
  await sql.query('UPDATE close_checklist_items SET status=\'WARNING\',"ownerId"=$1,metadata=$2 WHERE id=$3', ["historical-external-operator", { note: "ordinary workflow" }, f.a.checklist.id])
  await sql.query('UPDATE close_assurance_findings SET status=\'ASSIGNED\',"ownerId"=$1,"resolutionNotes"=$2 WHERE id=$3', ["historical-external-operator", "Synthetic resolution annotation", f.a.finding.id])
  await sql.query('UPDATE close_evidence_items SET metadata=$1,"unavailableReason"=$2 WHERE id=$3', [{ stale: true }, "Synthetic changed availability explanation", f.a.evidence.id])
  await sql.query('UPDATE close_pack_exports SET metadata=$1 WHERE id=$2', [{ sourceInvalidated: true }, f.a.legacyExport.id])
  await sql.query('UPDATE accountant_reviews SET status=\'CHANGES_REQUESTED\',"decisionNotes"=$1 WHERE id=$2', ["Synthetic ordinary review update", f.a.review.id])
  await sql.query('UPDATE accountant_comments SET body=$1,metadata=$2 WHERE id=$3', ["Synthetic amended commentary", { stale: true }, f.a.comment.id])
  const year = await insertRow(sql, "fiscal_years", { id: unique("same-org-year"), organizationId: f.a.run.organizationId, name: unique("same-org-year"), startDate: f.a.year.startDate, endDate: f.a.year.endDate })
  await sql.query('UPDATE accounting_periods SET "fiscalYearId"=$1 WHERE id=$2', [year.id, f.a.period.id])
  for (const table of CORE_TABLES) expect(scopeFields(await readRow(table, idFor(f.a, table)))).toEqual(scopeFields(table === "close_runs" ? f.a.run : { ...graphScope(f.a) }))
  expect((await readRow("accounting_periods", f.a.period.id)).fiscalYearId).toBe(year.id)
  proof("ordinary-workflow-updates-allowed", { coreTables: 7, historicalOwnerStringsPreserved: true, sameOrgOpenPeriodFiscalEditAllowed: true, noFinancialCertificationSeeded: true })
})

it("preserves optional SET NULL behavior when finding and checklist parents are deleted", async () => {
  const f = await makeFixture(sql, { retained: false }), scope = graphScope(f.a)
  await sql.query('DELETE FROM close_assurance_findings WHERE id=$1', [f.a.finding.id])
  expect((await readRow("close_evidence_items", f.a.evidence.id)).findingId).toBeNull()
  expect((await readRow("accountant_comments", f.a.comment.id)).findingId).toBeNull()
  await sql.query('DELETE FROM close_checklist_items WHERE id=$1', [f.a.checklist.id])
  const evidence = await readRow("close_evidence_items", f.a.evidence.id), comment = await readRow("accountant_comments", f.a.comment.id)
  expect(evidence.checklistItemId).toBeNull(); expect(scopeFields(evidence)).toEqual(scope); expect(scopeFields(comment)).toEqual(scope)
  expect(comment.evidenceItemId).toBe(f.a.evidence.id); expect(comment.reviewId).toBe(f.a.review.id)
  // A separate surviving finding proves its checklist FK independently.
  const fresh = await makeFixture(sql, { retained: false })
  await sql.query('DELETE FROM close_checklist_items WHERE id=$1', [fresh.a.checklist.id])
  const finding = await readRow("close_assurance_findings", fresh.a.finding.id)
  expect(finding.checklistItemId).toBeNull(); expect(scopeFields(finding)).toEqual(graphScope(fresh.a))
  expect((await readRow("close_evidence_items", fresh.a.evidence.id)).checklistItemId).toBeNull()
  proof("checklist-and-finding-delete-null-links", { nullableLinksCleared: 5, requiredScopePreserved: true, unrelatedLinksPreserved: true })
})

it("preserves optional SET NULL behavior when evidence and review parents are deleted", async () => {
  const f = await makeFixture(sql, { retained: false }), scope = graphScope(f.a)
  await sql.query('DELETE FROM close_evidence_items WHERE id=$1', [f.a.evidence.id])
  expect((await readRow("accountant_comments", f.a.comment.id)).evidenceItemId).toBeNull()
  await sql.query('DELETE FROM accountant_reviews WHERE id=$1', [f.a.review.id])
  const comment = await readRow("accountant_comments", f.a.comment.id)
  expect(comment.reviewId).toBeNull(); expect(comment.findingId).toBe(f.a.finding.id); expect(scopeFields(comment)).toEqual(scope)
  proof("evidence-and-review-delete-null-links", { nullableLinksCleared: 2, requiredScopePreserved: true, unrelatedFindingLinkPreserved: true })
})

it("preserves nonretained run, period and organization cascade behavior", async () => {
  for (const target of ["close_runs", "accounting_periods", "organizations"]) {
    const f = await makeFixture(sql, { retained: false }), id = target === "close_runs" ? f.a.run.id : target === "accounting_periods" ? f.a.period.id : f.a.run.organizationId
    await sql.query(`DELETE FROM ${quote(target)} WHERE id=$1`, [id])
    for (const table of CORE_TABLES) expect(await readRow(table, idFor(f.a, table))).toBeUndefined()
    for (const table of CORE_TABLES) expect(await readRow(table, idFor(f.b, table))).toBeDefined()
    if (target === "organizations") {
      for (const table of CORE_TABLES) expect(await readRow(table, idFor(f.other, table))).toBeUndefined()
      expect(await readRow("accounting_periods", f.a.period.id)).toBeUndefined(); expect(await readRow("fiscal_years", f.a.year.id)).toBeUndefined()
    }
  }
  proof("nonretained-cascades-preserved", { cascadeParents: 3, foreignCohortsPreserved: true, optionalAndRequiredActionsCompatible: true })
})

it("retains canonical DRAFT custody and permits only stale metadata changes", async () => {
  const f = await makeFixture(sql), before = await readRow("close_pack_exports", f.retained.id)
  expect(before.isCertified).toBe(false)
  await denied(() => sql.query('UPDATE close_pack_exports SET "canonicalContent"=$1 WHERE id=$2', ["Changed bytes", f.retained.id]), ["23514"], f)
  await denied(() => sql.query('UPDATE close_pack_exports SET "contentHash"=$1 WHERE id=$2', ["sha256:" + sha("changed"), f.retained.id]), ["23514"], f)
  await denied(() => sql.query('DELETE FROM close_pack_exports WHERE id=$1', [f.retained.id]), ["23514"], f)
  await denied(() => sql.query('DELETE FROM close_runs WHERE id=$1', [f.a.run.id]), ["23514"], f)
  await denied(() => sql.query('DELETE FROM accounting_periods WHERE id=$1', [f.a.period.id]), ["23514"], f)
  await denied(() => sql.query('DELETE FROM organizations WHERE id=$1', [f.a.run.organizationId]), ["23514"], f)
  await denied(() => sql.query('UPDATE close_pack_exports SET "canonicalContent"=$1,"canonicalContentSha256"=$2,"exportRequestHash"=$3 WHERE id=$4', [f.retained.content, "sha256:" + f.retained.bytesSha256, "sha256:" + sha("reconstructed"), f.legacyExportId]), ["23514"], f)
  await sql.query('UPDATE close_pack_exports SET metadata=$1,"updatedAt"=CURRENT_TIMESTAMP WHERE id=$2', [{ stale: true, qualificationOnly: true }, f.retained.id])
  const after = await readRow("close_pack_exports", f.retained.id)
  expect(after.canonicalContent).toBe(before.canonicalContent); expect(sha(after.canonicalContent)).toBe(f.retained.bytesSha256)
  expect(after.canonicalContentSha256).toBe(before.canonicalContentSha256); expect(after.exportRequestHash).toBe(before.exportRequestHash)
  expect(after.metadata).toEqual({ stale: true, qualificationOnly: true })
  proof("retained-custody-preserved", { syntheticDraftOnly: true, retainedByteAndIdentityChangesDenied: true, parentDeleteCannotDiscardRetainedDocument: true, nullLegacyReconstructionDenied: true, staleMetadataAllowed: true })
})

it("rejects a new reference when an observed concurrent parent deletion commits first", async () => {
  const f = await makeFixture(sql, { retained: false }), writer = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 }), contender = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 })
  await writer.connect(); await contender.connect()
  const data = rowData("close_assurance_findings", f.a, { checklistItemId: f.a.checklist.id })
  let active = false, result: Promise<{ accepted: boolean; code?: string }> | undefined, outcome: { accepted: boolean; code?: string } | undefined
  try {
    await writer.query("BEGIN"); active = true
    const writerPid = (await writer.query("SELECT pg_backend_pid() AS pid")).rows[0].pid
    await writer.query('DELETE FROM close_checklist_items WHERE id=$1', [f.a.checklist.id])
    result = insertRow(contender, "close_assurance_findings", data).then(() => ({ accepted: true }), (error: any) => ({ accepted: false, code: error.code }))
    const deadline = Date.now() + 10000; let observed = false
    while (Date.now() < deadline) {
      const row = (await sql.query(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND $1 = ANY(pg_blocking_pids(pid)) AND query ILIKE '%INSERT INTO%close_assurance_findings%') AS waiting`, [writerPid])).rows[0]
      if (row.waiting) { observed = true; break }
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    expect(observed).toBe(true)
    await writer.query("COMMIT"); active = false
    outcome = await result
    expect(outcome).toEqual({ accepted: false, code: "23503" })
    expect(await readRow("close_assurance_findings", data.id)).toBeUndefined(); expect(await readRow("close_checklist_items", f.a.checklist.id)).toBeUndefined()
    const existing = await readRow("close_assurance_findings", f.a.finding.id)
    expect(existing.checklistItemId).toBeNull(); expect(scopeFields(existing)).toEqual(graphScope(f.a))
    proof("concurrent-parent-delete-reference-rejected", { exactBlockingWriterPidObserved: true, actualConcurrentInsert: true, parentDeletionCommittedFirst: true, missingParentReferenceRejected: true, noOrphanChild: true, existingOptionalReferencesSafelyCleared: true })
  } finally {
    if (active) await writer.query("ROLLBACK")
    if (result) await result
    await writer.end(); await contender.end()
  }
}, 60000)
