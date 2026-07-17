const fs = require("fs")
const os = require("os")
const path = require("path")

const { buildReportTrustExportReadiness, gateResultForReport } = require("../report-trust-export-gate")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "report-trust-export-gate-"))
}

function write(root, relativePath, source) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, source, "utf8")
}

function writeReadyFixture(root) {
  write(root, "services/accounting/reports.service.ts", 'await Promise.all getTrialBalance({ getGeneralLedger({ data: report schemaVersion: "accounting-report-export.v1" sourceTables: rowCount, filtersHash, currency, db.accountingPeriod.findFirst id: input.periodId, organizationId: input.organizationId periodStatus: period?.status balanceStatus redactionStatus: "NO_CONTACT_OR_AUTHENTICATION_FIELDS_INCLUDED" status: "INTERNAL_ACCOUNTING_REPORT_ONLY" Not a certified OHADA statutory filing function hashContent const contentHash = hashContent(payload) contentHash, certificationStatus: provenance.certification.status')
  write(root, "actions/accounting/reports.actions.ts", 'permission: "accounting.exports.create" freshAuth: { maxAgeSeconds: 300 } organizationId: ctx.orgId')
  write(root, "services/analytics/financial-reports.service.ts", 'currency: string getReportCurrency currency: input.currency select: { currency: true }')
  write(root, "components/reports/report-trust-banner.tsx", 'Currency: {provenance.currency} provenance.sourceTables provenance.knownBlockers')
  write(root, "components/reports/financial-summary-report.tsx", "currency: report.provenance.currency")
  write(root, "components/reports/cash-flow-report.tsx", "currency: report.provenance.currency")
  write(root, "components/reports/cashier-performance-report.tsx", "currency: provenance!.currency")
  write(root, "components/reports/item-performance-report.tsx", "currency: provenance!.currency")
  write(root, "package.json", '{"scripts":{"report:trust:export:gate":"node gate","policy:gates":"npm run report:trust:export:gate"}}')
}

describe("report trust and export certification gate", () => {
  it("passes when report trust is service-owned and explicit", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const report = buildReportTrustExportReadiness(root, { mode: "fail" })
    expect(report.summary).toMatchObject({ status: "ready", readyCount: 9, blockerCount: 0 })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("blocks a hardcoded USD report formatter", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(root, "components/reports/item-performance-report.tsx", 'currency: "USD"')
    const report = buildReportTrustExportReadiness(root, { mode: "fail" })
    expect(report.blockers).toContain("report_ui_has_no_hardcoded_usd")
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks when the accounting export loses its content hash", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(root, "services/accounting/reports.service.ts", "await Promise.all getTrialBalance({ getGeneralLedger({ data: report")
    const report = buildReportTrustExportReadiness(root, { mode: "fail" })
    expect(report.blockers).toContain("tamper_evident_content_and_audit")
  })
})
