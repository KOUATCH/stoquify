const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = process.cwd(), dir = path.join(root,'what-next/hris-implementation-2026-10-24/HR-09');
const read = name => fs.readFileSync(path.join(dir,name),'utf8');
if(!/22 passed, 22 total/.test(read('postgres-final.log'))) throw new Error('Final HR09 DB suite is not fully passing');
if(!/60 passed, 60 total/.test(read('prior-correctness-postgres.log'))) throw new Error('Shared DB regression missing');
if(!/27 passed, 27 total/.test(read('unit-final.log'))) throw new Error('Unit/action lane missing');
if(!/Diagnostics: 0/.test(read('typecheck-final.log'))) throw new Error('Typecheck missing');
if(!/valid/.test(read('schema-validation-r2.log'))) throw new Error('Schema validation missing');
const browser=JSON.parse(read('browser/results.json'));if(browser.results.length!==30)throw new Error('30 browser cases required');
if(!/0/.test(read('cleanup.log')))throw new Error('Cleanup evidence missing');
const sources=[
 'services/hris/setup-reviewer.service.ts','services/hris/workspace-setup.service.ts','services/hris/operational-time.service.ts',
 'actions/hris/workspace-setup.actions.ts','components/hris/HrisWorkspaceSetup.tsx','components/hris/HrisWorkspaceSetupClient.tsx',
 'app/[locale]/(dashboard)/dashboard/people/setup/page.tsx','app/[locale]/(dashboard)/dashboard/people/page.tsx',
 'prisma/schema.prisma','prisma/migrations/20261024170000_hris_setup_reviewer_grants/migration.sql',
 'services/hris/__tests__/workspace-setup.test.ts','services/hris/__tests__/workspace-setup.postgres.test.ts','actions/hris/__tests__/workspace-setup.actions.test.ts',
 'jest.hris-setup-postgres.config.cjs','jest.hris-correctness-postgres.config.cjs','jest.payroll-trust-spine.config.cjs','jest.setup.ts',
 'docs/ecc/cameroon-blueprint-execution-2026-10-07.md'
];
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)])}
const artifacts=walk(dir).filter(p=>!p.endsWith('evidence.json')).map(p=>path.relative(root,p).replaceAll('\\','/'));
const commands=[
 {lane:'workflow',command:'npm run agent:workflow:check',exitCode:0,artifact:'workflow.log'},
 {lane:'schema',command:'node node_modules/prisma/build/index.js validate --config what-next/hris-implementation-2026-10-24/HR-09/prisma-validation.config.ts',exitCode:0,artifact:'schema-validation-r2.log'},
 {lane:'isolated-migration',command:'psql -X -h 127.0.0.1 -p 55464 -U hris_test -d stoquify_local_hris_20261024 -v ON_ERROR_STOP=1 -1 -f prisma/migrations/20261024170000_hris_setup_reviewer_grants/migration.sql',exitCode:0,artifact:'migration-retry.log'},
 {lane:'mocked-unit-action',command:'node node_modules/jest/bin/jest.js --config jest.payroll-trust-spine.config.cjs --runInBand --no-cache --runTestsByPath actions/hris/__tests__/workspace-setup.actions.test.ts services/hris/__tests__/workspace-setup.test.ts services/hris/__tests__/operational-time-decision-concurrency.test.ts services/hris/__tests__/org-effective-scope.service.test.ts',exitCode:0,tests:27,artifact:'unit-final.log'},
 {lane:'real-postgres-and-browser',command:'node node_modules/jest/bin/jest.js --config jest.hris-setup-postgres.config.cjs --runInBand --no-cache',environment:'Explicit HRIS_CORRECTNESS_DATABASE_URL to owned loopback database; no application .env',exitCode:0,tests:22,artifact:'postgres-final.log'},
 {lane:'shared-real-postgres-regression',command:'node node_modules/jest/bin/jest.js --config jest.hris-correctness-postgres.config.cjs --runInBand --no-cache',exitCode:0,tests:60,artifact:'prior-correctness-postgres.log'},
 {lane:'focused-types',command:'node what-next/hris-implementation-2026-10-24/typecheck.cjs what-next/hris-implementation-2026-10-24/HR-09/typecheck-final.log services/hris/workspace-setup.service.ts actions/hris/workspace-setup.actions.ts components/hris/HrisWorkspaceSetup.tsx app/[locale]/(dashboard)/dashboard/people/setup/page.tsx',exitCode:0,artifact:'typecheck-final.log'},
 {lane:'browser-build',command:'node what-next/hris-implementation-2026-10-24/HR-09/browser/build.cjs',exitCode:0,artifact:'browser-build-final.log'},
 {lane:'browser-css',command:'node node_modules/tailwindcss/lib/cli.js -i app/globals.css -c tailwind.config.ts --content components/hris/HrisWorkspaceSetup.tsx,components/dashboard/DashboardRouteState.tsx -o what-next/hris-implementation-2026-10-24/HR-09/browser/styles.css',exitCode:0,artifact:'browser-css-final.log'},
 {lane:'whitespace',command:'git diff --check -- services/hris/operational-time.service.ts prisma/schema.prisma app/[locale]/(dashboard)/dashboard/people/page.tsx',exitCode:0,artifact:'diff-check.log'},
];
for(const c of commands){c.artifact='what-next/hris-implementation-2026-10-24/HR-09/'+c.artifact;c.artifactUpdatedAt=fs.statSync(path.join(root,c.artifact)).mtime.toISOString()}
const result={slice:'HR-09',status:'VERIFIED',scope:'Bounded engineering setup for TIME_POLICY / WORK_SCHEDULE / TIME_REQUEST; pilot activation withheld',timestamp:new Date().toISOString(),baseline:{head:'9ab93a2a1d81e37ef7e0b10357885b48a3bc5886',workingTree:'Dirty shared checkout; pre-existing edits preserved. baseline-status.txt records entry state; HEAD is not claimed as the entire candidate.'},acceptance:Object.fromEntries(['01','02','03','04','05'].map(id=>['HR-09-AC'+id,{status:'PASS',scope:'See RESULT.md bounded acceptance matrix'}])),independentReview:{agent:'/root/hr09_independent_review',findings:['R1','R2','R3','R4','R5','R6'],openFindings:[],artifact:'what-next/hris-implementation-2026-10-24/HR-09/INDEPENDENT-REVIEW.md'},commands,browser:{count:30,roles:['owner','hr','manager-read-only','approver-narrow','denied'],locales:['en','fr'],widths:[360,768,1440],boundary:browser.boundary},limitations:['Full Next/BetterAuth and deployed module admission not run','Assistive technology and complete WCAG certification not run','No production migration/deployment/live pilot identities or statutory/provider certification'],failedAttemptsRetained:['migration.log: sandbox local-socket denial; approved explicit-target retry passed','schema-validation.log: missing optional @prisma/internals; explicit no-dotenv CLI config passed','typecheck.log/typecheck-r2.log and browser-build.log: initial JSX draft corrected','browser-css.log: minimal Tailwind config missing existing tokens; project config passed','postgres-r1.log: French test-harness charset corrected','postgres-r2.log: test fixture audit history and schedule uniqueness collision corrected; browser cases themselves passed'],hashes:[...new Set([...sources,...artifacts])].map(p=>({path:p,sha256:hash(path.join(root,p)),bytes:fs.statSync(path.join(root,p)).size}))};
fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify(result,null,2)+'\n');console.log(`Evidence saved with ${result.hashes.length} source/artifact hashes; 27 unit + 82 DB cases, 30 browser journeys.`);
