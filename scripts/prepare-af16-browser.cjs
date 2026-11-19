// Reuse reviewed AF13 browser workflow on the current AF16 synthetic clone.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const c=require('./af16-verification-context.cjs')
const replacements=[
 ['af13-prisma','af16-prisma'],['af13-browser-app','af16-browser-app'],
 ['AF13/2026-10-25-run-03','AF16/2026-10-25-run-01/AF13'],
 ['af13-browser-private.json','af16-browser-private.json'],['af13-next','af16-next'],['.next-af13','.next-af16'],
 ['af13-postgres','af16-postgres'],['stoquify_local_af13_20261025_r1',c.database('af13')],
 ['postgresql://af01@','postgresql://af16@'],['55450','55451'],['3153','3156'],
]
const inputs=[['scripts/prepare-firm-practice-browser.cjs','scripts/af16-copy-browser.cjs'],['scripts/fixtures/firm-practice-browser.cjs','scripts/fixtures/af16-browser.cjs'],['scripts/start-firm-practice-browser.cjs','scripts/af16-start-browser.cjs'],['scripts/verify-firm-practice-browser.cjs','scripts/af16-verify-browser.cjs']]
const receipt=[]
for(const [source,target] of inputs){
 const original=fs.readFileSync(path.join(c.root,source),'utf8');let result=original
 for(const [from,to] of replacements)result=result.split(from).join(to)
 // A retained history card and current currency summary can both contain this amount.
 result=result.replaceAll('getByText(/USD 30.00 — Budget per/)','getByText(/^USD 30.00 — Budget per/)')
 fs.writeFileSync(path.join(c.root,target),result)
 receipt.push({source,target,sourceSha256:crypto.createHash('sha256').update(original).digest('hex'),generatedSha256:crypto.createHash('sha256').update(result).digest('hex')})
}
fs.writeFileSync(path.join(c.output,'browser-adapters.json'),JSON.stringify(receipt,null,2))
console.log('Prepared AF16-owned browser scripts; original phase scripts unchanged.')
