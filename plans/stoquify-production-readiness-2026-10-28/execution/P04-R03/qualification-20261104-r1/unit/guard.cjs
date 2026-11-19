const fs=require('node:fs'),path=require('node:path');
const blocked=[];function guard(p){const n=path.basename(String(p));if(n==='.env'||n.startsWith('.env.')){blocked.push(n);throw Error('Environment file access forbidden')}}
for(const m of ['readFileSync','readFile','createReadStream','openSync','open']){const original=fs[m];fs[m]=function(p,...args){guard(p);return Reflect.apply(original,this,[p,...args])}}
for(const m of ['readFile','open']){const original=fs.promises[m];fs.promises[m]=function(p,...args){guard(p);return Reflect.apply(original,this,[p,...args])}}
for(const name of ['node:net','node:tls']){const mod=require(name);for(const method of ['connect','createConnection'])if(mod[method])mod[method]=()=>{throw Error('Network disabled in isolated unit lane')}}
global.fetch=()=>{throw Error('Network disabled in isolated unit lane')};
jest.mock('@/prisma/db',()=>({db:{}}));jest.mock('server-only',()=>({}));
afterAll(()=>expect(blocked).toEqual([]));
require('node:net').Socket.prototype.connect=function(){throw Error('Network socket disabled in isolated unit lane')};
