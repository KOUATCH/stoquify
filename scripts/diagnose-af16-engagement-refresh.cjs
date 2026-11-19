// AF16-only synthetic browser lane. Reuses a sealed artifact and an owned fixture clone.
// No build, migration, real enrollment, live delivery or production configuration.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), https = require('node:https'), http = require('node:http'), net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { verify, filesUnder } = require('./release-artifact.cjs');
const c = require('./af16-verification-context.cjs');
const candidate = path.join(c.root, '.codex-tmp/af16-release-20261026');
const artifact = path.join(c.root, '.codex-tmp/af16-artifact-20261026');
const runtime = path.join(c.privateRoot, 'af16-sealed-runtime-20261026');
const output = path.join(c.root, 'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-28-run-02');
const privateDir = path.join(c.privateRoot, 'af16-engagement-https-20261028-r2');
const name = 'stoquify_local_af16_20261028_engagement_r2';
const url = `postgresql://af16@127.0.0.1:55451/${name}`;
const base = 'https://localhost:3186';
const digest = '987da3ead9c716cdbf5d2a22ac1723aa8a8ed15113f40a6b8abd3c1fb64d151f';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const receipt = { startedAt: new Date().toISOString(), artifactSha256: digest, base, database: name, passed: false, evidenceClass: 'Synthetic AF03/AF05 authenticated browser on sealed full application; local TLS with test certificate; not hosted TLS, predecessor rollback or production approval' };
const safeEnv = {};
for (const key of ['PATH','Path','PATHEXT','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC']) if (process.env[key]) safeEnv[key] = process.env[key];
async function freePort(port = 0) {
  return new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(port, '127.0.0.1', () => { const actual = s.address().port; s.close(error => error ? reject(error) : resolve(actual)); }); });
}

