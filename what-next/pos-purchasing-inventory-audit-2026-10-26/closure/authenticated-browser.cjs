const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{PrismaClient}=require('@prisma/client');
const root=process.cwd(),f=JSON.parse(fs.readFileSync(path.join(root,'.codex-tmp/workflow-closure-private.json'),'utf8')),prepared=JSON.parse(fs.readFileSync(path.join(__dirname,'browser-prepared.json'),'utf8'));
if(f.base!=='http://127.0.0.1:3168'||new URL(f.url).pathname!=='/stoquify_pos_audit_20261026_d30f')throw Error('Wrong disposable target');
const db=new PrismaClient({datasourceUrl:f.url}),app=path.join(root,'.codex-tmp/workflow-closure-app'),marker=path.join(app,'.closure-cache-fault'),evidence=[];
async function main(){const probe=path.join(app,'.closure-cache-probe'),faultsBefore=fs.existsSync(probe)?fs.readFileSync(probe,'utf8').length:0;const browser=await chromium.launch({headless:true});try{for(const row of prepared){
 const fr=row.locale==='fr',context=await browser.newContext({viewport:fr?{width:390,height:844}:{width:1440,height:1000}}),page=await context.newPage();
 page.setDefaultTimeout(45000);page.on('dialog',dialog=>dialog.accept());
 try{
 const countBefore=await db.purchaseOrder.count({where:{organizationId:f.actor.organizationId,notes:'Synthetic browser closure'}});
 const login=await context.request.post(f.base+'/api/auth/sign-in/email',{data:{email:f.actor.email,password:f.password},headers:{Origin:f.base}});assert.equal(login.status(),200);
 await page.goto(f.base+'/'+row.locale+'/dashboard/purchase-orders/new',{waitUntil:'domcontentloaded',timeout:240000});
 await page.getByRole('listitem').filter({hasText:row.title??'Closure recovery '+row.locale}).getByRole('button',{name:fr?'Reprendre':'Resume',exact:true}).click();
 const check=page.getByRole('button',{name:fr?'Vérifier la demande':'Check request status',exact:true});await check.waitFor();
 if(fr){
  await db.role.update({where:{id:f.actor.roleId},data:{permissions:f.actor.permissions.filter(p=>p!=='purchases.orders.create')}});
  await check.click();await page.getByText('Votre accès ou session est indisponible.',{exact:false}).waitFor();
  assert.equal(await db.purchaseOrder.count({where:{organizationId:f.actor.organizationId,notes:'Synthetic browser closure'}}),countBefore);
  await db.role.update({where:{id:f.actor.roleId},data:{permissions:f.actor.permissions}});await check.click();
 }
 let drop=!fr,dropped=false;
 await page.route('**/*',async route=>{if(drop&&route.request().method()==='POST'&&route.request().headers()['next-action']&&route.request().postData()?.includes('expectedRevision')){drop=false;await route.fetch();dropped=true;await route.abort('failed')}else await route.continue()});
 fs.writeFileSync(marker,'synthetic');
 await page.getByRole('button',{name:fr?'Créer le bon enregistré / réessayer':'Create saved order / retry',exact:true}).click();
 if(!fr){await page.getByText('Saved work is unavailable.',{exact:false}).waitFor();assert.ok(dropped);await check.click()}
 await page.getByRole('heading',{name:fr?'Bon créé':'Order created',exact:true}).waitFor();
 const durable=await db.$queryRaw`SELECT status, "resultOrderId" FROM purchase_order_authoring_drafts WHERE id=${row.id}`;
 assert.equal(durable[0].status,'CREATED');assert.ok(durable[0].resultOrderId);
 assert.equal(await db.purchaseOrder.count({where:{organizationId:f.actor.organizationId,notes:'Synthetic browser closure'}}),countBefore+1);
 assert.equal(await db.businessEvent.count({where:{organizationId:f.actor.organizationId,idempotencyKey:'purchase-order-create:'+row.id,eventType:'purchase_order.authoring_created'}}),1);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('listitem').filter({hasText:row.title??'Closure recovery '+row.locale}).getByRole('button',{name:fr?'Reprendre':'Resume',exact:true}).click();
 await page.getByRole('heading',{name:fr?'Bon créé':'Order created',exact:true}).waitFor();
 const focused=await page.getByRole('heading',{name:fr?'Bon créé':'Order created',exact:true}).evaluate(el=>el===document.activeElement);assert.ok(focused);
 await page.screenshot({path:path.join(__dirname,'authenticated-recovery-'+row.locale+'.png'),fullPage:true});
 if(!fr){await db.session.deleteMany({where:{userId:f.actor.userId}});await check.click();await page.getByText('Your current access or session is unavailable.',{exact:false}).waitFor()}
 evidence.push({locale:row.locale,viewport:fr?'390x844':'1440x1000',requestId:row.id,orderId:durable[0].resultOrderId,realSignIn:login.status(),cacheFault:true,lostReply:dropped,reloadReceipt:true,receiptFocus:focused,revocation:fr?'stored role permission':'stored session',createdEventCount:1,status:'PASS'});
 }catch(error){fs.writeFileSync(path.join(__dirname,'browser-failure-'+row.locale+'.txt'),await page.locator('body').innerText());throw error}finally{await db.role.update({where:{id:f.actor.roleId},data:{permissions:f.actor.permissions}});if(fs.existsSync(marker))fs.unlinkSync(marker);await context.close()}
 }
 assert.ok(fs.readFileSync(probe,'utf8').length>faultsBefore,'This run must exercise the cache fault');
 }finally{fs.writeFileSync(path.join(__dirname,'authenticated-browser-results.json'),JSON.stringify(evidence,null,2));await browser.close();await db.$disconnect()}}
main().then(()=>console.log(JSON.stringify(evidence))).catch(e=>{console.error(e.message);process.exitCode=1});
