'use strict';
// Combine source-reviewed dispositions with retained live inventory, without connecting to a database.
const fs=require('node:fs'),path=require('node:path');
const {OUT}=require('./disposable-business-dataset.cjs');
const read=name=>JSON.parse(fs.readFileSync(path.join(OUT,name),'utf8'));
const baseline=read('remaining-table-baseline.json'),inventory=read('table-inventory.json');
const tables=new Map();
for(const lane of ['people','firm-close','platform','stock-pos'])for(const row of read(`remaining-${lane}-assessment.json`).tables){
 if(tables.has(row.table))throw Error('Duplicate assessment: '+row.table);
 tables.set(row.table,{...row,lane});
}
const groups=[
 ['customer_statement_access_logs customer_statement_access_tokens customer_statement_deliveries customer_statement_delivery_states customer_statement_recipient_action_states customer_statement_recipient_actions customer_statement_snapshots referral_attribution_events referral_attributions','customer-statement-consent-response-referral','services/accounting/customer-statement*.ts; services/referrals/referral-attribution.service.ts','Consent-backed statement, encrypted queued delivery, redacted public access and an open promise to pay; no email delivered.'],
 ['purchase_order_authoring_drafts supplier_po_access_logs supplier_po_access_tokens supplier_po_envelopes supplier_po_proposal_lines supplier_po_proposal_states supplier_po_proposals','purchase-authoring-and-supplier-proposal','services/purchase-order/purchase-order-authoring.service.ts; services/purchase-order/supplier-po-acknowledgement.service.ts','Draft-to-approved PO and supplier quantity change independently rejected; invitation retained locally without sending.'],
 ['public_identity_abuse_buckets public_receipt_access_tokens','receipt-access-and-public-abuse-boundary','services/security/public-identity-abuse.service.ts; services/pos/public-receipt-token-registry.service.ts','Receipt token registry validation and deterministic registration throttling denial.'],
 ['pos_offline_devices pos_offline_events pos_offline_sync_batches pos_offline_sync_certificates pos_offline_sync_conflicts','signed-offline-session-and-signature-quarantine','services/pos/offline-sync.service.ts','Real SHA-256/P-256 signed session evidence awaits replay; invalid and unsupported-algorithm signatures remain quarantined with a retained conflict and blocked certificate. No sale or financial posting is claimed.'],
 ['cash_shortage_policies pos_cash_shortage_worker_checkpoints','cash-shortage-policy-and-idle-worker-checkpoint','services/leakage/cash-shortage-policy.service.ts; services/leakage/pos-cash-shortage-worker-checkpoint-persistence.service.ts','Observe-only policy independently approved; durable worker checkpoint queued without dispatch.'],
 ['reconciliation_no_activity_evidence','independently-reviewed-no-activity-evidence','services/reconciliation/no-activity-evidence.service.ts','September provider inactivity checked against source records and independently approved; no external bank confirmation claimed.'],
 ['expense_categories expenses daily_sales_reports daily_sales_report_items daily_sales_report_cash_events','twelve-month-expense-and-daily-sales-projections','prisma/disposable-remaining-commerce-operations.ts; prisma/schema.prisma','Direct legacy read-model projections from existing posted monthly journals, closed shifts, payments and chronological inventory; no duplicate financial postings or finalized report certification.'],
 ['fiscal_sequences','locked-unissued-synthetic-fiscal-sequence','prisma/disposable-remaining-commerce-operations.ts; prisma/schema.prisma','Locked, explicitly synthetic, unissued reference sequence with lastIssuedNumber zero; no legal fiscal document issued.'],
];
for(const [names,scenario,source,description]of groups)for(const table of names.split(' ')){
 if(tables.has(table))throw Error('Duplicate commerce assessment: '+table);
 tables.set(table,{table,lane:'commerce',status:'IMPLEMENTED_AWAITING_DATABASE_EXECUTION',scenario,source,description,implementation:'prisma/disposable-remaining-commerce.ts; prisma/disposable-remaining-commerce-operations.ts'});
}
tables.set('picture_assets',{table:'picture_assets',lane:'commerce',status:'IMPLEMENTED_AWAITING_DATABASE_EXECUTION',scenario:'encrypted-local-managed-image-lifecycle',source:'services/media/picture.service.ts; prisma/disposable-remaining-pictures.ts',description:'Actual image upload, encryption, durable local ciphertext, tenant-scoped read/decrypt, attachment protection and orphan cleanup through an explicitly injected test storage transport. Negative cases cover tampered bytes and wrong tenant. This service integration fixture does not claim UploadThing delivery or image availability through ordinary application routes.',implementation:'prisma/disposable-remaining-pictures.ts'});
const results=baseline.tables.map(original=>{
 const row=tables.get(original.table);if(!row)throw Error('Missing assessment: '+original.table);
 const live=inventory.rows.find(x=>x.table===row.table);if(!live)throw Error('Missing live table inventory: '+row.table);
 const candidates=[`remaining-${row.lane}-results.json`,'remaining-all-results.json'].filter(n=>fs.existsSync(path.join(OUT,n))).map(read).sort((a,b)=>Date.parse(b.generatedAt)-Date.parse(a.generatedAt));
 const laneResult=candidates[0],laneIssues=laneResult.issues.filter(x=>!x.lane||x.lane===row.lane),laneComplete=laneIssues.length===0&&laneResult.scenarios.filter(x=>x.lane===row.lane).length===3;
 const source=typeof row.source==='string'?row.source:JSON.stringify(row.source||row.sourcePaths||row.sourceEvidence||row.sources||row.implementation);
 const reason=row.remainingPrerequisite||row.blocker||row.reason||row.description||'';
 let status=row.status;
 if(live.count>0)status=laneComplete?'POPULATED_SCENARIO_VERIFIED':'POPULATED_EXECUTION_UNRESOLVED';
 else if(!/^(BLOCKED|NOT_APPLICABLE|INTENTIONALLY_EMPTY)/.test(status))status='UNRESOLVED_EMPTY_TABLE';
 return {...row,scenario:row.scenario||'Deferred payroll lifecycle; no records fabricated while the upstream admission gate is blocked.',source,status,count:live.count,baselineCount:original.count,remainingPrerequisite:reason,laneExecutionPassed:laneComplete};
});
const extra=[...tables.keys()].filter(x=>!baseline.tables.some(t=>t.table===x));if(extra.length)throw Error('Unexpected assessed tables: '+extra.join(','));
const summary={baselineTables:results.length,newlyPopulated:results.filter(x=>x.count>0).length,remainingEmpty:results.filter(x=>x.count===0).length,unresolved:results.filter(x=>/UNRESOLVED/.test(x.status)).length,byStatus:Object.fromEntries([...new Set(results.map(x=>x.status))].sort().map(s=>[s,results.filter(x=>x.status===s).length]))};
const result={generatedAt:new Date().toISOString(),database:baseline.database,baselineCapturedAt:baseline.capturedAt,inventoryGeneratedAt:inventory.generatedAt,summary,tables:results};
fs.writeFileSync(path.join(OUT,'remaining-table-assessment.json'),JSON.stringify(result,null,2)+'\n');
for(const row of inventory.rows){const assessment=results.find(x=>x.table===row.table);if(assessment){row.disposition=assessment.status;row.reason=assessment.count?assessment.description||assessment.scenario:assessment.remainingPrerequisite;}}
inventory.assessmentGeneratedAt=result.generatedAt;
fs.writeFileSync(path.join(OUT,'table-inventory.json'),JSON.stringify(inventory,null,2)+'\n');
fs.writeFileSync(path.join(OUT,'table-coverage.md'),'# Table coverage — current execution evidence\n\nNonzero counts do not certify every workflow. The original 131 pending tables have explicit scenario or prerequisite dispositions in [the detailed assessment](remaining-table-assessment.json).\n\n| Table | Model | Rows | Disposition | Dependencies |\n|---|---|---:|---|---|\n'+inventory.rows.map(r=>`| ${r.table} | ${r.model||'(SQL/join)'} | ${r.count} | ${r.disposition} | ${r.dependencies.join(', ')} |`).join('\n')+'\n');
console.log(JSON.stringify(summary));
if(summary.unresolved)process.exitCode=1;
