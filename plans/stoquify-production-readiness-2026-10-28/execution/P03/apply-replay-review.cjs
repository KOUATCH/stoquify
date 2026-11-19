const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const target=path.resolve(__dirname,'../../../../services/accounting/accountant-access.service.ts');
assert.deepEqual(fs.readFileSync(target),fs.readFileSync(path.join(__dirname,'accountant-access.service.replay-v1.txt')),'Concurrent edit');
fs.writeFileSync(target,fs.readFileSync(path.join(__dirname,'replay-proposed/accountant-access.service.ts.txt')));
console.log('Applied reviewed receipt integrity and expiry corrections.');
