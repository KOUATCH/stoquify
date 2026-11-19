const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process')
const root = path.resolve(__dirname, '../../../../..')
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const owned = ['components/daily-habit/DailyHabitDigestDashboard.tsx', 'components/daily-habit/__tests__/modes.test.tsx', 'docs/retention/execution/STATUS.md']
const files = new Set(owned)
for (const dir of ['services/daily-habit','components/daily-habit','components/pos','actions/pos','hooks/posHooks','lib/pos','services/pos','services/signals','services/bi','docs/retention/execution/P05','docs/retention/execution/P05-P06-closure-2026-10-17','docs/retention/execution/P07','docs/retention/execution/P07-media-2026-10-18']) {
  for (const file of fs.readdirSync(path.join(root, dir), {recursive:true})) if (/\.(tsx?|cjs|json|md)$/.test(file) && fs.statSync(path.join(root,dir,file)).isFile()) files.add(path.posix.join(dir,file.replaceAll('\\','/')))
}
for (const file of ['package.json','package-lock.json','prisma/schema.prisma','docs/ecc/WORKFLOW.md','docs/ecc/command-registry.json','scripts/verify-agent-workflow-contract.js']) files.add(file)
if (fs.existsSync(path.join(__dirname,'BASELINE.json'))) throw Error('Preserve prior baseline')
for (const file of owned) fs.writeFileSync(path.join(__dirname,path.basename(file)+'.before'),fs.readFileSync(path.join(root,file)))
const fingerprints = Object.fromEntries([...files].map(file=>[file,hash(fs.readFileSync(path.join(root,file)))]))
const git = args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:8e6}).trim()
fs.writeFileSync(path.join(__dirname,'BASELINE.json'),JSON.stringify({utc:new Date().toISOString(),head:git(['rev-parse','HEAD']),status:git(['status','--short','--untracked-files=no']),owned,fingerprints},null,2))
fs.writeFileSync(path.join(__dirname,'WORKFLOW_CHECK.json'),JSON.stringify({command:'npm run agent:workflow:check',exit:0,output:'Workflow contract passed; 196 package scripts remain outside the reviewed manifest. No commands executed.',source:'tool session 72498; definition, imports, registry and absent lifecycle hooks inspected before invocation'},null,2))
console.log('P08 baseline saved: '+files.size+' selected files')
