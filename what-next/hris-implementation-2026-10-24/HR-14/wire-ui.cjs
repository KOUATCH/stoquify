const fs=require('fs');
function edit(p,fn){const old=fs.readFileSync(p,'utf8');fs.writeFileSync(p+'.hr14-candidate',fn(old));}
edit('components/hris/HrisApprovalInbox.tsx',s=>{
 s=s.replace('import { useMemo, useState, useTransition }','import { useMemo, useState }').replace('import { decideHrisApprovalInboxItemAction } from "@/actions/hris/approval-inbox.actions"','import { HrisControlledReview } from "./HrisControlledReview"');
 const start=s.indexOf('  const [selected,');const end=s.indexOf('  const items =',start);s=s.slice(0,start)+s.slice(end);
 const a=s.indexOf('  function openDecision('),b=s.indexOf('  return (\n    <>',a);s=s.slice(0,a)+s.slice(b);
 const c=s.indexOf('                            <button\n',s.indexOf('item.potentialActions.map')),d=s.indexOf('                            </button>',c)+'                            </button>'.length;
 s=s.slice(0,c)+`                            <HrisControlledReview key={action+item.id} locale={locale} target={{domain:item.domain,decision:action,employeeId:item.employee.id,sourceId:item.sourceId}} disabled={!item.decision.eligible} label={locale==="fr"?({APPROVE:"Approuver",REJECT:"Rejeter",APPLY:"Appliquer"}[action]):ACTION_LABELS[action]} onComplete={()=>router.refresh()}/>`+s.slice(d);
 const e=s.indexOf('      {selected ? ('),f=s.indexOf('      ) : null}',e)+'      ) : null}'.length;s=s.slice(0,e)+s.slice(f);
 return s;
});
edit('components/hris/HrisPeopleAuthoring.tsx',s=>{
 s=s.replace('"use client";','"use client";\nimport { HrisControlledReview, type ReviewTarget } from "./HrisControlledReview";');
 const a=s.indexOf('  ) => (\n    <OperatingForm',s.indexOf('  const form ='));
 if(a<0)throw Error('form anchor absent');
 s=s.slice(0,a)+s.slice(a).replace('  ) => (\n    <OperatingForm',`  ) => {
    const domains:Record<string,ReviewTarget["domain"]>={LIFECYCLE_APPROVE:"LIFECYCLE",LIFECYCLE_APPLY:"LIFECYCLE",SALARY_APPROVE:"SALARY_CHANGE",SALARY_APPLY:"SALARY_CHANGE",PAYMENT_APPROVE:"PAYMENT_DESTINATION",PAYMENT_APPLY:"PAYMENT_DESTINATION"};
    const domain=operation==="INBOX"?fixed.domain as ReviewTarget["domain"]:domains[operation];
    if(domain)return <HrisControlledReview key={String(employee?.id)+key} locale={locale} label={title} target={{domain,decision:operation.endsWith("APPLY")?"APPLY":(fixed.decision??"APPROVE") as ReviewTarget["decision"],employeeId:String(fixed.employeeId),sourceId:String(fixed.sourceId??fixed.requestId??fixed.salaryChangeRequestId??fixed.paymentDestinationChangeRequestId)}} onComplete={async()=>{setView(await reload(employee.id))}}/>;
    return (\n    <OperatingForm`).replace('  );\n  const identity =','  );\n  };\n  const identity =');
 return s;
});
