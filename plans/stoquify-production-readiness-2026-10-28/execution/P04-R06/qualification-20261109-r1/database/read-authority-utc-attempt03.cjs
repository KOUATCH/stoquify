// Read-only interpretation of the exact synthetic actor's timestamp-without-time-zone fields.
const {assert,connect,target}=require('./database-common.cjs');
const {readPrivateFixture}=require('./fixture-control.cjs');
async function readAuthorityUtc(alias){
 const expected=readPrivateFixture().users[alias];assert(expected);const client=await connect(target.full);
 try{
  const rows=(await client.query(`SELECT id,"organizationId","isActive","isLocked","failedLoginAttempts",
   "lastLogin"::text AS "lastLoginRaw",("lastLogin" AT TIME ZONE 'UTC') AS "lastLoginUtc",
   "lastFailedLogin"::text AS "lastFailedLoginRaw",("lastFailedLogin" AT TIME ZONE 'UTC') AS "lastFailedLoginUtc",
   "lockedUntil"::text AS "lockedUntilRaw",("lockedUntil" AT TIME ZONE 'UTC') AS "lockedUntilUtc",
   pg_typeof("lastLogin")::text AS "lastLoginType",pg_typeof("lastFailedLogin")::text AS "lastFailedLoginType",
   clock_timestamp() AS "databaseNow" FROM users WHERE id=$1 AND "organizationId"=$2`,[expected.id,expected.organizationId])).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].lastLoginType,'timestamp without time zone');assert.equal(rows[0].lastFailedLoginType,'timestamp without time zone');
  return{at:new Date().toISOString(),database:target.full,interpretation:'Explicit AT TIME ZONE UTC; no global parser or writer changes',user:rows[0]};
 }finally{await client.end();}
}
module.exports={readAuthorityUtc};
