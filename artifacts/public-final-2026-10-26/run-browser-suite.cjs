const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.argv[2];assert.ok(['chrome','firefox','webkit'].includes(engine));const results=[];
const stages=['prehydration','recovery','site-audit','interactions','registration','accessibility-interactions'],start=process.argv[3]||stages[0];assert.ok(stages.includes(start));
for(const script of stages.slice(stages.indexOf(start))){
 console.log(JSON.stringify({engine,starting:script}));const fd=fs.openSync(path.join(__dirname,`${engine}-${script}.log`),'w');let result;
 try{result=spawnSync(process.execPath,[path.join(__dirname,script+'.cjs')],{cwd:process.cwd(),env:{...process.env,REVIEW_BROWSER:engine,PLAYWRIGHT_BROWSERS_PATH:'C:/Users/J COMPUTER/AppData/Local/ms-playwright'},windowsHide:true,stdio:['ignore',fd,fd],timeout:1200000});}finally{fs.closeSync(fd);}
 const entry={script,exitCode:result.status,error:result.error?.message};results.push(entry);console.log(JSON.stringify({engine,...entry}));fs.writeFileSync(path.join(__dirname,engine+'-suite.json'),JSON.stringify(results,null,2));if(result.status!==0){process.exitCode=1;break;}
}
