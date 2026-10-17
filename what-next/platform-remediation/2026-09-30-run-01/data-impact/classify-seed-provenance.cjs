const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto")
const { configureTarget, readTarget } = require("./browser/authenticated-smoke.cjs")
const hash = value => crypto.createHash("sha256").update(value).digest("hex")
const sql = `WITH journal_facts AS (
  SELECT j.id, j."sourceType"::text AS source_type,
    EXISTS(SELECT 1 FROM journal_entry_lines l WHERE l."journalEntryId"=j.id AND (l."baseDebit" IS NULL OR l."baseCredit" IS NULL)) AS missing_base,
    (j."entryDate"<p."startDate" OR j."entryDate">p."endDate") AS outside_period,
    COALESCE(b.metadata->>'seed'='true',false) AS batch_seed_marker,
    EXISTS(SELECT 1 FROM accounting_source_links s WHERE s."journalEntryId"=j.id AND s.metadata->>'seed'='true') AS source_link_seed_marker,
    EXISTS(SELECT 1 FROM ledger_audit_events a WHERE a."journalEntryId"=j.id AND a.action='SEED_POSTED_SALE_JOURNAL') AS seed_posted_audit_marker,
    COALESCE(j.memo LIKE 'Seed sale recognition %',false) AS seed_memo_pattern,
    (SELECT COUNT(*) FROM journal_entry_lines l WHERE l."journalEntryId"=j.id) AS lines,
    (SELECT COUNT(*) FROM journal_entry_lines l WHERE l."journalEntryId"=j.id AND (l."baseDebit" IS NULL OR l."baseCredit" IS NULL)) AS missing_base_lines
  FROM journal_entries j JOIN accounting_periods p ON p.id=j."periodId"
  LEFT JOIN ledger_posting_batches b ON b.id=j."postingBatchId"
  WHERE j.status::text IN ('POSTED','REVERSED'))
SELECT COALESCE(source_type,'UNCLASSIFIED') AS source_type, missing_base, outside_period,
  batch_seed_marker, source_link_seed_marker, seed_posted_audit_marker, seed_memo_pattern,
  COUNT(*)::text AS journal_count, SUM(lines)::text AS line_count, SUM(missing_base_lines)::text AS missing_base_lines
FROM journal_facts GROUP BY source_type,missing_base,outside_period,batch_seed_marker,source_link_seed_marker,seed_posted_audit_marker,seed_memo_pattern
ORDER BY 1,2,3,4,5,6,7`
async function main() {
  const report = { startedAt:new Date().toISOString(), target:"verified retained local restore", sourceMutationAttempted:false,
    recordIdentifiersEmitted:false, schemaSha256:hash(fs.readFileSync("prisma/schema.prisma")),
    producerSha256:hash(fs.readFileSync("prisma/comprehensive-seed.ts")), sql }
  try {
    configureTarget()
    await readTarget(async client => {
      report.snapshot = (await client.query("SELECT transaction_timestamp() AS as_of, current_setting('transaction_read_only') AS read_only, current_setting('transaction_isolation') AS isolation")).rows[0]
      await client.query("SAVEPOINT provenance_check")
      try { report.rows = (await client.query(sql)).rows; report.status="EXECUTED" }
      catch(error) { await client.query("ROLLBACK TO SAVEPOINT provenance_check"); throw error }
      finally { await client.query("RELEASE SAVEPOINT provenance_check") }
    })
    report.readOnlyTransactionClosed = true
  } catch(error) { report.status="BLOCKED"; report.errorCode=error.safeCode||error.code||"GUARDED_PROVENANCE_FAILED"; process.exitCode=1 }
  report.completedAt=new Date().toISOString()
  fs.writeFileSync(path.join(__dirname,"seed-provenance.json"),JSON.stringify(report,null,2)+"\n")
  console.log(JSON.stringify(report,null,2))
}
main().catch(error=>{console.log(JSON.stringify({status:"WRITE_FAILED",code:error.code||"UNKNOWN"}));process.exitCode=1})
