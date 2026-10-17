/* Isolated packaging qualification only: no credentials, database login or business navigation. */
const fs=require("node:fs"),fsp=require("node:fs/promises"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto")
const net=require("node:net"),{spawn}=require("node:child_process"),{pathToFileURL}=require("node:url")
const ROOT=process.cwd(),DIST=".next-remediation-r01-20260930",SOURCE=path.join(ROOT,DIST,"standalone")
const PREFIX="stoquify-relocated-remediation-20260930-"
const hash=value=>crypto.createHash("sha256").update(value).digest("hex")
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
const safeError=code=>{throw Object.assign(new Error(code),{safeCode:code})}
const semanticMarkers=[
  ["INVALID_HOOK_CALL",/Invalid hook call/i],
  ["DUPLICATE_REACT",/multiple copies of React|more than one copy of React|duplicate React/i],
  ["MISSING_REACT_CONTEXT",/No QueryClient set|could not find react-redux context|must be used within.{0,100}Provider|Cannot read properties of null.{0,100}use(?:Context|State|Effect)/i],
]
const within=(root,target)=>{const relative=path.relative(root,target);return relative!==".."&&!relative.startsWith(`..${path.sep}`)&&!path.isAbsolute(relative)}
const report={startedAt:new Date().toISOString(),status:"PREPARING",scope:"Recorded compiled candidate only: relocated standalone boot, unauthenticated login page and static assets; not the subsequently changed checkout",
  databaseConnectionsDisabled:true,credentialLoginAttempted:false,businessRouteRequested:false,environmentValuesEmitted:false,
  originalBuildQualification:"Original next build exited 1 during standalone symlink packaging; separate recovery evidence is required.",
  serverOutputBytes:0,serverDiagnosticMarkers:[],runtimeSemanticMarkers:[],browserExternalRequestsBlocked:0,nonReadRequestsBlocked:0,
  helperSha256:Object.fromEntries(["run-relocated-smoke.cjs","package-resolution-guard.cjs","package-resolution-loader.mjs","../local-only-preload.cjs"].map(name=>[name,hash(fs.readFileSync(path.join(__dirname,name)))]))}
let tempRoot,createdTempRootReal,packageRoot,server,browser,serverExit
const save=()=>fs.writeFileSync(path.join(__dirname,"relocated-smoke.json"),JSON.stringify(report,null,2)+"\n")
async function inventory(directory,expectedHashes) {
  const root=fs.realpathSync(directory),entries=[],excluded=[]
  async function walk(current) {
    for(const name of fs.readdirSync(current).sort()) {
      if(name===".smoke-tools")continue
      const filename=path.join(current,name)
      if(/^\.env(?:\.|$)/i.test(name)){excluded.push(path.relative(root,filename));continue}
      if(!within(root,fs.realpathSync(filename)))safeError("PACKAGE_SYMLINK_ESCAPES_ROOT")
      const stat=fs.statSync(filename)
      if(stat.isDirectory())await walk(filename)
      else if(stat.isFile()){
        const digest=crypto.createHash("sha256")
        for await(const chunk of fs.createReadStream(filename))digest.update(chunk)
        const relativePath=path.relative(root,filename).split(path.sep).join("/"),sha256=digest.digest("hex")
        if(expectedHashes&&expectedHashes[relativePath]!==sha256)safeError("QUALIFIED_PACKAGE_HASH_MISMATCH")
        entries.push({path:relativePath,bytes:stat.size,sha256})
      }
    }
  }
  await walk(root)
  if(expectedHashes){
    const expectedFiles=Object.keys(expectedHashes).filter(filename=>!filename.split("/").some(part=>/^\.env(?:\.|$)/i.test(part)))
    if(expectedFiles.length!==entries.length)safeError("QUALIFIED_PACKAGE_FILE_COUNT_MISMATCH")
  }
  entries.sort((a,b)=>a.path.localeCompare(b.path))
  return {files:entries.length,bytes:entries.reduce((sum,item)=>sum+item.bytes,0),pathContentSha256:hash(JSON.stringify(entries)),excludedEnvironmentFiles:excluded.length}
}
function isolatedEnvironment(origin,port){
  const env={}
  // No inheritance of provider credentials, DB aliases, NODE_PATH or NODE_OPTIONS.
  for(const key of ["PATH","Path","SystemRoot","SYSTEMROOT","WINDIR","ComSpec","COMSPEC","PATHEXT","TEMP","TMP","SystemDrive"]) if(process.env[key])env[key]=process.env[key]
  const disabled="postgresql://disabled:disabled@127.0.0.1:1/disabled?connect_timeout=1&pool_timeout=1"
  const aliases=["DATABASE_URL","DIRECT_URL","TEST_DATABASE_URL","PAYROLL_IMMUTABILITY_DATABASE_URL","POSTGRES_URL","POSTGRES_URL_NON_POOLING","POSTGRES_PRISMA_URL","PRISMA_DATABASE_URL","SHADOW_DATABASE_URL","NEON_DATABASE_URL"]
  for(const alias of aliases)env[alias]=disabled
  Object.assign(env,{PGHOST:"127.0.0.1",PGHOSTADDR:"127.0.0.1",PGPORT:"1",PGUSER:"disabled",PGPASSWORD:"disabled",PGDATABASE:"disabled",PGCONNECT_TIMEOUT:"1",
    NODE_ENV:"production",PORT:String(port),HOSTNAME:"127.0.0.1",NEXT_DIST_DIR:DIST,NEXT_TELEMETRY_DISABLED:"1",
    NEXTAUTH_URL:origin,NEXT_PUBLIC_BASE_URL:origin,BETTER_AUTH_URL:origin,SMOKE_PACKAGE_ROOT:packageRoot})
  const secret=crypto.randomBytes(48).toString("hex")
  Object.assign(env,{NEXTAUTH_SECRET:secret,BETTER_AUTH_SECRET:secret,AUTH_SECRET:secret})
  report.databaseAliasNames=aliases
  report.nodePathUnset=!Object.hasOwn(env,"NODE_PATH")
  report.inheritedNodeOptionsUnset=!Object.hasOwn(env,"NODE_OPTIONS")
  return env
}
async function freePort(){const probe=net.createServer();await new Promise((resolve,reject)=>{probe.once("error",reject);probe.listen(0,"127.0.0.1",resolve)});const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));return port}
async function assertDatabasePortClosed(){
  const state=await new Promise(resolve=>{const socket=net.connect({host:"127.0.0.1",port:1});socket.once("connect",()=>{socket.destroy();resolve("OPEN")});socket.once("error",error=>resolve(error.code));socket.setTimeout(1000,()=>{socket.destroy();resolve("TIMEOUT")})})
  if(state!=="ECONNREFUSED")safeError("DISABLED_DATABASE_PORT_NOT_CONFIRMED_CLOSED")
  report.disabledDatabasePortRefused=true
}
function argumentsFor(entry){return ["--require",path.join(packageRoot,".smoke-tools/package-resolution-guard.cjs"),"--require",path.join(packageRoot,".smoke-tools/local-only-preload.cjs"),"--experimental-loader",pathToFileURL(path.join(packageRoot,".smoke-tools/package-resolution-loader.mjs")).href,entry]}
async function guardProbe(env){
  const outsideCjs=path.join(tempRoot,"outside-probe.cjs"),outsideEsm=path.join(tempRoot,"outside-probe.mjs")
  fs.writeFileSync(outsideCjs,"module.exports = 'must-not-execute'\n");fs.writeFileSync(outsideEsm,"export default 'must-not-execute'\n")
  const probe=path.join(packageRoot,".smoke-tools/verify-boundaries.cjs")
  fs.writeFileSync(probe,`const assert=require('node:assert/strict');\nassert.throws(()=>require(${JSON.stringify(outsideCjs)}),e=>e.code==='ERR_SMOKE_RESOLUTION_OUTSIDE_PACKAGE');\nimport(${JSON.stringify(pathToFileURL(outsideEsm).href)}).then(()=>process.exitCode=2,e=>{assert.equal(e.code,'ERR_SMOKE_ESM_OUTSIDE_PACKAGE');console.log('BOUNDARIES_CONFIRMED')});\n`)
  const child=spawn(process.execPath,argumentsFor(probe),{cwd:packageRoot,env,windowsHide:true,stdio:["ignore","pipe","pipe"]})
  let confirmed=false
  child.stdout.on("data",bytes=>{if(bytes.includes("BOUNDARIES_CONFIRMED"))confirmed=true})
  child.stderr.on("data",()=>{})
  const timeout=setTimeout(()=>child.kill(),30000)
  const code=await new Promise((resolve,reject)=>{child.once("error",reject);child.once("exit",resolve)}).finally(()=>clearTimeout(timeout))
  if(code!==0||!confirmed)safeError("CJS_ESM_BOUNDARY_PROBE_FAILED")
  report.resolutionBoundaryProbe={cjsOutsideRejected:true,esmOutsideRejected:true,workspaceFallbackAllowed:false}
}
async function copyAndQualify(){
  const runner=path.join(ROOT,"what-next/platform-remediation/2026-09-30-run-01/runner")
  const handoffPath=path.join(runner,"standalone-package-hashes.json")
  if(!process.argv.includes("--run-qualified")||!fs.existsSync(handoffPath))safeError("QUALIFIED_PACKAGE_HANDOFF_REQUIRED")
  const handoff=fs.readFileSync(handoffPath)
  const assetReceipt=fs.readFileSync(path.join(runner,"standalone-assets.result.json")),recoveryReceipt=fs.readFileSync(path.join(runner,"standalone-recovery.result.json"))
  const assets=JSON.parse(assetReceipt),recovery=JSON.parse(recoveryReceipt),expectedHashes=JSON.parse(handoff)
  if(assets.status!=="assets-verified"||assets.buildId!=="GqRaF9F_RTehAxrqSBlS2"||path.resolve(assets.packagePath)!==path.resolve(SOURCE)||
    !Array.isArray(assets.mismatches)||assets.mismatches.length!==0||assets.linksFound!==0||assets.safeOutputInspection?.state!=="valid"||
    recovery.status!=="packaging-recovered"||recovery.recordedCandidate!==true||typeof recovery.candidateScope!=="string"||!recovery.candidateScope.trim())safeError("RECORDED_CANDIDATE_QUALIFICATION_INVALID")
  if(!expectedHashes||Array.isArray(expectedHashes)||typeof expectedHashes!=="object"||Object.keys(expectedHashes).length!==assets.packageFileCount||
    Object.entries(expectedHashes).some(([filename,value])=>path.isAbsolute(filename)||filename.split("/").includes("..")||typeof value!=="string"||!/^[a-f0-9]{64}$/.test(value)))safeError("PACKAGE_HASH_MANIFEST_INVALID")
  report.packageQualificationSha256=hash(handoff)
  report.assetReceiptSha256=hash(assetReceipt);report.recoveryReceiptSha256=hash(recoveryReceipt)
  report.recordedCandidateQualification=true
  report.packageQualificationPath=path.relative(ROOT,handoffPath).split(path.sep).join("/")
  if(!fs.existsSync(path.join(SOURCE,"server.js"))||!fs.existsSync(path.join(SOURCE,DIST,"BUILD_ID")))safeError("STANDALONE_ENTRY_OR_BUILD_ID_MISSING")
  if(fs.readFileSync(path.join(SOURCE,DIST,"BUILD_ID"),"utf8").trim()!=="GqRaF9F_RTehAxrqSBlS2")safeError("COMPILED_BUILD_ID_MISMATCH")
  console.log(JSON.stringify({stage:"HASHING_QUALIFIED_SOURCE_PACKAGE"}))
  report.sourcePackage=await inventory(SOURCE,expectedHashes)
  tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),PREFIX));packageRoot=path.join(tempRoot,"package")
  createdTempRootReal=fs.realpathSync(tempRoot)
  if(fs.lstatSync(tempRoot).isSymbolicLink()||within(fs.realpathSync(ROOT),createdTempRootReal)||!path.basename(createdTempRootReal).startsWith(PREFIX))safeError("RELOCATION_PATH_GUARD_FAILED")
  console.log(JSON.stringify({stage:"COPYING_PACKAGE_OUTSIDE_WORKSPACE",files:report.sourcePackage.files,environmentFilesExcluded:report.sourcePackage.excludedEnvironmentFiles}))
  await fsp.cp(SOURCE,packageRoot,{recursive:true,dereference:true,filter:filename=>!/^\.env(?:\.|$)/i.test(path.basename(filename))})
  report.relocatedPackage=await inventory(packageRoot)
  if(report.sourcePackage.pathContentSha256!==report.relocatedPackage.pathContentSha256)safeError("RELOCATION_CONTENT_MISMATCH")
  report.relocation={outsideWorkspace:true,outsideWorkspaceNodeModulesAncestry:true,environmentFilesExcluded:true,temporaryDirectoryRetained:false}
  const helpers=path.join(packageRoot,".smoke-tools");fs.mkdirSync(helpers)
  for(const name of ["package-resolution-guard.cjs","package-resolution-loader.mjs"])fs.copyFileSync(path.join(__dirname,name),path.join(helpers,name))
  fs.copyFileSync(path.join(__dirname,"../local-only-preload.cjs"),path.join(helpers,"local-only-preload.cjs"))
}
async function run(){
  await copyAndQualify()
  await assertDatabasePortClosed()
  const port=await freePort(),origin=`http://127.0.0.1:${port}`,env=isolatedEnvironment(origin,port)
  await guardProbe(env)
  server=spawn(process.execPath,argumentsFor(path.join(packageRoot,"server.js")),{cwd:packageRoot,env,windowsHide:true,stdio:["ignore","pipe","pipe"]})
  report.server={pid:server.pid,origin,generatedStandaloneEntryUsed:true,applicationWorkingDirectoryOutsideRepository:true}
  serverExit=new Promise(resolve=>{server.once("exit",(code,signal)=>{report.serverExit={code,signal};resolve()});server.once("error",()=>resolve())})
  let diagnosticTail=""
  const count=bytes=>{
    report.serverOutputBytes+=bytes.length
    for(const marker of ["ERR_SMOKE_RESOLUTION_OUTSIDE_PACKAGE","ERR_SMOKE_ESM_OUTSIDE_PACKAGE","MODULE_NOT_FOUND","ERR_MODULE_NOT_FOUND","ERR_SMOKE_EXTERNAL_NETWORK_DISABLED","PrismaClientInitializationError","ECONNREFUSED","EADDRINUSE"])if(bytes.includes(marker)&&!report.serverDiagnosticMarkers.includes(marker))report.serverDiagnosticMarkers.push(marker)
    const text=diagnosticTail+bytes.toString("utf8")
    for(const [label,pattern]of semanticMarkers)if(pattern.test(text)&&!report.runtimeSemanticMarkers.includes(label))report.runtimeSemanticMarkers.push(label)
    diagnosticTail=text.slice(-512)
  }
  server.stdout.on("data",count);server.stderr.on("data",count)
  let ready=false
  for(let attempt=0;attempt<90;attempt++){
    if(server.exitCode!==null)safeError("RELOCATED_SERVER_EXITED_BEFORE_LISTENING")
    ready=await new Promise(resolve=>{const socket=net.connect({host:"127.0.0.1",port});socket.once("connect",()=>{socket.destroy();resolve(true)});socket.once("error",()=>resolve(false));socket.setTimeout(500,()=>{socket.destroy();resolve(false)})})
    if(ready)break
    await pause(1000)
  }
  if(!ready)safeError("RELOCATED_SERVER_START_TIMEOUT")
  report.serverListening=true
  const {chromium}=require("playwright")
  browser=await chromium.launch({headless:true})
  const context=await browser.newContext({serviceWorkers:"block",viewport:{width:1440,height:1000}})
  await context.route("**/*",route=>{
    const request=route.request(),url=new URL(request.url())
    if(url.origin!==origin){report.browserExternalRequestsBlocked++;return route.abort("blockedbyclient")}
    if(request.method()!=="GET"&&request.method()!=="HEAD"){report.nonReadRequestsBlocked++;return route.abort("blockedbyclient")}
    if(/^\/api\/(internal|cron|jobs|workers)(\/|$)/.test(url.pathname))return route.abort("blockedbyclient")
    return route.continue()
  })
  const page=await context.newPage(),assets={responses:0,successful:0,failed:0}
  let pageErrors=0,consoleErrors=0
  page.on("pageerror",()=>{pageErrors++})
  page.on("console",message=>{
    if(message.type()==="error")consoleErrors++
    for(const [label,pattern]of semanticMarkers)if(pattern.test(message.text())&&!report.runtimeSemanticMarkers.includes(label))report.runtimeSemanticMarkers.push(label)
  })
  page.on("response",response=>{if(new URL(response.url()).pathname.startsWith("/_next/static/")){assets.responses++;if(response.ok())assets.successful++;else assets.failed++}})
  const response=await page.goto(`${origin}/en/login`,{waitUntil:"domcontentloaded",timeout:90000})
  await page.waitForLoadState("networkidle",{timeout:15000}).catch(()=>{})
  await page.locator('input[type="email"]').waitFor({state:"visible",timeout:30000}).catch(()=>{})
  report.loginPage={httpStatus:response?.status()||null,expectedRoute:new URL(page.url()).pathname==="/en/login",
    emailInputVisible:await page.locator('input[type="email"]').first().isVisible().catch(()=>false),
    passwordInputVisible:await page.locator('input[type="password"]').first().isVisible().catch(()=>false),clientErrorCount:pageErrors,consoleErrorCount:consoleErrors}
  report.staticAssets=assets
  await page.addStyleTag({content:"*{color:transparent!important;text-shadow:none!important;background-image:none!important}img,svg,canvas,video,iframe,input,textarea,select{visibility:hidden!important}*::before,*::after{content:none!important}"})
  await page.screenshot({path:path.join(__dirname,"login-page-redacted.png"),fullPage:false,animations:"disabled"})
  report.status=report.loginPage.httpStatus===200&&report.loginPage.expectedRoute&&report.loginPage.emailInputVisible&&report.loginPage.passwordInputVisible&&pageErrors===0&&consoleErrors===0&&report.runtimeSemanticMarkers.length===0&&assets.responses>0&&assets.failed===0
    &&!report.serverDiagnosticMarkers.some(marker=>["ERR_SMOKE_RESOLUTION_OUTSIDE_PACKAGE","ERR_SMOKE_ESM_OUTSIDE_PACKAGE","MODULE_NOT_FOUND","ERR_MODULE_NOT_FOUND"].includes(marker))?"RELOCATED_LOGIN_AND_ASSETS_PASS":"RELOCATED_RUNTIME_PARTIAL"
  if(report.status!=="RELOCATED_LOGIN_AND_ASSETS_PASS")process.exitCode=1
}
async function cleanup(){
  if(browser)await browser.close().catch(()=>{})
  if(server&&server.exitCode===null&&server.pid){server.kill();await Promise.race([serverExit,pause(10000)]);report.ownedServerStopped=server.exitCode!==null||server.signalCode!==null}else report.ownedServerStopped=true
  if(tempRoot){
    const base=fs.realpathSync(os.tmpdir()),resolved=fs.realpathSync(tempRoot)
    if(fs.lstatSync(tempRoot).isSymbolicLink()||!createdTempRootReal||resolved!==createdTempRootReal||!within(base,resolved)||!path.basename(resolved).startsWith(PREFIX)||resolved===base)safeError("TEMP_CLEANUP_PATH_GUARD_FAILED")
    if(report.ownedServerStopped){await fsp.rm(resolved,{recursive:true,force:false,maxRetries:3,retryDelay:500});report.temporaryPackageRemoved=true}
    else report.temporaryPackageRemoved=false
  }
}
async function main(){try{await run()}catch(error){report.status="BLOCKED";report.errorCode=error.safeCode||(/^[A-Z0-9_]+$/.test(error.code||"")?error.code:"RELOCATED_SMOKE_FAILED");process.exitCode=1}
  finally{try{await cleanup()}catch(error){report.cleanupErrorCode=error.safeCode||error.code||"CLEANUP_FAILED";process.exitCode=1}report.completedAt=new Date().toISOString();save();console.log(JSON.stringify(report,null,2))}}
main().catch(error=>{console.log(JSON.stringify({status:"EVIDENCE_WRITE_FAILED",code:error.code||"UNKNOWN"}));process.exitCode=1})
