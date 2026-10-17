require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { Prisma } = require('@prisma/client');
const configured = process.env.DATABASE_URL.replace(/\$\{([^}]+)\}/g, (_, name) => process.env[name] || '');
const target = new URL(configured);
if (!['localhost','127.0.0.1','[::1]'].includes(target.hostname)) throw new Error('Only local target allowed');
const sourceAudit = process.argv.includes('--source');
target.pathname = sourceAudit ? '/stoquify_replay_next_20260830' : '/stoquify_reseed_local_20260927_1500';
const outputStem = sourceAudit ? 'source-business-invariants' : 'business-invariants';
const q = (name) => '"' + name.replaceAll('"','""') + '"';
const checks = [
 ['receipt_movement_source_tieout', `WITH movements AS (SELECT "referenceId" AS receipt_id,"itemId",SUM(quantity) AS quantity,SUM("totalCost") AS cost FROM inventory_transactions WHERE "referenceType"='GOODS_RECEIPT' GROUP BY "referenceId","itemId"), receipts AS (SELECT "goodsReceiptId" AS receipt_id,"itemId",SUM("receivedQuantity") AS quantity,SUM("lineTotal") AS cost FROM goods_receipt_lines GROUP BY "goodsReceiptId","itemId") SELECT m.receipt_id,m."itemId",g.status,m.quantity::text AS movement_quantity,r.quantity::text AS receipt_quantity,m.cost::text AS movement_cost,r.cost::text AS receipt_cost FROM movements m LEFT JOIN receipts r ON r.receipt_id=m.receipt_id AND r."itemId"=m."itemId" JOIN goods_receipts g ON g.id=m.receipt_id WHERE r.receipt_id IS NULL OR ABS(m.quantity-r.quantity)>0.001 OR ABS(m.cost-r.cost)>0.01`],
 ['posted_journal_balance', `SELECT e.id,e.status,COUNT(l.id)::int AS lines,COALESCE(SUM(l.debit-l.credit),0)::text AS difference,COALESCE(SUM(COALESCE(l."baseDebit",l.debit*l."exchangeRate")-COALESCE(l."baseCredit",l.credit*l."exchangeRate")),0)::text AS base_difference FROM journal_entries e LEFT JOIN journal_entry_lines l ON l."journalEntryId"=e.id WHERE e.status IN ('POSTED','REVERSED') GROUP BY e.id HAVING COUNT(l.id)<2 OR ABS(COALESCE(SUM(l.debit-l.credit),0))>0.01 OR ABS(COALESCE(SUM(COALESCE(l."baseDebit",l.debit*l."exchangeRate")-COALESCE(l."baseCredit",l.credit*l."exchangeRate")),0))>0.01`],
 ['journal_line_sides', `SELECT id FROM journal_entry_lines WHERE debit<0 OR credit<0 OR (debit>0 AND credit>0) OR "baseDebit"<0 OR "baseCredit"<0 OR "exchangeRate"<=0`],
 ['journal_currency_consistency', `SELECT l.id FROM journal_entry_lines l JOIN journal_entries e ON e.id=l."journalEntryId" WHERE l.currency<>e.currency`],
 ['sales_header_arithmetic', `SELECT id,status,total::text,subtotal::text,"taxAmount"::text,discount::text FROM sales_orders WHERE ABS(total-(subtotal+"taxAmount"+"shippingCost"-discount))>0.01`],
 ['sales_line_arithmetic', `SELECT id,"salesOrderId" FROM sales_order_lines WHERE quantity<=0 OR ABS("lineTotal"-(quantity*"unitPrice"-discount+"taxAmount"))>0.02`],
 ['sales_header_line_tax', `SELECT s.id,s.status FROM sales_orders s JOIN sales_order_lines l ON l."salesOrderId"=s.id GROUP BY s.id HAVING ABS(s."taxAmount"-SUM(l."taxAmount"))>0.02`],
 ['supplier_invoice_header_arithmetic', `SELECT id,status FROM supplier_invoices WHERE ABS(total-(subtotal+"taxAmount"-discount))>0.01 OR "amountPaid"<0 OR "amountPaid">total`],
 ['supplier_invoice_line_arithmetic', `SELECT id,"supplierInvoiceId" FROM supplier_invoice_lines WHERE quantity<=0 OR ABS("lineTotal"-(quantity*"unitCost"+"taxAmount"))>0.02`],
 ['supplier_invoice_line_totals', `SELECT s.id,s.status FROM supplier_invoices s JOIN supplier_invoice_lines l ON l."supplierInvoiceId"=s.id GROUP BY s.id HAVING ABS(s."taxAmount"-SUM(l."taxAmount"))>0.02 OR ABS(s.subtotal-SUM(l.quantity*l."unitCost"))>0.02`],
 ['payroll_run_arithmetic', `SELECT id,status FROM payroll_runs WHERE ABS("netPayableAmount"-("grossAmount"-"employeeDeductionAmount"))>0.01 OR "grossAmount"<0 OR "employeeDeductionAmount"<0 OR "employerChargeAmount"<0 OR "netPayableAmount"<0`],
 ['payroll_run_line_arithmetic', `SELECT id,"payrollRunId" FROM payroll_run_lines WHERE ABS("netPayableAmount"-("grossAmount"-"employeeDeductionAmount"))>0.01 OR "grossAmount"<0 OR "employeeDeductionAmount"<0 OR "employerChargeAmount"<0 OR "netPayableAmount"<0`],
 ['payroll_run_line_totals', `SELECT r.id,r.status FROM payroll_runs r JOIN payroll_run_lines l ON l."payrollRunId"=r.id GROUP BY r.id HAVING ABS(r."grossAmount"-SUM(l."grossAmount"))>0.01 OR ABS(r."employeeDeductionAmount"-SUM(l."employeeDeductionAmount"))>0.01 OR ABS(r."employerChargeAmount"-SUM(l."employerChargeAmount"))>0.01 OR ABS(r."netPayableAmount"-SUM(l."netPayableAmount"))>0.01`],
 ['payslip_run_line_totals', `SELECT p.id FROM payroll_payslips p JOIN payroll_run_lines l ON l.id=p."runLineId" WHERE ABS(p."grossAmount"-l."grossAmount")>0.01 OR ABS(p."employeeDeductionAmount"-l."employeeDeductionAmount")>0.01 OR ABS(p."employerChargeAmount"-l."employerChargeAmount")>0.01 OR ABS(p."netPayableAmount"-l."netPayableAmount")>0.01`],
 ['payment_refund_bounds', `SELECT id,status FROM payments WHERE amount<0 OR "refundedAmount"<0 OR "refundedAmount">amount`],
 ['signed_reconciliation_proof', `SELECT id FROM reconciliation_runs WHERE status='SIGNED' AND ("signedById" IS NULL OR "signedAt" IS NULL)`],
 ['posted_stock_count_line_variance', `SELECT id FROM stock_count_lines WHERE ABS("varianceQuantity"-("countedQuantity"-"systemQuantity"))>0.001`],
];
async function main() {
 const client = new Client({ connectionString: target.toString(), options: '-c default_transaction_read_only=on -c statement_timeout=30000' });
 const results = [], payloadFindings = [], diagnostics = [], tableCounts = [];
 await client.connect();
 try {
  await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  for (const [id, sql] of checks) {
   await client.query('SAVEPOINT assurance_check');
   try { const r = await client.query(sql); results.push({id,status:r.rows.length?'FAIL':'PASS',findingCount:r.rows.length,sample:r.rows.slice(0,30),sql}); }
   catch (e) { await client.query('ROLLBACK TO SAVEPOINT assurance_check'); results.push({id,status:'UNVERIFIED_QUERY_ERROR',error:e.message,sql}); }
   await client.query('RELEASE SAVEPOINT assurance_check');
  }
  for (const model of Prisma.dmmf.datamodel.models) {
   for (const f of model.fields.filter(f=>f.type==='Json')) {
    const table=q(model.dbName||model.name), field=q(f.dbName||f.name);
    const sql=`SELECT COUNT(*)::int AS count FROM ${table} WHERE jsonb_typeof(${field}::jsonb)='object' AND ${field}::jsonb->>'seed'='true' AND (${field}::jsonb - ARRAY['seed','model','index','organizationId','businessEventId','employeeId','countryPack','provisionalReference'])='{}'::jsonb`;
    const r=await client.query(sql); if(r.rows[0].count) payloadFindings.push({model:model.name,table:model.dbName||model.name,field:f.name,count:r.rows[0].count,classification:'GENERIC_SEED_ONLY_PAYLOAD_REQUIRES_DOMAIN_REPLACEMENT_OR_HISTORICAL_QUARANTINE'});
   }
  }
  const nullableBase = await client.query(`SELECT COUNT(*)::int AS count FROM journal_entry_lines WHERE "baseDebit" IS NULL OR "baseCredit" IS NULL`);
  diagnostics.push({id:'nullable_base_amount_snapshots',count:nullableBase.rows[0].count,interpretation:'Base-balance check derives missing base amounts from debit/credit times exchangeRate; NULL values are not silently omitted from aggregation.'});
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  for (const {tablename} of tables.rows) tableCounts.push({table:tablename,count:(await client.query(`SELECT COUNT(*)::int AS count FROM ${q(tablename)}`)).rows[0].count});
  await client.query('ROLLBACK');
 } finally { await client.end(); }
 const report={generatedAt:new Date().toISOString(),target:{host:target.hostname,database:target.pathname.slice(1)},readOnly:true,results,payloadFindings,diagnostics,tableCounts,scope:'Point-in-time '+(sourceAudit?'source':'candidate')+' audit. Failed legacy rows require truthful repair decisions; preserved immutable evidence must not be rewritten. Rows sampled by ID only; no personal or secret values exported.'};
 fs.writeFileSync(path.join(__dirname,outputStem+'.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(__dirname,outputStem+'.md'),'# '+(sourceAudit?'Source':'Candidate')+' business integrity audit\n\nRead-only snapshot of '+target.pathname.slice(1)+'. Counts concern invariant failures, never arbitrary table-size thresholds.\n\n| Check | Result | Findings |\n|---|---|---|\n'+results.map(x=>`| ${x.id} | ${x.status} | ${x.findingCount??x.error} |`).join('\n')+'\n\n## Generic payload findings\n\n'+payloadFindings.map(x=>`- ${x.model}.${x.field}: ${x.count} generic seed-only payloads.`).join('\n')+'\n\n## Diagnostics\n\n'+diagnostics.map(x=>`- ${x.id}: ${x.count}. ${x.interpretation}`).join('\n')+'\n');
 console.log(JSON.stringify({checks:results.map(({id,status,findingCount,error})=>({id,status,findingCount,error})),genericPayloadFields:payloadFindings.length,genericPayloadCount:payloadFindings.reduce((a,x)=>a+x.count,0)},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
