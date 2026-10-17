const { test } = require('node:test')
const assert = require('node:assert/strict')
const { validateTarget, validateSnapshot } = require('../repair-demo-journal-base-amounts.cjs')
const pad = n => String(n).padStart(3, '0')
function fixture() {
  return {
    settings: { baseCurrency: 'XAF' },
    accounts: [{ id: 'account', organizationId: 'rds_org_001' }],
    closeRun: [], closeEvidenceItem: [], closePackExport: [], accountantReview: [],
    entries: Array.from({ length: 12 }, (_, i) => {
      const suffix = pad(i + 1), id = `rds_org_001_journal_entry_${suffix}`
      return {
        id, organizationId: 'rds_org_001', entryNumber: `RDS001-JE-${suffix}`,
        status: 'POSTED', currency: 'XAF', sourceType: 'POS_SALE', sourceId: `rds_org_001_sales_order_${suffix}`,
        memo: `Seed sale recognition RDS001-SO-${suffix}`, reversalOfEntryId: null,
        postingBatch: { id: `rds_org_001_ledger_posting_batch_${suffix}`, organizationId: 'rds_org_001', sourceId: `rds_org_001_sales_order_${suffix}`, status: 'POSTED', metadata: { seed: true, sourceNumber: `RDS001-SO-${suffix}` } },
        lines: Array.from({ length: 5 }, (_, j) => ({
          id: `rds_org_001_journal_entry_line_${pad(i * 5 + j + 1)}`, organizationId: 'rds_org_001', journalEntryId: id,
          lineNumber: j + 1, accountId: 'account', currency: 'XAF', exchangeRate: '1',
          debit: ['100.25', '25.10', '0', '0', '0'][j], credit: ['0', '0', '80.20', '20.05', '25.10'][j],
          baseDebit: null, baseCredit: null,
        })),
      }
    }),
  }
}
test('accepts only the named local database outside production', () => {
  validateTarget('postgresql://localhost/stoquify_replay_next_20260830', false)
  assert.throws(() => validateTarget('postgresql://example.com/stoquify_replay_next_20260830', false))
  assert.throws(() => validateTarget('postgresql://localhost/another_database', false))
  assert.throws(() => validateTarget('postgresql://localhost/stoquify_replay_next_20260830', true))
})
test('derives exact decimal totals from 60 balanced synthetic lines', () => {
  assert.deepEqual(validateSnapshot(fixture()), { missing: 60, entries: 12, lines: 60, activityDebit: '1504.20', activityCredit: '1504.20' })
})
for (const [name, mutate] of [
  ['non-unit exchange rate', s => { s.entries[0].lines[0].exchangeRate = '2' }],
  ['different currency', s => { s.entries[0].lines[0].currency = 'USD' }],
  ['cross-tenant account', s => { s.accounts[0].organizationId = 'other' }],
  ['missing seed provenance', s => { s.entries[0].postingBatch.metadata.seed = false }],
  ['unbalanced original journal', s => { s.entries[0].lines[0].debit = '101' }],
  ['partial missing evidence', s => { s.entries[0].lines[0].baseDebit = '100.25' }],
  ['partial prior repair', s => { s.entries[0].lines[0].baseDebit = '100.25'; s.entries[0].lines[0].baseCredit = '0' }],
  ['incomplete entry set', s => { s.entries.pop() }],
  ['unexpected journal identity', s => { s.entries[0].id = 'real-entry' }],
  ['completed close assessment', s => { s.closeRun.push({ id: 'rds_org_001_close_run_001', status: 'CERTIFIED' }) }],
  ['bound close evidence', s => { s.closeEvidenceItem.push({ id: 'rds_org_001_close_evidence_item_001', sourceHash: 'actual-evidence' }) }],
  ['certified export', s => { s.closePackExport.push({ id: 'rds_org_001_close_pack_export_001', isCertified: true }) }],
]) test(`rejects ${name}`, () => { const snapshot = fixture(); mutate(snapshot); assert.throws(() => validateSnapshot(snapshot)) })
test('recognizes fully repaired evidence without planning new changes', () => {
  const snapshot = fixture()
  for (const entry of snapshot.entries) for (const line of entry.lines) { line.baseDebit = line.debit; line.baseCredit = line.credit }
  assert.equal(validateSnapshot(snapshot).missing, 0)
  snapshot.entries[0].lines[0].baseDebit = '1'
  assert.throws(() => validateSnapshot(snapshot))
})
