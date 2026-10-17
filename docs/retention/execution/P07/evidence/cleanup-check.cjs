const net=require('node:net'),fs=require('node:fs'),path=require('node:path');
const target=JSON.parse(fs.readFileSync(path.join(__dirname,'DATABASE_TARGET.json'),'utf8'));
if(target.host!=='localhost'||!/^stoquify_retention_p07_20261017_[a-f0-9]+$/.test(target.database))throw Error('Unexpected target');
async function check(port){return new Promise(resolve=>{const socket=net.connect({host:'127.0.0.1',port});socket.setTimeout(3000);socket.once('connect',()=>{socket.destroy();resolve({port,status:'OPEN'});});socket.once('error',e=>resolve({port,status:e.code}));socket.once('timeout',()=>{socket.destroy();resolve({port,status:'TIMEOUT'});});});}
Promise.all([check(3188),check(target.port)]).then(ports=>{const result={at:new Date().toISOString(),ports,status:ports.every(p=>p.status==='ECONNREFUSED')?'PASS':'FAIL'};fs.writeFileSync(path.join(__dirname,'CLEANUP.json'),JSON.stringify(result,null,2));console.log(result);if(result.status!=='PASS')process.exitCode=1;});
