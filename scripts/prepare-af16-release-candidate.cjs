// Local AF16 build rehearsal: immutable source copy, copied dependencies, no .env or installation.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');
const { capture } = require('./candidate-snapshot.cjs');
const root = path.resolve(__dirname, '..');
const target = path.join(root, '.codex-tmp/af16-release-20261026');
const output = path.join(root, 'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-26-run-02');
const privateRoot = 'C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const env = {};
for (const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC']) if (process.env[key]) env[key] = process.env[key];
const run = (command, args, cwd, label, allowed = [0]) => {
  const log = fs.openSync(path.join(output, label + '.log'), 'wx');
  const result = spawnSync(command, args, { cwd, env, windowsHide: true, stdio: ['ignore',log,log], timeout: 900000 });
  fs.closeSync(log);
  if (!allowed.includes(result.status)) throw Error(`${label} failed (${result.status}): ${result.error?.message || 'see retained log'}`);
  return result.status;
};
function main() {
  if (fs.existsSync(target)) throw Error('Fresh candidate directory required; previous evidence is never reset');
  fs.mkdirSync(output, {recursive:true});
  const snapshot = capture(root);
  const archive = zlib.gzipSync(JSON.stringify(snapshot));
  fs.writeFileSync(path.join(privateRoot,'af16-release-source-20261026.json.gz'),archive,{flag:'wx'});
  fs.writeFileSync(path.join(output,'source-manifest.json'),JSON.stringify({...snapshot,files:snapshot.files.map(({content,...entry})=>entry),archiveSha256:hash(archive)},null,2),{flag:'wx'});
  // Local clone supplies Git identity/index only. It checks out no files and changes no primary refs.
  run('git',['clone','--no-checkout','--shared','--',root,target],root,'local-clone');
  run('git',['read-tree','HEAD'],target,'local-index');
  for (const entry of snapshot.files) {
    const file = path.join(target,entry.path);
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,Buffer.from(entry.content,'base64'),{flag:'wx'});
  }
  const reconstructed = capture(target).files;
  if (JSON.stringify(reconstructed.map(({path,sha256})=>({path,sha256}))) !== JSON.stringify(snapshot.files.map(({path,sha256})=>({path,sha256})))) throw Error('Reconstructed source identity differs');
  console.log(`Frozen ${snapshot.files.length} source files; copying installed dependencies into the new candidate.`);
  const dependencyTarget = path.join(target,'node_modules');
  if (fs.existsSync(dependencyTarget) || !fs.realpathSync(target).startsWith(fs.realpathSync(path.join(root,'.codex-tmp')) + path.sep)) throw Error('Unsafe dependency destination');
  const copied = run('robocopy.exe',[path.join(root,'node_modules'),dependencyTarget,'/E','/XJ','/R:0','/W:0','/MT:8','/NFL','/NDL','/NJH','/NP'],root,'dependency-copy',[0,1,2,3,4,5,6,7]);
  const versions = Object.fromEntries(['next','react','react-dom','prisma','@prisma/client','typescript'].map(name=>[name,JSON.parse(fs.readFileSync(path.join(dependencyTarget,name,'package.json'),'utf8')).version]));
  fs.writeFileSync(path.join(output,'candidate-preparation.json'),JSON.stringify({target,head:snapshot.head,sourceFiles:snapshot.files.length,sourceArchiveSha256:hash(archive),environmentFilesCopied:false,dependencies:'Physical copy of existing installed dependencies; not a clean locked installation',dependencyCopyExitCode:copied,versions,lockSha256:hash(fs.readFileSync(path.join(target,'package-lock.json')))},null,2),{flag:'wx'});
  console.log('Candidate prepared without environment files, installation or database changes.');
}
try {main();} catch(error) {console.error(error.stack);process.exitCode=1;}
