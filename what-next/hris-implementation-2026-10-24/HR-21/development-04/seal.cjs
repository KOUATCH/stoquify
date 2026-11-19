const fs = require('node:fs'), crypto = require('node:crypto');
const base = 'what-next/hris-implementation-2026-10-24/HR-21/development-04';
const owned = [
  'lib/security/auth-session.ts', 'services/security/step-up-auth.service.ts', 'services/_shared/protect.ts',
  'actions/security/step-up-auth.actions.ts', 'actions/hris/employee.actions.ts', 'actions/hris/compensation.actions.ts',
  'lib/security/__tests__/auth-session.test.ts', 'services/security/__tests__/step-up-auth.service.test.ts',
  'services/_shared/__tests__/protect.test.ts', 'actions/security/__tests__/step-up-auth.actions.test.ts',
  'actions/hris/__tests__/employee.actions.test.ts', 'actions/hris/__tests__/compensation.actions.test.ts',
  'actions/hris/__tests__/lifecycle.actions.test.ts', 'actions/hris/__tests__/payment-destination.actions.test.ts',
  'actions/hris/__tests__/time-leave.actions.test.ts', 'jest.hris-admission.config.cjs',
];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const text = file => fs.readFileSync(base + '/' + file, 'utf8');
const result = JSON.parse(text('results.json')), baseline = JSON.parse(text('baseline-results.json'));
if (result.status !== 'PASS_SCOPED_NATIVE_STEP_UP_ACTIONS' || result.steps.length !== 25 || result.failures.length || !result.cleanupComplete || result.baselineReplay) throw Error('Incomplete current native evidence');
for (const [file, expected] of Object.entries(result.sourceHashes)) if (hash(file) !== expected) throw Error('Native source drift: ' + file);
const expectedFailures = ['five-failures-revoke-earlier-fresh-admission', 'expired-throttle-requires-new-password-proof', 'module-denial-blocks-employee-mutation', 'module-denial-blocks-compensation-mutation', 'module-denial-blocks-selected-hr-reads', 'read-only-payroll-allows-reads-and-denies-writes', 'tenant-change-between-assurance-and-permission-reads-denied', 'disabled-and-locked-account-cannot-step-up'];
if (!baseline.baselineReplay || baseline.status !== 'FAILED' || !baseline.cleanupComplete || JSON.stringify(baseline.failures.map(f => f.name).sort()) !== JSON.stringify(expectedFailures.sort())) throw Error('Unexpected baseline reproduction');
const checks = [
  ['native-final.log', /PASS_SCOPED_NATIVE_STEP_UP_ACTIONS; passed=25; failures=0; cleanup=true/, 'Native auth and PostgreSQL', 'node ' + base + '/run.cjs', 25],
  ['security-unit.log', /49 passed/, 'Mocked security', 'node node_modules/jest/bin/jest.js --config jest.hris-admission.config.cjs --runInBand --no-cache --runTestsByPath ' + owned.filter(f => f.includes('__tests__') && !/lifecycle|payment-destination|time-leave/.test(f)).join(' '), 49],
  ['adjacent-actions-final.log', /16 passed/, 'Mocked adjacent HR actions', 'node node_modules/jest/bin/jest.js --config jest.hris-admission.config.cjs --runInBand --no-cache --runTestsByPath actions/hris/__tests__/lifecycle.actions.test.ts actions/hris/__tests__/payment-destination.actions.test.ts actions/hris/__tests__/time-leave.actions.test.ts actions/hris/__tests__/approval-inbox.actions.test.ts', 16],
  ['typecheck-final.log', /Diagnostics: 0/, 'Bounded types', 'node what-next/hris-implementation-2026-10-24/typecheck.cjs ' + base + '/typecheck-final.log ' + owned.filter(f => f.endsWith('.ts')).join(' '), 0],
  ['workflow.log', /Workflow contract passed/, 'Workflow', 'npm run agent:workflow:check', 0],
  ['diffcheck.log', /^\s*$/, 'Owned diff', 'git diff --check -- ' + owned.join(' '), 0],
  ['postgresql-stop.log', /server stopped/, 'Owned database stopped', 'pg_ctl -D <owned hris-postgres-20261024 directory> -w stop -m fast', 0],
];
for (const [file, pattern] of checks) if (!pattern.test(text(file))) throw Error('Missing successful check: ' + file);
if (!text('INDEPENDENT-REVIEW.md').includes('Final verdict: PASS_SCOPED')) throw Error('Independent review missing');
const register = 'docs/ecc/cameroon-blueprint-execution-2026-10-07.md';
const heading = '## 2026-10-26 — HR-21 development continuation 04';
if (!fs.readFileSync(register, 'utf8').includes(heading)) fs.appendFileSync(register, '\n\n' + heading + '\n\nStatus: VERIFIED_SCOPED for password re-verification and selected protected HR actions. Fixed retained-assurance lock bypass and expired-throttle resurrection, mismatched user/company across guard reads, selected employee/compensation payroll-module bypasses, and locked-account error classification. Preserved reusable five-minute session/company assurance. Saved-source native replay reproduced eight failing assertions; current native matrix25/25, focused mocks49/49, adjacent HR mocks16/16, bounded types0, workflow/diff checks passed. Independent reviewer PASS_SCOPED after strengthening handoff and foreign-edit evidence. Synthetic fixtures cleaned and owned database stopped. [Result](../../what-next/hris-implementation-2026-10-24/HR-21/development-04/RESULT.md), [review](../../what-next/hris-implementation-2026-10-24/HR-21/development-04/INDEPENDENT-REVIEW.md), [evidence](../../what-next/hris-implementation-2026-10-24/HR-21/development-04/evidence.json). Overall HR21 IMPLEMENTED_PENDING_VERIFICATION. Next: isolated rendered application journeys with actual password prompts and protected-action recovery; no waiting for hosting. No full Next/browser, provider, deployment or human acceptance claim. Other legacy HR surfaces are not certified by these selected module gates.\n');
const dependencies = ['lib/auth.ts', 'lib/security/rbac.ts', 'lib/security/auth-credentials.ts', 'lib/password.ts', 'services/modules/module-entitlement.service.ts', 'actions/hris/payroll-handoff.actions.ts', 'actions/hris/__tests__/approval-inbox.actions.test.ts', 'services/payroll/employee.service.ts', 'services/hris/compensation.service.ts', 'services/payroll/compensation.service.ts', 'jest.payroll-trust-spine.config.cjs', 'jest.setup.ts', 'docs/ecc/command-registry.json'];
const artifacts = fs.readdirSync(base).filter(f => f !== 'evidence.json').map(f => base + '/' + f).filter(f => fs.statSync(f).isFile());
const files = [...new Set([...owned, ...dependencies, register, ...artifacts])];
fs.writeFileSync(base + '/evidence.json', JSON.stringify({slice: 'HR-21-development-04', status: 'VERIFIED_SCOPED', overallHrisStatus: 'IMPLEMENTED_PENDING_VERIFICATION', baselineRevision: '9ab93a2a1d81e37ef7e0b10357885b48a3bc5886', sealedAt: new Date().toISOString(), ownedFiles: owned, independentReview: 'PASS_SCOPED_SOURCE_AND_RETAINED_EVIDENCE', checks: checks.map(([artifact,,lane,command,passed]) => ({lane, command, artifact: base + '/' + artifact, passed, exitCode: 0})), nativeSteps: result.steps, baselineFailingAssertions: expectedFailures, cleanupComplete: true, limits: result.limits, hashes: Object.fromEntries(files.map(f => [f, hash(f)]))}, null, 2));
console.log('Sealed development04: ' + files.length + ' hashes');
