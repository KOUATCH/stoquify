"use strict";
// Local verification only: no migration, seed, deployment or provider credentials.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const ROOT = path.resolve(__dirname, "../../..");
const { targetUrl, DATABASE_NAME, BASE_URL, readPrivateFixture } = require(path.join(ROOT, "scripts/modern-modules-local-verification"));
const { runDirectNextBuild } = require(path.join(ROOT, "scripts/build-app-safe"));
const { PrismaClient } = require(path.join(ROOT, "node_modules/@prisma/client"));
const DIST = ".next-modern-modules-build-run02";
const RAW = path.join(ROOT, "playwright/.auth/workflow-modernization-build-01.log");
const OUT = path.join(__dirname, "evidence");
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
function binding() {
  const roots = ["app","actions","services","components","hooks","lib","config","prisma","scripts","tests","types","i18n","messages","utils",".github"];
  const found = execFileSync("rg", ["--files","--hidden",...roots.filter(dir=>fs.existsSync(path.join(ROOT,dir)))], {cwd:ROOT,encoding:"utf8",windowsHide:true}).trim().split(/\r?\n/).map(file=>file.replaceAll("\\","/"));
  const extra = ["package.json","package-lock.json","pnpm-lock.yaml","tsconfig.json","next-env.d.ts","next.config.mjs","middleware.ts"];
  const files = [...new Set([...found,...extra])].filter(file=>fs.existsSync(path.join(ROOT,file)) && /\.(?:[cm]?[jt]sx?|json|ya?ml|prisma|sql|css)$/.test(file) && !/(?:^|\/)(?:node_modules|graphify-out|generated|\.next[^/]*)(?:\/|$)/.test(file)).sort();
  return Object.fromEntries(files.map(file=>[file,hash(fs.readFileSync(path.join(ROOT,file)))]));
}
async function main() {
  if (fs.existsSync(RAW)) throw new Error("Build attempt already exists; preserve its evidence.");
  const target = targetUrl();
  target.searchParams.set("options", "-c default_transaction_read_only=on");
  const fixture = readPrivateFixture();
  const client = new PrismaClient({datasources:{db:{url:target.toString()}},log:[]});
  try {
    const rows = await client.$queryRawUnsafe("SELECT current_database() AS name, current_setting('transaction_read_only') AS readonly, current_setting('default_transaction_read_only') AS default_readonly");
    if(rows[0]?.name!==DATABASE_NAME||rows[0]?.readonly!=="on"||rows[0]?.default_readonly!=="on") throw new Error("Exact read-only synthetic database was not verified.");
  } finally { await client.$disconnect(); }
  const env={};
  for(const [key,value] of Object.entries(process.env)) if(/^(PATH|PATHEXT|SystemRoot|WINDIR|COMSPEC|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|COMMONPROGRAMFILES|HOMEDRIVE|HOMEPATH|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)) env[key]=value;
  for(const file of [".env",".env.local",".env.production",".env.production.local"]) {
    const absolute=path.join(ROOT,file); if(!fs.existsSync(absolute)) continue;
    for(const match of fs.readFileSync(absolute,"utf8").matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) env[match[1]]="";
  }
  Object.assign(env,{NODE_ENV:"production",NEXT_TELEMETRY_DISABLED:"1",NEXT_DIST_DIR:DIST,CIRCLE_NODE_TOTAL:"2",DATABASE_URL:target.toString(),DIRECT_URL:target.toString(),AUTH_SECRET:fixture.authSecret,NEXTAUTH_SECRET:fixture.authSecret,NEXTAUTH_URL:BASE_URL,NEXT_PUBLIC_BASE_URL:BASE_URL,NEXT_PUBLIC_APP_URL:BASE_URL,MODERN_MODULES_LOCAL_VERIFICATION:"1"});
  fs.mkdirSync(OUT,{recursive:true});
  const before=binding(), startedAt=new Date().toISOString();
  const configBefore=fs.readFileSync(path.join(ROOT,"tsconfig.json"),"utf8"), nextEnvBefore=fs.readFileSync(path.join(ROOT,"next-env.d.ts"),"utf8");
  fs.writeFileSync(path.join(OUT,"isolated-build-start.json"),JSON.stringify({startedAt,database:DATABASE_NAME,readOnlyVerified:true,output:DIST,sourceFiles:Object.keys(before).length,migrationOrSeedInvoked:false,providerCredentialsInherited:false,sources:before},null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({status:"started",database:DATABASE_NAME,readOnly:true,output:DIST,sourceFiles:Object.keys(before).length}));
  const descriptor=fs.openSync(RAW,"wx",0o600); let result;
  try { result=await runDirectNextBuild({root:ROOT,env,timeoutMs:0,stdio:["ignore",descriptor,descriptor]}); }
  finally {fs.closeSync(descriptor);}
  let log=fs.readFileSync(RAW,"utf8");
  for(const secret of [target.toString(),fixture.password,fixture.authSecret,decodeURIComponent(target.password)].filter(Boolean)) log=log.split(secret).join("[redacted]");
  log=log.replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi,"[redacted-database-url]");
  fs.writeFileSync(path.join(OUT,"isolated-build.log"),log,{flag:"wx"});
  const restored=[];
  function restore(file,content) {const absolute=path.join(ROOT,file),adjacent=absolute+".workflow-build-restore";fs.writeFileSync(adjacent,content,{flag:"wx"});fs.renameSync(adjacent,absolute);restored.push(file);}
  const configNow=fs.readFileSync(path.join(ROOT,"tsconfig.json"),"utf8");
  if(configNow!==configBefore){const parsed=JSON.parse(configNow);parsed.include=parsed.include.filter(value=>value!==`${DIST}/types/**/*.ts`);if(JSON.stringify(parsed)===JSON.stringify(JSON.parse(configBefore))) restore("tsconfig.json",configBefore);}
  const nextEnvNow=fs.readFileSync(path.join(ROOT,"next-env.d.ts"),"utf8");
  if(nextEnvNow!==nextEnvBefore){const reference=/\/\/\/ <reference path="[^"\r\n]*\/types\/routes\.d\.ts"\s*\/?>\r?\n/g;if(nextEnvNow.replace(reference,"")===nextEnvBefore.replace(reference,"")) restore("next-env.d.ts",nextEnvBefore);}
  const after=binding();
  const changed=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(file=>before[file]!==after[file]);
  const receipt={startedAt,finishedAt:new Date().toISOString(),database:DATABASE_NAME,readOnlyVerified:true,command:"node node_modules/next/dist/bin/next build",output:DIST,pageWorkers:1,reusedIsolatedCache:true,noAutomaticProcessTermination:true,generatedConfigRestoration:restored,...result,changedDuringBuild:changed,sourcesBefore:before,sourcesAfter:after,productionReleaseEvidence:false};
  fs.writeFileSync(path.join(OUT,"isolated-build-receipt.json"),JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({status:result.exitCode===0?"passed":"failed",exitCode:result.exitCode,changedDuringBuild:changed,receipt:"evidence/isolated-build-receipt.json"}));
  process.exitCode=result.exitCode===0&&changed.length===0?0:1;
}
main().catch(error=>{console.error(String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi,"[redacted-database-url]"));process.exitCode=1;});
