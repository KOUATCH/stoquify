const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const recordName = 'CAMEROON_FIRST_VERIFICATION_2026-10-07.json';
if (fs.existsSync(path.join(__dirname, recordName))) throw new Error('Preserve the existing continuation receipt.');
const register = read('execution-register.json');
const expectedIds = Array.from({ length: 38 }, (_, i) => `R${String(i).padStart(2, '0')}`);
if (JSON.stringify(register.packages.map(p => p.id)) !== JSON.stringify(expectedIds)) throw new Error('Unexpected package inventory');
const priorContracts = register.packages.map(({ id, dependencies, acceptance, releaseGate }) => ({ id, dependencies, acceptance, releaseGate }));
const typecheck = read('runner/modernization-types-final-20261007.result.json');
const unit = read('runner/modernization-focused-final-20261007.jest.json');
const postgres = read('runner/hris-time-postgres-20261007.jest.json');
const lint = read('runner/modernization-lint-final-20261007.result.json');
const database = read('runner/hris-time-postgres-bootstrap-20261007.json');
const sourceFiles = [
  'components/hris/HrisApprovalInbox.tsx', 'components/hris/__tests__/HrisApprovalInbox.test.tsx',
  'services/hris/operational-time.service.ts', 'services/hris/__tests__/operational-time.service.test.ts',
  'services/hris/__tests__/operational-time-decision-concurrency.test.ts',
  'tests/postgres/ui-workflow/hris-time-decision.test.ts', 'services/accounting/close-evidence-workflow.service.ts',
  'prisma/schema.prisma', 'jest.config.ts', 'jest.ui-workflow-postgres.config.cjs', 'tsconfig.json',
];
const packages = ['next', 'react', 'typescript', 'prisma', '@prisma/client', 'better-auth', 'tailwindcss', 'jest', '@playwright/test'];
const installedVersions = Object.fromEntries(packages.map(name => [name, JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'))).version]));
const now = new Date().toISOString();
const record = {
  recordedAt: now,
  branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  baselineHead: '62a56036', initialDirtyWorktree: { modifiedTracked: 331, untrackedEntries: 4092 },
  scope: 'Cameroon-first continuation; bounded fixes and source discovery, not programme completion or release qualification',
  installedVersions,
  ordinaryFocusedTests: { passed: unit.numPassedTests, failed: unit.numFailedTests, suites: unit.numPassedTestSuites, success: unit.success },
  postgresTests: { passed: postgres.numPassedTests, failed: postgres.numFailedTests, suites: postgres.numPassedTestSuites, success: postgres.success, database: database.databaseName, server: database.identity.version, migrated: database.migrationExitCode === 0, migrations: database.migrations.length },
  lint: { exitCode: lint.code, timedOut: lint.timedOut },
  typecheck: { exitCode: typecheck.code, timedOut: typecheck.timedOut, initialStaleClientErrors: 2118, postGenerationErrors: 2, finalReceipt: 'runner/modernization-types-final-20261007.result.json' },
  sourceHashes: sourceFiles.map(file => ({ file, sha256: hash(file) })),
  hashScope: 'Post-verification fingerprints for continuation; not a frozen full-application build candidate.',
  untrackedSourceRepair: { file: 'services/accounting/close-evidence-workflow.service.ts', beforeSha256: 'e88991915a535677cd06a17ae4f97ec7cc52a770c2eb9ca4c40ddf0ecd2d7c49', change: 'Only narrow false and UNAVAILABLE literals with as const. All inherited source preserved and not staged wholesale.' },
  checkpoints: { a1Red: '97eef25b', a1Green: '48252ea2', a2Red: '41a6496d', a2Green: '6f7f6741' },
  limitations: ['Shared-balance concurrency across distinct requests and adjustments remains open.', 'PostgreSQL tests use controlled stale reads, not explicit UPDATE lock-wait observation.', 'Manager-scope resolution is mocked in PostgreSQL tests; not full authorization qualification.', 'Authenticated browser, integrated build/package and recovery were not qualified in this continuation.', 'Country source discovery is not legal validation; no statutory rates or activation changed.'],
  production: { deployed: false, applicationDatabaseChanged: false, realPayments: false, statutoryFilings: false },
};
fs.writeFileSync(path.join(__dirname, recordName), JSON.stringify(record, null, 2) + '\n');

const updates = {
  R00: 'October 7 user scope recorded: Cameroon first, full phased implementation across sessions, pre-production/demo data. Existing work preserved; accountable external reviewers remain unassigned.',
  R01: `October 7: regenerated stale local Prisma client; repaired two close-evidence literal-inference errors without changing query values. Final full no-emit typecheck exit ${typecheck.code}; targeted lint exit ${lint.code}; ${unit.numPassedTests} focused tests passed. Integrated build/package and browser remain unqualified.`,
  R08: 'October 7: HR time-request terminal decision is conditionally claimed before transactional effects. Four isolated PostgreSQL stale-read/rollback tests pass; broader database boundaries and shared leave-balance concurrency remain open.',
  R10: 'October 7: HR approval UI truthfully handles denied/stale-auth action results; existing action/service guard regressions pass. This is not a complete role/tenant/surface matrix.',
  R16: 'October 7: approval failure drafts preserved; same-request time decisions guarded and atomic effects verified on isolated PostgreSQL. Joiner-to-leaver journeys, shared leave-balance concurrency and browser acceptance remain open.',
  R18: 'October 7: official Cameroon CGI 2026, Finance Law, OHADA, Labour Code and CNPS sources refreshed to documented limits; provisional CEMAC gaps recorded. No rate activation or legal qualification.',
  R24: 'October 7: safe EN/FR approval error messages, draft retention, pending and success behavior verified by component tests. Complete localization, accessibility and authenticated browser journeys remain open.',
};
for (const item of register.packages) {
  if (!updates[item.id]) continue;
  item.progress = `September 30 record: ${item.progress} ${updates[item.id]}`;
  if (item.status === 'NOT_STARTED') item.status = 'PARTIAL';
  item.evidence = [...new Set([...item.evidence, 'CAMEROON_FIRST_CONTINUATION_2026-10-07.md', recordName,
    ...(item.id === 'R18' ? ['CAMEROON_SOURCE_REFRESH_2026-10-07.md'] : [])])];
}
const byId = Object.fromEntries(register.packages.map(item => [item.id, item]));
byId.R01.nextAction = 'Run a fresh integrated build/package and controlled authenticated browser; retain the passing October 7 compiler receipt separately from historical build evidence.';
byId.R16.nextAction = 'Complete shared employee/policy leave-balance transactions and race tests, then verify EN/FR approval recovery and full employee lifecycle in the browser.';
byId.R18.nextAction = 'Archive/hash refreshed official sources, compare provision-level country parameters, and obtain qualified review and independent fixtures before capability activation.';
register.updatedAt = now;
register.latestContinuation = { date: '2026-10-07', programme: 'CAMEROON_FIRST_CONTINUATION_2026-10-07.md', verification: recordName, sourceResearch: 'CAMEROON_SOURCE_REFRESH_2026-10-07.md', releaseApproved: false };
const receipts = fs.readdirSync(path.join(__dirname, 'runner')).filter(file => file.endsWith('-20261007.result.json'));
for (const file of receipts) {
  const relative = `runner/${file}`;
  if (!register.verification.some(item => item.file === relative)) register.verification.push({ file: relative, ...read(relative) });
}
register.additionalVerificationArtifacts = [...new Set([...register.additionalVerificationArtifacts, recordName,
  'runner/modernization-focused-final-20261007.jest.json', 'runner/hris-time-postgres-20261007.jest.json', 'runner/hris-time-postgres-bootstrap-20261007.json'])];
if (JSON.stringify(priorContracts) !== JSON.stringify(register.packages.map(({ id, dependencies, acceptance, releaseGate }) => ({ id, dependencies, acceptance, releaseGate })))) throw new Error('Package contract changed');
for (const item of register.packages) for (const file of item.evidence) if (!fs.existsSync(path.resolve(__dirname, file))) throw new Error(`Missing evidence ${file}`);
fs.writeFileSync(path.join(__dirname, 'execution-register.json'), JSON.stringify(register, null, 2) + '\n');
let markdown = fs.readFileSync(path.join(__dirname, 'EXECUTION_REGISTER.md'), 'utf8');
markdown = markdown.replace(/^Updated: .*$/m, `Updated: ${now}`);
for (const item of register.packages) {
  markdown = markdown.replace(new RegExp(`^\\| ${item.id} \\|.*$`, 'm'), `| ${item.id} | ${item.title} | ${item.status} | ${item.nextAction} |`);
}
const summary = `## October 7 Cameroon-first continuation\n\n[Execution details](CAMEROON_FIRST_CONTINUATION_2026-10-07.md), [verification receipt](${recordName}) and [official-source research](CAMEROON_SOURCE_REFRESH_2026-10-07.md).\n\nApproval failure recovery and conditional HR time decisions are implemented. ${unit.numPassedTests} focused tests and ${postgres.numPassedTests} isolated PostgreSQL tests passed; targeted lint exit ${lint.code}, full typecheck exit ${typecheck.code}. No full build or authenticated browser pass is claimed. Shared leave-balance concurrency, broader package acceptance and statutory validation remain open.\n\nSeptember build/data findings below retain their original evidence boundary. The historical register builder/validator regenerates September contents: do not rerun it over this continuation without first preserving and merging this addendum.\n\n`;
markdown = markdown.replace('## Material data findings', summary + '## Material data findings');
fs.writeFileSync(path.join(__dirname, 'EXECUTION_REGISTER.md'), markdown);
console.log(JSON.stringify({ packageCount: register.packages.length, tests: record.ordinaryFocusedTests, postgres: record.postgresTests, lint: record.lint, typecheck: record.typecheck, installedVersions }));
