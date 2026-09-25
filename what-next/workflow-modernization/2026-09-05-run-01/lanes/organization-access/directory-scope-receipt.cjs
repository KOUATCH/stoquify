const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../../../../..');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const service = 'services/organization/organization-settings.service.ts';
const test = 'services/organization/__tests__/organization-management-scope.service.test.ts';
const prior = 'services/organization/__tests__/organization-settings.service.test.ts';
const receipt = {
  evidenceDate: new Date().toISOString(), finding: 'OA-F01',
  status: 'corrected_mocked_service_verified_not_browser_or_real_database_verified',
  productionFiles: [service], testFiles: [test],
  before: {serviceSha256:'9ef5618a09e0d12d06769ab2ac51d2fec8c20ca40915212906f587277eed158a',testSha256:'8ab48376d8fa78a693690de35fa5535893a75745b0efad8f2c29eab9af9d4e6f',command:'node node_modules/jest/bin/jest.js --runInBand --runTestsByPath '+test+' --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/lanes/organization-access/directory-scope-before.json',exitCode:1,suites:1,failed:10,passed:4,seconds:3.523,output:'functions exec session 93944 / output chunk 88cace',artifactWrite:'EPERM after tests completed; requested Jest JSON file was not saved; this receipt records the actual tool output, not a reconstructed Jest result.'},
  after: {command:'node node_modules/jest/bin/jest.js --runInBand --runTestsByPath '+test+' '+prior,exitCode:0,suites:2,passed:15,failed:0,seconds:6.999,output:'functions exec session 93321 / output chunk 007691',files:[service,test,prior].map(file=>({file,sha256:hash(file)}))},
  actualChecks:['Canonical read and update scoped to current organization','COMPANY_READ and organizations/settings aliases scoped','Wildcard tenant administrator is not global scope','Missing/deleted current tenant returns no foreign records and performs no payment aggregation','PAID nondeleted payment sum restricted to returned current-tenant IDs','Full management-row counts and committed data contract preserved','Genuine no-payment result is zero; organization/payment lookup errors propagate','Existing administrator provisioning contract preserved'],
  sourceAfterTestChanges:[{file:test,change:'Explicit it.each<[string, string[]]> tuple annotation only after the 15-pass run; behavior unchanged. Parent coordinated typecheck pending.',testAtExecutionSha256:'8ab48376d8fa78a693690de35fa5535893a75745b0efad8f2c29eab9af9d4e6f'}],
  notExecuted:['Browser','Real PostgreSQL','Mutation of tenant data','Provider or external messages','Global authority redesign','Full typecheck after this source change'],
  remaining:['Create-organization service creates organization plus administrator role, without assigning owner/membership/switch; separate source finding OA-CREATE remains.','Directory UI wording and export behavior need actual tenant-separated browser proof.','No service-level claim that a caller-supplied organization ID is authenticated: the existing action derives ctx.orgId and asserts requested tenant; that boundary remains unchanged.']
};
fs.writeFileSync(path.join(__dirname,'DIRECTORY_SCOPE_VERIFICATION.json'),JSON.stringify(receipt,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'DIRECTORY_SCOPE_REMEDIATION.md'),[
  '# Organization directory tenant-scope correction','',
  'OA-F01 is corrected in the organization directory service. Ordinary organization read/update permission, legacy aliases and a tenant administrator wildcard no longer select all organizations. The query always includes the server-supplied organization ID, so contact details, operational counts and paid-revenue aggregation remain in that tenant.', '',
  'Only services/organization/organization-settings.service.ts changed in production: the conditional broad where clause became { id: input.organizationId, deletedAt: null }. The function signature, row data, tenant action authorization, permission aliases and wildcard definitions are unchanged. The existing public action first checks requested organization access, then passes ctx.orgId; this service change preserves that boundary.', '',
  'The new query-sensitive two-tenant regression reproduced 10 failures and 4 passes before the correction (3.523 s), including foreign rows when the current organization was missing/deleted. Afterward the new suite and existing administrator provisioning suite passed all 15 checks (6.999 s). Errors remain errors; only a successful payment query with no paid records produces zero. No database/browser/customer/provider operation occurred.', '',
  'The baseline Jest JSON output failed with EPERM after the tests finished. DIRECTORY_SCOPE_VERIFICATION.json accurately records the command output and source hashes; it does not claim the missing JSON artifact exists.', '',
  'Creating another organization has a separate incomplete owner/membership/navigation handoff. This correction does not silently keep cross-tenant exposure to make that created organization visible. A deliberate future global-admin product boundary would need its own explicit authority and entry point.', '',
  'Runtime tenant-separated directory and CSV verification remain pending. This bounded service result is not whole organization/access workflow completion.'
].join('\n')+'\n');
const regPath=path.join(__dirname,'WORKFLOW_REGISTER.json');
const reg=JSON.parse(fs.readFileSync(regPath,'utf8'));
reg.coverage.tenantDirectoryDefectsCorrected=1;
const finding=reg.findings.find(x=>x.id==='OA-F01');
if(finding){finding.status='corrected_mocked_service_verified';finding.remediation='DIRECTORY_SCOPE_REMEDIATION.md';finding.verification='DIRECTORY_SCOPE_VERIFICATION.json';}
const workflow=reg.workflows.find(x=>x.id==='OA-DIRECTORY');
if(workflow){workflow.implementationStatus='implemented_tenant_scope_corrected';workflow.reviewStatus='focused_service_regression_passed';workflow.evidence.push({kind:'mocked_service_tests',source:'DIRECTORY_SCOPE_VERIFICATION.json',result:'15 passed in two suites; before 10 failed / 4 passed'});}
reg.verification={executed:[{scope:'OA-F01 tenant directory only',receipt:'DIRECTORY_SCOPE_VERIFICATION.json',passed:15,failed:0}],notExecuted:['Browser visits','Real DB reads/writes','External messages'],status:'One scoped service correction verified; remaining workflows retain provisional source-only status'};
fs.writeFileSync(regPath,JSON.stringify(reg,null,2)+'\n');
console.log(JSON.stringify({finding:'OA-F01',passed:15,productionSourceHash:hash(service)}));
