// Fail closed before test/application imports; never read an environment file.
const fs=require('node:fs'),path=require('node:path');
const blocked=[];
function guard(value){
  const name=path.basename(String(value));
  if(name==='.env'||name.startsWith('.env.')){blocked.push(name);throw Error('Environment file access denied by isolated P03 test guard')}
}
for(const method of ['readFileSync','readFile','createReadStream','openSync','open']){
  const original=fs[method];fs[method]=function(file,...args){guard(file);return Reflect.apply(original,this,[file,...args])};
}
for(const method of ['readFile','open']){
  const original=fs.promises[method];fs.promises[method]=function(file,...args){guard(file);return Reflect.apply(original,this,[file,...args])};
}
afterAll(()=>{expect(blocked).toEqual([])});
beforeAll(()=>{
  const expected=path.resolve(__dirname,'../../../../.codex-tmp/p03-grant-20261028-r1/native-client/node_modules/.prisma/client/index.js');
  expect(require.resolve('@prisma/client')).toBe(expected);
});
