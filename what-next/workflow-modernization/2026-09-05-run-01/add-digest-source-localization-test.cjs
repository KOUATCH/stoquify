const fs = require('node:fs');
const file = 'services/daily-habit/__tests__/daily-habit-digest.service.test.ts';
const addition = `

it("localizes payroll limitations across every Digest representation without altering source evidence", () => {
  const source = { ...tenantOperating, status: "blocked" as const, uiState: "blocked" as const, metrics: { ...tenantMetrics, activeEmployeeBalanceCaseCount: 1, employeeBalanceOutstandingAmount: 983421.78 }, blockers: [{ id: "tenant-payroll-employee-balance-open", gate: "payroll_employee_balance", severity: "high" as const, title: "Employee balance recovery cases are open", detail: "1 active employee balance case(s) have 983421.78 outstanding.", sourceTables: ["payroll_employee_balance_cases"], nextAction: "Open payroll payments and settle, refund, or review employee balance recovery cases." }] }
  const before = JSON.stringify(source)
  const input = { organizationId: "org-1", organizationName: "Owned", actorPermissions: ["dashboard.read", "finance.read", "payroll.command.read", "payments.reconciliation.read"], actorRoleCodes: ["owner"], payrollModuleAccess: true, currency: "XAF", tenantOperating: source, paymentTruth, inventoryCash, closeReadiness, now: generatedAt }
  const english = composeDailyHabitDigestData({ ...input, locale: "en" })
  const french = composeDailyHabitDigestData({ ...input, locale: "fr" })
  const serialized = JSON.stringify(french)
  expect(serialized).not.toContain("Employee balance recovery cases are open")
  expect(serialized).not.toContain("active employee balance case(s)")
  expect(serialized).toContain("1 dossier(s) actif(s) de soldes salariés présentent un montant restant de 983421.78.")
  expect(french.digests.map(digest => ({ id: digest.id, state: digest.commandBrief.state, evidence: digest.commandBrief.evidenceGrade, provenance: digest.commandBrief.provenance, metric: digest.zones[0].primaryMetric?.value }))).toEqual(english.digests.map(digest => ({ id: digest.id, state: digest.commandBrief.state, evidence: digest.commandBrief.evidenceGrade, provenance: digest.commandBrief.provenance, metric: digest.zones[0].primaryMetric?.value })))
  expect(JSON.stringify(source)).toBe(before)
})
`;
const original = fs.readFileSync(file, 'utf8');
if (original.includes('localizes payroll limitations across every Digest')) throw new Error('Test already exists');
const text = original + addition;
const fd = fs.openSync(file, 'r+'); try { fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); } finally { fs.closeSync(fd); }
