// Exercise the real fallback in separate Node processes; no network listener.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
if(process.argv[2]==='child') {
  require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'node'}});
  const {TrafficLimiter,trafficIdentity}=require('../lib/security/traffic-limiter.ts');
  const limiter=new TrafficLimiter();let accepted=0;
  for(let i=0;i<200;i++) accepted+=Number(limiter.check('192.0.2.10',0).allowed);
  const workloads=[];
  for(const [tills,requestsPerTill] of [[4,12],[16,12],[16,18]]) {
    const shared=new TrafficLimiter();let allowed=0;
    for(let i=0;i<tills*requestsPerTill;i++)allowed+=Number(shared.check('192.0.2.20',0).allowed);
    workloads.push({tills,requestsPerTill,allowed,denied:tills*requestsPerTill-allowed});
  }
  const forged=new Headers({'x-forwarded-for':'198.51.100.2','x-real-ip':'192.0.2.10'});
  assert.equal(trafficIdentity(forged,'x-real-ip'),'192.0.2.10');
  assert.equal(trafficIdentity(forged),'198.51.100.2');
  assert.equal(limiter.check('192.0.2.10',1000).allowed,false);
  assert.equal(limiter.check('192.0.2.10',60000).allowed,true);
  console.log(JSON.stringify({accepted,workloads,trustedHeaderIgnoresForwarded:true,legacySpoofable:true}));
} else {
  const [output]=process.argv.slice(2);if(!output||fs.existsSync(output))throw new Error('New evidence file required');
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE)$/i.test(key)));
  const workers=[];for(let i=0;i<2;i++){
    const result=spawnSync(process.execPath,[__filename,'child'],{cwd:path.resolve(__dirname,'..'),env,encoding:'utf8',timeout:60000,windowsHide:true});
    assert.equal(result.status,0,result.stderr);workers.push(JSON.parse(result.stdout));
  }
  assert.equal(workers.reduce((sum,w)=>sum+w.accepted,0),400);
  const report={source:'Real TrafficLimiter in two independent processes; synthetic request counts',workers,aggregateAllowed:400,configuredPerProcessLimit:200,distributedGate:false,outagePolicyApproved:false,productionTouched:false,limits:'No ingress deployed; 12/18 requests per till per minute are assumptions. No rate-limit tuning or shared-store policy chosen.'};
  fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
}
