const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
function edit(relative, transform) {
  const file = path.join(root, relative);
  const original = fs.readFileSync(file, 'utf8');
  const output = transform(original.replace(/\r\n/g, '\n')).replace(/\n/g, '\r\n');
  if (output === original) throw new Error('No edit: ' + relative);
  const id = crypto.randomUUID();
  fs.writeFileSync(path.join(__dirname, 'evidence', 'cash-proof-before-' + id + '.txt'), original, {flag:'wx'});
  const pending = file + '.pending-' + id;
  fs.writeFileSync(pending, output, {flag:'wx'}); fs.renameSync(pending, file);
  console.log(relative);
}
edit('services/cash-command/__tests__/cash-command.service.test.ts', source => {
  const anchor = '  it.each([\n    {\n      label: "missing actor",';
  if (!source.includes(anchor)) throw new Error('Missing test anchor');
  return source.replace(anchor, `  it("does not discover or disclose proof identifiers without their read permissions", async () => {
    mockFindPaymentTransaction.mockResolvedValue({ id: "private-payment-proof" })
    mockFindJournalEntry.mockResolvedValue({ id: "private-journal-proof" })
    mockFindReconciliationRun.mockResolvedValue({ id: "private-reconciliation-proof" })
    mockFindCloseRun.mockResolvedValue({ id: "private-close-proof" })
    const result = await getCashCommandData({
      organizationId: "org-1", actorId: "actor-1", actorPermissions: ["finance.read"],
      actorRoleCodes: ["administrator"], now: generatedAt,
    })
    for (const query of [mockFindPaymentTransaction, mockFindJournalEntry, mockFindReconciliationRun, mockFindCloseRun]) {
      expect(query).not.toHaveBeenCalled()
    }
    expect(JSON.stringify(result)).not.toContain("private-")
    expect(result.proofSubjects.every(subject => !subject.available)).toBe(true)
  })

  it("checks each proof module before discovery and retains authorized period and tenant scope", async () => {
    mockObserveModuleAccess.mockImplementation(async ({ moduleSlug }) => ({ allowed: moduleSlug === "accounting" }))
    mockFindJournalEntry.mockResolvedValue({ id: "posted-owned-journal" })
    const actorPermissions = ["finance.read", "accounting.journal.read", "payments.reconciliation.read", "accounting.close.read"]
    const result = await getCashCommandData({
      organizationId: "org-1", actorId: "actor-1", actorPermissions,
      actorRoleCodes: ["administrator"], now: generatedAt,
    })
    expect(mockFindPaymentTransaction).not.toHaveBeenCalled()
    expect(mockFindReconciliationRun).not.toHaveBeenCalled()
    expect(mockFindCloseRun).not.toHaveBeenCalled()
    expect(mockFindJournalEntry).toHaveBeenCalledWith({
      where: { organizationId: "org-1", status: "POSTED", entryDate: {
        gte: new Date("2026-06-24T00:00:00.000Z"), lte: new Date("2026-06-24T23:59:59.999Z"),
      } }, orderBy: { updatedAt: "desc" }, select: { id: true },
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1", userId: "actor-1", actorPermissions, moduleSlug: "accounting",
      accessIntent: "read", mode: "enforce", audit: true,
    }))
    expect(result.proofSubjects.filter(subject => subject.available)).toEqual([
      expect.objectContaining({ subjectType: "journal.entry", subjectId: "posted-owned-journal" }),
    ])
  })

` + anchor);
});
