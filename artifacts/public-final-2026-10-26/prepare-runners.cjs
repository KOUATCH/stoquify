const fs=require('node:fs'),path=require('node:path');
const root=__dirname;
// Preserve earlier evidence; adapt the reviewed runners into this run's own folder.
let interaction=fs.readFileSync('artifacts/linked-public-pages-2026-10-25/interactions.cjs','utf8');
interaction=interaction.replace("const {chromium}=require('playwright');","const pw=require('playwright'),engine=process.env.REVIEW_BROWSER||'chrome';");
interaction=interaction.replace("http://localhost:4331","http://localhost:4334").replace("path.join(__dirname,'interactions')","path.join(__dirname,'interactions-'+engine)");
interaction=interaction.replace("chromium.launch({channel:'chrome',headless:true})","(engine==='chrome'?pw.chromium:pw[engine]).launch({headless:true,...(engine==='chrome'?{channel:'chrome'}:{})})");
interaction=interaction.replace("const errors=[];page.on('pageerror'", "const errors=[];page.on('console',m=>{if(/MISSING_MESSAGE|INVALID_MESSAGE|IntlError/.test(m.text()))errors.push({message:m.text(),url:page.url()});});page.on('pageerror'");
interaction=interaction.replace("await page.goto(base+'/'+locale+'/forgot-password',{waitUntil:'load',timeout:120000});", "await page.goto(base+'/'+locale+'/login',{waitUntil:'load',timeout:120000});await page.locator('a[href$=\"/forgot-password\"]').first().click();await page.locator('section[aria-labelledby=\"recovery-request-title\"]').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),locale);item.publicToAuthRecovery=true;");
fs.writeFileSync(path.join(root,'interactions.cjs'),interaction);
let registration=fs.readFileSync('artifacts/public-performance-2026-10-26/registration-steps.cjs','utf8');
registration=registration.replace("const {chromium}=require('playwright');","const pw=require('playwright'),engine=process.env.REVIEW_BROWSER||'chrome';").replaceAll('http://localhost:4332','http://localhost:4334').replace("path.join(__dirname,'registration')","path.join(__dirname,'registration-'+engine)").replace("chromium.launch({channel:'chrome',headless:true})","(engine==='chrome'?pw.chromium:pw[engine]).launch({headless:true,...(engine==='chrome'?{channel:'chrome'}:{})})");
fs.writeFileSync(path.join(root,'registration.cjs'),registration);
let workflow=fs.readFileSync('artifacts/public-payload-2026-10-26/verify-workflows.cjs','utf8');
workflow=workflow.replaceAll('http://localhost:4332','http://localhost:4334');
// The final run always exercises the built stylesheet; it cannot enable a CSS overlay.
workflow=workflow.replace("const sourceCss=process.env.SOURCE_CONTROL_CSS==='1';","const sourceCss=false;");
fs.writeFileSync(path.join(root,'workflows.cjs'),workflow);
let measure=fs.readFileSync('artifacts/public-payload-2026-10-26/measure.cjs','utf8').replaceAll('http://localhost:4332','http://localhost:4334');
fs.writeFileSync(path.join(root,'measure.cjs'),measure);
