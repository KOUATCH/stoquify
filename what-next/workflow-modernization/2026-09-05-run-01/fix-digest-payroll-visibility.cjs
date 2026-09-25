const fs = require('node:fs');
const file = 'services/daily-habit/daily-habit-digest.service.ts';
let text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const replace = (before, after) => { if (!text.includes(before)) throw new Error('Expected source missing: ' + before); text = text.replace(before, after); };
replace('import "server-only"', 'import "server-only"\nimport { restrictPayrollSnapshotDetails } from "./daily-habit-source-visibility"');
replace('  organizationName: string | null\n', '  organizationName: string | null\n  payrollModuleAccess?: boolean\n');
replace('organization, paymentTruth, inventoryCash, closeReadiness, inventoryLoss]', 'organization, paymentTruth, inventoryCash, closeReadiness, inventoryLoss, payrollModuleAccess]');
replace('    loadDailyHabitInventoryLoss(input),', '    loadDailyHabitInventoryLoss(input),\n    loadDailyHabitPayrollAccess(input),');
replace('    organizationName: organization.name,', '    organizationName: organization.name,\n    payrollModuleAccess,');
replace('  const generatedAt = input.tenantOperating.generatedAt', `  const payrollDetailsAllowed = input.payrollModuleAccess === true && hasRbacPermission(input.actorPermissions, "payroll.command.read")
  const scoped = <T,>(source: SnapshotResult<T>) => restrictPayrollSnapshotDetails(source, payrollDetailsAllowed, input.locale ?? "en")
  input = { ...input, tenantOperating: scoped(input.tenantOperating), paymentTruth: scoped(input.paymentTruth), inventoryCash: scoped(input.inventoryCash), closeReadiness: scoped(input.closeReadiness), inventoryLoss: input.inventoryLoss ? scoped(input.inventoryLoss) : input.inventoryLoss }
  const generatedAt = input.tenantOperating.generatedAt`);
replace('    now: input.now ?? generatedAt,\n  })\n  const actionQueue', '    now: input.now ?? generatedAt,\n  }).filter(signal => signal.sourceModule !== "payroll" || payrollDetailsAllowed)\n  const actionQueue');
replace('async function loadDailyHabitInventoryLoss(', `async function loadDailyHabitPayrollAccess(input: DailyHabitDigestInput): Promise<boolean> {
  const actorId = input.actorId?.trim()
  if (!actorId || !hasRbacPermission(input.actorPermissions, "payroll.command.read")) return false
  const access = await observeModuleAccess({
    organizationId: input.organizationId, userId: actorId, actorPermissions: input.actorPermissions,
    moduleSlug: "payroll", surfaceType: "report", surface: "daily-habit-digest.payroll-source",
    accessIntent: "read", mode: "enforce", audit: true, now: input.now ?? null,
  })
  return access.allowed
}

async function loadDailyHabitInventoryLoss(`);
const fd = fs.openSync(file, 'r+');
try { fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); } finally { fs.closeSync(fd); }
console.log('Applied payroll source-detail permission and module gate before Digest serialization.');
