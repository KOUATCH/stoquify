// Preparation only: enumerate every required successor proof before any execution.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const file=path.join(__dirname,'qualification-contract.json'),contract=JSON.parse(fs.readFileSync(file));
const credentials=require('./run-credential-probes.cjs').specifications.map(row=>'R06-C-login-'+row[0]),origins=require('./run-origin-probes.cjs').caseIds;
const infrastructure=['R06-I-database-unavailable','R06-I-normal-configuration-recovery'];
const expiry=['R06-E-retained-list-sessions','R06-E-retained-list-accounts','R06-E-retained-unlink-account'];
const browser=['en','fr'].flatMap(locale=>[...['authorized','restored'].flatMap(state=>['','-refresh','-locale-away','-locale-return'].map(suffix=>'R06-UI-'+locale+'-'+state+suffix)),'R06-UI-'+locale+'-invalidated-reload']);
assert.equal(credentials.length,10);assert.equal(origins.length,24);assert.equal(browser.length,18);
contract.browser.proof='Exact compiled profile action and original bytes/browser stream bind root Flight actor, organization and snapshot to the consumer; displayed email/fields/formatted checkedAt and fresh explicit refresh/locale transitions prove use. OrganizationId and snapshotHash are Flight provenance, not claimed DOM fields. Cancellations remain reported.';
contract.rawResults={receipt:'runtime-result.json',candidateIdField:'candidateId',artifactSha256Field:'artifactSha256',coreArrayPath:['protectedCore','checks'],expandedArrayPath:['expanded','checks'],expiryArrayPath:['expanded','expiry','checks'],browserArrayPath:['expanded','browserDiagnostic','checks'],expectedRawCases:107};
contract.credentialCaseIds=credentials;contract.originCaseIds=origins;contract.infrastructureCaseIds=infrastructure;contract.retainedExpiryCaseIds=expiry;contract.browserCaseIds=browser;
contract.mandatoryProofs=[...[...credentials,...origins,...infrastructure].map(caseId=>({receipt:'runtime-result.json',arrayPath:['expanded','checks'],caseId})),...expiry.map(caseId=>({receipt:'runtime-result.json',arrayPath:['expanded','expiry','checks'],caseId})),...browser.map(caseId=>({receipt:'runtime-result.json',arrayPath:['expanded','browserDiagnostic','checks'],caseId}))];assert.equal(contract.mandatoryProofs.length,57);assert.equal(new Set(contract.mandatoryProofs.map(row=>row.caseId)).size,57);
fs.writeFileSync(file,JSON.stringify(contract,null,2)+'\n');console.log(JSON.stringify({original:contract.originalRequirements.length,core:contract.protectedCore.requirements.length,mandatory:contract.mandatoryProofs.length,raw:107}));
