const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file=path.join(__dirname,'reconcile-current-progress.cjs');let source=fs.readFileSync(file,'utf8');
function replace(before,after){assert.ok(source.includes(before),before);source=source.replace(before,after);}
const old='const cashNavigationCurrent = Object.entries(cashNavigation.sourceHashes).every(([source, expected]) => crypto.createHash(\'sha256\').update(fs.readFileSync(path.resolve(root, \'../../..\', source))).digest(\'hex\') === expected);';
replace(old,`const cashTimezone = JSON.parse(fs.readFileSync(path.join(root, 'evidence/cash-timezone-review-2026-09-30.json')));
for (const row of [...cashTimezone.receipts, ...cashTimezone.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash timezone evidence changed');
for (const row of cashTimezone.priorImpact) if (cashNavigation.sourceHashes[row.file] !== row.before || cashTimezone.sourceHashes[row.file] !== row.after) throw new Error('Invalid Cash timezone impact');
const cashTimezoneCurrent = Object.entries(cashTimezone.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
if (!cashTimezoneCurrent) throw new Error('Cash timezone dependency changed; review required');
const cashNavigationCurrent = cashTimezoneCurrent && Object.entries(cashNavigation.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === (cashTimezone.priorImpact.find(row => row.file === source)?.after ?? expected));`);
const chain='(cashNavigation.priorImpact.find(row => row.file === source)?.after ??';
assert.equal(source.split(chain).length-1,7);
source=source.replaceAll(chain,'(cashTimezone.priorImpact.find(row => row.file === source)?.after ?? cashNavigation.priorImpact.find(row => row.file === source)?.after ??');
replace('...cashNavigation.verifiedSubcriteria]','...cashNavigation.verifiedSubcriteria, ...cashTimezone.verifiedSubcriteria]');
replace("const currentCashLane = JSON.parse",`for (const report of [cashTimezone.report, 'evidence/cash-timezone-review-2026-09-30.json']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);
cashRead.closureReview.timezoneAndDrawerBindingCurrent = cashTimezoneCurrent;
cashRead.implementationStatus = 'source_admission_navigation_and_explicit_utc_display_verified';
cashRead.runtimeStatus = 'owned_en_fr_drawer_alias_handoff_revocation_and_cross_timezone_hydration_verified';
cashRead.remaining = cashRead.remaining.filter(value => value !== cashNavigation.remaining[0] && value !== cashNavigation.remaining[1]);
for (const gap of cashTimezone.remaining) if (!cashRead.remaining.includes(gap)) cashRead.remaining.push(gap);
const currentCashLane = JSON.parse`);
replace("for (const id of ['NTF-DELIVERY-MONITOR', 'NTF-DELIVERY-RECOVERY'])",`const drawerRead = register.workflows.find(w => w.id === 'FA-CASH-DRAWER');
drawerRead.runtimeStatus = 'owned_en_fr_empty_drawer_entry_back_and_permission_revocation_verified';
if (!drawerRead.evidence.includes(cashTimezone.report)) drawerRead.evidence.push(cashTimezone.report);
const drawerGap = 'Empty drawer scope displayed cash under control and 100% confidence in the actual FR browser; source confidence starts at 100 and subtracts observed exceptions. Review empty-evidence semantics. Destination date range uses machine-local boundaries/formatting; reconcile source and browser timezone labels. Handoff evidence does not establish drawer operations or reconciliation.';
if (!drawerRead.remaining.includes(drawerGap)) drawerRead.remaining.push(drawerGap);
const drawerLane = JSON.parse(fs.readFileSync(cashLaneFile, 'utf8'));
const laneDrawer = drawerLane.workflows.find(w => w.id === drawerRead.id);
if (laneDrawer) Object.assign(laneDrawer, { runtimeStatus: drawerRead.runtimeStatus, evidence: drawerRead.evidence, remaining: drawerRead.remaining });
writeCurrent(cashLaneFile, JSON.stringify(drawerLane, null, 2) + '\\n');
for (const id of ['NTF-DELIVERY-MONITOR', 'NTF-DELIVERY-RECOVERY'])`);
replace('Source admission and EN/FR stock/payroll keyboard handoffs','Source admission; stock/payroll/drawer handoffs; UTC display');
replace('**Since the previous report:** Corrected the stock route and payroll destination permissions while preserving permitted aggregate values. Disabled links now have visible EN/FR explanations; all Cash navigation retains the current language. 197 tests/seven suites, lint and TypeScript passed. Six EN/FR actual keyboard journeys verify destination entry, Back and withdrawal against already-rendered links. [Evidence and guidance](CASH_COMMAND_NAVIGATION_2026-09-28.md). No workflow was added or closed.',
'**Since the previous report:** Reproduced a server/browser date mismatch and made Cash Command dates explicit UTC. Corrected the earlier drawer diagnosis: the existing legacy alias already satisfies destination permission; no extra guard is needed. 201 tests/seven suites, lint and TypeScript passed. Four EN/FR drawer journeys verify keyboard entry, Back and current revocation in New York and UTC+14 browser timezones without page errors. [Evidence and guidance](CASH_COMMAND_TIMEZONE_AND_DRAWER_2026-09-30.md). Recorded the drawer visit and its empty-scope confidence/date questions under FA-CASH-DRAWER. No workflow was added or closed. The prior usage-limit approval interruption was resolved through normal review.');
replace('**Remaining priority:** Align the drawer destination\'s extra finance permission and finish finance/action-queue handoffs. Investigate the intermittent hydration mismatch; a clean rerun does not prove it fixed. Complete EN/FR, honest observation/empty-forecast labels, other proofs and genuine posted payroll. Current checks cover three handoffs, not full downstream lifecycles. Nested payroll main landmarks were observed. Native screen-reader/browser zoom and production latency remain unverified. No migration, deployment or real cash operation occurred.',
'**Remaining priority:** Finish other finance/action-queue handoffs, server EN/FR, honest observation/empty-forecast labels, other proofs and genuine posted payroll. The reproduced timezone defect is fixed; the original truncated shell hydration trace cannot be conclusively attributed to it. Current checks cover handoffs, not full downstream lifecycles. Nested payroll main landmarks, native screen-reader/browser zoom and production latency remain unverified. No migration, deployment or real cash operation occurred.');
const staged=file+'.pending-'+crypto.randomUUID();fs.writeFileSync(staged,source,{flag:'wx'});fs.renameSync(staged,file);console.log('Added exact reviewed timezone impacts and current milestone summary.');
