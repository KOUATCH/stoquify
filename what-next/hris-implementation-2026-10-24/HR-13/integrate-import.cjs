const fs=require('node:fs'),p='services/hris/operational-time.service.ts';let s=fs.readFileSync(p,'utf8');
const start=s.indexOf('export async function importOperationalTime('),end=s.indexOf('// Internal source projection shared by certification',start);
if(start<0||end<0)throw Error('Import owner boundaries changed');
s=s.slice(0,start)+`export { importReviewedOperationalTime as importOperationalTime, resolveReviewedOperationalAnomaly as resolveOperationalTimeAnomaly } from "./attendance-import.service"

`+s.slice(end);
// Include explicitly enrolled policies even before the first ledger movement.
s=s.replace('{ OR:[{balanceEntries:', '{ OR:[{accrualRule:{path:["employeeIds"],array_contains:[parsed.employeeId]}},{balanceEntries:');
fs.writeFileSync(p+'.hr13-candidate',s);
