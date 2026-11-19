// Snapshot current application sources into an owned, env-free verification directory.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
const root = path.resolve(__dirname,'..'), target = path.join(root,'.codex-tmp','af08-browser-app')
const folders = ['actions','app','components','config','hooks','i18n','lib','messages','prisma','services','types','validations','src']
const files = ['package.json','tsconfig.json','next-env.d.ts','next.config.mjs','postcss.config.mjs','postcss.config.js','tailwind.config.ts','middleware.ts']
fs.mkdirSync(target,{recursive:true})
const hashes = []
for (const folder of folders) {
  if (!fs.existsSync(path.join(root,folder))) continue
  fs.cpSync(path.join(root,folder),path.join(target,folder),{recursive:true,filter: p => !p.split(path.sep).some(s=>['node_modules','__tests__','.git'].includes(s))})
}
for (const file of files) if(fs.existsSync(path.join(root,file))) fs.copyFileSync(path.join(root,file),path.join(target,file))
const modules = path.join(target,'node_modules')
// Remove only our verified junction itself, never its shared target or contents.
if (fs.existsSync(modules) && fs.lstatSync(modules).isSymbolicLink()) {
  if (fs.realpathSync(modules).toLowerCase() !== fs.realpathSync(path.join(root,'node_modules')).toLowerCase()) throw Error('Unexpected dependency junction')
  fs.unlinkSync(modules)
}
fs.mkdirSync(path.join(modules,'@prisma'),{recursive:true})
const clientLink=path.join(modules,'@prisma/client'), generated=path.join(root,'.codex-tmp/af07-prisma/client')
if(!fs.existsSync(generated))throw Error('Generate the isolated current AF08 Prisma client first')
if(!fs.existsSync(clientLink))fs.symlinkSync(generated,clientLink,'junction')
fs.mkdirSync(path.join(target,'scripts'),{recursive:true})
fs.copyFileSync(path.join(root,'scripts/dev-app-safe.js'),path.join(target,'scripts/dev-app-safe.js'))
function walk(dir) {
  for(const e of fs.readdirSync(dir,{withFileTypes:true})) {
    if(e.name==='node_modules' || e.name.startsWith('.next')) continue
    const f=path.join(dir,e.name)
    if(e.isDirectory()) walk(f)
    else if(e.isFile()) hashes.push({file:path.relative(target,f).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')})
  }
}
walk(target)
fs.writeFileSync(path.join(root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF08/2026-10-20-run-01/browser-source-manifest.json'),JSON.stringify({target,environmentFilesCopied:false,files:hashes},null,2))
console.log(`Copied ${hashes.length} application source files without environment files.`)

