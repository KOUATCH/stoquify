const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');const {root,state}=require('./environment.cjs'),s=state(),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const file='services/owner-war-room/__tests__/owner-war-room.service.test.ts',target=path.join(root,file),candidate=path.join(s.candidate,file),before=fs.readFileSync(target,'utf8');assert.equal(fs.readFileSync(candidate,'utf8'),before);
let after=before.replace('when only freshness or no blocker remains','when freshness or incomplete coverage remains').replace('stale ? "Refresh stale evidence" : "No cash, close, or freshness blocker"','stale ? "Refresh stale evidence" : "blocked or incomplete"').replace('  it.each(["en", "fr"] as const)("does not certify incomplete',`  it("reports clear coverage only when all contributing sources are fresh and no blockers remain", () => {
    const input = localizedInput("en")
    input.snapshots.paymentTruth.metrics.openSuspenseAmount = 0
    input.snapshots.closeReadiness.metrics = closeMetrics({ unavailableEvidenceCount: 0 })
    input.snapshots.tenantOperating.metrics.payrollFinanceForecast.totalUpcomingAmount = 0
    for (const snapshot of Object.values(input.snapshots)) { snapshot.status = "fresh"; snapshot.uiState = "ready"; snapshot.blockers = [] }
    input.actionQueue = actionQueue({ total: 0 })
    expect(composeOwnerWarRoomData(input).morningBrief.commandBrief.conclusion).toContain("No cash, close, or freshness blocker")
  })

  it.each(["en", "fr"] as const)("does not certify incomplete`);if(before.includes('\r\n'))after=after.replace(/(?<!\r)\n/g,'\r\n');assert.notEqual(before,after);fs.writeFileSync(target,after);fs.writeFileSync(candidate,after);
for(const [name,key] of [['source-changes.json','after'],['verified-overlays.json','verifiedOverlaySha256']]){const p=path.join(__dirname,name),rows=JSON.parse(fs.readFileSync(p));rows.find(r=>r.file===file)[key]=hash(after);fs.writeFileSync(p,JSON.stringify(rows,null,2))}
