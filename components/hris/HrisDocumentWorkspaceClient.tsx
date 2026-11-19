"use client"
import {useCallback} from "react"
import {HrisDocumentWorkspace,type DocumentTransport} from "./HrisDocumentWorkspace"
async function responseError(response:Response){
 const body=await response.json().catch(()=>null)
 return Object.assign(Error('Document operation unavailable'),{status:response.status,code:typeof body?.code==='string'?body.code:undefined})
}
export function HrisDocumentWorkspaceClient({locale,employeeId,documentId}:{locale:"en"|"fr";employeeId?:string;documentId?:string}){
 const execute=useCallback<DocumentTransport>(async(command,input)=>{
  const endpoint=employeeId?'/api/hris/documents':'/api/hris/my-documents';let response:Response
  const post=(value:unknown)=>fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)})
  if(command==='LIST')response=await fetch(endpoint+'?'+new URLSearchParams({...employeeId?{employeeId}:{},...documentId?{documentId}:{}}).toString(),{cache:'no-store'})
  else if(command==='UPLOAD'){const body=new FormData();body.set('file',input.file);body.set('metadata',JSON.stringify(input.metadata));response=await fetch(endpoint,{method:'POST',body})}
  else if(command==='DOWNLOAD'){const grant=await post({command:'GRANT',documentId:input.documentId});if(!grant.ok)throw await responseError(grant);const value=await grant.json();response=await post({command:'DOWNLOAD',token:value.token});if(!response.ok)throw await responseError(response);return {blob:await response.blob()}}
  else response=await post(command==='DELETE'?{command,documentId:input.documentId,reason:input.reason}:{command,input})
  if(!response.ok)throw await responseError(response);return response.json()
 },[employeeId,documentId])
 return <HrisDocumentWorkspace key={(employeeId??'own')+':'+(documentId??'all')} locale={locale} execute={execute}/>
}
