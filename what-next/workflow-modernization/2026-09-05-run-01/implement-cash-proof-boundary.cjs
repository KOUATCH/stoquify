const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
function edit(relative, transform) {
  const file = path.join(root, relative), original = fs.readFileSync(file, 'utf8');
  const output = transform(original.replace(/\r\n/g, '\n')).replace(/\n/g, '\r\n');
  if (output === original) throw new Error('No edit: ' + relative);
  const id = crypto.randomUUID();
  fs.writeFileSync(path.join(__dirname, 'evidence', 'cash-proof-before-' + id + '.txt'), original, {flag:'wx'});
  const pending = file + '.pending-' + id;
  fs.writeFileSync(pending, output, {flag:'wx'}); fs.renameSync(pending, file);
  console.log(relative);
}
edit('services/cash-command/cash-command-contracts.ts', s => s.replace('  proofSubjectIds?: {', '  proofSubjectUnavailableReasons?: Partial<Record<"payment.transaction" | "journal.entry" | "reconciliation.run" | "close.run", string>>\n  proofSubjectIds?: {'));
edit('services/cash-command/cash-command.service.ts', s => {
  s = s.replace('const proofSubjectIds = await getLatestProofSubjectIds({\n    organizationId: input.organizationId,', 'const proofDiscovery = await getLatestProofSubjectIds({\n    ...input,');
  s = s.replace('    proofSubjectIds,\n  })', '    proofSubjectIds: proofDiscovery.ids,\n    proofSubjectUnavailableReasons: proofDiscovery.unavailableReasons,\n  })');
  for (const [type, message] of [
    ['payment.transaction', 'No payment transaction is visible in this cash-command period.'],
    ['reconciliation.run', 'No reconciliation run is visible in this cash-command period.'],
    ['close.run', 'No close run is visible in this cash-command period.'],
    ['journal.entry', 'No posted journal entry is visible in this cash-command period.'],
  ]) s = s.replace('unavailableReason: "' + message + '",', 'unavailableReason: input.proofSubjectUnavailableReasons?.["' + type + '"] ?? "' + message + '",');
  const anchor = 'async function getLatestProofSubjectIds(input: {';
  const at = s.indexOf(anchor); if (at < 0) throw new Error('Missing proof lookup');
  s = s.slice(0, at) + `async function getLatestProofSubjectIds(input: CashCommandInput & {
  periodStart: string
  periodEnd: string
}) {
  const periodStart = new Date(input.periodStart)
  const periodEnd = new Date(input.periodEnd)
  const periodWhere = { gte: periodStart, lte: periodEnd }
  const periodOverlap = {
    startDate: { lte: periodEnd },
    endDate: { gte: periodStart },
  }
  const unavailableReasons: NonNullable<ComposeCashCommandInput["proofSubjectUnavailableReasons"]> = {}
  const moduleReads = new Map<CommercialModuleSlug, Promise<boolean>>()

  async function discover(
    subjectType: keyof typeof unavailableReasons,
    moduleSlug: CommercialModuleSlug,
    read: () => Promise<{ id: string } | null>,
  ) {
    // Identifiers are protected evidence too: authorize before querying existence.
    if (!hasRbacPermission(input.actorPermissions, SUBJECT_PERMISSION_MAP[subjectType])) {
      unavailableReasons[subjectType] = "You do not have permission to read this proof."
      return null
    }
    let moduleRead = moduleReads.get(moduleSlug)
    if (!moduleRead) {
      moduleRead = observeModuleAccess({
        organizationId: input.organizationId,
        userId: input.actorId!,
        actorPermissions: input.actorPermissions,
        moduleSlug,
        surfaceType: "report",
        surface: "cash-command.proof-discovery",
        accessIntent: "read",
        mode: "enforce",
        audit: true,
        now: input.now ?? null,
      }).then(result => result.allowed)
      moduleReads.set(moduleSlug, moduleRead)
    }
    if (!(await moduleRead)) {
      unavailableReasons[subjectType] = "This workspace does not currently allow reading this proof."
      return null
    }
    return read()
  }

  const [paymentTransaction, journalEntry, reconciliationRun, closeRun] = await Promise.all([
    discover("payment.transaction", "payment_reconciliation", () => db.paymentTransaction.findFirst({
      where: {
        organizationId: input.organizationId,
        OR: [
          { occurredAt: periodWhere },
          { confirmedAt: periodWhere },
          { settledAt: periodWhere },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    })),
    discover("journal.entry", "accounting", () => db.journalEntry.findFirst({
      where: {
        organizationId: input.organizationId,
        status: "POSTED",
        entryDate: periodWhere,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    })),
    discover("reconciliation.run", "payment_reconciliation", () => db.reconciliationRun.findFirst({
      where: {
        organizationId: input.organizationId,
        voidedAt: null,
        businessDate: periodWhere,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    })),
    discover("close.run", "close_assurance", () => db.closeRun.findFirst({
      where: {
        organizationId: input.organizationId,
        voidedAt: null,
        period: periodOverlap,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    })),
  ])

  return {
    ids: {
      paymentTransactionId: paymentTransaction?.id ?? null,
      journalEntryId: journalEntry?.id ?? null,
      reconciliationRunId: reconciliationRun?.id ?? null,
      closeRunId: closeRun?.id ?? null,
    },
    unavailableReasons,
  }
}
`;
  return s;
});
edit('services/cash-command/__tests__/cash-command.service.test.ts', s => {
  for (const name of ['PaymentTransaction', 'JournalEntry', 'ReconciliationRun', 'CloseRun']) {
    s = s.replace('expect(mockFind' + name + ').toHaveBeenCalledTimes(1)', 'expect(mockFind' + name + ').not.toHaveBeenCalled()');
  }
  return s;
});
