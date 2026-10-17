const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../../..");
const changes={
  "services/accounting/periods.service.ts": [
    [
      "  JournalEntryStatus,\n",
      "  JournalEntryStatus,\n  CloseRunStatus,\n  CloseFindingSeverity,\n  CloseFindingStatus,\n  CloseChecklistStatus,\n"
    ],
    [
      "    const closed = await tx.accountingPeriod.update({",
      "    // Keep assurance out of ledger preflight: assessments themselves use that\n    // preflight and must be able to run before the first assessment exists.\n    const assurance = await tx.closeRun.findFirst({\n      where: { organizationId, periodId, voidedAt: null },\n      orderBy: [{ createdAt: \"desc\" }, { id: \"desc\" }],\n      select: {\n        id: true, status: true, completedAt: true, metadata: true,\n        criticalBlockerCount: true, highBlockerCount: true,\n        findings: {\n          where: {\n            organizationId, periodId,\n            severity: { in: [CloseFindingSeverity.HIGH, CloseFindingSeverity.CRITICAL] },\n            status: { in: [CloseFindingStatus.OPEN, CloseFindingStatus.ASSIGNED, CloseFindingStatus.IN_REVIEW, CloseFindingStatus.REOPENED] },\n          },\n          select: { id: true },\n        },\n        checklistItems: {\n          where: {\n            organizationId, periodId,\n            severity: { in: [CloseFindingSeverity.HIGH, CloseFindingSeverity.CRITICAL] },\n            status: { in: [CloseChecklistStatus.FAILED, CloseChecklistStatus.UNAVAILABLE] },\n          },\n          select: { id: true },\n        },\n      },\n    })\n    const metadata = assurance?.metadata\n    const staleState = metadata && typeof metadata === \"object\" && !Array.isArray(metadata) ? metadata.staleState : null\n    const stale = staleState && typeof staleState === \"object\" && !Array.isArray(staleState) && staleState.status === \"EVIDENCE_STALE\"\n    if (!assurance || !assurance.completedAt ||\n      !([CloseRunStatus.READY, CloseRunStatus.CERTIFIED, CloseRunStatus.EXPORTED] as CloseRunStatus[]).includes(assurance.status) ||\n      stale || assurance.criticalBlockerCount > 0 || assurance.highBlockerCount > 0 ||\n      assurance.findings.length > 0 || assurance.checklistItems.length > 0) {\n      throw new BusinessRuleError(\"Accounting period cannot be closed: complete a current close assurance assessment and resolve its blocking findings first\")\n    }\n\n    const closed = await tx.accountingPeriod.update({"
    ],
    [
      "      message: `Accounting period ${closed.name} closed`,\n      metadata: {",
      "      message: `Accounting period ${closed.name} closed`,\n      metadata: {\n        closeRunId: assurance.id,"
    ]
  ],
  "services/accounting/__tests__/periods.service.test.ts": [
    [
      "  $queryRaw: jest.fn(),",
      "  $queryRaw: jest.fn(),\n  closeRun: { findFirst: jest.fn() },"
    ],
    [
      "    mockTx.reconciliationRun.count.mockResolvedValue(0)",
      "    mockTx.reconciliationRun.count.mockResolvedValue(0)\n    mockTx.closeRun.findFirst.mockResolvedValue({\n      id: \"close-run-1\", status: \"READY\", completedAt: new Date(\"2026-06-30T12:00:00Z\"),\n      metadata: {}, criticalBlockerCount: 0, highBlockerCount: 0, findings: [], checklistItems: [],\n    })"
    ],
    [
      "  it(\"rechecks period state after acquiring the posting lock\",",
      "  it.each([\n    [\"missing\", null],\n    [\"blocked\", { status: \"BLOCKED\" }],\n    [\"unfinished\", { completedAt: null }],\n    [\"stale\", { metadata: { staleState: { status: \"EVIDENCE_STALE\" } } }],\n    [\"critical aggregate\", { criticalBlockerCount: 1 }],\n    [\"high aggregate\", { highBlockerCount: 1 }],\n    [\"open inventory finding\", { findings: [{ id: \"inventory-mismatch\" }] }],\n    [\"unavailable source checklist\", { checklistItems: [{ id: \"payroll-unavailable\" }] }],\n  ])(\"rejects close with %s assurance even when ledger preflight is clean\", async (_label, override) => {\n    mockTx.journalEntry.count.mockResolvedValue(0)\n    mockTx.closeRun.findFirst.mockResolvedValue(override === null ? null : {\n      id: \"close-run-1\", status: \"READY\", completedAt: new Date(\"2026-06-30T12:00:00Z\"),\n      metadata: {}, criticalBlockerCount: 0, highBlockerCount: 0, findings: [], checklistItems: [], ...override,\n    })\n    await expect(closeAccountingPeriod(\"org-1\", \"period-1\", \"user-1\", {\n      actorPermissions: [\"accounting.period.close\"], lastAuthAt: Date.now(),\n    })).rejects.toThrow(/current close assurance assessment/)\n    expect(mockTx.accountingPeriod.update).not.toHaveBeenCalled()\n    expect(mockTx.closeRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({\n      where: { organizationId: \"org-1\", periodId: \"period-1\", voidedAt: null },\n      orderBy: [{ createdAt: \"desc\" }, { id: \"desc\" }],\n    }))\n  })\n\n  it(\"links successful period closure to its current assurance run\", async () => {\n    mockTx.journalEntry.count.mockResolvedValue(0)\n    await closeAccountingPeriod(\"org-1\", \"period-1\", \"user-1\", {\n      actorPermissions: [\"accounting.period.close\"], lastAuthAt: Date.now(),\n    })\n    expect(mockTx.ledgerAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({\n      data: expect.objectContaining({ metadata: expect.objectContaining({ closeRunId: \"close-run-1\" }) }),\n    }))\n  })\n\n  it(\"rechecks period state after acquiring the posting lock\","
    ]
  ]
};
for(const [relative,edits] of Object.entries(changes)){const file=path.join(root,relative);let text=fs.readFileSync(file,"utf8").replaceAll("\r\n","\n");for(const [before,after] of edits){if(text.split(before).length!==2)throw Error("Expected unique anchor in "+relative+": "+before.slice(0,70));text=text.replace(before,after);}const temporary=file+".remediation-tmp";fs.writeFileSync(temporary,text);fs.renameSync(temporary,file);console.log("Updated "+relative);}

