const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),root=path.resolve(__dirname,'../../..');
function edit(file,fn){const p=path.join(root,file),s=fs.readFileSync(p,'utf8');const next=fn(s.replace(/\r\n/g,'\n')),tmp=p+'.pending-'+crypto.randomUUID();fs.writeFileSync(tmp,next);fs.renameSync(tmp,p);}
edit('services/cash-command/__tests__/cash-command.service.test.ts',s=>{
 s='import { localizeCashCommandNavigation } from "../cash-command-navigation"\n'+s;
 const marker='  it("withholds every denied aggregate representation, not just its action link",';
 const tests=`  it.each([
    { id: "stock_cash_buffer", source: "inventory.read", route: "/dashboard/inventory/items", destination: ["inventory.items.read"] },
    { id: "employee_balance_recovery", source: "payroll.payments.reconcile", route: "/dashboard/payroll/payments", destination: ["payments.reconciliation.read", "payroll.command.read"] },
    { id: "upcoming_statutory_liability", source: "payroll.declarations.manage", route: "/dashboard/payroll/declarations", destination: ["payroll.command.read"] },
  ])("preserves $id aggregate while enforcing destination authority on every representation", async ({ id, source, route, destination }) => {
    const request = { organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["admin"], now: generatedAt }
    const denied = await getCashCommandData({ ...request, actorPermissions: ["finance.read", source] })
    const card = denied.cards.find(row => row.id === id)!
    expect(card).toBeDefined()
    expect(card.actionLink).toMatchObject({ href: route, disabled: true, disabledReason: expect.any(String) })
    expect(card.drillThrough).toMatchObject({ available: false, unavailableReason: expect.any(String) })
    for (const row of [...denied.changes, ...denied.risks].filter(row => row.actionLink?.href === route)) {
      expect(row.actionLink?.disabled).toBe(true)
      expect(row.drillThrough?.available).toBe(false)
    }
    expect(denied.commandBrief.primaryAction?.href).not.toBe(route)
    expect(denied.actionsToday.some(row => row.actionLink.href === route)).toBe(false)
    const allowed = await getCashCommandData({ ...request, actorPermissions: ["finance.read", source, ...destination] })
    const admitted = allowed.cards.find(row => row.id === id)!
    expect(admitted.value).toBe(card.value)
    expect(admitted.actionLink).toMatchObject({ href: route, disabled: false })
    // Each required destination permission matters independently.
    for (const missing of destination) {
      const again = await getCashCommandData({ ...request, actorPermissions: ["finance.read", source, ...destination.filter(value => value !== missing)] })
      expect(again.cards.find(row => row.id === id)?.actionLink?.disabled).toBe(true)
    }
    for (const locale of ["en", "fr"] as const) {
      const localized = localizeCashCommandNavigation(allowed, locale)
      const localizedCard = localized.cards.find(row => row.id === id)!
      expect(localizedCard.actionLink?.href).toBe("/" + locale + route)
      expect(localizedCard.provenance).toEqual(admitted.provenance)
      expect(localized.summary).toEqual(allowed.summary)
      for (const row of [...localized.changes, ...localized.risks]) {
        if (row.actionLink) expect(row.actionLink.href).toMatch(new RegExp("^/" + locale + "/"))
        if (row.drillThrough?.available && row.drillThrough.href) expect(row.drillThrough.href).toMatch(new RegExp("^/" + locale + "/"))
      }
      const localizedDenied = localizeCashCommandNavigation(denied, locale).cards.find(row => row.id === id)!
      expect(localizedDenied.actionLink?.disabledReason).toContain(locale === "fr" ? "vos droits actuels" : "your current access")
    }
  })

`;
 if(!s.includes(marker))throw Error('test marker');return s.replace(marker,tests+marker);
});
edit('app/[locale]/(dashboard)/dashboard/finance/cash-command/__tests__/page.test.tsx',s=>s.replace('mockGetCashCommandData.mockResolvedValue({ organizationId: "org-session" })','mockGetCashCommandData.mockResolvedValue({ organizationId: "org-session", commandBrief: { primaryAction: null, drillThrough: null }, cards: [], changes: [], risks: [], actionsToday: [] })'));
let runner=fs.readFileSync(path.join(__dirname,'run-cash-sources-checks.cjs'),'utf8');runner=runner.replace("const changed=[","const changed=['services/cash-command/cash-command-navigation.ts','app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx',").replace("'evidence/cash-sources-checks-'","'evidence/cash-navigation-checks-'");
fs.writeFileSync(path.join(__dirname,'run-cash-navigation-checks.cjs'),runner,{flag:'wx'});
