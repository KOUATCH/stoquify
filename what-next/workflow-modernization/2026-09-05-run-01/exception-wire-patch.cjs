const fs=require('node:fs'),write=process.stdout.write.bind(process.stdout),parts=[];
fs.mkdirSync=()=>{};
fs.writeFileSync=(file,content)=>{
 const target=String(file).replaceAll('\\','/'),next=String(content).trimEnd().split(/\r?\n/);
 if(!fs.existsSync(file)){parts.push('*** Add File: '+target+'\n'+next.map(l=>'+'+l).join('\n'));return}
 const old=fs.readFileSync(file,'utf8').trimEnd().split(/\r?\n/);let a=0,b=0;
 while(a<old.length&&a<next.length&&old[a]===next[a])a++;
 while(b<old.length-a&&b<next.length-a&&old[old.length-1-b]===next[next.length-1-b])b++;
 const start=Math.max(0,a-2),tail=Math.min(b,2),lines=[...old.slice(start,a).map(l=>' '+l),...old.slice(a,old.length-b).map(l=>'-'+l),...next.slice(a,next.length-b).map(l=>'+'+l),...old.slice(old.length-b,old.length-b+tail).map(l=>' '+l)];
 parts.push('*** Update File: '+target+'\n@@\n'+lines.join('\n'));
};
console.log=()=>{};require('./wire-exception-workbench.cjs');write('*** Begin Patch\n'+parts.join('\n')+'\n*** End Patch');
