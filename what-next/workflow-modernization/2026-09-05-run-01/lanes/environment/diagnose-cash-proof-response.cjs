const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),file=path.join(__dirname,'verify-cash-proof-browser.cjs');let source=fs.readFileSync(file,'utf8');
source=source.replace("  let abortNext=false;", "  let verifiedResponse=false;let abortNext=false;");
source=source.replace("   return route.continue();",()=>`   if(route.request().headers()['next-action'])return (async()=>{
    const actual=await route.fetch({maxRedirects:0});const body=await actual.body();
    result.actionStatus=actual.status();result.actionRedirect=Boolean(actual.headers()['x-action-redirect']);
    verifiedResponse=body.toString().includes(transaction.id);result.actionContainsSubject=verifiedResponse;
    result.actionIncludesPage=body.toString().includes('CashCommandDashboard');
    await route.fulfill({response:actual,body});
   })();
   return route.continue();`);
source=source.replace("assert.ok((await response.text()).includes(transaction.id),'Actual proof response must identify the selected owned transaction');", "assert.ok(verifiedResponse,'Actual proof response must identify the selected owned transaction');");
const pending=file+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,source,{flag:'wx'});fs.renameSync(pending,file);
