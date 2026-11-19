// Real persisted controls for synthetic accounts only. No auth/session mocks.
const crypto=require('node:crypto');
const {fs,path,assert,own,target,hash,quote,connect}=require('./database-common-r3.cjs');
const {actors,organizations}=require('./fixture-definition.cjs');
const fixturePath=path.join(own,'browser-fixture.private.json');
const statePath=path.join(own,'control-state.private.json');
function fixture(){const value=JSON.parse(fs.readFileSync(fixturePath,'utf8'));assert.equal(value.database,target.full);assert.equal(value.seedState,'ready');return value;}
function writeEvidence(prefix,value){const name=prefix+'-'+Date.now()+'-'+crypto.randomUUID()+'.json';fs.writeFileSync(path.join(__dirname,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});return name;}
async function snapshot(label){
  assert(typeof label==='string'&&/^[a-zA-Z0-9_-]{1,120}$/.test(label),'Safe snapshot label required');fixture();
  const client=await connect(target.full);
  try{
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const tables=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(row=>row.tablename);
    const excluded=['sessions','audit_logs'];const state=[];
    for(const table of tables.filter(name=>!excluded.includes(name))){
      const rows=(await client.query('SELECT to_jsonb(t)::text AS row FROM '+quote(table)+' t ORDER BY to_jsonb(t)::text COLLATE "C"')).rows;
      // Full synthetic rows remain in memory only; receipts contain digests/counts.
      state.push({table,count:rows.length,sha256:hash(rows.map(row=>row.row).join('\n'))});
    }
    const sessionCounts=(await client.query('SELECT "userId",count(*)::int AS count FROM sessions GROUP BY "userId" ORDER BY "userId"')).rows;
    const sessionRows=(await client.query('SELECT to_jsonb(t)::text AS row FROM sessions t ORDER BY t.id COLLATE "C"')).rows.map(({row})=>{const x=JSON.parse(row);return{idHash:hash(x.id),userId:x.userId,expiresAt:x.expiresAt,createdAt:x.createdAt,updatedAt:x.updatedAt,tokenSha256:hash(x.token),rowSha256:hash(row)}});
    const auditRows=(await client.query('SELECT to_jsonb(t)::text AS row FROM audit_logs t ORDER BY t.id COLLATE "C"')).rows.map(({row})=>{const x=JSON.parse(row);return{idHash:hash(x.id),userId:x.userId,organizationId:x.organizationId,entityType:x.entityType,action:x.action,createdAt:x.createdAt,changes:Object.fromEntries(['moduleSlug','surface','allowed','mode','result','wouldBlock'].filter(k=>Object.prototype.hasOwnProperty.call(x.changes||{},k)).map(k=>[k,x.changes[k]])),rowSha256:hash(row)}});
    const auditCounts=(await client.query('SELECT "entityType",action,count(*)::int AS count FROM audit_logs GROUP BY "entityType",action ORDER BY "entityType",action')).rows;
    await client.query('COMMIT');
    const result={at:new Date().toISOString(),label,database:target.full,businessSha256:hash(JSON.stringify(state)),tables:state,excludedTables:excluded,allowedSideEffects:'Auth session lifecycle and explicit security/module-access audit records are reported separately.',sessionCounts,auditCounts,sessionRows,auditRows,sessionSha256:hash(JSON.stringify(sessionRows)),auditSha256:hash(JSON.stringify(auditRows))};
    result.evidence=writeEvidence('snapshot-'+label,result);return result;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
}
async function transition(input,operation){
  const {actorAlias,kind}=typeof input==='string'?{actorAlias:input,kind:operation}:input;
  const allowed={revoke:'revocation',expire:'expiry','restore-expiry':'expiry','remove-permission':'permissionChange','restore-permission':'permissionChange','disable-module':'moduleChange','restore-module':'moduleChange'};
  assert.equal(allowed[kind],actorAlias,'Only bounded fixture transitions are admitted');
  const f=fixture(),actor=actors[actorAlias];assert(actor);assert.equal(f.users[actorAlias].id,actor.id);assert.equal(f.users[actorAlias].organizationId,actor.organizationId);
  const lock=path.join(own,'control.lock');const fd=fs.openSync(lock,'wx');let client;
  try{
    client=await connect(target.full);await client.query('BEGIN');
    const user=(await client.query('SELECT id,email,"organizationId" FROM users WHERE id=$1 FOR UPDATE',[actor.id])).rows[0];
    assert.equal(user?.email,actor.email);assert.equal(user?.organizationId,actor.organizationId);
    const state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,'utf8')):{};
    let affected=0,recovery=null;
    if(kind==='revoke'){
      affected=(await client.query('DELETE FROM sessions WHERE "userId"=$1',[actor.id])).rowCount;assert(affected>0,'Real login session required before revocation');
      recovery='New real sign-in may create a fresh session; revoked tokens are not reinserted.';
    }else if(kind==='expire'){
      const rows=(await client.query('SELECT id,"expiresAt" FROM sessions WHERE "userId"=$1 FOR UPDATE',[actor.id])).rows;assert(rows.length>0,'Real login session required before expiry');
      state.expiry={actorId:actor.id,sessions:rows};
      affected=(await client.query('UPDATE sessions SET "expiresAt"=$2,"updatedAt"=now() WHERE "userId"=$1',[actor.id,new Date(0)])).rowCount;
      recovery='Restore retained expiry rows or acquire a new real session if Better Auth deletes the expired row.';
    }else if(kind==='restore-expiry'){
      assert.equal(state.expiry?.actorId,actor.id);
      for(const row of state.expiry.sessions)affected+=(await client.query('UPDATE sessions SET "expiresAt"=$3,"updatedAt"=now() WHERE id=$1 AND "userId"=$2',[row.id,actor.id,new Date(row.expiresAt)])).rowCount;
      recovery=affected?'Retained expiry timestamps restored.':'Expired rows were removed; use a new real sign-in.';
    }else if(kind==='remove-permission'||kind==='restore-permission'){
      assert(!actor.permissions.some(value=>value.includes('*')));
      const current=(await client.query('SELECT permissions,code FROM roles WHERE id=$1 AND "organizationId"=$2 FOR UPDATE',[actor.roleId,actor.organizationId])).rows[0];assert.equal(current?.code,actor.roleCode);
      const permissions=kind==='remove-permission'?actor.permissions.filter(value=>value!=='dashboard.read'):actor.permissions;
      if(kind==='remove-permission')assert(current.permissions.includes('dashboard.read'),'Positive permission baseline required');
      affected=(await client.query('UPDATE roles SET permissions=$3::text[],"updatedAt"=now() WHERE id=$1 AND "organizationId"=$2',[actor.roleId,actor.organizationId,permissions])).rowCount;assert.equal(affected,1);
      recovery='restore-permission returns the actor-exclusive fixture role to its seeded permission set.';
    }else{
      assert.equal(actor.organizationId,organizations[0]);
      const expectedStatus=kind==='disable-module'?'active':'suspended';const nextStatus=kind==='disable-module'?'suspended':'active';
      affected=(await client.query('UPDATE tenant_module_grants SET status=$3,revision=revision+1,"updatedAt"=now() WHERE "organizationId"=$1 AND "moduleSlug"=$2 AND status=$4',[actor.organizationId,'dashboard',nextStatus,expectedStatus])).rowCount;assert.equal(affected,1,'Expected dashboard grant state required');
      recovery='restore-module reactivates the same synthetic dashboard grant. Serialize all tenant-A tests while disabled.';
    }
    await client.query('COMMIT');fs.writeFileSync(statePath,JSON.stringify(state,null,2));
    const result={at:new Date().toISOString(),database:target.full,actorAlias,actorId:actor.id,organizationId:actor.organizationId,kind,affected,recovery,authoritySource:'Persisted synthetic database state; subsequent requests use actual Better Auth and server guards.'};
    result.evidence=writeEvidence('transition-'+kind,result);return result;
  }catch(error){if(client)await client.query('ROLLBACK');throw error;}finally{try{if(client)await client.end();}finally{fs.closeSync(fd);fs.unlinkSync(lock);}}
}
let providerGrantRestore=null;
async function setProviderModuleActive(active){assert.equal(typeof active,'boolean');const c=await connect(target.full);try{await c.query('BEGIN');const id='p04r02-grant-'+organizations[0]+'-inventory';const row=(await c.query('SELECT id,status,revision,"updatedAt" FROM tenant_module_grants WHERE id=$1 AND "organizationId"=$2 AND "moduleSlug"=$3 FOR UPDATE',[id,organizations[0],'inventory'])).rows[0];assert(row);if(!active){assert.equal(providerGrantRestore,null);assert.equal(row.status,'active');providerGrantRestore=row;assert.equal((await c.query('UPDATE tenant_module_grants SET status=$2,revision=revision+1,"updatedAt"=now() WHERE id=$1',[id,'suspended'])).rowCount,1);}else{assert(providerGrantRestore);assert.equal(row.status,'suspended');assert.equal((await c.query('UPDATE tenant_module_grants SET status=$2,revision=$3,"updatedAt"=$4 WHERE id=$1',[id,providerGrantRestore.status,providerGrantRestore.revision,providerGrantRestore.updatedAt])).rowCount,1);providerGrantRestore=null;}await c.query('COMMIT');const result={at:new Date().toISOString(),kind:active?'restore-provider-inventory-grant':'suspend-provider-inventory-grant',organizationId:organizations[0],database:target.full};result.evidence=writeEvidence('provider-grant',result);return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}}
function assertReadEffects(before,after,kind){
 assert.equal(after.businessSha256,before.businessSha256);const a=new Map(before.auditRows.map(r=>[r.idHash,r]));const b=new Map(after.auditRows.map(r=>[r.idHash,r]));for(const [id,row]of a)assert.deepEqual(b.get(id),row,'Existing audit row changed');const added=after.auditRows.filter(r=>!a.has(r.idHash));
 const moduleActor=kind==='moduleDenied'?actors.moduleDenied:kind==='moduleChange-after'?actors.moduleChange:null;
 if(moduleActor){assert.equal(added.length,6,'Six direct delivery denial audits expected');for(const row of added){assert.equal(row.entityType,'ModuleEntitlementDecision');assert.equal(row.action,'MODULE_ENTITLEMENT_ENFORCED');assert.equal(row.userId,moduleActor.id);assert.equal(row.organizationId,moduleActor.organizationId);assert.equal(row.changes?.moduleSlug,'dashboard');assert.equal(row.changes?.surface,'GET /api/uploads/[...path]');assert.equal(row.changes?.allowed,false);assert.equal(row.changes?.mode,'enforce');}}
 else assert.equal(added.length,0,'Unexpected read audit additions');
 const sb=new Map(after.sessionRows.map(r=>[r.idHash,r]));const removed=[];for(const row of before.sessionRows){if(sb.has(row.idHash))assert.deepEqual(sb.get(row.idHash),row,'Existing session row changed');else{assert.equal(kind,'expiry-after','Unexpected session deletion');assert.equal(row.userId,actors.expiry.id);assert(new Date(row.expiresAt).getTime()<Date.parse(before.at));removed.push(row.idHash);}}assert(after.sessionRows.every(r=>before.sessionRows.some(p=>p.idHash===r.idHash)),'Unexpected session added');assert(removed.length<=1,'Only request session may be cleaned');
 return {passed:true,kind,businessUnchanged:true,sessionRowsUnchangedExceptExpiredDeletion:removed.length,classifiedAuditAdditions:added,auditRowsPreserved:a.size};
}
function createControls(){return{transition,snapshot,setProviderModuleActive,assertReadEffects,close:async()=>{if(providerGrantRestore)await setProviderModuleActive(true)}};}
module.exports={createControls,transition,snapshot,readPrivateFixture:fixture};
