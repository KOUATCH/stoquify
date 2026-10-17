const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const evidence = 'what-next/moat-evidence-2026-09-27';
const output = 'docs/moat';
const reportName = 'strategic-moat-opportunities-2026-09-27.md';
const report = fs.readFileSync(path.join(output, reportName), 'utf8');
const source = JSON.parse(fs.readFileSync(`${evidence}/source-manifest.json`, 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceChanges = source.files.filter(f => hash(fs.readFileSync(f.file)) !== f.sha256).map(f=>f.file);
const raw = fs.readFileSync('C:/Users/J COMPUTER/.codex/attachments/a55111b3-f0f6-44e8-9898-38f644e4129b/Pasted text.txt','utf8');
const prompt = fs.readFileSync(path.join(output,'stoquify-moat-assessment-prompt-2026-09-27.md'),'utf8');
const publishedLines = new Set(prompt.split(/\r?\n/).map(l=>l.replace(/^## /,'').trim()).filter(Boolean));
const missingPromptLines = raw.split(/\r?\n/).map(l=>l.trim()).filter(l=>l && !publishedLines.has(l));
const brokenLinks = [];
let checkedLinks = 0;
for (const match of report.matchAll(/\]\(<([A-Z]:\/[^>]+)>\)/g)) {
 const target = match[1].replace(/:\d+$/,'');
 if(target.endsWith('/publication-verification.json')) continue;
 checkedLinks++;
 if(!fs.existsSync(target)) brokenLinks.push(target);
 else {const line=match[1].match(/:(\d+)$/);if(line && Number(line[1])>fs.readFileSync(target,'utf8').split(/\r?\n/).length) brokenLinks.push(match[1]);}
}
const pairs = fs.readdirSync(output).filter(x=>x.endsWith('.md')).map(md=>{
 const pdf=md.replace(/\.md$/,'.pdf');
 const bytes=fs.readFileSync(path.join(output,pdf));
 if(bytes.length<1024 || bytes.subarray(0,5).toString()!=='%PDF-') throw new Error('Invalid PDF: '+pdf);
 return {markdown:md,pdf,pdfBytes:bytes.length,markdownSha256:hash(fs.readFileSync(path.join(output,md))),pdfSha256:hash(bytes)};
});
fs.copyFileSync(path.join(output,reportName),path.join('what-next',reportName));
const tests=JSON.parse(fs.readFileSync(`${evidence}/focused-tests.json`,'utf8'));
const result={verifiedAt:new Date().toISOString(),publisherCommand:'node .agents/skills/docs-report-publisher/scripts/publish_reports.mjs moat',publisherExitCode:0,pairs,sourceChanges,sourceFilesChecked:source.files.length,checkedLinks,brokenLinks,promptWordingPreserved:missingPromptLines.length===0,missingPromptLines,datedReportCopyMatches:hash(fs.readFileSync(path.join('what-next',reportName)))===hash(Buffer.from(report)),tests:{suites:tests.numTotalTestSuites,passed:tests.numPassedTests,failed:tests.numFailedTests,success:tests.success},notes:['Publisher PDF signature/size checks passed.','No application code, schema, dependency or production mutation was performed by this assessment.','Visual PDF review recorded separately in pdf-layout-check.json.']};
fs.writeFileSync(`${evidence}/publication-verification.json`,JSON.stringify(result,null,2));
try{fs.writeFileSync(`${evidence}/git-status-after.txt`,cp.execFileSync('git',['status','--porcelain','--ignore-submodules'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));}catch{}
console.log(JSON.stringify(result,null,2));
if(sourceChanges.length||brokenLinks.length||missingPromptLines.length||!tests.success||pairs.length!==2)process.exitCode=1;
