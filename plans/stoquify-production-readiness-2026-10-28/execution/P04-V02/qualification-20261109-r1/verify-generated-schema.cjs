// Exact installed Prisma generation transform. Read-only, pinned, no config or database access.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
function verifyGeneratedSchema(source,expectedSourceSha256){
 const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
 const build=path.join(source,'node_modules/prisma/build');
 const cliBytes=fs.readFileSync(path.join(build,'index.js')),cli=cliBytes.toString('utf8');
 assert.equal(hash(cliBytes),'c2a77456b70e8ba1e640e122824ed694433828a7c0d76ff3db7fc376b4b0e1a0');
 const startMarker='var Oue=P((si,Rue)=>',endMarker='});var I3=';
 const start=cli.indexOf(startMarker),end=cli.indexOf(endMarker,start);
 assert(start>=0&&end>start);assert.equal(cli.indexOf(startMarker,start+1),-1);
 const bridge=cli.slice(start,end+3);assert.equal(bridge.length,4656);
 assert.equal(hash(bridge),'fc610219d7c2c1aafe33f5afe6174e220c150c9c8cbc520039d8d0f229fa9a06');
 const wasmPath=path.join(build,'prisma_schema_build_bg.wasm'),wasmBytes=fs.readFileSync(wasmPath);
 assert.equal(hash(wasmBytes),'bca8b35bd5ebe0164323d5f761a7a5075fa6ad00e1dfc7906e9da5d4c13c0287');
 const input=fs.readFileSync(path.join(source,'prisma/schema.prisma'));
 const generated=fs.readFileSync(path.join(source,'node_modules/.prisma/client/schema.prisma'));
 assert.equal(hash(input),expectedSourceSha256);
 const box={TextDecoder,TextEncoder,Uint8Array,WebAssembly,__dirname:build,input:input.toString('utf8'),require(name){assert.equal(name,'fs');return Object.freeze({readFileSync(file){assert.equal(path.resolve(file),path.resolve(wasmPath));return wasmBytes;}})}};
 box.global=box;box.PRISMA_WASM_PANIC_REGISTRY={set_message(){throw Error('Prisma schema WASM panic')}};
 const context=vm.createContext(box,{codeGeneration:{strings:false,wasm:true}});
 vm.runInContext('var P=(f,m)=>()=>{if(!m){m={exports:{}};f(m.exports,m)}return m.exports;};'+bridge+';this.bridge=Oue();',context,{timeout:10000});
 vm.runInContext('this.canonical=bridge.merge_schemas(JSON.stringify({schema:[["schema.prisma",input]]}));',context,{timeout:10000});
 const canonical=Buffer.from(box.canonical,'utf8');
 return {sourceSchemaSha256:hash(input),generatedSchemaSha256:hash(generated),canonicalSchemaSha256:hash(canonical),exactCanonicalMatch:canonical.equals(generated),transform:'Prisma 6.19.3 bundled schema WASM merge_schemas',cliSha256:hash(cliBytes),bridgeSha256:hash(bridge),wasmSha256:hash(wasmBytes),writes:false,databaseAccess:false};
}
module.exports={verifyGeneratedSchema};
