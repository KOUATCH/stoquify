const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  buildLedgerCloseTruthReadiness,
  gateResultForReport,
} = require("../ledger-close-truth-gate")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ledger-close-truth-gate-"))
}

function write(root, relativePath, source) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, source, "utf8")
}

function writeReadyFixture(root) {
  write(root, "services/accounting/journal-close-invalidation.service.ts", [
    "recordPostedJournalCloseInvalidationInTx",
    'sourceCode: "LEDGER_JOURNAL_POSTED"',
    "newEvidenceHash: input.journalEntryId",
    "recordReversedJournalCloseInvalidationsInTx",
    'sourceCode: "LEDGER_JOURNAL_REVERSED"',
    "new Set([input.originalPeriodId, input.reversalPeriodId])",
    "originalPeriodId reversalPeriodId",
  ].join("\n"))
  write(root, "services/accounting/posting.service.ts", [
    "await linkAccountingSource(",
    "await postingAudit(tx,",
    "await recordPostedJournalCloseInvalidationInTx(",
    "originalPeriodId: original.periodId",
    "reversalPeriodId: period.id",
    "await recordReversedJournalCloseInvalidationsInTx(",
    "correlationId: postedBatch.id",
  ].join("\n"))
  for (const [file, audit] of [
    ["post-sale.ts", "salePostingAudit"],
    ["post-payment.ts", "paymentPostingAudit"],
    ["pos-reversal-helpers.ts", "reversalPostingAudit"],
  ]) {
    write(root, "services/accounting/postings/" + file, [
      "await createAccountingSourceLink(",
      "await " + audit + "(tx,",
      "await recordPostedJournalCloseInvalidationInTx(",
      "periodId: period.id",
      "entryDate",
      "correlationId: postedBatch.id",
    ].join("\n"))
  }
}

describe("ledger close truth gate", () => {
  it("passes complete manual and POS close-invalidation coverage", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)

    const report = buildLedgerCloseTruthReadiness(root, { mode: "fail" })

    expect(report.summary).toMatchObject({ status: "ready", readyCount: 10, blockerCount: 0 })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("blocks when POS payment loses its close-invalidation seam", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(root, "services/accounting/postings/post-payment.ts", [
      "await createAccountingSourceLink(",
      "await paymentPostingAudit(tx,",
      "periodId: period.id",
      "entryDate",
      "correlationId: postedBatch.id",
    ].join("\n"))

    const report = buildLedgerCloseTruthReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain("pos_payment_invalidation")
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks when reversal targeting loses same-period deduplication", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(root, "services/accounting/journal-close-invalidation.service.ts", [
      "recordPostedJournalCloseInvalidationInTx",
      'sourceCode: "LEDGER_JOURNAL_POSTED"',
      "newEvidenceHash: input.journalEntryId",
      "recordReversedJournalCloseInvalidationsInTx",
      'sourceCode: "LEDGER_JOURNAL_REVERSED"',
      "originalPeriodId reversalPeriodId",
    ].join("\n"))

    const report = buildLedgerCloseTruthReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain("same_period_reversal_deduplication")
  })
})
