#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const {spawn,spawnSync}=require('child_process');
const {chromium}=require('@playwright/test');
const {ROOT,OUT,PRIVATE,sourceUrl,candidateUrl,save}=require('./systematic-reseed-local.cjs');
const BASE='http://127.0.0.1:3317';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
 const target=process.argv.includes('--source')?'source':'candidate';
 const url=target==='source'?sourceUrl():candidateUrl();
 const credentials=JSON.parse(fs.readFileSync(path.join(PRIVATE,target+'-new-credentials.json'),'utf8'));
 const file=fs.openSync(path.join(PRIVATE,target+'-browser-server.log'),'a');
 const server=spawn(process.execPath,[path.join(ROOT,'node_modules/next/dist/bin/next'),'dev','-p','3317','--hostname','127.0.0.1'],{cwd:ROOT,env:{...process.env,DATABASE_URL:url.toString(),NODE_ENV:'development',NEXT_DIST_DIR:'.next-systematic-reseed',NEXTAUTH_URL:BASE,NEXT_PUBLIC_BASE_URL:BASE,STOQUIFY_COMMAND_AGENT_KILL_SWITCH:'1'},windowsHide:true,stdio:['ignore',file,file]});
 const results=[];let browser;
 try{
  let ready=false;
  for(let n=0;n<120;n++){
   if(server.exitCode!==null)throw new Error('Isolated development server exited: '+server.exitCode);
   try{const r=await fetch(BASE+'/api/auth/ok',{signal:AbortSignal.timeout(5000)});if(r.status<500){ready=true;break;}}catch{}
   await wait(1000);
  }
  if(!ready)throw new Error('Isolated candidate server did not become ready.');
  console.log('Isolated '+target+' browser server ready.');
  const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  browser=await chromium.launch({headless:true,...(fs.existsSync(edge)?{executablePath:edge}:{})});
  for(const [org,role,route] of [
   ['rds_org_001','inventory_adjustment_maker','/en/dashboard/inventory/items'],
   ['rds_org_002','inventory_adjustment_maker','/fr/dashboard/inventory/items'],
   ['rds_org_001','viewer','/en/dashboard/settings/roles'],
  ]){
   const credential=credentials.find(x=>x.organizationId===org&&x.roleCode===role);
   if(!credential){results.push({organizationId:org,role,status:'BLOCKED',reason:'No new persona credential'});continue;}
   const context=await browser.newContext({baseURL:BASE,viewport:{width:1440,height:1000}});
   try{
    const signIn=await context.request.post('/api/auth/sign-in/email',{data:{email:credential.email,password:credential.password,rememberMe:true},headers:{origin:BASE},timeout:180000});
    if(!signIn.ok())throw new Error('Sign-in HTTP '+signIn.status());
    const permissions=await context.request.get('/api/me/permissions',{timeout:120000});
    const scope=await permissions.json();
    if(!permissions.ok()||scope.organizationId!==org)throw new Error('Authenticated tenant scope mismatch.');
    if(role==='viewer'&&(scope.permissions||[]).some(p=>p==='*'||p==='inventory.stock.adjust'))throw new Error('Read-only persona has inventory write permission.');
    const page=await context.newPage();const errors=[];
    page.on('pageerror',error=>errors.push(error.message.slice(0,300)));
    const response=await page.goto(route,{waitUntil:'domcontentloaded',timeout:180000});
    if(role==='viewer'){
     await page.waitForURL(/\/unauthorized(?:\?|$)/,{timeout:120000});
    }else{
     await page.getByRole('heading',{name:'Inventory Items',exact:true}).waitFor({state:'visible',timeout:120000});
     await page.getByRole('table').first().waitFor({state:'visible',timeout:120000});
     await page.waitForFunction(()=>Array.from(document.querySelectorAll('tbody tr')).some(row=>row.querySelectorAll('td').length>2&&row.innerText.trim().length>20),{},{timeout:120000});
    }
    const body=(await page.locator('body').innerText()).slice(0,16000);
    const screen=path.join(OUT,`${target}-browser-${org}-${role}.png`);
    await page.screenshot({path:screen,fullPage:true});
    const loginRedirect=/\/login(?:\?|$)/.test(page.url());
    const appError=/application error|internal server error|une erreur inattendue/i.test(body);
    const denial=/access denied|not authorized|permission|accès refusé|unauthorized/i.test(body)||response?.status()===403;
    const status=!loginRedirect&&!appError&&!errors.length&&(role!=='viewer'||denial)?'PASS':'FAIL';
    results.push({organizationId:org,role,status,httpStatus:response?.status(),route,finalPath:new URL(page.url()).pathname,tenantVerified:true,inventoryTableVisible:role!=='viewer',renderedRows:role!=='viewer'?await page.locator('tbody tr').allTextContents():undefined,readOnlyNegativeCheck:role==='viewer'?denial:undefined,pageErrors:errors,screenshot:path.basename(screen)});
    console.log(JSON.stringify(results.at(-1)));
   }catch(error){results.push({organizationId:org,role,status:'FAIL',reason:error.message});console.log(JSON.stringify(results.at(-1)));}
   finally{await context.close();}
  }
 }catch(error){results.push({status:'BLOCKED',reason:error.message});console.log(JSON.stringify(results.at(-1)));}
 finally{
  if(browser)await browser.close();
  if(server.pid)spawnSync('taskkill',['/PID',String(server.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
  fs.closeSync(file);
  save(path.join(OUT,target+'-browser-results.json'),{generatedAt:new Date().toISOString(),target:url.pathname.slice(1),results});
 }
 if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
