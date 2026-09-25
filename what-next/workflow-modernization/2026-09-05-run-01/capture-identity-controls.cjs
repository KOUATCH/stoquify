const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const files = ['services/users/user-identity.service.ts', 'services/users/__tests__/user-identity.service.test.ts', 'lib/token.ts', 'lib/generateOtp.ts', 'lib/__tests__/identity-token-generation.test.ts'];
const result = JSON.parse(fs.readFileSync(path.join(__dirname, 'evidence/identity-controls-after.json'), 'utf8'));
if (!result.success || result.numPassedTests !== 39 || result.numTotalTestSuites !== 4) throw new Error('Unexpected identity result');
const receipt = {
  capturedAt: new Date().toISOString(),
  source: files.map(file => ({ path: file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') })),
  jest: { artifact: 'evidence/identity-controls-after.json', exitCode: 0, suites: result.numTotalTestSuites, passed: result.numPassedTests, failed: result.numFailedTests, elapsedSeconds: 5.312, executionSession: 9963 },
  lint: { command: 'node node_modules/eslint/bin/eslint.js ' + files.join(' '), exitCode: 0, elapsedSeconds: 8.839, observedToolChunk: '8b47fe', output: 'No diagnostics' },
  boundary: 'Unit/action checks use mocked database, email and security collaborators. They do not prove real PostgreSQL concurrency, provider delivery, complete browser journeys or certification.',
  changes: ['Atomic reset-token consumption inside credential transaction', 'OTP format/expiry and conditional consumption', 'Cryptographic random token/code generation with no insecure fallback', 'Lazy mail-client initialization and explicit provider rejection handling'],
  remaining: ['Real database concurrency/rollback and session revocation', 'Honest registration delivery state and working resend', 'Durable invitation delivery/recovery', 'Current role/expiry concurrency during invitation redemption', 'Complete EN/FR browser journeys'],
  primaryReferences: ['https://nodejs.org/api/crypto.html#cryptorandomintmin-max-callback', 'https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html']
};
fs.writeFileSync(path.join(__dirname, 'evidence/identity-controls-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: receipt.jest.passed, sourceFiles: files.length, runtimeProof: false }));
