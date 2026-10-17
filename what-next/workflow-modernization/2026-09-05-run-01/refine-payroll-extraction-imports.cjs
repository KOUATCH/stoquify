const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const target=path.resolve(__dirname,'../../../services/snapshots/tenant-operating-snapshot.service.ts');let s=fs.readFileSync(target,'utf8');
for(const name of ['AccountingSourceType','LedgerPostingBatchStatus','Prisma','PayrollDeclarationStatus','PayrollPaymentBatchStatus','PayrollFinanceForecastMetrics','SnapshotBlocker','createSnapshotSourceHash'])s=s.replace(new RegExp('  '+name+',\\r?\\n'),'');
const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,s,{flag:'wx'});fs.renameSync(pending,target);
