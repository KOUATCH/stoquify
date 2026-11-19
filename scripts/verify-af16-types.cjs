const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),c=require('./af16-verification-context.cjs')
const lanes=['accountant-portfolio','firm-engagement','firm-engagement-workflows','delegated-evidence','provider-formats','review-workpaper','opening-position','opening-cutover','obligation-register','advisory-outcomes','firm-practice']
const include=[...new Set(lanes.flatMap(lane=>JSON.parse(fs.readFileSync(path.join(c.root,`tsconfig.${lane}.json`),'utf8')).include))]
const config={extends:'./tsconfig.json',compilerOptions:{incremental:false,noEmit:true,paths:{'@/*':['./*'],'@prisma/client':['./.codex-tmp/af16-prisma/client']}},include}
fs.writeFileSync(path.join(c.root,'tsconfig.af16.json'),JSON.stringify(config,null,2)+'\n')
const result=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.af16.json','--pretty','false'],{cwd:c.root,windowsHide:true,encoding:'utf8',timeout:600000,maxBuffer:8e6})
fs.writeFileSync(path.join(c.output,'types.log'),(result.stdout||'')+(result.stderr||''))
fs.writeFileSync(path.join(c.output,'types.json'),JSON.stringify({exitCode:result.status,lanes,include,noEmit:true,scope:'Current AF01–AF13 source entrypoints and imported dependencies; not a full build.'},null,2))
console.log('AF16 scoped types exit '+result.status);process.exitCode=result.status??1
