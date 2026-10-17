const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');const root=path.resolve(__dirname,'../../..');
const saved=JSON.parse(fs.readFileSync(path.join(__dirname,'lanes/environment/close-proof-source-before-7b700f0a-fb10-4645-81a8-953101dc0ad4.json'))),changes=new Map();
function replace(s,a,b){assert.ok(s.includes(a),a);return s.replace(a,b)}
function edit(file,work){const original=fs.readFileSync(path.join(root,file),'utf8');if(saved[file])assert.equal(original,saved[file]);const text=work(original.replace(/\r\n/g,'\n'));changes.set(file,original.includes('\r\n')?text.replace(/\n/g,'\r\n'):text)}
edit('services/evidence/proof-trail.service.ts',s=>{
 s=replace(s,'async function buildCloseRunProofTrail',`// Invalidation preserves signed artifacts for history; it revokes current trust.
function hasStaleCloseEvidence(metadata: Prisma.JsonValue | undefined) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false
  const staleState = metadata.staleState
  return !!staleState && typeof staleState === "object" && !Array.isArray(staleState) && staleState.status === "EVIDENCE_STALE"
}

async function buildCloseRunProofTrail`);
 s=replace(s,'select: { id: true, fileType: true, watermarkId: true, isCertified: true, exportedAt: true }','select: { id: true, fileType: true, watermarkId: true, isCertified: true, exportedAt: true, metadata: true }');
 s=replace(s,'by: ["severity"], where: { ...scope, status: CloseChecklistStatus.FAILED }','by: ["severity"], where: { ...scope, status: { in: [CloseChecklistStatus.FAILED, CloseChecklistStatus.UNAVAILABLE] } }');
 s=replace(s,'  const openFindings = severitySummary(findingGroups)',`  const staleEvidence = hasStaleCloseEvidence(closeRun.metadata)
  if (staleEvidence) {
    blockers.push(createProofTrailBlocker({
      id: "close-evidence-stale", severity: "high", gate: "accounting.close.evidence",
      title: "Close certification evidence is stale",
      detail: "A recorded source change invalidated this close evidence. Retained exports do not certify the current close.",
      sourceTables: ["close_runs", "close_pack_exports"],
      nextAction: "Run a new close assessment and resolve its controls before requesting certification.",
    }))
  }
  if (closeRun.status === CloseRunStatus.CERTIFIED && certifiedPackExportCount === 0) {
    blockers.push(createProofTrailBlocker({
      id: "close-certified-export-missing", severity: "high", gate: "accounting.close.evidence",
      title: "Certified close export is missing",
      detail: "The certified status has no retained certified export evidence.",
      sourceTables: ["close_runs", "close_pack_exports"],
      nextAction: "Run a new close assessment and resolve its controls before requesting certification.",
    }))
  }
  const openFindings = severitySummary(findingGroups)`);
 s=replace(s,'title: "Close checklist has failed controls"','title: "Close checklist has failed or unavailable controls"');
 s=replace(s,'`${failedChecklistItems.count} checklist item failed.`','`${failedChecklistItems.count} checklist item failed or is unavailable.`');
 s=replace(s,'item.status === CloseChecklistStatus.FAILED ? "blocked" : "operational"','item.status === CloseChecklistStatus.FAILED || item.status === CloseChecklistStatus.UNAVAILABLE ? "blocked" : "operational"');
 s=replace(s,'    const exportNodeId = `close-pack-export-${index + 1}`',`    const exportNodeId = \`close-pack-export-\${index + 1}\`
    const staleExport = packExport.isCertified && (staleEvidence || hasStaleCloseEvidence(packExport.metadata))
    const exportGrade: EvidenceGrade = staleExport ? "blocked" : packExport.isCertified ? "certified" : "operational"`);
 s=replace(s,'label: packExport.isCertified ? "Certified close pack export" : "Draft close pack export"','label: staleExport ? "Invalidated close pack export" : packExport.isCertified ? "Certified close pack export" : "Draft close pack export"');
 s=s.replaceAll('evidenceGrade: packExport.isCertified ? "certified" : "operational"','evidenceGrade: exportGrade');
 s=replace(s,'edgeType: packExport.isCertified ? "certifies" : "source"','edgeType: staleExport ? "source" : packExport.isCertified ? "certifies" : "source"');
 s=replace(s,'label: packExport.isCertified ? "Certifies close evidence" : "Exports close pack"','label: staleExport ? "Retains invalidated close evidence" : packExport.isCertified ? "Certifies close evidence" : "Exports close pack"');
 return s;
});
edit('services/evidence/evidence-grade.service.ts',s=>{
 s=replace(s,'    input.status === CloseRunStatus.CERTIFIED ||\n    (input.status === CloseRunStatus.EXPORTED && input.certifiedPackExportCount > 0)','    (input.status === CloseRunStatus.CERTIFIED || input.status === CloseRunStatus.EXPORTED) &&\n    input.certifiedPackExportCount > 0');
 s=replace(s,'  if (input.status === CloseRunStatus.READY || input.status === CloseRunStatus.EXPORTED)',`  if (input.status === CloseRunStatus.CERTIFIED) {
    return { grade: "blocked", reason: "Close certification is missing its certified export evidence." }
  }

  if (input.status === CloseRunStatus.READY || input.status === CloseRunStatus.EXPORTED)`);
 return s;
});
edit('components/evidence/proof-trail-presentation.ts',s=>{
 const entries={
 'Close certification is missing its certified export evidence.':'La certification de clôture ne dispose pas de sa preuve d’export certifié.',
 'Close certification evidence is stale':'Les preuves de certification de clôture sont périmées',
 'A recorded source change invalidated this close evidence. Retained exports do not certify the current close.':'Une modification enregistrée de la source a invalidé ces preuves de clôture. Les exports conservés ne certifient pas la clôture actuelle.',
 'Run a new close assessment and resolve its controls before requesting certification.':'Lancez une nouvelle évaluation de clôture et résolvez ses contrôles avant de demander la certification.',
 'Certified close export is missing':'L’export certifié de clôture est manquant',
 'The certified status has no retained certified export evidence.':'Le statut certifié ne dispose d’aucune preuve d’export certifié conservée.',
 'Close checklist has failed or unavailable controls':'Des contrôles de clôture ont échoué ou sont indisponibles',
 'Invalidated close pack export':'Export du dossier de clôture invalidé',
 'Retains invalidated close evidence':'Conserve les preuves de clôture invalidées',
 };
 s=replace(s,'const french: Record<string, string> = {','const french: Record<string, string> = {\n'+Object.entries(entries).map(([a,b])=>'  '+JSON.stringify(a)+': '+JSON.stringify(b)+',').join('\n'));
 s=replace(s,'    [/^(\\d+) checklist item failed\\.$/', '    [/^(\\d+) checklist item failed or is unavailable\\.$/, n => `${n} contrôle(s) ont échoué ou sont indisponibles.`],\n    [/^(\\d+) checklist item failed\\.$/');return s;
});
edit('services/evidence/__tests__/proof-trail.service.test.ts',s=>replace(s,'"21 checklist item failed."','"21 checklist item failed or is unavailable."'));
for(const [file,text]of changes){const target=path.join(root,file),old=fs.readFileSync(target);fs.writeFileSync(target+'.retained-'+crypto.randomUUID(),old,{flag:'wx'});const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text))}finally{fs.closeSync(fd)}}
console.log(JSON.stringify({edited:[...changes.keys()]}));
