const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');const repo=path.resolve(__dirname,'../../..'),baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'evidence/accounting-setup-export-before-ed0d0af2-9f0b-4784-b67c-08f4c12d38cd.json')));
const service='services/accounting/close-assurance-pack.service.ts',test='services/accounting/__tests__/close-assurance-pack.service.test.ts';
for(const file of [service,test])assert.equal(fs.readFileSync(path.join(repo,file),'utf8'),baseline.sources[file]);
let s=baseline.sources[service].replace(/\r\n/g,'\n'),t=baseline.sources[test].replace(/\r\n/g,'\n');
const marker='    if (!run) throw new NotFoundError("Close run not found");';assert.equal(s.split(marker).length,2);
s=s.replace(marker,marker+`

    if (mode === "CERTIFIED") {
      const settings = await tx.organizationAccountingSettings.findUnique({
        where: { organizationId },
        select: { accountingEnabled: true, setupStatus: true },
      });
      if (!settings?.accountingEnabled ||
          (settings.setupStatus !== "READY" && settings.setupStatus !== "LOCKED")) {
        throw new BusinessRuleError(
          "Certified close pack requires enabled accounting with READY or LOCKED setup. Complete accounting setup and run a new assessment.",
        );
      }
    }
`);
t=t.replace('    $transaction: jest.fn(),','    $transaction: jest.fn(),\n    organizationAccountingSettings: { findUnique: jest.fn() },');
t=t.replace('  $transaction: jest.Mock','  organizationAccountingSettings: { findUnique: jest.Mock }\n  $transaction: jest.Mock');
t=t.replace('    mockDb.$transaction.mockImplementation((callback) => callback(mockDb))','    mockDb.$transaction.mockImplementation((callback) => callback(mockDb))\n    mockDb.organizationAccountingSettings.findUnique.mockResolvedValue({ accountingEnabled: true, setupStatus: "READY" })');
const testMarker='  it("blocks same-actor certification for segregation of duties", async () => {';assert.ok(t.includes(testMarker));
t=t.replace(testMarker,`  it.each([null, { accountingEnabled: true, setupStatus: "IN_PROGRESS" }, { accountingEnabled: false, setupStatus: "READY" }])("rejects a saved READY run when current accounting setup is incomplete: %j", async (settings) => {
    mockDb.organizationAccountingSettings.findUnique.mockResolvedValue(settings)
    await expect(exportClosePack("org-1", { closeRunId: "close-run-1", mode: "CERTIFIED" }, {
      actorId: "certifier-1", actorPermissions: ["accounting.close.certify"],
      lastAuthAt: "2026-06-15T13:00:00.000Z", now: "2026-06-15T13:01:00.000Z",
    })).rejects.toThrow(/Complete accounting setup/)
    expect(mockDb.organizationAccountingSettings.findUnique).toHaveBeenCalledWith({ where: { organizationId: "org-1" }, select: { accountingEnabled: true, setupStatus: true } })
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
  })

`+testMarker);
for(const [file,value]of [[service,s],[test,t]]){const fd=fs.openSync(path.join(repo,file),'r+');try{fs.writeFileSync(fd,value);fs.ftruncateSync(fd,Buffer.byteLength(value))}finally{fs.closeSync(fd)}}
