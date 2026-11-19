// Prepare is file-only; run exclusively starts the owned PG17 cluster, creates a
// NEW database, replays the unchanged catalog and runs native worker/CLI checks.
// No dotenv, install, generate, build, production connection or provider send.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process'), { createRequire, isBuiltin } = require('node:module');
const root = path.resolve(__dirname, '../../../..'), r2 = path.join(root, 'docs/stoquify-potential/development/close-integrity-release-candidate-2026-11-10-r2');
const q = require(path.join(r2, 'qualify-database.cjs')), source = require(path.join(r2, 'candidate-validation.cjs'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex'), digest = file => sha(fs.readFileSync(file));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8')), write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const osEnvironment = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)));
function pin(file) { q.noLinks(file); const bytes = fs.readFileSync(file); return { path: file, sha256: sha(bytes), bytes: bytes.length }; }
function sdkFiles(directory) { q.noLinks(directory); return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => { const file = path.join(directory, item.name); q.noLinks(file); return item.isDirectory() ? sdkFiles(file) : [pin(file)]; }).sort((a,b) => a.path.localeCompare(b.path)); }
function requireAbsentEnvironmentPath(file) { q.noLinks(path.dirname(file)); let absent = false; try { fs.lstatSync(file); } catch(error) { assert.equal(error.code,'ENOENT'); absent = true; } assert(absent,'Owned environment path must remain absent'); }
function context() {
  assert.equal(path.parse(root).root.toUpperCase(), 'E:\\');
  assert.equal(digest(path.join(r2, 'FINAL_QUALIFICATION.json')), '107771d7164d7d419c51b8c3a1b90d9632c3f1754e1f5cbea6148c900c992609');
  const admission = read(path.join(r2, 'FINAL_QUALIFICATION.json'));
  for (const name of ['CANDIDATE_TARGET.json','CANDIDATE_SOURCE_MANIFEST.json','CANDIDATE_NATIVE_READINESS.json','CLEAN_INSTALL_RESULT.json']) {
    const expected = admission.evidence.find(item => path.resolve(item.path) === path.join(r2,name)); assert(expected); assert.equal(digest(expected.path),expected.sha256);
  }
  const target = read(path.join(r2, 'CANDIDATE_TARGET.json')), native = read(path.join(r2, 'CANDIDATE_NATIVE_READINESS.json')), manifest = read(path.join(r2, 'CANDIDATE_SOURCE_MANIFEST.json'));
  assert.equal(target.candidate, path.join(root, '.codex-tmp/close-integrity-release-20261110-cdebf2df2e/candidate'));
  assert.equal(manifest.manifestSha256, 'cfcac6d0dfa217f3ad18ff27d16e46a55aa002bcbf77c91afc7e0b7082bfd544');
  assert.equal(sha(JSON.stringify(manifest.files)), manifest.manifestSha256); assert(native.passed && native.generatedEnvironmentPathsOwnedAndAbsent);
  assert.equal(native.defaultClient, path.join(target.candidate, 'node_modules/.prisma/client'));
  const catalog = read(path.join(root, 'prisma/migration-catalog-manifest.json'));
  assert.equal(catalog.migrationCount, 123); assert.equal(catalog.catalogSha256, '968c1f6c7c45f26a8eb8068b551e67450142fccc119b84528e4f4424c64a2e66');
  assert.equal(digest(path.join(root, 'prisma/schema.prisma')), '937754a6034b37b82c98957ebb9b70f612659d40af562967151595562acc6ef0');
  for (const entry of catalog.migrations) { assert.equal(digest(path.join(root, entry.path)), entry.rawSha256); assert.equal(digest(path.join(target.candidate, entry.path)), entry.rawSha256); }
  for (const file of ['schema.prisma','index.js','index.d.ts']) assert.equal(digest(path.join(native.defaultClient, file)), native[{ 'schema.prisma': 'defaultClientSchemaSha256', 'index.js': 'defaultClientIndexSha256', 'index.d.ts': 'defaultClientTypesSha256' }[file]]);
  const engine = path.join(target.candidate, 'node_modules/@prisma/engines/schema-engine-windows.exe');
  assert.equal(digest(engine), 'f2b48e3ce8de8712c9dce6c71f952bec383fa472830b91bca8e64b4b51bf0dd7');
  const envPaths = fs.readFileSync(path.join(native.defaultClient, 'index.js'), 'utf8').match(/"relativeEnvPaths"\s*:\s*(\{[^}]*\})/); assert(envPaths);
  for (const value of Object.values(JSON.parse(envPaths[1]))) if (value) { const file = path.resolve(native.defaultClient, value); assert(file.startsWith(target.directory + path.sep)); assert(!fs.existsSync(file)); }
  const appRequire = createRequire(path.join(target.candidate, 'package.json'));
  return { target, native, manifest, catalog, appRequire, engine };
}
function freezeClosure(input, destination) {
  const ts = input.appRequire('typescript'), found = new Map(), external = new Map(), boundary = 'prisma/db.ts';
  function resolveLocal(file) { for (const name of [file, ...['.ts','.tsx','.js','.cjs','.mjs','.json'].map(ext => file + ext), ...['index.ts','index.tsx','index.js'].map(name => path.join(file,name))]) if (fs.existsSync(name) && fs.statSync(name).isFile()) return name; throw Error('Unresolved local qualification dependency'); }
  function visit(file) {
    file = path.resolve(file); const rel = relative(file); assert(rel && !rel.startsWith('../') && !path.isAbsolute(rel));
    if (rel === boundary) return;
    assert(!/^(?:lib\/auth(?:\.|\/)|app\/|actions\/)/.test(rel), 'Application bootstrap dependency refused');
    if (found.has(rel)) return;
    const entry = pin(file); found.set(rel, { path: rel, sha256: entry.sha256, bytes: entry.bytes });
    const copy = path.join(destination, rel); fs.mkdirSync(path.dirname(copy), { recursive: true }); fs.copyFileSync(file, copy, fs.constants.COPYFILE_EXCL);
    if (rel.endsWith('.json')) return;
    const ast = ts.createSourceFile(file, fs.readFileSync(file,'utf8'), ts.ScriptTarget.Latest, true), imports = new Set();
    function scan(node) {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.isTypeOnly || node.importClause?.isTypeOnly) return;
        const bindings = node.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings) && bindings.elements.length && bindings.elements.every(item => item.isTypeOnly)) return;
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.add(node.moduleSpecifier.text);
      }
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) && node.arguments.length && ts.isStringLiteral(node.arguments[0])) imports.add(node.arguments[0].text);
      ts.forEachChild(node, scan);
    }
    scan(ast);
    for (const name of imports) {
      if (isBuiltin(name) || name === 'server-only' || name === '@/prisma/db' || name === '@prisma/client') continue;
      if (name.startsWith('@/') || name.startsWith('.')) visit(resolveLocal(name.startsWith('@/') ? path.join(root,name.slice(2)) : path.resolve(path.dirname(file),name)));
      else { const entry = input.appRequire.resolve(name); assert(entry.startsWith(path.join(input.target.candidate,'node_modules') + path.sep)); external.set(name,pin(entry)); }
    }
  }
  for (const name of ['services/communication/accountant-client-invite-worker.service.ts','scripts/referral-delivery-worker.ts','scripts/server-only-node-shim.js','scripts/local-gates-network.cjs',relative(path.join(__dirname,'invite-worker.postgres.test.ts'))]) visit(path.join(root,name));
  return { files: [...found.values()].sort((a,b) => a.path.localeCompare(b.path)), external: [...external].map(([specifier,entry]) => ({ specifier,...entry })), databaseImportIsRealExplicitAdapter: true };
}
function prepare() {
  const input = context(), id = crypto.randomBytes(5).toString('hex');
  const directory = path.join(root,'.codex-tmp','close-invite-pg-20261111-' + id), evidence = path.join(__dirname,'invite-pg-' + id);
  assert(!fs.existsSync(directory) && !fs.existsSync(evidence)); fs.mkdirSync(directory); fs.mkdirSync(evidence);
  for (const name of ['temp','cache','source']) fs.mkdirSync(path.join(directory,name));
  process.env.TEMP = path.join(directory,'temp'); process.env.TMP = process.env.TEMP;
  const closure = freezeClosure(input,path.join(directory,'source')), cluster = q.clusterTarget();
  const name = 'stoquify_replay_invite_worker_20261111_' + id;
  const target = { version: 1, preparedAt: new Date().toISOString(), directory, evidence, database: name, cluster: { directory: cluster.directory, host: cluster.host, port: cluster.port, user: cluster.user },
    source: path.join(directory,'source'), temporary: path.join(directory,'temp'), cache: path.join(directory,'cache'), dependencyCandidate: input.target.candidate,
    sdk: input.native.defaultClient, sourceBinding: closure, originalDatabases: ['stoquify_replay_close_monthly_20261110_e5474a4749','stoquify_restore_close_integrity_rc_20261110_e5474a4749'],
    preparedWithoutDatabaseOrApplication: true, runner: pin(__filename) };
  write(path.join(evidence,'TARGET.json'),target);
  console.log(JSON.stringify({ prepared: true, target: path.join(evidence,'TARGET.json'), sourceFiles: closure.files.length, noDatabaseOrApplicationStarted: true }));
}
function checkTarget(target) {
  assert.equal(target.version,1); assert.equal(path.dirname(target.directory),path.join(root,'.codex-tmp')); assert.match(path.basename(target.directory),/^close-invite-pg-20261111-[a-f0-9]{10}$/);
  const id = path.basename(target.directory).slice(-10); assert.equal(target.evidence,path.join(__dirname,'invite-pg-' + id)); assert.equal(target.database,'stoquify_replay_invite_worker_20261111_' + id);
  for (const [key,name] of [['source','source'],['temporary','temp'],['cache','cache']]) assert.equal(target[key],path.join(target.directory,name));
  for (const name of [target.directory,target.evidence,target.source,target.temporary,target.cache]) q.noLinks(name);
  const cluster = q.clusterTarget(); for (const key of ['directory','host','port','user']) assert.equal(target.cluster[key],cluster[key]);
  assert.equal(target.runner.sha256,digest(__filename)); assert(!fs.existsSync(path.join(target.evidence,'RESULT.json')),'Preserve completed/failed qualification attempts');
}
function verifyClosure(target) { for (const item of target.sourceBinding.files) { assert.equal(digest(path.join(root,item.path)),item.sha256,'Current source changed'); assert.equal(digest(path.join(target.source,item.path)),item.sha256,'Frozen qualification source changed'); } for (const entry of target.sourceBinding.external) assert.equal(digest(entry.path),entry.sha256); }
function prepareRuntime(input,target) {
  const adapter = path.join(target.directory,'real-db-adapter.cjs');
  fs.writeFileSync(adapter, `const {PrismaClient}=require(${JSON.stringify(input.native.defaultClient)});const u=new URL(process.env.INVITE_POSTGRES_URL||'');if(u.hostname!=='localhost'||u.port!=='58033'||u.pathname!==${JSON.stringify('/' + target.database)}||u.searchParams.get('schema')!=='public')throw Error('Exact owned invitation test database required');module.exports={db:new PrismaClient({datasources:{db:{url:u.toString()}},transactionOptions:{maxWait:15000,timeout:90000},__internal:{configOverride:c=>({...c,relativeEnvPaths:{rootEnvPath:null,schemaEnvPath:null}})}})};\n`,{flag:'wx'});
  const preload = path.join(target.directory,'read-boundary.cjs');
  fs.writeFileSync(preload, `const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');const {createRequire,isBuiltin}=Module;const clean=createRequire(${JSON.stringify(path.join(input.target.candidate,'package.json'))}),prismaEntry=clean.resolve('@prisma/client'),source=${JSON.stringify(target.source)},adapter=${JSON.stringify(adapter)},allowedEnvPaths=${JSON.stringify([path.join(input.target.candidate,'.env'),path.join(input.target.candidate,'prisma/.env')])},lstat=fs.lstatSync,attempts=[];let probes=0;const envPath=value=>{if(typeof value==='number'||value==null)return null;try{const absolute=path.resolve(value instanceof URL?require('node:url').fileURLToPath(value):String(value));return /^\\.env(?:\\.|$)/i.test(path.basename(absolute))?absolute:null}catch{return null}};const check=(value,operation)=>{const absolute=envPath(value);if(absolute){let exists=true,absenceCode=null;try{lstat(absolute)}catch(error){exists=error.code==='ENOENT'?false:null;absenceCode=error.code}const exactOwnedCandidateEnv=allowedEnvPaths.some(file=>file.toLowerCase()===absolute.toLowerCase());attempts.push({path:absolute,operation,exists,absenceCode,exactOwnedCandidateEnv,allowedAbsentOwnedProbe:exactOwnedCandidateEnv&&exists===false&&absenceCode==='ENOENT'});throw Error('Environment file contents are outside this qualification')}};for(const key of ['readFileSync','readFile','openSync','open','createReadStream']){const original=fs[key];fs[key]=function(file,...args){check(file,key);return original.call(this,file,...args)}};for(const key of ['readFile','open']){const original=fs.promises[key];fs.promises[key]=function(file,...args){check(file,'promises.'+key);return original.call(this,file,...args)}};const exists=fs.existsSync;fs.existsSync=function(file){if(envPath(file))probes++;return exists.call(this,file)};const resolve=Module._resolveFilename;Module._resolveFilename=function(request,parent,...args){if(request==='@/prisma/db')return adapter;if(request==='@prisma/client')return prismaEntry;if(request.startsWith('@/')){request=path.resolve(source,request.slice(2));if(!request.startsWith(source+path.sep))throw Error('Source alias escaped frozen qualification')}else if(!isBuiltin(request)&&!request.startsWith('.')&&!path.isAbsolute(request)&&parent?.filename?.startsWith(source+path.sep))return clean.resolve(request);return resolve.call(this,request,parent,...args)};process.on('exit',()=>{const output=process.env.INVITE_ENV_GUARD_REPORT;if(output)fs.writeFileSync(output+'.'+process.pid+'.json',JSON.stringify({processId:process.pid,attempts,blockedEnvironmentReadAttempts:attempts.length,unexpectedEnvironmentReadAttempts:attempts.filter(item=>!item.allowedAbsentOwnedProbe).length,environmentMetadataProbes:probes,environmentContentsRead:0,allEnvironmentContentReadsBlocked:true,noEnvironmentContentsLoaded:true})+'\\n',{flag:'wx'})});\n`,{flag:'wx'});
  const config = { rootDir: target.source, roots: [path.join(target.source,path.relative(root,__dirname))], testEnvironment: 'node', cache: false, cacheDirectory: target.cache,
    testMatch: ['**/invite-worker.postgres.test.ts'], testTimeout: 120000, setupFiles: [], setupFilesAfterEnv: [], collectCoverage: false,
    moduleNameMapper: { '^@/prisma/db$': adapter, '^@prisma/client$': input.native.defaultClient, '^@/(.*)$': target.source.replaceAll('\\','/') + '/$1', '^server-only$': path.join(target.source,'scripts/server-only-node-shim.js') },
    moduleDirectories: [path.join(input.target.candidate,'node_modules')], transform: { '^.+\\.(js|jsx|ts|tsx)$': path.join(input.target.candidate,'node_modules/next/dist/build/swc/jest-transformer.js') } };
  const configFile = path.join(target.directory,'jest.config.cjs'); fs.writeFileSync(configFile,'module.exports='+JSON.stringify(config,null,2)+';\n',{flag:'wx'});
  const tsConfig = path.join(target.directory,'tsconfig.json'); write(tsConfig,{compilerOptions:{target:'ES2022',module:'CommonJS',moduleResolution:'node',esModuleInterop:true,skipLibCheck:true,resolveJsonModule:true,jsx:'react-jsx'}});
  return { adapter,preload,configFile,tsConfig };
}
async function run(targetFile) {
  q.noLinks(targetFile); assert.equal(path.basename(targetFile),'TARGET.json'); const target = read(targetFile); checkTarget(target); assert.equal(path.dirname(targetFile),target.evidence);
  const retained = osEnvironment(); for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env,retained,{TEMP:target.temporary,TMP:target.temporary}); require('node:dns').setDefaultResultOrder('ipv4first');
  const input = context(); assert.equal(target.dependencyCandidate,input.target.candidate); assert.equal(target.sdk,input.native.defaultClient); verifyClosure(target);
  const ownedEnvironmentPaths=[path.join(input.target.candidate,'.env'),path.join(input.target.candidate,'prisma/.env')];ownedEnvironmentPaths.forEach(requireAbsentEnvironmentPath);
  assert.deepEqual(source.identity(input.target.candidate),input.manifest.files,'Qualified dependency candidate changed');
  const sdkBefore = sdkFiles(input.native.defaultClient), sharedBefore = sdkFiles(path.join(root,'node_modules/.prisma/client'));
  assert.deepEqual(sharedBefore.map(({path,sha256})=>({path,sha256})),input.native.sharedBefore);
  const runtime = prepareRuntime(input,target), { Client } = input.appRequire('pg');
  const env = { ...retained, TEMP:target.temporary,TMP:target.temporary,NODE_ENV:'test',CI:'1',CHECKPOINT_DISABLE:'1',NEXT_TELEMETRY_DISABLED:'1',PRISMA_HIDE_UPDATE_MESSAGE:'1',PRISMA_GENERATE_SKIP_AUTOINSTALL:'1',
    XDG_CACHE_HOME:target.cache,PRISMA_ENGINES_CACHE_DIR:target.cache,PRISMA_SCHEMA_ENGINE_BINARY:input.engine,
    DATABASE_URL:q.url(target.cluster,target.database),DIRECT_URL:q.url(target.cluster,target.database),SHADOW_DATABASE_URL:q.url(target.cluster,target.database),INVITE_POSTGRES_URL:q.url(target.cluster,target.database),
    NODE_OPTIONS:'--dns-result-order=ipv4first --require '+JSON.stringify(path.join(target.source,'scripts/local-gates-network.cjs'))+' --require '+JSON.stringify(runtime.preload),
    STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS:'0',STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS:'0',STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS:'0' };
  const connect = async name => { const sql = new Client({connectionString:q.url(target.cluster,name),connectionTimeoutMillis:5000}); await sql.connect(); await q.identity(sql,target.cluster,name); return sql; };
  const report = { began:new Date().toISOString(),passed:false,database:target.database,directory:target.directory,evidenceDirectory:target.evidence,sourceBinding:target.sourceBinding,
    testDependencyCandidate:input.target.candidate,sourceManifestForDependenciesOnly:input.manifest.manifestSha256,runner:pin(__filename),target:pin(targetFile),runtimeInputs:Object.values(runtime).map(pin),checks:[],
    classification:'Actual isolated PostgreSQL invitation worker/CAS/rollback checks with simulated provider; real Node CLI imports and empty-queue queries; no live sends, app build, new clean install or production qualification' };
  let initiated=false,postmasterId,failure,originalBefore,databasesBefore;
  try {
    assert.equal(spawnSync(path.join(q.bin,'pg_ctl.exe'),['-D',path.join(target.cluster.directory,'data'),'status'],{env:retained,windowsHide:true,stdio:'ignore'}).status,3,'Owned cluster is in use');
    initiated=true; q.execution(target.directory,target.evidence,'pg-start',path.join(q.bin,'pg_ctl.exe'),['-D',path.join(target.cluster.directory,'data'),'-l',path.join(target.cluster.directory,'postgres.log'),'-o','-p 58033 -h 127.0.0.1','-w','start'],target.directory,env,{stdio:'ignore'});
    const header=fs.readFileSync(path.join(target.cluster.directory,'data/postmaster.pid'),'utf8').split(/\r?\n/); postmasterId=header[0]; assert.match(postmasterId,/^[1-9][0-9]*$/); assert.equal(Number(header[3]),58033); assert.equal(fs.realpathSync(header[1]).toLowerCase(),fs.realpathSync(path.join(target.cluster.directory,'data')).toLowerCase()); assert(Number(header[2])>=Math.floor(Date.parse(report.began)/1000)-1);
    const admin=await connect('postgres'); try { databasesBefore=(await admin.query('SELECT datname FROM pg_database ORDER BY datname')).rows.map(row=>row.datname); assert(!databasesBefore.includes(target.database),'Existing test database refused'); write(path.join(target.evidence,'IDENTITY.json'),await q.identity(admin,target.cluster,'postgres')); } finally {await admin.end()}
    originalBefore=[]; for(const name of target.originalDatabases){assert(databasesBefore.includes(name));const sql=await connect(name);try{originalBefore.push({database:name,profile:await q.profile(sql)})}finally{await sql.end()}}
    const originalBeforeFile=path.join(target.directory,'original-databases-before.private.json');write(originalBeforeFile,originalBefore);report.originalBefore=pin(originalBeforeFile);
    q.execution(target.directory,target.evidence,'fresh123',process.execPath,[path.join(input.target.candidate,'scripts/prisma-fresh-replay-runner.js'),'--root',input.target.candidate,'--database',target.database,'--out',path.join(target.evidence,'fresh123.md'),'--json-out',path.join(target.evidence,'fresh123.json')],input.target.candidate,{...env,INVITE_ENV_GUARD_REPORT:path.join(target.directory,'fresh-env-guard.private.json')});
    const replay=read(path.join(target.evidence,'fresh123.json'));assert(replay.ready&&replay.history.appliedCount===123&&replay.drift.unexpected.length===0);report.checks.push('fresh123ReplayTwice');
    const results=path.join(target.directory,'jest-results.private.json'),probe=path.join(target.directory,'probe-evidence.private.json'),jestEnvGuard=path.join(target.directory,'jest-env-guard.private.json');
    q.execution(target.directory,target.evidence,'native-worker-tests',process.execPath,[path.join(input.target.candidate,'node_modules/jest/bin/jest.js'),'--config',runtime.configFile,'--runInBand','--no-cache','--runTestsByPath',path.join(target.source,relative(path.join(__dirname,'invite-worker.postgres.test.ts'))),'--json','--outputFile',results],target.directory,{...env,INVITE_POSTGRES_EVIDENCE:probe,INVITE_ENV_GUARD_REPORT:jestEnvGuard});
    const tests=read(results),observed=read(probe);assert(tests.success);assert.equal(tests.numTotalTests,17);assert.equal(tests.numPassedTests,17);assert.equal(tests.numFailedTests,0);assert.equal(tests.numPendingTests,0);assert.equal(tests.numTodoTests,0);assert.equal(observed.checks.length,17);assert(observed.checks.every(check=>check.passed));
    write(path.join(target.evidence,'TEST_RESULTS.json'),{passed:true,realPostgresTests:17,providerDependencySimulated:true,skipped:0,todo:0,outcomes:tests.testResults.flatMap(suite=>suite.assertionResults.map(test=>({name:test.fullName,status:test.status}))),privateResults:pin(results),privateProbe:pin(probe)}); report.checks.push('seventeenRealWorkerDatabaseCases');
    const newSql=await connect(target.database);let emptyTenant,beforeCli;try{emptyTenant='invite-cli-empty-'+crypto.randomBytes(10).toString('hex');await newSql.query('INSERT INTO organizations (id,name,slug,"updatedAt") VALUES($1,$2,$1,NOW())',[emptyTenant,'Synthetic empty CLI tenant']);beforeCli=await q.profile(newSql)}finally{await newSql.end()}
    const cliGuard=path.join(target.directory,'cli-env-guard.private.json');
    q.execution(target.directory,target.evidence,'actual-node-cli',process.execPath,[path.join(input.target.candidate,'node_modules/ts-node/dist/bin.js'),'--project',runtime.tsConfig,'--transpile-only',path.join(target.source,'scripts/referral-delivery-worker.ts'),'--organization-id',emptyTenant,'--worker-id','synthetic-cli-owned-worker','--limit','1'],target.directory,{...env,INVITE_ENV_GUARD_REPORT:cliGuard},{timeout:60000});
    const cliExecution=read(path.join(target.evidence,'actual-node-cli.execution.json')),stdout=cliExecution.privateOutputs.find(item=>item.stream==='stdout'); const lines=fs.readFileSync(stdout.path,'utf8').trim().split(/\r?\n/).map(line=>JSON.parse(line));assert.equal(lines.length,1);assert.deepEqual(lines[0],{help:false,statements:[],accountantInvites:[]});
    const checkedSql=await connect(target.database);try{assert.deepEqual(await q.profile(checkedSql),beforeCli,'Actual empty CLI changed database records');q.assertHistory((await checkedSql.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows,input.catalog);assert.deepEqual(await q.inventory(checkedSql),{triggers:149,checks:231,functions:77})}finally{await checkedSql.end()}
    const guardFiles=[],freshBlockedOwnedProbes=[];for(const [kind,prefix] of [['fresh',path.join(target.directory,'fresh-env-guard.private.json')],['jest',jestEnvGuard],['cli',cliGuard]]){const base=path.basename(prefix),matches=fs.readdirSync(target.directory).filter(name=>name.startsWith(base+'.')&&/^\d+\.json$/.test(name.slice(base.length+1)));assert(matches.length>0,'Missing native environment-read guard receipt');for(const name of matches){const file=path.join(target.directory,name),guard=read(file);assert(guard.noEnvironmentContentsLoaded&&guard.allEnvironmentContentReadsBlocked&&guard.environmentContentsRead===0);assert(Array.isArray(guard.attempts));assert.equal(guard.blockedEnvironmentReadAttempts,guard.attempts.length);assert.equal(guard.unexpectedEnvironmentReadAttempts,0);if(kind!=='fresh')assert.equal(guard.attempts.length,0,'Runtime environment read attempt refused');for(const attempt of guard.attempts){assert(ownedEnvironmentPaths.some(expected=>expected.toLowerCase()===path.resolve(attempt.path).toLowerCase()));assert(attempt.exactOwnedCandidateEnv&&attempt.allowedAbsentOwnedProbe&&attempt.exists===false&&attempt.absenceCode==='ENOENT');requireAbsentEnvironmentPath(attempt.path);freshBlockedOwnedProbes.push(attempt)}guardFiles.push(file)}}ownedEnvironmentPaths.forEach(requireAbsentEnvironmentPath);report.environmentGuards=guardFiles.map(pin);report.environmentGuardAdmission={allEnvironmentContentReadsBlocked:true,environmentContentsRead:0,unexpectedEnvironmentReadAttempts:0,runtimeEnvironmentReadAttempts:0,freshBlockedOwnedProbes,ownedPathsIndependentlyAbsent:ownedEnvironmentPaths};report.checks.push('actualNodeCliEmptyTenantNoSideEffects');
    const originalAfter=[];for(const name of target.originalDatabases){const sql=await connect(name);try{originalAfter.push({database:name,profile:await q.profile(sql)})}finally{await sql.end()}}assert.deepEqual(originalAfter,originalBefore,'Original qualified databases changed');const afterFile=path.join(target.directory,'original-databases-after.private.json');write(afterFile,originalAfter);report.originalAfter=pin(afterFile);
    const adminAfter=await connect('postgres');try{assert.deepEqual((await adminAfter.query('SELECT datname FROM pg_database ORDER BY datname')).rows.map(row=>row.datname),[...databasesBefore,target.database].sort())}finally{await adminAfter.end()}
    verifyClosure(target);assert.deepEqual(source.identity(input.target.candidate),input.manifest.files);assert.deepEqual(sdkFiles(input.native.defaultClient),sdkBefore);assert.deepEqual(sdkFiles(path.join(root,'node_modules/.prisma/client')),sharedBefore);assert.equal(digest(__filename),report.runner.sha256);
    report.checks.push('originalDatabasesSourcesAndClientsUnchanged');report.passed=true;
  } catch(error) {failure=error;const privateFailure=path.join(target.directory,'failure.private.txt');fs.writeFileSync(privateFailure,String(error.stack||error),{flag:'wx'});report.privateFailure=pin(privateFailure)}
  finally {
    if(initiated)try{const file=path.join(target.cluster.directory,'data/postmaster.pid'),header=fs.readFileSync(file,'utf8').split(/\r?\n/);if(postmasterId)assert.equal(header[0],postmasterId);assert.match(header[0],/^[1-9][0-9]*$/);assert.equal(Number(header[3]),58033);assert.equal(fs.realpathSync(header[1]).toLowerCase(),fs.realpathSync(path.join(target.cluster.directory,'data')).toLowerCase());assert(Number(header[2])>=Math.floor(Date.parse(report.began)/1000)-1);q.execution(target.directory,target.evidence,'pg-stop',path.join(q.bin,'pg_ctl.exe'),['-D',path.join(target.cluster.directory,'data'),'-m','fast','-t','300','-w','stop'],target.directory,env,{stdio:'ignore',timeout:310000});assert(!fs.existsSync(file));report.ownedClusterStopped=true}catch(error){failure ||=error;report.passed=false;report.cleanupFailed=true}
    report.ended=new Date().toISOString();write(path.join(target.evidence,'RESULT.json'),report);
  }
  console.log(JSON.stringify({passed:report.passed,evidenceDirectory:target.evidence,ownedClusterStopped:report.ownedClusterStopped,realPostgresTests:report.passed?17:null}));if(failure)throw Error('Invitation PostgreSQL qualification did not meet the reviewed contract; private evidence retained');
}
if(require.main===module)Promise.resolve().then(()=>{if(process.argv.length===3&&process.argv[2]==='prepare')return prepare();assert.equal(process.argv.length,4);assert.equal(process.argv[2],'run');return run(path.resolve(process.argv[3]))}).catch(()=>{console.error('INVITATION_POSTGRES_QUALIFICATION_FAILED: inspect retained owned evidence; no private diagnostic values printed.');process.exitCode=1});
