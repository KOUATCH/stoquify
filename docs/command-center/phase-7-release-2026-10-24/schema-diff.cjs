const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {state,environment,root,redact}=require('./environment.cjs');
const s=state();
const r=spawnSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'migrate','diff','--from-url',s.url,'--to-schema-datamodel',path.join(s.candidate,'prisma/schema.prisma'),'--script','--exit-code'],{cwd:s.work,env:environment(s,'test'),windowsHide:true,encoding:'utf8',timeout:180000,maxBuffer:30e6});
fs.writeFileSync(path.join(__dirname,'schema-diff.sql'),redact(r.stdout));fs.writeFileSync(path.join(__dirname,'schema-diff.log'),redact(r.stderr));fs.writeFileSync(path.join(__dirname,'schema-diff-result.json'),JSON.stringify({exitCode:r.status,applied:false,scope:'Read-only comparison of replayed disposable database against captured Prisma schema'},null,2));console.log(JSON.stringify({exitCode:r.status,applied:false}));
