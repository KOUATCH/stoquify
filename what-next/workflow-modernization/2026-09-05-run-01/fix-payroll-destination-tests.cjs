const fs = require('node:fs');
function update(file, transform) {
  const original = fs.readFileSync(file, 'utf8');
  const text = transform(original);
  if (text === original) throw new Error('No intended change: ' + file);
  const fd = fs.openSync(file, 'r+');
  try { fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); } finally { fs.closeSync(fd); }
}
update('services/signals/__tests__/business-signal-rules.service.test.ts', text => text.replaceAll('requiredPermission: "payroll.payments.reconcile",', 'requiredPermission: "payments.reconciliation.read",\n      additionalRequiredPermissions: ["payroll.command.read"],'));
update('services/daily-habit/__tests__/daily-habit-digest.service.test.ts', text => text + `

it.each(["en", "fr"] as const)("shows employee balance handoffs only to permitted owner and finance audiences (%s)", locale => {
  const source = snapshot("tenant.operating", { ...tenantMetrics, activeEmployeeBalanceCaseCount: 1, openEmployeeBalanceCaseCount: 1, employeeBalanceOutstandingAmount: 983421.78 })
  const input = { organizationId: "org-1", organizationName: "Owned", actorPermissions: ["dashboard.read", "finance.read", "inventory.read", "payroll.command.read", "payments.reconciliation.read"], actorRoleCodes: ["owner"], payrollModuleAccess: true, currency: "XAF", locale, tenantOperating: source, paymentTruth, inventoryCash, closeReadiness, now: generatedAt }
  const result = composeDailyHabitDigestData(input)
  for (const id of ["owner-morning", "finance-cash"]) {
    const digest = result.digests.find(item => item.id === id)!
    expect(digest.actions).toEqual(expect.arrayContaining([expect.objectContaining({ href: \`/\${locale}/dashboard/payroll/payments\`, requiredPermission: "payments.reconciliation.read", additionalRequiredPermissions: ["payroll.command.read"], disabled: false })]))
    expect(digest.actions.some(action => action.label === (locale === "fr" ? "Exposition liée à la paie" : "Payroll Exposure"))).toBe(true)
  }
  expect(result.digests.find(item => item.id === "stockkeeper-stock")!.actions).toEqual([])
  for (const permission of ["payroll.command.read", "payments.reconciliation.read"]) {
    const denied = composeDailyHabitDigestData({ ...input, actorPermissions: input.actorPermissions.filter(value => value !== permission) })
    expect(denied.digests.flatMap(digest => digest.actions).some(action => action.href.includes("/payroll/"))).toBe(false)
  }
  const moduleDenied = composeDailyHabitDigestData({ ...input, payrollModuleAccess: false })
  expect(moduleDenied.digests.flatMap(digest => digest.actions).some(action => action.href.includes("/payroll/"))).toBe(false)
})
`);
console.log('Updated payroll read-contract expectations and audience/access regression cases.');
