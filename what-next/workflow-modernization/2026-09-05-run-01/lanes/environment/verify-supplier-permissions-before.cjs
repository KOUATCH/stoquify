const f=require('./supplier-ack-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const run=crypto.randomUUID().slice(0,12),r={run,startedAt:new Date().toISOString(),sourcesBefore:f.sources(),checks:[]};
(async()=>{await f.local.withClient(f.target,f.local.assertOwned);r.originalBefore=await f.stable();const x=await f.fixture('en',run,{fixturePermissions:{allowRespond:false}});r.orderBefore=await f.orderState(x);
const viewOnly=await f.getPublicSupplierPoEnvelope(x,db);assert.ok(viewOnly.permissions.includes('respond'));r.checks.push('Registry disables response but public read still advertises response permission');
const y=await f.fixture('fr',run,{fixturePermissions:{allowView:false,allowRespond:false}});
const hidden=await f.getPublicSupplierPoEnvelope(y,db);assert.equal(hidden.envelopeId,y.envelopeId);r.checks.push('Registry disables viewing but public read still returns purchase order');
assert.equal(await f.orderState(x),r.orderBefore);
})().catch(e=>r.error=f.safe(e)).finally(async()=>{r.originalUnchanged=r.originalBefore===await f.stable();r.sourcesAfter=f.sources();r.sourceStable=JSON.stringify(r.sourcesBefore)===JSON.stringify(r.sourcesAfter);await db.$disconnect();const file='supplier-permissions-before-'+run+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(r,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,checks:r.checks,error:r.error,originalUnchanged:r.originalUnchanged,sourceStable:r.sourceStable}));process.exitCode=r.error||r.checks.length!==2?1:0});
