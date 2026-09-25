const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function edit(file,fn){const p=path.join(__dirname,file),s=fs.readFileSync(p,'utf8'),a=fn(s);assert.notEqual(s,a,file);fs.writeFileSync(p,a)}
edit('verify-receiving-browser.cjs',s=>{
 const anchor="await fill('INCOMPLETE','0.125','Owned missing inspection evidence');await click('review');";assert.ok(s.includes(anchor));
 return s.replace(anchor,`await fill('INCOMPLETE','0.125','Owned missing inspection evidence');
  const storageKey='stoquify:purchase-receiving:'+JSON.stringify([x.organizationId,x.actorId,x.purchaseOrderId]);await page.waitForFunction(({key,line})=>{const value=JSON.parse(sessionStorage.getItem(key+':form')||'null');return value?.entries?.[line]?.quantity==='0.125'&&value.reason==='Owned missing inspection evidence'},{key:storageKey,line:x.lineId});await page.reload({waitUntil:'networkidle',timeout:180000});await opener.click();await expect(dialog().getByLabel(t.quantity,{exact:true})).toHaveValue('0.125');await expect(dialog().getByLabel(t.reason,{exact:true})).toHaveValue('Owned missing inspection evidence');await shot('draft-after-refresh');result.completed.push('Partially entered receiving details survive an actual page refresh under the same tenant and actor');await click('review');`);
});
edit('verify-receiving-workbench.cjs',s=>{
 const anchor=" await check('Atomic decision-event failure";assert.ok(s.includes(anchor));
 const extra=` for(const mode of ['missing','expired','suspended','read_only'])await check('Managed '+mode+' purchasing grant prevents receiving writes',async()=>{
  const x=await fixture('grant-'+mode);await db.tenantModuleConfiguration.create({data:{organizationId:x.organizationId,manifestHash:'owned-verification',selectedModules:['purchasing'],activeModules:['purchasing']}});
  if(mode!=='missing')await db.tenantModuleGrant.create({data:{organizationId:x.organizationId,moduleSlug:'purchasing',source:'manual_override',status:mode==='expired'?'active':mode,endsAt:mode==='expired'?new Date(0):null,readOnly:mode==='read_only'}});
  await assert.rejects(service.previewPurchaseReceiving(x.draft,x.scope),e=>e.code==='FORBIDDEN');assert.equal(await db.goodsReceipt.count({where:{organizationId:x.organizationId}}),0);
  if(mode==='read_only'){const view=await service.getPurchaseReceivingWorkbench(x.purchaseOrderId,x.scope);assert.equal(view.canReceive,false)}else await assert.rejects(service.getPurchaseReceivingWorkbench(x.purchaseOrderId,x.scope),e=>e.code==='FORBIDDEN');return{noReceipt:true};
 });
`;
 return s.replace(anchor,extra+anchor);
});
console.log('Added actual draft-refresh browser coverage and missing/expired/suspended/read-only managed-grant probes.');
