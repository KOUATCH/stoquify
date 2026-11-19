"use client"
import {useCallback} from "react"
import {HrisDocumentWorkspace,type DocumentTransport} from "./HrisDocumentWorkspace"
export function HrisDocumentWorkspaceClient({locale,employeeId,documentId}:{locale:"en"|"fr";employeeId?:string;documentId?:string}){
 const execute=useCallback<DocumentTransport>(async(command,input)=>{
  const endpoint=employeeId?'/api/hris/documents':'/api/hris/my-documents';let response:Response
  const post=(value:unknown)=>fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)})
  if(command==='LIST')response=await fetch(endpoint+'?'+new URLSearchParams({...employeeId?{employeeId}:{},...documentId?{documentId}:{}}).toString(),{cache:'no-store'})
  else if(command==='UPLOAD'){const body=new FormData();body.set('file',input.file);body.set('metadata',JSON.stringify(input.metadata));response=await fetch(endpoint,{method:'POST',body})}
  else if(command==='DOWNLOAD'){const grant=await post({command:'GRANT',documentId:input.documentId});if(!grant.ok)throw Error('Access denied');const value=await grant.json();response=await post({command:'DOWNLOAD',token:value.token});if(!response.ok)throw Error('Download unavailable');const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='employment-document.'+(blob.type==='application/pdf'?'pdf':blob.type==='image/png'?'png':'jpg');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return {downloaded:true}}
  else response=await post(command==='DELETE'?{command,documentId:input.documentId,reason:input.reason}:{command,input})
  if(!response.ok)throw Object.assign(Error('Document operation unavailable'),{status:response.status});return response.json()
 },[employeeId,documentId])
 return <HrisDocumentWorkspace key={(employeeId??'own')+':'+(documentId??'all')} locale={locale} execute={execute}/>
}
