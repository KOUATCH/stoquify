const fs=require('node:fs'),path=require('node:path'),{Client}=require('pg'),{Prisma}=require('@prisma/client');
const ROOT=path.resolve(__dirname,'../../../..'),{sourceUrl}=require(path.join(ROOT,'scripts/systematic-reseed-local.cjs'));
const queries={
 items:`SELECT i.id,i."organizationId",i."nameEn",i."nameFr",i."isActive",i."unitId",i."taxRateId",u."nameEn" AS "unitName",u.symbol,u.type AS "unitType",u."baseUnit",u."conversionRate"::text,u."isActive" AS "unitActive",t."nameEn" AS "taxName",t.rate::text AS "taxRate",t.type AS "taxType",t."isActive" AS "taxActive" FROM items i LEFT JOIN units u ON u.id=i."unitId" LEFT JOIN tax_rates t ON t.id=i."taxRateId" ORDER BY i."organizationId",i.id`,
 units:`SELECT u.id,u."organizationId",u.symbol,u.type,u."nameEn",u."nameFr",u."baseUnit",u."conversionRate"::text,u."isActive",COUNT(i.id)::int AS "itemUsage" FROM units u LEFT JOIN items i ON i."unitId"=u.id GROUP BY u.id ORDER BY u."organizationId",u.id`,
 taxes:`SELECT t.id,t."organizationId",t."nameEn",t."nameFr",t.rate::text,t.type,t."isActive",COUNT(i.id)::int AS "itemUsage" FROM tax_rates t LEFT JOIN items i ON i."taxRateId"=t.id GROUP BY t.id ORDER BY t."organizationId",t.id`,
 accounting:`SELECT a.id,a."organizationId",a."countryPack",a."taxRegime",o."countryCode",o.currency FROM organization_accounting_settings a JOIN organizations o ON o.id=a."organizationId" ORDER BY a.id`,
};
async function main(){
 const target=sourceUrl();if(!['localhost','127.0.0.1','[::1]'].includes(target.hostname))throw new Error('Local source only');
 const c=new Client({connectionString:target.toString(),options:'-c default_transaction_read_only=on -c statement_timeout=30000'});await c.connect();
 let transaction;const data={};try{await c.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');transaction=(await c.query(`SELECT current_database() AS database,current_setting('transaction_read_only') AS "transactionReadOnly",current_setting('default_transaction_read_only') AS "defaultTransactionReadOnly",current_setting('transaction_isolation') AS isolation,transaction_timestamp() AS "snapshotTime"`)).rows[0];if(transaction.transactionReadOnly!=='on'||transaction.defaultTransactionReadOnly!=='on')throw new Error('Read-only enforcement missing');for(const [key,sql] of Object.entries(queries))data[key]=(await c.query(sql)).rows;await c.query('ROLLBACK');}finally{await c.end();}
 const schemaModels=Prisma.dmmf.datamodel.models.filter(m=>['Item','TaxRate','Unit'].includes(m.name)).map(m=>({model:m.name,table:m.dbName,scalarFields:m.fields.filter(f=>f.kind!=='object').map(f=>f.name)}));
 const report={generatedAt:new Date().toISOString(),transaction,data,schemaModels,queries};fs.writeFileSync(path.join(__dirname,'tax-classification-current-data.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({transaction,items:data.items.map(x=>({id:x.id,name:x.nameEn,unit:x.unitName,unitType:x.unitType,taxId:x.taxRateId,tax:x.taxName,rate:x.taxRate})),units:data.units,taxes:data.taxes,accounting:data.accounting},null,2));
}
main().catch(e=>{console.error(e.message.replace(/postgres(?:ql)?:\/\/\S+/gi,'[REDACTED_URL]'));process.exitCode=1});
