// Local protocol simulation only. Never a malware/provider certification.
module.exports=async function(base,token){
 const https=require('node:https'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
 const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),objects=new Map(),tombstones=new Set(),audit=[];
 const server=https.createServer({key:fs.readFileSync(path.join(base,'runtime-files/gateway-key.pem')),cert:fs.readFileSync(path.join(base,'runtime-files/gateway-cert.pem'))},async(req,res)=>{
  try{
   if(req.headers.authorization!=='Bearer '+token){res.writeHead(403);return res.end()}
   const parts=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>6*1024*1024)throw Error('Too large');parts.push(chunk)}const bytes=Buffer.concat(parts);
   const control=JSON.parse(fs.readFileSync(path.join(base,'gateway-control.json')));
   if(req.url==='/scan'&&req.method==='POST'){
    const verdict=control.scan==='reject'?'REJECTED':'CLEAN';audit.push({operation:'scan',hash:hash(bytes),result:control.scan});
    if(control.scan==='fail'){res.writeHead(503);res.end()}else{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({sha256:hash(bytes),verdict,reference:'synthetic-local-protocol-only'}))}
   }else if(req.url.startsWith('/objects/')){
    const key=decodeURIComponent(req.url.slice(9));audit.push({operation:req.method,keyHash:hash(key)});
    if(req.method==='PUT'){if(tombstones.has(key)||objects.has(key)&&!objects.get(key).equals(bytes))throw Error('Immutable conflict');objects.set(key,bytes);res.setHeader('x-content-sha256',hash(bytes));res.setHeader('x-immutable-object-sha256',hash(key));res.end()}
    else if(req.method==='GET'){const value=objects.get(key);if(!value){res.writeHead(404);res.end()}else{res.setHeader('Content-Type','application/octet-stream');res.end(value)}}
    else if(req.method==='DELETE'){tombstones.add(key);objects.delete(key);res.setHeader('x-tombstone-sha256',hash(key));res.end()}
    else{res.writeHead(405);res.end()}
   }else{res.writeHead(404);res.end()}
  }catch{res.writeHead(500);res.end()}finally{fs.writeFileSync(path.join(base,'gateway-audit.json'),JSON.stringify({kind:'LOCAL_SIMULATION',audit},null,2))}
 });
 await new Promise((resolve,reject)=>server.once('error',reject).listen(35588,'127.0.0.1',resolve));return server;
};
