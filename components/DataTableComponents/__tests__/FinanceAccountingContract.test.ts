import {
  FINANCE_ASYNC_EXPORT_THRESHOLD,
  buildFinanceStatementExportManifest,
  createFinanceStatementContext,
  financePaymentsLedgerTableContract,
  financeStatementBehaviorByTableId,
  financeStatementTableContracts,
  accountingDraftJournalEntriesTableContract,
  accountingPostedJournalEntriesTableContract,
  financeStatementExportJobReceiptSchema,
} from "../finance-accounting-contracts"
import { createCanonicalTableQuery, createCanonicalTableSelection } from "../table-system-contract"

describe("finance accounting table contract", () => {
  const context = createFinanceStatementContext({
    entityId: "org-1",
    entityName: "Demo OHADA SMB",
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-30T23:59:59.999Z",
    currency: "XAF",
    sourceReadModel: "finance-dashboard.recent-payments",
    evidenceRoute: "/dashboard/finance/payments",
  })

  it("declares finance access, frozen identity columns, numeric alignment, and server-finalized export", () => {
    expect(financePaymentsLedgerTableContract.access).toMatchObject({
      readPermission: "finance.payments.read",
      requiredModule: "finance",
      tenantScoped: true,
    })
    expect(financeLedgerContractColumn("paymentNumber")).toMatchObject({ frozen: "start", hideable: false })
    expect(financeLedgerContractColumn("counterparty")).toMatchObject({ frozen: "start" })
    expect(financeLedgerContractColumn("amount")).toMatchObject({ alignment: "right" })
    expect(financePaymentsLedgerTableContract.export.serverFinalized).toBe(true)
  })

  it("selects inline or asynchronous export mode from the server-owned match count", () => {
    const query = createCanonicalTableQuery(financePaymentsLedgerTableContract, { sort: [{ id: "amount", desc: true }] })
    const selection = createCanonicalTableSelection("explicit", query, ["payment-1"])
    const manifest = buildFinanceStatementExportManifest({
      organizationId: "org-1",
      query,
      selection,
      columns: ["paymentNumber", "amount"],
      locale: "fr",
      timeZone: "Africa/Douala",
      format: "xlsx",
      financeContext: context,
      matchingRows: FINANCE_ASYNC_EXPORT_THRESHOLD,
      clientRequestId: "req-1",
    })

    expect(manifest.financeContext.currency).toBe("XAF")
    expect(manifest.exportMode).toBe("async-job")
    expect(manifest.columns).toEqual(["paymentNumber", "amount"])
  })

  it("validates an auditable asynchronous job receipt", () => {
    expect(
      financeStatementExportJobReceiptSchema.parse({
        schemaVersion: 1,
        clientRequestId: "req-1",
        jobId: "job-1",
        status: "accepted",
        acceptedAt: "2026-08-28T10:00:00.000Z",
      }),
    ).toMatchObject({ jobId: "job-1", status: "accepted" })
  })

  it("keeps every X1 statement archetype tenant-scoped, export-safe, and behavior-bound", () => {
    expect(financeStatementTableContracts.map((contract) => contract.id)).toEqual([
      "finance.receivables",
      "finance.receivables-history",
      "finance.payables",
      "finance.payables-history",
      "finance.cash-history",
      "accounting.journal-entries-posted",
      "accounting.journal-entries-drafts",
      "accounting.trial-balance",
      "accounting.profit-loss",
      "accounting.balance-sheet",
      "finance.cash-flow",
      "accounting.close-evidence",
      "accounting.close-findings",
    ])
    financeStatementTableContracts.forEach((contract) => {
      const behavior = financeStatementBehaviorByTableId[contract.id]
      expect(behavior).toMatchObject({
        requiresPeriodEntityContext: true,
        drillToEvidence: true,
      })
      expect(contract.access.tenantScoped).toBe(true)
      expect(contract.export.serverFinalized).toBe(true)
      expect(behavior.frozenIdentityColumnIds.every((id) => contract.columns.allowed.some((column) => column.id === id))).toBe(true)
      expect(behavior.numericColumnIds.every((id) => contract.columns.allowed.some((column) => column.id === id))).toBe(true)
    })
  })

  it("separates editable journal drafts from posted journal evidence", () => {
    expect(accountingDraftJournalEntriesTableContract.id).not.toBe(accountingPostedJournalEntriesTableContract.id)
    expect(financeStatementBehaviorByTableId[accountingDraftJournalEntriesTableContract.id]).toMatchObject({ editableDraft: true, postedEvidenceReadOnly: false })
    expect(financeStatementBehaviorByTableId[accountingPostedJournalEntriesTableContract.id]).toMatchObject({ editableDraft: false, postedEvidenceReadOnly: true })
    expect(accountingDraftJournalEntriesTableContract.actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "post-draft", requiredPermission: "accounting.journal.post", requiresFreshAuth: true })]),
    )
    expect(accountingPostedJournalEntriesTableContract.actions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "edit-draft" })]),
    )
    expect(accountingPostedJournalEntriesTableContract.actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "reverse-posted", requiredPermission: "accounting.journal.reverse", requiresFreshAuth: true })]),
    )
  })
})

function financeLedgerContractColumn(id: string) {
  return financePaymentsLedgerTableContract.columns.allowed.find((column) => column.id === id)
}
