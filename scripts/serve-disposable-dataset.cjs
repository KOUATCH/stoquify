'use strict';
const fs=require('node:fs'),path=require('node:path'),dotenv=require('dotenv');
const {spawn}=require('node:child_process');
const {OUT,ownedTarget,childEnv}=require('./disposable-business-dataset.cjs');
const manifest=JSON.parse(fs.readFileSync(path.join(OUT,'manifest.json'),'utf8'));
if(process.argv[2]!==manifest.target.database)throw Error('Explicit owned database argument required');
const target=ownedTarget(process.argv[2]);
// Next loads .env itself. Define every local env-file key as empty before Next
// starts, then supply only isolated credentials. Actual provider secrets never pass.
const blank={};
for(const file of ['.env','.env.local','.env.development','.env.development.local'])if(fs.existsSync(file))for(const key of Object.keys(dotenv.parse(fs.readFileSync(file))))blank[key]='';
const env={...blank,...childEnv(target),NODE_ENV:'development',NEXT_PUBLIC_APP_URL:'http://localhost:3187',PORT:'3187',NEXT_DIST_DIR:'.next-synthetic-dataset',HRIS_SETUP_PILOT_ORGANIZATIONS:'synth12_douala,synth12_yaounde,synth12_bafoussam'};
const child=spawn(process.execPath,['scripts/dev-app-safe.js','--hostname','127.0.0.1'],{env,stdio:'inherit',windowsHide:true});
child.on('exit',code=>{process.exitCode=code||0});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));

