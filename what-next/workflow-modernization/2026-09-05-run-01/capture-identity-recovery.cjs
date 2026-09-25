const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const first = read('evidence/identity-resend-after-01.json');
const final = read('evidence/identity-resend-shared-after.json');
if (first.numFailedTests !== 1 || first.numPassedTests !== 55 || final.numFailedTests !== 0 || final.numPassedTests !== 52) throw new Error('Unexpected test outcomes');
const files = ['services/users/user-identity.service.ts', 'services/security/public-identity-abuse.service.ts', 'actions/users/resendVerificationCode.ts', 'components/auth/v2/VerifyV2Form.tsx', 'components/auth/EmailVerificationForm.tsx', 'hooks/useRegisterWorkflow.ts', 'scripts/public-identity-abuse-gate.js', 'services/users/__tests__/user-identity.service.test.ts', 'services/security/__tests__/public-identity-abuse.service.test.ts', 'actions/users/__tests__/public-identity-actions.test.ts', 'components/auth/v2/__tests__/VerifyV2Form.recovery.test.tsx', 'scripts/__tests__/public-identity-abuse-gate.test.js'];
const receipt = {
  capturedAt: new Date().toISOString(), source: files.map(file => ({ path: file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') })),
  before: { artifact: 'evidence/identity-resend-before.json', expectedMissingFunctionFailures: 7, unselectedTests: 31, elapsedSeconds: 4.046 },
  firstAfter: { artifact: 'evidence/identity-resend-after-01.json', passed: 55, failed: 1, elapsedSeconds: 22.552, failure: 'Existing test expected the old registration message; expectation corrected to the implemented delivery-neutral wording.' },
  final: { artifact: 'evidence/identity-resend-shared-after.json', passed: 52, suites: 3, elapsedSeconds: 12.106, composition: '38 identity service tests plus 14 required shared module/action regressions. The other 18 resend action/policy/component/gate tests passed in firstAfter with unchanged relevant sources.' },
  distinctResendBatchTestsPassed: 56,
  additionalSharedModuleTestsPassed: 14,
  lint: { changedSourceAndTests: 10, exitCode: 0, session: 90849, hookFollowup: { session: 37224, exitCode: 0 }, legacyAdapterFollowup: { session: 82066, exitCode: 0 } },
  typecheck: { initialCombinedAfterClone: { session: 36224, exitCode: 1, error: 'ApplicationErrorCode was broader than the clone action FORBIDDEN discriminant.' }, correctedCombined: { command: 'node node_modules/typescript/bin/tsc --noEmit --pretty false', session: 53828, exitCode: 0, toolChunk: '51cc74' } },
  publicIdentitySourceGate: { checks: 16, status: 'ready', releaseEnforcement: 'off', warning: 'Hash-secret warning comes from deliberately empty environment supplied to this source-shape check; it is not an assertion about the owned app secret.' },
  laterLowImpactChanges: ['Registration toast selects existing local EN/FR copy instead of the English server message.', 'Unused legacy form delegates to the real v2 flow instead of simulating verification. Both included in final typecheck and scoped lint; legacy adapter has no current production route caller.'],
  boundary: 'Unit checks use mocked provider/database collaborators. No real mail sent. OTP component replaced by a plain input only in component tests; browser evidence exercises the actual control separately. Provider acceptance is not proof of inbox delivery.',
  runtime: 'See environment lane for separately bound real PostgreSQL reset and actual browser outcomes; not inferred from these tests.'
};
fs.writeFileSync(path.join(__dirname, 'evidence/identity-recovery-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ distinctResendTests: 56, sharedModuleTests: 14, typecheck: 'passed', mailSent: false }));
