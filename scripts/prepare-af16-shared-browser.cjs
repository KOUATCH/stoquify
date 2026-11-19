// Run after AF12's fixture and the shared-journey assertion have passed.
const fs=require('node:fs'),path=require('node:path'),c=require('./af16-verification-context.cjs')
let text=fs.readFileSync(path.join(c.root,'scripts/af16-verify-browser.cjs'),'utf8')
for(const [a,b] of [['af16-browser-private.json','af16-advisory-browser-private.json'],[c.database('af13'),c.database('af12')],['AF16/2026-10-25-run-01/AF13','AF16/2026-10-25-run-01/AF13/shared-browser']])text=text.split(a).join(b)
fs.writeFileSync(path.join(c.root,'scripts/af16-verify-shared-browser.cjs'),text)
console.log('Prepared AF13 workflow on the same AF12 reviewed client/period and local app.')
