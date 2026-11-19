// Run the actual first stage of release:artifact -> build. Keep enforcement and record blockers.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const {state,environment}=require('./environment.cjs'),s=state(),pkg=JSON.parse(fs.readFileSync(path.join(s.candidate,'package.json')));
assert.equal(pkg.scripts.build,'npm run release:secrets:preflight && npm run build:linted');
assert.equal(pkg.scripts['release:secrets:preflight'],'node scripts/release-secret-preflight.js --mode fail --release auto --out what-next/release-secret-preflight.md --json-out what-next/release-secret-preflight.json');
assert.ok(!pkg.scripts['prerelease:secrets:preflight']&&!pkg.scripts['postrelease:secrets:preflight']);
const npm=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const run=spawnSync(process.execPath,[npm,'run','release:secrets:preflight'],{cwd:s.candidate,env:environment('production'),windowsHide:true,encoding:'utf8',timeout:60000,maxBuffer:5e6});
fs.writeFileSync(path.join(__dirname,'artifact-preflight.log'),String(run.stdout||'')+String(run.stderr||''));
const report=JSON.parse(fs.readFileSync(path.join(s.candidate,'what-next/release-secret-preflight.json')));fs.writeFileSync(path.join(__dirname,'production-policy.json'),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(__dirname,'artifact-preflight-results.json'),JSON.stringify({exitCode:run.status,releaseEnforced:report.summary.releaseEnforced,status:report.summary.status,blockers:report.blockers,artifactPrepared:false,productionAccess:false,liveProvidersEnabled:false,policyOverridden:false,scope:'Actual production-mode prerequisite executed using synthetic process-only secrets and loopback origin. Artifact preparation stops here if blocked.'},null,2));
console.log(JSON.stringify({exitCode:run.status,summary:report.summary,blockers:report.blockers}));process.exitCode=run.status??1;
