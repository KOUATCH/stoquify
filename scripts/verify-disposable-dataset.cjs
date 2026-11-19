// Independent PostgreSQL invariants. No application imports or mutations.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Client,types}=require('pg');
// Prisma stores UTC instants in timestamp-without-time-zone columns.
types.setTypeParser(1114,value=>new Date(value.replace(' ','T')+'Z'));
const {OUT,NAME,assertManifestTarget}=require('./disposable-business-dataset.cjs');
const {delegatedAuditActorSql}=require('./verify-disposable-remaining.cjs');
const q=s=>'"'+s.replaceAll('"','""')+'"';
const CORE_ORGS="'synth12_douala','synth12_yaounde','synth12_bafoussam'";
// These are original fixture expectations, not general integrity checks. The
// auxiliary opening tenant deliberately has no twelve-month operating history.
const coreScenarioChecks=new Set(['historical-purchasing-all-org-months','historical-sales-all-org-months','required-additional-scenarios-present','cash-review-required-outcomes','required-bank-scenario-cardinality','bank-reference-configuration-labelled','bank-funding-independent-and-balanced','bank-payment-source-and-independent-actors','bank-reconciliation-complete-retained-lineage','cash-and-bank-closing-balances-nonnegative','required-hr-structure-cardinality','hr-delegation-bounded-people-read-reference']);
const canonical=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(canonical).join(',')+']':'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
async function main(){
 const manifest=JSON.parse(fs.readFileSync(path.join(OUT,'manifest.json'),'utf8'));
 const url=new URL(process.env.DATABASE_URL||'');
 if(!NAME.test(url.pathname.slice(1))||url.pathname.slice(1)!==manifest.target.database||!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Owned local target required');
 assertManifestTarget(url,manifest);
 const c=new Client({connectionString:url.toString(),connectionTimeoutMillis:5000});await c.connect();
 const checks=[];
 const check=async(name,sql)=>{if(coreScenarioChecks.has(name))sql=sql.replaceAll('FROM organizations o',`FROM (SELECT * FROM organizations WHERE id IN (${CORE_ORGS})) o`);const rows=(await c.query(sql)).rows;checks.push({name,passed:rows.length===0,violations:rows.slice(0,12),violationCount:rows.length});};
 try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await c.query("SET LOCAL TIME ZONE 'UTC'");
  if((await c.query('SELECT current_database() AS name')).rows[0].name!==manifest.target.database)throw new Error('Identity mismatch');
  const foreign=(await c.query(`SELECT con.conname,child.relname AS child,parent.relname AS parent,
   ARRAY(SELECT a.attname::text FROM unnest(con.conkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=child.oid AND a.attnum=k.num ORDER BY k.ord) AS child_columns,
   ARRAY(SELECT a.attname::text FROM unnest(con.confkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=parent.oid AND a.attnum=k.num ORDER BY k.ord) AS parent_columns
   FROM pg_constraint con JOIN pg_class child ON child.oid=con.conrelid JOIN pg_class parent ON parent.oid=con.confrelid JOIN pg_namespace n ON n.oid=child.relnamespace WHERE con.contype='f' AND n.nspname='public' ORDER BY con.conname`)).rows;
  const orgTables=new Set((await c.query("SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='organizationId'")).rows.map(r=>r.table_name));
  for(const fk of foreign){
   const join=fk.child_columns.map((col,i)=>`c.${q(col)}=p.${q(fk.parent_columns[i])}`).join(' AND ');
   const nonnull=fk.child_columns.map(col=>`c.${q(col)} IS NOT NULL`).join(' AND ');
   await check('FK:'+fk.conname,`SELECT count(*)::int AS violations FROM ${q(fk.child)} c LEFT JOIN ${q(fk.parent)} p ON ${join} WHERE ${nonnull} AND p.${q(fk.parent_columns[0])} IS NULL HAVING count(*)>0`);
   const auditDelegation=fk.conname==='audit_logs_userId_fkey'&&fk.child==='audit_logs'&&fk.parent==='users'?` AND NOT (${delegatedAuditActorSql})`:'';
   if(orgTables.has(fk.child)&&orgTables.has(fk.parent))await check('TENANT:'+fk.conname,`SELECT count(*)::int AS violations FROM ${q(fk.child)} c JOIN ${q(fk.parent)} p ON ${join} WHERE c."organizationId"<>p."organizationId"${auditDelegation} HAVING count(*)>0`);
  }
  await check('constraints-validated',`SELECT conname FROM pg_constraint con JOIN pg_class t ON t.oid=con.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND NOT con.convalidated`);
  await check('exact-required-organizations',`WITH expected(id) AS(VALUES('synth12_douala'),('synth12_yaounde'),('synth12_bafoussam'),('synth12_opening_aux'),('synth12_close_aux')) SELECT coalesce(e.id,o.id) AS id FROM expected e FULL JOIN organizations o USING(id) WHERE e.id IS NULL OR o.id IS NULL`);
  await check('exact-required-locations',`WITH expected AS(SELECT org||'_loc_'||n AS id,org FROM(VALUES('synth12_douala'),('synth12_yaounde'),('synth12_bafoussam')) o(org) CROSS JOIN generate_series(0,2) n UNION ALL SELECT 'synth12_opening_aux_loc_0','synth12_opening_aux') SELECT coalesce(e.id,l.id) AS id FROM expected e FULL JOIN locations l USING(id) WHERE e.id IS NULL OR l.id IS NULL OR l."organizationId"<>e.org`);
  await check('triggers-enabled',`SELECT t.tgname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND t.tgenabled='D'`);
  await check('posted-journals-balanced',`SELECT e.id,sum(l.debit-l.credit)::text AS imbalance,sum(l."baseDebit"-l."baseCredit")::text AS base_imbalance FROM journal_entries e LEFT JOIN journal_entry_lines l ON l."journalEntryId"=e.id WHERE e.status='POSTED' GROUP BY e.id HAVING count(l.id)<2 OR sum(l.debit-l.credit)<>0 OR sum(l."baseDebit"-l."baseCredit")<>0`);
  await check('inventory-tenant-scope',`SELECT l.id FROM inventory_levels l JOIN items i ON i.id=l."itemId" JOIN locations p ON p.id=l."locationId" WHERE i."organizationId"<>p."organizationId"`);
  await check('inventory-quantity-rollforward',`SELECT l.id,l."quantityOnHand"::text,coalesce(sum(t.quantity),0)::text AS movement_quantity FROM inventory_levels l LEFT JOIN inventory_transactions t ON t."itemId"=l."itemId" AND t."locationId"=l."locationId" GROUP BY l.id HAVING l."quantityOnHand"<>coalesce(sum(t.quantity),0)`);
  await check('inventory-value-rollforward',`SELECT l.id,l."totalValue"::text,coalesce(sum(CASE WHEN t.quantity<0 THEN -t."totalCost" ELSE t."totalCost" END),0)::text AS movement_value FROM inventory_levels l LEFT JOIN inventory_transactions t ON t."itemId"=l."itemId" AND t."locationId"=l."locationId" GROUP BY l.id HAVING l."totalValue"<>coalesce(sum(CASE WHEN t.quantity<0 THEN -t."totalCost" ELSE t."totalCost" END),0)`);
  await check('inventory-available-reserved',`SELECT id FROM inventory_levels WHERE "quantityOnHand"<>"quantityAvailable"+"quantityReserved" OR "quantityReserved"<0 OR "totalValue"<0`);
  await check('stock-to-ledger',`WITH stock AS(SELECT i."organizationId" AS org,sum(l."totalValue") AS value FROM inventory_levels l JOIN items i ON i.id=l."itemId" GROUP BY i."organizationId"),ledger AS(SELECT a."organizationId" AS org,sum(l."baseDebit"-l."baseCredit") AS value FROM chart_of_accounts a JOIN journal_entry_lines l ON l."accountId"=a.id JOIN journal_entries e ON e.id=l."journalEntryId" WHERE a."mappingKey"='INVENTORY' AND e.status='POSTED' GROUP BY a."organizationId") SELECT s.org,s.value::text,coalesce(l.value,0)::text AS ledger_value FROM stock s LEFT JOIN ledger l USING(org) WHERE s.value<>coalesce(l.value,0)`);
  await check('manual-maker-checker',`SELECT id FROM journal_entries WHERE status='POSTED' AND "sourceType"='MANUAL' AND ("postedById" IS NULL OR "postedById"="createdById")`);
  await check('attendance-conservation',`SELECT id FROM hris_time_entries WHERE status='VALIDATED' AND ("scheduledMinutes"<>"workedMinutes"+"absenceMinutes" OR "workedMinutes"<0 OR "absenceMinutes"<0)`);
  await check('employee-persona-link-scope',`SELECT e.id FROM payroll_employees e JOIN users u ON u.id=e."userId" WHERE e."organizationId"<>u."organizationId"`);
  await check('employee-persona-link-coverage',`SELECT "organizationId",count("userId")::int AS linked FROM payroll_employees GROUP BY "organizationId" HAVING count("userId")<>11`);
  await check('pos-complete-expected-baskets',`SELECT p.id FROM pos_commit_results p LEFT JOIN sales_order_lines l ON l."salesOrderId"=p."salesOrderId" WHERE p."clientCommitId" LIKE 'synth12_%:pos:%' GROUP BY p.id HAVING count(l.id)<>3 OR sum(l.quantity)<>3*(1+split_part(p."clientCommitId",':',4)::int%2) OR bool_or(l."itemId" NOT IN (SELECT p."organizationId"||'_item_'||((split_part(p."clientCommitId",':',4)::int*2+i)%12)::text FROM generate_series(0,2) i))`);
  await check('invoice-arithmetic',`SELECT id FROM supplier_invoices WHERE total<>subtotal+"taxAmount"-discount OR "amountPaid"<0 OR "amountPaid">total`);
  await check('payment-allocation-conservation',`SELECT p.id FROM supplier_payments p LEFT JOIN supplier_payment_allocations a ON a."supplierPaymentId"=p.id GROUP BY p.id HAVING p.amount<>coalesce(sum(a.amount),0)`);
  await check('payment-invoice-supplier-scope',`SELECT a.id FROM supplier_payment_allocations a JOIN supplier_payments p ON p.id=a."supplierPaymentId" JOIN supplier_invoices i ON i.id=a."supplierInvoiceId" WHERE p."supplierId"<>i."supplierId" OR p.currency<>i.currency`);
  await check('payment-maker-checker',`SELECT id FROM supplier_payments WHERE status<>'DRAFT' AND ("approvedById" IS NULL OR "approvedById"="requestedById")`);
  await check('invoice-posting-evidence',`SELECT i.id FROM supplier_invoices i LEFT JOIN ledger_posting_batches b ON b.id=i."ledgerPostingBatchId" WHERE i.status IN ('POSTED','PAYMENT_PENDING','PAID') AND (b.id IS NULL OR b.status<>'POSTED')`);
  await check('historical-purchasing-all-org-months',`WITH expected AS (SELECT o.id AS org,to_char(m,'YYYY-MM') AS month FROM organizations o CROSS JOIN generate_series('2025-11-01'::date,'2026-10-01'::date,'1 month') m), actual AS (SELECT "organizationId" AS org,to_char("orderDate",'YYYY-MM') AS month,count(*) AS n,count(DISTINCT "locationId") AS branches FROM purchase_orders WHERE notes LIKE 'synth12_%-history-%' GROUP BY 1,2) SELECT e.*,a.n,a.branches FROM expected e LEFT JOIN actual a USING(org,month) WHERE coalesce(a.n,0)<>3 OR a.branches<>3`);
  await check('historical-receipts-match-order-dates',`SELECT p.id FROM purchase_orders p LEFT JOIN goods_receipts g ON g."purchaseOrderId"=p.id WHERE p.notes LIKE 'synth12_%-history-%' GROUP BY p.id HAVING count(g.id)<>1 OR bool_or(g."receiptDate"::date<>p."orderDate"::date OR g."inventoryPostedAt" IS NULL)`);
  await check('historical-invoice-date-and-status',`SELECT p.id FROM purchase_orders p LEFT JOIN supplier_invoices i ON i."organizationId"=p."organizationId" AND i."invoiceNumber"=p.notes WHERE p.notes LIKE 'synth12_%-history-%' AND (i.id IS NULL OR i."invoiceDate"::date<>p."orderDate"::date OR (p."orderDate">='2026-01-01' AND i.status NOT IN ('POSTED','PAYMENT_PENDING','PAID')) OR (p."orderDate"<'2026-01-01' AND i.status IN ('POSTED','PAYMENT_PENDING','PAID')))`);
  await check('historical-sales-all-org-months',`WITH expected AS (SELECT o.id AS org,to_char(m,'YYYY-MM') AS month FROM organizations o CROSS JOIN generate_series('2025-11-01'::date,'2026-10-01'::date,'1 month') m), actual AS (SELECT p."organizationId" AS org,to_char(s."orderDate",'YYYY-MM') AS month,count(*) AS n,count(DISTINCT s."locationId") AS branches FROM pos_commit_results p JOIN sales_orders s ON s.id=p."salesOrderId" WHERE p."clientCommitId" LIKE 'synth12_%:history:%' AND p.status='COMPLETED' GROUP BY 1,2) SELECT e.*,a.n,a.branches FROM expected e LEFT JOIN actual a USING(org,month) WHERE coalesce(a.n,0)<>12 OR a.branches<>2`);
  await check('historical-sales-basket-and-date',`WITH c AS (SELECT p.*,split_part(p."clientCommitId",':',3) AS month,split_part(p."clientCommitId",':',4)::int AS branch,split_part(p."clientCommitId",':',5)::int AS basket,(extract(year FROM to_date(split_part(p."clientCommitId",':',3),'YYYY-MM'))::int-2025)*12+extract(month FROM to_date(split_part(p."clientCommitId",':',3),'YYYY-MM'))::int-11 AS m FROM pos_commit_results p WHERE p."clientCommitId" LIKE 'synth12_%:history:%') SELECT c.id FROM c JOIN sales_orders s ON s.id=c."salesOrderId" LEFT JOIN sales_order_lines l ON l."salesOrderId"=s.id GROUP BY c.id,c.month,c.branch,c.basket,c.m,c."organizationId",s."orderDate" HAVING count(l.id)<>3 OR bool_or(l.quantity<>1+(c.m+c.basket+c.branch)%3) OR bool_or(l."itemId" NOT IN(SELECT c."organizationId"||'_item_'||((c.basket*2+j+c.m)%12)::text FROM generate_series(0,2) j)) OR to_char(s."orderDate",'YYYY-MM-DD')<>c.month||'-10'`);
  await check('historical-shifts-closed-without-variance',`SELECT id FROM pos_sessions WHERE "terminalId" LIKE 'synth12_%_hist_%' AND (status<>'CLOSED' OR "closingBalance" IS DISTINCT FROM "expectedBalance" OR variance IS DISTINCT FROM 0)`);
  await check('chronological-stock-never-negative',`WITH movements AS(SELECT id,"itemId","locationId",sum(quantity) OVER(PARTITION BY "itemId","locationId" ORDER BY "effectiveAt",CASE WHEN quantity>0 THEN 0 ELSE 1 END,id ROWS UNBOUNDED PRECEDING) AS running FROM inventory_transactions) SELECT id,"itemId","locationId",running::text FROM movements WHERE running<0`);
  await check('movement-value-is-quantity-times-cost',`SELECT id FROM inventory_transactions WHERE "totalCost"<>round(abs(quantity)*"unitCost",2)`);
  await check('synthetic-constant-cost-premise',`SELECT t."itemId" FROM inventory_transactions t JOIN items i ON i.id=t."itemId" WHERE t.quantity<>0 GROUP BY t."itemId",i."costPrice" HAVING min(t."unitCost")<>i."costPrice" OR max(t."unitCost")<>i."costPrice"`);
  await check('chronological-constant-cost-value-rollforward',`WITH movements AS(SELECT t.id,t."itemId",t."locationId",i."costPrice",sum(t.quantity) OVER w AS qty,sum(CASE WHEN t.quantity<0 THEN -t."totalCost" ELSE t."totalCost" END) OVER w AS value FROM inventory_transactions t JOIN items i ON i.id=t."itemId" WINDOW w AS(PARTITION BY t."itemId",t."locationId" ORDER BY t."effectiveAt",CASE WHEN t.quantity>0 THEN 0 ELSE 1 END,t.id ROWS UNBOUNDED PRECEDING)) SELECT id,"itemId","locationId" FROM movements WHERE value<0 OR value<>round(qty*"costPrice",2)`);
  await check('customer-subledger-balance',`SELECT c.id FROM customers c LEFT JOIN customer_ledger_entries l ON l."customerId"=c.id GROUP BY c.id HAVING c."currentBalance"<>coalesce(sum(l.debit-l.credit),0)`);
  await check('customer-receivables-to-ledger',`WITH sub AS(SELECT "organizationId" AS org,sum("currentBalance") AS value FROM customers GROUP BY 1),ledger AS(SELECT a."organizationId" AS org,sum(l."baseDebit"-l."baseCredit") AS value FROM chart_of_accounts a JOIN journal_entry_lines l ON l."accountId"=a.id JOIN journal_entries e ON e.id=l."journalEntryId" WHERE a."mappingKey"='ACCOUNTS_RECEIVABLE' AND e.status='POSTED' GROUP BY 1) SELECT sub.org FROM sub LEFT JOIN ledger USING(org) WHERE sub.value<>coalesce(ledger.value,0)`);
  await check('supplier-payables-to-ledger',`WITH expected AS(SELECT o.id AS org,coalesce((SELECT sum(i.total) FROM supplier_invoices i WHERE i."organizationId"=o.id AND i.status IN('POSTED','PAYMENT_PENDING','PAID')),0)-coalesce((SELECT sum(p.amount) FROM supplier_payments p WHERE p."organizationId"=o.id AND p.status IN('RELEASED','POSTED')),0)-coalesce((SELECT sum(CASE WHEN n.direction='CORRECTION' THEN n.total ELSE -n.total END) FROM supplier_credit_notes n WHERE n."organizationId"=o.id),0) AS value FROM organizations o),ledger AS(SELECT a."organizationId" AS org,sum(l."baseCredit"-l."baseDebit") AS value FROM chart_of_accounts a JOIN journal_entry_lines l ON l."accountId"=a.id JOIN journal_entries e ON e.id=l."journalEntryId" WHERE a."mappingKey"='ACCOUNTS_PAYABLE' AND e.status='POSTED' GROUP BY 1) SELECT x.org,x.value::text,coalesce(l.value,0)::text AS ledger FROM expected x LEFT JOIN ledger l USING(org) WHERE x.value<>coalesce(l.value,0)`);
  await check('uninvoiced-receipts-to-grni-ledger',`WITH expected AS(SELECT o.id AS org,coalesce((SELECT sum(l."lineTotal") FROM goods_receipt_lines l JOIN goods_receipts r ON r.id=l."goodsReceiptId" WHERE r."organizationId"=o.id AND r."inventoryPostedAt" IS NOT NULL),0)-coalesce((SELECT sum(i.subtotal) FROM supplier_invoices i WHERE i."organizationId"=o.id AND i.status IN('POSTED','PAYMENT_PENDING','PAID')),0)-coalesce((SELECT sum(CASE WHEN r.direction='CORRECTION' THEN l."grniAmount" ELSE -l."grniAmount" END) FROM purchase_return_lines l JOIN purchase_returns r ON r.id=l."purchaseReturnId" WHERE r."organizationId"=o.id),0) AS value FROM organizations o),ledger AS(SELECT a."organizationId" AS org,sum(l."baseCredit"-l."baseDebit") AS value FROM chart_of_accounts a JOIN journal_entry_lines l ON l."accountId"=a.id JOIN journal_entries e ON e.id=l."journalEntryId" WHERE a."mappingKey"='GRNI' AND e.status='POSTED' GROUP BY 1) SELECT x.org,x.value::text,coalesce(l.value,0)::text AS ledger FROM expected x LEFT JOIN ledger l USING(org) WHERE x.value<>coalesce(l.value,0)`);
  await check('customer-settlement-allocations',`SELECT s.id FROM customer_settlements s LEFT JOIN customer_settlement_allocations a ON a."customerSettlementId"=s.id GROUP BY s.id HAVING s.amount<>coalesce(sum(a.amount),0)`);
  await check('completed-transfers-quantity',`SELECT t.id FROM stock_transfers t JOIN stock_transfer_lines l ON l."transferId"=t.id WHERE t.status='COMPLETED' AND (l."receivedQuantity"<>l."shippedQuantity" OR l."shippedQuantity"<>l."requestedQuantity")`);
  await check('leave-balances-nonnegative',`SELECT "employeeId","leavePolicyId" FROM hris_leave_balance_entries GROUP BY 1,2 HAVING sum("deltaMinutes")<0`);
  await check('required-additional-scenarios-present',`SELECT o.id FROM organizations o WHERE
   (SELECT count(*) FROM sales_orders s WHERE s."organizationId"=o.id AND s.channel='DELIVERY' AND s.status='COMPLETED' AND s.notes LIKE o.id||':delivery-fixture:v1%')<>1 OR
   (SELECT count(*) FROM hris_org_units u WHERE u."organizationId"=o.id AND u.status='ACTIVE' AND u.code IN('SYN-BRANCH-0','SYN-BRANCH-1','SYN-BRANCH-2','SYN-RETAIL','SYN-OPERATIONS'))<>5 OR
   (SELECT count(*) FROM tax_rates t WHERE t."organizationId"=o.id AND t.id=o.id||'_tax_fixture' AND t.rate=0)<>1 OR
   (SELECT count(*) FROM stock_transfers t WHERE t."organizationId"=o.id AND t.notes=o.id||'-warehouse-transfer' AND t.status='COMPLETED')<>1 OR
   (SELECT count(*) FROM stock_count_sessions s WHERE s."organizationId"=o.id AND s."countNumber"=o.id||'-synthetic-count' AND s.status='POSTED')<>1 OR
   (SELECT count(*) FROM purchase_returns r JOIN ledger_posting_batches b ON b.id=r."ledgerPostingBatchId" WHERE r."organizationId"=o.id AND r."idempotencyKey"=o.id||':supplier-return' AND b.status='POSTED')<>1 OR
   (SELECT count(*) FROM supplier_credit_notes n JOIN ledger_posting_batches b ON b.id=n."ledgerPostingBatchId" WHERE n."organizationId"=o.id AND n."idempotencyKey"=o.id||':supplier-credit' AND b.status='POSTED')<>1 OR
   (SELECT count(*) FROM customer_settlements s WHERE s."organizationId"=o.id AND s.status='POSTED' AND s."idempotencyKey" LIKE o.id||':customer-collection:%')<>2 OR
   (SELECT count(*) FROM hris_leave_balance_entries e WHERE e."organizationId"=o.id AND e."entryType"='ACCRUAL')<>12 OR
   (SELECT count(*) FROM hris_time_requests r WHERE r."organizationId"=o.id AND r."idempotencyKey"=o.id||':time-request:0' AND r.status='APPROVED')<>1 OR
   (SELECT count(*) FROM hris_time_requests r WHERE r."organizationId"=o.id AND r."idempotencyKey"=o.id||':time-request:1' AND r.status='REJECTED')<>1 OR
   (SELECT count(*) FROM hris_time_requests r WHERE r."organizationId"=o.id AND r."idempotencyKey"=o.id||':time-request:2' AND r.status='REQUESTED')<>1 OR
   (SELECT count(*) FROM hris_time_requests r WHERE r."organizationId"=o.id AND r."idempotencyKey"=o.id||':attendance-correction:leave' AND r.status='APPROVED')<>1 OR
   (SELECT count(*) FROM payroll_salary_change_requests r WHERE r."organizationId"=o.id AND r.status='REQUESTED')<>1`);
  await check('credit-sales-partial-and-full-collections',`SELECT p.id FROM pos_commit_results p JOIN sales_orders s ON s.id=p."salesOrderId" LEFT JOIN customer_settlement_allocations a ON a."salesOrderId"=s.id WHERE p."clientCommitId" LIKE 'synth12_%:credit-sale:%' GROUP BY p.id,p."clientCommitId",s.id HAVING count(a.id)<>1 OR coalesce(sum(a.amount),0)<>CASE WHEN split_part(p."clientCommitId",':',3)='0' THEN s.total/2 ELSE s.total END`);
  await check('cash-review-required-outcomes',`SELECT o.id FROM organizations o LEFT JOIN supplier_payments p ON p."organizationId"=o.id AND p.notes=o.id||'-payment-2' LEFT JOIN LATERAL(SELECT e."actorId",e.payload FROM business_events e WHERE e."organizationId"=o.id AND e."sourceId"=p.id AND e."eventType"='supplier.payment.reconciliation_reviewed' ORDER BY e."occurredAt" DESC,e.id DESC LIMIT 1) r ON true WHERE p.id IS NULL OR r.payload->>'status' IS DISTINCT FROM CASE WHEN o.id='synth12_bafoussam' THEN 'PROPOSED' ELSE 'CASH_REVIEWED' END OR (o.id<>'synth12_bafoussam' AND r."actorId" IS DISTINCT FROM o.id||'_user_manager')`);
  await check('delivery-line-fulfillment-conservation',`SELECT l.id FROM sales_order_lines l JOIN sales_orders s ON s.id=l."salesOrderId" WHERE s.channel='DELIVERY' AND s.status='COMPLETED' AND (l.quantity<>l."deliveredQuantity" OR l.quantity<>l."billedQuantity" OR l."reservedQuantity"<>0)`);
  const deliveryOrders=`SELECT * FROM sales_orders WHERE channel='DELIVERY' AND notes LIKE "organizationId"||':delivery-fixture:v1%'`;
  await check('delivery-required-document-lineage',`WITH orders AS(${deliveryOrders}) SELECT s.id FROM orders s
   LEFT JOIN delivery_reservations r ON r."salesOrderId"=s.id
   LEFT JOIN delivery_goods_issues g ON g."salesOrderId"=s.id
   LEFT JOIN delivery_billing_outcomes b ON b."salesOrderId"=s.id
   WHERE s.status<>'COMPLETED' OR s.version<>3 OR s."paymentStatus"<>'PENDING' OR s.total<>10800 OR s."taxAmount"<>0
    OR s."customerId" IS DISTINCT FROM s."organizationId"||'_customer_10' OR s."locationId" IS DISTINCT FROM s."organizationId"||'_loc_0'
    OR (SELECT count(*) FROM sales_order_lines l WHERE l."salesOrderId"=s.id)<>2
    OR (SELECT count(*) FROM delivery_reservations x WHERE x."salesOrderId"=s.id)<>1
    OR (SELECT count(*) FROM delivery_goods_issues x WHERE x."salesOrderId"=s.id)<>1
    OR (SELECT count(*) FROM delivery_billing_outcomes x WHERE x."salesOrderId"=s.id)<>1
    OR r.status IS DISTINCT FROM 'CONSUMED' OR r."organizationId" IS DISTINCT FROM s."organizationId" OR r."locationId" IS DISTINCT FROM s."locationId" OR r."consumedAt" IS NULL OR r."releasedAt" IS NOT NULL
    OR g.kind IS DISTINCT FROM 'ISSUE' OR g."organizationId" IS DISTINCT FROM s."organizationId" OR g."locationId" IS DISTINCT FROM s."locationId" OR g."reversalOfGoodsIssueId" IS NOT NULL
    OR b.status IS DISTINCT FROM 'POSTED' OR b."organizationId" IS DISTINCT FROM s."organizationId" OR b.currency IS DISTINCT FROM 'XAF'
    OR b.subtotal IS DISTINCT FROM s.subtotal OR b."taxAmount" IS DISTINCT FROM s."taxAmount" OR b."discountAmount" IS DISTINCT FROM s.discount OR b."totalAmount" IS DISTINCT FROM s.total
    OR (SELECT count(*) FROM delivery_reservation_lines l WHERE l."reservationId"=r.id)<>2
    OR (SELECT count(*) FROM delivery_goods_issue_lines l WHERE l."goodsIssueId"=g.id)<>2
    OR (SELECT count(*) FROM delivery_billing_lines l WHERE l."billingOutcomeId"=b.id)<>2
    OR g."totalCost" IS DISTINCT FROM (SELECT sum(l."totalCost") FROM delivery_goods_issue_lines l WHERE l."goodsIssueId"=g.id)`);
  await check('delivery-reservation-lineage',`WITH orders AS(${deliveryOrders}) SELECT l.id FROM orders s JOIN sales_order_lines l ON l."salesOrderId"=s.id
   LEFT JOIN delivery_reservations r ON r."salesOrderId"=s.id
   LEFT JOIN delivery_reservation_lines x ON x."reservationId"=r.id AND x."salesOrderLineId"=l.id
   WHERE l."itemId" NOT IN(s."organizationId"||'_item_4',s."organizationId"||'_item_6')
    OR l.quantity<>CASE WHEN l."itemId"=s."organizationId"||'_item_4' THEN 2 ELSE 3 END
    OR x.id IS NULL OR x."organizationId" IS DISTINCT FROM s."organizationId" OR x."itemId" IS DISTINCT FROM l."itemId" OR x."locationId" IS DISTINCT FROM s."locationId"
    OR x.quantity IS DISTINCT FROM l.quantity OR x."consumedQuantity" IS DISTINCT FROM l.quantity`);
  await check('delivery-goods-issue-stock-lineage',`WITH orders AS(${deliveryOrders}) SELECT l.id FROM orders s JOIN sales_order_lines l ON l."salesOrderId"=s.id
   LEFT JOIN delivery_goods_issues g ON g."salesOrderId"=s.id
   LEFT JOIN delivery_goods_issue_lines x ON x."goodsIssueId"=g.id AND x."salesOrderLineId"=l.id
   LEFT JOIN inventory_transactions t ON t.id=x."inventoryTransactionId"
   WHERE x.id IS NULL OR x."organizationId" IS DISTINCT FROM s."organizationId" OR x."itemId" IS DISTINCT FROM l."itemId" OR x."locationId" IS DISTINCT FROM s."locationId"
    OR x.quantity IS DISTINCT FROM l.quantity OR x."totalCost" IS DISTINCT FROM round(x.quantity*x."unitCost",2)
    OR t.id IS NULL OR t."organizationId" IS DISTINCT FROM s."organizationId" OR t."itemId" IS DISTINCT FROM l."itemId" OR t."locationId" IS DISTINCT FROM s."locationId"
    OR t.type IS DISTINCT FROM 'SALE' OR t."referenceType" IS DISTINCT FROM 'SALES_ORDER' OR t."referenceId" IS DISTINCT FROM l.id
    OR t.quantity IS DISTINCT FROM -x.quantity OR t."unitCost" IS DISTINCT FROM x."unitCost" OR abs(t."totalCost") IS DISTINCT FROM x."totalCost"
    OR (SELECT count(*) FROM inventory_transactions m WHERE m."organizationId"=s."organizationId" AND m."referenceType"='SALES_ORDER' AND m."referenceId"=l.id)<>2
    OR (SELECT count(*) FROM inventory_transactions m WHERE m."organizationId"=s."organizationId" AND m."referenceType"='SALES_ORDER' AND m."referenceId"=l.id AND m.type='RESERVATION' AND m."itemId"=l."itemId" AND m."locationId"=s."locationId" AND m.quantity=0 AND m."totalCost"=0)<>1`);
  await check('delivery-billing-lineage',`WITH orders AS(${deliveryOrders}) SELECT l.id FROM orders s JOIN sales_order_lines l ON l."salesOrderId"=s.id
   LEFT JOIN delivery_billing_outcomes b ON b."salesOrderId"=s.id
   LEFT JOIN delivery_billing_lines x ON x."billingOutcomeId"=b.id AND x."salesOrderLineId"=l.id
   WHERE x.id IS NULL OR x."organizationId" IS DISTINCT FROM s."organizationId" OR x."itemId" IS DISTINCT FROM l."itemId"
    OR x."deliveredQuantity" IS DISTINCT FROM l.quantity OR x."billedQuantity" IS DISTINCT FROM l.quantity
    OR x."unitPrice" IS DISTINCT FROM l."unitPrice" OR x."discountAmount" IS DISTINCT FROM l.discount OR x."taxRate" IS DISTINCT FROM l."taxRate"
    OR x."taxAmount" IS DISTINCT FROM l."taxAmount" OR x."lineTotal" IS DISTINCT FROM l."lineTotal"
    OR b."totalAmount" IS DISTINCT FROM (SELECT sum(y."lineTotal") FROM delivery_billing_lines y WHERE y."billingOutcomeId"=b.id)`);
  await check('delivery-posted-accounting-lineage',`WITH orders AS(${deliveryOrders}), sources AS(
   SELECT g.id,g."organizationId",g."ledgerPostingBatchId",g."journalEntryId",g."totalCost" AS amount,'DELIVERY_GOODS_ISSUE' AS kind FROM delivery_goods_issues g JOIN orders s ON s.id=g."salesOrderId"
   UNION ALL SELECT b.id,b."organizationId",b."ledgerPostingBatchId",b."journalEntryId",b."totalAmount",'DELIVERY_INVOICE' FROM delivery_billing_outcomes b JOIN orders s ON s.id=b."salesOrderId")
   SELECT x.id FROM sources x LEFT JOIN ledger_posting_batches p ON p.id=x."ledgerPostingBatchId" LEFT JOIN journal_entries j ON j.id=x."journalEntryId"
   WHERE p.id IS NULL OR p."organizationId" IS DISTINCT FROM x."organizationId" OR p.status IS DISTINCT FROM 'POSTED' OR p."sourceType"::text IS DISTINCT FROM x.kind OR p."sourceId" IS DISTINCT FROM x.id
    OR j.id IS NULL OR j."organizationId" IS DISTINCT FROM x."organizationId" OR j.status IS DISTINCT FROM 'POSTED' OR j."postingBatchId" IS DISTINCT FROM p.id OR j."sourceType"::text IS DISTINCT FROM x.kind OR j."sourceId" IS DISTINCT FROM x.id
    OR (SELECT count(*) FROM journal_entries e WHERE e."organizationId"=x."organizationId" AND e."sourceType"::text=x.kind AND e."sourceId"=x.id)<>1
    OR (SELECT sum(l.debit) FROM journal_entry_lines l WHERE l."journalEntryId"=j.id) IS DISTINCT FROM x.amount
    OR (SELECT sum(l.credit) FROM journal_entry_lines l WHERE l."journalEntryId"=j.id) IS DISTINCT FROM x.amount`);
  await check('delivery-unpaid-receivable-lineage',`WITH orders AS(${deliveryOrders}) SELECT s.id FROM orders s
   LEFT JOIN delivery_billing_outcomes b ON b."salesOrderId"=s.id
   LEFT JOIN customer_receivable_documents d ON d.id=b."customerReceivableDocumentId"
   LEFT JOIN customer_ledger_entries l ON l.id=b."customerLedgerEntryId"
   LEFT JOIN LATERAL(SELECT * FROM customer_receivable_document_states x WHERE x."documentId"=d.id ORDER BY x.version DESC LIMIT 1) r ON true
   WHERE d.id IS NULL OR d."organizationId" IS DISTINCT FROM s."organizationId" OR d."customerId" IS DISTINCT FROM s."customerId" OR d."sourceSalesOrderId" IS DISTINCT FROM s.id
    OR d."totalAmount" IS DISTINCT FROM s.total OR d."initialUnpaidAmount" IS DISTINCT FROM s.total OR d."initialPaidAmount" IS DISTINCT FROM 0::numeric OR d.currency IS DISTINCT FROM b.currency
    OR (SELECT count(*) FROM customer_receivable_documents x WHERE x."sourceSalesOrderId"=s.id)<>1
    OR r.id IS NULL OR r."organizationId" IS DISTINCT FROM s."organizationId" OR r."paidAmount" IS DISTINCT FROM 0::numeric OR r."unpaidAmount" IS DISTINCT FROM s.total OR r.status IS DISTINCT FROM 'ISSUED'
    OR l.id IS NULL OR l."organizationId" IS DISTINCT FROM s."organizationId" OR l."customerId" IS DISTINCT FROM s."customerId" OR l.type IS DISTINCT FROM 'SALE'
    OR l.debit IS DISTINCT FROM s.total OR l.credit IS DISTINCT FROM 0::numeric OR l."referenceType" IS DISTINCT FROM 'CUSTOMER_RECEIVABLE_DOCUMENT' OR l."referenceId" IS DISTINCT FROM d.id
    OR (SELECT count(*) FROM customer_ledger_entries x WHERE x."organizationId"=s."organizationId" AND x."referenceType"='CUSTOMER_RECEIVABLE_DOCUMENT' AND x."referenceId"=d.id)<>1`);
  await check('delivery-command-event-lineage',`WITH orders AS(${deliveryOrders}) SELECT s.id,k.phase FROM orders s
   CROSS JOIN(VALUES('create','delivery.order.created'),('confirm','delivery.order.confirmed'),('issue','delivery.order.goods_issue_posted'),('bill','delivery.order.billed')) k(phase,event_type)
   LEFT JOIN business_events e ON e."organizationId"=s."organizationId" AND e."eventSource"='INTERNAL' AND e."idempotencyKey"=s."organizationId"||':delivery-fixture:v1:'||k.phase
   WHERE e.id IS NULL OR e.status IS DISTINCT FROM 'APPLIED' OR e."sourceId" IS DISTINCT FROM s.id OR e."sourceType" IS DISTINCT FROM 'DELIVERY_ORDER' OR e."eventType" IS DISTINCT FROM k.event_type OR e."actorId" IS DISTINCT FROM s."organizationId"||'_user_owner'
    OR (k.phase='confirm' AND NOT EXISTS(SELECT 1 FROM delivery_reservations r WHERE r."salesOrderId"=s.id AND r."commandEventId"=e.id))
    OR (k.phase='issue' AND NOT EXISTS(SELECT 1 FROM delivery_goods_issues g WHERE g."salesOrderId"=s.id AND g."commandEventId"=e.id))
    OR (k.phase='bill' AND NOT EXISTS(SELECT 1 FROM delivery_billing_outcomes b WHERE b."salesOrderId"=s.id AND b."commandEventId"=e.id))`);
  await check('required-bank-scenario-cardinality',`SELECT o.id FROM organizations o WHERE
   (SELECT count(*) FROM payment_rails r WHERE r."organizationId"=o.id AND r.code='SYNTHETIC_MANUAL_BANK')<>1 OR
   (SELECT count(*) FROM provider_accounts a WHERE a."organizationId"=o.id AND a."providerCode"='SYNTHETIC_MANUAL_BANK')<>1 OR
   (SELECT count(*) FROM settlement_accounts a WHERE a."organizationId"=o.id AND a."providerAccountId"=o.id||'_manual_bank_provider')<>1 OR
   (SELECT count(*) FROM supplier_payments p WHERE p."organizationId"=o.id AND p.notes=o.id||'-manual-bank-20261028')<>1 OR
   (SELECT count(*) FROM statement_files f WHERE f."organizationId"=o.id AND f."providerAccountId"=o.id||'_manual_bank_provider')<>1 OR
   (SELECT count(*) FROM statement_lines l WHERE l."organizationId"=o.id AND l."providerAccountId"=o.id||'_manual_bank_provider')<>1 OR
   (SELECT count(*) FROM reconciliation_runs r WHERE r."organizationId"=o.id AND r."providerAccountId"=o.id||'_manual_bank_provider')<>1 OR
   (SELECT count(*) FROM match_records m WHERE m."organizationId"=o.id AND m."providerAccountId"=o.id||'_manual_bank_provider')<>1 OR
   (SELECT count(*) FROM provider_events e WHERE e."organizationId"=o.id AND e."providerAccountId"=o.id||'_manual_bank_provider')<>0`);
  await check('bank-reference-configuration-labelled',`SELECT o.id FROM organizations o
   LEFT JOIN provider_accounts p ON p.id=o.id||'_manual_bank_provider'
   LEFT JOIN payment_rails r ON r.id=p."paymentRailId"
   LEFT JOIN settlement_accounts s ON s.id=o.id||'_manual_bank_settlement'
   LEFT JOIN chart_of_accounts b ON b.id=p."settlementLedgerAccountId"
   LEFT JOIN chart_of_accounts a ON a.id=p."suspenseLedgerAccountId"
   WHERE p.id IS NULL OR r.id IS NULL OR s.id IS NULL OR b.id IS NULL OR a.id IS NULL
   OR r.type IS DISTINCT FROM 'BANK_TRANSFER' OR NOT r."isActive" OR r."currencyCode" IS DISTINCT FROM 'XAF'
   OR p.status IS DISTINCT FROM 'ACTIVE' OR p."archivedAt" IS NOT NULL OR p."currencyCode" IS DISTINCT FROM 'XAF'
   OR b."mappingKey" IS DISTINCT FROM 'BANK' OR NOT b."isActive" OR a."mappingKey" IS DISTINCT FROM 'SYNTHETIC_BANK_SUSPENSE' OR NOT a."isActive"
   OR s."providerAccountId" IS DISTINCT FROM p.id OR s."ledgerAccountId" IS DISTINCT FROM b.id OR s."approvalStatus" IS DISTINCT FROM 'APPROVED'
   OR s."requestedById" IS DISTINCT FROM o.id||'_user_owner' OR s."approvedById" IS DISTINCT FROM o.id||'_user_checker'
   OR s."approvedAt" IS DISTINCT FROM '2026-10-28T20:00:00Z'::timestamptz OR s."effectiveFrom" IS DISTINCT FROM '2025-11-01'::date OR s."effectiveTo" IS NOT NULL
   OR p.metadata->>'synthetic' IS DISTINCT FROM 'true' OR p.metadata->>'setupApprovalWorkflowTested' IS DISTINCT FROM 'false' OR p.metadata->>'providerCertificationClaimed' IS DISTINCT FROM 'false'
   OR r.metadata->>'documentSha256' IS DISTINCT FROM p.metadata->>'documentSha256' OR s.metadata->>'documentSha256' IS DISTINCT FROM p.metadata->>'documentSha256'`);
  await check('bank-funding-independent-and-balanced',`SELECT o.id FROM organizations o WHERE
   (SELECT count(*) FROM journal_entries e WHERE e."organizationId"=o.id AND e.reference=o.id||'-manual-bank-20261028-cash-to-bank-deposit')<>1 OR
   (SELECT count(*) FROM journal_entries e WHERE e."organizationId"=o.id AND e.reference=o.id||'-manual-bank-20261028-cash-to-bank-deposit' AND e.status='POSTED' AND e."sourceType"='MANUAL' AND e."createdById"=o.id||'_user_owner' AND e."postedById"=o.id||'_user_accountant'
    AND (SELECT count(*) FROM journal_entry_lines l WHERE l."journalEntryId"=e.id)=2
    AND (SELECT count(*) FROM journal_entry_lines l JOIN chart_of_accounts a ON a.id=l."accountId" WHERE l."journalEntryId"=e.id AND a."mappingKey"='BANK' AND l.debit=5000000 AND l.credit=0 AND l.currency='XAF')=1
    AND (SELECT count(*) FROM journal_entry_lines l JOIN chart_of_accounts a ON a.id=l."accountId" WHERE l."journalEntryId"=e.id AND a."mappingKey"='CASH_ON_HAND' AND l.credit=5000000 AND l.debit=0 AND l.currency='XAF')=1)<>1`);
  await check('bank-payment-source-and-independent-actors',`SELECT o.id FROM organizations o
   LEFT JOIN supplier_payments p ON p."organizationId"=o.id AND p.notes=o.id||'-manual-bank-20261028'
   LEFT JOIN supplier_payment_allocations a ON a."supplierPaymentId"=p.id
   LEFT JOIN supplier_invoices i ON i.id=a."supplierInvoiceId"
   LEFT JOIN ledger_posting_batches b ON b.id=p."ledgerPostingBatchId"
   WHERE p.id IS NULL OR a.id IS NULL OR i.id IS NULL OR b.id IS NULL OR p.method IS DISTINCT FROM 'BANK_TRANSFER' OR p.status NOT IN('RELEASED','POSTED') OR b.status IS DISTINCT FROM 'POSTED'
   OR p."requestedById" IS DISTINCT FROM o.id||'_user_owner' OR p."approvedById" IS DISTINCT FROM o.id||'_user_checker' OR p."releasedById" IS DISTINCT FROM o.id||'_user_accountant'
   OR p."supplierId" IS DISTINCT FROM o.id||'_supplier_0' OR i."invoiceNumber" IS DISTINCT FROM o.id||'-history-2026-03-2' OR i.status IS DISTINCT FROM 'PAID'
   OR a.amount IS DISTINCT FROM i.total OR p.amount IS DISTINCT FROM i.total OR i."amountPaid" IS DISTINCT FROM i.total
   OR (SELECT count(*) FROM supplier_payment_allocations x WHERE x."supplierPaymentId"=p.id)<>1
   OR (SELECT count(*) FROM payment_transactions t WHERE t."organizationId"=o.id AND t."sourceType"='SUPPLIER_PAYMENT' AND t."sourceId"=p.id)<>1
   OR (SELECT count(*) FROM payment_exceptions x WHERE x."organizationId"=o.id AND x."sourceType"='SUPPLIER_PAYMENT' AND x."sourceId"=p.id)<>1
   OR (SELECT count(*) FROM business_events e WHERE e."organizationId"=o.id AND e."sourceId"=p.id AND e.status='APPLIED' AND e."eventType" IN('supplier.payment.requested','supplier.payment.request_approved','supplier.payment.released','supplier.payment.execution_recorded'))<>4
   OR (SELECT count(*) FROM business_events e WHERE e."organizationId"=o.id AND e."sourceId"=p.id AND e."eventType"='supplier.payment.reconciliation_reviewed')<>3`);
  await check('bank-reconciliation-complete-retained-lineage',`SELECT o.id FROM organizations o
   LEFT JOIN supplier_payments p ON p."organizationId"=o.id AND p.notes=o.id||'-manual-bank-20261028'
   LEFT JOIN payment_transactions t ON t."organizationId"=o.id AND t."sourceType"='SUPPLIER_PAYMENT' AND t."sourceId"=p.id
   LEFT JOIN statement_files f ON f."organizationId"=o.id AND f."providerAccountId"=o.id||'_manual_bank_provider'
   LEFT JOIN statement_lines l ON l."statementFileId"=f.id
   LEFT JOIN match_records m ON m."paymentTransactionId"=t.id AND m."statementLineId"=l.id
   LEFT JOIN reconciliation_runs r ON r.id=m."reconciliationRunId"
   LEFT JOIN payment_exceptions x ON x."organizationId"=o.id AND x."paymentTransactionId"=t.id AND x."sourceType"='SUPPLIER_PAYMENT' AND x."sourceId"=p.id
   LEFT JOIN business_events e ON e.id=t.metadata->>'paymentReconciliationReceiptId'
   WHERE p.id IS NULL OR t.id IS NULL OR f.id IS NULL OR l.id IS NULL OR m.id IS NULL OR r.id IS NULL OR x.id IS NULL OR e.id IS NULL
   OR t.state IS DISTINCT FROM 'CONFIRMED' OR t.direction IS DISTINCT FROM 'OUTBOUND' OR t."providerAuthorityEventId" IS NOT NULL OR t."providerAccountId" IS DISTINCT FROM o.id||'_manual_bank_provider'
   OR t.amount IS DISTINCT FROM p.amount OR t."providerReference" IS DISTINCT FROM p.notes OR t."providerTransactionId" IS DISTINCT FROM p.notes||'-transaction' OR t."currencyCode" IS DISTINCT FROM 'XAF'
   OR f."sourceType" IS DISTINCT FROM 'SYNTHETIC_MANUAL_BANK_STATEMENT' OR f.status NOT IN('IMPORTED','PROCESSED') OR f."fileName" IS DISTINCT FROM p.notes||'-statement.csv' OR f."archivedAt" IS NOT NULL
   OR l.status IS DISTINCT FROM 'MATCHED' OR l.direction IS DISTINCT FROM 'DEBIT' OR l.amount IS DISTINCT FROM p.amount OR l."providerReference" IS DISTINCT FROM p.notes OR l."providerTransactionId" IS DISTINCT FROM t."providerTransactionId" OR l."occurredAt"::date IS DISTINCT FROM p."paymentDate"::date OR l."rawLineHash" IS NULL
   OR m.status IS DISTINCT FROM 'AUTO_MATCHED' OR m."providerEventId" IS NOT NULL OR m."amountMatched" IS DISTINCT FROM p.amount OR m."providerAccountId" IS DISTINCT FROM t."providerAccountId"
   OR r.status IS DISTINCT FROM 'SIGNED' OR r."businessDate"::date IS DISTINCT FROM '2026-10-28'::date OR r."matchCount" IS DISTINCT FROM 1 OR r."exceptionCount" IS DISTINCT FROM 0 OR r."suspenseAmount" IS DISTINCT FROM 0
   OR r."totalInternalAmount" IS DISTINCT FROM p.amount OR r."totalExternalAmount" IS DISTINCT FROM p.amount OR r."matchedAmount" IS DISTINCT FROM p.amount
   OR r."signedAt" IS NULL OR r."signedById" IS DISTINCT FROM o.id||'_user_manager' OR r."runById" IS DISTINCT FROM o.id||'_user_owner' OR r."certificateHash" IS NULL OR r."certificatePayload" IS NULL OR r."voidedAt" IS NOT NULL
   OR r."certificatePayload"->>'signedById' IS DISTINCT FROM r."signedById" OR r.metadata->>'signedSourceVersionHash' IS DISTINCT FROM r."certificatePayload"->>'sourceVersionHash'
   OR r."certificatePayload"->'evidence'->'sourceCounts'->>'paymentTransactionCount' IS DISTINCT FROM '1'
   OR r."certificatePayload"->'evidence'->'sourceCounts'->>'statementFileCount' IS DISTINCT FROM '1'
   OR r."certificatePayload"->'evidence'->'sourceCounts'->>'statementLineCount' IS DISTINCT FROM '1'
   OR r."certificatePayload"->'evidence'->'sourceCounts'->>'matchRecordCount' IS DISTINCT FROM '1'
   OR r."certificatePayload"->'evidence'->'sourceCounts'->>'providerEventCount' IS DISTINCT FROM '0'
   OR x.status IS DISTINCT FROM 'RESOLVED' OR x.metadata->>'paymentReconciliationReceiptId' IS DISTINCT FROM e.id
   OR e."eventType" IS DISTINCT FROM 'supplier.payment.reconciliation_reviewed' OR e."actorId" IS DISTINCT FROM o.id||'_user_manager' OR e.status IS DISTINCT FROM 'APPLIED'
   OR e.payload->>'status' IS DISTINCT FROM 'RECONCILED' OR e.payload->>'operation' IS DISTINCT FROM 'finalize' OR e.payload->'draft'->'evidence'->>'statementLineId' IS DISTINCT FROM l.id
   OR e.payload->'match'->>'matchId' IS DISTINCT FROM m.id OR e.payload->'match'->>'runId' IS DISTINCT FROM r.id
   OR (SELECT count(*) FROM payment_exceptions z WHERE z."reconciliationRunId"=r.id)<>0 OR (SELECT count(*) FROM suspense_items z WHERE z."reconciliationRunId"=r.id)<>0`);
  await check('cash-and-bank-closing-balances-nonnegative',`WITH required AS(SELECT o.id AS org,k.mapping FROM organizations o CROSS JOIN(VALUES('CASH_ON_HAND'),('BANK')) k(mapping))
   SELECT x.org,x.mapping FROM required x LEFT JOIN chart_of_accounts a ON a."organizationId"=x.org AND a."mappingKey"=x.mapping
   LEFT JOIN journal_entry_lines l ON l."accountId"=a.id LEFT JOIN journal_entries e ON e.id=l."journalEntryId" AND e.status='POSTED'
   GROUP BY x.org,x.mapping HAVING count(DISTINCT a.id)<>1 OR coalesce(sum(CASE WHEN e.id IS NOT NULL THEN l."baseDebit"-l."baseCredit" ELSE 0 END),0)<0`);
  await check('required-hr-structure-cardinality',`SELECT o.id FROM organizations o WHERE
   (SELECT count(*) FROM hris_positions p WHERE p."organizationId"=o.id)<>6 OR
   (SELECT count(*) FROM hris_employment_assignments a WHERE a."organizationId"=o.id)<>12 OR
   (SELECT count(*) FROM hris_reporting_relationships r WHERE r."organizationId"=o.id)<>11 OR
   (SELECT count(*) FROM hris_manager_delegations d WHERE d."organizationId"=o.id)<>1`);
  await check('hr-primary-assignments-align-to-source',`SELECT e.id FROM payroll_employees e
   LEFT JOIN hris_employment_assignments a ON a."employeeId"=e.id AND a."organizationId"=e."organizationId"
   LEFT JOIN hris_positions p ON p.id=a."positionId" LEFT JOIN hris_org_units u ON u.id=a."orgUnitId"
   WHERE a.id IS NULL OR p.id IS NULL OR u.id IS NULL OR a.type IS DISTINCT FROM 'PRIMARY' OR a.status IS DISTINCT FROM 'ACTIVE' OR p.status IS DISTINCT FROM 'ACTIVE' OR u.status IS DISTINCT FROM 'ACTIVE'
   OR a."orgUnitId" IS DISTINCT FROM p."orgUnitId" OR u.name IS DISTINCT FROM e.department OR p.title IS DISTINCT FROM e."jobTitle" OR p."locationId" IS DISTINCT FROM e."locationId"
   OR a."effectiveFrom">'2026-10-28T20:00:00Z'::timestamptz OR a."effectiveTo" IS NULL OR a."effectiveTo"<='2026-10-28T20:00:00Z'::timestamptz
   OR p."effectiveFrom" IS DISTINCT FROM '2025-11-01'::date OR p."effectiveTo" IS DISTINCT FROM '2026-11-01'::date
   OR a.id IS DISTINCT FROM e."organizationId"||'_hrref_assignment_'||e."employeeNumber"
   OR (SELECT count(*) FROM hris_employment_assignments z WHERE z."employeeId"=e.id AND z."organizationId"=e."organizationId")<>1
   OR NOT EXISTS(SELECT 1 FROM payroll_contracts c WHERE c."employeeId"=e.id AND c."organizationId"=e."organizationId" AND c.status='ACTIVE' AND c."deletedAt" IS NULL AND a."effectiveFrom">=c."effectiveFrom" AND (c."effectiveTo" IS NULL OR a."effectiveTo"<=c."effectiveTo"))`);
  await check('hr-reporting-tree-independent-reference-scope',`SELECT e.id FROM payroll_employees e
   LEFT JOIN hris_reporting_relationships r ON r."organizationId"=e."organizationId" AND r."reportEmployeeId"=e.id
   LEFT JOIN payroll_employees m ON m.id=r."managerEmployeeId"
   LEFT JOIN hris_employment_assignments ma ON ma.id=r."managerAssignmentId"
   LEFT JOIN hris_employment_assignments ra ON ra.id=r."reportAssignmentId"
   WHERE CASE WHEN e."userId"=e."organizationId"||'_user_owner' THEN r.id IS NOT NULL ELSE
    r.id IS NULL OR m.id IS NULL OR ma.id IS NULL OR ra.id IS NULL OR r.type IS DISTINCT FROM 'DIRECT' OR r.status IS DISTINCT FROM 'ACTIVE'
    OR ma."employeeId" IS DISTINCT FROM m.id OR ra."employeeId" IS DISTINCT FROM e.id OR m.id=e.id
    OR m."userId" IS DISTINCT FROM CASE WHEN e."userId"=e."organizationId"||'_user_manager' THEN e."organizationId"||'_user_owner' ELSE e."organizationId"||'_user_manager' END
    OR r."approvedById" IS DISTINCT FROM e."organizationId"||'_user_owner' OR r."supersedesRelationshipId" IS NOT NULL
    OR r."effectiveFrom" IS DISTINCT FROM greatest(ma."effectiveFrom",ra."effectiveFrom") OR r."effectiveTo" IS DISTINCT FROM least(ma."effectiveTo",ra."effectiveTo")
    OR (SELECT count(*) FROM hris_reporting_relationships z WHERE z."reportEmployeeId"=e.id AND z."organizationId"=e."organizationId")<>1 END`);
  await check('hr-delegation-bounded-people-read-reference',`SELECT o.id FROM organizations o
   LEFT JOIN hris_manager_delegations d ON d."organizationId"=o.id
   LEFT JOIN payroll_employees m ON m.id=d."delegatorEmployeeId" LEFT JOIN payroll_employees e ON e.id=d."delegateEmployeeId"
   LEFT JOIN hris_org_units u ON u.id=d."scopeOrgUnitId"
   WHERE d.id IS NULL OR m.id IS NULL OR e.id IS NULL OR u.id IS NULL OR d.id IS DISTINCT FROM o.id||'_hrref_delegation_operations-read-october'
   OR m."userId" IS DISTINCT FROM o.id||'_user_manager' OR e."userId" IS DISTINCT FROM o.id||'_user_payroll_administrator' OR m.id=e.id
   OR u.code IS DISTINCT FROM 'SYN-OPERATIONS' OR d.authority IS DISTINCT FROM 'PEOPLE_READ' OR d.status IS DISTINCT FROM 'ACTIVE'
   OR d."approvedById" IS DISTINCT FROM o.id||'_user_owner' OR d."effectiveFrom" IS DISTINCT FROM '2026-10-01'::date OR d."effectiveTo" IS DISTINCT FROM '2026-11-01'::date
   OR d."revokedAt" IS NOT NULL OR d."revocationReasonHash" IS NOT NULL OR d."supersedesDelegationId" IS NOT NULL`);
  const documentReferences=(await c.query(`SELECT e.reference||'.json' AS name,l.metadata->>'syntheticDocumentHash' AS hash FROM journal_entries e JOIN journal_entry_lines l ON l."journalEntryId"=e.id WHERE l.metadata->>'syntheticDocumentHash' IS NOT NULL
   UNION ALL SELECT "fileName","fileHash" FROM statement_files WHERE "providerAccountId"="organizationId"||'_manual_bank_provider'
   UNION ALL SELECT "organizationId"||'-manual-bank-20261028-application-certificate.json',"certificateHash" FROM reconciliation_runs WHERE "providerAccountId"="organizationId"||'_manual_bank_provider'
   UNION ALL SELECT "organizationId"||'-manual-bank-20261028-configuration.json',metadata->>'documentSha256' FROM provider_accounts WHERE "providerCode"='SYNTHETIC_MANUAL_BANK'
   UNION ALL SELECT "organizationId"||'-hr-structure-provenance.json',replace("approvalEvidenceHash",'sha256:','') FROM hris_reporting_relationships
   UNION ALL SELECT "organizationId"||'-hr-structure-reason.json',replace("reasonHash",'sha256:','') FROM hris_reporting_relationships
   UNION ALL SELECT "organizationId"||'-hr-structure-provenance.json',replace("approvalEvidenceHash",'sha256:','') FROM hris_manager_delegations
   UNION ALL SELECT "organizationId"||'-hr-structure-reason.json',replace("reasonHash",'sha256:','') FROM hris_manager_delegations`)).rows;
  const badDocuments=[];
  for(const row of documentReferences){
   if(!/^[A-Za-z0-9_-]+\.(?:json|csv)$/.test(row.name)){badDocuments.push(row.name);continue;}
   const file=path.join(OUT,'synthetic-documents',row.name);
   // Earlier fixtures retain bare SHA-256; controlled firm evidence uses the
   // explicit sha256: digest form. Both must match the same actual file bytes.
   const digest=/^(?:sha256:)?([a-f0-9]{64})$/.exec(String(row.hash));
   if(!digest||!fs.existsSync(file)||crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==digest[1])badDocuments.push(row.name);
  }
  checks.push({name:'retained-document-byte-hashes',passed:badDocuments.length===0,violationCount:badDocuments.length,violations:badDocuments.slice(0,12),documentsChecked:documentReferences.length});
  const actualHashes=new Set(fs.readdirSync(path.join(OUT,'synthetic-documents')).filter(n=>/\.(?:json|csv)$/.test(n)).map(n=>crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT,'synthetic-documents',n))).digest('hex')));
  const additionalProofs=(await c.query(`SELECT id,'stock-count' AS kind,"countSheetHash" AS hash FROM stock_count_sessions WHERE "countSheetHash" IS NOT NULL
   UNION ALL SELECT id,'supplier-invoice-document',"documentHash" FROM supplier_invoices
   UNION ALL SELECT id,'purchase-return-document',"documentHash" FROM purchase_returns
   UNION ALL SELECT id,'purchase-return-evidence',"evidenceHash" FROM purchase_returns
   UNION ALL SELECT id,'supplier-credit-document',"documentHash" FROM supplier_credit_notes
   UNION ALL SELECT id,'supplier-credit-evidence',"evidenceHash" FROM supplier_credit_notes
   UNION ALL SELECT id,'customer-collection-document',"documentHash" FROM customer_settlements
   UNION ALL SELECT id,'customer-collection-evidence',"evidenceHash" FROM customer_settlements
   UNION ALL SELECT id,'time-request',"requestEvidenceHash" FROM hris_time_requests
   UNION ALL SELECT id,'time-approval',"approvalEvidenceHash" FROM hris_time_requests WHERE "approvalEvidenceHash" IS NOT NULL
   UNION ALL SELECT id,'salary-review',"evidenceDocumentHash" FROM payroll_salary_change_requests
   UNION ALL SELECT id,'cash-review',payload->'draft'->'evidence'->>'evidenceSha256' FROM business_events WHERE "eventType"='supplier.payment.reconciliation_reviewed' AND payload->'draft'->'evidence'->>'kind'='CASH_VOUCHER'
   UNION ALL SELECT id,'delivery-fixture',"deliveryAddress"->>'documentSha256' FROM sales_orders WHERE channel='DELIVERY' AND notes LIKE 'synth12_%:delivery-fixture:v1%'
   UNION ALL SELECT id,'bank-rail-reference',metadata->>'documentSha256' FROM payment_rails WHERE code='SYNTHETIC_MANUAL_BANK'
   UNION ALL SELECT id,'bank-provider-reference',metadata->>'documentSha256' FROM provider_accounts WHERE "providerCode"='SYNTHETIC_MANUAL_BANK'
   UNION ALL SELECT id,'bank-settlement-reference',metadata->>'documentSha256' FROM settlement_accounts WHERE id="organizationId"||'_manual_bank_settlement'
   UNION ALL SELECT id,'bank-statement-csv',"fileHash" FROM statement_files WHERE "providerAccountId"="organizationId"||'_manual_bank_provider'
   UNION ALL SELECT id,'bank-payment-request',"documentHash" FROM supplier_payments WHERE notes="organizationId"||'-manual-bank-20261028'
   UNION ALL SELECT e.id,'bank-payment-execution',e.payload->>'evidenceSha256' FROM business_events e JOIN supplier_payments p ON p.id=e."sourceId" AND p."organizationId"=e."organizationId" WHERE e."eventType"='supplier.payment.execution_recorded' AND p.notes=p."organizationId"||'-manual-bank-20261028'
   UNION ALL SELECT id,'hr-reporting-provenance',"approvalEvidenceHash" FROM hris_reporting_relationships
   UNION ALL SELECT id,'hr-reporting-reason',"reasonHash" FROM hris_reporting_relationships
   UNION ALL SELECT id,'hr-delegation-provenance',"approvalEvidenceHash" FROM hris_manager_delegations
   UNION ALL SELECT id,'hr-delegation-reason',"reasonHash" FROM hris_manager_delegations`)).rows;
  const missingProofs=additionalProofs.filter(p=>!actualHashes.has(String(p.hash).replace(/^sha256:/,'')));
  checks.push({name:'additional-proof-document-byte-hashes',passed:missingProofs.length===0,violationCount:missingProofs.length,violations:missingProofs.slice(0,12),referencesChecked:additionalProofs.length});
  const certificateRows=(await c.query(`SELECT id,"certificateHash","certificatePayload" FROM reconciliation_runs WHERE "providerAccountId"="organizationId"||'_manual_bank_provider'`)).rows;
  const badCertificates=certificateRows.filter(row=>!row.certificatePayload||crypto.createHash('sha256').update(canonical(row.certificatePayload)).digest('hex')!==row.certificateHash).map(row=>row.id);
  checks.push({name:'application-reconciliation-certificate-canonical-hashes',passed:certificateRows.length===3&&badCertificates.length===0,certificatesChecked:certificateRows.length,violationCount:badCertificates.length+(certificateRows.length===3?0:1),violations:badCertificates.slice(0,12)});
  const summary={organizations:(await c.query('SELECT id,name FROM organizations ORDER BY id')).rows,history:(await c.query(`SELECT "organizationId",count(*)::int AS journals,count(DISTINCT to_char("entryDate",'YYYY-MM'))::int AS months,min("entryDate") AS first,max("entryDate") AS last FROM journal_entries WHERE status='POSTED' GROUP BY "organizationId" ORDER BY "organizationId"`)).rows,employees:(await c.query('SELECT "organizationId",status,count(*)::int AS count FROM payroll_employees GROUP BY "organizationId",status ORDER BY "organizationId",status')).rows,attendance:(await c.query(`SELECT "organizationId",count(*)::int AS entries,count(DISTINCT to_char("workDate",'YYYY-MM'))::int AS months FROM hris_time_entries GROUP BY "organizationId" ORDER BY "organizationId"`)).rows};
  const counts=[];for(const {tablename}of(await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows)counts.push({table:tablename,count:Number((await c.query(`SELECT count(*)::text AS n FROM ${q(tablename)}`)).rows[0].n)});
  const totals=(await c.query(`SELECT e."organizationId",a.code,sum(l."baseDebit")::text AS debit,sum(l."baseCredit")::text AS credit FROM journal_entries e JOIN journal_entry_lines l ON l."journalEntryId"=e.id JOIN chart_of_accounts a ON a.id=l."accountId" WHERE e.status='POSTED' GROUP BY e."organizationId",a.code ORDER BY e."organizationId",a.code`)).rows;
  const remaining=await require('./verify-disposable-remaining.cjs').verifyRemaining(c,{OUT,checks,check,counts});
  const report={generatedAt:new Date().toISOString(),database:manifest.target.database,passed:checks.every(x=>x.passed),checkCount:checks.length,failed:checks.filter(x=>!x.passed),summary,counts,totals,checks,remaining};
  const fingerprintTables=['organizations','locations','users','roles','items','categories','brands','item_suppliers','customer_locations','customers','suppliers','inventory_levels','inventory_transactions','journal_entries','journal_entry_lines','purchase_orders','purchase_order_lines','goods_receipts','goods_receipt_lines','supplier_invoices','supplier_invoice_lines','supplier_payments','supplier_payment_allocations','sales_orders','sales_order_lines','pos_commit_results','payroll_employees','payroll_contracts','hris_time_entries','stock_transfers','stock_transfer_lines','stock_count_sessions','stock_count_lines','stock_adjustments','stock_adjustment_lines','purchase_returns','purchase_return_lines','supplier_credit_notes','supplier_credit_note_lines','customer_settlements','customer_settlement_allocations','customer_ledger_entries','customer_receivable_documents','hris_leave_balance_entries','hris_time_requests','payroll_salary_change_requests'];
  fingerprintTables.push('hris_org_units','tax_rates','delivery_reservations','delivery_reservation_lines','delivery_goods_issues','delivery_goods_issue_lines','delivery_billing_outcomes','delivery_billing_lines','fiscal_documents','fiscal_document_lines','compliance_submissions');
  fingerprintTables.push('customer_receivable_document_states','ledger_posting_batches','accounting_source_links');
  fingerprintTables.push('chart_of_accounts','payment_rails','provider_accounts','settlement_accounts','provider_events','statement_files','statement_lines','payment_transactions','match_records','reconciliation_runs','payment_exceptions','suspense_items','payment_reconciliation_inbox_items','business_events','hris_positions','hris_employment_assignments','hris_reporting_relationships','hris_manager_delegations');
  fingerprintTables.push(...remaining.fingerprintTables);
  const businessCounts=counts.filter(x=>fingerprintTables.includes(x.table));
  report.fingerprintTables=businessCounts.map(x=>x.table);
  const businessStates={
   inventory:(await c.query('SELECT "itemId","locationId","quantityOnHand"::text,"quantityAvailable"::text,"quantityReserved"::text,"averageCost"::text,"totalValue"::text FROM inventory_levels ORDER BY "itemId","locationId"')).rows,
   sales:(await c.query('SELECT id,status,"paymentStatus","orderDate",total::text,"customerId" FROM sales_orders ORDER BY id')).rows,
   invoices:(await c.query('SELECT id,status,"invoiceDate",total::text,"amountPaid"::text FROM supplier_invoices ORDER BY id')).rows,
   timeRequests:(await c.query('SELECT id,status,"sourceHash" FROM hris_time_requests ORDER BY id')).rows,
   transfers:(await c.query('SELECT id,status FROM stock_transfers ORDER BY id')).rows,
   salaryReviews:(await c.query('SELECT id,status,"currentBaseSalary"::text,"proposedBaseSalary"::text,"effectiveFrom" FROM payroll_salary_change_requests ORDER BY id')).rows,
   cashReview:(await c.query("SELECT id,\"payloadHash\" FROM business_events WHERE \"eventType\"='supplier.payment.reconciliation_reviewed' ORDER BY id")).rows,
  };
  // Reference and financial states are business evidence. Retry counters,
  // operational timestamps and read-audit records are intentionally excluded.
  for(const table of ['payment_rails','provider_accounts','settlement_accounts','provider_events','statement_files','statement_lines','payment_transactions','match_records','reconciliation_runs','payment_exceptions','suspense_items','hris_org_units','hris_positions','hris_employment_assignments','hris_reporting_relationships','hris_manager_delegations','delivery_reservations','delivery_reservation_lines','delivery_goods_issues','delivery_goods_issue_lines','delivery_billing_outcomes','delivery_billing_lines']){
   businessStates[table]=(await c.query(`SELECT to_jsonb(t)-'createdAt'-'updatedAt' AS row FROM ${q(table)} t ORDER BY t.id`)).rows;
  }
  // Preserve complete delivery source and downstream evidence, including business
  // dates, snapshots and hashes; only row-maintenance timestamps are excluded.
  const deliveryStateSources={
   deliveryOrders:'sales_orders t JOIN orders s ON s.id=t.id',
   deliveryOrderLines:'sales_order_lines t JOIN orders s ON s.id=t."salesOrderId"',
   deliveryStock:'inventory_transactions t JOIN sales_order_lines l ON l.id=t."referenceId" JOIN orders s ON s.id=l."salesOrderId" WHERE t."referenceType"=\'SALES_ORDER\'',
   deliveryJournals:'journal_entries t WHERE t."sourceType" IN(\'DELIVERY_GOODS_ISSUE\',\'DELIVERY_INVOICE\')',
   deliveryJournalLines:'journal_entry_lines t JOIN journal_entries j ON j.id=t."journalEntryId" WHERE j."sourceType" IN(\'DELIVERY_GOODS_ISSUE\',\'DELIVERY_INVOICE\')',
   deliveryPostingBatches:'ledger_posting_batches t WHERE t."sourceType" IN(\'DELIVERY_GOODS_ISSUE\',\'DELIVERY_INVOICE\')',
   deliveryAccountingSources:'accounting_source_links t WHERE t."sourceType" IN(\'DELIVERY_GOODS_ISSUE\',\'DELIVERY_INVOICE\')',
   deliveryReceivables:'customer_receivable_documents t JOIN orders s ON s.id=t."sourceSalesOrderId"',
   deliveryReceivableStates:'customer_receivable_document_states t JOIN customer_receivable_documents d ON d.id=t."documentId" JOIN orders s ON s.id=d."sourceSalesOrderId"',
   deliveryCustomerLedger:'customer_ledger_entries t JOIN customer_receivable_documents d ON d.id=t."referenceId" JOIN orders s ON s.id=d."sourceSalesOrderId" WHERE t."referenceType"=\'CUSTOMER_RECEIVABLE_DOCUMENT\'',
  };
  for(const [name,source] of Object.entries(deliveryStateSources)){
   businessStates[name]=(await c.query(`WITH orders AS(${deliveryOrders}) SELECT to_jsonb(t)-'createdAt'-'updatedAt' AS row FROM ${source} ORDER BY t.id`)).rows;
  }
  businessStates.bankFunding=(await c.query(`SELECT to_jsonb(e)-'createdAt'-'updatedAt' AS row FROM journal_entries e WHERE reference="organizationId"||'-manual-bank-20261028-cash-to-bank-deposit' ORDER BY id`)).rows;
  businessStates.paymentInbox=(await c.query('SELECT id,"organizationId","providerAccountId",source,status,"idempotencyKey","externalId","payloadHash","payloadSummary" FROM payment_reconciliation_inbox_items ORDER BY id')).rows;
  businessStates.businessEvents=(await c.query('SELECT id,"organizationId","eventType","eventSource",status,"sourceType","sourceId","actorId","payloadHash","documentHash","postingBatchId" FROM business_events ORDER BY id')).rows;
  Object.assign(businessStates,remaining.businessStates);
  delete remaining.businessStates; // Detailed rows feed hashes, not the public summary.
  report.businessStateFingerprint=crypto.createHash('sha256').update(JSON.stringify(businessStates)).digest('hex');
  report.businessStateComponentFingerprints=Object.fromEntries(Object.entries(businessStates).map(([name,state])=>[name,{rows:state.length,sha256:crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex')}]));
  report.businessFingerprint=crypto.createHash('sha256').update(JSON.stringify({businessCounts,totals,state:report.businessStateFingerprint})).digest('hex');
  fs.writeFileSync(path.join(OUT,'verification.json'),JSON.stringify(report,null,2)+'\n');
  await c.query('ROLLBACK');console.log(JSON.stringify({passed:report.passed,checkCount:checks.length,failed:report.failed,summary}));if(!report.passed)process.exitCode=1;
 }finally{await c.end();}
}
main().catch(e=>{console.error(e.message||e.code);process.exitCode=1;});
