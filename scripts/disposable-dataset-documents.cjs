// Local-only synthetic document viewer; never serves credentials or other files.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../docs/engineering/database/disposable-dataset-2026-10-28/synthetic-documents');
http.createServer((req,res) => {
  const name = (req.url || '').slice(1);
  if (req.method !== 'GET' || !/^[A-Za-z0-9_-]+\.json$/.test(name)) { res.writeHead(404); res.end(); return; }
  const file = path.join(root, name);
  if (!fs.existsSync(file) || !fs.realpathSync(file).startsWith(fs.realpathSync(root) + path.sep)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  fs.createReadStream(file).pipe(res);
}).listen(3188, '127.0.0.1', () => console.log('Synthetic documents available on http://127.0.0.1:3188; localhost only.'));
