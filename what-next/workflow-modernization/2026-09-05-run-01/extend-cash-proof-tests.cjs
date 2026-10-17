const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const file = path.resolve(__dirname, '../../../services/cash-command/__tests__/cash-command.service.test.ts');
const original = fs.readFileSync(file, 'utf8'), source = original.replace(/\r\n/g, '\n');
const anchor = '  it.each([\n    {\n      label: "missing actor",';
if (!source.includes(anchor)) throw new Error('Missing test anchor');
const tests = `  it("discovers only owned in-period proofs after read admission, including read-only modules", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, readOnly: true })
    mockFindPaymentTransaction.mockResolvedValue({ id: "payment-owned" })
    mockFindJournalEntry.mockResolvedValue({ id: "journal-owned" })
    mockFindReconciliationRun.mockResolvedValue({ id: "reconciliation-owned" })
    mockFindCloseRun.mockResolvedValue({ id: "close-owned" })
    const result = await getCashCommandData({
      organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], now: generatedAt,
      actorPermissions: ["finance.read", "accounting.journal.read", "payments.reconciliation.read", "accounting.close.read"],
    })
    expect(result.proofSubjects.filter(subject => subject.available)).toHaveLength(4)
    expect(mockObserveModuleAccess).toHaveBeenCalledTimes(3)
    for (const [args] of mockObserveModuleAccess.mock.calls) expect(args.accessIntent).toBe("read")
    const range = { gte: new Date("2026-06-24T00:00:00.000Z"), lte: new Date("2026-06-24T23:59:59.999Z") }
    expect(mockFindPaymentTransaction).toHaveBeenCalledWith(expect.objectContaining({ where: {
      organizationId: "org-1", OR: [{ occurredAt: range }, { confirmedAt: range }, { settledAt: range }],
    } }))
    expect(mockFindReconciliationRun).toHaveBeenCalledWith(expect.objectContaining({ where: {
      organizationId: "org-1", voidedAt: null, businessDate: range,
    } }))
    expect(mockFindCloseRun).toHaveBeenCalledWith(expect.objectContaining({ where: {
      organizationId: "org-1", voidedAt: null, period: { startDate: { lte: range.lte }, endDate: { gte: range.gte } },
    } }))
  })

  it("does not cache a previous module admission across requests", async () => {
    mockFindJournalEntry.mockResolvedValue({ id: "previously-visible-journal" })
    const input = {
      organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], now: generatedAt,
      actorPermissions: ["finance.read", "accounting.journal.read"],
    }
    expect(JSON.stringify(await getCashCommandData(input))).toContain("previously-visible-journal")
    mockObserveModuleAccess.mockResolvedValue({ allowed: false })
    mockFindJournalEntry.mockClear()
    const denied = await getCashCommandData(input)
    expect(mockFindJournalEntry).not.toHaveBeenCalled()
    expect(JSON.stringify(denied)).not.toContain("previously-visible-journal")
    expect(denied.proofSubjects.find(subject => subject.moduleSlug === "accounting")).toMatchObject({
      available: false, unavailableReason: "This workspace does not currently allow reading this proof.",
    })
  })

  it("does not convert a proof-query exception into an empty or successful result", async () => {
    mockFindJournalEntry.mockRejectedValue(new Error("controlled proof lookup failure"))
    await expect(getCashCommandData({
      organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], now: generatedAt,
      actorPermissions: ["finance.read", "accounting.journal.read"],
    })).rejects.toThrow("controlled proof lookup failure")
  })

  it("waits for authoritative module admission before touching proof records", async () => {
    let resolveAdmission!: (value: { allowed: boolean }) => void
    let admissionStarted!: () => void
    const started = new Promise<void>(resolve => { admissionStarted = resolve })
    mockObserveModuleAccess.mockImplementation(() => {
      admissionStarted()
      return new Promise(resolve => { resolveAdmission = resolve })
    })
    const pending = getCashCommandData({
      organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], now: generatedAt,
      actorPermissions: ["finance.read", "accounting.journal.read"],
    })
    await started
    expect(mockFindJournalEntry).not.toHaveBeenCalled()
    resolveAdmission({ allowed: true })
    await pending
    expect(mockFindJournalEntry).toHaveBeenCalledTimes(1)
  })

  it("fails closed when module admission fails", async () => {
    mockObserveModuleAccess.mockRejectedValue(new Error("controlled module lookup failure"))
    await expect(getCashCommandData({
      organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], now: generatedAt,
      actorPermissions: ["finance.read", "accounting.journal.read"],
    })).rejects.toThrow("controlled module lookup failure")
    expect(mockFindJournalEntry).not.toHaveBeenCalled()
  })

`;
const pending = file + '.pending-' + crypto.randomUUID();
fs.writeFileSync(pending, source.replace(anchor, tests + anchor).replace(/\n/g, '\r\n'), {flag:'wx'});
fs.renameSync(pending, file);
console.log('Added proof admission, period, read-only, revocation and failure regressions');
