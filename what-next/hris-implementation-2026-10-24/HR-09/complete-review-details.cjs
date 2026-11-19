const fs = require('node:fs');
const p='services/hris/workspace-setup.service.ts';let s=fs.readFileSync(p,'utf8');
s=s.replace('import { createHash, randomUUID }','import { createHash }');
s=s.replace('import { createTimeFoundation','import { attendanceMetadata, correctionEvidenceSchema } from "./attendance-correction"\nimport { createTimeFoundation');
s=s.replace('timezone: true, status: true, effectiveFrom: true','timezone: true, holidays: {select: {name: true, holidayDate: true, paid: true}}, status: true, effectiveFrom: true');
s=s.replace('annualEntitlementMinutes: true, effectiveFrom: true','annualEntitlementMinutes: true, carryOverLimitMinutes: true, accrualRule: true, effectiveFrom: true');
s=s.replace('sourceHash: true, standardWeeklyMinutes: true','sourceHash: true, weeklyPattern: true, calendarId: true, standardWeeklyMinutes: true');
s=s.replace('periodEnd: true, requestEvidenceHash: true','periodEnd: true, reason: true, metadata: true, requestEvidenceHash: true');
s=s.replace('return json({organization, canManage, employees, users, units, calendars, policies, schedules, requests,',`return json({organization, canManage, employees, users, units,
      calendars: calendars.map(c => ({...c, details: {holidays: c.holidays.map(h => h.holidayDate.toISOString().slice(0,10) + " " + h.name + " " + (h.paid ? "paid / payé" : "unpaid / non payé")).join("; ") || "None / Aucun"}})),
      policies: policies.map(p => ({...p, details: {annual: p.annualEntitlementMinutes, carryover: p.carryOverLimitMinutes, accrual: JSON.stringify(p.accrualRule), source: p.sourceHash}})),
      schedules: schedules.map(s => ({...s, details: {employee: employees.find(e => e.id === s.employeeId)?.displayName ?? s.employeeId, calendar: s.calendarId, weekly: JSON.stringify(s.weeklyPattern), until: s.effectiveTo?.toISOString().slice(0,10) ?? "Open / Ouvert", source: s.sourceHash}})),
      requests: requests.map(r => {
        const correction = correctionEvidenceSchema.safeParse(attendanceMetadata(r.metadata).correction)
        return {...r, metadata: undefined, details: {reason: r.reason, source: r.requestEvidenceHash, ...(correction.success ? {entry: correction.data.entryId, base: correction.data.baseHash, beforeWorked: correction.data.before.workedMinutes, afterWorked: correction.data.after.workedMinutes, beforeAbsent: correction.data.before.absenceMinutes, afterAbsent: correction.data.after.absenceMinutes} : {})}}
      }),`);
s=s.replace('export type WorkspaceSetup = {','type ReviewDetails = {details: Record<string, string | number>}\nexport type WorkspaceSetup = {');
s=s.replace('  calendars: {','  calendars: (ReviewDetails & {').replace('  policies: {','  policies: (ReviewDetails & {').replace('  schedules: {','  schedules: (ReviewDetails & {').replace('  requests: {','  requests: (ReviewDetails & {');
for(const marker of ['sourceHash: string}[]','standardWeeklyMinutes: number}[]','requestEvidenceHash: string}[]']) s=s.replaceAll(marker,marker.replace('}[]','})[]'));
fs.writeFileSync(p,s);
const ui='components/hris/HrisWorkspaceSetup.tsx';s=fs.readFileSync(ui,'utf8');
s=s.replace('  return <main className=',`  const detailLabels: Record<string, [string, string]> = {holidays:["Public holidays", "Jours fériés"], annual:["Annual minutes", "Minutes annuelles"], carryover:["Carry-over minutes", "Minutes reportables"], accrual:["Accrual rule", "Règle d’acquisition"], source:["Source evidence", "Preuve source"], weekly:["Minutes by weekday (0=Sun, 1=Mon … 6=Sat)", "Minutes par jour (0=dim., 1=lun. … 6=sam.)"], employee:["Employee", "Employé"], calendar:["Calendar reference", "Référence calendrier"], until:["Final work date (inclusive)", "Dernier jour inclus"], reason:["Request reason", "Motif de la demande"], entry:["Attendance entry", "Écriture de présence"], base:["Reviewed source revision", "Révision source vérifiée"], beforeWorked:["Worked minutes before", "Minutes travaillées avant"], afterWorked:["Worked minutes after", "Minutes travaillées après"], beforeAbsent:["Absence minutes before", "Minutes d’absence avant"], afterAbsent:["Absence minutes after", "Minutes d’absence après"]}
  const details = (values: Record<string, string | number>) => <dl className="grid min-w-0 gap-1 break-words rounded border border-white/10 p-3 text-sm">{Object.entries(values).map(([key,value]) => <div key={key}><dt className="font-semibold">{detailLabels[key] ? t(...detailLabels[key]) : key}</dt><dd className="break-all">{String(value)}</dd></div>)}</dl>
  return <main className=`);
s=s.replace('{c.sourceHash}</p>{canReview','{c.sourceHash}</p>{details(c.details)}{data.policies.filter(p => p.status === "DRAFT" && p.countryCode === c.countryCode && p.effectiveFrom === c.effectiveFrom && p.effectiveTo === c.effectiveTo).map(p => <div key={p.id}><h3>{p.name}</h3>{details(p.details)}</div>)}{canReview');
s=s.replace('{s.effectiveFrom.slice(0,10)}</p>{canReview','{s.effectiveFrom.slice(0,10)}</p>{details(s.details)}{canReview');
s=s.replace('{r.periodEnd.slice(0,10)}</p>{canReview','{r.periodEnd.slice(0,10)}</p>{details(r.details)}{canReview');
fs.writeFileSync(ui,s);
