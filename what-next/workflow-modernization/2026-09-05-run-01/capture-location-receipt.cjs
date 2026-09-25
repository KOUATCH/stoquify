const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const result = name => {
  const file = path.join(__dirname, 'evidence', name);
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { file: 'evidence/' + name, sha256: hash(file), passed: report.numPassedTests, failed: report.numFailedTests, suites: report.numTotalTestSuites, success: report.success };
};
const receipt = {
  createdAt: new Date().toISOString(),
  workflowIds: ['MD-LOC-03','MD-LOC-04'],
  before: result('location-manager-before.json'),
  after: result('location-manager-after.json'),
  sources: ['services/location/location.service.ts','services/location/__tests__/legacy-location-manager.service.test.ts','actions/locations/updateLocationById.ts','actions/locations/__tests__/update-location-by-id.test.ts'].map(file=>({file,sha256:hash(path.join(root,file))})),
  lint: {exitCode:0, toolChunk:'b451fc',scope:'changed service and new regression file'},
  typecheck: {exitCode:0,session:66025,toolChunk:'aba48d',scope:'combined repository typecheck after PO editor/detail and location corrections'},
  boundary:'Database collaborators mocked. This proves service decisions and action delegation, not PostgreSQL row-lock/concurrent identity-state safety or a complete browser workflow. No schema or live customer changes.',
};
if(receipt.before.failed!==4||receipt.after.failed!==0||receipt.after.passed!==11) throw new Error('Unexpected evidence counts');
fs.writeFileSync(path.join(__dirname,'evidence/location-manager-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({written:'evidence/location-manager-receipt.json',beforeFailed:receipt.before.failed,afterPassed:receipt.after.passed}));
