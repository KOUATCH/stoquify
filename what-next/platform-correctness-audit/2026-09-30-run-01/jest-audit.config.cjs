// Preserve repository Jest configuration, avoiding type-checking its TS config during discovery.
const fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript');
const file=path.join(process.cwd(),'jest.config.ts');
const source=fs.readFileSync(file,'utf8').replace('const config: Config = {','const config: Config = {\n  rootDir: process.cwd(),\n  roots: ["<rootDir>/services", "<rootDir>/lib"],');
const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(process.cwd());
m._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,file);
module.exports=m.exports.default;
