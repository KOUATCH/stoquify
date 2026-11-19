const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const {state}=require('./environment.cjs');const s=state();
const result=JSON.parse(fs.readFileSync(path.join(__dirname,'typecheck-result.json')));assert.equal(result.exitCode,0);
const info=JSON.parse(fs.readFileSync(path.join(s.candidate,'.next/cache/.tsbuildinfo')));
const names=info.fileNames.map(name=>name.replaceAll('\\','/'));
const report={projectTypecheckExitCode:result.exitCode,target:ts.ScriptTarget[info.options.target],fixtureIncluded:names.some(name=>name.endsWith('services/onboarding/__tests__/fixtures/opening-position-contract.ts')),privateGeneratedClientIncluded:names.some(name=>name.includes('private-dependencies/node_modules/.prisma/client/index.d.ts')),filesInCompilerProgram:names.length};
fs.writeFileSync(path.join(__dirname,'type-scope-proof.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.equal(report.target,'ES2017');assert.equal(report.fixtureIncluded,true);assert.equal(report.privateGeneratedClientIncluded,true);
