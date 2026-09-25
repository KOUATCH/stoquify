const fs = require('node:fs');
const file = 'services/signals/__tests__/business-signal-rules.service.test.ts';
const original = fs.readFileSync(file, 'utf8');
const addition = `

it.each([
  ["PAYROLL_FORECAST_DECLARATION_EVIDENCE_MISSING", "/dashboard/payroll/declarations", "payroll.command.read"],
  ["PAYROLL_FORECAST_PAYMENT_EVIDENCE_MISSING", "/dashboard/payroll/payments", "payments.reconciliation.read"],
  ["PAYROLL_FORECAST_PROVIDER_EVIDENCE_MISSING", "/dashboard/payroll/payments", "payments.reconciliation.read"],
  ["PAYROLL_FORECAST_REGISTER_EVIDENCE_MISSING", "/dashboard/payroll/register", "payroll.reports.read"],
])("links %s to the current destination read contract", (code, actionPath, requiredPermission) => {
  const source = tenantOperatingSnapshot({ approvedOrPaidPayrollRunCount: 0, payrollFinanceForecast: payrollForecastMetrics({ authoritative: false, blockerCodes: [code] }) })
  const signal = buildBusinessSignalsFromSnapshots({ organizationId: "org-1", snapshots: [source], now: source.generatedAt }).find(item => item.subjectType === "payroll.forecast")!
  expect(signal).toMatchObject({ actionPath, requiredPermission, additionalRequiredPermissions: ["payroll.command.read"] })
  const { payrollRouteByRoute } = require("@/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access")
  expect(payrollRouteByRoute[actionPath].permissions).toContain(requiredPermission)
})
`;
const text = original + addition;
const fd = fs.openSync(file, 'r+'); try { fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); } finally { fs.closeSync(fd); }
