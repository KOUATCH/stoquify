// Evidence-only reconciliation. Preserve every original outcome; no application or database operations.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const packet = __dirname;
const hashes = [];
function read(relative) {
  const full = path.resolve(packet, relative);
  assert(full.startsWith(packet + path.sep));
  const bytes = fs.readFileSync(full);
  hashes.push({ path: relative, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  return JSON.parse(bytes);
}
const main = read('runtime-result-attempt02.json');
const recovery = read('recovery-result-attempt03.json');
const browser = read('browser-only-result-attempt04.json');
const expiry = read('expiry-supplement-result-attempt02.json');
const intended = read('inventory/test-case-map.json');
const build = read('build-result-attempt02.json');
assert.equal(build.passed, true);
for (const run of [main, recovery, browser, expiry]) {
  assert.equal(run.candidateId, build.candidateId);
  assert.equal(run.artifactSha256, build.artifactSha256);
  assert(run.finishedAt);
}
const expectedIds = intended.cases.map(c => c.id).sort();
assert.equal(expectedIds.length, 58);
assert.deepEqual(main.auth.checks.map(c => c.id).sort(), expectedIds);
assert.equal(new Set(expectedIds).size, 58);
const browserIds = expectedIds.filter(id => id.startsWith('R06-UI-'));
assert.equal(browserIds.length, 6);
assert.deepEqual(browser.browserDiagnostic.checks.map(c => c.id).sort(), browserIds);
const credentials = ['R06-C-login-positive-utc', 'R06-C-login-wrong-password-utc', 'R06-C-login-inactive', 'R06-C-login-locked-future'];
const origins = ['R06-C-origin-cookie-bearing', 'R06-C-origin-browser-navigate', 'R06-C-origin-browser-cors'];
assert.deepEqual(recovery.checks.map(c => c.id).sort(), [...credentials, ...origins].sort());
assert.equal(expiry.passed, true);
assert.equal(expiry.checks.length, 3);
assert(expiry.checks.every(c => c.passed));
const reference = (receipt, row) => ({ receipt, caseId: row.id, passed: row.passed, error: row.error ?? null });
const requirements = main.auth.checks.map(original => {
  let latest = [reference('runtime-result-attempt02.json', original)];
  let classification = 'original_observation_retained';
  if (original.id === 'R06-C-login') {
    latest = recovery.checks.filter(c => credentials.includes(c.id)).map(c => reference('recovery-result-attempt03.json', c));
    classification = 'successor_four_credential_cases_with_explicit_utc_and_exact_bounds';
  } else if (original.id === 'R06-C-origin') {
    latest = recovery.checks.filter(c => origins.includes(c.id)).map(c => reference('recovery-result-attempt03.json', c));
    classification = 'actual_browser_origin_probes_and_cookie_bearing_control_original_native_client_expectation_preserved';
  } else if (original.id.startsWith('R06-UI-')) {
    latest = [reference('browser-only-result-attempt04.json', browser.browserDiagnostic.checks.find(c => c.id === original.id))];
    classification = 'all_six_latest_browser_cases_used_without_cherry_picking';
  } else assert.equal(original.passed, true, 'Unexpected unreconciled original failure: ' + original.id);
  return { id: original.id, original: reference('runtime-result-attempt02.json', original), latest, classification, currentlySatisfied: latest.every(c => c.passed === true) };
});
assert.equal(requirements.filter(r => r.classification === 'original_observation_retained').length, 50);
const counts = checks => ({ total: checks.length, passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed).length });
const result = {
  at: new Date().toISOString(), packageId: 'P04-R06',
  candidateId: build.candidateId, artifactSha256: build.artifactSha256,
  reconciliationCompleted: true,
  passed: requirements.every(r => r.currentlySatisfied) && browser.passed === true,
  qualificationDisposition: requirements.every(r => r.currentlySatisfied) && browser.passed === true ? 'await_independent_final_review' : 'blocked',
  originalMainRun: { ...counts(main.auth.checks), passed: main.passed, unchanged: true },
  recoveryChecks: counts(recovery.checks),
  recoveryBrowserAttempt03: counts(recovery.browserDiagnostic.checks),
  latestBrowserAttempt04: counts(browser.browserDiagnostic.checks),
  supplementaryRetainedExpiry: { ...counts(expiry.checks), additionalToLogicalGroups: true, cases: expiry.checks.map(c => reference('expiry-supplement-result-attempt02.json', c)) },
  logicalRequirements: { total: 58, satisfied: requirements.filter(r => r.currentlySatisfied).length, unresolved: requirements.filter(r => !r.currentlySatisfied).length },
  requirements, inputs: hashes,
  limits: ['This mapping does not change any raw result or certify production readiness.', 'Independent outcome review and owned cleanup are separate gates.', 'Original native-client Origin expectation is preserved; actual browser outcomes determine the unresolved origin requirement.'],
};
fs.writeFileSync(path.join(packet, 'recovery-reconciliation-attempt04.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ reconciliationCompleted: true, qualificationPassed: result.passed, original: result.originalMainRun, logicalRequirements: result.logicalRequirements, browser: result.latestBrowserAttempt04 }));
// Exit zero means the evidence was reconciled, not that qualification passed.
