const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {root,state}=require('./environment.cjs'),s=state(),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const cp=path.join(__dirname,'source-changes.json'),op=path.join(__dirname,'verified-overlays.json'),changes=JSON.parse(fs.readFileSync(cp)),overlays=JSON.parse(fs.readFileSync(op));
const conclusion='Some indicators are blocked or incomplete. Review the source limitations before relying on this brief.';
const edits=[
 ['components/manager-action-center/ManagerLocationActionCenterDashboard.tsx',t=>t.replace('aria-label={q[view.mode]}','aria-label={`${bundle.location.name}: ${q[view.mode]}`}').replace('<aside','<section').replace('</aside>','</section>')],
 ['components/manager-action-center/__tests__/ManagerLocationActionCenterDashboard.test.tsx',t=>t.replace(/name: "(Investigate|Brief|Synthèse|Actions)"/g,'name: "Central Store: $1"')],
 ['services/owner-war-room/owner-war-room.service.ts',t=>t.replace('import "server-only"','import "server-only"\nimport { weakestEvidenceGrade } from "@/services/snapshots/snapshot-utils"').replace('evidenceGrade: input.moduleControl.summary.wouldBlockCount > 0 ? "operational" : "posted",','evidenceGrade: "operational",').replace('        closeReadiness.metrics.openFindingCount > 0','        closeReadiness.metrics.openFindingCount > 0 || closeReadiness.blockers.length > 0 || closeReadiness.status !== "fresh"').replace(/const evidenceGrade = strongestVisibleGrade\(\[\s*\.\.\.cards.map\(\(item\) => item.evidenceGrade\),\s*\.\.\.priorityActions.map\(\(item\) => item.evidenceGrade\),\s*\]\)/,'const financialSnapshots = [tenantOperating, paymentTruth, inventoryCash, closeReadiness]\n  const evidenceGrade = weakestEvidenceGrade(financialSnapshots.map(snapshot => snapshot.evidenceGrade))').replace('buildMorningBriefRecommendation(headlineMetrics, input.actorPermissions, input.locale)','buildMorningBriefRecommendation(headlineMetrics, input.actorPermissions, input.locale,\n    state !== "ready" || financialSnapshots.some(snapshot => snapshot.status !== "fresh" || snapshot.blockers.length > 0))').replace('  locale: OwnerLocale = "en",\n): { conclusion:', '  locale: OwnerLocale = "en",\n  incompleteCoverage = false,\n): { conclusion:').replace('  return { conclusion: ownerText("No cash, close, or freshness blocker',`  if (incompleteCoverage) {\n    return { conclusion: ownerText("${conclusion}", locale), action: null }\n  }\n  return { conclusion: ownerText("No cash, close, or freshness blocker`)],
 ['services/owner-war-room/owner-war-room-copy.ts',t=>t.replace('  "No cash, close, or freshness blocker',`  "${conclusion}": "Certains indicateurs sont bloqués ou incomplets. Examinez les limites des sources avant de vous fier à cette synthèse.",\n  "No cash, close, or freshness blocker`)],
 ['services/owner-war-room/__tests__/owner-war-room.service.test.ts',t=>t.replace('    input.actionQueue.summary.stale = stale','    for (const snapshot of Object.values(input.snapshots)) { snapshot.status = "fresh"; snapshot.uiState = "ready"; snapshot.blockers = [] }\n    input.actionQueue.summary.stale = stale').replace('  it("localizes owned narratives',`  it.each(["en", "fr"] as const)("does not certify incomplete zero-exposure coverage (%s)", locale => {
    const input = localizedInput(locale)
    input.snapshots.paymentTruth.metrics.openSuspenseAmount = 0
    input.snapshots.closeReadiness.metrics = closeMetrics({ unavailableEvidenceCount: 0 })
    input.snapshots.tenantOperating.metrics.payrollFinanceForecast.totalUpcomingAmount = 0
    input.actionQueue.summary.stale = 0
    const result = composeOwnerWarRoomData(input)
    expect(result.morningBrief.commandBrief.primaryAction).toBeNull()
    expect(result.morningBrief.commandBrief.conclusion).toContain(locale === "fr" ? "bloqués ou incomplets" : "blocked or incomplete")
    expect(JSON.stringify(result.strips)).toContain(locale === "fr" ? "preuves indisponibles" : "unavailable evidence")
  })

  it("uses the weakest financial evidence without promoting clean module configuration to posted", () => {
    const input = localizedInput("en")
    input.snapshots.tenantOperating.evidenceGrade = "certified"
    input.snapshots.paymentTruth.evidenceGrade = "posted"
    input.snapshots.inventoryCash.evidenceGrade = "raw"
    const result = composeOwnerWarRoomData(input)
    expect(result.morningBrief.commandBrief.evidenceGrade).toBe("raw")
    expect(result.cards.find(card => card.id === "module_observe")?.evidenceGrade).toBe("operational")
  })

  it("localizes owned narratives`)]
];
for(const [file,transform] of edits){const target=path.join(root,file),candidate=path.join(s.candidate,file),before=fs.readFileSync(target,'utf8');assert.equal(fs.readFileSync(candidate,'utf8'),before,'Concurrent edit: '+file);let after=transform(before.replace(/\r\n/g,'\n'));if(before.includes('\r\n'))after=after.replace(/\n/g,'\r\n');assert.notEqual(after,before);const backup=path.join(root,'.codex-tmp/phase9-source-before',file);if(!fs.existsSync(backup)){fs.mkdirSync(path.dirname(backup),{recursive:true});fs.writeFileSync(backup,before)}fs.writeFileSync(target,after);fs.writeFileSync(candidate,after);const c=changes.find(r=>r.file===file);if(c)c.after=hash(after);else changes.push({file,before:hash(before),after:hash(after)});const o=overlays.find(r=>r.file===file);if(o)o.verifiedOverlaySha256=hash(after);else overlays.push({file,capturedSha256:hash(before),verifiedOverlaySha256:hash(after),reason:'Acceptance corrections: location landmarks and conservative Owner evidence coverage'})}
fs.writeFileSync(cp,JSON.stringify(changes,null,2));fs.writeFileSync(op,JSON.stringify(overlays,null,2));
console.log('Location landmarks and Owner coverage corrected; regression cases added.');
