// Fresh source copy, no application environment files. Shared installed dependencies only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=process.cwd(),app=path.join(root,'.codex-tmp/close-browser-app');
if(fs.existsSync(app))throw Error('Isolated app already exists; do not overwrite another run');
fs.mkdirSync(app);const files=[];
function copy(source,destination){const s=fs.lstatSync(source);if(s.isSymbolicLink())throw Error('Unexpected source link');if(s.isDirectory()){fs.mkdirSync(destination,{recursive:true});for(const name of fs.readdirSync(source))copy(path.join(source,name),path.join(destination,name));}else{fs.copyFileSync(source,destination);files.push({file:path.relative(root,source).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')})}}
for(const dir of ['actions','app','components','config','hooks','i18n','lib','messages','prisma','public','scripts','services','src','types','validations'])if(fs.existsSync(dir))copy(path.join(root,dir),path.join(app,dir));
for(const file of ['next.config.mjs','postcss.config.mjs','tailwind.config.ts','tsconfig.json','next-env.d.ts','middleware.ts','package.json'])copy(path.join(root,file),path.join(app,file));
fs.symlinkSync(path.join(root,'node_modules'),path.join(app,'node_modules'),'junction');
fs.writeFileSync(path.join(__dirname,'start-source.json'),JSON.stringify({at:new Date().toISOString(),head:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),files},null,2));
fs.writeFileSync(path.join(__dirname,'start-working-tree.txt'),spawnSync('git',['status','--short'],{encoding:'utf8',maxBuffer:8*1024*1024}).stdout);
console.log(JSON.stringify({app,files:files.length,noEnvironmentFiles:true}));
