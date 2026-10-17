const fs=require('fs'),path=require('path');
const {Client}=require('pg'),{Prisma}=require('@prisma/client');
const OUT=__dirname,ROOT=path.resolve(OUT,'../../..');
require('dotenv').config({path:path.join(ROOT,'.env'),quiet:true});
const read=n=>JSON.parse(fs.readFileSync(path.join(OUT,n),'utf8'));
const save=(n,v)=>fs.writeFileSync(path.join(OUT,n),JSON.stringify(v,null,2)+'\n');
const quote=v=>'"'+v.replaceAll('"','""')+'"';
async function main(){
 const old=read('schema-fields.json'),contracts=read('capability-contracts.json').contracts;
 const fieldsByModel={};
 for(const f of contracts.flatMap(c=>c.requiredDataFields)){
  if(old.some(m=>m.model===f.model&&m.fields.some(x=>x.name===f.field)))continue;
  (fieldsByModel[f.model]??=new Set()).add(f.field);
 }
 const url=new URL(process.env.DATABASE_URL.replace(/\$\{([^}]+)\}/g,(_,k)=>process.env[k]||''));
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.pathname!=='/stoquify_replay_next_20260830')throw new Error('Unexpected target');
 const client=new Client({connectionString:url.toString(),application_name:'stoquify_workflow_fields_readonly',options:'-c default_transaction_read_only=on -c statement_timeout=30000'});
 const data={},schema=[],queries=[];await client.connect();
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const context=(await client.query("SELECT current_database() AS database,current_setting('transaction_read_only') AS transaction_read_only,current_setting('default_transaction_read_only') AS default_transaction_read_only,transaction_timestamp() AS observed_at")).rows[0];
  if(context.transaction_read_only!=='on'||context.default_transaction_read_only!=='on')throw new Error('Read-only not enforced');
  for(const [name,set] of Object.entries(fieldsByModel)){
   const model=Prisma.dmmf.datamodel.models.find(m=>m.name===name);if(!model)throw new Error('Missing model '+name);
   for(const f of model.fields)if(f.kind!=='object'&&(f.isId||['organizationId','status'].includes(f.name)))set.add(f.name);
   for(const relation of model.fields.filter(f=>f.kind==='object'))for(const key of relation.relationFromFields||[])set.add(key);
   const fields=[...set].map(n=>model.fields.find(f=>f.name===n));
   if(fields.some(f=>!f||f.kind==='object'||/password|secret|token|salary|accountNumber/i.test(f.name)))throw new Error('Unsafe or unsupported field '+name);
   const sql='SELECT '+fields.map(f=>quote(f.dbName||f.name)+(f.dbName?' AS '+quote(f.name):'')).join(',')+' FROM public.'+quote(model.dbName||model.name)+' ORDER BY '+quote(model.fields.find(f=>f.isId)?.name||fields[0].name);
   const result=await client.query(sql);data[name]=result.rows;queries.push({id:'workflow_'+name,sql,rowCount:result.rowCount});
   schema.push({model:name,table:model.dbName||name,fields:fields.map(f=>({name:f.name,column:f.dbName||f.name,type:f.type,list:f.isList,required:f.isRequired,id:f.isId,unique:f.isUnique,allowedValues:f.kind==='enum'?Prisma.dmmf.datamodel.enums.find(e=>e.name===f.type)?.values.map(v=>v.name):undefined,relations:model.fields.filter(r=>r.relationFromFields?.includes(f.name)).map(r=>({target:r.type,from:r.relationFromFields,to:r.relationToFields,onDelete:r.relationOnDelete}))})),uniqueFields:model.uniqueFields});
  }
  await client.query('ROLLBACK');
  save('workflow-extract.json',{observedAt:context.observed_at,data});save('workflow-schema-fields.json',schema);save('workflow-extraction-audit.json',{context,queries,readOnlyVerified:true,transactionEnded:'ROLLBACK',mutationStatementsExecuted:0,secretFieldsSelected:false});
  console.log(JSON.stringify({models:schema.length,fields:schema.reduce((n,s)=>n+s.fields.length,0),records:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.length])),readOnly:context.transaction_read_only}));
 }finally{await client.end();}
}
main().catch(e=>{console.error(String(e.message).replace(/postgres(?:ql)?:\/\/\S+/gi,'[REDACTED_URL]'));process.exitCode=1;});
