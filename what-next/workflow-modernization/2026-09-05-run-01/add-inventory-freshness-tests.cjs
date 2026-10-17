const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const repo=path.resolve(__dirname,'../../..'),file=path.join(repo,'services/accounting/__tests__/close-assurance-pack.service.test.ts');const old=fs.readFileSync(file,'utf8');let s=old.replace(/\r\n/g,'\n');const marker='  it("uses a safe inventory-refresh limitation when draft pack evidence is unavailable", async () => {';assert.ok(s.includes(marker));assert.ok(!s.includes('accepts unchanged source evidence despite'));
s=s.replace(marker,`  it("accepts unchanged source evidence despite a different observation hash", async () => {
    mockReconcileInventoryClass3.mockResolvedValue({ ...cleanInventoryValuation(), reportHash: "sha256:new-observation", recordedThrough: "2026-06-15T13:00:00.000Z" })
    const result = await exportClosePack("org-1", { closeRunId: "close-run-1", mode: "DRAFT_NOT_CERTIFIED" }, { actorId: "operator-1", actorPermissions: ["accounting.close.export"] })
    expect(JSON.parse(result.content).annexes.inventoryValuation.freshness.status).toBe("FRESH")
  })

  it("requires a new assessment for legacy inventory annexes without the fingerprint version", async () => {
    const value = closeRun()
    const legacyAnnex: Record<string, unknown> = { ...inventoryAnnex() }
    delete legacyAnnex.evidenceHashVersion
    mockDb.closeRun.findFirst.mockResolvedValue({ ...value, metadata: { ...value.metadata, inventoryValuationAnnex: legacyAnnex } })
    const result = await exportClosePack("org-1", { closeRunId: "close-run-1", mode: "DRAFT_NOT_CERTIFIED" }, { actorId: "operator-1", actorPermissions: ["accounting.close.export"] })
    expect(JSON.parse(result.content).annexes.inventoryValuation.freshness.status).toBe("MISSING")
    expect(result.content).toContain("Run a new close assessment.")
    expect(mockReconcileInventoryClass3).not.toHaveBeenCalled()
  })

`+marker);if(old.includes('\r\n'))s=s.replace(/\n/g,'\r\n');const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s))}finally{fs.closeSync(fd)};
