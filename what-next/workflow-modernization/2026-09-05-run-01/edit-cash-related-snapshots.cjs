const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const files=['services/cash-command/cash-command.service.ts','services/cash-command/__tests__/cash-command.service.test.ts'];
const before=Object.fromEntries(files.map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')]));
let service=before[files[0]].replaceAll('getTenantOperatingSnapshot','getTenantOperatingSnapshotFromRelated');
service=service.replace('    tenantOperating,\r\n    paymentTruth,','    paymentTruth,').replace('    getTenantOperatingSnapshotFromRelated(scope),\r\n','');
assert.ok(!service.includes('getTenantOperatingSnapshotFromRelated(scope),'));
const marker='  const signals = [',at=service.indexOf(marker);assert.ok(at>0);
service=service.slice(0,at)+`  // Share the exact related reads with the tenant aggregate and visible cards.
  // A failed source rejects the request; it must not become an empty snapshot.
  const tenantOperating = await getTenantOperatingSnapshotFromRelated(scope, {
    paymentTruth,
    inventoryCash,
    closeReadiness,
  })

`.replaceAll('\n','\r\n')+service.slice(at);
let tests=before[files[1]].replaceAll('getTenantOperatingSnapshot','getTenantOperatingSnapshotFromRelated').replaceAll('mockGetTenantOperatingSnapshot','mockGetTenantOperatingSnapshotFromRelated');
const insert='  it("does not discover or disclose proof identifiers without their read permissions",';
assert.ok(tests.includes(insert));
tests=tests.replace(insert,()=>`  it("uses one resolved source set for both the aggregate and visible cash indicators", async () => {
    const payment = paymentSnapshot({ openSuspenseAmount: 456789 })
    const inventory = inventorySnapshot({ inventoryValue: 234567 })
    const close = closeSnapshot()
    mockGetPaymentTruthSnapshot.mockResolvedValueOnce(payment)
    mockGetInventoryCashSnapshot.mockResolvedValueOnce(inventory)
    mockGetCloseReadinessSnapshot.mockResolvedValueOnce(close)
    const result = await getCashCommandData({
      organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"],
      actorPermissions: ["finance.read", "payments.reconciliation.read", "inventory.read"], now: generatedAt,
    })
    for (const source of [mockGetPaymentTruthSnapshot, mockGetInventoryCashSnapshot, mockGetCloseReadinessSnapshot]) {
      expect(source).toHaveBeenCalledTimes(1)
      expect(source).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", now: generatedAt }))
    }
    expect(mockGetTenantOperatingSnapshotFromRelated).toHaveBeenCalledTimes(1)
    const [scope, related] = mockGetTenantOperatingSnapshotFromRelated.mock.calls[0]
    expect(scope).toEqual(mockGetPaymentTruthSnapshot.mock.calls[0][0])
    expect(related.paymentTruth).toBe(payment)
    expect(related.inventoryCash).toBe(inventory)
    expect(related.closeReadiness).toBe(close)
    expect(result.cards.find(card => card.id === "unreconciled_cash")?.value).toBe(456789)
    expect(result.cards.find(card => card.id === "stock_cash_buffer")?.value).toBe(234567)
  })

  it.each([
    ["payment", mockGetPaymentTruthSnapshot],
    ["inventory", mockGetInventoryCashSnapshot],
    ["close", mockGetCloseReadinessSnapshot],
  ])("rejects a failed %s source before aggregate construction and permits a fresh retry", async (_name, source) => {
    const failure = new Error("controlled related source failure")
    const input = { organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], actorPermissions: ["finance.read"], now: generatedAt }
    ;(source as jest.Mock).mockRejectedValueOnce(failure)
    await expect(getCashCommandData(input)).rejects.toBe(failure)
    expect(mockGetTenantOperatingSnapshotFromRelated).not.toHaveBeenCalled()
    expect(mockBuildBusinessSignalsFromSnapshots).not.toHaveBeenCalled()
    expect(mockFindPaymentTransaction).not.toHaveBeenCalled()
    await expect(getCashCommandData(input)).resolves.toMatchObject({ organizationId: "org-1" })
    expect(mockGetTenantOperatingSnapshotFromRelated).toHaveBeenCalledTimes(1)
  })

` .replaceAll('\n','\r\n')+insert);
assert.ok(!tests.includes('FromRelatedFromRelated'));
const receipt={at:new Date().toISOString(),before:Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(before[file]).digest('hex')]))};
fs.writeFileSync(path.join(__dirname,'evidence/cash-related-source-before.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
for(const [file,body] of [[files[0],service],[files[1],tests]]){const target=path.join(root,file),pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,body,{flag:'wx'});fs.renameSync(pending,target);}
console.log('Updated Cash Command related-source reuse and focused failure/retry tests.');
