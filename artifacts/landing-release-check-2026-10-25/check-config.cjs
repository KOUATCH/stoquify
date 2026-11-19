const fs=require('node:fs'),path=require('node:path');
require('@next/env').loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const {buildReleaseSecretPreflight}=require('../../scripts/release-secret-preflight.js');
const report=buildReleaseSecretPreflight({release:'on'});
fs.writeFileSync(path.join(__dirname,'local-release-config.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({scope:'Local configuration only, not the deployment host',summary:report.summary,blockers:report.blockers,warnings:report.warnings}));
