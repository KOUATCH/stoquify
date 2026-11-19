// Prevent a missing candidate dependency from being supplied by an ancestor workspace install.
const Module=require('node:module'),path=require('node:path'),fs=require('node:fs');
const candidate=fs.realpathSync(process.env.STOQUIFY_VERIFIED_CANDIDATE),allowed=path.join(candidate,'node_modules')+path.sep,resolve=Module._resolveFilename;
Module._resolveFilename=function(...args){const file=resolve.apply(this,args);if(typeof file==='string'&&file.includes(path.sep+'node_modules'+path.sep)&&!file.startsWith(allowed))throw Error('Dependency escaped clean candidate: '+args[0]);return file};
