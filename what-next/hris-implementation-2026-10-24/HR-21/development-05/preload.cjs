const fs = require('node:fs'), path = require('node:path');
if (process.env.DATABASE_URL !== 'postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public') throw Error('Owned HR browser database required');
const runtime = path.join(__dirname, 'runtime-files');
const originalRead = fs.readFileSync;
fs.readFileSync = function(file, ...args) {
  if (typeof file === 'string' && path.basename(file).startsWith('.env') && !path.resolve(file).startsWith(runtime + path.sep)) throw Error('External environment file denied');
  return originalRead.call(this, file, ...args);
};
const originalFetch = global.fetch;
global.fetch = function(input, init) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw Error('External HTTP disabled in isolated HR browser runtime');
  return originalFetch(input, init);
};
