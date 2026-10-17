const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const root=path.resolve(__dirname,'../../..');
function edit(relative,work){const file=path.join(root,relative),raw=fs.readFileSync(file,'utf8'),out=work(raw.replace(/\r\n/g,'\n')).replace(/\n/g,'\r\n');if(out===raw)throw new Error('No edit '+relative);const pending=file+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,out,{flag:'wx'});fs.renameSync(pending,file);console.log(relative);}
edit('services/cash-command/__tests__/cash-command.service.test.ts',s=>s.replaceAll('expect(mockObserveModuleAccess).toHaveBeenCalledTimes(1)', 'expect(mockObserveModuleAccess.mock.calls.filter(([args]) => args.surface === "cash-command.inventory-loss")).toHaveLength(1)').replace('  it.each([\n    {\n      label: "missing actor",',`  it("does not let changes in denied sources alter the disclosed response", async () => {
    const input = { organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], actorPermissions: ["finance.read"], now: generatedAt }
    const before = await getCashCommandData(input)
    const hidden = tenantSnapshot({ activeEmployeeBalanceCaseCount: 98765, employeeBalanceOutstandingAmount: 778899,
      payrollFinanceForecast: payrollForecastMetrics({ upcomingNetPayAmount: 1234567, upcomingStatutoryLiabilityAmount: 7654321, totalUpcomingAmount: 8888888,
        nextPayDate: "2099-01-01", nextDeclarationDueDate: "2099-02-01", message: "PRIVATE FORECAST MESSAGE" }) })
    hidden.sourceHash = "PRIVATE SOURCE HASH"
    hidden.status = "blocked"
    hidden.evidenceGrade = "blocked"
    hidden.freshness = freshness({ sourceMaxUpdatedAt: "2099-01-01", stale: true, staleReason: "PRIVATE TIMING" })
    hidden.blockers = [{ id: "private-blocker", gate: "payroll_finance_forecast", severity: "critical", title: "PRIVATE TITLE", detail: "PRIVATE DETAIL", sourceTables: ["private_table"] }]
    mockGetTenantOperatingSnapshot.mockResolvedValue(hidden)
    mockGetPaymentTruthSnapshot.mockResolvedValue(paymentSnapshot({ openSuspenseAmount: 332211, openSuspenseCount: 93, pendingTransactionCount: 44 }))
    mockGetInventoryCashSnapshot.mockResolvedValue(inventorySnapshot({ inventoryValue: 554433 }))
    const queue = actionQueue(); queue.summary.total = 54321; queue.filteredOutCount = 87654
    mockBuildActionQueue.mockReturnValue(queue)
    expect(await getCashCommandData(input)).toEqual(before)
  })

  it("preserves explicitly permitted full-domain values and source evidence", async () => {
    const result = await getCashCommandData({ organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], now: generatedAt,
      actorPermissions: ["finance.read", "payments.reconciliation.read", "CASH_DRAWER_READ", "inventory.read", "payroll.payments.reconcile", "payroll.declarations.manage", "accounting.close.read", "accounting.journal.read", "MANAGE_SYSTEM_SETTINGS"] })
    expect(result.summary.upcomingPayrollNetPayAmount).toBe(350000)
    expect(result.summary.upcomingStatutoryLiabilityAmount).toBe(90000)
    expect(result.summary.payrollForecastTotalAmount).toBe(440000)
    expect(result.cards).toHaveLength(9)
    expect(result.cards.find(card => card.id === "cash_collected")?.provenance.sourceHash).toBe("tenant-hash")
    expect(result.drawerState).not.toBeNull()
    expect(result.moduleControl).not.toBeNull()
  })

  it("re-evaluates domain permissions after a previously allowed response", async () => {
    const input = { organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], now: generatedAt }
    expect((await getCashCommandData({ ...input, actorPermissions: ["finance.read", "payroll.payments.reconcile"] })).summary.upcomingPayrollNetPayAmount).toBe(350000)
    const denied = await getCashCommandData({ ...input, actorPermissions: ["finance.read"] })
    expect(denied.summary.upcomingPayrollNetPayAmount).toBeNull()
    expect(JSON.stringify(denied)).not.toContain("350000")
  })

  it.each([
    {
      label: "missing actor",`));
edit('components/cash-command/__tests__/CashCommandDashboard.test.tsx',s=>s.replace('describe("CashCommandDashboard", () => {',`describe("CashCommandDashboard", () => {
  it.each(["en", "fr"] as const)("explains unavailable data in %s without rendering denied drawer or module values", locale => {
    const data = { ...buildData(), drawerState: null, moduleControl: null,
      restrictedCapabilities: [{ id: "drawer_risk", title: "Drawer risk", reason: "permission_denied" as const }] }
    render(<CashCommandDashboard data={data} locale={locale} title="Cash Command" subtitle="Read-only" />)
    expect(screen.getByRole("status")).toHaveTextContent(locale === "fr" ? "Une valeur indisponible ne signifie pas un solde nul" : "An unavailable value does not mean a zero balance")
    expect(screen.queryByText("Live variance")).not.toBeInTheDocument()
    expect(screen.queryByText("Entitled")).not.toBeInTheDocument()
    expect(screen.queryByText("RBAC filtered")).not.toBeInTheDocument()
    expect(screen.queryByText("Redaction-safe")).not.toBeInTheDocument()
  })
`));
