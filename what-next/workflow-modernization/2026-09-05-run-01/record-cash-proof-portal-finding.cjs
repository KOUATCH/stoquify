const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=__dirname,repo=path.resolve(root,'../../..'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function write(file,text){const target=path.join(root,file),pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,text,{flag:'wx'});fs.renameSync(pending,target);}
const finding='Actual proof screenshot shows nearly unreadable dark text on a transparent portal over the page. ProofTrailDrawer uses an undefined --dash-bg and portal content lacks the local dashboard token scope. Correct inherited portal tokens/background and verify actual EN/FR readability, focus and reflow; prior interaction passes are not visual accessibility passes.';
const record={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',finding,status:'open_engineering',evidence:['lanes/environment/cash-proof-state-839a6d9d-9f7d-48c6-ba36-dcd123a78aeb-fr.png','lanes/environment/cash-proof-state-839a6d9d-9f7d-48c6-ba36-dcd123a78aeb-fr-proof-crop.png'].map(file=>({file,sha256:sha(path.join(root,file))})),sourceHashes:Object.fromEntries(['app/globals.css','components/evidence/ProofTrailDrawer.tsx','components/ui/sheet.tsx','components/bi/BIProofDrawerHost.tsx'].map(file=>[file,sha(path.join(repo,file))])),limits:'Crop is a derived inspection copy. Source explains the observed failure; computed CSS and contrast measurements remain required.'};
fs.writeFileSync(path.join(root,'evidence/cash-proof-portal-finding-2026-09-28.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
const report='CASH_COMMAND_PROOF_STATE_2026-09-28.md';write(report,fs.readFileSync(path.join(root,report),'utf8')+`
## Additional browser findings and retained attempts

${finding} See evidence/cash-proof-portal-finding-2026-09-28.json. The final interaction receipt does not establish readable visual presentation; the complete workflow remains open.

Earlier browser attempts remain retained: ed50864d failed before hydration was explicitly verified; eefde7ba failed while collecting the response body; b57169ef captured a successful action that also refreshed the page, then failed focus return because the display timestamp remounted the proof section. The key now uses actual tenant/period/locale/subject scope and a sixth regression preserves an open proof across an unchanged-scope refresh. One browser-driver replacement syntax error failed before execution; it created no fixture. Final actual responses were buffered and forwarded unchanged through the local route to inspect their identity without losing their body during page refresh.
`);
const target='reconcile-current-progress.cjs';let source=fs.readFileSync(path.join(root,target),'utf8');
source=source.replace('const currentCashLane =',()=>`const portalGap = ${JSON.stringify(finding)};
if (!cashRead.remaining.includes(portalGap)) cashRead.remaining.push(portalGap);
if (!cashRead.evidence.includes('evidence/cash-proof-portal-finding-2026-09-28.json')) cashRead.evidence.push('evidence/cash-proof-portal-finding-2026-09-28.json');
const currentCashLane =`);
source=source.replace('Scope source queries and verify domain handoffs','Restore proof portal readability, then scope queries');
source=source.replace('**Remaining priority:** Broad source queries', '**Remaining priority:** The proof portal screenshot shows unreadable text and transparent background: restore dashboard tokens and verify contrast first. Broad source queries');
source=source.replace("cashRead.closureReview.note = 'Aggregate output and retained proof regressions have focused evidence; eight owned EN/FR aggregate views passed. Scoped source reads, proof lifecycle, full localization and financial handoffs remain open.';", "cashRead.closureReview.note = 'Aggregate and proof-state corrections have current focused/runtime evidence. Actual proof portal readability is defective; scoped source reads, other proof types, full localization and financial handoffs remain open.';");
write(target,source);console.log(JSON.stringify({finding:record.status,evidence:'evidence/cash-proof-portal-finding-2026-09-28.json'}));
