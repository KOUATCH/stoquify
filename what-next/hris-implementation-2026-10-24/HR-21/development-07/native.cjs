// Fixture prerequisites only. Actual request/review/decision tests use Next HTTP/browser transport.
module.exports=function(db){
 const Module=require('node:module'),path=require('node:path'),fs=require('node:fs'),ts=require('typescript'),root=process.cwd();
 const resolve=Module._resolveFilename,load=Module._load;
 Module._load=function(request,parent,...rest){if(request==='@/prisma/db')return {db};if(request==='server-only')return {};return load.call(this,request,parent,...rest)};
 Module._resolveFilename=function(request,parent,...rest){if(request.startsWith('@/'))request=path.join(root,request.slice(2));return resolve.call(this,request,parent,...rest)};
 require.extensions['.ts']=function(module,file){const rel=path.relative(root,file);if(rel.startsWith('..')||path.isAbsolute(rel)||rel.includes('node_modules'))throw Error('Unexpected native source');module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file)};
 return {time:require('@/services/hris/operational-time.service'),leave:require('@/services/hris/leave-entitlement.service')};
};
