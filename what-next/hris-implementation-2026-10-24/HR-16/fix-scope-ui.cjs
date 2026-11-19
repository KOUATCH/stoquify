const fs=require('node:fs');const edits={
 'services/hris/personal-correction.service.ts':[
 ['return {profile:{displayName:e.displayName','return {scopeKey:a.organizationId+":"+a.actorId,profile:{displayName:e.displayName'],
 ['return {cases:rows.slice(0,200)','return {scopeKey:a.organizationId+":"+a.actorId,cases:rows.slice(0,200)']
 ],
 'components/hris/HrisPersonalCorrectionWorkspaceClient.tsx':[['<HrisPersonalCorrectionWorkspace initial={initial}','<HrisPersonalCorrectionWorkspace key={initial.scopeKey+":"+own} initial={initial}']],
 'components/hris/HrisPersonalCorrectionWorkspace.tsx':[
 ['setData(next);return next','setData(next);if(own&&next.allowedFields.length&&!next.allowedFields.includes(field)){setField(next.allowedFields[0]);setValue("");setDocumentId("")}return next'],
 ['{h.operation}</span>','{({SUBMITTED:t("Submitted","Soumise"),AMENDED:t("Information updated","Informations complétées"),APPROVE:t("Approved and applied","Approuvée et appliquée"),RETURN:t("Information requested","Informations demandées"),REJECT:t("Rejected","Refusée"),REASSIGN:t("Reviewer reassigned","Responsable réaffecté")} as Record<string,string>)[h.operation]??h.operation}</span>'],
 ['fieldLabel(key)+": "+v','fieldLabel(key)+": "+(h.baseline?.[key as keyof typeof h.baseline]??"—")+" → "+v']
 ]};for(const [p,replacements] of Object.entries(edits)){let s=fs.readFileSync(p,'utf8');for(const [a,b] of replacements){if(!s.includes(a))throw Error('Missing anchor '+p);s=s.replace(a,()=>b)}fs.writeFileSync(p+'.hr16-candidate',s)}
