const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),privateRoot=path.join(root,'.codex-tmp/p03-grant-20261028-r1/native-client'),generated=path.join(privateRoot,'node_modules/.prisma/client');
const text=fs.readFileSync(path.join(generated,'index.js'),'utf8'),envPaths=JSON.parse(text.match(/"relativeEnvPaths":\s*(\{[\s\S]*?\})/)[1]);
const report={createdAt:new Date().toISOString(),passed:false,root:privateRoot,envPaths:[],files:[]};
for(const [kind,relative] of Object.entries(envPaths)){if(!relative)continue;const resolved=path.resolve(generated,relative);assert(resolved.toLowerCase().startsWith(privateRoot.toLowerCase()+path.sep));assert(!fs.existsSync(resolved));report.envPaths.push({kind,path:resolved,exists:false})}
assert(fs.existsSync(path.join(generated,'schema.prisma')));report.schemaPresent=true;
for(const name of fs.readdirSync(generated)){if(!fs.statSync(path.join(generated,name)).isFile())continue;const copy=fs.readFileSync(path.join(generated,name)),original=fs.readFileSync(path.join(root,'node_modules/.prisma/client',name));assert(copy.equals(original),name);report.files.push({path:name,sha256:crypto.createHash('sha256').update(copy).digest('hex')})}
report.passed=true;fs.writeFileSync(path.join(__dirname,'private-client-manifest.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:true,files:report.files.length,envPaths:report.envPaths}));
