const fs=require('node:fs');const edits={
 'services/hris/employee-document.service.ts':[
 ['r.status==="PENDING_REVIEW"&&a&&a.actorId','r.status==="PENDING_REVIEW"&&a&&!a.ownOnly&&a.actorId'],
 ['export async function reviewEmployeeDocument(actor:HrisDocumentActor,raw:unknown){','export async function reviewEmployeeDocument(actor:HrisDocumentActor,raw:unknown){if(actor.ownOnly)throw forbidden();'],
 ['export async function retainEmployeeDocument(actor:HrisDocumentActor,raw:unknown){','export async function retainEmployeeDocument(actor:HrisDocumentActor,raw:unknown){if(actor.ownOnly)throw forbidden();'],
 ['reason="Retention expiry cleanup"){','reason="Retention expiry cleanup"){if(actor.ownOnly)throw forbidden();']
 ],
 'components/hris/HrisPersonalCorrectionWorkspace.tsx':[
 ['useState<"displayName"|"legalName">("displayName")','useState<"displayName"|"legalName">(own&&"allowedFields" in initial?initial.allowedFields[0]??"displayName":"displayName")'],
 ['setReview(await execute("REVIEW",{caseId:c.id}));setAck(false);setDecisionReason("");setDecision("APPROVE")','const next=await execute("REVIEW",{caseId:c.id});setReview(next);setAck(false);setDecisionReason("");setDecision(next.assignedToActor?(next.status==="REQUESTED"?"APPROVE":"REJECT"):"REASSIGN")'],
 ['void run(()=>send({operation:"DECIDE",input:','if(!["REASSIGN",...(review.assignedToActor?["REJECT",...(review.status==="REQUESTED"?["APPROVE","RETURN"]:[])]:[])].includes(decision)){setAck(false);return}void run(()=>send({operation:"DECIDE",input:']
 ]};for(const [p,replacements] of Object.entries(edits)){let s=fs.readFileSync(p,'utf8');for(const [a,b] of replacements){if(!s.includes(a))throw Error('Missing anchor '+p+': '+a);s=s.replace(a,()=>b)}fs.writeFileSync(p+'.hr16-candidate',s)}
