// Serves only the four static demonstrator files on loopback. No application routes or data.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const files=new Map([['/','index.html'],['/index.html','index.html'],['/app.js','app.js'],['/model.js','model.js'],['/style.css','style.css']]);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{
 const item=files.get(new URL(req.url,'http://127.0.0.1').pathname);
 if(!['GET','HEAD'].includes(req.method)||!item){res.writeHead(404);res.end();return}
 res.writeHead(200,{'Content-Type':types[path.extname(item)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'"});
 if(req.method==='HEAD')res.end();else fs.createReadStream(path.join(__dirname,item)).pipe(res);
});
server.listen(43187,'127.0.0.1',()=>console.log('Stoquify isolated design prototype: http://127.0.0.1:43187'));
