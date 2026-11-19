const path=require('node:path'),{spawn}=require('node:child_process');
const {root}=require('./environment.cjs'),{inspectBuildProcesses}=require(path.join(root,'scripts/build-app-safe.js'));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const started=Date.now();let previous='';
 for(;;){
  const probe=inspectBuildProcesses({includeDevProcesses:false});if(probe.error)throw probe.error;
  const ids=probe.orphans.map(p=>p.pid).join(',');if(ids!==previous){console.log(ids?'Waiting for existing build processes: '+ids:'Existing builds finished');previous=ids}
  if(probe.orphans.length===0)break;
  if(Date.now()-started>3600000)throw Error('Existing builds remain active; preserve them and retain the blocked gate');
  await wait(15000);
 }
 console.log('Starting the normal guarded build of the final refreshed candidate');
 const child=spawn(process.execPath,[path.join(__dirname,'compiler-final.cjs')],{stdio:'inherit',windowsHide:true});
 child.on('exit',code=>{process.exitCode=code??1});child.on('error',e=>{console.error(e.message);process.exitCode=1});
}
main().catch(e=>{console.error(e.message);process.exitCode=1});