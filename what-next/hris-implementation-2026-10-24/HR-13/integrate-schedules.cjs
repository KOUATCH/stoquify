const fs=require('node:fs');
const p='services/hris/operational-time.service.ts';let s=fs.readFileSync(p,'utf8');
const start=s.indexOf('export const assignWorkScheduleInputSchema = actor.extend('),end=s.indexOf('export async function requestOperationalTime(',start);
if(start<0||end<0)throw Error('Schedule owner boundaries changed');
s=s.slice(0,start)+`export { prepareScheduleSchema as assignWorkScheduleInputSchema, approveScheduleSchema as approveWorkScheduleInputSchema,
  prepareHrisWorkSchedule as assignWorkSchedule, approveHrisWorkSchedule as approveWorkSchedule } from "./schedule-revision.service"

`+s.slice(end);fs.writeFileSync(p+'.hr13-candidate',s);
const q='services/hris/workspace-setup.service.ts';let t=fs.readFileSync(q,'utf8');
t=t.replace('weeklyPattern: true, calendarId: true, standardWeeklyMinutes: true','weeklyPattern: true, calendarId: true, standardWeeklyMinutes: true, revision: true, supersedesScheduleId: true, shiftPlan: true');
t=t.replace('weekly: JSON.stringify(s.weeklyPattern),','weekly: JSON.stringify(s.weeklyPattern), revision: String(s.revision), predecessor: s.supersedesScheduleId ?? "None / Aucun", datedShifts: s.shiftPlan ? JSON.stringify(s.shiftPlan) : "Recurring minutes / Minutes récurrentes",');
fs.writeFileSync(q+'.hr13-candidate',t);
