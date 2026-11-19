const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=process.cwd(),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),owned=JSON.parse(fs.readFileSync(path.join(__dirname,'owned-application-files.json'),'utf8'));
const listed=spawnSync('rg',['--files','actions','services','lib','hooks','components','app','types','prisma','-g','*.ts','-g','*.tsx','-g','*.sql','-g','*.prisma'],{encoding:'utf8',windowsHide:true});if(listed.status!==0)throw Error('Source inventory failed');
const files=[...new Set([...listed.stdout.trim().split(/\r?\n/).map(p=>p.replaceAll('\\','/')),'messages/en.json','messages/fr.json','package.json','package-lock.json','jest.cross-workflow-phase3.config.cjs','jest.workflow-closure-ui.config.cjs','tsconfig.workflow-closure.json'])].sort();
const manifest=files.map(file=>({file,sha256:hash(fs.readFileSync(path.join(root,file)))}));
const head=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).stdout.trim();
fs.writeFileSync(path.join(__dirname,'final-source-manifest.json'),JSON.stringify({at:new Date().toISOString(),head,fingerprint:hash(JSON.stringify(manifest)),files:manifest},null,2));
let diff='';for(const file of owned){const baseline=path.join(__dirname,'baseline',file);if(!fs.existsSync(baseline))throw Error('Missing owned baseline '+file);const r=spawnSync('git',['diff','--no-index','--',baseline,path.join(root,file)],{encoding:'utf8',windowsHide:true});if(r.status!==0&&r.status!==1)throw Error('Diff failed');diff+=r.stdout;}
fs.writeFileSync(path.join(__dirname,'owned-application.patch'),diff);
const summary={head,sourceFiles:manifest.length,fingerprint:hash(JSON.stringify(manifest)),ownedApplicationFiles:owned.map(file=>({file,sha256:hash(fs.readFileSync(path.join(root,file))),beforeSha256:hash(fs.readFileSync(path.join(__dirname,'baseline',file)))})),checks:{}};
for(const [name,file] of Object.entries({authoring:'authoring-results.json',worker:'worker-results.json',ap:'ap-results.json',mocked:'clone-action-hook-results.json'})){const r=JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8'));summary.checks[name]={success:r.success,passed:r.numPassedTests,failed:r.numFailedTests};if(!r.success)throw Error(name+' has not passed')}
for(const name of ['upgrade','restore','clone-browser']){const r=JSON.parse(fs.readFileSync(path.join(__dirname,name+'-results.json'),'utf8'));summary.checks[name]={status:r.status,...(r.database?{database:r.database}:{}),...(r.tables?{tables:r.tables.length}:{})};if(r.status!=='PASS')throw Error(name+' has not passed')}
summary.checks.authenticatedBrowser=JSON.parse(fs.readFileSync(path.join(__dirname,'authenticated-browser-results.json'),'utf8')).map(r=>({locale:r.locale,status:r.status,requestId:r.requestId}));
summary.typecheckLogBytes=fs.statSync(path.join(__dirname,'typecheck.log')).size;
fs.writeFileSync(path.join(__dirname,'final-summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({head,sourceFiles:manifest.length,checks:summary.checks,typecheckLogBytes:summary.typecheckLogBytes}));
