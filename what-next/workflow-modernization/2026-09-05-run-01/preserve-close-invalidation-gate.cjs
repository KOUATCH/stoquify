const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const repo=path.resolve(__dirname,'../../..');
function edit(file,work){const target=path.join(repo,file),old=fs.readFileSync(target,'utf8');let s=work(old.replace(/\r\n/g,'\n'));if(old.includes('\r\n'))s=s.replace(/\n/g,'\r\n');const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s))}finally{fs.closeSync(fd)}}
edit('services/accounting/close-assurance-pack.service.ts',s=>{const marker='  if (run.status !== CloseRunStatus.READY)\n    blockers.push(`Close run status is ${run.status}, not READY.`);';assert.ok(s.includes(marker));assert.ok(!s.includes('A recorded change invalidated close certification evidence.'));return s.replace(marker,`  if (metadataRecord(metadataRecord(run.metadata).staleState).status === "EVIDENCE_STALE")
    blockers.push("A recorded change invalidated close certification evidence. Run a new close assessment.");
`+marker)});
edit('services/accounting/__tests__/close-assurance-pack.service.test.ts',s=>{const marker='  it("accepts unchanged source evidence despite a different observation hash", async () => {';assert.ok(s.includes(marker));return s.replace(marker,`  it("keeps recorded close invalidation effective even when inventory is fresh and status is READY", async () => {
    const value = closeRun()
    mockDb.closeRun.findFirst.mockResolvedValue({ ...value, metadata: { ...value.metadata, staleState: { status: "EVIDENCE_STALE" } } })
    await expect(exportClosePack("org-1", { closeRunId: "close-run-1", mode: "CERTIFIED" }, { actorId: "certifier-1", actorPermissions: ["accounting.close.certify"], now: "2026-06-15T13:00:00Z", lastAuthAt: "2026-06-15T13:00:00Z" })).rejects.toThrow("A recorded change invalidated close certification evidence.")
    expect(mockDb.closePackExport.create).not.toHaveBeenCalled()
  })

`+marker)});
