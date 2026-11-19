const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..');
const files=['accountant-access.service.ts','accountant-access.schemas.ts','accountant-client-invite.service.ts'];
for(const name of files) assert.deepEqual(fs.readFileSync(path.join(root,'services/accounting',name)),fs.readFileSync(path.join(__dirname,name+'.before.txt')),'Concurrent change: '+name);
for(const name of files) fs.writeFileSync(path.join(root,'services/accounting',name),fs.readFileSync(path.join(__dirname,'replay-proposed',name+'.txt')));
console.log('Applied only the three guarded P03-R01 source edits.');
