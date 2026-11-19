'use strict';
const assert=require('node:assert/strict');
const specifications=[
 ['active-success','credential','available','success',200],
 ['wrong-password','credential','available','failure',401],
 ['fifth-wrong-password','threshold','near_threshold','threshold',401],
 ['future-lock-denial','threshold','future_lock','locked',403],
 ['inactive-denial','credential','inactive','unchanged',403],
 ['expired-lock-success','expired_credential','expired_lock','success',200],
 ['expired-lock-wrong-password','expired_credential','expired_lock','failure',401],
 ['unverified-expired-lock','expired_credential','unverified_expired_lock','unverified',403],
 ['malformed-expired-lock','expired_credential','expired_lock','malformed',400],
 ['unknown-email','credential','available','unknown',401]
];
async function runCredentialProbes(fixture,h){
 for(const [name,alias,state,kind,status]of specifications)await h.record('R06-C-login-'+name,async row=>{
  const context=await h.createContext();let configured=false;
  try{
   h.report.transitions.push(await h.configure(alias,state));configured=true;await h.pace();
   const before=await h.snapshot(row.id+'-before');row.authorityBefore=await h.readAuthorityUtc(alias);
   const actor=fixture.users[alias],wrong='Reviewed R06 r2 wrong password',password=['failure','threshold'].includes(kind)?wrong:actor.password;h.register(password);
   const data=kind==='malformed'?{email:actor.email,password:17}:kind==='unknown'?{email:'unknown-r06-r2@example.invalid',password,rememberMe:true}:{email:actor.email,password,rememberMe:true};
   let result,error;try{result=await h.request(context,row.id,'/api/auth/sign-in/email',{method:'POST',data});row.request=result.row;}catch(e){error=e;}
   row.authorityAfter=await h.readAuthorityUtc(alias);const after=await h.snapshot(row.id+'-after');row.effects=h.effect(before,after);if(error)throw error;assert.equal(result.row.status,status);
   const a=row.authorityBefore.user,b=row.authorityAfter.user;
   if(kind==='success'){
    h.successEffects(row,before,after,result,alias);assert.equal(b.failedLoginAttempts,0);assert.equal(b.isLocked,false);assert.equal(b.lockedUntilRaw,null);assert.deepEqual(b.lastFailedLoginRaw,a.lastFailedLoginRaw);h.timestamp(row,'lastLogin',b,result);
   }else if(['failure','threshold'].includes(kind)){
    h.denied(result);assert.equal(result.json?.code,'INVALID_EMAIL_OR_PASSWORD');assert.equal(b.failedLoginAttempts,state==='expired_lock'?1:a.failedLoginAttempts+1);assert.deepEqual(b.lastLoginRaw,a.lastLoginRaw);h.timestamp(row,'lastFailedLogin',b,result);
    row.effects.changedOwnUserFields=h.ownFields(before,after,alias,['failedLoginAttempts','isLocked','lockedUntil','lastFailedLogin','updatedAt'],['failedLoginAttempts','lastFailedLogin']);assert.deepEqual(row.effects.changedBusinessTables,['users']);assert.deepEqual(after.sessionRows,before.sessionRows);
    row.effects.addedAudits=h.auditEffects(before,after,alias,kind==='threshold'?['ACCOUNT_LOCKED']:['LOGIN_FAILED']);
    if(kind==='threshold'){assert.equal(b.failedLoginAttempts,5);assert.equal(b.isLocked,true);row.lockInterval={lockedUntilUtc:b.lockedUntilUtc,minimumMs:result.row.requestedAtMs+30*60*1000,maximumMs:result.row.finishedAtMs+30*60*1000};assert(Date.parse(b.lockedUntilUtc)>=row.lockInterval.minimumMs&&Date.parse(b.lockedUntilUtc)<=row.lockInterval.maximumMs,'Exact30minute lock must be bounded by actual request times');}else{assert.equal(b.isLocked,false);assert.equal(b.lockedUntilRaw,null);}
   }else{
    h.denied(result,{statuses:[400,401,403]});assert(row.effects.businessEqual&&row.effects.sessionsEqual,'Rejected credential request changed account/business/session data');row.effects.addedAudits=h.auditEffects(before,after,alias,kind==='locked'?['ACCOUNT_LOCKED']:[]);if(kind!=='locked')assert(row.effects.auditsEqual);
    if(kind==='unverified')assert.equal(result.json?.code,'EMAIL_NOT_VERIFIED');
    if(['unverified','malformed'].includes(kind)){assert.equal(b.isLocked,true);assert.equal(b.failedLoginAttempts,4);assert.equal(b.lockedUntilRaw,a.lockedUntilRaw);assert(Date.parse(b.lockedUntilUtc)<Date.parse(b.databaseNow));}
   }
  }finally{if(configured)h.report.transitions.push(await h.restore(alias));await h.closeContext(context);}
 });
}
module.exports={runCredentialProbes,specifications};
