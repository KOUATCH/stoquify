const fs=require('node:fs');
const path=require('node:path');
const file=path.join(__dirname,'findings-input.json');
const findings=JSON.parse(fs.readFileSync(file,'utf8')).filter(f=>f.id!=='F17');
findings.push({
 id:'F17',domain:'Frontend and verification',severity:'medium',title:'Finance presentation and responsive test contracts were out of sync',status:'verified',
 sourceRefs:[{path:'app/[locale]/(dashboard)/dashboard/accounting/reports/financial-statements/financial-statement-lines-table.tsx',needle:'dashboard-table-toolbar'},{path:'components/finance/FinanceCommandCenterDashboard.tsx',needle:'dashboard-table-pagination'},{path:'components/dashboard/__tests__/TransactionHistoryWorkbenchShell.test.tsx',needle:'desktopAndMobileSelection'},{path:'components/DataTableComponents/__tests__/TableDateRangeAdoption.contract.test.ts',needle:'it.each(QUERY_SURFACES)'}],
 observedBehavior:'A final drift-triggered recheck reproduced four failures: financial-statement controls and cash-flow pagination lacked shared presentation markers; the selection test assumed only one responsive checkbox; a global date-picker count rejected an additional valid picker.',
 impact:'Shared table spacing/control rules were not applied consistently, and stale tests blocked verification of legitimate responsive changes.',
 rootCause:'New and adapted table surfaces did not retain all shared classes; two tests coupled their expectations to old markup counts instead of current behavior.',
 correction:'Restore the existing shared toolbar/pagination classes. Scope the desktop selection action to its table, verify both desktop/mobile controls share state in both directions, and require the shared date picker separately in every named query surface.',
 alternativesAndTradeoffs:'Adding broad test exclusions or increasing the aggregate count would obscure individual missing integrations. Per-surface checks and cross-layout selection verify the intended contract while allowing additional responsive markup.',
 confidence:'High: four failures reproduced on an unchanged source snapshot; focused verification after correction is retained.',
 prerequisites:'The current working tree includes the newer responsive table implementations.',affectedAssets:'Finance presentation consistency and reliable local verification.',
 dependencies:[],effortEstimate:'Implemented during final verification',changeRisk:'Low: three existing CSS class bindings and focused test corrections; browser appearance still needs X1 proof.',
 acceptance:'All eight affected suites pass; every query surface uses the shared picker; desktop/mobile selection stays synchronized; table presentation scans detect no missing toolbar or pagination markers.',
 rollback:'Revert only the added class tokens if a verified visual regression occurs and repair the shared style contract. Preserve the behavior-based tests; do not reinstate arbitrary global counts.',
 relatedBlockers:['X04','FINANCE-X1'],milestoneUnlocked:'Reliable local finance verification; does not establish authenticated X1 capture or performance acceptance.',
 evidence:['evidence/concurrent-finance-recheck.json','evidence/concurrent-finance-recheck-source-binding.json','evidence/current-finance-verified.json'],
 limits:'The finance dashboard was also changed by another concurrent workstream. Only the added pagination class is attributed to this audit. JSDOM does not establish viewport CSS or screen-reader behavior.'
});
fs.writeFileSync(file,JSON.stringify(findings,null,2)+'\n');
const finalizeFile=path.join(__dirname,'finalize-review.cjs');
let source=fs.readFileSync(finalizeFile,'utf8');
source=source.replace("'middleware-routing-verified','concurrent-finance-recheck'","'middleware-routing-verified','current-finance-verified'");
source=source.replace("'tmp-protocol-check.js'];","'tmp-protocol-check.js','components/finance/FinanceCommandCenterDashboard.tsx','app/[locale]/(dashboard)/dashboard/accounting/reports/financial-statements/financial-statement-lines-table.tsx','components/dashboard/__tests__/TransactionHistoryWorkbenchShell.test.tsx','components/DataTableComponents/__tests__/TableDateRangeAdoption.contract.test.ts'];");
source=source.replace("'16 structured findings'","findings.length+' structured findings'");
source=source.replace('const review=`','let review=`');
const insert=String.raw`
const currentCheck=read(path.join(__dirname,'current-finance-verified.json'));
if(currentCheck.status!=='passed')throw new Error('Final finance verification is not passing');
const latestType=read(path.join(__dirname,'concurrent-final-typecheck.json'));
if(latestType.status!=='passed')throw new Error('Latest configured type check is not passing');
const previousBinding=read(path.join(__dirname,'concurrent-finance-recheck-source-binding.json'));
const preCorrectionDrift=Object.entries(previousBinding.before).filter(([p,hash])=>{const item=coverage.files.find(f=>f.path===p);return item?.sha256&&item.sha256!==hash&&!changedByThisRun.slice(0,12).includes(p);}).map(([p,hash])=>({path:p,sha256:hash}));
const finalBinding=read(path.join(__dirname,'current-finance-verified-source-binding.json'));
const afterVerificationDrift=Object.entries(finalBinding.after).filter(([p,hash])=>fs.existsSync(path.join(root,p))&&sha(fs.readFileSync(path.join(root,p)))!==hash).map(([p])=>p);
const concurrency={recordedAt:now,preCorrectionDrift,coEditedFiles:[{path:'components/finance/FinanceCommandCenterDashboard.tsx',auditChange:'Only adds dashboard-table-pagination to the existing footer; other changes belong to the concurrent workstream.'}],currentFinanceCheck:currentCheck.id,changedDuringFinanceCheck:currentCheck.changedDuringCheck,afterVerificationDrift,latestTypeCheck:latestType.id,changedDuringTypeCheck:latestType.changedDuringCheck,note:'All evidence belongs to its captured working-tree snapshot. Earlier checks do not automatically validate later edits.'};
write('evidence/concurrency-review.json',concurrency);
review=review.replace('The repository type check and Prisma schema validation pass.','The configured TypeScript check and Prisma schema validation pass.');
review=review.replace('test file was added. Every API handler was inspected.','files were added to the register: one new test and 13 previously omitted localization/validation/root-test files. A generated seed-image manifest was identified and excluded. Every API handler was inspected.');
review=review.replace('Verification used the installed local dependency graph,', 'Type checking follows tsconfig.json, whose exclusions include tests, scripts and many legacy modules. Passing does not mean every inventoried file was type checked.\n\nVerification used the installed local dependency graph,');
review=review.replace('| Final repository type check | Passed | evidence/final-complete-typecheck.json |','| Latest configured type check | Passed; source timing details below | evidence/concurrent-final-typecheck.json |\n| Recheck after concurrent edits | Four failures reproduced, then corrected | evidence/concurrent-finance-recheck.json |\n| Current finance/table/governance checks | '+currentCheck.summary.passedTests+' tests passed in '+currentCheck.summary.passedSuites+' suites | evidence/current-finance-verified.json |');
review=review.replace('## Findings\n','## Working-tree changes during verification\n\nOther work changed six files after the earlier checks, including X1 observations and finance/mobile layouts. Those edits were preserved. A targeted recheck found four failures; F17 records the class and test corrections. The final finance check records before/after source fingerprints. The latest type-check snapshot and any changes during it are listed in evidence/concurrency-review.json. Class-only source edits and test corrections made during that check are separately verified by the focused run. Earlier passing results are evidence for their earlier snapshots.\n\n'+(afterVerificationDrift.length?'Files changed again after final finance verification: '+afterVerificationDrift.join(', ')+'. Their later versions are not certified by this run.\n\n':'No further inventoried source drift was observed after the final finance check.\n\n')+'## Findings\n');
`;
if(!source.includes('const currentCheck=read('))source=source.replace("write('REVIEW.md',review);",insert+"\nwrite('REVIEW.md',review);");
fs.writeFileSync(finalizeFile,source);
console.log('Added F17 and final source-binding/report checks.');
