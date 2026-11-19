const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const root=path.resolve(__dirname,'../../../../..'), read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))
const selected=[]
for(const file of ['graphify-out/graph_components.json','graphify-out/ordered-code-graph.json']){
 const graph=read(file), nodes=graph.nodes??graph.graph?.nodes??[]
 for(const node of nodes)if(/daily.habit|professionalpossystem|commitpossale/i.test(JSON.stringify(node)))selected.push({file,node})
}
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')
const results={utc:new Date().toISOString(),graphRefresh:'2026-08-09; discovery only, current source inspected',nodes:selected.slice(0,30),versions:Object.fromEntries(['next','react','@prisma/client'].map(name=>[name,require(path.join(root,'node_modules',name,'package.json')).version])),prerequisites:{}}
for(const [name,dir] of [['P05','docs/retention/execution/P05-P06-closure-2026-10-17'],['P07','docs/retention/execution/P07-media-2026-10-18/evidence']]){
 const files=fs.readdirSync(path.join(root,dir)).filter(f=>/results\.json$/.test(f)&&!/prior|red|initial/i.test(f))
 results.prerequisites[name]=files.map(file=>{const data=read(dir+'/'+file);return {file:dir+'/'+file,sha256:hash(dir+'/'+file),passed:data.numPassedTests,failed:data.numFailedTests,pending:data.numPendingTests,success:data.success}})
}
fs.writeFileSync(path.join(__dirname,'SOURCE_REVIEW.json'),JSON.stringify(results,null,2))
console.log(JSON.stringify({versions:results.versions,nodes:selected.slice(0,12),prerequisites:results.prerequisites}))
