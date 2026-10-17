process.env.TZ='UTC';
const fs=require('fs'),path=require('path');
const {Client}=require('pg'),{Prisma}=require('@prisma/client');
const ROOT=path.resolve(__dirname,'../../..'),OUT=__dirname,PRIOR=path.join(ROOT,'what-next/development-gates/2026-09-27T123553Z');
require('dotenv').config({path:path.join(ROOT,'.env'),quiet:true});
const prior=n=>JSON.parse(fs.readFileSync(path.join(PRIOR,n),'utf8'));
const save=(n,v)=>fs.writeFileSync(path.join(OUT,n),JSON.stringify(v,null,2)+'\n');
const quote=v=>'"'+v.replaceAll('"','""')+'"';
const fieldsByModel={};
for(const f of prior('field-register.json'))(fieldsByModel[f.model]??=new Set()).add(f.field);
const additional=['SettlementAccount','PayrollPeriod','GoodsReceipt','GoodsReceiptLine','SalesOrder','SalesOrderLine','InventoryTransaction','BusinessEvent','BusinessEventOutbox','POSOfflineEvent','ProviderEvent','FiscalDocument','WorkflowAssuranceCheckDefinition','PayrollRunLine'];
const unavailableModels=[];
for(const name of additional){if(Prisma.dmmf.datamodel.models.some(m=>m.name===name))fieldsByModel[name]??=new Set();else unavailableModels.push(name);}
const excludedUserDates=new Set(['verificationTokenExpires','lastFailedLogin','lastLogin']);
async function main(){
 const url=new URL(process.env.DATABASE_URL.replace(/\$\{([^}]+)\}/g,(_,k)=>process.env[k]||''));
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.pathname!=='/stoquify_replay_next_20260830')throw new Error('Unexpected database target');
 const client=new Client({connectionString:url.toString(),application_name:'stoquify_required_information_timestamps',options:'-c default_transaction_read_only=on -c statement_timeout=30000 -c TimeZone=UTC'});
 const data={},schema=[],queries=[];await client.connect();
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const context=(await client.query("SELECT current_database() AS database,transaction_timestamp() AS observed_at,current_setting('transaction_read_only') AS transaction_read_only,current_setting('default_transaction_read_only') AS default_transaction_read_only,current_setting('TimeZone') AS timezone")).rows[0];
  if(context.transaction_read_only!=='on'||context.default_transaction_read_only!=='on')throw new Error('Read-only enforcement missing');
  const columns=(await client.query("SELECT table_name,column_name,data_type,udt_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")).rows;
  for(const [name,set]of Object.entries(fieldsByModel)){
   const model=Prisma.dmmf.datamodel.models.find(m=>m.name===name);
   for(const relation of model.fields.filter(f=>f.kind==='object'))for(const key of relation.relationFromFields||[])set.add(key);
   if(additional.includes(name))for(const key of ['sourceType','sourceId','referenceType','referenceId'])if(model.fields.some(f=>f.name===key&&f.kind!=='object'))set.add(key);
   for(const f of model.fields){
    if(f.kind==='object')continue;
    if(f.isId||['organizationId','status'].includes(f.name)||f.type==='DateTime'&&!(name==='User'&&excludedUserDates.has(f.name)))set.add(f.name);
   }
   const fields=[...set].map(n=>model.fields.find(f=>f.name===n));
   if(fields.some(f=>!f||f.kind==='object'||/^(password|passwordHash|token|sessionToken|accessToken|refreshToken|secret|privateKey|accountNumber|iban|salary|baseSalary)$/i.test(f.name)))throw new Error('Unsafe field selection '+name);
   const table=model.dbName||name;
   const sql='SELECT '+fields.map(f=>quote(f.dbName||f.name)+(f.dbName?' AS '+quote(f.name):'')).join(',')+' FROM public.'+quote(table)+' ORDER BY '+quote(fields.find(f=>f.isId)?.dbName||fields.find(f=>f.isId)?.name||fields[0].dbName||fields[0].name);
   const result=await client.query(sql);data[name]=result.rows;queries.push({id:'model_'+name,sql,rowCount:result.rowCount});
   schema.push({model:name,table,fields:fields.map(f=>({name:f.name,column:f.dbName||f.name,type:f.type,list:f.isList,schemaRequired:f.isRequired,isId:f.isId,isUnique:f.isUnique,dbType:columns.find(c=>c.table_name===table&&c.column_name===(f.dbName||f.name))?.data_type,allowedValues:f.kind==='enum'?Prisma.dmmf.datamodel.enums.find(e=>e.name===f.type)?.values.map(v=>v.name):null,relations:model.fields.filter(r=>r.relationFromFields?.includes(f.name)).map(r=>({target:r.type,from:r.relationFromFields,to:r.relationToFields}))}))});
  }
  const membershipSql='SELECT "A" AS "roleId","B" AS "userId" FROM public."_UserRoles" ORDER BY "A","B"';
  data.UserRoles=(await client.query(membershipSql)).rows;queries.push({id:'memberships',sql:membershipSql,rowCount:data.UserRoles.length});
  const migrationSql='SELECT migration_name,started_at,finished_at,rolled_back_at FROM public._prisma_migrations ORDER BY migration_name';
  data.Migrations=(await client.query(migrationSql)).rows;queries.push({id:'migration_times',sql:migrationSql,rowCount:data.Migrations.length});
  await client.query('ROLLBACK');
  save('current-information.json',{observedAt:context.observed_at,target:{host:url.hostname,port:url.port||'5432',database:context.database},data});save('current-schema.json',schema);
  save('extraction-evidence.json',{context,queries,readOnlyVerified:true,transactionEnded:'ROLLBACK',mutationStatementsExecuted:0,secretValuesSelected:false,excludedUserDates:[...excludedUserDates],membershipColumns:columns.filter(c=>c.table_name==='_UserRoles'),unavailableModels,sourcePriorAudit:PRIOR,counts:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.length]))});
  console.log(JSON.stringify({observedAt:context.observed_at,models:schema.length,dateFields:schema.flatMap(m=>m.fields).filter(f=>f.type==='DateTime').length,users:data.User.length,roles:data.Role.length,readOnly:context.transaction_read_only,unavailableModels}));
 }finally{await client.end();}
}
main().catch(e=>{console.error(String(e.message).replace(/postgres(?:ql)?:\/\/\S+/gi,'[REDACTED_URL]'));process.exitCode=1;});
