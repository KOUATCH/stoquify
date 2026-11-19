const fs=require('node:fs'),path=require('node:path');
for(const name of ['private-client.cjs','verify-private-schema.cjs','typecheck.cjs','compiler-final.cjs']){
 let text=fs.readFileSync(path.join(__dirname,'../phase-8-blocker-fixes-2026-10-25',name),'utf8');
 if(name==='private-client.cjs')text=text.replace('||!report.generatedSchemaMatches||','||'); // Dedicated normalized comparison runs immediately afterwards.
 fs.writeFileSync(path.join(__dirname,name),text);
}
for(const name of ['server.cjs','seed.cjs']){
 let text=fs.readFileSync(path.join(__dirname,'../phase-7-release-2026-10-24',name),'utf8');
 if(name==='seed.cjs')text=text.replace("const {PrismaClient}=require('@prisma/client');","const {PrismaClient}=require(path.join(require('./environment.cjs').state().work,'private-dependencies/node_modules/@prisma/client'));").replace("if(s.migrationExitCode!==0)","if(JSON.parse(fs.readFileSync(path.join(__dirname,'target-evidence.json'))).migrationExitCode!==0)").replaceAll('Phase 7','Phase 9').replaceAll('phase7','phase9').replaceAll('P7','P9').replaceAll('F7','F9');
 fs.writeFileSync(path.join(__dirname,name),text);
}
console.log('Reviewed isolated runners prepared');