async function main(){
 const prior=JSON.parse(fs.readFileSync(path.join(output,'sealed-engagement-summary.json')));
 assert.equal(prior.buildId,'eoW9-NZPj4rd9OHTZxMDM');assert.equal(prior.preverifiedFiles,5284);assert.ok(prior.serverStopped&&prior.proxyStopped);
 assert.equal(hash(fs.readFileSync(path.join(artifact,'artifact.json'))),digest);
 const fixture=JSON.parse(fs.readFileSync(path.join(privateDir,'fixture.json')));
 assert.equal(fixture.url,url);await freePort(3186);
 const {PrismaClient}=require('../.codex-tmp/af16-prisma/client'),{chromium}=require('playwright');
 const db=new PrismaClient({datasources:{db:{url}}});
 let server,serverExit,proxy,log,browser;
 const result={diagnostic:true,events:[],pageErrors:[],priorFailure:'browser-results.json'};
 try{
 assert.equal(fs.realpathSync((await db.$queryRawUnsafe('SHOW data_directory'))[0].data_directory).toLowerCase(),fs.realpathSync(c.cluster).toLowerCase());
    const cert = path.join(privateDir, 'diagnostic-cert.pem'), key = path.join(privateDir, 'diagnostic-key.pem');
    const tls = spawnSync('C:/Program Files/Git/usr/bin/openssl.exe', ['req','-x509','-newkey','rsa:2048','-nodes','-days','2','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-keyout',key,'-out',cert], { env: safeEnv, windowsHide: true, encoding: 'utf8', timeout: 30000 });
    if (tls.status !== 0) throw Error('Local certificate generation failed: ' + tls.stderr);
    const certificate = new crypto.X509Certificate(fs.readFileSync(cert));
    receipt.certificate = { fingerprint256: certificate.fingerprint256, subjectAltName: certificate.subjectAltName, selfSigned: true, operatingSystemTrustChanged: false };
    const port = await freePort();
    const env = { ...safeEnv, NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(port), NEXT_TELEMETRY_DISABLED: '1', DATABASE_URL: url, DIRECT_URL: url, NEXTAUTH_URL: base, NEXT_PUBLIC_BASE_URL: base, NEXT_PUBLIC_APP_URL: base, STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '0', STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: '0', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '0' };
    for (const key of ['AUTH_SECRET','NEXTAUTH_SECRET','BETTER_AUTH_SECRET','PUBLIC_IDENTITY_ABUSE_HASH_SECRET','AQSTOQFLOW_RECEIPT_TOKEN_SECRET','AQSTOQFLOW_HISTORY_CURSOR_SECRET','AQSTOQFLOW_STATEMENT_TOKEN_SECRET','AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY','AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY']) env[key] = crypto.randomBytes(32).toString('hex');
    log = fs.openSync(path.join(privateDir, 'diagnostic-server.log'), 'wx');
    server = spawn(process.execPath, [path.join(runtime, 'server.js')], { cwd: runtime, env, windowsHide: true, stdio: ['ignore',log,log] });
    serverExit = new Promise(resolve => { server.once('close', resolve); server.once('error', resolve); });
    proxy = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, (request, response) => {
      if (!['localhost:3186','127.0.0.1:3186'].includes(request.headers.host)) { response.writeHead(400); response.end(); return; }
      const forwarded = http.request({ host: '127.0.0.1', port, path: request.url, method: request.method, headers: { ...request.headers, 'x-forwarded-host': request.headers.host, 'x-forwarded-proto': 'https', 'x-forwarded-for': '127.0.0.1' } }, upstream => { response.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(response); });
      forwarded.setTimeout(240000, () => forwarded.destroy(Error('Local upstream timeout')));
      forwarded.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end(); });
      request.pipe(forwarded);
    });
    await new Promise((resolve,reject) => { proxy.once('error',reject); proxy.listen(3186,'127.0.0.1',resolve); });
    receipt.listener = { tls: '127.0.0.1:3186', upstream: `127.0.0.1:${port}` };
    for (let i = 0; ; i++) {
      if (server.exitCode !== null || i === 120) throw Error('Sealed server readiness failed');
      try { const r = await fetch(`http://127.0.0.1:${port}/favicon.ico`, { signal: AbortSignal.timeout(1000) }); await r.arrayBuffer(); break; }
      catch { await new Promise(resolve => setTimeout(resolve,500)); }
    }

 browser=await chromium.launch({headless:true,args:['--host-resolver-rules=MAP localhost 127.0.0.1']});
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}}),page=await context.newPage();
 const began=Date.now();
 page.on('request',r=>result.events.push({event:'request',method:r.method(),path:new URL(r.url()).pathname,at:Date.now()-began}));
 page.on('requestfinished',r=>result.events.push({event:'finished',method:r.method(),path:new URL(r.url()).pathname,at:Date.now()-began}));
 page.on('requestfailed',r=>result.events.push({event:'failed',method:r.method(),path:new URL(r.url()).pathname,error:r.failure()?.errorText,at:Date.now()-began}));
 page.on('pageerror',e=>result.pageErrors.push(e.message));page.setDefaultTimeout(90000);
 const signin=await context.request.post(base+'/api/auth/sign-in/email',{data:{email:'af05-owner@example.invalid',password:fixture.password},headers:{Origin:base},timeout:240000});assert.equal(signin.status(),200);
 const route=base+'/en/dashboard/accounting/accountant-access';
 await page.goto(route,{waitUntil:'domcontentloaded',timeout:240000});
 const form=page.locator('form').filter({has:page.locator('[name=accountantEmail]')});
 await form.getByRole('button',{name:'Invite or grant access',exact:true}).waitFor();
 result.reloadRecoveredSubmit=await form.getByRole('button',{name:'Invite or grant access',exact:true}).isEnabled();
 result.existingGrants=(await db.accountantAccessGrant.findMany({where:{organizationId:'af05-client'}})).map(g=>g.accountantUserId);
 await form.locator('[name=accountantEmail]').fill('af05-reviewer@example.invalid');await form.locator('[name=accountantFirmName]').fill('Synthetic firm');
 await form.locator('[name=role]').selectOption('REVIEWER');await form.locator('[name=effectiveFrom]').fill('2020-01-01T00:00');await form.locator('[name=expiresAt]').fill('2099-01-01T00:00');await form.locator('[name=consentEvidenceHash]').fill('sha256:'+'a'.repeat(64));
 await form.getByRole('button',{name:'Invite or grant access',exact:true}).click();
 await page.waitForFunction(()=>/Accountant access granted\.|Confirm your password/.test(document.body.innerText));
 if(await page.getByLabel('Password',{exact:true}).count()){
 await page.getByLabel('Password',{exact:true}).fill(fixture.password);await page.getByRole('button',{name:'Confirm identity',exact:true}).click();await page.getByRole('button',{name:'Retry',exact:true}).click();
 }
 await page.getByText('Accountant access granted.',{exact:true}).waitFor();
 result.grantPersisted=!!(await db.accountantAccessGrant.findFirst({where:{organizationId:'af05-client',accountantUserId:'af05-reviewer',status:'ACTIVE'}}));
 try{await form.getByRole('button',{name:'Invite or grant access',exact:true}).waitFor({timeout:30000});result.submitRecoveredWithoutReload=true}catch{result.submitRecoveredWithoutReload=false}
 await page.screenshot({path:path.join(output,'diagnostic-after-grant.png')});
 await page.reload({waitUntil:'domcontentloaded',timeout:240000});
 await form.getByRole('button',{name:'Invite or grant access',exact:true}).waitFor();
 result.afterReloadSubmitEnabled=await form.getByRole('button',{name:'Invite or grant access',exact:true}).isEnabled();
 await page.screenshot({path:path.join(output,'diagnostic-after-reload.png')});
 }catch(e){result.error=e.message;throw e}
 finally{
 if(browser)await browser.close();await db.$disconnect();
 if(proxy){proxy.closeAllConnections();await new Promise(r=>proxy.close(r))}
 if(server){if(server.exitCode===null&&server.pid)server.kill();await serverExit}
 if(log!==undefined)fs.closeSync(log);
 result.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(output,'refresh-diagnostic.json'),JSON.stringify(result,null,2),{flag:'wx'});
 }
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
