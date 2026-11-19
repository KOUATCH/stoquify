// Source-only TypeScript validation: no emit, environment loading or DB imports.
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const roots = ['prisma/disposable-business-dataset.ts','prisma/disposable-business-workflows.ts','prisma/disposable-people-workflows.ts','prisma/disposable-pos-workflows.ts','prisma/disposable-payment-workflows.ts','prisma/disposable-history.ts','prisma/disposable-scenarios.ts','prisma/disposable-delivery-scenarios.ts','prisma/disposable-bank-scenarios.ts','prisma/disposable-hr-structure.ts',...fs.readdirSync('prisma').filter(f=>f.startsWith('disposable-remaining')&&f.endsWith('.ts')).map(f=>'prisma/'+f)].map(f => path.resolve(f));
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const program = ts.createProgram(roots, { ...parsed.options, noEmit:true, incremental:false, composite:false });
const all = ts.getPreEmitDiagnostics(program);
const own = all.filter(d => d.file && roots.includes(path.resolve(d.file.fileName)));
const serialize = d => ({ file:d.file?.fileName, line:d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : null, code:d.code, message:ts.flattenDiagnosticMessageText(d.messageText,'\n') });
const report = { own:own.map(serialize), importedSourceDiagnosticCount:all.length-own.length, evidence:'Source type checking only; no code executed, no database or browser validation.' };
fs.writeFileSync('docs/engineering/database/disposable-dataset-2026-10-28/typecheck.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
process.exitCode=own.length?1:0;

