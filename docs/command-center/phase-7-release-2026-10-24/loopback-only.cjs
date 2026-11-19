// Test-process network boundary; no production credentials are inherited.
const net=require('node:net');
const original=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){
 const input=Array.isArray(args[0])?args[0]:args;
 const first=input[0];
 const host=first&&typeof first==='object'?first.host:typeof input[1]==='string'?input[1]:undefined;
 if(host&&!['localhost','127.0.0.1','::1','[::1]','::ffff:127.0.0.1'].includes(host))throw Error('Disposable network boundary refused non-loopback connection');
 return original.apply(this,args);
};
const originalFetch=globalThis.fetch;
if(originalFetch)globalThis.fetch=function(input,options){const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);if(!['localhost','127.0.0.1','::1','[::1]'].includes(url.hostname))return Promise.reject(Error('Disposable fetch boundary refused non-loopback connection'));return originalFetch(input,options)};
