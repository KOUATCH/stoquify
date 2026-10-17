// Read-only evaluation of the unchanged bundled pack. No approval is submitted.
const f = require('./statement-recipient-fixtures.cjs');
const {fs, path, crypto, root, db, assert} = f;
const files = ['services/regulatory/country-packs/cameroon.ts', 'services/payroll/payroll-country-pack-review-intake.service.ts', 'services/payroll/payroll-country-pack-fixture-runner.ts', 'services/payroll/payroll-statutory-scenario-coverage.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const before = hashes();
try {
  const {cameroonCountryPack} = require(path.join(root, files[0]));
  const {buildPayrollCountryPackReviewIntakeCertificate} = require(path.join(root, files[1]));
  const certificate = buildPayrollCountryPackReviewIntakeCertificate({basePack: cameroonCountryPack, proposedPack: cameroonCountryPack, targetFamilies: ['CNPS_PENSION', 'CNPS_FAMILY_ALLOWANCE', 'CNPS_OCCUPATIONAL_RISK', 'IRPP_PERIOD'], reviewTopicEvidence: [], generatedAt: new Date().toISOString()});
  assert.equal(certificate.status, 'BLOCKED');
  const after = hashes(); assert.deepEqual(after, before);
  const receipt = {at: new Date().toISOString(), readOnly: true, unchangedPack: true, noApprovalSubmitted: true, sourceBefore: before, sourceAfter: after, sourceStable: true, certificate};
  const file = 'payroll-country-review-' + crypto.randomUUID() + '.json';
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({file, status: certificate.status, families: certificate.targetFamilies.map(row => ({family: row.family, missingTopics: row.missingReviewTopics, issueCodes: row.proposedIssueCodes})), blockerCodes: [...new Set(certificate.blockers.map(row => row.code))]}));
} finally {db.$disconnect();}
