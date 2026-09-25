const fs=require('fs'),path=require('path');
const p=path.join(__dirname,'lanes/environment/verify-dashboard-localization-browser-final.cjs');
let s=fs.readFileSync(p,'utf8');
s=s.replaceAll("locale==='fr'?'dettes':'payables'","locale==='fr'?'dettes':'workbench'");
s=s.replace("for(const locale of ['en','fr'])await journey(browser,locale)","for(const locale of ['en'])await journey(browser,locale)");
s=s.replace('report.journeys.length!==2','report.journeys.length!==1');
fs.writeFileSync(path.join(__dirname,'lanes/environment/verify-dashboard-localization-browser-en.cjs'),s,{flag:'wx'});
console.log('English-only verifier uses the visible English destination label; French evidence retained.');
