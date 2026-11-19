// Connection-only adapters for the existing authenticated AF12 workflow.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),c=require('./af16-verification-context.cjs')
const replacements=[['af12-prisma','af16-prisma'],['af12-browser-private.json','af16-advisory-browser-private.json'],['af01-host/af01-postgres','af16-postgres'],['stoquify_local_af12_20261025_r1',c.database('af12')],['postgresql://af01@','postgresql://af16@'],['55449','55451'],['3152','3176'],['AF12/2026-10-25-run-01','AF16/2026-10-25-run-01/AF12']]
const receipt=[]
for(const [source,target] of [['scripts/fixtures/advisory-outcomes-browser.cjs','scripts/fixtures/af16-advisory-browser.cjs'],['scripts/verify-advisory-outcomes-browser.cjs','scripts/af16-verify-advisory-browser.cjs']]){
 const original=fs.readFileSync(path.join(c.root,source),'utf8');let result=original
 for(const [a,b] of replacements)result=result.split(a).join(b)
 fs.writeFileSync(path.join(c.root,target),result);receipt.push({source,target,sourceSha256:crypto.createHash('sha256').update(original).digest('hex'),generatedSha256:crypto.createHash('sha256').update(result).digest('hex')})
}
let start=fs.readFileSync(path.join(c.root,'scripts/af16-start-browser.cjs'),'utf8')
for(const [a,b] of [['af16-browser-private.json','af16-advisory-browser-private.json'],[c.database('af13'),c.database('af12')],['3156','3176'],['af16-next','af16-advisory-next']])start=start.split(a).join(b)
fs.writeFileSync(path.join(c.root,'scripts/af16-start-advisory-browser.cjs'),start)
fs.writeFileSync(path.join(c.output,'advisory-browser-adapters.json'),JSON.stringify(receipt,null,2))
console.log('Prepared current AF12 browser adapters.')
