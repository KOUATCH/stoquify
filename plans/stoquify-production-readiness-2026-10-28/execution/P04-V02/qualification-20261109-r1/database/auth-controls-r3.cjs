'use strict';
// Owned synthetic fixtures only; exact loopback/data-directory verification is inherited.
const crypto = require('node:crypto');
const argon2 = require('argon2');
const { fs, path, assert, own, target, hash, connect } = require('./database-common-r3.cjs');
const { actors, organizations } = require('./fixture-definition.cjs');
const aliases = ['authActive','authRevoked','authExpired','authBrowserExpiry','authBrowserPermission','authBrowserModule','authBrowserRevoked','authLifecycle','authSessionManagement','authForeign'];
const privatePath = path.join(own, 'auth-transport-fixture.private.json');
const permissions = [...actors.ui.permissions, 'profile.read', 'profile.update'];
const providerId = 'p04v02-synthetic';
function actorFor(alias) { assert(aliases.includes(alias)); return { id: 'p04v02-auth-' + alias.toLowerCase(), roleId: 'p04v02-auth-role-' + alias.toLowerCase(), email: 'p04v02-' + alias.toLowerCase() + '@example.invalid', organizationId: organizations[alias==='authForeign'?1:0] }; }
function emit(name, value) { const file = 'auth-' + name + '-' + Date.now() + '-' + crypto.randomUUID() + '.json'; fs.writeFileSync(path.join(__dirname,file), JSON.stringify(value,null,2)+'\n', {flag:'wx'}); return file; }
async function verifyActor(client, alias) { const actor=actorFor(alias); const row=(await client.query('SELECT id,email,"organizationId" FROM users WHERE id=$1 FOR UPDATE',[actor.id])).rows[0]; assert.deepEqual(row,{id:actor.id,email:actor.email,organizationId:actor.organizationId}); return actor; }
async function prepareAuthActors(fixture) {
  assert.equal(fixture.database,target.full); assert.equal(fixture.baseURL,'https://localhost:3196'); assert.equal(fixture.users.ui.id,actors.ui.id); assert(!fs.existsSync(privatePath),'Fresh auth transport fixture required');
  const users={}; for(const alias of aliases) users[alias]={...actorFor(alias),password:'P04v02!'+crypto.randomBytes(24).toString('base64url'),permissions};
  // Private values are retained outside published evidence and never printed.
  fs.writeFileSync(privatePath,JSON.stringify({state:'prepared',database:target.full,users}),{flag:'wx'});
  const c=await connect(target.full); try {
    await c.query('BEGIN');
    assert.equal((await c.query('SELECT count(*)::int n FROM organizations WHERE id=$1',[organizations[0]])).rows[0].n,1);
    for(const [alias,actor] of Object.entries(users)) {
      assert.equal((await c.query('SELECT count(*)::int n FROM users WHERE id=$1 OR email=$2',[actor.id,actor.email])).rows[0].n,0);
      const password=await argon2.hash(actor.password,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1});
      await c.query('INSERT INTO roles(id,code,"nameEn",permissions,"organizationId","updatedAt") VALUES($1,$2,$3,$4::text[],$5,now())',[actor.roleId,actor.roleId,'Isolated auth '+alias,permissions,actor.organizationId]);
      await c.query('INSERT INTO users(id,name,email,"emailVerified","firstName","lastName",password,"isVerified","organizationId","mfaBackupCodes","updatedAt") VALUES($1,$2,$3,true,$4,$5,$6,true,$7,ARRAY[]::text[],now())',[actor.id,'P04V02 '+alias,actor.email,'P04V02',alias,password,actor.organizationId]);
      await c.query('INSERT INTO "_UserRoles"("A","B") VALUES($1,$2)',[actor.roleId,actor.id]);
      await c.query('INSERT INTO accounts(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,$3,$2,$4,now())',[actor.id+'-credential',actor.id,'credential',password]);
      await c.query('INSERT INTO accounts(id,"accountId","providerId","userId","updatedAt") VALUES($1,$2,$3,$4,now())',[actor.id+'-secondary',actor.id+'-secondary',providerId,actor.id]);
    }
    await c.query('COMMIT'); fs.writeFileSync(privatePath,JSON.stringify({state:'ready',database:target.full,users}));
    return {users,evidence:emit('actors-created',{at:new Date().toISOString(),database:target.full,aliases,ids:aliases.map(a=>actorFor(a).id),permissions,sessionRowsCreated:0,credentialAcquisition:'Actual credential HTTP sign-in only',secondaryProvider:providerId})};
  } catch(error) { await c.query('ROLLBACK'); throw error; } finally { await c.end(); }
}
async function transitionAuth(alias, kind) {
  const valid={revoke:['authRevoked','authBrowserRevoked'],expire:['authExpired','authBrowserExpiry'],removePermission:['authBrowserPermission'],restorePermission:['authBrowserPermission'],disableModule:['authBrowserModule'],restoreModule:['authBrowserModule']}; assert(valid[kind]?.includes(alias));
  const c=await connect(target.full); try { await c.query('BEGIN'); const actor=await verifyActor(c,alias); let affected;
    if(kind==='revoke') affected=(await c.query('DELETE FROM sessions WHERE "userId"=$1',[actor.id])).rowCount;
    else if(kind==='expire') affected=(await c.query('UPDATE sessions SET "expiresAt"=$2,"updatedAt"=now() WHERE "userId"=$1',[actor.id,new Date(0)])).rowCount;
    else if(kind==='removePermission'||kind==='restorePermission') affected=(await c.query('UPDATE roles SET permissions=$3::text[],"updatedAt"=now() WHERE id=$1 AND "organizationId"=$2',[actor.roleId,actor.organizationId,kind==='removePermission'?permissions.filter(p=>p!=='inventory.items.read'):permissions])).rowCount;
    else affected=(await c.query('UPDATE tenant_module_grants SET status=$3,revision=revision+1,"updatedAt"=now() WHERE "organizationId"=$1 AND "moduleSlug"=$2 AND status=$4',[actor.organizationId,'inventory',kind==='disableModule'?'suspended':'active',kind==='disableModule'?'active':'suspended'])).rowCount;
    assert(affected>0,'Expected owned fixture state must exist'); await c.query('COMMIT'); return {kind,alias,affected,evidence:emit('transition',{at:new Date().toISOString(),kind,alias,affected,database:target.full})};
  } catch(error) {await c.query('ROLLBACK');throw error;} finally {await c.end();}
}
async function ensureSecondary(alias) { const c=await connect(target.full);try{await c.query('BEGIN');const a=await verifyActor(c,alias);const exists=(await c.query('SELECT count(*)::int n FROM accounts WHERE id=$1 AND "userId"=$2',[a.id+'-secondary',a.id])).rows[0].n;if(!exists)await c.query('INSERT INTO accounts(id,"accountId","providerId","userId","updatedAt") VALUES($1,$2,$3,$4,now())',[a.id+'-secondary',a.id+'-secondary',providerId,a.id]);await c.query('COMMIT');return {providerId,accountId:a.id+'-secondary',recreated:!exists};}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}}
async function revokeAuthFixtureSessions() { const c=await connect(target.full);try{const ids=aliases.map(a=>actorFor(a).id);const count=(await c.query('DELETE FROM sessions WHERE "userId"=ANY($1::text[])', [ids])).rowCount;const remaining=(await c.query('SELECT count(*)::int n FROM sessions WHERE "userId"=ANY($1::text[])',[ids])).rows[0].n;assert.equal(remaining,0);return{revoked:count,remaining,evidence:emit('session-cleanup',{at:new Date().toISOString(),database:target.full,revoked:count,remaining,fixtureRowsRetained:true})};}finally{await c.end();}}
async function setLifecycleState(state){assert(['active','locked','inactive'].includes(state));const c=await connect(target.full);try{await c.query('BEGIN');const actor=await verifyActor(c,'authLifecycle');await c.query('UPDATE users SET "isActive"=$2,"isLocked"=$3,"lockedUntil"=NULL,"updatedAt"=now() WHERE id=$1',[actor.id,state!=='inactive',state==='locked']);await c.query('COMMIT');return{state,evidence:emit('lifecycle-state',{at:new Date().toISOString(),database:target.full,actorId:actor.id,state})};}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}}
async function lifecycleEvidence(){const c=await connect(target.full);try{const actor=actorFor('authLifecycle');const row=(await c.query('SELECT to_jsonb(u) value FROM users u WHERE id=$1 AND "organizationId"=$2',[actor.id,actor.organizationId])).rows[0].value;const {failedLoginAttempts,lastFailedLogin,isLocked,lockedUntil,updatedAt,...unchanged}=row;return{actorId:actor.id,failedLoginAttempts,lastFailedLogin,isLocked,lockedUntil,otherFieldsSha256:hash(JSON.stringify(unchanged))};}finally{await c.end();}}
module.exports={prepareAuthActors,transitionAuth,ensureSecondary,revokeAuthFixtureSessions,setLifecycleState,lifecycleEvidence,aliases,providerId};
