// Snapshot application sources without environment files; only this task's directory is written.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=process.cwd(),target=path.join(root,'.codex-tmp/workflow-closure-app'),privatePath=path.join(root,'.codex-tmp/workflow-closure-private.json');
fs.mkdirSync(target,{recursive:true});
if(!fs.existsSync(privatePath)){
 const source=new URL(require(path.join(root,'scripts/prisma-local-fresh-bootstrap')).loadDatabaseUrl());
 if(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1'].includes(source.hostname))throw Error('Local disposable target only');
 source.hostname='localhost';source.pathname='/stoquify_pos_audit_20261026_d30f';source.searchParams.set('schema','public');source.searchParams.set('connection_limit','8');
 fs.writeFileSync(privatePath,JSON.stringify({url:source.toString(),base:'http://127.0.0.1:3168',password:crypto.randomBytes(24).toString('base64url'),secret:crypto.randomBytes(32).toString('hex')}));
}
const prior=JSON.parse(fs.readFileSync(path.join(__dirname,'../phase3/final-source-manifest.json'),'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const drift=prior.files.filter(f=>!fs.existsSync(f.path)||sha(f.path)!==f.sha256).map(f=>f.path);
fs.writeFileSync(path.join(__dirname,'start-provenance.json'),JSON.stringify({at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),drift},null,2));
fs.writeFileSync(path.join(__dirname,'working-tree-start.txt'),execFileSync('git',['status','--porcelain=v1','--untracked-files=all'],{encoding:'utf8',maxBuffer:20*1024*1024}));
for(const folder of ['actions','app','components','config','hooks','i18n','lib','messages','prisma','services','types','validations','src','public'])if(fs.existsSync(path.join(root,folder)))fs.cpSync(path.join(root,folder),path.join(target,folder),{recursive:true,filter:p=>!p.split(path.sep).some(s=>['node_modules','__tests__','.git'].includes(s)||s==='.env'||s.startsWith('.env.'))});
for(const name of ['package.json','tsconfig.json','next-env.d.ts','next.config.mjs','postcss.config.mjs','tailwind.config.ts','middleware.ts'])fs.copyFileSync(path.join(root,name),path.join(target,name));
fs.mkdirSync(path.join(target,'scripts'),{recursive:true});fs.copyFileSync(path.join(root,'scripts/dev-app-safe.js'),path.join(target,'scripts/dev-app-safe.js'));
if(!fs.existsSync(path.join(target,'node_modules')))fs.symlinkSync(path.join(root,'node_modules'),path.join(target,'node_modules'),'junction');
console.log(JSON.stringify({snapshot:target,environmentFilesCopied:false,drift}));
