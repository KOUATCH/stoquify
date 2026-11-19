const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const blocked = [];
function guard(file) {
  const name = path.basename(String(file));
  if (name === '.env' || name.startsWith('.env.')) { blocked.push(name); throw Error('R04 environment-file read denied'); }
}
for (const method of ['readFileSync','readFile','createReadStream','openSync','open']) {
  const original = fs[method]; fs[method] = function(file, ...args) { guard(file); return Reflect.apply(original, this, [file, ...args]); };
}
for (const method of ['readFile','open']) {
  const original = fs.promises[method]; fs.promises[method] = function(file, ...args) { guard(file); return Reflect.apply(original, this, [file, ...args]); };
}
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function(...args) {
  const first = args[0]; const options = Array.isArray(first) ? first[0] : first;
  const host = typeof options === 'object' ? options.host : typeof args[1] === 'string' ? args[1] : 'localhost';
  const port = typeof options === 'object' ? options.port : options;
  if (host !== '127.0.0.1' || Number(port) !== Number(process.env.P04R04_PORT)) throw Error('R04 outbound connection denied');
  return Reflect.apply(connect, this, args);
};
global.fetch = async () => { throw Error('R04 outbound fetch denied'); };
afterAll(() => { expect(blocked).toEqual([]); });
beforeAll(() => {
  const expected = path.resolve(__dirname, '../../../../../../.codex-tmp/p03-grant-20261028-r1/native-client/node_modules/.prisma/client/index.js');
  expect(require.resolve('@prisma/client')).toBe(expected);
});
