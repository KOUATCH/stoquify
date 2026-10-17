const assert=require("node:assert/strict"),http=require("node:http"),net=require("node:net"),fs=require("node:fs"),path=require("node:path")
require("./local-only-preload.cjs")
async function main(){
  const server=http.createServer((request,response)=>response.end("fixture"))
  const results=[]
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve))
    const response=await fetch(`http://127.0.0.1:${server.address().port}`)
    assert.equal(await response.text(),"fixture")
    results.push({name:"loopback HTTP socket remains available",passed:true})
    for(const hostname of ["example.invalid","192.0.2.1"]) {
      assert.throws(()=>net.connect({host:hostname,port:443}),error=>error.code==="ERR_SMOKE_EXTERNAL_NETWORK_DISABLED")
    }
    results.push({name:"external hostname and IP refused before socket connection",passed:true})
    const result={generatedAt:new Date().toISOString(),status:"PASS",databaseAccess:false,results}
    fs.writeFileSync(path.join(__dirname,"harness-guard-verification.json"),JSON.stringify(result,null,2)+"\n")
    console.log(JSON.stringify(result))
  } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.log(JSON.stringify({status:"FAILED",name:error.name,code:error.code||"GUARD_CHECK_FAILED"}));process.exitCode=1})
