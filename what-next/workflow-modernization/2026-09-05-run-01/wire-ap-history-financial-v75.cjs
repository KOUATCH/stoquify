const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../../..');
const edit=(p,fn)=>{const file=path.join(root,p);fs.writeFileSync(file,fn(fs.readFileSync(file,'utf8')))};
edit('services/purchasing/ap-history.service.ts',s=>{
 s=s.replace('const AP_HISTORY_ADAPTER_ID = "supplier-ap-history.v1"','import { dailySalesPeriod } from "@/services/analytics/daily-sales-period"\nimport { resolveAPHistoryFinancials, type APCurrencyTotals, type APMovement } from "./ap-history-financial"\n\nconst AP_HISTORY_ADAPTER_ID = "supplier-ap-history.v2"');
 s=s.replace('"organization" | "supplierInvoice" | "supplierPayment"','"organization" | "supplierInvoice" | "supplierPayment" | "supplierLedgerEntry"');
 s=s.replace('  signedPayableMovement: string','  signedPayableMovement: string | null\n  movementState: APMovement["state"]\n  retained: boolean');
 for(const key of ['invoiceTotal','paidTotal','releasedPaymentTotal','openPayable'])s=s.replace('  '+key+': string','  '+key+': string | null');
 s=s.replace('  postedInvoiceCount: number','  currencyTotals: APCurrencyTotals[]\n  unverifiedCount: number\n  financialBasis: "current_remainder_of_filtered_recognized_invoices"\n  postedInvoiceCount: number');
 s=s.replace(/function parseCalendarDate\(value: string\) \{[\s\S]*?function historyCompleteness\(\)/,'function historyCompleteness()');
 s=s.replace('    state: "complete",\n    sources:', '    state: "partial",\n    sources:');
 s=s.replace('const dateStart = filters.dateFrom ? parseCalendarDate(filters.dateFrom) : undefined','const dateStart = filters.dateFrom ? dailySalesPeriod(filters.dateFrom, organization.timezone).start : undefined').replace('const dateEnd = filters.dateTo ? addDay(parseCalendarDate(filters.dateTo)) : undefined','const dateEnd = filters.dateTo ? dailySalesPeriod(filters.dateTo, organization.timezone).endExclusive : undefined');
 s=s.replaceAll('    deletedAt: null,\n    invoiceDate,','    createdAt: { lte: recordedThrough },\n    invoiceDate,').replaceAll('    deletedAt: null,\n    paymentDate,','    createdAt: { lte: recordedThrough },\n    paymentDate,');
 s=s.replace('select: { status: true, total: true, amountPaid: true, ledgerPostingBatchId: true },','include: { paymentAllocations: { include: { supplierPayment: true } }, supplierCreditNotes: true },').replace('          select: { status: true, amount: true, ledgerPostingBatchId: true },','');
 s=s.replace('  const combined: CombinedRow[] = [',`  if ([...invoiceSummaryRows, ...paymentSummaryRows].some(row => row.updatedAt > recordedThrough)) {
    invalidHistoryInput("AP source records changed after this read boundary. Refresh history to obtain a current view.")
  }
  const financial = await resolveAPHistoryFinancials(client, organization.id, invoiceSummaryRows, paymentSummaryRows, recordedThrough, organization.currency)
  const singleCurrency = financial.currencyTotals.length === 1 ? financial.currencyTotals[0] : null

  const combined: CombinedRow[] = [`);
 s=s.replace('signedPayableMovement: decimalText(total),','signedPayableMovement: financial.movements.get(`invoice:${entry.row.id}`)?.amount ?? null,\n        movementState: financial.movements.get(`invoice:${entry.row.id}`)?.state ?? "unverified",\n        retained: entry.row.deletedAt !== null,');
 s=s.replace('signedPayableMovement: decimalText(amount.neg()),','signedPayableMovement: financial.movements.get(`payment:${entry.row.id}`)?.amount ?? null,\n      movementState: financial.movements.get(`payment:${entry.row.id}`)?.state ?? "unverified",\n      retained: entry.row.deletedAt !== null,');
 s=s.replace(/  const invoiceTotal = invoiceSummaryRows.reduce\([\s\S]*?  const postedInvoiceCount =/, '  const postedInvoiceCount =');
 s=s.replace('invoiceTotal: decimalText(invoiceTotal),','invoiceTotal: singleCurrency?.invoiceTotal ?? null,').replace('paidTotal: decimalText(paidTotal),','paidTotal: singleCurrency?.paidTotal ?? null,').replace('releasedPaymentTotal: decimalText(releasedPaymentTotal),','releasedPaymentTotal: singleCurrency?.releasedPaymentTotal ?? null,').replace('openPayable: decimalText(invoiceTotal.minus(paidTotal)),','openPayable: singleCurrency?.openPayable ?? null,\n      currencyTotals: financial.currencyTotals,\n      unverifiedCount: financial.unverifiedCount,\n      financialBasis: "current_remainder_of_filtered_recognized_invoices",');
 s=s.replace('currency: organization.currency,\n    },','currency: singleCurrency?.currency ?? organization.currency,\n    },');
 return s;
});
edit('components/purchasing/APHistoryWorkbench.tsx',s=>{
 s=s.replace('import { cn }','import { formatAPHistoryMoney, formatAPHistoryTotal } from "@/lib/purchasing/ap-history-presentation"\nimport { cn }');
 s=s.replace('value: (row) => formatMoney(row.signedPayableMovement, row.currency, locale),','value: (row) => movementLabel(row, t, locale),');
 s=s.replace('value={formatMoney(row.signedPayableMovement, row.currency, locale)}','value={movementLabel(row, t, locale)}');
 s=s.replace('cell: (row) => formatMoney(row.signedPayableMovement, row.currency, locale)','cell: (row) => movementLabel(row, t, locale)');
 s=s.replace('value: formatMoney(summary?.openPayable ?? "0", summary?.currency ?? "XAF", locale)','value: formatAPHistoryTotal(summary, "openPayable", locale)');
 s=s.replace('value: formatMoney(summary?.releasedPaymentTotal ?? "0", summary?.currency ?? "XAF", locale), tone: "success"','value: formatAPHistoryTotal(summary, "releasedPaymentTotal", locale), tone: summary?.unverifiedCount ? "gold" : "info"');
 s=s.replace('tone: summary?.ledgerBlockerCount ? "danger" : "success"','tone: summary?.ledgerBlockerCount ? "danger" : "info"');
 s=s.replace(/function formatMoney\(value: string \| number, currency: string, locale: string\) \{[\s\S]*?\n\}/,`function formatMoney(value: string | number | null, currency: string, locale: string) {
  return formatAPHistoryMoney(value, currency, locale)
}

function movementLabel(row: APHistoryRow, t: APHistoryT, locale: string) {
  if (row.movementState === "not_recognized") return t("movement.notRecognized")
  if (row.movementState === "unverified" || row.signedPayableMovement == null) return t("movement.unverified")
  return formatMoney(row.signedPayableMovement, row.currency, locale)
}`);
 s=s.replace('status: (row) => <StateBadge state={row.controlState} t={t} />,','status: (row) => <><StateBadge state={row.controlState} t={t} />{row.retained ? <span className="ml-2 text-xs">{t("retained")}</span> : null}</>,');
 s=s.replace('cell: (row) => <StateBadge state={row.controlState} t={t} />','cell: (row) => <><StateBadge state={row.controlState} t={t} />{row.retained ? <span className="ml-2 text-xs">{t("retained")}</span> : null}</>');
 return s;
});
edit('components/suppliers/SupplierManagementDashboard.tsx',s=>{
 s='import { formatAPHistoryTotal } from "@/lib/purchasing/ap-history-presentation"\n'+s;
 // Keep the existing client directive first.
 s=s.replace('import { formatAPHistoryTotal } from "@/lib/purchasing/ap-history-presentation"\n"use client"','"use client"\nimport { formatAPHistoryTotal } from "@/lib/purchasing/ap-history-presentation"');
 for(const field of ['openPayable','releasedPaymentTotal']){
  const pattern=new RegExp('formatCurrencyText\\(\\s*analyticsQuery\\.data(\\?)?\\.apHistory\\.summary\\.'+field+'(?: \\?\\? "0")?,\\s*analyticsQuery\\.data(?:\\?)?\\.apHistory\\.summary\\.currency(?: \\?\\? "XAF")?,\\s*locale,?\\s*\\)','g');
  s=s.replace(pattern,(_,optional)=>'formatAPHistoryTotal(analyticsQuery.data'+(optional?'?':'')+'.apHistory.summary, "'+field+'", locale)');
 }
 s=s.replace('openPayable: "Open payable"','openPayable: "Current invoice remainder"').replace('openPayable: "Dette ouverte"','openPayable: "Solde actuel des factures"');
 return s;
});
for(const locale of ['en','fr'])edit('messages/'+locale+'.json',s=>{
 const m=JSON.parse(s),t=m.apHistory;
 t.table.currency=locale==='fr'?'Devise':'Currency';
 t.table.amount=locale==='fr'?'Montant du document':'Document amount';
 t.table.movement=locale==='fr'?'Mouvement reconnu':'Recognized movement';
 t.drawer.signedMovement=t.table.movement;
 t.kpis.openPayable=locale==='fr'?'Solde actuel des factures filtrées':'Current remainder of filtered invoices';
 t.kpis.releasedPayments=locale==='fr'?'Paiements libérés vérifiés':'Verified released payments';
 t.movement=locale==='fr'?{notRecognized:'Non comptabilisé dans le compte fournisseur',unverified:'Mouvement à vérifier'}:{notRecognized:'Not recognized in supplier account',unverified:'Movement unverified'};
 t.retained=locale==='fr'?'Archivé — historique conservé':'Archived — retained history';
 t.summary=locale==='fr'?'Montants des documents et mouvements reconnus du compte fournisseur. Les soldes actuels incluent les paiements affectés et avoirs vérifiés des factures filtrées, par devise. Ce n’est pas une balance historique ou un solde fournisseur global.':'Document amounts and recognized supplier-account movements. Current remainders include verified allocated payments and credits for the filtered invoices, separately by currency. This is not a historical trial balance or a complete supplier balance.';
 t.states.partialMessage=locale==='fr'?'Les montants sans preuve cohérente sont indisponibles. La certification comptable et la reconstitution des soldes historiques restent distinctes de cette vue opérationnelle.':'Amounts without consistent evidence are unavailable. Accounting certification and reconstruction of historical balances are separate from this operational view.';
 return JSON.stringify(m,null,2)+'\n';
});
console.log('AP history now separates document amounts, evidenced movements and currency-specific current invoice remainders.');
