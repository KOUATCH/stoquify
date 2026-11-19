const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const pointer=path.join(root,'.codex-tmp/command-center-phase7-current.json');
function state(){const s=JSON.parse(fs.readFileSync(pointer));const expected=path.join(root,'.codex-tmp');if(path.dirname(s.work)!==expected||!/^phase7-[a-f0-9]{10}$/.test(path.basename(s.work)))throw Error('Unexpected owned environment');return {...s,...JSON.parse(fs.readFileSync(path.join(s.work,'private.json')))};}
function environment(s,mode='development'){
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE|SystemDrive|PROCESSOR_ARCHITECTURE|NUMBER_OF_PROCESSORS)$/i.test(k)));
 return {...env,...s.secrets,NODE_ENV:mode,DATABASE_URL:s.url,DIRECT_URL:s.url,SHADOW_DATABASE_URL:s.url,NEXTAUTH_URL:s.origin,NEXT_PUBLIC_BASE_URL:s.origin,NEXT_PUBLIC_APP_URL:s.origin,COMMAND_CENTER_PERSISTENCE_ENABLED:'true',NEXT_TELEMETRY_DISABLED:'1',NODE_OPTIONS:'--max-old-space-size=8192 --require "'+path.join(__dirname,'loopback-only.cjs').replaceAll('\\','/')+'"'};
}
const redact=value=>String(value??'').replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[DISPOSABLE_URL_REDACTED]');
module.exports={root,pointer,state,environment,redact};
