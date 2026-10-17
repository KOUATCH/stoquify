// Verification child preload only. Never imported by the application.
const net = require('node:net');
const allowed = host => ['localhost','127.0.0.1','::1','[::1]'].includes(host);
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const options = typeof args[0] === 'object' ? (Array.isArray(args[0]) ? args[0][0] : args[0]) : null;
  const host = options?.host || (typeof args[1] === 'string' ? args[1] : 'localhost');
  if (!allowed(host)) throw new Error('Verification refuses non-loopback network connection');
  return connect.apply(this,args);
};
const dns = require('node:dns');
const lookup = dns.lookup;
dns.lookup = function(host,...args) {
  if (!allowed(host)) throw new Error('Verification refuses non-loopback DNS lookup');
  return lookup.call(this,host,...args);
};
