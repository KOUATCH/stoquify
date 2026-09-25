/* Counts, hashes and public diagnostic evidence only; never reads fixture credentials. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const directory = __dirname;
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const auth = JSON.parse(fs.readFileSync(path.join(directory, 'auth-bundling-browser.json'), 'utf8'));
const accounting = JSON.parse(fs.readFileSync(path.join(directory, 'accounting-stop-preview-browser.json'), 'utf8'));
const names = [
  '../AUTH_SSR_DIAGNOSIS.md', 'auth-react-ssr-probe.cjs', 'auth-react-ssr-probe.json',
  'auth-bundling-browser.cjs', 'auth-bundling-browser.json',
  'auth-bundling-browser-cold-timeout.json', 'auth-bundling-browser-webpack-runtime-failure.json',
  'auth-bundling-browser-success-locator-ambiguity.json',
  'accounting-stop-preview-browser.cjs', 'accounting-stop-preview-browser.json',
  'transfer-after-auth-bundling.png', 'modules-after-auth-bundling.png',
  'accounting-stop-control-en.png', 'accounting-stop-preview-en.png',
  'accounting-stop-control-fr.png', 'accounting-stop-preview-fr.png', 'selected-development-server-output.txt',
];
const receipt = {
  boundAt: new Date().toISOString(),
  classification: 'SCOPED_ISOLATED_AUTH_AND_ACCOUNTING_PREVIEW_EVIDENCE',
  productionApproval: false,
  auth: {
    passed: auth.observations.filter(check => check.passed).length,
    failed: auth.observations.filter(check => !check.passed).length,
    failure: auth.failure,
    startedAt: auth.startedAt, completedAt: auth.completedAt,
    sourceStableDuringCheck: auth.sourceStable,
    sourcesAsTested: auth.afterSources, generatedBundleAsTested: auth.bundle,
    usefulTransferResultMs: auth.observations.find(check => check.check === 'transfer_ssr_and_client_render').usefulResultMs,
    syntheticEffects: 'The final passed attempt saved one draft and assured one real session. An earlier selector-failed attempt also saved one draft before failing. Real sign-ins created normal sessions. No activation, stop-policy change or transfer mutation.',
  },
  accountingPreview: {
    passed: accounting.results.filter(check => check.passed).length,
    failed: accounting.results.filter(check => !check.passed).length,
    failure: accounting.failure, locales: accounting.results.map(check => check.locale),
    startedAt: accounting.startedAt, completedAt: accounting.completedAt,
    sourceStableDuringCheck: accounting.sourceStable,
    sourcesAsTested: accounting.afterSources,
    persistedConfigurationAndCommandCountsUnchanged: accounting.persistedStateUnchanged,
    activated: false,
  },
  interpretation: [
    'Counts refer to eight auth observations and two localized preview cases, not ten independent end-to-end customer journeys.',
    'All six listed screenshots were visually inspected as actual rendered application content; no synthetic image edits.',
    'Cold development transfer compilation took 177.8 seconds. Preserved timeout and transient development Webpack failures precede the serialized successful warm check. No production performance certification.',
    'Source versions are those tested at the recorded timestamps. Subsequent history pagination and manual-journal recovery edits require separately bound coverage; this manifest does not claim those changes were exercised.',
    'All run01 artifacts remain unchanged. No production or customer environment was activated.',
  ],
  artifacts: names.map(name => {
    const file = path.resolve(directory, name);
    const stat = fs.statSync(file);
    return { path: name, bytes: stat.size, modifiedAt: stat.mtime.toISOString(), sha256: hash(file) };
  }),
};
fs.writeFileSync(path.join(directory, 'AUTH_AND_ACCOUNTING_VERIFICATION_BINDINGS.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ authPassed: receipt.auth.passed, accountingPreviewPassed: receipt.accountingPreview.passed, artifacts: receipt.artifacts.length, output: 'AUTH_AND_ACCOUNTING_VERIFICATION_BINDINGS.json' }));
