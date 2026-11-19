const ts=require('typescript'),fs=require('node:fs'),path=require('node:path');
const root=process.cwd();const loaded=ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile);
const config=ts.parseJsonConfigFileContent(loaded.config,ts.sys,root);
const counts={};for(const f of config.fileNames){const top=path.relative(root,f).split(/[\\/]/)[0];counts[top]=(counts[top]||0)+1;}
const report={files:config.fileNames.length,groups:Object.fromEntries(Object.entries(counts).sort((a,b)=>b[1]-a[1])),diagnostics:config.errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' '))};
fs.writeFileSync(path.join(__dirname,'type-scope.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
