const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..');
function edit(relative,work){const file=path.join(root,relative),raw=fs.readFileSync(file,'utf8'),out=work(raw.replace(/\r\n/g,'\n')).replace(/\n/g,'\r\n');if(out===raw)throw new Error('No edit '+relative);const id=crypto.randomUUID();fs.writeFileSync(path.join(__dirname,'evidence','cash-visibility-before-'+id+'.txt'),raw,{flag:'wx'});const pending=file+'.pending-'+id;fs.writeFileSync(pending,out,{flag:'wx'});fs.renameSync(pending,file);console.log(relative);}
if(process.argv[2]==='tests'){
 edit('services/cash-command/__tests__/cash-command.service.test.ts',s=>s.replace('  it.each([\n    {\n      label: "missing actor",',`  it("withholds every denied aggregate representation, not just its action link", async () => {
    const result = await getCashCommandData({ organizationId: "org-1", actorId: "actor-1",
      actorRoleCodes: ["administrator"], actorPermissions: ["finance.read"], now: generatedAt })
    expect(result.summary.upcomingPayrollNetPayAmount).toBeNull()
    expect(result.summary.upcomingStatutoryLiabilityAmount).toBeNull()
    expect(result.summary.payrollForecastTotalAmount).toBeNull()
    expect(result.summary.openSuspenseCount).toBeNull()
    expect(result.summary.activeEmployeeBalanceCaseCount).toBeNull()
    expect(result.summary.cashCollected).toBe(180000)
    expect(result.cards.map(card => card.id)).toEqual(["cash_collected"])
    expect(result.drawerState).toBeNull()
    expect(result.moduleControl).toBeNull()
    const encoded = JSON.stringify(result)
    for (const privateValue of ["350000", "90000", "440000", "tenant-hash", "payment-hash", "inventory-hash", "close-hash", "suspense_items"]) {
      expect(encoded).not.toContain(privateValue)
    }
    expect(result.commandBrief.state).toBe("partial")
  })

  it("keeps payment and declaration payroll permissions separate", async () => {
    const result = await getCashCommandData({ organizationId: "org-1", actorId: "actor-1",
      actorRoleCodes: ["administrator"], actorPermissions: ["dashboard.read", "payroll.payments.reconcile"], now: generatedAt })
    expect(result.summary.upcomingPayrollNetPayAmount).toBe(350000)
    expect(result.summary.upcomingStatutoryLiabilityAmount).toBeNull()
    expect(result.summary.payrollForecastTotalAmount).toBeNull()
    expect(JSON.stringify(result)).not.toContain("90000")
    expect(JSON.stringify(result)).not.toContain("440000")
  })

  it("withholds aggregates when their module read admission is denied", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: false })
    const result = await getCashCommandData({ organizationId: "org-1", actorId: "actor-1",
      actorRoleCodes: ["administrator"], actorPermissions: ["finance.read"], now: generatedAt })
    expect(result.cards).toEqual([])
    expect(result.summary.cashCollected).toBeNull()
    expect(result.commandBrief.summary).not.toContain("180000")
    expect(result.commandBrief.state).toBe("partial")
  })

  it.each([
    {
      label: "missing actor",`));
}else if(process.argv[2]==='implementation'){
 edit('services/cash-command/cash-command-contracts.ts',s=>s.replace('export type CashCommandSnapshotBundle = {',`export type AuthorizedCashCommandData = Omit<CashCommandData, "summary" | "drawerState" | "moduleControl" | "actionQueue"> & {
  summary: { [K in keyof CashCommandSummary]: CashCommandSummary[K] | null }
  drawerState: CashCommandDrawerState | null
  moduleControl: CashCommandData["moduleControl"] | null
  actionQueue: { summary: Pick<ActionQueueResult["summary"], "total" | "bySeverity">; filteredOutCount: number }
  restrictedCapabilities?: { id: string; title: string; reason: "permission_denied" | "module_unavailable" }[]
}

export type CashCommandSnapshotBundle = {`));
 edit('services/cash-command/cash-command.service.ts',s=>s.replace('import "server-only"','import "server-only"\nimport { authorizeCashCommandData } from "./cash-command-visibility.service"').replace('  CashCommandActionItem,','  AuthorizedCashCommandData,\n  CashCommandActionItem,').replace('Promise<CashCommandData> {\n  await requireCashCommandTenantAuthority(input)','Promise<AuthorizedCashCommandData> {\n  input = { ...input, now: normalizeNow(input.now).toISOString() }\n  await requireCashCommandTenantAuthority(input)').replace('  return composeCashCommandData({','  const composed = composeCashCommandData({').replace('    proofSubjectUnavailableReasons: proofDiscovery.unavailableReasons,\n  })','    proofSubjectUnavailableReasons: proofDiscovery.unavailableReasons,\n  })\n  return authorizeCashCommandData(composed, {\n    actorId: input.actorId!.trim(), actorPermissions: input.actorPermissions, now: input.now!,\n  })'));
 edit('components/cash-command/CashCommandDashboard.tsx',s=>{
  s=s.replace('  CashCommandData,','  AuthorizedCashCommandData,').replace('  data: CashCommandData','  data: AuthorizedCashCommandData');
  s=s.replace('                <Badge className={cn("border", dashboardToneClass("brand"))}>{t.rbac}</Badge>\n','').replace('                <Badge className={cn("border", dashboardToneClass("gold"))}>{t.redaction}</Badge>\n','');
  s=s.replace('        <BICommandBriefHeader',`        {(data.restrictedCapabilities?.length ?? 0) > 0 ? (
          <p role="status" className={cn(dashboardPanelClass, "p-4 text-sm text-[var(--dash-text)]")}>
            {locale === "fr" ? "Certains indicateurs ne sont pas accessibles avec vos autorisations ou modules actuels. Une valeur indisponible ne signifie pas un solde nul." : "Some indicators are unavailable with your current permissions or modules. An unavailable value does not mean a zero balance."}
          </p>
        ) : null}
        <BICommandBriefHeader`);
  s=s.replace('        <section className="grid gap-4 xl:grid-cols-2">\n          <section','        <section className="grid gap-4 xl:grid-cols-2">\n          {data.drawerState ? <section');
  s=s.replace('          <section className={cn(dashboardPanelClass, "p-4")}>\n            <div className="flex items-start justify-between gap-3">\n              <div>\n                <h2 className="text-base font-semibold text-[var(--dash-text)]">{t.moduleState}', '          {data.moduleControl ? <section className={cn(dashboardPanelClass, "p-4")}>\n            <div className="flex items-start justify-between gap-3">\n              <div>\n                <h2 className="text-base font-semibold text-[var(--dash-text)]">{t.moduleState}');
  s=s.replace('          </section>\n\n          {data.moduleControl', '          </section> : null}\n\n          {data.moduleControl');
  s=s.replace('          </section>\n        </section>\n      </div>\n    </main>', '          </section> : null}\n        </section>\n      </div>\n    </main>');
  return s;
 });
 edit('services/cash-command/__tests__/cash-command.service.test.ts',s=>{
  s=s.replace('expect(mockObserveModuleAccess).toHaveBeenCalledTimes(3)','expect(mockObserveModuleAccess.mock.calls.filter(([args]) => args.surface === "cash-command.proof-discovery")).toHaveLength(3)');
  s=s.replace('mockObserveModuleAccess.mockImplementation(() => {\n      admissionStarted()', 'mockObserveModuleAccess.mockImplementation(({ surface }) => {\n      if (surface !== "cash-command.proof-discovery") return Promise.resolve({ allowed: true })\n      admissionStarted()');
  s=s.replace('expect(mockObserveModuleAccess).not.toHaveBeenCalled()','expect(mockObserveModuleAccess).toHaveBeenCalledTimes(actorPermissions.includes("finance.read") ? 1 : 0)');
  s=s.replace('expect(mockObserveModuleAccess).toHaveBeenCalledTimes(1)','expect(mockObserveModuleAccess.mock.calls.filter(([args]) => args.surface === "cash-command.inventory-loss")).toHaveLength(1)');
  return s;
 });
}else throw new Error('Use tests or implementation');
