import "server-only"
import {BusinessRuleError} from "@/services/_shared/action-errors"
import {digest,HR_DOCUMENT_MAX_BYTES} from "./employee-document.contract"

/** Trusted server ports. Never deserialize an adapter or scan verdict from a request. */
export interface EmployeeDocumentStore {
 name:string
 put(key:string,bytes:Uint8Array):Promise<void> // immutable, exact-byte retry; conflict otherwise
 get(key:string):Promise<Uint8Array>
 remove(key:string):Promise<void> // durable tombstone: rejects future PUT, including in-flight retries
}
export interface EmployeeDocumentScanner {
 name:string
 scan(bytes:Uint8Array,sha256:string):Promise<{sha256:string;verdict:"CLEAN"|"REJECTED";reference:string}>
}
export type EmployeeDocumentPorts={store:EmployeeDocumentStore;scanner:EmployeeDocumentScanner}
const unavailable=()=>new BusinessRuleError("HRIS_DOCUMENT_PROVIDER_UNAVAILABLE")
function configuration(){
 if(process.env.HRIS_DOCUMENT_HANDLING_ENABLED!=="true")throw new BusinessRuleError("HRIS_DOCUMENT_HANDLING_DISABLED")
 const base=process.env.HRIS_DOCUMENT_GATEWAY_URL,token=process.env.HRIS_DOCUMENT_GATEWAY_TOKEN;
 if(!base||!token||token.length<32)throw unavailable();const url=new URL(base)
 if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash)throw unavailable()
 return {base:url.href.replace(/\/$/,""),token}
}
export function runtimeDocumentPorts(operation:"upload"|"download"|"delete"="upload"):EmployeeDocumentPorts{
 if(operation==="upload"&&process.env.HRIS_DOCUMENT_UPLOADS_ENABLED==="false"||operation==="download"&&process.env.HRIS_DOCUMENT_DOWNLOADS_ENABLED==="false")throw new BusinessRuleError("HRIS_DOCUMENT_OPERATION_DISABLED")
 const {base,token}=configuration()
 async function request(path:string,method:string,bytes?:Uint8Array){
  const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/octet-stream",...(bytes?{"X-Content-SHA256":digest(bytes)}:{})},body:bytes?new Uint8Array(bytes):undefined,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000)})
  if(!response.ok)throw unavailable();return response
 }
 async function bounded(response:Response,max:number){
  if(!response.body)throw unavailable();const reader=response.body.getReader(),parts:Uint8Array[]=[];let size=0
  try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>max){await reader.cancel();throw unavailable()}parts.push(r.value)}}finally{reader.releaseLock()}
  return Buffer.concat(parts)
 }
 return {
  store:{name:"hris-private-gateway-v1:"+digest(base),async put(key,bytes){const r=await request(`/objects/${encodeURIComponent(key)}`,"PUT",bytes);if(r.headers.get("x-content-sha256")!==digest(bytes)||r.headers.get("x-immutable-object-sha256")!==digest(key))throw unavailable()},async get(key){return bounded(await request(`/objects/${encodeURIComponent(key)}`,"GET"),HR_DOCUMENT_MAX_BYTES)},async remove(key){const r=await request(`/objects/${encodeURIComponent(key)}`,"DELETE");if(r.headers.get("x-tombstone-sha256")!==digest(key))throw unavailable()}},
  scanner:{name:"hris-private-gateway-v1",async scan(bytes,sha256){const raw=await bounded(await request("/scan","POST",bytes),4096);let v;try{v=JSON.parse(raw.toString("utf8"))}catch{throw unavailable()};if(v.sha256!==sha256||!["CLEAN","REJECTED"].includes(v.verdict)||typeof v.reference!=="string"||v.reference.length<1||v.reference.length>200)throw unavailable();return {sha256:v.sha256,verdict:v.verdict,reference:v.reference}}},
 }
}
