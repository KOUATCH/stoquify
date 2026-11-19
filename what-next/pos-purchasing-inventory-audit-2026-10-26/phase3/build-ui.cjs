// Local component bundle only. No app configuration, env files, server actions, database or providers.
const fs=require('node:fs'),path=require('node:path');
const root=process.cwd(), out=__dirname, webpackModule=require('next/dist/compiled/webpack/webpack');webpackModule.init();
const aliases={};
for(const name of ['actions/purchaseOrderWorkflow/purchase-receiving.actions','actions/purchaseOrderWorkflow/receipt-ledger-recovery.actions','actions/security/step-up-auth.actions','hooks/posHooks/useOfflineSync']) aliases['@/'+name+'$']=path.join(out,'ui-adapters.ts');
aliases['@']=root;
async function main(){
 await new Promise((resolve,reject)=>webpackModule.webpack({mode:'development',devtool:false,entry:path.join(out,'ui-entry.tsx'),output:{path:path.join(out,'ui-build'),filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js','.json'],alias:aliases},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(out,'ui-loader.cjs')}]},plugins:[new webpackModule.webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development')})],performance:{hints:false}},(error,stats)=>{if(error||stats.hasErrors())reject(error||Error(stats.toString({all:false,errors:true})));else{console.log(stats.toString({all:false,timings:true}));resolve();}}));
 const config=require('tailwindcss/loadConfig')(path.join(root,'tailwind.config.ts'));config.content=[path.join(root,'components/**/*.{ts,tsx}'),path.join(out,'ui-entry.tsx')];
 const css=await require('postcss')([require('tailwindcss')(config)]).process(fs.readFileSync(path.join(root,'app/globals.css'),'utf8').replace('@import "./public-contours.css";',''),{from:path.join(root,'app/globals.css')});
 fs.writeFileSync(path.join(out,'ui-build/styles.css'),css.css);fs.writeFileSync(path.join(out,'ui-build/index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phase 3 component verification</title><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script>window.process={env:{NODE_ENV:"development"}}</script><script src="/bundle.js"></script></body></html>');
}
main().catch(error=>{console.error(error);process.exitCode=1});
