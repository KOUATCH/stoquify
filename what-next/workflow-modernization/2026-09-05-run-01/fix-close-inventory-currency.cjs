const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');const repo=path.resolve(__dirname,'../../..');
function write(file,work){const target=path.join(repo,file),old=fs.readFileSync(target,'utf8');let s=work(old.replace(/\r\n/g,'\n'));if(old.includes('\r\n'))s=s.replace(/\n/g,'\r\n');const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s))}finally{fs.closeSync(fd)}}
write('services/accounting/close-assurance.service.ts',s=>{assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,'services/accounting/close-assurance.service.ts'))).digest('hex'),'805a573a4887b7769e99655da94291777f697888f6dde1b089155d47041db202');const a=s.indexOf('async function resolveTargetPeriod('),b=s.indexOf('\nasync function getPreflightSafe(',a);assert.ok(a>0&&b>a);let part=s.slice(a,b);assert.equal((part.match(/endDate: true,/g)||[]).length,3);part=part.replaceAll('endDate: true,','endDate: true,\n        organization: { select: { currency: true } },');s=s.slice(0,a)+part+s.slice(b);const old='reconcileInventoryClass3({ organizationId, periodId: period.id })';assert.ok(s.includes(old));return s.replace(old,'reconcileInventoryClass3({ organizationId, periodId: period.id, currency: period.organization?.currency ?? "XAF" })')});
write('services/accounting/__tests__/close-assurance.service.test.ts',s=>{const marker='  it("classifies inventory valuation mismatches as close blockers", async () => {';assert.ok(s.includes(marker));return s.replace(marker,`  it("uses the tenant currency consistently with close-pack inventory refresh", async () => {
    mockDb.accountingPeriod.findFirst.mockResolvedValue({ ...period, organization: { currency: "XOF" } })
    await getCloseAssuranceDashboard("org-1", period.id)
    expect(mockReconcileInventoryClass3).toHaveBeenCalledWith({ organizationId: "org-1", periodId: period.id, currency: "XOF" })
  })

`+marker)});
