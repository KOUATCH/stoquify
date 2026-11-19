const fs=require('node:fs');const edits={
 'components/hris/HrisDocumentWorkspace.tsx':[['<Card key={d.id}>','<Card key={d.id} data-document-id={d.id}>']],
 'components/hris/HrisDocumentRetentionControls.tsx':[['?{documentId:d.id}:','?{documentId:d.id,reason}:']],
 'components/hris/HrisDocumentWorkspaceClient.tsx':[['{command,documentId:input.documentId}:{command,input}','{command,documentId:input.documentId,reason:input.reason}:{command,input}']],
 'app/api/hris/documents/route.ts':[['await deleteEmployeeDocument(actor,z.string().uuid().parse(raw.documentId))','await deleteEmployeeDocument(actor,z.string().uuid().parse(raw.documentId),undefined,z.string().trim().min(8).max(500).parse(raw.reason))']],
 'what-next/hris-implementation-2026-10-24/HR-15/browser/check.cjs':[
 ["await page.getByRole('button',{name:t('Review approval','Vérifier l’approbation'),exact:true}).first().click();","const card=page.locator('[data-document-id]').filter({has:page.getByText('Synthetic browser '+locale,{exact:true})});await card.getByRole('button',{name:t('Review approval','Vérifier l’approbation'),exact:true}).click();"],
 ["await page.getByRole('button',{name:t('Download original','Télécharger l’original'),exact:true}).first().click();","await page.locator('[data-document-id]').filter({has:page.getByText('Synthetic browser '+locale,{exact:true})}).getByRole('button',{name:t('Download original','Télécharger l’original'),exact:true}).click();"]
 ]};
for(const [p,replacements] of Object.entries(edits)){let s=fs.readFileSync(p,'utf8');for(const [a,b] of replacements){if(!s.includes(a))throw Error('Missing anchor '+p);s=s.replace(a,()=>b)}fs.writeFileSync(p+'.hr15-candidate',s)}
