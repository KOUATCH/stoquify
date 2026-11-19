// Fault only the isolated app copy. All authentication and database owners remain real.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd(),app=path.join(root,'.codex-tmp/close-browser-app');
fs.copyFileSync('actions/accounting/close-assurance.actions.ts',path.join(app,'actions/accounting/close-assurance.actions.ts'));
fs.writeFileSync(path.join(app,'lib/close-browser-cache.ts'),`import {revalidateTag as tag,revalidatePath as route} from 'next/cache';
import {existsSync,appendFileSync} from 'node:fs';import {join} from 'node:path';
function fault(){if(existsSync(join(process.cwd(),'.close-cache-fault'))){appendFileSync(join(process.cwd(),'.close-cache-probe'),'fault\\n');throw Error('Synthetic post-commit cache failure')}}
export function revalidateTag(...args:Parameters<typeof tag>){fault();return tag(...args)}
export function revalidatePath(...args:Parameters<typeof route>){fault();return route(...args)}
`);
const file='services/_shared/cache-revalidation.ts';fs.writeFileSync(path.join(app,file),fs.readFileSync(file,'utf8').replace(/from ["']next\/cache["']/g,'from "@/lib/close-browser-cache"'));
fs.writeFileSync(path.join(__dirname,'cache-instrumentation.json'),JSON.stringify({at:new Date().toISOString(),scope:'Only isolated app: existing cache helper throws after commit while marker exists',actionSha256:crypto.createHash('sha256').update(fs.readFileSync('actions/accounting/close-assurance.actions.ts')).digest('hex'),helperSha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')},null,2));
console.log('Isolated cache fault prepared; inactive until marker exists');
