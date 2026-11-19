// Preparation only; writes new successors of read-only source gate/direct API driver.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const old=path.resolve(__dirname,'../qualification-20261109-r1');
let gate=fs.readFileSync(path.join(old,'admit-runtime-source-attempt02.cjs'),'utf8').replaceAll('-attempt02','').replaceAll('source-after-manifest-v4.json','source-after-manifest.json').replace('consumer.files.length,63','consumer.files.length,68');
fs.writeFileSync(path.join(__dirname,'admit-runtime-source.cjs'),gate,{flag:'wx'});
let driver=fs.readFileSync(path.join(old,'direct-api-driver-attempt02.cjs'),'utf8').replaceAll('direct-api-attempt02-','direct-api-r2-').replaceAll('55516/stoquify_local_p04r06_20261109_full_r1','55517/stoquify_local_p04r06_20261110_full_r2');
assert(driver.includes('flatMap(x=>[x.id,x.email])'));driver=driver.replace('flatMap(x=>[x.id,x.email])','flatMap(x=>[x.id,x.email,x.organizationId,x.secondary.id,x.secondary.accountId].filter(Boolean))');fs.writeFileSync(path.join(__dirname,'direct-api-driver.cjs'),driver,{flag:'wx'});
