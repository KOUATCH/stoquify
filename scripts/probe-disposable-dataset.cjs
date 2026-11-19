'use strict';
// Deliberately failed writes inside rolled-back transactions on the owned database.
const fs=require('node:fs'),path=require('node:path'),{Client}=require('pg');
const {OUT,NAME,assertManifestTarget}=require('./disposable-business-dataset.cjs');
async function main(){
 const manifest=JSON.parse(fs.readFileSync(path.join(OUT,'manifest.json'),'utf8'));
 const target=new URL(process.env.DATABASE_URL||'');
 if(target.pathname.slice(1)!==manifest.target.database||!NAME.test(manifest.target.database)||!['localhost','127.0.0.1','[::1]'].includes(target.hostname))throw Error('Owned local target required');
 assertManifestTarget(target,manifest);
 const clients=[new Client({connectionString:target.toString()}),new Client({connectionString:target.toString()})];
 const [a,b]=clients,checks=[];
 try{
  await Promise.all(clients.map(c=>c.connect()));
  for(const c of clients)if((await c.query('SELECT current_database() AS n')).rows[0].n!==manifest.target.database)throw Error('Wrong target');
  const before=(await a.query('SELECT id,name FROM organizations ORDER BY id')).rows;
  await a.query('BEGIN');await a.query('SAVEPOINT bad_fk');
  try{await a.query('UPDATE locations SET "organizationId"=$1 WHERE id=$2',['synthetic_missing_org','synth12_douala_loc_0']);throw Error('Foreign key accepted invalid org');}catch(e){if(e.code!=='23503')throw e;checks.push({name:'foreign-key-rejection',passed:true,code:e.code});}
  await a.query('ROLLBACK TO SAVEPOINT bad_fk');await a.query('SAVEPOINT duplicate');
  try{await a.query('UPDATE organizations SET slug=(SELECT slug FROM organizations WHERE id=$1) WHERE id=$2',['synth12_douala','synth12_yaounde']);throw Error('Unique key accepted duplicate');}catch(e){if(e.code!=='23505')throw e;checks.push({name:'unique-key-rejection',passed:true,code:e.code});}
  await a.query('ROLLBACK TO SAVEPOINT duplicate');
  await a.query('UPDATE organizations SET name=$1 WHERE id=$2',['ROLLBACK_ONLY_SYNTHETIC_PROBE','synth12_douala']);
  await b.query('BEGIN');await b.query("SET LOCAL lock_timeout='500ms'");
  try{await b.query('UPDATE organizations SET name=$1 WHERE id=$2',['CONCURRENT_ROLLBACK_ONLY','synth12_douala']);throw Error('Concurrent update escaped lock');}catch(e){if(e.code!=='55P03')throw e;checks.push({name:'concurrent-update-lock',passed:true,code:e.code});}
  await b.query('ROLLBACK');await a.query('ROLLBACK');
  const after=(await a.query('SELECT id,name FROM organizations ORDER BY id')).rows;
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Rollback changed retained data');
  checks.push({name:'transaction-rollback-restores-data',passed:true});
  fs.writeFileSync(path.join(OUT,'negative-probes.json'),JSON.stringify({database:manifest.target.database,executedAt:new Date().toISOString(),checks},null,2)+'\n');console.log(JSON.stringify(checks));
 }finally{for(const c of clients){try{await c.query('ROLLBACK')}catch{}await c.end();}}
}
main().catch(e=>{console.error(e.message||e.code);process.exitCode=1});
