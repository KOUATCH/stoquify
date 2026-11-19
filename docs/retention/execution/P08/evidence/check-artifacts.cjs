const fs=require('node:fs'),path=require('node:path')
const base=path.resolve(__dirname,'..'),root=path.resolve(__dirname,'../../../../..'),broken=[]
for(const name of ['RESULT.md','TASK_SCRIPTS.md','UI_STATE_EVIDENCE.md','RUN_PLAN.md']){
 const file=path.join(base,name),text=fs.readFileSync(file,'utf8')
 for(const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)){
  const href=match[1].replace(/^<|>$/g,'').split('#')[0]
  if(!href||/^[a-z]+:\/\//i.test(href))continue
  const resolved=path.resolve(path.dirname(file),href)
  if(!resolved.startsWith(root+path.sep)||!fs.existsSync(resolved))broken.push({file:name,href})
 }
}
const result={utc:new Date().toISOString(),status:broken.length?'FAIL':'PASS',broken}
fs.writeFileSync(path.join(__dirname,'ARTIFACT_LINKS.json'),JSON.stringify(result,null,2));console.log(result);if(broken.length)process.exitCode=1
