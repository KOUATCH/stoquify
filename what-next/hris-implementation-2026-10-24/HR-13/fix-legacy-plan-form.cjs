const fs=require('node:fs'),p='components/hris/HrisRosterWorkspace.tsx';let s=fs.readFileSync(p,'utf8');
s=s.replace('defaultValue={revision?.shiftPlan?"SHIFT":"OFFICE"}','defaultValue={revision?.shiftPlan?((revision.shiftPlan as any).shifts?.length?"SHIFT":"OFF"):"OFFICE"}');
s=s.replace('(revision?.weeklyPattern as any)?.[k]??(i>0','(revision?.weeklyPattern as any)?.[k]??(revision?.weeklyPattern as any)?.[String(i)]??(i>0');
fs.writeFileSync(p+'.hr13-candidate',s);
const q='services/hris/roster-workspace.service.ts';let t=fs.readFileSync(q,'utf8');t=t.replace('take:5000})','take:5001})\n  if(schedules.length>5000)throw new BusinessRuleError("HRIS_ROSTER_SCOPE_TOO_LARGE: Select one employee or a shorter date range to review complete schedule history.")');fs.writeFileSync(q+'.hr13-candidate',t);
