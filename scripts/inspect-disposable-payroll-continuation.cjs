'use strict';
// Read-only inspection of the retained, explicitly owned local dataset.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Client}=require('pg');
const {OUT,ownedTarget,redact}=require('./disposable-business-dataset.cjs');
const TARGET='stoquify_replay_dataset_20261028_01';
const DEST=path.resolve('docs/database-seed/payroll-continuation-2026-11-02');
const core=['synth12_douala','synth12_yaounde','synth12_bafoussam'];
async function main(){
 if(process.argv.length!==3||process.argv[2]!==TARGET)throw Error('Explicit owned disposable database required');
 const url=ownedTarget(TARGET);if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Local database required');
 const c=new Client({connectionString:url.toString(),connectionTimeoutMillis:5000});
 try{
  await c.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const identity=(await c.query('SELECT current_database() AS database,current_schema() AS schema,current_setting(\'transaction_read_only\') AS "readOnly"')).rows[0];
  if(identity.database!==TARGET||identity.schema!=='public'||identity.readOnly!=='on')throw Error('Read-only target mismatch');
  const report={generatedAt:new Date().toISOString(),evidenceClass:'REAL_POSTGRESQL_READ_ONLY_INSPECTION',identity,
   schemaSha256:crypto.createHash('sha256').update(fs.readFileSync('prisma/schema.prisma')).digest('hex'),
   lastWholeDatasetVerification:JSON.parse(fs.readFileSync(path.join(OUT,'verification.json'),'utf8')).generatedAt,
   payrollPeriods:(await c.query('SELECT "organizationId",status,count(*)::int AS count FROM payroll_periods WHERE "organizationId"=ANY($1) GROUP BY 1,2 ORDER BY 1,2',[core])).rows,
   payrollRuns:(await c.query('SELECT "organizationId",status,count(*)::int AS count FROM payroll_runs WHERE "organizationId"=ANY($1) GROUP BY 1,2 ORDER BY 1,2',[core])).rows,
   attendance:(await c.query('SELECT "organizationId",count(*)::int AS entries,min("workDate")::text AS first,max("workDate")::text AS last FROM hris_time_entries WHERE "organizationId"=ANY($1) GROUP BY 1 ORDER BY 1',[core])).rows,
   octoberAttendance:(await c.query('SELECT "organizationId",status,count(*)::int AS entries,min("workDate")::text AS first,max("workDate")::text AS last FROM hris_time_entries WHERE "organizationId"=ANY($1) AND "workDate">=$2 AND "workDate"<$3 GROUP BY 1,2 ORDER BY 1,2',[core,'2026-10-01','2026-11-01'])).rows,
   historicalAp:(await c.query('SELECT "organizationId",status,count(*)::int AS invoices FROM supplier_invoices WHERE "organizationId"=ANY($1) AND "invoiceDate">=$2 AND "invoiceDate"<$3 GROUP BY 1,2 ORDER BY 1,2',[core,'2025-11-01','2026-01-01'])).rows,
   originalPendingTableCounts:[],scope:'No seed writes, statutory approvals, application/provider calls, or business dates changed.'};
  const assessment=JSON.parse(fs.readFileSync(path.join(OUT,'remaining-table-assessment.json'),'utf8'));
  for(const row of assessment.tables.filter(x=>x.count===0)){
   if(!/^[a-z_]+$/.test(row.table))throw Error('Invalid inspected table');
   report.originalPendingTableCounts.push({table:row.table,count:Number((await c.query('SELECT count(*)::text AS n FROM "'+row.table+'"')).rows[0].n)});
  }
  await c.query('ROLLBACK');fs.mkdirSync(DEST,{recursive:true});fs.writeFileSync(path.join(DEST,'database-inspection.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({database:TARGET,readOnly:true,payrollPeriods:report.payrollPeriods,payrollRuns:report.payrollRuns,inspectedTables:report.originalPendingTableCounts.length,historicalAp:report.historicalAp}));
 }finally{await c.end();}
}
main().catch(error=>{console.error(redact(error.message));process.exitCode=1;});
