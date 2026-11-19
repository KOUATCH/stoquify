// Synthetic static component harness only. No application configuration or database.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = {'/': ['index.html','text/html'], '/bundle.js': ['bundle.js','text/javascript'], '/style.css': ['style.css','text/css']};
http.createServer((req,res) => {
  const entry = files[new URL(req.url, 'http://127.0.0.1').pathname];
  if (!entry) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, {'Content-Type': entry[1]});
  fs.createReadStream(path.join(__dirname, entry[0])).pipe(res);
}).listen(18542, '127.0.0.1', () => console.log('Synthetic HR-02 harness on loopback:18542'));
