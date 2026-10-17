#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const {OUT,PRIVATE,connect,sourceUrl,candidateUrl,save}=require('./systematic-reseed-local.cjs');
const q=x=>'"'+x.replaceAll('"','""')+'"';
async function audit(url,label){
 const c=await connect(url);
 try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const fks=(await c.query(`SELECT con.conname, con.convalidated, src.relname AS source_table, tgt.relname AS target_table,
   ARRAY(SELECT a.attname::text FROM unnest(con.conkey) WITH ORDINALITY k(n,o) JOIN pg_attribute a ON a.attrelid=con.conrelid AND a.attnum=k.n ORDER BY k.o) AS source_columns,
   ARRAY(SELECT a.attname::text FROM unnest(con.confkey) WITH ORDINALITY k(n,o) JOIN pg_attribute a ON a.attrelid=con.confrelid AND a.attnum=k.n ORDER BY k.o) AS target_columns
   FROM pg_constraint con JOIN pg_class src ON src.oid=con.conrelid JOIN pg_class tgt ON tgt.oid=con.confrelid JOIN pg_namespace ns ON ns.oid=src.relnamespace WHERE con.contype='f' AND ns.nspname='public' ORDER BY src.relname,con.conname`)).rows;
  const columns=(await c.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'")).rows;
  const tenantTables=new Set(columns.filter(x=>x.column_name==='organizationId').map(x=>x.table_name));
  const violations=[];
  for(const fk of fks){
   const join=fk.source_columns.map((col,i)=>`s.${q(col)}=t.${q(fk.target_columns[i])}`).join(' AND ');
   const nonnull=fk.source_columns.map(col=>`s.${q(col)} IS NOT NULL`).join(' AND ');
   const missing=Number((await c.query(`SELECT count(*)::text AS count FROM ${q(fk.source_table)} s LEFT JOIN ${q(fk.target_table)} t ON ${join} WHERE ${nonnull} AND t.${q(fk.target_columns[0])} IS NULL`)).rows[0].count);
   if(missing||!fk.convalidated) violations.push({constraint:fk.conname,source:fk.source_table,target:fk.target_table,missing,validated:fk.convalidated});
   if(tenantTables.has(fk.source_table)&&tenantTables.has(fk.target_table)){
    const count=Number((await c.query(`SELECT count(*)::text AS count FROM ${q(fk.source_table)} s JOIN ${q(fk.target_table)} t ON ${join} WHERE s."organizationId" IS DISTINCT FROM t."organizationId"`)).rows[0].count);
    if(count) violations.push({constraint:fk.conname,kind:'cross_tenant',count});
   }
  }
  const checks={};
  const queries={
   inventoryTenant:`SELECT count(*)::int AS count FROM inventory_levels l JOIN items i ON i.id=l."itemId" JOIN locations p ON p.id=l."locationId" WHERE i."organizationId"<>p."organizationId"`,
   inventoryAvailability:`SELECT count(*)::int AS count FROM inventory_levels WHERE "quantityAvailable"<>"quantityOnHand"-"quantityReserved" OR "quantityReserved"<0 OR "quantityAvailable"<0`,
   inventoryValuation:`SELECT count(*)::int AS count FROM inventory_levels WHERE abs("totalValue"-round("quantityOnHand"*"averageCost",2))>0.01`,
   inventoryMovementDrift:`SELECT l.id,l."itemId",l."locationId",l."quantityOnHand"::text AS on_hand,coalesce(t.quantity,0)::text AS movement_total,(l."quantityOnHand"-coalesce(t.quantity,0))::text AS difference FROM inventory_levels l LEFT JOIN (SELECT "itemId","locationId",sum(quantity) quantity FROM inventory_transactions GROUP BY "itemId","locationId") t ON t."itemId"=l."itemId" AND t."locationId"=l."locationId" WHERE l."quantityOnHand"<>coalesce(t.quantity,0) ORDER BY l.id`,
   userRoleTenant:`SELECT count(*)::int AS count FROM "_UserRoles" x JOIN roles r ON r.id=x."A" JOIN users u ON u.id=x."B" WHERE r."organizationId"<>u."organizationId"`,
   itemReferenceTenant:`SELECT count(*)::int AS count FROM items i LEFT JOIN units u ON u.id=i."unitId" LEFT JOIN tax_rates t ON t.id=i."taxRateId" WHERE (u.id IS NOT NULL AND u."organizationId"<>i."organizationId") OR (t.id IS NOT NULL AND t."organizationId"<>i."organizationId")`,
   itemMissingReference:`SELECT id,"nameEn","organizationId","unitId","taxRateId" FROM items WHERE "unitId" IS NULL OR "taxRateId" IS NULL ORDER BY id`,
  };
  for(const [name,sql] of Object.entries(queries)) checks[name]=(await c.query(sql)).rows;
  const report={generatedAt:new Date().toISOString(),database:url.pathname.slice(1),foreignKeysChecked:fks.length,foreignKeyViolations:violations,checks};
  save(path.join(OUT,label+'-integrity.json'),report);
  await c.query('ROLLBACK');
  return {foreignKeysChecked:fks.length,foreignKeyViolations:violations,checks:Object.fromEntries(Object.entries(checks).map(([k,v])=>[k,v.length===1&&'count'in v[0]?v[0].count:v.length]))};
 }finally{await c.end();}
}
if(require.main===module)audit(process.argv.includes('--candidate')?candidateUrl():sourceUrl(),process.argv[2]||'current').then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={audit};
