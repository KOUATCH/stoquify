// Also enforce the owned dependency boundary inside Jest's virtual module resolver.
const fs=require('node:fs'),path=require('node:path');
const cache=new Map(),allowed=(fs.realpathSync(process.env.STOQUIFY_VERIFIED_DEPENDENCIES)+path.sep).toLowerCase();
module.exports=(request,options)=>{
 const resolved=options.defaultResolver(request,options);
 if(resolved.includes(path.sep+'node_modules'+path.sep)){
  let real=cache.get(resolved);if(!real){real=fs.realpathSync(resolved);cache.set(resolved,real)}
  if(!real.toLowerCase().startsWith(allowed))throw Error('Jest dependency outside owned clean installation: '+request);
 }
 return resolved;
};
