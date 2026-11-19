// Only the isolated source copy is fault-instrumented. The live workspace is not.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd(),app=path.join(root,'.codex-tmp/workflow-closure-app');
const files=['services/purchase-order/purchase-order-authoring.service.ts','actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts','types/purchase-orders-system-types.ts','app/[locale]/(dashboard)/dashboard/purchase-orders/new/page.tsx','components/purchase-orders/ModernCreatePurchaseOrderForm.tsx','hooks/useRecentPurchaseOrderQueries.ts','hooks/usePurchaseOrderClone.ts','components/purchase-orders/ModernPurchaseOrderDetailPage.tsx','messages/en.json','messages/fr.json'];
for(const file of files)fs.copyFileSync(path.join(root,file),path.join(app,file));
fs.writeFileSync(path.join(app,'lib/workflow-closure-cache.ts'),`import {revalidateTag as tag,revalidatePath as route} from 'next/cache';
import {existsSync,appendFileSync} from 'node:fs'; import {join} from 'node:path';
function fault(){if(existsSync(join(process.cwd(),'.closure-cache-fault'))){appendFileSync(join(process.cwd(),'.closure-cache-probe'),'fault\\n');throw Error('Synthetic post-commit cache failure')}}
export function revalidateTag(...args:Parameters<typeof tag>){fault();return tag(...args)}
export function revalidatePath(...args:Parameters<typeof route>){fault();return route(...args)}
`);
for(const file of ['actions/purchaseOrderWorkflow/purchase-order-authoring.actions.ts','services/_shared/cache-revalidation.ts'])fs.writeFileSync(path.join(app,file),fs.readFileSync(path.join(root,file),'utf8').replace(/from ["']next\/cache["']/g,'from "@/lib/workflow-closure-cache"'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
fs.writeFileSync(path.join(__dirname,'browser-source-provenance.json'),JSON.stringify({at:new Date().toISOString(),files:files.map(file=>({file,sha256:hash(file)})),instrumentation:'Only isolated copy: next/cache wrapper throws when .closure-cache-fault exists; real authentication, Next actions, services and PostgreSQL remain active.'},null,2));
console.log('Copied '+files.length+' owned sources; isolated cache fault is opt-in by marker.');
