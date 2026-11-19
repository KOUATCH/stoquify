const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sourceRoot=path.resolve(__dirname,'../../../..'),target=path.resolve('D:/Codex-Stoquify-P03-20261028-01a1816a');
assert.equal(target,'D:\\Codex-Stoquify-P03-20261028-01a1816a');assert(!fs.existsSync(target),'Fresh task directory required');
assert(fs.statSync('D:/').isDirectory());fs.mkdirSync(target);
fs.writeFileSync(path.join(target,'ownership.json'),JSON.stringify({task:'Stoquify P03 isolated build storage',sourceRoot,createdAt:new Date().toISOString(),purpose:'Task-owned source, dependency and artifact copies only; no production deployment'},null,2),{flag:'wx'});
console.log(JSON.stringify({created:target}));
