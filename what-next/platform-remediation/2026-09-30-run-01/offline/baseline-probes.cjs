const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript');
const source='lib/pos/offline-local-queue.ts';
const compiled=ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exported={};
vm.runInNewContext(compiled,{exports:exported,crypto:require('crypto').webcrypto,TextEncoder,Date,Set,Map,Array,JSON,Error},{filename:source});
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
const config=()=>({organizationKey:'audit-org',deviceId:'audit-device',terminalId:'audit-terminal',locationId:'audit-location',storage:memory()});
(async()=>{
 const c=config();const returned=await Promise.all([exported.enqueueOfflineLocalEvent(c,{eventType:'OFFLINE_SALE_CAPTURED',payload:{sale:'A'}}),exported.enqueueOfflineLocalEvent(c,{eventType:'OFFLINE_SALE_CAPTURED',payload:{sale:'B'}})]);const persisted=exported.loadOfflineLocalQueue(c);
 const c2=config();const first=await exported.enqueueOfflineLocalEvent(c2,{eventType:'OFFLINE_SALE_CAPTURED',payload:{sale:'C'}});exported.markOfflineLocalQueueEntries(c2,[first.queueId],'SYNCING');const afterRestart=exported.loadOfflineLocalQueue(c2);
 const c3=config();c3.storage.setItem(exported.offlineQueueStorageKey(c3),'{damaged-json');const damaged=exported.loadOfflineLocalQueue(c3);
 const result={capturedAt:new Date().toISOString(),source,scope:'actual queue implementation transpiled in Node, in-memory Storage; not browser or server replay evidence',concurrentEnqueue:{returnedEvents:returned.length,sequences:returned.map(x=>x.event.deviceSeq),persistedCount:persisted.entries.length,nextSequence:persisted.nextSequence,storedSales:persisted.entries.map(x=>x.event.payload.sale)},restartDuringSync:{persistedStatus:afterRestart.entries[0].status,pendingCount:exported.offlineLocalQueuePendingEntries(afterRestart).length,batch:exported.buildOfflineSyncBatchEnvelope(c2,afterRestart)},damagedQueue:{entries:damaged.entries.length,nextSequence:damaged.nextSequence,throws:false}};
 fs.writeFileSync(path.join(__dirname,'baseline-behavior-probes.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});

