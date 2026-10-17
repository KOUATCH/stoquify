const fs=require('fs');
const path=require('path');
const {PRIVATE,OUT,save}=require('./systematic-reseed-local.cjs');
function compare(before,after){
 const tables=[];
 for(const [table,rows] of Object.entries(before)){
  const key=row=>row.id||JSON.stringify([row.A,row.B]);
  const actual=new Map((after[table]||[]).map(row=>[key(row),row]));
  const missing=[]; const changed=[];
  for(const row of rows){const current=actual.get(key(row));if(!current)missing.push(key(row));else if(JSON.stringify(row)!==JSON.stringify(current))changed.push({id:key(row),fields:Object.keys(row).filter(k=>JSON.stringify(row[k])!==JSON.stringify(current[k]))});}
  tables.push({table,beforeCount:rows.length,afterCount:actual.size,missing,changed,added:actual.size-rows.length+missing.length});
 }
 return {passed:tables.every(x=>!x.missing.length&&!x.changed.length),tables};
}
if(require.main===module){const label=process.argv[2];if(!label||!/^[a-z0-9-]+$/i.test(label))throw new Error('Snapshot label required');const before=JSON.parse(fs.readFileSync(path.join(PRIVATE,'preserved-baseline-preservation.json')));const after=JSON.parse(fs.readFileSync(path.join(PRIVATE,label+'-preservation.json')));const result=compare(before,after);save(path.join(OUT,label+'-preservation-check.json'),result);console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;}
module.exports={compare};
