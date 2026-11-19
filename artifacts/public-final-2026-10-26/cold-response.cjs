const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const phase=process.argv[2];if(!['baseline','after'].includes(phase))throw Error('Expected baseline or after');
const start=performance.now();let bytes=0;
const request=http.get('http://localhost:4334/en',response=>{const firstByteMs=performance.now()-start;response.on('data',chunk=>bytes+=chunk.length);response.on('end',()=>{const result={phase,status:response.statusCode,firstByteMs,totalMs:performance.now()-start,bytes};fs.writeFileSync(path.join(__dirname,phase+'-cold.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(response.statusCode!==200)process.exitCode=1;});});
request.setTimeout(120000,()=>request.destroy(Error('Cold request exceeded 120 seconds')));request.on('error',error=>{console.error(error);process.exitCode=1;});
