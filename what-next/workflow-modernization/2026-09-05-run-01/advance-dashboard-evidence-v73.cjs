const fs=require('fs'),path=require('path');
for(const file of ['capture-source-baseline.cjs','update-workflow-register.cjs']){
 const p=path.join(__dirname,file),s=fs.readFileSync(p,'utf8');
 if(!s.includes('source-baseline-v72.json')||s.includes('source-baseline-v73.json'))throw Error('Unexpected evidence pointer '+file);
 fs.writeFileSync(p,s.replaceAll('source-baseline-v72.json','source-baseline-v73.json'));
}
console.log('Advanced mutable evidence pointers; prior baselines preserved.');
