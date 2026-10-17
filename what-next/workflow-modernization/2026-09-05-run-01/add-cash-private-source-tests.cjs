const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const target=path.resolve(__dirname,'../../../services/cash-command/__tests__/cash-command.service.test.ts');let s=fs.readFileSync(target,'utf8');
const marker='  it("uses one resolved source set for both the aggregate and visible cash indicators",';assert.ok(s.includes(marker));
const added=`  it.each([
    { name: "missing permission", permissions: ["finance.read"], moduleAllowed: true, expectedRead: false },
    { name: "suspended module", permissions: ["finance.read", "CASH_DRAWER_READ"], moduleAllowed: false, expectedRead: false },
    { name: "current read permission", permissions: ["finance.read", "CASH_DRAWER_READ"], moduleAllowed: true, expectedRead: true },
  ])("admits drawer queries before reading: $name", async ({ permissions, moduleAllowed, expectedRead }) => {
    mockObserveModuleAccess.mockImplementation(async ({ moduleSlug }) => ({ allowed: moduleSlug !== "cash_drawer" || moduleAllowed, readOnly: true }))
    const result = await getCashCommandData({ organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["admin"], actorPermissions: permissions, now: generatedAt })
    expect(mockGetCashDrawerDashboard).toHaveBeenCalledTimes(expectedRead ? 1 : 0)
    expect(mockGetModuleControlCenterData).not.toHaveBeenCalled()
    expect(db.organization.findFirst).toHaveBeenCalledWith({ where: { id: "org-1", isActive: true, deletedAt: null }, select: { name: true, currency: true } })
    if (permissions.includes("CASH_DRAWER_READ")) {
      const gateIndex = mockObserveModuleAccess.mock.calls.findIndex(([args]) => args.surface === "cash-command.drawer-source")
      expect(gateIndex).toBeGreaterThanOrEqual(0)
      expect(mockObserveModuleAccess.mock.calls[gateIndex][0]).toMatchObject({ organizationId: "org-1", userId: "actor-1", accessIntent: "read", mode: "enforce", audit: true })
      if (expectedRead) expect(mockObserveModuleAccess.mock.invocationCallOrder[gateIndex]).toBeLessThan(mockGetCashDrawerDashboard.mock.invocationCallOrder[0])
    }
    if (!expectedRead) {
      expect(result.drawerState).toBeNull()
      expect(result.summary.drawerVariance).toBeNull()
      expect(result.summary.drawerAlertCount).toBeNull()
      expect(result.cards.some(card => card.id === "drawer_risk")).toBe(false)
      expect(result.trustSignals.some(signal => signal.id === "drawer_confidence")).toBe(false)
      expect(result.restrictedCapabilities).toContainEqual({ id: "drawer_risk", title: "Drawer risk", reason: permissions.includes("CASH_DRAWER_READ") ? "module_unavailable" : "permission_denied" })
    } else expect(result.drawerState?.drawerCount).toBe(drawerDashboard().summary.drawerCount)
  })

  it("does not query any sources for an unavailable organization", async () => {
    ;(db.organization.findFirst as jest.Mock).mockResolvedValueOnce(null)
    await expect(getCashCommandData({ organizationId: "missing-org", actorId: "actor-1", actorRoleCodes: ["admin"], actorPermissions: ["finance.read", "CASH_DRAWER_READ", "MANAGE_SYSTEM_SETTINGS"] })).rejects.toThrow("Organization is unavailable")
    for (const query of sourceMocks().filter(query => query !== db.organization.findFirst)) expect(query).not.toHaveBeenCalled()
  })

  it("keeps a failed drawer or module gate as a failure and retries with fresh admission", async () => {
    const input = { organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["admin"], actorPermissions: ["finance.read", "CASH_DRAWER_READ"], now: generatedAt }
    mockObserveModuleAccess.mockRejectedValueOnce(new Error("module unavailable"))
    await expect(getCashCommandData(input)).rejects.toThrow("module unavailable")
    expect(mockGetCashDrawerDashboard).not.toHaveBeenCalled()
    mockGetCashDrawerDashboard.mockRejectedValueOnce(new Error("drawer source unavailable"))
    await expect(getCashCommandData(input)).rejects.toThrow("drawer source unavailable")
    await expect(getCashCommandData(input)).resolves.toMatchObject({ drawerState: { drawerCount: drawerDashboard().summary.drawerCount } })
    mockGetCashDrawerDashboard.mockClear()
    mockObserveModuleAccess.mockResolvedValue({ allowed: false })
    expect((await getCashCommandData(input)).drawerState).toBeNull()
    expect(mockGetCashDrawerDashboard).not.toHaveBeenCalled()
  })

  it("only queries module diagnostics with the settings permission and never converts their failure to success", async () => {
    const input = { organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["admin"], actorPermissions: ["finance.read", "MANAGE_SYSTEM_SETTINGS"], now: generatedAt }
    const allowed = await getCashCommandData(input)
    expect(mockGetModuleControlCenterData).toHaveBeenCalledTimes(1)
    expect(allowed.moduleControl).toMatchObject({ summary: moduleControl().summary })
    mockGetModuleControlCenterData.mockRejectedValueOnce(new Error("diagnostics unavailable"))
    await expect(getCashCommandData(input)).rejects.toThrow("diagnostics unavailable")
    mockGetModuleControlCenterData.mockClear()
    expect((await getCashCommandData({ ...input, actorPermissions: ["finance.read"] })).moduleControl).toBeNull()
    expect(mockGetModuleControlCenterData).not.toHaveBeenCalled()
  })

`;
s=s.replace(marker,()=>added+marker);const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,s,{flag:'wx'});fs.renameSync(pending,target);
// Extend the existing inspected runner to bind and lint the complete changed boundary.
const source=fs.readFileSync(path.join(__dirname,'run-cash-related-checks.cjs'),'utf8').replace("const changed=tests.slice(0,1).concat('services/cash-command/cash-command.service.ts');", "const changed=tests.slice(0,1).concat('services/cash-command/cash-command.service.ts','services/cash-command/cash-command-contracts.ts','services/cash-command/cash-command-visibility.service.ts');").replace('cash-related-checks-','cash-private-checks-');
fs.writeFileSync(path.join(__dirname,'run-cash-private-checks.cjs'),source,{flag:'wx'});
