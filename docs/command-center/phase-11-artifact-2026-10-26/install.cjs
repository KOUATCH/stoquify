// Installs pinned packages into the owned empty candidate only. No lifecycle scripts or audit uploads.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),s=JSON.parse(fs.readFileSync(path.join(root,'.codex-tmp/command-center-phase11-current.json')));
assert.equal(path.dirname(s.work),path.join(root,'.codex-tmp'));assert.match(path.basename(s.work),/^phase11-[a-f0-9]{10}$/);assert.equal(s.candidate,path.join(s.work,'candidate'));
assert.ok(!fs.existsSync(path.join(s.candidate,'node_modules')),'Fresh install requires an empty dependency directory');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),before=hash(path.join(s.candidate,'package-lock.json'));
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE|SystemDrive|PROCESSOR_ARCHITECTURE|NUMBER_OF_PROCESSORS)$/i.test(k)));
Object.assign(env,{npm_config_userconfig:s.cleanConfig,npm_config_globalconfig:path.join(s.work,'empty-global-npmrc'),npm_config_cache:s.cache,npm_config_registry:'https://registry.npmjs.org',npm_config_audit:'false',npm_config_fund:'false',npm_config_ignore_scripts:'true'});fs.writeFileSync(env.npm_config_globalconfig,'');
const npm=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');assert.ok(fs.existsSync(npm));
const log=fs.openSync(path.join(__dirname,'install.log'),'wx');
const args=[npm,'ci','--ignore-scripts','--no-audit','--no-fund'];
const child=spawn(process.execPath,args,{cwd:s.candidate,env,windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);
child.on('error',e=>{console.error(e.message);process.exitCode=1});
child.on('exit',code=>{const result={exitCode:code,lockfileUnchanged:before===hash(path.join(s.candidate,'package-lock.json')),lifecycleScriptsExecuted:false,auditUpload:false,sharedDependenciesUsed:false,registry:'https://registry.npmjs.org',node:process.version,productionAccess:false};fs.writeFileSync(path.join(__dirname,'install-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exitCode=code===0&&result.lockfileUnchanged?0:1});
