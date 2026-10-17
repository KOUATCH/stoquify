const fs=require('node:fs'),path=require('node:path');
const builder=fs.readFileSync(path.join(__dirname,'build-cash-proof-browser.cjs'),'utf8').replace("'verify-cash-proof-browser.cjs'","'verify-cash-proof-browser.cjs.rebuilt'");
new Function('require','__dirname',builder)(require,__dirname);
const refine=fs.readFileSync(path.join(__dirname,'refine-cash-proof-browser-readiness.cjs'),'utf8').replace("'verify-cash-proof-browser.cjs'","'verify-cash-proof-browser.cjs.rebuilt'").replace('"abortNext=true;await button.focus();",`','"abortNext=true;await button.focus();",()=>`');
new Function('require','__dirname',refine)(require,__dirname);
fs.renameSync(path.join(__dirname,'verify-cash-proof-browser.cjs.rebuilt'),path.join(__dirname,'verify-cash-proof-browser.cjs'));
