const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file=path.join(__dirname,'reconcile-current-progress.cjs');let source=fs.readFileSync(file,'utf8');
function replace(before,after){assert.ok(source.includes(before),before);source=source.replace(before,after);}
const old="const cashFinanceHandoffCurrent = Object.entries(cashFinanceHandoff.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);";
replace(old,`const cashQueue = JSON.parse(fs.readFileSync(path.join(root, 'evidence/cash-queue-review-2026-09-30.json')));
for (const row of [...cashQueue.receipts, ...cashQueue.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash queue evidence changed');
for (const row of cashQueue.correctionImpact) if (cashQueue.sourceHashes[row.file] !== row.after || JSON.parse(fs.readFileSync(path.join(root, row.reproduction))).sourceBefore[row.file] !== row.before) throw new Error('Invalid close timezone correction evidence');
for (const row of cashQueue.priorImpact) if (cashFinanceHandoff.sourceHashes[row.file] !== row.before || cashQueue.sourceHashes[row.file] !== row.after) throw new Error('Invalid Cash queue impact');
const cashQueueCurrent = Object.entries(cashQueue.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
if (!cashQueueCurrent) throw new Error('Cash queue dependency changed; review required');
const cashFinanceHandoffCurrent = cashQueueCurrent && Object.entries(cashFinanceHandoff.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === (cashQueue.priorImpact.find(row => row.file === source)?.after ?? expected));`);
const chain='(cashFinanceHandoff.priorImpact.find(row => row.file === source)?.after ??';assert.equal(source.split(chain).length-1,10);
source=source.replaceAll(chain,'(cashQueue.priorImpact.find(row => row.file === source)?.after ?? cashFinanceHandoff.priorImpact.find(row => row.file === source)?.after ??');
replace('...cashFinanceHandoff.verifiedSubcriteria]','...cashFinanceHandoff.verifiedSubcriteria, ...cashQueue.verifiedSubcriteria]');
replace("const drawerRead = register.workflows.find(w => w.id === 'FA-CASH-DRAWER');", `const closeRead = register.workflows.find(w => w.id === 'FA-CLOSE-READ');
for (const report of [cashQueue.report, 'evidence/cash-queue-review-2026-09-30.json']) if (!closeRead.evidence.includes(report)) closeRead.evidence.push(report);
closeRead.implementationStatus = 'close_page_and_read_action_module_admission_and_utc_timestamp_display_corrected';
closeRead.runtimeStatus = 'en_fr_direct_retained_module_reads_and_cash_queue_handoff_utc_verified';
const closeLane = JSON.parse(fs.readFileSync(cashLaneFile, 'utf8'));
Object.assign(closeLane.workflows.find(w => w.id === closeRead.id), { evidence: closeRead.evidence, implementationStatus: closeRead.implementationStatus, runtimeStatus: closeRead.runtimeStatus });
writeCurrent(cashLaneFile, JSON.stringify(closeLane, null, 2) + '\\n');
const drawerRead = register.workflows.find(w => w.id === 'FA-CASH-DRAWER');`);
replace('const currentCashLane = JSON.parse',`for (const report of [cashQueue.report, 'evidence/cash-queue-review-2026-09-30.json']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);
cashRead.closureReview.queueHandoffBindingCurrent = cashQueueCurrent;
cashRead.runtimeStatus = 'owned_en_fr_finance_and_purchasing_close_inventory_loss_queue_handoffs_verified';
cashRead.remaining = [...new Set(cashRead.remaining.map(value => value
 .replace('remaining purchasing/close/inventory-loss action-queue handoffs and ', '')
 .replace('Verify remaining purchasing, close and inventory-loss action-queue handoffs; finish ', 'Finish ')))];
for (const gap of cashQueue.remaining) if (!cashRead.remaining.includes(gap)) cashRead.remaining.push(gap);
const currentCashLane = JSON.parse`);
replace('Source admission; finance handoffs; UTC; honest source/card evidence','Source admission; finance/queue handoffs; UTC; honest evidence');
replace('Remaining queue handoffs, proofs, full EN/FR and posted payroll','Full EN/FR, remaining proofs, posted payroll and accessibility');
replace('Verify purchasing/close/inventory-loss queue handoffs','Complete source and shared-component EN/FR presentation');
assert.equal((source.match(/\*\*Since the previous report:\*\*[^\r\n]*/g)||[]).length,1);
source=source.replace(/\*\*Since the previous report:\*\*[^\r\n]*/, '**Since the previous report:** Six EN/FR journeys verify purchasing, close and inventory-loss queue handoffs, source records, keyboard entry, Back and permission withdrawal. Fresh denied responses exclude records; the queue removes revoked actions. A reproduced close timestamp hydration mismatch is corrected with explicit UTC display and stable period dates. Focused regressions, lint and TypeScript passed; business records remain unchanged. [Evidence and guidance](CASH_COMMAND_QUEUE_HANDOFFS_2026-09-30.md). Five failed attempts and their corrections are retained. No workflow was added or closed.');
replace('Finish purchasing/close/inventory-loss action-queue handoffs, full server EN/FR, other proofs and genuine posted payroll.','Finish full server/shared-component EN/FR, other proofs and genuine posted payroll.');
const staged=file+'.pending-'+crypto.randomUUID();fs.writeFileSync(staged,source,{flag:'wx'});fs.renameSync(staged,file);console.log('Added exact source-bound queue handoff evidence.');
