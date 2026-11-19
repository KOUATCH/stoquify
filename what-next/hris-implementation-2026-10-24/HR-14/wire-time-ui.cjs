const fs=require('fs');
let p='components/hris/HrisWorkspaceSetup.tsx',s=fs.readFileSync(p,'utf8');
s=s.replace('"use client"','"use client"\nimport {HrisControlledReview} from "./HrisControlledReview"');
const lines=s.split('\n');
for(let i=0;i<lines.length;i++){
 if(lines[i].includes('{data.calendars.filter(c => c.status === "DRAFT").map'))lines[i]=`      {data.calendars.filter(c=>c.status==="DRAFT").map(c=><section key={c.id}><h3>{c.name}</h3>{details(c.details)}{data.policies.filter(p=>p.status==="DRAFT"&&p.countryCode===c.countryCode&&p.effectiveFrom===c.effectiveFrom&&p.effectiveTo===c.effectiveTo).map(p=><div key={p.id}><h4>{p.name}</h4>{details(p.details)}{canReview("TIME_POLICY",null)&&<HrisControlledReview locale={locale} label={t("Review policy","Valider la politique")} target={{domain:"TIME_POLICY",decision:"APPROVE",employeeId:"",sourceId:c.id,leavePolicyId:p.id}}/>}</div>)}</section>)}`;
 if(lines[i].includes('{data.schedules.map(s =>'))lines[i]=`      {data.schedules.map(s=><section key={s.id}><h3>{s.name}</h3>{details(s.details)}{canReview("WORK_SCHEDULE",s.employeeId)&&<HrisControlledReview locale={locale} label={t("Review schedule","Valider l’horaire")} target={{domain:"WORK_SCHEDULE",decision:"APPROVE",employeeId:s.employeeId,sourceId:s.id}}/>}</section>)}`;
 if(lines[i].includes('{data.requests.map(r =>'))lines[i]=`      {data.requests.map(r=><section key={r.id}><h3>{data.employees.find(e=>e.id===r.employeeId)?.displayName} · {r.type} · {r.requestedMinutes} min</h3>{details(r.details)}{canReview("TIME_REQUEST",r.employeeId)&&(["APPROVE","REJECT"] as const).map(decision=><HrisControlledReview key={decision} locale={locale} label={decision==="APPROVE"?t("Approve time request","Approuver la demande de temps"):t("Reject time request","Rejeter la demande de temps")} target={{domain:"TIME_REQUEST",decision,employeeId:r.employeeId,sourceId:r.id}}/>)}</section>)}`;
}
fs.writeFileSync(p+'.hr14-candidate',lines.join('\n'));
