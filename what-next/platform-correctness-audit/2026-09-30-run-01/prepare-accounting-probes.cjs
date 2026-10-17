const fs=require('fs'),path=require('path');
const original='what-next/accounting-enterprise-audit/2026-09-08-run-01/behavior-probes.cjs';
let src=fs.readFileSync(original,'utf8');
src=src.replace("const tx={journalEntry:{findFirst:async()=>original", "const tx={$queryRaw:async()=>[],paymentReconciliationInboxItem:{findFirst:async()=>null},journalEntry:{findFirst:async()=>original");
src=src.replace("const tx={accountingPeriod:{findFirst:async()=>period,update", "const tx={$queryRaw:async()=>[],accountingPeriod:{findFirst:async()=>period,update");
src=src.replace("path.join(__dirname,'evidence/behavior-probes.json')", "path.join(__dirname,'verification/accounting-behavior-probes.json')");
src='// Revalidated historical probes against current source; adapted lock and suspense lookup doubles.\n'+src;
fs.writeFileSync(path.join(__dirname,'accounting-probes.cjs'),src);
console.log('Prepared current-source accounting probes; all persistence is in-memory.');
