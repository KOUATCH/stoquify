// Independent read-only source/snapshot verification; writes only this review receipt.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../../../..');
const packet=path.join(root,'plans/stoquify-production-readiness-2026-10-28/execution/P04-D01/decision-20261109-r1');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(packet,'source-manifest.json')));
const decision=JSON.parse(fs.readFileSync(path.join(packet,'decision-record.json')));
const checks=manifest.files.map(f=>{const current=fs.readFileSync(path.join(root,f.path)),snapshot=fs.readFileSync(path.join(packet,f.snapshot));assert.equal(hash(current),f.sha256);assert.equal(hash(snapshot),f.sha256);assert.equal(current.length,f.bytes);return {path:f.path,sha256:f.sha256,currentAndSnapshotMatch:true};});
assert.equal(checks.length,11);assert.equal(decision.proposed_policy.selected_option,null);assert.equal(decision.decision_owner.approved_at,null);assert.equal(decision.proposed_policy.classes.length,14);assert.equal(new Set(decision.proposed_policy.classes.map(c=>c.id)).size,14);assert.equal(decision.acceptance_cases.length,12);
const result={at:new Date().toISOString(),passed:true,evidenceClass:'read-only source and proposal consistency',checks,approvalStillPending:true,classes:14,acceptanceCases:12,packetFiles:['DECISION.md','decision-record.json','source-manifest.json'].map(p=>({path:p,sha256:hash(fs.readFileSync(path.join(packet,p)))}))};
fs.writeFileSync(path.join(__dirname,'D01-SOURCE-CHECK.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,files:checks.length,classes:14,approvalStillPending:true}));
