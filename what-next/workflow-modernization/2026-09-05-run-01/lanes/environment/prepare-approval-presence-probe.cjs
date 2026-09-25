const fs=require('fs'),path=require('path');
let code=fs.readFileSync(path.join(__dirname,'verify-purchase-approval-navigation.cjs'),'utf8');
const start=code.indexOf(' const shot=async'),end=code.indexOf('\n const dialog=',start);if(start<0||end<0)throw Error('Missing screenshot anchors');
code=code.slice(0,start)+" const shot=async()=>{};"+code.slice(end);
code=code.replace("file='purchase-approval-navigation-probe-'", "file='purchase-approval-presence-probe-'");
code=code.replace('result.currentPath=new URL(page.url()).pathname;', 'result.currentPath=new URL(page.url()).pathname;');
code=code.replace('const start=Date.now();','const start=Date.now();');
fs.writeFileSync(path.join(__dirname,'verify-purchase-approval-presence.cjs'),code,{flag:'wx'});console.log('Prepared screenshot-free approval presence diagnosis.');
