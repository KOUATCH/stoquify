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
const output = path.join(c.root, 'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-28-run-01');
const privateDir = path.join(c.privateRoot, 'af16-engagement-https-20261028');
const name = 'stoquify_local_af16_20261028_engagement_r1';
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
async function main() {
  if(process.argv.length!==2 || process.env.NODE_ENV==='production')throw Error('Only fresh local synthetic runs allowed');
  if(fs.existsSync(output)||fs.existsSync(privateDir))throw Error('Fresh evidence/private directories required');
  await freePort(3186);
  const addresses = await require('node:dns').promises.lookup('localhost', { all: true });
  assert.ok(addresses.length && addresses.every(row => ['127.0.0.1','::1'].includes(row.address)));
  fs.mkdirSync(output); fs.mkdirSync(privateDir);
  const documents=[];
  function snapshot(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())snapshot(file);else if(file.endsWith('.md'))documents.push({path:path.relative(c.root,file).replaceAll('\\','/'),sha256:hash(fs.readFileSync(file))});}}
  snapshot(path.join(c.root,'docs/accounting-firms'));
  fs.writeFileSync(path.join(output,'documents-before.json'),JSON.stringify(documents,null,2),{flag:'wx'});
  let server, serverExit, proxy, log;
  try {
    console.log('Verifying sealed artifact and runtime copy before use.');
    const manifest = verify(candidate, artifact, digest);
    assert.equal(manifest.buildId, 'eoW9-NZPj4rd9OHTZxMDM');
    assert.deepEqual(filesUnder(runtime), manifest.files.filter(row => row.path.startsWith('runtime/')).map(row => ({ path: row.path.slice(8), sha256: row.sha256 })));
    receipt.buildId = manifest.buildId; receipt.preverifiedFiles = manifest.files.length;
    const original = new Client({ connectionString:c.url('template'),connectionTimeoutMillis:5000 });
    await original.connect();
    try {
      await c.guard(original);
      assert.equal((await original.query('SELECT count(*)::int n FROM "User"')).rows[0].n,0);
      assert.equal((await original.query('SELECT count(*)::int n FROM "Organization"')).rows[0].n,0);
      const migrations = (await original.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
      const catalog = fs.readdirSync(path.join(candidate, 'prisma/migrations')).filter(n => fs.existsSync(path.join(candidate, 'prisma/migrations', n, 'migration.sql'))).sort();
      assert.deepEqual(migrations.map(r => r.migration_name), catalog);
      for (const row of migrations) assert.ok(row.finished_at && !row.rolled_back_at && row.checksum === hash(fs.readFileSync(path.join(candidate, 'prisma/migrations', row.migration_name, 'migration.sql'))));
      receipt.migrations = migrations.length;
    } finally { await original.end(); }
    const admin = new Client({ connectionString: 'postgresql://af16@127.0.0.1:55451/postgres', connectionTimeoutMillis: 5000 });
    await admin.connect();
    try {
      await c.guard(admin);
      assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount, 0, 'Existing database refused');
      await admin.query(`CREATE DATABASE "${name}" TEMPLATE "${c.database('template')}"`);
      receipt.clonedFrom = c.database('template');
    } finally { await admin.end(); }
    const { PrismaClient } = require('../.codex-tmp/af16-prisma/client');
    const db = new PrismaClient({ datasources: { db: { url } } });
    const password = crypto.randomBytes(24).toString('base64url');
    try {
      assert.equal(fs.realpathSync((await db.$queryRawUnsafe('SHOW data_directory'))[0].data_directory).toLowerCase(), fs.realpathSync(c.cluster).toLowerCase());
      const fixtureSource=path.join(candidate,'scripts/fixtures/firm-engagement-workflows-browser.cjs');
      const fixtureText=fs.readFileSync(fixtureSource,'utf8');
      const begin=fixtureText.indexOf('    await db.organization.createMany('),end=fixtureText.indexOf("    fs.writeFileSync(path.join(base,'af05-browser-private.json')");
      assert.ok(begin>0&&end>begin,'Existing AF05 seed block required');
      const body=fixtureText.slice(begin,end);
      await new (Object.getPrototypeOf(async function(){}).constructor)('db','password','argon2',body)(db,password,require('argon2'));
      receipt.fixture={source:path.relative(c.root,fixtureSource),sourceSha256:hash(fixtureText),seedSha256:hash(body),users:await db.user.count(),organizations:await db.organization.count()};
      assert.equal(receipt.fixture.users,5);assert.equal(receipt.fixture.organizations,3);
      assert.equal(await db.firmEngagement.count(),0);
    } finally { await db.$disconnect(); }
    const privateFile = path.join(privateDir, 'fixture.json');
    fs.writeFileSync(privateFile, JSON.stringify({ url, name, password, base }), { flag: 'wx' });
    const cert = path.join(privateDir, 'cert.pem'), key = path.join(privateDir, 'key.pem');
    const tls = spawnSync('C:/Program Files/Git/usr/bin/openssl.exe', ['req','-x509','-newkey','rsa:2048','-nodes','-days','2','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-keyout',key,'-out',cert], { env: safeEnv, windowsHide: true, encoding: 'utf8', timeout: 30000 });
    if (tls.status !== 0) throw Error('Local certificate generation failed: ' + tls.stderr);
    const certificate = new crypto.X509Certificate(fs.readFileSync(cert));
    receipt.certificate = { fingerprint256: certificate.fingerprint256, subjectAltName: certificate.subjectAltName, selfSigned: true, operatingSystemTrustChanged: false };
    const port = await freePort();
    const env = { ...safeEnv, NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(port), NEXT_TELEMETRY_DISABLED: '1', DATABASE_URL: url, DIRECT_URL: url, NEXTAUTH_URL: base, NEXT_PUBLIC_BASE_URL: base, NEXT_PUBLIC_APP_URL: base, STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: '0', STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: '0', STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: '0' };
    for (const key of ['AUTH_SECRET','NEXTAUTH_SECRET','BETTER_AUTH_SECRET','PUBLIC_IDENTITY_ABUSE_HASH_SECRET','AQSTOQFLOW_RECEIPT_TOKEN_SECRET','AQSTOQFLOW_HISTORY_CURSOR_SECRET','AQSTOQFLOW_STATEMENT_TOKEN_SECRET','AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY','AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY']) env[key] = crypto.randomBytes(32).toString('hex');
    log = fs.openSync(path.join(privateDir, 'server.log'), 'wx');
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
    receipt.adapters=[];
    for(const kind of ['browser','browser-recovery']){
      const sourceScript=path.join(candidate,'scripts/verify-firm-engagement-'+kind+'.cjs');
      let adapter=fs.readFileSync(sourceScript,'utf8');const sourceHash=hash(adapter);
      const swap=(from,to)=>{assert.ok(adapter.includes(from),'Missing adapter anchor: '+from);adapter=adapter.split(from).join(to)};
      swap("require('@prisma/client')",'require('+JSON.stringify(path.join(c.root,'.codex-tmp/af16-prisma/client').replaceAll('\\','/'))+')');
      swap(kind==='browser'?"path.join(privateRoot,'af05-browser-private.json')":"'C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993/af05-browser-private.json'",JSON.stringify(privateFile.replaceAll('\\','/')));
      swap('/stoquify_local_af05_browser_20261020_r1','/'+name);
      swap('docs/accounting-firms/roadmap-2026-10-19/execution/AF05/2026-10-20-run-01',path.relative(c.root,output).replaceAll('\\','/'));
      swap("assert.equal(new URL(fixture.url).hostname,'127.0.0.1')","assert.equal(new URL(fixture.url).hostname,'127.0.0.1');assert.equal(new URL(fixture.url).port,'55451');assert.notEqual(process.env.NODE_ENV,'production')");
      swap('headless:true','headless:true,args:["--host-resolver-rules=MAP localhost 127.0.0.1"]');
      swap(kind==='browser'?"reducedMotion:'reduce'":"viewport:{width:1440,height:1000}",kind==='browser'?"reducedMotion:'reduce',ignoreHTTPSErrors:true":"viewport:{width:1440,height:1000},ignoreHTTPSErrors:true");
      const guard="assert.equal(fs.realpathSync((await db.$queryRawUnsafe('SHOW data_directory'))[0].data_directory).toLowerCase(),fs.realpathSync("+JSON.stringify(c.cluster)+").toLowerCase());";
      const cookie="const cookies=await context.cookies();assert.ok(cookies.some(c=>c.name.includes('session_token')&&c.secure&&c.httpOnly),'Secure HttpOnly session cookie');";
      if(kind==='browser'){
        swap("const resume=process.env.AF05_RESUME_AFTER_HANDOVER==='1'",'const resume=false');
        swap("assert.equal((await db.$queryRawUnsafe('SELECT current_database() AS name'))[0].name,fixture.name)",guard+"assert.equal((await db.$queryRawUnsafe('SELECT current_database() AS name'))[0].name,fixture.name)");
        swap("assert.equal(r.status(),200,role+' sign-in')","assert.equal(r.status(),200,role+' sign-in');"+cookie+"report.secureCookieRoles=[...(report.secureCookieRoles||[]),role]");
        const suspension=fs.readFileSync(path.join(c.root,'scripts/af16-engagement-suspension.fragment.txt'),'utf8');
        swap("   await workspace.getByRole('button',{name:'Load authorized work summary',exact:true}).click()",suspension+"\n   await workspace.getByRole('button',{name:'Load authorized work summary',exact:true}).click()");
      }else{
        swap('checks:[],passed:false','checks:[],pageErrors:[],passed:false');
        swap(' page.setDefaultTimeout(60000)'," page.setDefaultTimeout(60000);page.on('pageerror',e=>report.pageErrors.push(e.message))");
        swap(' try{',' try{'+guard);
        swap('assert.equal(r.status(),200)','assert.equal(r.status(),200);'+cookie);
        swap("  const transition=", "  const beforeCancel=await db.firmEngagement.findFirstOrThrow({where:{firmOrganizationId:'af05-firm'}});\n  const transition=");
        swap("  report.checks.push('Keyboard","  assert.deepEqual(await db.firmEngagement.findUniqueOrThrow({where:{id:beforeCancel.id}}),beforeCancel);\n  report.checks.push('Keyboard");
        for(const image of ['engagement-expiry-detail','permission-denied','module-locked','session-revoked'])swap(image+'.png','recovery-'+image+'.png');
      }
      swap('report.passed=true','assert.deepEqual(report.pageErrors,[]);report.passed=true;report.artifactSha256='+JSON.stringify(digest));
      const adapterPath=path.join(c.root,'scripts/af16-sealed-engagement-'+kind+'.generated.cjs');
      fs.writeFileSync(adapterPath,adapter,{flag:'wx'});
      receipt.adapters.push({source:path.relative(c.root,sourceScript),sourceSha256:sourceHash,generated:path.relative(c.root,adapterPath),generatedSha256:hash(adapter),businessAssertionsPreserved:true});
      console.log('Running sealed engagement '+kind);
      const browserLog=fs.openSync(path.join(output,kind+'.log'),'wx');
      const test=spawn(process.execPath,[adapterPath],{cwd:c.root,env:{...safeEnv,NODE_ENV:'test'},windowsHide:true,stdio:['ignore',browserLog,browserLog]});
      const timeout=setTimeout(()=>{receipt.browserTimedOut=true;if(test.pid)spawnSync('taskkill.exe',['/PID',String(test.pid),'/T','/F'],{windowsHide:true});},20*60*1000);
      const code=await new Promise(resolve=>{test.once('error',()=>resolve(-1));test.once('close',resolve)});
      clearTimeout(timeout);fs.closeSync(browserLog);receipt.adapters.at(-1).exitCode=code;
      console.log(kind+' exit: '+code);
      if(code!==0||receipt.browserTimedOut)throw Error('Browser failure; evidence retained');
    }
    verify(candidate,artifact,digest);receipt.artifactUnchangedAfterBrowser=true;
    receipt.passed=receipt.adapters.every(a=>a.exitCode===0)&&!receipt.browserTimedOut;
    if (!receipt.passed) throw Error('Browser workflow failed; retained browser.log and receipt');
  } catch(error) {receipt.error=error.stack;throw error;}
  finally {
    if(proxy){proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve));receipt.proxyStopped=true;}
    if(server){if(server.exitCode===null&&server.pid)server.kill();await serverExit;receipt.serverStopped=true;}
    if(log!==undefined)fs.closeSync(log);
    receipt.finishedAt=new Date().toISOString();
    fs.writeFileSync(path.join(output,'sealed-engagement-summary.json'),JSON.stringify(receipt,null,2),{flag:'wx'});
  }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
