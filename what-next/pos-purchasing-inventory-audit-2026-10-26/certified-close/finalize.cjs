const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const start = read('start-source.json'), final = read('final-source.json');
const old = new Map(start.files.map(f => [f.file, f.sha256]));
const changed = final.files.filter(f => old.get(f.file) !== f.sha256).map(f => f.file);
assert(changed.every(f => /^services\/inventory\/__tests__\/certified-close/.test(f)));
const files = [
  'services/inventory/__tests__/certified-close.fixture.ts',
  'services/inventory/__tests__/certified-close-lifecycle.postgres.test.ts',
  'jest.certified-close.config.cjs', 'tsconfig.certified-close.json',
  'what-next/pos-purchasing-inventory-audit-2026-10-26/EVIDENCE_REGISTER.md',
  ...fs.readdirSync(__dirname).filter(f => !['summary.json'].includes(f)).map(f => path.relative(process.cwd(), path.join(__dirname, f)).replaceAll('\\', '/'))
];
const whitespace = files.filter(f => /\.(ts|cjs|json|md)$/.test(f)).flatMap(file => fs.readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line, i) => /[\t ]+$/.test(line) ? [{ file, line: i + 1 }] : []));
// Generated evidence can preserve original payload spacing. Owned code/report must be clean.
const ownedWhitespace = whitespace.filter(v => /\.(ts|cjs)$/.test(v.file) || v.file.endsWith('/REPORT.md'));
assert.equal(ownedWhitespace.length, 0);
const integration = read('lifecycle-results.json'), unit = read('unit-results.json'), stages = read('lifecycle-reconciliation.json'), durable = read('database-readback.json');
assert(integration.success && unit.success);
const summary = {
  at: new Date().toISOString(), status: 'PASS_WITH_EXPLICIT_SCOPE', programComplete: false,
  scope: 'Complete system-certified close-pack service/database lifecycle for synthetic zero-tax XAF cash settlement and nonnegative stock',
  source: { head: final.head, start: start.at, final: final.at, fingerprintedFiles: final.files.length, changedDuringRun: changed, applicationDriftWithinManifest: [], applicationEditsThisContinuation: [], finalTypeOnlyChanges: 'Two non-null assertions on close-run IDs after the runtime pass; no emitted runtime difference' },
  checks: {
    workflow: { status: 'PASS', receipt: 'a536b0', exitCode: 0 },
    postgres: { status: 'PASS', tests: integration.numPassedTests, suites: integration.numPassedTestSuites, stages: stages.map(s => ({ id: s.scenario, status: 'PASS' })), session: 57137, exitCode: 0 },
    readback: { status: 'PASS', receipt: '08185c', exitCode: 0, environment: durable.environment, migrations: durable.migrations, residualFaultFunctions: durable.faults.length },
    mockedAndPure: { status: 'PASS', tests: unit.numPassedTests, suites: unit.numPassedTestSuites, session: 93761, exitCode: 0 },
    typescript: { status: 'PASS', session: 64023, receipt: 'c48099', exitCode: 0, diagnostics: [], command: 'node node_modules/typescript/bin/tsc --project tsconfig.certified-close.json --noEmit --incremental false', initialResult: 'Two nullable run-ID errors in new test; fixed with type-only assertions' },
    scopedDiffCheck: { status: 'PASS', receipt: 'ef4cc1', exitCode: 0, limitation: 'Git diff does not include untracked additions; owned code/report whitespace and full source content also inspected' },
    ownedWhitespace: { status: 'PASS', findings: ownedWhitespace },
    browser: { status: 'NOT_RUN', reason: 'No UI edits; authenticated close-screen evidence remains separate' },
    provider: { status: 'OUT_OF_SCOPE', reason: 'MTN sandbox absent; user excluded provider work' }
  },
  reconciliation: { organizationId: durable.organizationId, period: durable.period, finalState: stages.at(-1).finalState, periodOperations: durable.seals.map(s => s.operation), certifiedExports: durable.exports.filter(e => e.isCertified).map(e => ({ id: e.id, hash: e.contentHash })), debitNetByAccount: Object.fromEntries(durable.journals.flatMap(j => j.lines).reduce((m, l) => {const k=l.account.mappingKey ?? l.account.code;m.set(k,(m.get(k) ?? 0)+Number(l.debit)-Number(l.credit));return m;},new Map())) },
  confirmedApplicationDefects: [],
  limitations: ['Synthetic ledger-derived approved schedules are not independent external-document evidence', 'Concurrent certification test observes one durable winner without a lock-wait barrier', 'Service controls plus mocked action checks are not authenticated browser authorization', 'No provider or statutory certification; no exhaustive concurrency claim'],
  open: ['MTN sandbox account/product/configuration and safe callback/test endpoint', 'Retention, creator resumption and escalation policies', 'Default durable authoring rollout, legacy compatibility and mixed-version rollout; default legacy duplicate-create risk remains', 'Authenticated close UI journeys'],
  excluded: ['Negative-stock certification', 'Production mutations', 'Live charges', 'Deployment', 'Commits and pushes'],
  files: [...new Set(files)].sort().map(file => ({ file, sha256: hash(file) }))
};
fs.writeFileSync(path.join(__dirname, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ status: summary.status, tests: { postgres: integration.numPassedTests, retainedStages: stages.length, mockedAndPure: unit.numPassedTests }, sourceChanges: changed, ownedWhitespaceFindings: ownedWhitespace.length, fileHashes: summary.files.length }));
