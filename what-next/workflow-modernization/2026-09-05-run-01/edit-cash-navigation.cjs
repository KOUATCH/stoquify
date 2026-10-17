const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const root=path.resolve(__dirname,'../../..');
function edit(file,fn){const p=path.join(root,file),s=fs.readFileSync(p,'utf8'),next=fn(s.replace(/\r\n/g,'\n'));if(next===s)throw Error('No edit '+file);const tmp=p+'.pending-'+crypto.randomUUID();fs.writeFileSync(tmp,next);fs.renameSync(tmp,p);}
edit('services/cash-command/cash-command.service.ts',s=>s.replaceAll('/dashboard/inventory/stock','/dashboard/inventory/items').replace('    href: "/dashboard/inventory/items",\n    requiredPermission: "inventory.read",','    href: "/dashboard/inventory/items",\n    requiredPermission: "inventory.items.read",').replace('    href: "/dashboard/payroll/payments",\n    requiredPermission: "payroll.payments.reconcile",','    href: "/dashboard/payroll/payments",\n    requiredPermission: "payments.reconciliation.read",\n    additionalRequiredPermissions: ["payroll.payments.reconcile", "payroll.command.read"],').replace('          requiredPermission: "payroll.declarations.manage",','          requiredPermission: "payroll.command.read",\n          additionalRequiredPermissions: ["payroll.declarations.manage"],').replace('    requiredPermission: item.requiredPermission,','    requiredPermission: item.requiredPermission,\n    ...(item.additionalRequiredPermissions ? { additionalRequiredPermissions: item.additionalRequiredPermissions } : {}),'));
edit('services/cash-command/cash-command-visibility.service.ts',s=>{
 s=s.replace('import "server-only"','import "server-only"\nimport { CASH_DESTINATION_PERMISSIONS, CASH_DESTINATION_DENIED } from "./cash-command-navigation"');
 const a=s.indexOf('  const canOpenAction ='),b=s.indexOf('  const actionAdmission',a);s=s.slice(0,a)+s.slice(b);
 const marker='  const cards = data.cards.filter(card => cardAccess[card.id] === true).map(scopedCard).map(scopedProof)';
 if(!s.includes(marker))throw Error('cards marker');
 s=s.replace(marker,`  const canOpenAction = async (link: BIActionLink) => !link.disabled && allowed(link.moduleSlug, link.requiredPermission,
    [...(link.additionalRequiredPermissions ?? []), ...(CASH_DESTINATION_PERMISSIONS[link.href] ?? [])])
  const cards = await Promise.all(data.cards.filter(card => cardAccess[card.id] === true).map(scopedCard).map(scopedProof).map(async card => {
    const link = card.actionLink
    const permitted = link ? await canOpenAction(link) : false
    const actionLink = link && !permitted ? { ...link, disabled: true, disabledReason: link.disabledReason ?? CASH_DESTINATION_DENIED } : link
    const drill = card.drillThrough
    const drillAllowed = !drill.available || !drill.href || await canOpenAction({
      id: card.id + ":destination", label: drill.label, href: drill.href, moduleSlug: card.moduleSlug,
      requiredPermission: drill.requiredPermission, additionalRequiredPermissions: drill.additionalRequiredPermissions,
      disabled: false, disabledReason: null,
    })
    return { ...card, actionLink, drillThrough: drillAllowed ? drill : {
      available: false as const, type: drill.type, label: drill.label, requiredPermission: drill.requiredPermission,
      unavailableReason: CASH_DESTINATION_DENIED,
    } }
  }))`);
 s=s.replace('return [{ ...change, drillThrough: card.drillThrough }]','return [{ ...change, actionLink: card.actionLink, drillThrough: card.drillThrough }]');
 s=s.replace('return [{ ...risk, drillThrough: card.drillThrough }]','return [{ ...risk, actionLink: card.actionLink, drillThrough: card.drillThrough }]');
 s=s.replace('cards.find(card => card.actionLink)?.actionLink','cards.find(card => card.actionLink && !card.actionLink.disabled)?.actionLink');
 return s;
});
edit('app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx',s=>s.replace('import type { Metadata } from "next"','import type { Metadata } from "next"\nimport { localizeCashCommandNavigation } from "@/services/cash-command/cash-command-navigation"').replace('          data={data}','          data={localizeCashCommandNavigation(data, locale)}'));
