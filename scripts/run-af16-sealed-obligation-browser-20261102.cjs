// AF16-only synthetic browser lane. Reuses a sealed artifact and an owned fixture clone.
// No build, migration, real enrollment, live delivery or production configuration.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), https = require('node:https'), http = require('node:http'), net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { verify, filesUnder } = require('./release-artifact.cjs');
const c = require('./af16-verification-context.cjs');
const candidate = path.join(c.root, '.codex-tmp/af16-release-20261102');
const artifact = path.join(c.root, '.codex-tmp/af16-artifact-20261102');
const runtime = path.join(c.privateRoot, 'af16-sealed-runtime-20261102');
const output = path.join(c.root, 'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-11-02-run-04');
const privateDir = path.join(c.privateRoot, 'af16-obligation-https-20261102-r4');
const name = 'stoquify_local_af16_20261102_obligation_r4';
const url = `postgresql://af16@127.0.0.1:55451/${name}`;
const base = 'https://localhost:3186';
const digest = JSON.parse(fs.readFileSync(path.join(c.root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-11-02-run-01/artifact-digest.json'))).sha256;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const receipt = { startedAt: new Date().toISOString(), artifactSha256: digest, base, database: name, passed: false, evidenceClass: 'Synthetic AF11 authenticated browser on sealed full application; local TLS with test certificate; not hosted TLS, predecessor rollback or production approval' };
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
    console.log('Sealed artifact verified; checking retained runtime copy.');
    assert.equal(manifest.buildId, 'R3-zVTu3LoKCHOp2WTaZA'); if(!fs.existsSync(runtime)) fs.cpSync(path.join(artifact,'runtime'),runtime,{recursive:true,errorOnExist:true,force:false});
    assert.deepEqual(filesUnder(runtime), manifest.files.filter(row => row.path.startsWith('runtime/')).map(row => ({ path: row.path.slice(8), sha256: row.sha256 })));
    receipt.buildId = manifest.buildId; receipt.preverifiedFiles = manifest.files.length;
    console.log('Runtime copy verified; checking empty migration template.');
    const sourceBytes=fs.readFileSync(path.join(c.root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-25-run-01/AF11/browser-fixture.json'));
    const source=JSON.parse(sourceBytes);receipt.fixtureSha256=hash(sourceBytes);
    assert.equal(JSON.parse(fs.readFileSync(path.join(c.root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-25-run-01/AF11/jest.json'))).success,true);
    const original = new Client({ connectionString:c.url('af11'),connectionTimeoutMillis:5000 });
    await original.connect();
    try {
      await c.guard(original);
      assert.equal((await original.query('SELECT count(*)::int n FROM firm_obligation_revisions WHERE "organizationId"=$1',[source.client])).rows[0].n,0);
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
      await admin.query(`CREATE DATABASE "${name}" TEMPLATE "${c.database('af11')}"`);
      receipt.clonedFrom = c.database('af11');
    } finally { await admin.end(); }
    const { PrismaClient } = require('../.codex-tmp/af16-prisma/client');
    const db = new PrismaClient({ datasources: { db: { url } } });
    const password = crypto.randomBytes(24).toString('base64url');
    try {
      assert.equal(fs.realpathSync((await db.$queryRawUnsafe('SHOW data_directory'))[0].data_directory).toLowerCase(), fs.realpathSync(c.cluster).toLowerCase());
      assert.equal(await db.firmObligationRevision.count({where:{organizationId:source.client}}),0);
      assert.equal(await db.journalEntry.count({where:{organizationId:source.client}}),0);
      const pack=await db.closePackExport.findUniqueOrThrow({where:{id:source.packId}});assert.equal(pack.isCertified,false);
      const fixtureSource=path.join(candidate,'scripts/fixtures/obligation-register-browser.cjs');
      const fixtureText=fs.readFileSync(fixtureSource,'utf8');
      const start=fixtureText.indexOf('    for (const [role, id]'),finish=fixtureText.indexOf('    fs.writeFileSync(path.join(base, "af11-browser-private.json")');
      assert.ok(start>0&&finish>start);const body=fixtureText.slice(start,finish);
      const encoded=await require('argon2').hash(password);
      await new (Object.getPrototypeOf(async function(){}).constructor)('db','source','hash',body)(db,source,encoded);
      receipt.credentials={source:path.relative(c.root,fixtureSource),sourceSha256:hash(fixtureText),bodySha256:hash(body),actors:Object.keys(source.actors)};
      fs.writeFileSync(path.join(output,'browser-fixture.json'),sourceBytes,{flag:'wx'});
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
    const sourceScript=path.join(candidate,'scripts/verify-obligation-register-browser.cjs');
    let adapter=fs.readFileSync(sourceScript,'utf8');const originalHash=hash(adapter);
    const swap=(from,to)=>{assert.ok(adapter.includes(from),'Missing adapter anchor: '+from);adapter=adapter.split(from).join(to)};
    swap('../.codex-tmp/af11-prisma/client',path.join(c.root,'.codex-tmp/af16-prisma/client').replaceAll('\\','/'));
    swap("path.join(base,'af11-browser-private.json')",JSON.stringify(privateFile.replaceAll('\\','/')));
    swap('docs/accounting-firms/roadmap-2026-10-19/execution/AF11/2026-10-20-run-01',path.relative(c.root,output).replaceAll('\\','/'));
    swap("'55449'","'55451'");swap('/stoquify_local_af11_20261020_r1','/'+name);swap('af01-host/af01-postgres','af16-postgres');
    swap('headless:true','headless:true,args:["--host-resolver-rules=MAP localhost 127.0.0.1"]');swap("reducedMotion:'reduce'","reducedMotion:'reduce',ignoreHTTPSErrors:true");
    swap("assert.equal(response.status(),200,role+' sign-in')","assert.equal(response.status(),200,role+' sign-in');assert.ok((await context.cookies()).some(c=>c.name.includes('session_token')&&c.secure&&c.httpOnly));report.secureCookieRoles=[...(report.secureCookieRoles||[]),role]");
    swap('await button.click();if(await sent)break',"await button.focus();await page.keyboard.press('Enter');if(await sent)break");
    swap("    const pages={}","    const originalPermissions=(await db.role.findUniqueOrThrow({where:{id:source.actors.preparer+'-role'}})).permissions;\n    const pages={}");
    swap("    await panel.getByLabel('Include restricted payroll evidence (client payroll role required)',{exact:true}).check()",fs.readFileSync(path.join(c.root,'scripts/af16-obligation-extra-checks.fragment.cjs'),'utf8')+"\n    await panel.getByLabel('Include restricted payroll evidence (client payroll role required)',{exact:true}).check()");
    swap('    assert.deepEqual(report.pageErrors,[]);report.passed=true',fs.readFileSync(path.join(c.root,'scripts/af16-obligation-recovery.fragment.cjs'),'utf8'));
    adapter=adapter.replaceAll('error.message',"String(error.message).split(fixture.password).join('[REDACTED]')");
    adapter=adapter.replace('console.error(error.stack)',"console.error(String(error.stack).split(fixture.password).join('[REDACTED]'))");
    const adapterPath=path.join(c.root,'scripts/af16-sealed-obligation-20261102-r4.generated.cjs');fs.writeFileSync(adapterPath,adapter,{flag:'wx'});
    assert.equal(spawnSync(process.execPath,['--check',adapterPath],{env:safeEnv,windowsHide:true}).status,0);
    receipt.adapter={source:path.relative(c.root,sourceScript),sourceSha256:originalHash,generated:path.relative(c.root,adapterPath),generatedSha256:hash(adapter),businessAssertionsPreserved:true};
    console.log('Running reused AF11 journey plus UNKNOWN, restored-role and session checks.');
    const browserLog=fs.openSync(path.join(output,'browser.log'),'wx');
    const test=spawn(process.execPath,[adapterPath],{cwd:c.root,env:{...safeEnv,NODE_ENV:'test'},windowsHide:true,stdio:['ignore',browserLog,browserLog]});
    const timeout=setTimeout(()=>{receipt.browserTimedOut=true;if(test.pid)spawnSync('taskkill.exe',['/PID',String(test.pid),'/T','/F'],{windowsHide:true});},20*60*1000);
    const code=await new Promise(resolve=>{test.once('error',()=>resolve(-1));test.once('close',resolve)});clearTimeout(timeout);fs.closeSync(browserLog);receipt.browserExitCode=code;
    console.log('AF11 browser exit: '+code);
    verify(candidate,artifact,digest);receipt.artifactUnchangedAfterBrowser=true;
    receipt.passed=code===0&&!receipt.browserTimedOut;
    if (!receipt.passed) throw Error('Browser workflow failed; retained browser.log and receipt');
  } catch(error) {receipt.error=error.stack;throw error;}
  finally {
    if(proxy){proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve));receipt.proxyStopped=true;}
    if(server){if(server.exitCode===null&&server.pid)server.kill();await serverExit;receipt.serverStopped=true;}
    if(log!==undefined)fs.closeSync(log);
    receipt.finishedAt=new Date().toISOString();
    fs.writeFileSync(path.join(output,'sealed-obligation-summary.json'),JSON.stringify(receipt,null,2),{flag:'wx'});
  }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
