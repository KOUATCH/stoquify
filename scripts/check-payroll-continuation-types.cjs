'use strict';
// Source-only semantic checks; no emit, environment loading, runtime imports or DB calls.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const names=['services/payroll/payroll-control.service.ts','services/payroll/payroll-history-proof.ts','prisma/disposable-payroll-continuation.ts','tests/fixtures/payroll-history-proof.ts','tests/postgres/payroll-blockers/history-proof.test.ts','services/payroll/__tests__/payroll-history-proof.test.ts'];
const roots=names.map(file=>path.resolve(file));
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile);
if(config.error)throw Error(ts.flattenDiagnosticMessageText(config.error.messageText,'\n'));
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,process.cwd());
const program=ts.createProgram(roots,{...parsed.options,noEmit:true,incremental:false,composite:false});
const all=ts.getPreEmitDiagnostics(program),owned=all.filter(d=>d.file&&roots.includes(path.resolve(d.file.fileName)));
const serialize=d=>({file:d.file?path.relative(process.cwd(),d.file.fileName).replaceAll('\\','/'):null,line:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).line+1:null,code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')});
const result={generatedAt:new Date().toISOString(),evidenceClass:'SOURCE_SEMANTIC_CHECK_NO_EMIT_NO_RUNTIME',roots:names,passed:all.length===0,owned:owned.map(serialize),imported:all.filter(d=>!owned.includes(d)).map(serialize)};
const folder='docs/database-seed/payroll-continuation-2026-11-02';fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'typecheck.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:result.passed,owned:result.owned.length,imported:result.imported.length}));process.exitCode=result.passed?0:1;
