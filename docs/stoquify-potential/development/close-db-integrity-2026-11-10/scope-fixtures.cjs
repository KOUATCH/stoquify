// Synthetic graph fixtures and independent expected contracts. This module does
// not connect, load environment, apply migrations or run tests when imported.
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const unique = label => 'integrity-' + label + '-' + crypto.randomBytes(6).toString('hex');
const CORE_TABLES = ['close_runs', 'close_checklist_items', 'close_assurance_findings', 'close_evidence_items', 'close_pack_exports', 'accountant_reviews', 'accountant_comments'];
const IDENTITY_TABLES = [...CORE_TABLES];
const expected = (name, table, columns, parent, references, optional = null) => ({ name, table, columns, parent, references, optional });
const runColumns = ['organizationId', 'periodId', 'closeRunId'];
const parentRunColumns = ['organizationId', 'periodId', 'id'];
const scopeColumns = ['organizationId', 'periodId', 'closeRunId', 'id'];
const EXPECTED_FKS = [
  expected('accounting_periods_fiscal_scope_fkey', 'accounting_periods', ['organizationId', 'fiscalYearId'], 'fiscal_years', ['organizationId', 'id']),
  expected('close_runs_period_scope_fkey', 'close_runs', ['organizationId', 'periodId'], 'accounting_periods', ['organizationId', 'id']),
  ...[
    ['close_checklists_run_scope_fkey', 'close_checklist_items'], ['close_findings_run_scope_fkey', 'close_assurance_findings'],
    ['close_evidence_run_scope_fkey', 'close_evidence_items'], ['close_exports_run_scope_fkey', 'close_pack_exports'],
    ['accountant_reviews_run_scope_fkey', 'accountant_reviews'], ['accountant_comments_run_scope_fkey', 'accountant_comments'],
  ].map(([name, table]) => expected(name, table, runColumns, 'close_runs', parentRunColumns)),
  expected('close_findings_checklist_scope_fkey', 'close_assurance_findings', [...runColumns, 'checklistItemId'], 'close_checklist_items', scopeColumns, 'checklistItemId'),
  expected('close_evidence_checklist_scope_fkey', 'close_evidence_items', [...runColumns, 'checklistItemId'], 'close_checklist_items', scopeColumns, 'checklistItemId'),
  expected('close_evidence_finding_scope_fkey', 'close_evidence_items', [...runColumns, 'findingId'], 'close_assurance_findings', scopeColumns, 'findingId'),
  expected('accountant_comments_finding_scope_fkey', 'accountant_comments', [...runColumns, 'findingId'], 'close_assurance_findings', scopeColumns, 'findingId'),
  expected('accountant_comments_evidence_scope_fkey', 'accountant_comments', [...runColumns, 'evidenceItemId'], 'close_evidence_items', scopeColumns, 'evidenceItemId'),
  expected('accountant_comments_review_scope_fkey', 'accountant_comments', [...runColumns, 'reviewId'], 'accountant_reviews', scopeColumns, 'reviewId'),
];
const EXPECTED_INDEXES = [
  { name: 'fiscal_years_scope_key', table: 'fiscal_years', columns: ['organizationId', 'id'] },
  { name: 'close_runs_scope_key', table: 'close_runs', columns: parentRunColumns },
  ...[
    ['close_checklists_scope_key', 'close_checklist_items'], ['close_findings_scope_key', 'close_assurance_findings'],
    ['close_evidence_scope_key', 'close_evidence_items'], ['accountant_reviews_scope_key', 'accountant_reviews'],
  ].map(([name, table]) => ({ name, table, columns: scopeColumns })),
];
const TABLES = ['organizations', 'fiscal_years', 'accounting_periods', ...CORE_TABLES];
function quote(value) { assert(/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)); return '"' + value + '"'; }
async function insertRow(sql, table, input) {
  assert(TABLES.includes(table), 'Fixture writes only approved graph tables');
  const data = { ...input }; if (!('updatedAt' in data)) data.updatedAt = new Date();
  const fields = Object.keys(data), placeholders = fields.map((_, index) => '$' + (index + 1));
  return (await sql.query(`INSERT INTO ${quote(table)} (${fields.map(quote).join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, fields.map(field => data[field]))).rows[0];
}
async function makeOrganization(sql, label) {
  const id = unique(label);
  return insertRow(sql, 'organizations', { id, slug: id, name: 'Synthetic integrity ' + label, countryCode: 'CM', currency: 'XAF', timezone: 'Africa/Douala' });
}
async function makePeriod(sql, organizationId, label) {
  const year = await insertRow(sql, 'fiscal_years', { id: unique('year'), organizationId, name: unique(label), startDate: new Date('2024-01-01T00:00:00Z'), endDate: new Date('2024-12-31T23:59:59.999Z') });
  const period = await insertRow(sql, 'accounting_periods', { id: unique('period'), organizationId, fiscalYearId: year.id, periodNumber: 1, name: 'Synthetic OPEN historical period', startDate: new Date('2024-01-01T00:00:00Z'), endDate: new Date('2024-01-31T23:59:59.999Z') });
  return { year, period };
}
function graphScope(graph) { return { organizationId: graph.run.organizationId, periodId: graph.run.periodId, closeRunId: graph.run.id }; }
function rowData(table, graph, overrides = {}) {
  const scope = graphScope(graph), id = unique('row');
  let data;
  if (table === 'accounting_periods') data = { id, organizationId: scope.organizationId, fiscalYearId: graph.year.id, periodNumber: 2, name: 'Synthetic OPEN scope test period', startDate: new Date('2024-02-01T00:00:00Z'), endDate: new Date('2024-02-29T23:59:59.999Z') };
  else if (table === 'close_runs') data = { id, organizationId: scope.organizationId, periodId: scope.periodId };
  else if (table === 'close_checklist_items') data = { id, ...scope, key: unique('check'), domain: 'AUDIT', severity: 'HIGH', status: 'FAILED', label: 'Synthetic scope input', detail: 'No assessment/certification is claimed', sourceService: 'close-integrity-fixture' };
  else if (table === 'close_assurance_findings') data = { id, ...scope, domain: 'AUDIT', severity: 'HIGH', title: 'Synthetic OPEN finding', detail: 'Initial scope input only', sourceService: 'close-integrity-fixture' };
  else if (table === 'close_evidence_items') data = { id, ...scope, evidenceType: 'AUDIT_LOG', sourceLabel: 'Synthetic unavailable evidence', provenance: 'SYNTHETIC_UNVERIFIED', available: false, unavailableReason: 'No real supporting evidence is asserted' };
  else if (table === 'close_pack_exports') data = { id, ...scope, watermarkId: unique('draft-watermark'), contentHash: 'sha256:' + sha(id), isCertified: false };
  else if (table === 'accountant_reviews') data = { id, ...scope };
  else if (table === 'accountant_comments') data = { id, ...scope, body: 'Synthetic scope-only comment' };
  else throw Error('Unsupported graph fixture table');
  return { ...data, ...overrides };
}
async function makeGraph(sql, organizationId, label = 'graph') {
  const { year, period } = await makePeriod(sql, organizationId, label);
  const run = await insertRow(sql, 'close_runs', { id: unique('run'), organizationId, periodId: period.id });
  const graph = { year, period, run };
  const checklist = await insertRow(sql, 'close_checklist_items', rowData('close_checklist_items', graph));
  const finding = await insertRow(sql, 'close_assurance_findings', rowData('close_assurance_findings', graph, { checklistItemId: checklist.id }));
  const evidence = await insertRow(sql, 'close_evidence_items', rowData('close_evidence_items', graph, { checklistItemId: checklist.id, findingId: finding.id }));
  const review = await insertRow(sql, 'accountant_reviews', rowData('accountant_reviews', graph));
  const comment = await insertRow(sql, 'accountant_comments', rowData('accountant_comments', graph, { findingId: finding.id, evidenceItemId: evidence.id, reviewId: review.id }));
  const legacyExport = await insertRow(sql, 'close_pack_exports', rowData('close_pack_exports', graph));
  return { ...graph, checklist, finding, evidence, review, comment, legacyExport };
}
async function makeRetainedDraft(sql, graph) {
  const content = JSON.stringify({ kind: 'synthetic-draft-custody-sentinel', statutoryApproval: false, note: 'Preuve privée de conservation; no earned certificate', scope: graphScope(graph) }, null, 2) + '\n';
  const row = await insertRow(sql, 'close_pack_exports', rowData('close_pack_exports', graph, { canonicalContent: content, canonicalContentSha256: 'sha256:' + sha(content), exportRequestHash: 'sha256:' + sha(unique('request')), metadata: { syntheticCustodyOnly: true } }));
  return { id: row.id, bytesSha256: sha(content), content, isCertified: false };
}
async function makeFixture(sql, options = {}) {
  const one = await makeOrganization(sql, 'client'), two = await makeOrganization(sql, 'foreign');
  const a = await makeGraph(sql, one.id, 'main'), b = await makeGraph(sql, two.id, 'foreign'), other = await makeGraph(sql, one.id, 'other-period');
  const retained = options.retained === false ? null : await makeRetainedDraft(sql, a);
  const fixture = { version: 1, organizationIds: [one.id, two.id], a, b, other, retained, legacyExportId: a.legacyExport.id, dirtyRows: [] };
  if (options.dirty) {
    for (const edge of EXPECTED_FKS) {
      let data = rowData(edge.table, a);
      if (edge.table === 'accounting_periods') data.fiscalYearId = b.year.id;
      else if (edge.table === 'close_runs') data.periodId = b.period.id;
      else if (!edge.optional) data.closeRunId = b.run.id;
      else data[edge.optional] = edge.parent === 'close_checklist_items' ? b.checklist.id : edge.parent === 'close_assurance_findings' ? b.finding.id : edge.parent === 'close_evidence_items' ? b.evidence.id : b.review.id;
      const row = await insertRow(sql, edge.table, data);
      fixture.dirtyRows.push({ edge: edge.name, table: edge.table, id: row.id });
    }
  }
  return fixture;
}
async function countScopeViolations(sql) {
  const rows = [];
  for (const edge of EXPECTED_FKS) {
    const predicate = edge.columns.map((column, index) => `parent.${quote(edge.references[index])}=child.${quote(column)}`).join(' AND ');
    const optional = edge.optional ? `child.${quote(edge.optional)} IS NOT NULL AND ` : '';
    const result = await sql.query(`SELECT count(*)::int AS violations FROM ${quote(edge.table)} child WHERE ${optional}NOT EXISTS (SELECT 1 FROM ${quote(edge.parent)} parent WHERE ${predicate})`);
    rows.push({ name: edge.name, violations: result.rows[0].violations });
  }
  return rows;
}
async function snapshotFixture(sql, fixture) {
  const result = {};
  for (const table of TABLES) {
    const field = table === 'organizations' ? 'id' : 'organizationId';
    result[table] = (await sql.query(`SELECT to_jsonb(snapshot_row) AS value FROM ${quote(table)} snapshot_row WHERE ${quote(field)}=ANY($1::text[]) ORDER BY id`, [fixture.organizationIds])).rows.map(row => row.value);
  }
  for (const table of ['close_source_revisions', 'close_source_changes']) {
    const ordering = table === 'close_source_revisions' ? '"organizationId"' : 'id';
    result[table] = (await sql.query(`SELECT to_jsonb(snapshot_row) AS value FROM ${quote(table)} snapshot_row WHERE "organizationId"=ANY($1::text[]) ORDER BY ${ordering}`, [fixture.organizationIds])).rows.map(row => row.value);
  }
  return result;
}
module.exports = { EXPECTED_FKS, EXPECTED_INDEXES, IDENTITY_TABLES, CORE_TABLES, insertRow, rowData, graphScope, makeOrganization, makePeriod, makeGraph, makeRetainedDraft, makeFixture, countScopeViolations, snapshotFixture, unique, sha, quote };
