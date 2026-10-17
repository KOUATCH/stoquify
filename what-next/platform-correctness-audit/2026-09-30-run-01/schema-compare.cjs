const fs=require('fs'),path=require('path');const dir=__dirname;
const models=JSON.parse(fs.readFileSync(path.join(dir,'verification/schema-model-details.json'),'utf8'));
const db=JSON.parse(fs.readFileSync(path.join(dir,'verification/database-metadata.json'),'utf8'));
const migrations=JSON.parse(fs.readFileSync(path.join(dir,'verification/migration-inventory.json'),'utf8'));
const names=new Set(models.map(m=>m.name)),tableNames=new Set(db.tables.map(t=>t.table_name));
const missingTables=[],missingColumns=[],extraColumns=[];
for(const m of models){if(!tableNames.has(m.table)){missingTables.push(m.table);continue;}const expected=m.fields.map(f=>f.text.match(/^(\w+)\s+(\w+)(\??|\[\])(?:\s|$)/)).filter(Boolean).filter(a=>!names.has(a[2])).map(a=>({name:a[1],type:a[2]}));
 const actual=db.columns.filter(c=>c.table_name===m.table);const set=new Set(actual.map(c=>c.column_name));
 for(const f of expected)if(!set.has(f.name))missingColumns.push({model:m.name,table:m.table,field:f.name});
 const expectedSet=new Set(expected.map(f=>f.name));for(const c of actual)if(!expectedSet.has(c.column_name))extraColumns.push({table:m.table,column:c.column_name,note:'May be scalar array or mapped field; inspect before classifying drift'});
}
const local=migrations.map(m=>({name:m.path.split('/')[2],hash:m.sha256}));const applied=db.migrations||[];
const result={capturedAt:new Date().toISOString(),scope:'Local configured database only; scalar-name comparison, constraints catalog retained separately',models:models.length,tables:db.tables.length,missingTables,missingColumns,extraColumns,extraTables:db.tables.filter(t=>!models.some(m=>m.table===t.table_name)).map(t=>t.table_name),migrations:{local:local.length,recorded:applied.length,pending:local.filter(m=>!applied.some(a=>a.migration_name===m.name&&a.finished_at&&!a.rolled_back_at)).map(m=>m.name),checksumMismatch:local.filter(m=>applied.some(a=>a.migration_name===m.name&&a.checksum!==m.hash)).map(m=>m.name),unfinished:applied.filter(a=>!a.finished_at&&!a.rolled_back_at).map(a=>a.migration_name),databaseOnly:applied.filter(a=>!local.some(m=>m.name===a.migration_name)).map(a=>a.migration_name)},rlsTableCount:db.tables.filter(t=>t.rls).length,triggerCount:db.triggers.length,checkConstraints:db.constraints.filter(c=>c.contype==='c'),journalTriggers:db.triggers.filter(t=>/journal_entries|journal_entry_lines/.test(t.table_name)),journalConstraints:db.constraints.filter(c=>/journal_entries|journal_entry_lines/.test(c.table_name))};
fs.writeFileSync(path.join(dir,'verification/schema-database-comparison.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,checkConstraints:result.checkConstraints.length,journalConstraints:result.journalConstraints.length},null,2));
