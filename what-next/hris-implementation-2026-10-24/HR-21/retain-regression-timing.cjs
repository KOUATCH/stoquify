const fs=require('node:fs'),crypto=require('node:crypto'),base='what-next/hris-implementation-2026-10-24';
const p=base+'/HR-19/performance-a.json',expected=JSON.parse(fs.readFileSync(base+'/HR-19/evidence.json','utf8')).hashes[p];
const current=fs.readFileSync(p);fs.writeFileSync(base+'/HR-21/handoff-performance.json',current);
const original=JSON.stringify({employees:201,eligible:200,elapsedMs:5658,environment:'owned synthetic loopback; no SLA'});
if(crypto.createHash('sha256').update(original).digest('hex')!==expected)throw Error('Historical exact bytes could not be verified; do not restore by guess');
fs.writeFileSync(p,original);fs.writeFileSync(base+'/HR-21/handoff-artifact-reconciliation.json',JSON.stringify({reason:'Existing HR19 regression writer uses a fixed historical artifact path; current timing moved to HR21 and historical bytes restored only after exact sealed-hash verification',historicalPath:p,expectedHash:expected,currentTimingPath:base+'/HR-21/handoff-performance.json',historicalHashVerified:true},null,2));console.log('Historical timing restored with exact sealed hash; current timing retained under HR21');
