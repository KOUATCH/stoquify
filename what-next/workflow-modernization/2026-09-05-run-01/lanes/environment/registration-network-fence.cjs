"use strict";
// Owned local verification only. No production code imports this preload.
const original=globalThis.fetch;
globalThis.fetch=async function(input,...args){const url=new URL(typeof input==="string"?input:input instanceof URL?input.toString():input.url);if(!["localhost","127.0.0.1","::1","[::1]"].includes(url.hostname))throw new Error("Owned registration verification blocks external fetch");return original.call(this,input,...args);};
