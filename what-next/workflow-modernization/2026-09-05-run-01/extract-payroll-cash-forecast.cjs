const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),file='services/snapshots/tenant-operating-snapshot.service.ts',target=path.join(root,file),before=fs.readFileSync(target,'utf8');
const start=before.indexOf('type PayrollFinanceForecastResult ='),end=before.indexOf('function tenantEvidenceGrade(',start);
const constStart=before.indexOf('const PAYROLL_FINANCE_FORECAST_HORIZON_DAYS'),constEnd=before.indexOf('export async function getTenantOperatingSnapshot(',constStart);
assert.ok(start>constEnd&&end>start&&constStart>0);
const body=before.slice(start,end),constants=before.slice(constStart,constEnd);
const imports=`import "server-only"

import { AccountingSourceType, LedgerPostingBatchStatus, Prisma, PayrollDeclarationStatus, PayrollPaymentBatchStatus, PayrollRunStatus } from "@prisma/client"
import { db } from "@/prisma/db"
import { payrollCertifiedInputProofFromMetadata } from "./certified-input-proof"
import type { NormalizedSnapshotScope, PaymentTruthMetrics, PayrollFinanceForecastMetrics, SnapshotBlocker, SnapshotResult } from "@/services/snapshots/snapshot-contracts"
import { blocker, createSnapshotSourceHash, maxDate, toNumber } from "@/services/snapshots/snapshot-utils"

`;
const destination='services/payroll/payroll-finance-forecast.service.ts';
const extracted=imports.replaceAll('\n','\r\n')+constants+body.replace('type PayrollFinanceForecastResult =','export type PayrollFinanceForecastResult =').replace('async function getPayrollFinanceForecast(', 'export async function getPayrollFinanceForecast(').replace('function payrollForecastBlockers(', 'export function payrollForecastBlockers(');
let after=before.slice(0,start)+before.slice(end);
after=after.slice(0,constStart)+after.slice(constEnd);
for(const name of ['AccountingSourceType','LedgerPostingBatchStatus','Prisma','PayrollDeclarationStatus','PayrollPaymentBatchStatus','PayrollFinanceForecastMetrics','SnapshotBlocker','createSnapshotSourceHash'])after=after.replace('  '+name+',\r\n','');
after=after.replace('import { payrollCertifiedInputProofFromMetadata } from "@/services/payroll/certified-input-proof"','import { getPayrollFinanceForecast, payrollForecastBlockers } from "@/services/payroll/payroll-finance-forecast.service"');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const baseline='evidence/tenant-operating-before-forecast-extraction.txt';
fs.writeFileSync(path.join(__dirname,baseline),before,{flag:'wx'});
fs.writeFileSync(path.join(root,destination),extracted,{flag:'wx'});
const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,after,{flag:'wx'});fs.renameSync(pending,target);
fs.writeFileSync(path.join(__dirname,'evidence/payroll-forecast-extraction-binding.json'),JSON.stringify({at:new Date().toISOString(),baseline,file,destination,beforeSha256:sha(before),afterSha256:sha(after),extractedSha256:sha(extracted),bodySha256:sha(body),constantsSha256:sha(constants)},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file,destination,unchangedAlgorithmBytes:body.length,unchangedConstantBytes:constants.length}));
