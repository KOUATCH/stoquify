// Qualification only: actual UploadThing HTTP route, synthetic signing key and loopback receiver.
// No product imports, hosted-provider calls, credential-file reads or database writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const crypto = require('node:crypto');
const apiKey = 'sk_p04v02_local_protocol_only_20261109';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const sign = value => 'hmac-sha256=' + crypto.createHmac('sha256', apiKey).update(value).digest('hex');

function request(baseURL, route, method, headers = {}, body) {
  const target = new URL(route, baseURL);
  assert.equal(target.origin, 'https://localhost:3196');
  return new Promise((resolve, reject) => {
    const req = https.request(target, { method, headers, rejectUnauthorized: false, timeout: 20000 }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf8')}));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('P04-V02 provider request timeout')));
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

async function runProviderProtocol({baseURL, authorizedCookie, deniedCookie, authorizedActor, setModuleActive, artifactBinding, privateCanaries, snapshot, outputDir = __dirname}) {
  assert.equal(baseURL, 'https://localhost:3196');
  assert.equal(typeof artifactBinding?.candidateId,'string'); assert(/^[a-f0-9]{64}$/.test(artifactBinding?.artifactDigest||''));
  assert.equal(typeof authorizedCookie, 'string'); assert(authorizedCookie.length > 0);
  assert.equal(typeof deniedCookie,'string'); assert(deniedCookie.length>0);
  assert.equal(typeof authorizedActor?.id,'string'); assert.equal(typeof authorizedActor?.organizationId,'string');
  assert.equal(typeof setModuleActive,'function');
  assert(Array.isArray(privateCanaries) && privateCanaries.length > 0);
  assert.equal(typeof snapshot, 'function');
  const resolvedOutput = path.resolve(outputDir);
  assert(resolvedOutput.startsWith(path.resolve(__dirname) + path.sep), 'Use fresh attempt child of provider evidence');
  assert(!fs.existsSync(resolvedOutput), 'Provider attempt must be fresh');
  fs.mkdirSync(resolvedOutput);
  const observations = [], received = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      let payload; try { payload = JSON.parse(raw); } catch { payload = null; }
      received.push({method: req.method, path: req.url, keyMatchesSynthetic: req.headers['x-uploadthing-api-key'] === apiKey,
        bodySha256: hash(raw), callbackData: payload?.callbackData, fileKey: payload?.fileKey});
      res.writeHead(200, {'content-type':'application/json'}); res.end('{"ok":true}');
    });
  });
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(3198, '127.0.0.1', resolve);});
  let failure = null, moduleWasDisabled = false;
  const callback = {
    status: 'uploaded',
    file: {name:'synthetic.png',size:8,type:'image/png',customId:null,key:'p04v02-protocol-synthetic-file',
      url:'https://example.invalid/synthetic.png',appUrl:'https://example.invalid/synthetic.png',
      ufsUrl:'https://example.invalid/synthetic.png',fileHash:'00000000000000000000000000000000'},
    origin:'http://127.0.0.1:3198',metadata:{qualification:'P04-V02',organizationId:'forged-provider-org',userId:'forged-provider-user'}
  };
  const raw = JSON.stringify(callback), errorRaw = JSON.stringify({fileKey:'p04v02-protocol-synthetic-file',error:'Synthetic isolated provider failure'});
  const route = '/api/uploadthing?slug=itemImageUpload';
  const uploadRaw = JSON.stringify({files:[{name:'synthetic.png',size:8,type:'image/png'}],input:null});
  const middlewareDenied = r => assert.deepEqual(JSON.parse(r.text), {message:'Failed to run middleware'});
  const cases = [
    {id:'public-config-get',method:'GET',route:'/api/uploadthing',status:[200],check:r=>{
      const value=JSON.parse(r.text); assert(Array.isArray(value)); assert.equal(value.length,1); assert.equal(value[0].slug,'itemImageUpload');
    }},
    {id:'public-config-head',method:'HEAD',route:'/api/uploadthing',status:[200],check:r=>assert.equal(r.text,'')},
    {id:'implicit-options',method:'OPTIONS',route:'/api/uploadthing',status:[204],check:r=>assert.match(r.headers.allow||'',/GET/)},
    {id:'unsupported-put',method:'PUT',route,status:[405]},
    {id:'unsupported-delete',method:'DELETE',route,status:[405]},
    {id:'unknown-slug',method:'POST',route:'/api/uploadthing?slug=synthetic-unknown',status:[404]},
    {id:'invalid-action',method:'POST',route:route+'&actionType=forged',status:[400]},
    {id:'missing-discriminator-no-op',method:'POST',route,status:[200],check:r=>assert.equal(r.text,'null')},
    {id:'callback-missing-signature',method:'POST',route,hook:'callback',body:raw,status:[400]},
    {id:'callback-invalid-signature',method:'POST',route,hook:'callback',signature:'hmac-sha256='+ '0'.repeat(64),body:raw,status:[400]},
    {id:'callback-tampered-signed-origin',method:'POST',route,hook:'callback',signature:sign(raw),body:JSON.stringify({...callback,origin:'https://provider-attacker.invalid'}),status:[400]},
    {id:'callback-origin-header-without-signature',method:'POST',route,hook:'callback',origin:'https://api.uploadthing.com',body:raw,status:[400]},
    {id:'callback-valid-signature-invalid-body',method:'POST',route,hook:'callback',signature:sign('{}'),body:'{}',status:[400]},
    {id:'error-hook-missing-signature',method:'POST',route,hook:'error',body:errorRaw,status:[400]},
    {id:'error-hook-invalid-signature',method:'POST',route,hook:'error',signature:'hmac-sha256='+ '0'.repeat(64),body:errorRaw,status:[400]},
    {id:'anonymous-upload-denied',method:'POST',route:route+'&actionType=upload',body:uploadRaw,status:[500],check:middlewareDenied},
    {id:'authorized-legacy-upload-managed-control-only',method:'POST',route:route+'&actionType=upload',body:uploadRaw,cookie:true,status:[500],check:middlewareDenied},
    {id:'read-only-actor-upload-denied',method:'POST',route:route+'&actionType=upload',body:uploadRaw,cookie:'denied',status:[500],check:middlewareDenied},
    {id:'module-disabled-upload-denied',method:'POST',route:route+'&actionType=upload',body:uploadRaw,cookie:true,moduleDisabled:true,status:[500],check:middlewareDenied},
    {id:'foreign-origin-upload-denied',method:'POST',route:route+'&actionType=upload',body:uploadRaw,cookie:true,origin:'https://provider-attacker.invalid',status:[500],check:middlewareDenied},
    {id:'signed-error-hook-positive',method:'POST',route,hook:'error',signature:sign(errorRaw),body:errorRaw,status:[200],check:r=>assert.equal(r.text,'null')},
    {id:'signed-callback-positive',method:'POST',route,hook:'callback',signature:sign(raw),body:raw,status:[200],expectedCallbacks:1,check:r=>assert.equal(r.text,'null')},
    {id:'signed-callback-replay-no-business-effect',method:'POST',route,hook:'callback',signature:sign(raw),body:raw,status:[200],expectedCallbacks:1,check:r=>assert.equal(r.text,'null')}
  ];
  try {
    for (const test of cases) {
      if(test.moduleDisabled){await setModuleActive(false);moduleWasDisabled=true;}
      const before = await snapshot();
      assert(before && typeof before.businessSha256 === 'string', 'Snapshot must classify exact business data independently of auth/audit');
      assert.equal(typeof before.sessionSha256, 'string'); assert.equal(typeof before.auditSha256, 'string');
      const callbackStart = received.length;
      const headers = {'content-type':'application/json'};
      if(test.hook) headers['uploadthing-hook']=test.hook;
      if(test.signature) headers['x-uploadthing-signature']=test.signature;
      if(test.origin) headers.origin=test.origin;
      if(test.cookie) headers.cookie=test.cookie==='denied'?deniedCookie:authorizedCookie;
      const response = await request(baseURL,test.route,test.method,headers,test.body);
      const after = await snapshot();
      const addedAudits=after.auditRows.filter(row=>!before.auditRows.some(old=>old.idHash===row.idHash));
      const oldAuditsUnchanged=before.auditRows.every(old=>after.auditRows.some(row=>row.idHash===old.idHash&&row.rowSha256===old.rowSha256));
      const auditEffectsExpected=test.moduleDisabled ? oldAuditsUnchanged&&addedAudits.length===1&&addedAudits.every(row=>
        row.entityType==='ModuleEntitlementDecision'&&row.action==='MODULE_ENTITLEMENT_ENFORCED'&&row.userId===authorizedActor.id&&
        row.organizationId===authorizedActor.organizationId&&row.changes?.moduleSlug==='inventory'&&row.changes?.surface==='POST /api/uploadthing'&&
        row.changes?.allowed===false&&row.changes?.mode==='enforce') : before.auditSha256===after.auditSha256;
      const checks = {
        expectedStatus:test.status.includes(response.status),
        noPrivateCanaries:privateCanaries.every(marker=>!response.text.includes(marker)),
        noProviderKey:!response.text.includes(apiKey),
        businessUnchanged:before.businessSha256===after.businessSha256,
        sessionsUnchanged:before.sessionSha256===after.sessionSha256,
        auditEffectsExpected,
        expectedCallbackCount:received.length-callbackStart===(test.expectedCallbacks||0),
        responseContract:true
      };
      try { test.check?.(response); } catch { checks.responseContract=false; }
      const row = {id:test.id,method:test.method,route:test.route,status:response.status,
        bodyBytes:Buffer.byteLength(response.text),bodySha256:hash(response.text),checks,
        before,after,classifiedAuditAdditions:addedAudits,fixturePrecondition:test.moduleDisabled?'inventory grant suspended before before-snapshot; exact prior grant restored after after-snapshot':'unchanged',callbackDelta:received.slice(callbackStart),passed:Object.values(checks).every(Boolean)};
      observations.push(row);
      if(test.moduleDisabled){await setModuleActive(true);moduleWasDisabled=false;}
      fs.writeFileSync(path.join(resolvedOutput,'progress.json'),JSON.stringify(observations,null,2)+'\n');
    }
    for (const row of received) { assert.equal(row.method,'POST'); assert.equal(row.path,'/callback-result'); assert.equal(row.keyMatchesSynthetic,true); assert.deepEqual(row.callbackData,{}); assert.equal(row.fileKey,callback.file.key); }
  } catch(error) { failure={name:error.name,message:error.message}; }
  finally {
    try { if(moduleWasDisabled){await setModuleActive(true);moduleWasDisabled=false;} }
    catch(error){failure={name:error.name,message:'Owned module fixture restore failed: '+error.message};}
    await new Promise(resolve=>server.close(resolve));
  }
  const result={package:'P04-V02',evidenceClass:'actual-full-app-http-with-local-provider-protocol-fixture',
    artifactBinding,apiVersion:'7.7.4',syntheticProviderOnly:true,hostedProviderAccepted:false,
    noProductChanges:true,receiverStopped:true,total:cases.length,executed:observations.length,
    passed:observations.filter(x=>x.passed).length,failed:observations.filter(x=>!x.passed).length,
    observations,received,failure,ok:!failure&&observations.length===cases.length&&observations.every(x=>x.passed),
    limits:['Callback origin is signature-covered input, not an independent allowlist. Only loopback callback delivery was exercised.',
      'Valid signed completion/error hooks are provider exceptions; empty completion callback intentionally performs no business mutation.',
      'The legacy browser upload entry intentionally refuses all uploads; managed upload/provider storage acceptance belongs to its separate package.',
      'No real provider credentials, hosted network, CDN, lifecycle or operator acceptance.']};
  fs.writeFileSync(path.join(resolvedOutput,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  return result;
}
module.exports={runProviderProtocol};
