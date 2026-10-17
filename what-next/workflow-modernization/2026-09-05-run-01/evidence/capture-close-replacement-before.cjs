const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const files = ['services/accounting/close-assurance.service.ts','services/accounting/close-assurance.schemas.ts','services/accounting/missing-close-evidence-response-acceptance-contracts.ts','services/accounting/accountant-work-desk.service.ts','services/accounting/accountant-work-desk.contracts.ts','services/snapshots/close-readiness-snapshot.service.ts','components/accounting/AccountantWorkDesk.tsx','components/accounting/accountant-work-desk-copy.ts','what-next/workflow-modernization/2026-09-05-run-01/WORKFLOW_REGISTER.json','what-next/workflow-modernization/2026-09-05-run-01/CURRENT_PROGRESS.md'];
const result = { at: new Date().toISOString(), files: Object.fromEntries(files.map(file => { const bytes = fs.readFileSync(path.join(root,file)); return [file,{ sha256: crypto.createHash('sha256').update(bytes).digest('hex'), base64: bytes.toString('base64') }]; })) };
const file = path.join(__dirname, 'close-replacement-before-' + crypto.randomUUID() + '.json');
fs.writeFileSync(file, JSON.stringify(result,null,2)+'\n', {flag:'wx'});
console.log(file);
