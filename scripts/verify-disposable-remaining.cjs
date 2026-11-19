// Called inside the main verifier's repeatable-read, read-only transaction.
// No application imports, network dispatch, or database writes.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const CORE=['synth12_douala','synth12_yaounde','synth12_bafoussam'];
const coreSql="(VALUES('synth12_douala'),('synth12_yaounde'),('synth12_bafoussam'))";
const q=s=>'"'+s.replaceAll('"','""')+'"';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const canonical=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(canonical).join(',')+']':'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
const READ_AUDIT_TABLES=new Set(['customer_statement_access_logs','supplier_po_access_logs']);
const OPERATIONAL_FIELDS={
  customer_statement_access_tokens:['lastAccessedAt','accessCount'],
  supplier_po_access_tokens:['lastAccessedAt','accessCount'],
  public_receipt_access_tokens:['lastAccessedAt','accessCount'],
};
// These services intentionally audit an authorized firm actor in the client's
// tenant: obligation-register, review-workpaper and advisory-outcomes. Match the
// retained command/revision and its exact consented mandate, never just an action
// name or an actor's home organization. Other cross-tenant audit actors still fail.
// Authority contract: close-evidence-acceptance-authority.service.ts and
// managed-accountant-access.service.ts. c = audit row; p = its actor user.
const delegatedAuditActorSql=`EXISTS (
 SELECT 1 FROM accountant_access_grants g
 JOIN users consent ON consent.id=g."consentGrantedById" AND consent."organizationId"=g."organizationId"
 JOIN firm_engagement_grant_links l ON l."grantId"=g.id AND l."clientOrganizationId"=g."organizationId" AND l."accountantUserId"=g."accountantUserId"
 JOIN firm_engagements e ON e.id=l."engagementId" AND e."firmOrganizationId"=l."firmOrganizationId" AND e."clientOrganizationId"=l."clientOrganizationId"
 JOIN firm_engagement_assignments a ON a."engagementId"=e.id AND a."firmOrganizationId"=e."firmOrganizationId" AND a."clientOrganizationId"=e."clientOrganizationId" AND a."accountantUserId"=g."accountantUserId"
 JOIN firm_engagement_transitions t ON t.id=e."lastTransitionId" AND t."engagementId"=e.id AND t."toStatus"='ACTIVE'
 JOIN business_events grant_event ON grant_event."organizationId"=g."organizationId" AND grant_event."sourceId"=g.id
  AND grant_event."eventType"='ACCOUNTANT_ACCESS_GRANTED' AND grant_event."eventSource"='INTERNAL'
  AND grant_event."actorId"=g."consentGrantedById" AND grant_event."documentHash"=g."consentEvidenceHash"
  AND grant_event.payload->>'grantId'=g.id AND grant_event.payload->>'accountantUserId'=g."accountantUserId" AND grant_event.payload->>'role'=g.role::text
 JOIN business_events command_event ON command_event."organizationId"=g."organizationId" AND command_event."sourceId"=g.id
  AND command_event."eventType"='ACCOUNTANT_ACCESS_GRANT_COMMAND_APPLIED' AND command_event.status='APPLIED'
  AND command_event."actorId"=g."consentGrantedById" AND command_event.payload->>'grantId'=g.id
 WHERE g."organizationId"=c."organizationId" AND g."accountantUserId"=c."userId" AND e."firmOrganizationId"=p."organizationId"
  AND g."activeScopeKey"='managed:'||c."organizationId"||':'||c."userId"
  AND g.status='ACTIVE' AND g.role IN ('PREPARER','REVIEWER') AND g."revokedAt" IS NULL AND g."revokedById" IS NULL
  AND g."effectiveFrom"<=c."createdAt" AND g."expiresAt">c."createdAt" AND g."consentGrantedAt"<=c."createdAt"
  AND e.status='ACTIVE' AND e.scope IN ('PREPARER','REVIEWER') AND e."effectiveFrom"<=c."createdAt" AND e."expiresAt">c."createdAt"
  AND a.scope IN ('PREPARER','REVIEWER') AND a."endedAt" IS NULL AND a."effectiveFrom"<=c."createdAt" AND a."expiresAt">c."createdAt"
  AND l."enrolledAt"<=c."createdAt" AND a."createdAt"<=c."createdAt" AND t."createdAt"<=c."createdAt"
  AND (
   (c."entityType"='FirmObligation' AND c.action='OBLIGATION_REVISION_RECORDED' AND EXISTS (
    SELECT 1 FROM firm_obligation_revisions r WHERE r."organizationId"=c."organizationId" AND r."instanceId"=c."entityId"
     AND r."actorId"=c."userId" AND r.version::text=c.changes->>'version' AND r."commandHash"=c.changes->>'commandHash'
     AND r."sourceHash"=c.changes->>'sourceHash' AND r."createdAt"<=c."createdAt"
     AND r.decision=CASE c.changes->>'command' WHEN 'SAVE' THEN 'PREPARED' WHEN 'REVIEW' THEN 'REVIEWED' WHEN 'CHANGES_REQUESTED' THEN 'CHANGES_REQUESTED' END))
   OR (c."entityType"='AccountantReview' AND c.action='WORKPAPER_DECISION' AND EXISTS (
    SELECT 1 FROM accountant_reviews r WHERE r.id=c."entityId" AND r."organizationId"=c."organizationId"
     AND r."reviewerId"=c."userId" AND r."openedById"=c."userId" AND r.metadata->>'kind'='review-workpaper-v1'
     AND r.metadata->>'sourceHash'=c.changes->>'sourceHash' AND r.metadata->>'commandHash'=c.changes->>'commandHash'
     AND r.metadata->>'decision'=c.changes->>'decision' AND r."createdAt"<=c."createdAt"))
   OR (c."entityType"='FirmAdvisoryRevision' AND c.action IN ('ADVISORY_DRAFT','ADVISORY_REVIEW','ADVISORY_CHANGES_REQUESTED','ADVISORY_DELIVER') AND EXISTS (
    SELECT 1 FROM firm_advisory_revisions r WHERE r.id=c."entityId" AND r."clientOrganizationId"=c."organizationId"
     AND r."firmOrganizationId"=p."organizationId" AND r."actorId"=c."userId" AND r."engagementId"=e.id
     AND r."engagementId"=c.changes->>'engagementId' AND r.version::text=c.changes->>'version'
     AND r."contentHash"=c.changes->>'contentHash' AND r.state=c.changes->>'state' AND r."createdAt"<=c."createdAt"
     AND r.state=CASE c.action WHEN 'ADVISORY_DRAFT' THEN 'DRAFT' WHEN 'ADVISORY_REVIEW' THEN 'REVIEWED' WHEN 'ADVISORY_CHANGES_REQUESTED' THEN 'CHANGES_REQUESTED' WHEN 'ADVISORY_DELIVER' THEN 'DELIVERED' END))
  )
)`;
async function verifyDerivedReports(check){
 await check('remaining-derived-expense-cardinality',`SELECT o.id FROM ${coreSql} o(id) WHERE
  (SELECT count(*) FROM expenses e WHERE e."organizationId"=o.id)<>72
  OR (SELECT count(*) FROM expense_categories e WHERE e."organizationId"=o.id)<>2
  OR (SELECT count(DISTINCT to_char(e."expenseDate",'YYYY-MM')) FROM expenses e WHERE e."organizationId"=o.id)<>12`);
 await check('remaining-derived-expense-source-journals',`SELECT e.id FROM expenses e
  LEFT JOIN journal_entries j ON j.id=e.notes::jsonb->>'journalEntryId' AND j."organizationId"=e."organizationId"
  LEFT JOIN LATERAL(SELECT count(*) AS n,sum(l.debit) AS amount,min(l."locationId") AS location FROM journal_entry_lines l WHERE l."journalEntryId"=j.id AND l.debit>0) x ON true
  WHERE j.id IS NULL OR j.status<>'POSTED' OR e.notes::jsonb->>'classification' IS DISTINCT FROM 'SYNTHETIC_DERIVED_PROJECTION'
   OR e.notes::jsonb->>'additionalLedgerPostingPerformed' IS DISTINCT FROM 'false'
   OR e.notes::jsonb->>'sourceReference' IS DISTINCT FROM j.reference OR e."expenseNumber" IS DISTINCT FROM 'SYN-'||j.reference
   OR x.n<>1 OR e.amount IS DISTINCT FROM x.amount OR e."locationId" IS DISTINCT FROM x.location
   OR e."expenseDate" IS DISTINCT FROM j."entryDate" OR e."paymentMethod"<>'CASH'
   OR e."categoryId" IS DISTINCT FROM e."organizationId"||'_expense_'||CASE WHEN j.reference LIKE '%-rent-%' THEN 'rent' WHEN j.reference LIKE '%-utilities-%' THEN 'utilities' END`);
 await check('remaining-derived-daily-report-cardinality',`WITH expected AS(
  SELECT o.id||'_daily_'||to_char(month,'YYYY-MM')||'_'||branch AS id,o.id AS org,o.id||'_loc_'||branch AS location,month::date AS day
  FROM ${coreSql} o(id) CROSS JOIN generate_series('2025-11-10'::timestamp,'2026-10-10'::timestamp,interval '1 month') month CROSS JOIN generate_series(0,1) branch)
  SELECT coalesce(e.id,r.id) AS id FROM expected e FULL JOIN daily_sales_reports r ON r.id=e.id
  WHERE e.id IS NULL OR r.id IS NULL OR r."organizationId"<>e.org OR r."locationId"<>e.location OR r.date<>e.day
   OR (SELECT count(*) FROM daily_sales_report_items i WHERE i."reportId"=r.id)<>12
   OR (SELECT count(DISTINCT i."itemId") FROM daily_sales_report_items i WHERE i."reportId"=r.id)<>12`);
 await check('remaining-derived-daily-report-sale-lineage',`SELECT r.id FROM daily_sales_reports r
  LEFT JOIN pos_sessions s ON s.id=r.notes::jsonb->>'sessionId'
  LEFT JOIN LATERAL(SELECT count(*) AS n,jsonb_agg(o.id ORDER BY o.id) AS ids FROM sales_orders o WHERE o."sessionId"=s.id AND o.status='COMPLETED') x ON true
  WHERE s.id IS NULL OR s.status<>'CLOSED' OR s."organizationId"<>r."organizationId" OR s."locationId"<>r."locationId"
   OR s."terminalId" IS DISTINCT FROM r."organizationId"||'_hist_'||to_char(r.date,'YYYY-MM')||'_'||right(r."locationId",1)
   OR r.notes::jsonb->>'classification' IS DISTINCT FROM 'SYNTHETIC_DERIVED_PROJECTION'
   OR r.notes::jsonb->>'additionalFinancialPostingPerformed' IS DISTINCT FROM 'false' OR x.n<>6
   OR x.ids IS DISTINCT FROM (SELECT jsonb_agg(id ORDER BY id) FROM jsonb_array_elements_text(r.notes::jsonb->'sourceSaleIds') ids(id))
   OR EXISTS(SELECT 1 FROM sales_orders o WHERE o."sessionId"=s.id AND (o.status<>'COMPLETED' OR o."organizationId"<>r."organizationId" OR o."locationId"<>r."locationId" OR o."orderDate"::date<>r.date OR o."paymentStatus"<>'PAID'
    OR NOT EXISTS(SELECT 1 FROM payments p WHERE p."salesOrderId"=o.id)
    OR EXISTS(SELECT 1 FROM payments p WHERE p."salesOrderId"=o.id AND (p.method<>'CASH' OR p.status<>'PAID' OR p."refundedAmount"<>0))
    OR o.total IS DISTINCT FROM (SELECT sum(p.amount) FROM payments p WHERE p."salesOrderId"=o.id)))`);
 await check('remaining-derived-daily-item-source-values',`SELECT i.id FROM daily_sales_report_items i JOIN daily_sales_reports r ON r.id=i."reportId" JOIN items item ON item.id=i."itemId"
  LEFT JOIN LATERAL(SELECT sum(l.quantity) AS quantity,sum(l."lineTotal") AS revenue FROM sales_orders o JOIN sales_order_lines l ON l."salesOrderId"=o.id
   WHERE o."sessionId"=r.notes::jsonb->>'sessionId' AND o.status='COMPLETED' AND l."itemId"=i."itemId") x ON true
  LEFT JOIN LATERAL(SELECT coalesce(sum(t.quantity) FILTER(WHERE t."effectiveAt"<r.date),0) AS opening,coalesce(sum(t.quantity),0) AS closing
   FROM inventory_transactions t WHERE t."organizationId"=r."organizationId" AND t."locationId"=r."locationId" AND t."itemId"=i."itemId"
    AND t."effectiveAt"<r.date+interval '1 day' AND t.type NOT IN ('RESERVATION','RESERVATION_RELEASE')) stock ON true
  WHERE x.quantity IS NULL OR i."quantitySold" IS DISTINCT FROM x.quantity OR i."totalRevenue" IS DISTINCT FROM x.revenue
   OR i."costPrice"<>item."costPrice" OR i."totalCost" IS DISTINCT FROM round(x.quantity*item."costPrice",2)
   OR i."sellingPrice" IS DISTINCT FROM round(x.revenue/nullif(x.quantity,0),2)
   OR i."grossProfit" IS DISTINCT FROM x.revenue-round(x.quantity*item."costPrice",2)
   OR i.margin IS DISTINCT FROM coalesce(round((x.revenue-x.quantity*item."costPrice")/nullif(x.revenue,0)*100,2),0)
   OR i."startingQuantity"<>stock.opening OR i."endingQuantity"<>stock.closing
   OR i."cashSales" IS DISTINCT FROM x.revenue OR i."cardSales"<>0 OR i."mobileMoneySales"<>0 OR i."bankTransferSales"<>0 OR i."creditSales"<>0`);
 await check('remaining-derived-daily-report-source-totals',`SELECT r.id FROM daily_sales_reports r
  LEFT JOIN LATERAL(SELECT count(*) AS transactions,sum(o.total) AS revenue FROM sales_orders o WHERE o."sessionId"=r.notes::jsonb->>'sessionId' AND o.status='COMPLETED') sales ON true
  LEFT JOIN LATERAL(SELECT count(DISTINCT l."itemId") AS items,sum(l.quantity) AS quantity,sum(l.quantity*i."costPrice") AS cost FROM sales_orders o
   JOIN sales_order_lines l ON l."salesOrderId"=o.id JOIN items i ON i.id=l."itemId" WHERE o."sessionId"=r.notes::jsonb->>'sessionId' AND o.status='COMPLETED') lines ON true
  LEFT JOIN LATERAL(SELECT coalesce(sum(e.amount),0) AS amount FROM expenses e WHERE e."organizationId"=r."organizationId" AND e."locationId"=r."locationId" AND e."expenseDate">=r.date AND e."expenseDate"<r.date+interval '1 day') expenses ON true
  WHERE r."totalRevenue" IS DISTINCT FROM sales.revenue OR r."totalTransactions"<>sales.transactions OR r."itemsSold"<>lines.items
   OR r."totalQuantitySold" IS DISTINCT FROM lines.quantity OR r."totalCost" IS DISTINCT FROM round(lines.cost,2)
   OR r."grossProfit" IS DISTINCT FROM sales.revenue-round(lines.cost,2)
   OR r."grossMargin" IS DISTINCT FROM coalesce(round((sales.revenue-lines.cost)/nullif(sales.revenue,0)*100,2),0)
   OR r."averageTransactionValue" IS DISTINCT FROM round(sales.revenue/nullif(sales.transactions,0),2)
   OR r."totalExpenses"<>expenses.amount OR r."netProfit" IS DISTINCT FROM sales.revenue-round(lines.cost,2)-expenses.amount
   OR r."cashSales" IS DISTINCT FROM sales.revenue OR r."cardSales"<>0 OR r."mobileMoneySales"<>0 OR r."bankTransferSales"<>0 OR r."creditSales"<>0`);
 await check('remaining-derived-daily-cash-event-lineage',`SELECT e.id FROM daily_sales_report_cash_events e JOIN daily_sales_reports r ON r.id=e."reportId"
  LEFT JOIN cash_drawer_transactions t ON e.notes='Derived from cash drawer transaction '||t.id AND t."sessionId"=r.notes::jsonb->>'sessionId'
  LEFT JOIN users u ON u.id=t."userId"
  WHERE t.id IS NULL OR e.id IS DISTINCT FROM r.id||'_'||t.id OR e."transactionType" IS DISTINCT FROM t.type OR e.amount IS DISTINCT FROM t.amount
   OR e.reason IS DISTINCT FROM t.reason OR e."balanceBefore" IS DISTINCT FROM t."balanceBefore" OR e."balanceAfter" IS DISTINCT FROM t."balanceAfter"
   OR e.timestamp IS DISTINCT FROM t."createdAt" OR e."userId" IS DISTINCT FROM t."userId" OR e."userName" IS DISTINCT FROM u.name`);
 await check('remaining-derived-daily-cash-source-totals',`SELECT r.id FROM daily_sales_reports r JOIN pos_sessions s ON s.id=r.notes::jsonb->>'sessionId'
  LEFT JOIN LATERAL(SELECT count(*) AS n,coalesce(sum(greatest(0,t."balanceAfter"-t."balanceBefore")),0) AS income,coalesce(sum(greatest(0,t."balanceBefore"-t."balanceAfter")),0) AS outgoing FROM cash_drawer_transactions t WHERE t."sessionId"=s.id) x ON true
  WHERE x.n<>(SELECT count(*) FROM daily_sales_report_cash_events e WHERE e."reportId"=r.id)
   OR r."openingBalance" IS DISTINCT FROM s."openingBalance" OR r."closingBalance" IS DISTINCT FROM s."closingBalance"
   OR r.variance IS DISTINCT FROM s.variance OR r."cashIn"<>x.income OR r."cashOut"<>x.outgoing`);
}
async function verifyCleanFundedClose(c,OUT,check,add){
 const org='synth12_close_aux',periodId=org+'_period_2026_08';
 await check('remaining-funded-close-reference-footprint',`SELECT 'funded close footprint' AS issue WHERE
  (SELECT count(*) FROM users WHERE "organizationId"='${org}')<>2
  OR (SELECT count(*) FROM locations WHERE "organizationId"='${org}')<>0
  OR (SELECT count(*) FROM payroll_employees WHERE "organizationId"='${org}')<>0
  OR (SELECT count(*) FROM provider_accounts WHERE "organizationId"='${org}')<>0
  OR (SELECT count(*) FROM chart_of_accounts WHERE "organizationId"='${org}')<>19
  OR (SELECT count(*) FROM journals WHERE "organizationId"='${org}')<>8
  OR (SELECT count(*) FROM journal_entries WHERE "organizationId"='${org}')<>1
  OR (SELECT count(*) FROM fiscal_years WHERE "organizationId"='${org}')<>1
  OR (SELECT count(*) FROM accounting_periods WHERE "organizationId"='${org}')<>2`);
 await check('remaining-funded-close-independent-capital-journal',`SELECT 'funding journal' AS issue WHERE NOT EXISTS(
  SELECT 1 FROM journal_entries e WHERE e."organizationId"='${org}' AND e.reference='${org}-owner-contribution-20260815'
   AND e.status='POSTED' AND e."entryDate"='2026-08-15T12:00:00'::timestamp AND e."periodId"='${periodId}'
   AND e."createdById"='${org}_user_owner' AND e."postedById"='${org}_user_checker' AND e."createdById"<>e."postedById"
   AND (SELECT count(*) FROM journal_entry_lines l WHERE l."journalEntryId"=e.id)=2
   AND EXISTS(SELECT 1 FROM journal_entry_lines l JOIN chart_of_accounts a ON a.id=l."accountId" WHERE l."journalEntryId"=e.id AND a."mappingKey"='CASH_ON_HAND' AND l.debit=1000000 AND l.credit=0 AND l.currency='XAF' AND l.metadata->>'syntheticDocumentHash'~'^sha256:[a-f0-9]{64}$')
   AND EXISTS(SELECT 1 FROM journal_entry_lines l JOIN chart_of_accounts a ON a.id=l."accountId" WHERE l."journalEntryId"=e.id AND a."mappingKey"='OWNER_CAPITAL' AND l.credit=1000000 AND l.debit=0 AND l.currency='XAF'))`);
 await check('remaining-funded-close-independent-account-support',`WITH latest AS(SELECT DISTINCT ON("ledgerAccountId") * FROM balance_sheet_evidence
   WHERE "organizationId"='${org}' AND "periodId"='${periodId}' AND currency='XAF' ORDER BY "ledgerAccountId","createdAt" DESC,id DESC)
  SELECT a.id FROM chart_of_accounts a LEFT JOIN latest e ON e."ledgerAccountId"=a.id
  WHERE a."organizationId"='${org}' AND a.type IN ('ASSET','LIABILITY','EQUITY') AND
   (e.id IS NULL OR e.status<>'APPROVED' OR e."proposedById"<>'${org}_user_owner' OR e."approvedById" IS DISTINCT FROM '${org}_user_checker'
    OR e."approvedAt" IS NULL OR e."revokedAt" IS NOT NULL OR e."revokedById" IS NOT NULL
    OR e.input->>'basis' IS DISTINCT FROM CASE WHEN a."mappingKey" IN ('CASH_ON_HAND','OWNER_CAPITAL') THEN 'SUPPORTING_SCHEDULE' ELSE 'ZERO_ACTIVITY' END
    OR e.snapshot->'balances'->>'balanced' IS DISTINCT FROM 'true'
    OR (e.snapshot->'balances'->'ledger'->>'openingBalance')::numeric IS DISTINCT FROM 0
    OR (e.snapshot->'balances'->'ledger'->>'reductions')::numeric IS DISTINCT FROM 0
    OR (e.snapshot->'balances'->'ledger'->>'additions')::numeric IS DISTINCT FROM CASE WHEN a."mappingKey" IN ('CASH_ON_HAND','OWNER_CAPITAL') THEN 1000000 ELSE 0 END
    OR (e.snapshot->'balances'->'ledger'->>'closingBalance')::numeric IS DISTINCT FROM CASE WHEN a."mappingKey" IN ('CASH_ON_HAND','OWNER_CAPITAL') THEN 1000000 ELSE 0 END)`);
 // Closing the period is itself a source change. Verify the accepted immutable
 // approval and seal, not eligibility to issue another certificate afterward.
 await check('remaining-funded-close-period-seal-and-approval',`SELECT 'independent retained period seal' AS issue WHERE NOT EXISTS(
  SELECT 1 FROM accounting_periods p JOIN period_control_events e ON e.id=p."lastControlEventId" AND e."periodId"=p.id AND e."organizationId"=p."organizationId"
  JOIN close_runs r ON r.id=e.approval->>'closeRunId' AND r."periodId"=p.id AND r."organizationId"=p."organizationId"
  JOIN close_pack_exports x ON x.id=e.approval->>'certifiedExportId' AND x."closeRunId"=r.id AND x."periodId"=p.id AND x."organizationId"=p."organizationId"
  WHERE p.id='${periodId}' AND p."organizationId"='${org}' AND p.status='CLOSED' AND p."controlVersion"=1
   AND p."closedById"='${org}_user_checker' AND p."closedAt"=e."createdAt" AND p."lockedAt"=e."createdAt"
   AND e.operation='CLOSE' AND e.version=p."controlVersion" AND e."fromStatus"='OPEN' AND e."toStatus"='CLOSED'
   AND e."actorId"=p."closedById" AND e."sourceRevision"=e.approval->>'sourceRevision'
   AND e.approval->>'contentHash'=x."contentHash" AND e.approval->>'approvedById'=x."exportedById" AND e.approval->>'preparedById'=r."runById"
   AND r."runById"='${org}_user_owner' AND r."voidedAt" IS NULL AND r."highBlockerCount"=0 AND r."criticalBlockerCount"=0
   AND x."isCertified" AND x."exportedById"='${org}_user_checker' AND x."exportedById"<>r."runById"
   AND x.metadata->>'mode'='CERTIFIED' AND x.metadata->>'trustLevel'='T4'
   AND r."completedAt"<=x."exportedAt" AND x."exportedAt"<=e."createdAt"
   AND (SELECT count(*) FROM period_control_events z WHERE z."organizationId"='${org}' AND z."periodId"=p.id)=1)`);
 await check('remaining-funded-close-operating-periods-stay-open',`SELECT id FROM accounting_periods WHERE "organizationId" IN ('synth12_douala','synth12_yaounde','synth12_bafoussam','${org}') AND name LIKE '2026-10%' AND status<>'OPEN'`);
 const approvals=(await c.query(`SELECT e.id,e.approval,x."contentHash",x."closeRunId",x."exportedById",x."watermarkId",x."rowCount",x."exportedAt" FROM period_control_events e
  JOIN close_pack_exports x ON x.id=e.approval->>'certifiedExportId' WHERE e."organizationId"=$1 AND e."periodId"=$2 AND e.operation='CLOSE'`,[org,periodId])).rows;
 const file=path.join(OUT,'synthetic-documents',org+'-august-certified-close-pack.json'),violations=[];
 if(approvals.length!==1||!fs.existsSync(file))violations.push({reason:'Exactly one seal and its retained certified artifact are required'});
 else{
  const document=JSON.parse(fs.readFileSync(file,'utf8')),row=approvals[0],payload=JSON.parse(JSON.stringify(document));
  const declared=payload.export?.contentHash;if(payload.export)delete payload.export.contentHash;
  if(declared!==row.contentHash||'sha256:'+sha(canonical(payload))!==row.contentHash)violations.push({reason:'Retained certificate canonical payload hash differs'});
  if(document.organization?.id!==org||document.period?.id!==periodId||document.period.status!=='OPEN'||document.closeRun?.id!==row.closeRunId
   ||document.closeRun.runById!==org+'_user_owner'||document.export?.generatedById!==row.exportedById||document.export.generatedById!==org+'_user_checker'
   ||document.export.mode!=='CERTIFIED'||document.export.watermarkId!==row.watermarkId||document.summaries?.rowCount!==row.rowCount
   ||Date.parse(document.export.generatedAt)!==new Date(row.exportedAt).getTime()
   ||document.closeRun.metadata?.trustLevel!=='T4'||document.evidenceSummaries?.dataTrust?.closeRunTrustLevel!=='T4'
   ||document.certificationScope?.systemEvidenceStatus!=='SYSTEM_EVIDENCE_ONLY'||document.certificationScope?.statutoryAuthorityStatus!=='AUTHORITY_NOT_CONFIGURED'
   ||document.certificationScope?.statutoryReadinessStatus!=='STATUTORY_BLOCKED'||document.export.certificationBlockers?.length!==0)
   violations.push({reason:'Retained T4 certificate scope, actors or seal lineage differs'});
 }
 add('remaining-funded-close-retained-canonical-certificate',violations,{certificatesChecked:approvals.length});
}
// Independently inspect persisted bytes and SQL metadata. This does not call the
// media service or imply ordinary application routes use the local test transport.
async function verifyPictureAssets(c,OUT,check,add){
 await check('remaining-picture-exact-tenant-lifecycle',`SELECT o.id FROM ${coreSql} o(id) WHERE
  (SELECT count(*) FROM picture_assets p WHERE p."organizationId"=o.id)<>2 OR
  (SELECT count(*) FROM picture_assets p WHERE p."organizationId"=o.id AND p.status='ready' AND p."attachedAt" IS NOT NULL)<>1 OR
  (SELECT count(*) FROM picture_assets p WHERE p."organizationId"=o.id AND p.status='deleted' AND p."attachedAt" IS NULL)<>1
  UNION ALL SELECT p.id FROM picture_assets p LEFT JOIN users u ON u.id=p."createdById"
  WHERE p."organizationId" NOT IN ('synth12_douala','synth12_yaounde','synth12_bafoussam')
   OR u.id IS NULL OR u."organizationId" IS DISTINCT FROM p."organizationId" OR p."createdById"<>p."organizationId"||'_user_owner'
   OR p."entityType"<>'item' OR p."mimeType"<>'image/png' OR p."byteLength"<12 OR p."byteLength">4194304
   OR p."providerKey" IS DISTINCT FROM 'local-test:'||p.id OR p."providerUrl" IS DISTINCT FROM 'local-test-picture:'||p.id`);
 await check('remaining-picture-reservation-has-no-catalog-links',`SELECT p.id FROM picture_assets p JOIN items i
  ON '/api/media/'||p.id=ANY(i."imageUrls") OR i.thumbnail='/api/media/'||p.id`);
 const assets=(await c.query('SELECT * FROM picture_assets ORDER BY "organizationId",id')).rows;
 const metadataIssues=[],byteIssues=[],cryptoIssues=[],deletionIssues=[],negativeIssues=[],states=[];
 const root=path.resolve(__dirname,'..'),privateRoot=path.join(root,'.seed-artifacts','disposable-dataset-2026-10-28','picture-objects');
 const readOwned=(file,folder)=>{
  const real=fs.realpathSync(file),base=fs.realpathSync(folder),relative=path.relative(base,real);
  if(!relative||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)||!fs.statSync(real).isFile())throw Error('outside expected retained directory');
  return fs.readFileSync(real);
 };
 const validatePng=(bytes,marker)=>{
  if(bytes.length<12||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('PNG signature differs');
  let offset=8,header=null,ended=false,label=false;const compressed=[];
  while(offset<bytes.length){
   if(offset+12>bytes.length)throw Error('PNG chunk is truncated');
   const size=bytes.readUInt32BE(offset),end=offset+size+12;if(end>bytes.length)throw Error('PNG chunk length differs');
   const type=bytes.subarray(offset+4,offset+8).toString('ascii'),data=bytes.subarray(offset+8,end-4);
   let crc=0xffffffff;for(const value of bytes.subarray(offset+4,end-4)){crc^=value;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
   if(((crc^0xffffffff)>>>0)!==bytes.readUInt32BE(end-4))throw Error('PNG chunk checksum differs');
   if(type==='IHDR'){if(header||offset!==8||size!==13)throw Error('PNG header differs');header=data;}
   if(type==='IDAT')compressed.push(data);
   if(type==='tEXt'&&data.equals(Buffer.from('Fixture\0SYNTHETIC TEST ONLY '+marker)))label=true;
   if(type==='IEND'){if(size!==0||end!==bytes.length)throw Error('PNG end differs');ended=true;}
   offset=end;
  }
  if(!header||header.readUInt32BE(0)!==16||header.readUInt32BE(4)!==16||header[8]!==8||header[9]!==2||header[10]!==0||header[11]!==0||header[12]!==0||!compressed.length||!ended||!label)throw Error('Synthetic PNG content or label differs');
  const pixels=require('node:zlib').inflateSync(Buffer.concat(compressed),{maxOutputLength:1024});
  if(pixels.length!==16*49||Array.from({length:16},(_,row)=>pixels[row*49]).some(filter=>filter>4))throw Error('PNG pixels cannot be decoded');
 };
 const expectedChecks=['roundTrip','wrongTenantReadDenied','wrongTenantClaimDenied','tamperDenied','attachedDeleteDenied','orphanDeleted','deletedReadDenied','invalidMimeDenied','defaultTransportDenied'];
 const accounted=new Set();
 for(const org of CORE){
  let receipt,receiptBytes;
  try{receiptBytes=readOwned(path.join(OUT,org+'-remaining-pictures.json'),OUT);receipt=JSON.parse(receiptBytes.toString('utf8'));}
  catch{metadataIssues.push({organizationId:org,reason:'Missing or invalid retained picture receipt'});continue;}
  if(receipt.version!==1||receipt.organizationId!==org||receipt.classification!=='SYNTHETIC_TEST_ONLY'||receipt.storageMode!=='LOCAL_TEST_TRANSPORT_ONLY'||receipt.externalCommunicationPerformed!==false||receipt.catalogItemLinked!==false)metadataIssues.push({organizationId:org,reason:'Picture receipt scope or classification differs'});
  if(!receipt.checks||expectedChecks.some(key=>receipt.checks[key]!==true)||Object.keys(receipt.checks).some(key=>!expectedChecks.includes(key)))negativeIssues.push({organizationId:org,reason:'Missing or unexpected service boundary outcome in retained receipt'});
  states.push({organizationId:org,receiptSha256:sha(receiptBytes)});
  for(const purpose of ['attached','orphan']){
   const evidence=receipt[purpose],id=evidence?.id;
   if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)){metadataIssues.push({organizationId:org,reason:'Invalid retained picture identifier'});continue;}
   const asset=assets.find(row=>row.id===id&&row.organizationId===org);
   if(!asset||accounted.has(id)){metadataIssues.push({id,reason:'Missing, duplicate or foreign retained picture asset'});continue;}accounted.add(id);
   const relativeFolder='.seed-artifacts/disposable-dataset-2026-10-28/picture-objects/'+org,folder=path.join(privateRoot,org);
   const plaintextFile='synthetic-documents/'+org+'-remaining-picture-'+purpose+'.png',ciphertextFile=relativeFolder+'/'+id+'.bin',tombstoneFile=relativeFolder+'/'+id+'.deleted.json';
   const attachedAt=asset.attachedAt?new Date(asset.attachedAt).toISOString():null;
   if(evidence.reference!=='/api/media/'+id||evidence.providerKey!==asset.providerKey||evidence.providerLocator!==asset.providerUrl||evidence.plaintextFile!==plaintextFile||evidence.ciphertextFile!==ciphertextFile||evidence.plaintextSha256!==asset.sha256||evidence.byteLength!==asset.byteLength||evidence.status!==asset.status||evidence.attachedAt!==attachedAt||asset.status!==(purpose==='attached'?'ready':'deleted')||Boolean(attachedAt)!==(purpose==='attached')||evidence.tombstoneFile!==(purpose==='orphan'?tombstoneFile:null)||!/^[0-9a-f]{64}$/.test(evidence.ciphertextSha256??''))metadataIssues.push({id,reason:'Picture receipt does not bind the exact retained SQL lifecycle and files'});
   let plaintext;
   try{plaintext=readOwned(path.join(OUT,plaintextFile),OUT);if(plaintext.length!==asset.byteLength||sha(plaintext)!==asset.sha256)throw Error('hash mismatch');validatePng(plaintext,org+':'+purpose);}
   catch{byteIssues.push({id,reason:'Retained plaintext size, SHA256 or decoded synthetic PNG is invalid'});}
   const key=Buffer.from(asset.encryptionKey,'base64'),iv=Buffer.from(asset.encryptionIv,'base64'),tag=Buffer.from(asset.encryptionTag,'base64');
   if(key.length!==32||iv.length!==12||tag.length!==16||key.toString('base64')!==asset.encryptionKey||iv.toString('base64')!==asset.encryptionIv||tag.toString('base64')!==asset.encryptionTag)cryptoIssues.push({id,reason:'AES-256-GCM key, IV or tag metadata is invalid'});
   if(purpose==='attached'){
    try{
     const encrypted=readOwned(path.join(folder,id+'.bin'),privateRoot);
     if(fs.existsSync(path.join(folder,id+'.deleted.json'))||encrypted.length!==asset.byteLength||sha(encrypted)!==evidence.ciphertextSha256||sha(encrypted)===asset.sha256)throw Error('ciphertext differs');
     const decrypt=(bytes,aad)=>{const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAAD(Buffer.from(aad));decipher.setAuthTag(tag);return Buffer.concat([decipher.update(bytes),decipher.final()]);};
     const decoded=decrypt(encrypted,org+':'+id);
     if(decoded.length!==asset.byteLength||sha(decoded)!==asset.sha256||!plaintext||!decoded.equals(plaintext))throw Error('plaintext differs');
     const changed=Buffer.from(encrypted);changed[0]^=1;
     for(const [bytes,aad] of [[changed,org+':'+id],[encrypted,CORE.find(value=>value!==org)+':'+id]]){let rejected=false;try{decrypt(bytes,aad);}catch{rejected=true;}if(!rejected)throw Error('authenticated boundary accepted altered bytes');}
     states.push({id,status:asset.status,plaintextSha256:sha(plaintext),ciphertextSha256:sha(encrypted),tombstonePresent:false});
    }catch{cryptoIssues.push({id,reason:'Persisted ciphertext/AES-GCM round trip, exact tenant AAD or independent tamper rejection failed'});}
   }else{
    try{
     if(fs.existsSync(path.join(folder,id+'.bin')))throw Error('deleted ciphertext remains');
     const bytes=readOwned(path.join(folder,id+'.deleted.json'),privateRoot),deleted=JSON.parse(bytes.toString('utf8'));
     if(deleted.id!==id||deleted.organizationId!==org||deleted.deleted!==true||deleted.byteLength!==asset.byteLength||deleted.ciphertextSha256!==evidence.ciphertextSha256)throw Error('deletion proof differs');
     states.push({id,status:asset.status,plaintextSha256:asset.sha256,ciphertextPresent:false,tombstoneSha256:sha(bytes)});
    }catch{deletionIssues.push({id,reason:'Deleted orphan ciphertext absence or retained deletion receipt differs'});}
   }
  }
 }
 for(const asset of assets)if(!accounted.has(asset.id))metadataIssues.push({id:asset.id,reason:'Picture asset is outside exact retained core fixture receipts'});
 add('remaining-picture-retained-receipt-lineage',metadataIssues,{assetsChecked:assets.length});
 add('remaining-picture-plaintext-file-integrity',byteIssues,{expectedPlaintextFiles:6});
 add('remaining-picture-ciphertext-authentication',cryptoIssues,{expectedRetainedCiphertexts:3,independentTamperAndTenantAadChecks:6});
 add('remaining-picture-deleted-orphan-proof',deletionIssues,{expectedDeletionReceipts:3});
 add('remaining-picture-recorded-service-boundary-outcomes',negativeIssues,{organizationsChecked:CORE.length,checksPerOrganization:expectedChecks.length});
 return states;
}
async function verifyRemaining(c,{OUT,checks,check,counts}){
 const add=(name,violations,extra={})=>checks.push({name,passed:violations.length===0,violationCount:violations.length,violations:violations.slice(0,12),...extra});
 const read=name=>{const file=path.join(OUT,name);return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;};
 const baseline=read('remaining-table-baseline.json');
 const aggregate=read('remaining-table-assessment.json');
 const baseRows=baseline?.tables??[],assessmentRows=aggregate?.tables??[];
 const live=new Map(counts.map(row=>[row.table,row.count]));
 const truth=[];
 if(baseRows.length!==131||new Set(baseRows.map(r=>r.table)).size!==131)truth.push({reason:'Baseline must contain exactly131 unique original pending tables',actual:baseRows.length});
 if(!aggregate)truth.push({reason:'Missing remaining-table-assessment.json aggregate'});
 const assessment=new Map();
 for(const row of assessmentRows){if(assessment.has(row.table))truth.push({table:row.table,reason:'Duplicate assessment'});assessment.set(row.table,row);}
 const coverage=[];
 for(const row of baseRows){
  const a=assessment.get(row.table),count=live.get(row.table);
  if(count===undefined)truth.push({table:row.table,reason:'Baseline table absent from live schema'});
  if(!a){truth.push({table:row.table,reason:'Missing table assessment'});coverage.push({table:row.table,count:count??null,status:'UNASSESSED'});continue;}
  const reason=a.remainingPrerequisite||a.requiredPrerequisite||a.blocker||a.reason||a.description;
  const source=a.source||a.sources||a.sourceEvidence;
  const scenario=a.scenario||a.scenarios;
  if(!a.status||!source)truth.push({table:row.table,reason:'Assessment needs status and current source evidence'});
  if(count===0&&(!/BLOCKED|NOT_APPLICABLE|INTENTIONALLY_EMPTY/.test(a.status)||!reason))truth.push({table:row.table,reason:'Empty table needs explicit blocked/not-applicable disposition and prerequisite'});
  if(count>0&&!scenario)truth.push({table:row.table,reason:'Populated table needs identified scenario'});
  if(a.count!==undefined&&Number(a.count)!==count)truth.push({table:row.table,reason:'Assessment count differs from live database',declared:a.count,actual:count});
  coverage.push({table:row.table,count,status:a.status,scenario:scenario??null,remainingPrerequisite:count===0?reason:null});
 }
 for(const row of assessmentRows)if(!baseRows.some(b=>b.table===row.table))truth.push({table:row.table,reason:'Assessment table is outside original131-table baseline'});
 add('remaining-131-table-assessment-truth',truth,{tablesChecked:baseRows.length,populated:coverage.filter(r=>r.count>0).length,empty:coverage.filter(r=>r.count===0).length});
 const lanes=['commerce','people','firm-close','platform','stock-pos'];
 const resultFailures=[];
 const all=read('remaining-all-results.json');
 for(const lane of lanes){
  // A later all-lanes replay supersedes an older lane-only failure (and vice versa).
  const result=[read(`remaining-${lane}-results.json`),all].filter(Boolean).sort((a,b)=>Date.parse(b.generatedAt)-Date.parse(a.generatedAt))[0];
  if(!result){resultFailures.push({lane,reason:'Missing execution result'});continue;}
  for(const issue of result.issues??[])if(!issue.lane||issue.lane===lane)resultFailures.push({lane,issue});
  for(const org of CORE){const record=result.scenarios?.find(r=>r.organizationId===org&&r.lane===lane);if(!record)resultFailures.push({lane,org,reason:'Missing organization execution'});else for(const issue of record.result?.issues??[])resultFailures.push({lane,org,issue});}
 }
 add('remaining-lane-execution-receipts',resultFailures,{lanes});
 await check('remaining-auxiliary-scope',`SELECT 'opening auxiliary personas' AS issue WHERE (SELECT count(*) FROM users WHERE "organizationId"='synth12_opening_aux')<>3 UNION ALL SELECT 'close auxiliary personas' WHERE (SELECT count(*) FROM users WHERE "organizationId"='synth12_close_aux')<>2 UNION ALL SELECT 'core employees' WHERE (SELECT count(*) FROM payroll_employees WHERE "organizationId" IN('synth12_douala','synth12_yaounde','synth12_bafoussam'))<>36`);
 await verifyDerivedReports(check);
 await verifyCleanFundedClose(c,OUT,check,add);
 const pictureStates=await verifyPictureAssets(c,OUT,check,add);
 await check('remaining-rejected-attendance-is-contained',`SELECT t.id FROM hris_time_entries t WHERE t.status<>'VALIDATED' AND (t.status<>'REJECTED' OR NOT EXISTS(SELECT 1 FROM hris_attendance_anomalies a WHERE a."organizationId"=t."organizationId" AND to_jsonb(a)::text LIKE '%'||t.id||'%'))`);
 await check('remaining-people-negative-and-reference-states',`SELECT o.id FROM ${coreSql} o(id) WHERE
  NOT EXISTS(SELECT 1 FROM hris_employee_documents t WHERE t."organizationId"=o.id AND t.status='AVAILABLE') OR
  NOT EXISTS(SELECT 1 FROM hris_personal_correction_cases t WHERE t."organizationId"=o.id AND t.status='REJECTED') OR
  NOT EXISTS(SELECT 1 FROM hris_attendance_anomalies t WHERE t."organizationId"=o.id AND t.status='RESOLVED') OR
  (SELECT count(*) FROM hris_lifecycle_tasks t WHERE t."organizationId"=o.id AND t.status='COMPLETED')<4 OR
  NOT EXISTS(SELECT 1 FROM onboarding_import_batches t WHERE t."organizationId"=o.id AND t.status='COMMITTED') OR
  NOT EXISTS(SELECT 1 FROM onboarding_import_batches t WHERE t."organizationId"=o.id AND t.status='BLOCKED')`);
 await check('remaining-agent-package-stays-inactive',`SELECT o.id FROM ${coreSql} o(id) LEFT JOIN agent_activation_packages p ON p."organizationId"=o.id AND p."releaseVersion"=o.id||'-remaining-platform-v1' WHERE p.id IS NULL OR p.state<>'PROVISIONED_INACTIVE' OR p.environment<>'synthetic-test' OR
  (SELECT count(*) FROM agent_activation_approvals a WHERE a."packageId"=p.id AND a.decision='APPROVED')<>2 OR
  (SELECT count(DISTINCT a."approverId") FROM agent_activation_approvals a WHERE a."packageId"=p.id AND a.decision='APPROVED')<>2 OR
  (SELECT count(*) FROM agent_activation_owners x WHERE x."packageId"=p.id AND x."acceptedAt" IS NOT NULL AND x."primaryUserId"<>x."backupUserId")<>6 OR
  (SELECT count(*) FROM agent_pilot_certifications t WHERE t."packageId"=p.id AND t.result='FAILED')<>1`);
 await check('remaining-agent-runtime-proof-and-policy',`SELECT o.id FROM ${coreSql} o(id) WHERE
  (SELECT count(*) FROM agent_runs r WHERE r."organizationId"=o.id AND r."correlationId"=o.id||'-remaining-platform-v1:digest-read' AND r.status='COMPLETED')<>1 OR
  (SELECT count(*) FROM agent_runs r WHERE r."organizationId"=o.id AND r."correlationId"=o.id||'-remaining-platform-v1:unknown-tool' AND r.status='BLOCKED')<>1 OR
  NOT EXISTS(SELECT 1 FROM agent_evidence_links e JOIN agent_runs r ON r.id=e."runId" WHERE r."organizationId"=o.id AND e.available AND e."sourceHash" IS NOT NULL) OR
  NOT EXISTS(SELECT 1 FROM agent_policy_incidents p JOIN agent_runs r ON r.id=p."runId" WHERE r."organizationId"=o.id AND r.status='BLOCKED') OR
  NOT EXISTS(SELECT 1 FROM ai_action_proposals p WHERE p."organizationId"=o.id AND p."idempotencyKey"=o.id||'-remaining-platform-v1:review-proposal' AND p.status='REJECTED')`);
 await check('remaining-agent-zero-external-usage',`SELECT id FROM agent_cost_ledger WHERE "modelProvider"<>'none' OR "promptTokens"<>0 OR "completionTokens"<>0 OR "estimatedCost"<>0`);
 await check('remaining-no-agent-production-activation',`SELECT id FROM agent_activation_packages WHERE state='ACTIVE_INTERNAL'`);
 await check('remaining-assurance-waiver-and-queued-alert',`SELECT o.id FROM ${coreSql} o(id) WHERE
  NOT EXISTS(SELECT 1 FROM workflow_assurance_incidents i WHERE i."organizationId"=o.id AND i."checkKey"='agent.runtime.control_plane.integrity' AND i.status NOT IN('RESOLVED','WAIVED')) OR
  NOT EXISTS(SELECT 1 FROM workflow_assurance_check_findings f WHERE f."organizationId"=o.id) OR
  NOT EXISTS(SELECT 1 FROM workflow_assurance_waivers w WHERE w."organizationId"=o.id AND w.status='REQUESTED') OR
  NOT EXISTS(SELECT 1 FROM workflow_assurance_alert_deliveries a WHERE a."organizationId"=o.id AND a.status='PENDING')`);
 await check('remaining-alerts-not-dispatched',`SELECT id FROM workflow_assurance_alert_deliveries WHERE status<>'PENDING' OR to_jsonb(workflow_assurance_alert_deliveries)->>'deliveredAt' IS NOT NULL`);
 await check('remaining-business-event-conflict-lineage',`SELECT o.id FROM ${coreSql} o(id) WHERE
  (SELECT count(*) FROM business_events e WHERE e."organizationId"=o.id AND e."idempotencyKey"=o.id||'-remaining-platform-v1:event-conflict')<>1 OR
  NOT EXISTS(SELECT 1 FROM business_event_anomalies a JOIN business_events e ON e.id=a."businessEventId" WHERE e."organizationId"=o.id AND e."idempotencyKey"=o.id||'-remaining-platform-v1:event-conflict' AND a."occurrenceCount"=1)`);
 await check('remaining-command-center-evidence',`SELECT o.id FROM ${coreSql} o(id) WHERE
  NOT EXISTS(SELECT 1 FROM command_center_review_receipts r WHERE r."organizationId"=o.id AND r."requestId"=o.id||'-remaining-platform-v1:review') OR
  NOT EXISTS(SELECT 1 FROM command_center_occurrences r WHERE r."organizationId"=o.id AND r."ownerId"=o.id||'_user_owner' AND r.coordination='ASSIGNED') OR
  NOT EXISTS(SELECT 1 FROM command_center_notices r WHERE r."organizationId"=o.id AND r."recipientId"=o.id||'_user_owner') OR
  NOT EXISTS(SELECT 1 FROM command_center_preferences r WHERE r."organizationId"=o.id AND r."actorId"=o.id||'_user_owner')`);
 await check('remaining-module-and-compliance-boundaries',`SELECT o.id FROM ${coreSql} o(id) WHERE
  NOT EXISTS(SELECT 1 FROM tenant_module_configurations t WHERE t."organizationId"=o.id AND cardinality(t."newWorkStoppedModules")=0) OR
  NOT EXISTS(SELECT 1 FROM tenant_module_lifecycle_operations t WHERE t."organizationId"=o.id) OR
  NOT EXISTS(SELECT 1 FROM compliance_adapter_configs t WHERE t."organizationId"=o.id AND t.environment='SANDBOX' AND t."credentialReference" IS NULL)`);
 await check('remaining-serialized-stock-and-rejected-variance',`SELECT o.id FROM ${coreSql} o(id) WHERE
  (SELECT count(*) FROM serial_numbers s WHERE s."organizationId"=o.id AND s."itemId"=o.id||'_remaining_serial_item' AND s.status='AVAILABLE' AND s."locationId"=o.id||'_loc_2')<>2 OR
  NOT EXISTS(SELECT 1 FROM inventory_levels l WHERE l."itemId"=o.id||'_remaining_serial_item' AND l."locationId"=o.id||'_loc_2' AND l."quantityOnHand"=2 AND l."totalValue"=2000) OR
  NOT EXISTS(SELECT 1 FROM supplier_invoice_match_exceptions x JOIN supplier_invoices i ON i.id=x."supplierInvoiceId" WHERE x."organizationId"=o.id AND x.status='REJECTED' AND x."requestedById"<>x."rejectedById" AND x."varianceAmount"=200 AND i.status='DISPUTED' AND i.total=2200 AND i."ledgerPostingBatchId" IS NULL)`);
 await check('remaining-refund-commit-and-financial-lineage',`SELECT o.id FROM ${coreSql} o(id)
  LEFT JOIN pos_commit_results c ON c."organizationId"=o.id AND c."clientCommitId"=o.id||':remaining:refund-sale'
  LEFT JOIN sales_orders s ON s.id=c."salesOrderId"
  LEFT JOIN payments p ON p."salesOrderId"=s.id
  LEFT JOIN payment_refunds r ON r."paymentId"=p.id
  LEFT JOIN pos_sessions sh ON sh.id=c."sessionId"
  WHERE c.id IS NULL OR c.status<>'COMPLETED' OR s.status<>'RETURNED' OR s."paymentStatus"<>'REFUNDED' OR p.method<>'CASH' OR r.id IS NULL OR r.status<>'PROCESSED' OR r.amount<>s.total
  OR sh.status<>'CLOSED' OR sh."expectedBalance"<>0 OR sh."closingBalance"<>0 OR sh.variance<>0
  OR (SELECT count(*) FROM payment_refunds x WHERE x."paymentId"=p.id)<>1
  OR (SELECT count(*) FROM ledger_posting_batches b WHERE b."organizationId"=o.id AND b."sourceType"='POS_REFUND' AND b."sourceId"=r.id AND b.status='POSTED')<>1
  OR (SELECT count(*) FROM inventory_transactions t WHERE t."organizationId"=o.id AND t."referenceId"=s.id)<>2
  OR (SELECT sum(t.quantity) FROM inventory_transactions t WHERE t."organizationId"=o.id AND t."referenceId"=s.id)<>0
  OR (SELECT sum(CASE WHEN t.quantity<0 THEN -t."totalCost" ELSE t."totalCost" END) FROM inventory_transactions t WHERE t."organizationId"=o.id AND t."referenceId"=s.id)<>0`);
 const offline=(await c.query(`SELECT e.*,d."signingPublicKeyPem",d."publicKeyFingerprint" FROM pos_offline_events e JOIN pos_offline_devices d ON d.id=e."deviceId" WHERE e."idempotencyKey" LIKE 'synth12_%:remaining:offline:%' ORDER BY e."organizationId",e."deviceId",e."deviceSeq"`)).rows;
 const offlineIssues=[],signed=offline.filter(e=>e.idempotencyKey.includes(':offline:p256:'));
 if(signed.length!==6)offlineIssues.push({reason:'Expected two P-256 boundary events per core tenant',actual:signed.length});
 for(const event of offline){
  try{
   const key=crypto.createPublicKey(event.signingPublicKeyPem);
   if(!event.idempotencyKey.includes(':offline:p256:')){
    if(key.asymmetricKeyType!=='ed25519'||event.status!=='QUARANTINED')offlineIssues.push({id:event.id,reason:'Earlier unsupported Ed25519 evidence must remain quarantined'});
    continue;
   }
   const expectedHash=sha([event.deviceId,String(event.deviceSeq),event.eventType,String(event.schemaVersion),event.payloadHash,event.prevHash??''].join('|'));
   let valid=false;
   try{valid=crypto.verify('sha256',Buffer.from(event.entryHash,'utf8'),key,Buffer.from(event.signature,'base64'));}catch(error){if(event.deviceSeq!==2)throw error;}
   const previous=signed.find(e=>e.deviceId===event.deviceId&&e.deviceSeq===1);
   if(key.asymmetricKeyType!=='ec'||key.asymmetricKeyDetails?.namedCurve!=='prime256v1'||sha(canonical(event.payload))!==event.payloadHash||expectedHash!==event.entryHash||event.eventType!=='OFFLINE_SESSION_EVIDENCE'||event.ledgerPostingBatchId||event.postingBatchId||event.replayedAt)offlineIssues.push({id:event.id,reason:'P-256 source/hash/type or nonfinancial evidence mismatch'});
   if(event.deviceSeq===1&&(!valid||event.status!=='PENDING_REPLAY'||event.prevHash!==null))offlineIssues.push({id:event.id,reason:'Valid P-256 event must remain pending controlled replay'});
   if(event.deviceSeq===2&&(valid||event.status!=='QUARANTINED'||event.prevHash!==previous?.entryHash))offlineIssues.push({id:event.id,reason:'Invalid second signature must be quarantined with the retained first entry hash'});
   if(![1,2].includes(event.deviceSeq))offlineIssues.push({id:event.id,reason:'Unexpected synthetic sequence'});
  }catch(error){offlineIssues.push({id:event.id,reason:error.message});}
 }
 add('remaining-offline-signature-and-hash-boundaries',offlineIssues,{eventsChecked:offline.length,p256Events:signed.length,legacyQuarantinedEd25519:offline.length-signed.length});
 await check('remaining-offline-signature-conflict-retained',`SELECT o.id FROM ${coreSql} o(id) WHERE NOT EXISTS(SELECT 1 FROM pos_offline_sync_conflicts c JOIN pos_offline_events e ON e.id=c."eventId" WHERE c."organizationId"=o.id AND c."conflictType"='SIGNATURE_INVALID' AND e."idempotencyKey"=o.id||':remaining:offline:p256:event:2')`);
 const evidenceRows=(await c.query(`SELECT a.id,a."evidenceHash" AS hash,'agent-approval' AS kind FROM agent_activation_approvals a
  UNION ALL SELECT id,"reportHash",'negative-pilot' FROM agent_pilot_certifications
  UNION ALL SELECT id,"evidenceHash",'waiver-request' FROM workflow_assurance_waivers`)).rows;
 const documentFolder=path.join(OUT,'synthetic-documents');
 const documents=fs.readdirSync(documentFolder,{withFileTypes:true}).filter(e=>e.isFile()).map(e=>({name:e.name,sha256:sha(fs.readFileSync(path.join(documentFolder,e.name)))}));
 const hashes=new Set(documents.map(d=>d.sha256));
 add('remaining-platform-retained-document-hashes',evidenceRows.filter(r=>!r.hash||!hashes.has(r.hash.replace(/^sha256:/,''))),{documentsChecked:evidenceRows.length});
 const consentRows=(await c.query(`SELECT DISTINCT g.id,g."consentEvidenceHash" AS hash FROM audit_logs c JOIN users p ON p.id=c."userId"
  JOIN accountant_access_grants g ON g."organizationId"=c."organizationId" AND g."accountantUserId"=c."userId"
  WHERE c."organizationId"<>p."organizationId" AND ${delegatedAuditActorSql}`)).rows;
 add('remaining-delegated-audit-retained-consent',consentRows.filter(r=>!r.hash||!hashes.has(r.hash.replace(/^sha256:/,''))),{documentsChecked:consentRows.length});
 await check('remaining-delegated-audit-rejects-invalid-evidence',`SELECT original.id,variant.name FROM audit_logs original JOIN users p ON p.id=original."userId"
  CROSS JOIN (VALUES ('unknown-action','{"action":"UNAUTHORIZED_TEST_ACTION"}'::jsonb),('unrelated-entity','{"entityId":"unrelated-verifier-entity"}'::jsonb),('missing-evidence','{"changes":{}}'::jsonb),('unrelated-actor','{"userId":"unrelated-verifier-actor"}'::jsonb)) variant(name,changes)
  CROSS JOIN LATERAL jsonb_populate_record(NULL::audit_logs,to_jsonb(original)||variant.changes) c
  WHERE original."organizationId"<>p."organizationId" AND ${delegatedAuditActorSql}`);
 const moduleEvidence=[];
 for(const org of CORE){
  const name=org+'-remaining-platform-v1-module-selection.json',file=path.join(documentFolder,name);
  if(!fs.existsSync(file)){moduleEvidence.push({org,reason:'Missing original module-selection artifact'});continue;}
  const proof=JSON.parse(fs.readFileSync(file,'utf8'));
  const retained=(await c.query('SELECT "activeModules","newWorkStoppedModules" FROM tenant_module_configurations WHERE "organizationId"=$1',[org])).rows[0];
  if(!retained||retained.newWorkStoppedModules.length||proof.value.previousActiveModules.some(m=>!retained.activeModules.includes(m)))moduleEvidence.push({org,reason:'Original active module access was not preserved'});
 }
 add('remaining-module-access-preserved',moduleEvidence);
 const fingerprintTables=baseRows.map(r=>r.table).filter(t=>!READ_AUDIT_TABLES.has(t));
 const businessStates={'remaining:picture-local-evidence':pictureStates};
 for(const table of fingerprintTables){
  if(!live.has(table))continue;
  const excluded=['createdAt','updatedAt',...(OPERATIONAL_FIELDS[table]??[])];
  const expr='to_jsonb(t)'+excluded.map(f=>"-'"+f+"'").join('');
  businessStates['remaining:'+table]=(await c.query(`SELECT ${expr} AS row FROM ${q(table)} t ORDER BY (${expr})::text`)).rows;
 }
 return {baselineTables:baseRows.length,populated:coverage.filter(r=>r.count>0).length,empty:coverage.filter(r=>r.count===0).length,coverage,fingerprintTables,businessStates,fingerprintExclusions:{tables:[...READ_AUDIT_TABLES],fields:OPERATIONAL_FIELDS,allTables:['createdAt','updatedAt'],reason:'Read-access logs and access-use counters are observable read-audit noise; all remaining business states, evidence hashes, decisions, effective dates and relations are preserved.'},retainedDocumentCount:documents.length};
}
module.exports={verifyRemaining,delegatedAuditActorSql,verifyDerivedReports,verifyCleanFundedClose,verifyPictureAssets};
