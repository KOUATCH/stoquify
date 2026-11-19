const fs=require('node:fs'),p='components/hris/HrisDocumentWorkspace.tsx';let s=fs.readFileSync(p,'utf8');
const old='await execute("REVIEW",{documentId:review.id,revision:review.revision,decision:review.decision,acknowledged:ack,reason});setReview(null);setAck(false);';
const next='const envelope=decisionRetry??{documentId:review.id,revision:review.revision,decision:review.decision,acknowledged:ack,reason};setDecisionRetry(envelope);try{await execute("REVIEW",envelope)}catch(e){if((e as {status?:number}).status===409){setDecisionRetry(null);setAck(false);setReview(null);await refresh()}throw e}setDecisionRetry(null);setReview(null);setAck(false);';
if(!s.includes(old))throw Error('Missing review anchor');s=s.replace(old,()=>next);
s=s.replace('id="document-reason" value={reason}','id="document-reason" disabled={busy||!!decisionRetry} value={reason}');
s=s.replace('type="checkbox" checked={ack}','type="checkbox" disabled={busy||!!decisionRetry} checked={ack}');
s=s.replaceAll('disabled={busy} onClick={()=>{setReview','disabled={busy||!!decisionRetry} onClick={()=>{setReview');
fs.writeFileSync(p+'.hr15-candidate',s);
