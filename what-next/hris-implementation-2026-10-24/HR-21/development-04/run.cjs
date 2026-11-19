const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const crypto = require('node:crypto'), assert = require('node:assert/strict'), ts = require('typescript');
const base = __dirname, root = process.cwd(), baseline = process.env.HRIS_ADMISSION_BASELINE === '1';
const resultPath = path.join(base, baseline ? 'baseline-results.json' : 'results.json');
const sourceFiles = ['lib/security/auth-session.ts', 'services/security/step-up-auth.service.ts', 'services/_shared/protect.ts', 'actions/security/step-up-auth.actions.ts', 'actions/hris/employee.actions.ts', 'actions/hris/compensation.actions.ts'];
const sourcePath = relative => baseline && sourceFiles.includes(relative) ? path.join(base, relative.replaceAll('/', '__') + '.baseline') : path.join(root, relative);
let sourceHashes = {};
if (fs.existsSync(resultPath)) fs.copyFileSync(resultPath, path.join(base, 'prior-' + Date.now() + '.json'));
fs.writeFileSync(resultPath, JSON.stringify({status: 'IN_PROGRESS', startedAt: new Date().toISOString()}));
const steps = [], failures = []; let db, org, other, users = [], cleaned = false;
async function check(name, fn) {
  try { await fn(); steps.push(name); }
  catch (e) { failures.push({name, error: e.name, message: e.message}); }
}
function denied(result, code) { assert.equal(result.success, false); assert.equal(result.code, code); assert.equal(result.data, null); }
async function main() {
  try {
    if (process.env.HRIS_CORRECTNESS_DATABASE_URL !== 'postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public') throw Error('Owned database required');
    sourceHashes = Object.fromEntries(sourceFiles.map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(sourcePath(f))).digest('hex')]));
    process.env.AUTH_SECRET = crypto.randomBytes(48).toString('hex');
    process.env.NEXTAUTH_URL = 'http://127.0.0.1:35579'; process.env.NEXT_PUBLIC_BASE_URL = process.env.NEXTAUTH_URL;
    delete process.env.GOOGLE_CLIENT_ID; delete process.env.GOOGLE_CLIENT_SECRET;
    global.fetch = async () => { throw Error('External network disabled'); };
    const resolve = Module._resolveFilename;
    Module._resolveFilename = function(request, parent, ...rest) {
      const adapters = {'@/prisma/db': 'db.cjs', 'next/headers': 'headers.cjs', 'next/cache': 'cache.cjs', 'server-only': 'server-only.cjs'};
      if (adapters[request]) request = path.join(base, adapters[request]);
      else if (request.startsWith('@/')) request = path.join(root, request.slice(2));
      return resolve.call(this, request, parent, ...rest);
    };
    require.extensions['.ts'] = function(module, filename) {
      const relative = path.relative(root, filename);
      if (relative.startsWith('..') || path.isAbsolute(relative) || relative.includes('node_modules')) throw Error('Unexpected TS source');
      module._compile(ts.transpileModule(fs.readFileSync(sourcePath(relative.replaceAll('\\', '/')), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText, filename);
    };
    db = require('./db.cjs').db;
    const {auth} = require('@/lib/auth'), {hashPassword} = require('@/lib/password');
    const {requireSession, requireFreshAuth} = require('@/lib/security/auth-session');
    const {stepUpWithPasswordAction} = require('@/actions/security/step-up-auth.actions');
    const {withHeaders} = require('./headers.cjs');
    const people = require('@/actions/hris/employee.actions');
    const compensation = require('@/actions/hris/compensation.actions');
    const handoff = require('@/actions/hris/payroll-handoff.actions');
    org = 'hr21step-' + crypto.randomUUID(); other = org + '-other'; users = [org + '-manager', org + '-reviewer'];
    const password = crypto.randomBytes(30).toString('hex');
    const permissions = ['hris.people.read', 'hris.people.manage', 'hris.handoff.read', 'EMPLOYEE_SALARY_READ'];
    for (const id of [org, other]) await db.organization.create({data: {id, slug: id, name: 'Synthetic assurance employer', country: 'CM', requestedModules: ['payroll']}});
    for (const id of users) {
      await db.user.create({data: {id, email: id + '@example.invalid', name: 'Synthetic assurance actor', organizationId: org, emailVerified: true, isVerified: true}});
      await db.role.create({data: {organizationId: org, code: id, nameEn: 'Synthetic assurance role', permissions, users: {connect: {id}}}});
      await db.account.create({data: {userId: id, accountId: id, providerId: 'credential', password: await hashPassword(password)}});
    }
    const cookies = [];
    async function login(index) {
      const response = await auth.handler(new Request(process.env.NEXTAUTH_URL + '/api/auth/sign-in/email', {method: 'POST', headers: {'Content-Type': 'application/json', Origin: process.env.NEXTAUTH_URL, 'Sec-Fetch-Site': 'same-origin', 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Dest': 'empty'}, body: JSON.stringify({email: users[index] + '@example.invalid', password})}));
      assert.equal(response.status, 200);
      const parts = response.headers.getSetCookie(); assert.ok(parts.some(c => c.split('=')[0].endsWith('.session_data')));
      return parts.map(c => c.split(';')[0]).join('; ');
    }
    cookies.push(await login(0), await login(1));
    const run = (i, fn) => withHeaders(new Headers({cookie: cookies[i]}), fn);
    const verified = () => run(0, () => stepUpWithPasswordAction({password}));
    const session = (await run(0, requireSession)).claims;
    const updateSession = data => db.session.update({where: {id: session.sessionId}, data});
    const clearAssurance = () => updateSession({assuranceVerifiedAt: null, assuranceMethod: null, assuranceOrganizationId: null, assuranceLevel: 0, assuranceFailureCount: 0, assuranceLockedUntil: null});
    const input = {employeeNumber: 'SYNTHETIC', displayName: 'Synthetic development employee', hireDate: '2026-01-01', countryCode: 'CM', createOnly: true, idempotencyKey: org + '-profile'};
    const foreign = await db.payrollEmployee.create({data: {organizationId: other, employeeNumber: 'FOREIGN', displayName: 'Other synthetic employee', hireDate: new Date('2026-01-01'), countryCode: 'CM'}});
    await check('anonymous-step-up-denied', async () => denied(await withHeaders(new Headers(), () => stepUpWithPasswordAction({password})), 'AUTH_REQUIRED'));
    await check('login-alone-cannot-mutate-hr', async () => { denied(await run(0, () => people.upsertHrisEmployeeProfileAction(input)), 'FRESH_AUTH_REQUIRED'); assert.equal(await db.payrollEmployee.count({where: {organizationId: org}}), 0); });
    await check('invalid-and-oversized-password-denied', async () => { denied(await run(0, () => stepUpWithPasswordAction({password: ''})), 'VALIDATION_ERROR'); denied(await run(0, () => stepUpWithPasswordAction({password: 'x'.repeat(1025)})), 'VALIDATION_ERROR'); denied(await run(0, () => stepUpWithPasswordAction({password: 'incorrect'})), 'INVALID_CREDENTIALS'); await assert.rejects(() => run(0, requireFreshAuth), {name: 'FreshAuthRequiredError'}); });
    await check('password-assurance-uses-server-session-and-tenant', async () => { const success = await run(0, () => stepUpWithPasswordAction({password, organizationId: other, userId: users[1], sessionId: 'forged'})); assert.equal(success.success, true); const row = await db.session.findUniqueOrThrow({where: {id: session.sessionId}}); assert.equal(row.assuranceOrganizationId, org); assert.equal(row.assuranceFailureCount, 0); assert.equal(row.assuranceLevel, 1); });
    await check('five-failures-revoke-earlier-fresh-admission', async () => { for (let i = 0; i < 5; i++) denied(await run(0, () => stepUpWithPasswordAction({password: 'incorrect'})), i === 4 ? 'RATE_LIMITED' : 'INVALID_CREDENTIALS'); denied(await verified(), 'RATE_LIMITED'); await assert.rejects(() => run(0, requireFreshAuth), {name: 'FreshAuthRequiredError'}); denied(await run(0, () => people.upsertHrisEmployeeProfileAction(input)), 'FRESH_AUTH_REQUIRED'); assert.equal(await db.payrollEmployee.count({where: {organizationId: org}}), 0); });
    await updateSession({assuranceLockedUntil: new Date(Date.now() - 1000)});
    await check('expired-throttle-requires-new-password-proof', async () => { await assert.rejects(() => run(0, requireFreshAuth), {name: 'FreshAuthRequiredError'}); assert.equal((await verified()).success, true); });
    await check('assurance-cannot-transfer-to-another-session', async () => { const original = cookies[0]; cookies[0] = await login(0); try { await assert.rejects(() => run(0, requireFreshAuth), {name: 'FreshAuthRequiredError'}); } finally { cookies[0] = original; } });
    await check('assurance-cannot-transfer-to-another-user', async () => { await assert.rejects(() => run(1, requireFreshAuth), {name: 'FreshAuthRequiredError'}); });
    await check('expired-future-and-wrong-tenant-assurance-denied', async () => { for (const patch of [{assuranceVerifiedAt: new Date(Date.now() - 301000)}, {assuranceVerifiedAt: new Date(Date.now() + 60000)}, {assuranceVerifiedAt: new Date(), assuranceOrganizationId: other}]) { await updateSession(patch); await assert.rejects(() => run(0, requireFreshAuth), {name: 'FreshAuthRequiredError'}); } assert.equal((await verified()).success, true); });
    await check('reusable-window-and-server-derived-hr-writes', async () => { const payload = {...input, organizationId: other, actorId: users[1], actorPermissions: ['*']}; const first = await run(0, () => people.upsertHrisEmployeeProfileAction(payload)); assert.equal(first.success, true); const second = await run(0, () => people.upsertHrisEmployeeProfileAction(payload)); assert.equal(second.success, true); assert.equal(first.data.payrollEmployee.id, second.data.payrollEmployee.id); assert.equal(await db.payrollEmployee.count({where: {organizationId: org}}), 1); const event = await db.businessEvent.findFirstOrThrow({where: {organizationId: org, idempotencyKey: input.idempotencyKey}}); assert.equal(event.actorId, users[0]); assert.equal(await db.businessEvent.count({where: {organizationId: org, idempotencyKey: input.idempotencyKey}}), 1); });
    const employee = await db.payrollEmployee.findFirstOrThrow({where: {organizationId: org, employeeNumber: input.employeeNumber}});
    await check('fresh-auth-does-not-replace-permission', async () => { await db.role.updateMany({where: {organizationId: org, code: users[0]}, data: {permissions: ['hris.people.read']}}); try { denied(await run(0, () => people.upsertHrisEmployeeProfileAction({...input, employeeNumber: 'DENIED', idempotencyKey: org + '-denied'})), 'FORBIDDEN'); } finally { await db.role.updateMany({where: {organizationId: org, code: users[0]}, data: {permissions}}); } assert.equal(await db.payrollEmployee.count({where: {organizationId: org}}), 1); });
    await check('foreign-employee-read-and-write-denied', async () => {
      const where = {organizationId: {in: [org, other]}};
      const beforeRows = await db.payrollEmployee.findMany({where, orderBy: {id: 'asc'}}), beforeEvents = await db.businessEvent.count({where});
      denied(await run(0, () => people.getHrisEmployeeProfileAction({employeeId: foreign.id})), 'FORBIDDEN');
      denied(await run(0, () => people.upsertHrisEmployeeProfileAction({...input, employeeNumber: foreign.employeeNumber, employeeId: foreign.id, expectedUpdatedAt: foreign.updatedAt.toISOString(), createOnly: false, idempotencyKey: org + '-foreign'})), 'CONFLICT');
      assert.deepEqual(await db.payrollEmployee.findMany({where, orderBy: {id: 'asc'}}), beforeRows);
      assert.equal(await db.businessEvent.count({where}), beforeEvents);
    });
    const rubrique = await db.payrollRubrique.create({data: {organizationId: org, code: 'SYNTHETIC', label: 'Synthetic allowance', kind: 'EARNING', valueType: 'FIXED_AMOUNT', status: 'ACTIVE'}});
    const assignmentInput = {employeeId: employee.id, rubriqueId: rubrique.id, amount: '1000', currency: 'XAF', effectiveFrom: '2026-01-01', evidenceDocumentHash: 'synthetic-evidence-hash', idempotencyKey: org + '-assignment'};
    await check('native-compensation-proposal-separation-and-contract-gate', async () => { const proposal = await run(0, () => compensation.requestHrisCompensationAssignmentAction(assignmentInput)); assert.equal(proposal.success, true); const assignment = await db.payrollEmployeeRubriqueAssignment.findFirstOrThrow({where: {organizationId: org, employeeId: employee.id}}); const approval = {employeeId: employee.id, assignmentId: assignment.id, decisionReason: 'Synthetic reviewed approval', approvalEvidenceHash: 'synthetic-approval-hash', idempotencyKey: org + '-approval'}; denied(await run(0, () => compensation.approveHrisCompensationAssignmentAction(approval)), 'FORBIDDEN'); assert.equal((await run(1, () => stepUpWithPasswordAction({password}))).success, true); denied(await run(1, () => compensation.approveHrisCompensationAssignmentAction(approval)), 'BUSINESS_RULE_VIOLATION'); assert.equal((await db.payrollEmployeeRubriqueAssignment.findUniqueOrThrow({where: {id: assignment.id}})).status, 'DRAFT'); });
    await check('payroll-handoff-admitted-with-permission-and-module', async () => { assert.equal((await run(0, () => handoff.getPayrollHandoffWorkspaceAction())).success, true); });
    await db.tenantModuleConfiguration.create({data: {organizationId: org, manifestHash: 'synthetic-empty-grants'}});
    await check('module-denial-blocks-employee-mutation', async () => { denied(await run(0, () => people.upsertHrisEmployeeProfileAction({...input, employeeNumber: 'MODULE-DENIED', idempotencyKey: org + '-module-denied'})), 'FORBIDDEN'); assert.equal(await db.payrollEmployee.count({where: {organizationId: org, employeeNumber: 'MODULE-DENIED'}}), 0); });
    await check('module-denial-blocks-compensation-mutation', async () => { const count = await db.payrollEmployeeRubriqueAssignment.count({where: {organizationId: org}}); denied(await run(0, () => compensation.requestHrisCompensationAssignmentAction({...assignmentInput, effectiveFrom: '2027-01-01', idempotencyKey: org + '-module-assignment'})), 'FORBIDDEN'); assert.equal(await db.payrollEmployeeRubriqueAssignment.count({where: {organizationId: org}}), count); });
    await check('module-denial-blocks-payroll-handoff', async () => { denied(await run(0, () => handoff.getPayrollHandoffWorkspaceAction()), 'FORBIDDEN'); const audits = await db.auditLog.findMany({where: {organizationId: org, action: 'MODULE_ENTITLEMENT_ENFORCED'}}); assert.ok(audits.some(a => a.changes?.surface === 'hris.payroll.handoff' && a.changes?.allowed === false)); });
    await check('module-denial-blocks-selected-hr-reads', async () => { denied(await run(0, () => people.getHrisEmployeeProfileAction({employeeId: employee.id})), 'FORBIDDEN'); denied(await run(0, () => compensation.getHrisEmployeeCompensationAction({employeeId: employee.id})), 'FORBIDDEN'); });
    await db.tenantModuleGrant.create({data: {organizationId: org, moduleSlug: 'payroll', status: 'active', source: 'synthetic_fixture', readOnly: true}});
    await check('read-only-payroll-allows-reads-and-denies-writes', async () => { assert.equal((await run(0, () => people.getHrisEmployeeProfileAction({employeeId: employee.id}))).success, true); assert.equal((await run(0, () => compensation.getHrisEmployeeCompensationAction({employeeId: employee.id}))).success, true); denied(await run(0, () => people.upsertHrisEmployeeProfileAction({...input, employeeNumber: 'READONLY-DENIED', idempotencyKey: org + '-readonly'})), 'FORBIDDEN'); denied(await run(0, () => compensation.requestHrisCompensationAssignmentAction({...assignmentInput, effectiveFrom: '2027-01-01', idempotencyKey: org + '-readonly-assignment'})), 'FORBIDDEN'); assert.equal(await db.payrollEmployee.count({where: {organizationId: org, employeeNumber: 'READONLY-DENIED'}}), 0); });
    await db.tenantModuleGrant.deleteMany({where: {organizationId: org}});
    await db.tenantModuleConfiguration.delete({where: {organizationId: org}});
    await check('tenant-change-between-assurance-and-permission-reads-denied', async () => {
      await db.role.create({data: {organizationId: other, code: 'MOVED', nameEn: 'Synthetic second tenant role', permissions, users: {connect: {id: users[0]}}}});
      const owner = require('@/lib/security/auth-session'), originalFresh = owner.requireFreshAuth;
      // Controlled interleaving only: the verifier and permission reads stay real.
      owner.requireFreshAuth = async (...args) => { const result = await originalFresh(...args); await db.user.update({where: {id: users[0]}, data: {organizationId: other}}); return result; };
      try { denied(await run(0, () => people.upsertHrisEmployeeProfileAction({...input, employeeNumber: 'RACE-DENIED', idempotencyKey: org + '-race'})), 'FRESH_AUTH_REQUIRED'); assert.equal(await db.payrollEmployee.count({where: {organizationId: other, employeeNumber: 'RACE-DENIED'}}), 0); }
      finally { owner.requireFreshAuth = originalFresh; await db.user.update({where: {id: users[0]}, data: {organizationId: org}}); }
    });
    await check('company-change-invalidates-earlier-assurance', async () => { await db.user.update({where: {id: users[0]}, data: {organizationId: other}}); try { await assert.rejects(() => run(0, requireFreshAuth), {name: 'FreshAuthRequiredError'}); } finally { await db.user.update({where: {id: users[0]}, data: {organizationId: org}}); } });
    await check('disabled-and-locked-account-cannot-step-up', async () => { await db.user.update({where: {id: users[0]}, data: {isActive: false}}); denied(await verified(), 'AUTH_REQUIRED'); await db.user.update({where: {id: users[0]}, data: {isActive: true, isLocked: true, lockedUntil: null}}); try { denied(await verified(), 'AUTH_REQUIRED'); } finally { await db.user.update({where: {id: users[0]}, data: {isLocked: false}}); } });
    await check('step-up-audit-without-password-or-cookie-secrets', async () => { const rows = await db.auditLog.findMany({where: {organizationId: org, action: {in: ['AUTH_STEP_UP_SUCCEEDED', 'AUTH_STEP_UP_FAILED', 'AUTH_STEP_UP_LOCKED']}}}); assert.ok(rows.some(r => r.action === 'AUTH_STEP_UP_SUCCEEDED')); assert.ok(rows.some(r => r.action === 'AUTH_STEP_UP_FAILED')); assert.ok(rows.some(r => r.action === 'AUTH_STEP_UP_LOCKED')); const serialized = JSON.stringify(rows); assert.equal(serialized.includes(password), false); assert.equal(serialized.includes(session.sessionToken), false); });
    await check('revoked-session-cannot-reverify-or-mutate', async () => { await db.session.delete({where: {id: session.sessionId}}); denied(await verified(), 'AUTH_REQUIRED'); denied(await run(0, () => people.upsertHrisEmployeeProfileAction(input)), 'AUTH_REQUIRED'); });
    await check('expired-session-cannot-reverify', async () => { await db.session.updateMany({where: {userId: users[1]}, data: {expiresAt: new Date(0)}}); denied(await run(1, () => stepUpWithPasswordAction({password})), 'AUTH_REQUIRED'); });
  } catch (e) { failures.push({name: 'harness', error: e.name, message: e.message}); }
  finally {
    if (db) {
      try {
        if (org) {
          await db.tenantModuleGrant.deleteMany({where: {organizationId: {in: [org, other]}}});
          await db.tenantModuleConfiguration.deleteMany({where: {organizationId: {in: [org, other]}}});
          await db.payrollEmployeeRubriqueAssignment.deleteMany({where: {organizationId: {in: [org, other]}}});
          await db.payrollEmployee.deleteMany({where: {organizationId: {in: [org, other]}}});
          await db.organization.deleteMany({where: {id: {in: [org, other]}}});
          await db.user.deleteMany({where: {id: {in: users}}});
          for (const model of ['user', 'session', 'account']) assert.equal(await db[model].count({where: model === 'user' ? {id: {in: users}} : {userId: {in: users}}}), 0);
          assert.equal(await db.organization.count({where: {id: {in: [org, other]}}}), 0);
        }
        cleaned = true;
      } catch (e) { failures.push({name: 'cleanup', error: e.name, message: e.message}); }
      await db.$disconnect();
    }
    const passed = cleaned && failures.length === 0 && steps.length === 25;
    fs.writeFileSync(resultPath, JSON.stringify({status: passed ? 'PASS_SCOPED_NATIVE_STEP_UP_ACTIONS' : 'FAILED', baselineReplay: baseline, sourceHashes, completedAt: new Date().toISOString(), steps, failures, cleanupComplete: cleaned, limits: ['Actual native auth and direct server-action invocation; no Next transport/browser claim', 'Guarded Prisma, request headers, server-only and cache revalidation adapters; explicit real-DB interleaving for tenant-race case', 'Synthetic database fixtures only; no deployment or provider claims', 'Compensation proposal and separation/missing-contract denial qualified; full approved-contract lifecycle remains development02 evidence']}, null, 2));
    console.log((passed ? 'PASS_SCOPED_NATIVE_STEP_UP_ACTIONS' : 'FAILED') + '; passed=' + steps.length + '; failures=' + failures.length + '; cleanup=' + cleaned);
    process.exitCode = passed ? 0 : 1;
  }
}
main().then(() => process.exit(process.exitCode ?? 1), () => process.exit(1));
