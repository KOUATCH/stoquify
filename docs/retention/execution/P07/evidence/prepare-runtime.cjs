// Copy previously reviewed isolated infrastructure, retaining P06 evidence.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../../../..'), previous=path.join(root,'docs/retention/execution/P06-operator-2026-10-17');
for(const name of ['database.cjs','application.cjs']) {
  const dest=path.join(__dirname,name); if(fs.existsSync(dest))throw Error('Refusing overwrite');
  let text=fs.readFileSync(path.join(previous,name),'utf8')
    .replaceAll("'../../../..'","'../../../../..'").replaceAll('retention-p06-operator','retention-p07-setup').replaceAll('stoquify_pos_audit_20261017','stoquify_retention_p07_20261017').replaceAll('3187','3188');
  if(name==='database.cjs') text=text.replace("const mode = process.argv[2]","const mode = process.argv[2]\n  if (!['create','start','stop'].includes(mode)) throw new Error('P07 only permits owned cluster lifecycle')");
  fs.writeFileSync(dest,text,{flag:'wx'});
}
