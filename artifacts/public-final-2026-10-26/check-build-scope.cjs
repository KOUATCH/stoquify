const ts=require('typescript'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile);assert.ok(!config.error);
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,process.cwd());assert.equal(parsed.errors.length,0);
const files=new Set(parsed.fileNames.map(f=>path.resolve(f)));
const included=['app/[locale]/layout.tsx','app/[locale]/(home)/layout.tsx','components/i18n/ApplicationMessages.tsx','components/landing/cinematic-hero.tsx'];
for(const file of included)assert.ok(files.has(path.resolve(file)),`${file} must remain type checked`);
const fixture='docs/command-center/phase-13-source-integration-2026-10-26/browser-entry.tsx';assert.ok(!files.has(path.resolve(fixture)));
const report={configuredFiles:files.size,applicationFilesStillIncluded:included,isolatedFixtureExcluded:fixture,strict:parsed.options.strict};assert.equal(report.strict,true);fs.writeFileSync(path.join(__dirname,'build-scope.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
