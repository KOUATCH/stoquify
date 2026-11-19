// Independent recipe fingerprint check only. No app imports, DB, runtime or browser execution.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const packet=path.resolve(__dirname,'..');
const expected={
  'run-runtime.cjs':'edea1bd127a80aa6bbeb110ec8d21fe98379d1d1cc9f69463a611b4660f76b8f',
  'database/seed-fixture.cjs':'78f6d0f642044c7a59e0400b9aa6c5614f2976d9b791b648a8a8b8a2a88a2b04',
  'database/fixture-control.cjs':'d96cea0bb8ed4d7248e81759a867fd43000799dbdf8465de4708fa2f740bf17e',
  'database/auth-controls.cjs':'117989dac6e45a9f0ee2a3a0f17078829a791d27185395a76b9200599a0c8d3d',
  'browser/run-auth-transport.cjs':'e28aa8ecbc0d5a835f49c29bccde6e1f6d53e33efa19822636ef0a3d1dd36088',
  'browser/run-browser.cjs':'e3d185bb877bf8a509037450dd95bd2d54c775d9eb87dc7ba6574c275fa0c3f1',
  'browser/admit-source.cjs':'90df6be19f2ad79e08c2faba56dbe1b65f864b929231b3f46c5e39a74af7259b',
  'provider/run-protocol.cjs':'d3aaf8ccb1cf2457f1302a26f8219ad5f9e40fa5d60b9949a6d0d0c8958de9c6',
  'database/finalize.cjs':'19a963ea68038a33bc224c563532da10eb6e0f7fbd9fa5b7b70b1fd0e34bc70d',
  'database/stop.cjs':'80f0c6e4212feb6209177a8c3591681baf44da7e3b505bf8280e1dfb734b47ff',
  'final-integrity.cjs':'b6b4db79767fa3f02e7038128080685c402e10ddd5173256c1a443f5744dcbd6'
};
const files=Object.entries(expected).map(([file,sha256])=>{const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(packet,file))).digest('hex');assert.equal(actual,sha256,file+' changed after review');return{path:file,sha256};});
const inputs=JSON.parse(fs.readFileSync(path.join(__dirname,'CRITICAL-INPUTS-REVIEW.json')));assert.equal(inputs.passed,true);
const report={at:new Date().toISOString(),reviewer:'/root/v02_review',verdict:'admitted_recipes_only',candidateId:inputs.candidateId,files,
  permittedScope:'Fresh owned D candidate, exact migrated local databases, synthetic accounts and assets, real signed sessions and Chromium, isolated synthetic provider callbacks, retained evidence and owned-process cleanup only.',
  preconditions:['Build/artifact and fixture readiness receipts must pass for this candidate before runtime starts.','Current root and candidate source admission must pass; browser harness fingerprints must match at runtime.','Use only the exact loopback DB data directory/ports and isolated runtime/environment already reviewed.','These fingerprints remain frozen; preserve any failed runtime attempt and independently review a changed recipe before rerun.'],
  reviewedControls:['All authentication-account tables included in business-state snapshots; session and audit effects explicitly classified.','Signed session/cache cookies acquired through actual credential sign-in; replay cookie value/expiry retention and live cache lifetime checked through each request.','Current revoked/expired/changed-permission/module cases have independent or restored authorized controls.','91 auth checks account for skipped prerequisites as notRun; incomplete native tab revalidation cannot silently pass.','Native browser history/reload and synthetic private canaries remain distinct from static or prior-content observations.','23 UploadThing protocol cases use synthetic signatures and loopback receiver with actual artifact provenance; hosted-provider qualification remains excluded.','Runtime sealed files verified unchanged, originals protected from browser delivery, exact owned session and process cleanup retained separately.'],
  limitations:['This admits execution safety and test validity; no runtime, privacy or production-readiness pass is claimed.','Installed dependency copies are bound by critical file hashes; clean installation and full dependency security are separate gates.','Selected inventory/shared-shell consumers do not qualify every browser consumer.','Unavailable hosted OAuth/provider positives and future finance byte delivery are not inferred from local protocol negatives.']};
fs.writeFileSync(path.join(__dirname,'RUNTIME-RECIPE-ADMISSION.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({verdict:report.verdict,candidateId:report.candidateId,files:files.length}));
