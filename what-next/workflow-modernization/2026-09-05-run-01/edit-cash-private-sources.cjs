const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const files=['services/cash-command/cash-command.service.ts','services/cash-command/cash-command-contracts.ts','services/cash-command/cash-command-visibility.service.ts','services/cash-command/__tests__/cash-command.service.test.ts'];
const before=Object.fromEntries(files.map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')]));
let s=before[files[0]].replaceAll('\r\n','\n');
function replace(from,to){assert.ok(s.includes(from),from.slice(0,120));s=s.replace(from,()=>to);}
replace('  const drawerScope = drawerScopeFromInput(input)',`  const organization = await db.organization.findFirst({
    where: { id: input.organizationId, isActive: true, deletedAt: null },
    select: { name: true, currency: true },
  })
  if (!organization) throw new Error("Organization is unavailable for Cash Command")
  const drawerPermission = hasRbacPermission(input.actorPermissions, "CASH_DRAWER_READ")
  const drawerAllowed = drawerPermission && (await observeModuleAccess({
    organizationId: input.organizationId, userId: input.actorId!, actorPermissions: input.actorPermissions,
    moduleSlug: "cash_drawer", surfaceType: "report", surface: "cash-command.drawer-source",
    accessIntent: "read", mode: "enforce", audit: true, now: input.now,
  })).allowed
  const drawerScope = drawerScopeFromInput(input)`);
replace('    getCashDrawerDashboard({','    drawerAllowed ? getCashDrawerDashboard({');
replace('      ...drawerScope,\n    }),','      ...drawerScope,\n    }) : null,');
replace('    getModuleControlCenterData({','    hasRbacPermission(input.actorPermissions, "MANAGE_SYSTEM_SETTINGS") ? getModuleControlCenterData({');
replace('      now: input.now ?? null,\n    }),\n    loadCashCommandInventoryLoss','      now: input.now ?? null,\n    }) : null,\n    loadCashCommandInventoryLoss');
replace('    organizationName: moduleControl.organizationName,','    organizationName: organization.name,');
replace('    currency: drawerDashboard.organization.currency || "XAF",','    currency: organization.currency,');
replace('    drawerDashboard,\n    actionQueue,','    drawerDashboard,\n    sourceRestrictions: drawerAllowed ? [] : [{ id: "drawer_risk", title: "Drawer risk", reason: drawerPermission ? "module_unavailable" : "permission_denied" }],\n    actionQueue,');
replace('  const drawerState = buildDrawerState(input.drawerDashboard)','  const drawerState = input.drawerDashboard ? buildDrawerState(input.drawerDashboard) : null');
replace('    drawerRiskCard({\n      input,\n      drawerState,\n      drawerAction,\n    }),','    ...(input.drawerDashboard && drawerState ? [drawerRiskCard({\n      input: { ...input, drawerDashboard: input.drawerDashboard },\n      drawerState,\n      drawerAction,\n    })] : []),');
replace('      : drawerState.highRiskAlertCount > 0','      : drawerState && drawerState.highRiskAlertCount > 0');
replace('    moduleControl: {','    sourceRestrictions: input.sourceRestrictions,\n    moduleControl: input.moduleControl ? {');
replace('      unknownRequestedModules: input.moduleControl.unknownRequestedModules,\n    },','      unknownRequestedModules: input.moduleControl.unknownRequestedModules,\n    } : null,');
replace('  const summary = input.drawerDashboard.summary','  if (!input.drawerDashboard) return []\n  const summary = input.drawerDashboard.summary');
replace('function drawerRiskCard(input: {\n  input: ComposeCashCommandInput','function drawerRiskCard(input: {\n  input: ComposeCashCommandInput & { drawerDashboard: NonNullable<ComposeCashCommandInput["drawerDashboard"]> }');
// Consumers can only create a drawer change/risk/trust row when a source was read.
for(const fn of ['buildChanges','buildRisks','buildTrustSignals']){
 const start=s.indexOf('function '+fn+'('),end=s.indexOf('}):',start);assert.ok(start>0&&end>start);
 s=s.slice(0,start)+s.slice(start,end).replace('drawerState: CashCommandDrawerState','drawerState: CashCommandDrawerState | null')+s.slice(end);
}
replace('    drawer && input.drawerState.alertCount > 0','    drawer && input.drawerState && input.drawerState.alertCount > 0');
replace('    riskFromCard({\n      rank: 2,','    input.drawerState ? riskFromCard({\n      rank: 2,');
replace('      actionLink: input.drawerAction,\n    }),','      actionLink: input.drawerAction,\n    }) : null,');
replace('    {\n      id: "drawer_confidence",','    ...(input.drawerState && input.input.drawerDashboard ? [{\n      id: "drawer_confidence",');
replace('      blockers: drawerBlockers(input.input.drawerDashboard),\n      redactions: [],\n    },','      blockers: drawerBlockers(input.input.drawerDashboard),\n      redactions: [],\n    } satisfies CashCommandTrustSignal] : []),');
replace('drawerState: CashCommandDrawerState): CashCommandSummary','drawerState: CashCommandDrawerState | null): CashCommandSummary');
replace('    drawerVariance: drawerState.liveVariance + drawerState.sessionVariance,','    drawerVariance: drawerState ? drawerState.liveVariance + drawerState.sessionVariance : null,');
replace('    drawerAlertCount: drawerState.alertCount,','    drawerAlertCount: drawerState?.alertCount ?? null,');
replace('function buildDrawerState(drawerDashboard: ComposeCashCommandInput["drawerDashboard"])','function buildDrawerState(drawerDashboard: NonNullable<ComposeCashCommandInput["drawerDashboard"]>)');
replace('function drawerBlockers(drawerDashboard: ComposeCashCommandInput["drawerDashboard"])','function drawerBlockers(drawerDashboard: NonNullable<ComposeCashCommandInput["drawerDashboard"]>)');
replace('${summary.drawerAlertCount} drawer alert(s)','${summary.drawerAlertCount ?? "unavailable"} drawer alert(s)');
replace('  if (summary.drawerAlertCount > 0)', '  if (summary.drawerAlertCount !== null && summary.drawerAlertCount > 0)');
let contracts=before[files[1]].replaceAll('\r\n','\n');
contracts=contracts.replace('  drawerVariance: number\n  drawerAlertCount: number','  drawerVariance: number | null\n  drawerAlertCount: number | null');
contracts=contracts.replace('  drawerState: CashCommandDrawerState\n','  drawerState: CashCommandDrawerState | null\n  sourceRestrictions?: { id: string; title: string; reason: "permission_denied" | "module_unavailable" }[]\n');
contracts=contracts.replace('    "mode" | "hardEnforcementEnabled" | "summary" | "generatedAt" | "unknownRequestedModules"\n  >','    "mode" | "hardEnforcementEnabled" | "summary" | "generatedAt" | "unknownRequestedModules"\n  > | null');
contracts=contracts.replace('  drawerDashboard: CashDrawerDashboardData\n','  drawerDashboard: CashDrawerDashboardData | null\n  sourceRestrictions?: CashCommandData["sourceRestrictions"]\n');
contracts=contracts.replace('  moduleControl: ModuleControlCenterData\n','  moduleControl: ModuleControlCenterData | null\n');
let visibility=before[files[2]].replaceAll('\r\n','\n');
visibility=visibility.replace('  const restrictedCapabilities = data.cards.filter','  const restrictedCapabilities = [...(data.sourceRestrictions ?? []), ...data.cards.filter').replace('  }))\n  const canOpenAction', '  }))]\n  const canOpenAction');
let tests=before[files[3]].replaceAll('\r\n','\n');
tests=tests.replace('  db: {','  db: {\n    organization: { findFirst: jest.fn() },');
tests=tests.replace('    mockGetTenantOperatingSnapshotFromRelated,','    db.organization.findFirst as jest.Mock,\n    mockGetTenantOperatingSnapshotFromRelated,');
tests=tests.replace('    mockAuditRbacDecision.mockResolvedValue(undefined)','    mockAuditRbacDecision.mockResolvedValue(undefined)\n    ;(db.organization.findFirst as jest.Mock).mockResolvedValue({ name: "Owned", currency: "XAF" })');
tests=tests.replace('    expect(mockGetCashDrawerDashboard).toHaveBeenCalledTimes(1)\n    expect(mockGetModuleControlCenterData).toHaveBeenCalledTimes(1)','    expect(mockGetCashDrawerDashboard).not.toHaveBeenCalled()\n    expect(mockGetModuleControlCenterData).not.toHaveBeenCalled()');
const receipt={at:new Date().toISOString(),before:Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(before[file]).digest('hex')]))};
fs.writeFileSync(path.join(__dirname,'evidence/cash-private-source-before.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
for(const [file,body] of [[files[0],s],[files[1],contracts],[files[2],visibility],[files[3],tests]]){const target=path.join(root,file),pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,body,{flag:'wx'});fs.renameSync(pending,target);}
console.log('Scoped cash drawer and module diagnostics reads; preserved unrelated source queries.');
