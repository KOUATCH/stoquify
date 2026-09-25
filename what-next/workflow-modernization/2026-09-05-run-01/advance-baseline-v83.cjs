const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const updates=['capture-source-baseline.cjs','update-workflow-register.cjs'].map(name=>{const file=path.join(__dirname,name),text=fs.readFileSync(file,'utf8');assert.ok(text.includes('source-baseline-v82.json'));assert.ok(!text.includes('source-baseline-v83.json'));return{file,text:text.replaceAll('source-baseline-v82.json','source-baseline-v83.json')}});
for(const item of updates)fs.writeFileSync(item.file,item.text);console.log('Baseline scripts now target v83; historical baseline retained.');
