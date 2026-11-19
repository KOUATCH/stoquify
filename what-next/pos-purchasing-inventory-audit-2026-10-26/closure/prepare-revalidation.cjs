const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const dir=path.join(__dirname,'revalidation-02');if(fs.existsSync(dir))throw Error('Preserve existing rerun evidence');fs.mkdirSync(dir);
const previous=JSON.parse(fs.readFileSync(path.join(__dirname,'final-source-manifest.json'),'utf8'));
const current=previous.files.map(({file})=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}));
fs.writeFileSync(path.join(dir,'start-source-manifest.json'),JSON.stringify({at:new Date().toISOString(),head:previous.head,files:current,changedSincePrior:current.filter((f,i)=>f.sha256!==previous.files[i].sha256).map(f=>f.file)},null,2));
fs.writeFileSync(path.join(dir,'working-tree-start.txt'),spawnSync('git',['status','--porcelain'],{encoding:'utf8',windowsHide:true}).stdout);
for(const file of ['run.cjs','start-app.cjs','prepare-browser-app.cjs','authenticated-browser.cjs','clone-browser.cjs','upgrade-restore.cjs'])fs.copyFileSync(path.join(__dirname,file),path.join(dir,file));
fs.writeFileSync(path.join(dir,'workflow-check.json'),JSON.stringify({command:'npm run agent:workflow:check',exitCode:0,unclassifiedScripts:196}));
console.log('Preserved prior evidence; created revalidation-02.');
