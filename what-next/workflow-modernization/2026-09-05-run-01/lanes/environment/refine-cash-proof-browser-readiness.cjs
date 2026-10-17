const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),file=path.join(__dirname,'verify-cash-proof-browser.cjs');
let source=fs.readFileSync(file,'utf8');
source=source.replace("let abortNext=false;","let abortNext=false;result.stage=locale+' login';");
source=source.replace("abortNext=false;return route.abort('failed');", "abortNext=false;result.transportAborted=true;return route.abort('failed');");
source=source.replace("abortNext=true;await button.focus();",`await expect.poll(() => button.evaluate(element => Object.keys(element).some(key => key.startsWith('__reactProps$') && typeof element[key]?.onClick === 'function'))).toBe(true);
  result.stage=locale+' hydrated transport opening';abortNext=true;await button.focus();`);
source=source.replace("const received=page.waitForResponse", "result.stage=locale+' actual proof retry';const received=page.waitForResponse");
source=source.replace("await db.role.update({where:{id:own.role.id},data:{permissions:['finance.read','dashboard.read']}});", "result.stage=locale+' current permission revocation';await db.role.update({where:{id:own.role.id},data:{permissions:['finance.read','dashboard.read']}});");
const pending=file+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,source,{flag:'wx'});fs.renameSync(pending,file);
