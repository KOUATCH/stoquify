const fs=require('node:fs');function edit(file,from,to){let s=fs.readFileSync(file,'utf8');if(!s.includes(from))throw Error(file+' missing anchor');fs.writeFileSync(file,s.replace(from,()=>to))}
edit('services/hris/personal-correction.service.ts','getCorrectionQueue(actor:SelfServiceActor,client:SelfServiceClient=db)','getCorrectionQueue(actor:SelfServiceActor,client:SelfServiceClient=db,caseId?:string)');
edit('services/hris/personal-correction.service.ts','AND e."deletedAt" IS NULL AND (${scope.employeeIds===null}', 'AND e."deletedAt" IS NULL AND (${caseId??null}::text IS NULL OR c.id=${caseId??null}) AND (${scope.employeeIds===null}');
edit('actions/hris/personal-correction.actions.ts','false,a=>getCorrectionQueue(a)','false,(a,i)=>getCorrectionQueue(a,undefined,z.object({caseId:z.string().uuid().optional()}).strict().parse(i??{}).caseId)');
edit('app/[locale]/(dashboard)/dashboard/people/corrections/page.tsx','{params}:{params:Promise<{locale:string}>}','{params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{caseId?:string}>}');
edit('app/[locale]/(dashboard)/dashboard/people/corrections/page.tsx','getCorrectionQueueAction()','getCorrectionQueueAction({caseId:(await searchParams).caseId})');
edit('services/hris/daily-queue.service.ts',"href:'/dashboard/people/corrections'","href:'/dashboard/people/corrections?caseId='+encodeURIComponent(c.id)");
edit('services/hris/employee-document.service.ts','listEmployeeDocuments(actor:HrisDocumentActor,employeeId?:string)','listEmployeeDocuments(actor:HrisDocumentActor,employeeId?:string,documentId?:string)');
edit('services/hris/employee-document.service.ts',' const a=await account(tx,actor),initial=await scope(tx,a,employeeId)',' if(documentId)z.string().uuid().parse(documentId)\n const a=await account(tx,actor),initial=await scope(tx,a,employeeId)');
edit('services/hris/employee-document.service.ts','AND (${!access.own} OR "employeeVisible"=true) ORDER BY','AND (${!access.own} OR "employeeVisible"=true) AND (${documentId??null}::text IS NULL OR id=${documentId??null}) ORDER BY');
edit('services/hris/employee-document.http.ts','url.searchParams.get("employeeId")??undefined),{headers}','url.searchParams.get("employeeId")??undefined,url.searchParams.get("documentId")??undefined),{headers}');
edit('components/hris/HrisDocumentWorkspaceClient.tsx','{locale,employeeId}:{locale:"en"|"fr";employeeId?:string}','{locale,employeeId,documentId}:{locale:"en"|"fr";employeeId?:string;documentId?:string}');
edit('components/hris/HrisDocumentWorkspaceClient.tsx',"endpoint+(employeeId?'?employeeId='+encodeURIComponent(employeeId):'')","endpoint+'?'+new URLSearchParams({...employeeId?{employeeId}:{},...documentId?{documentId}:{}}).toString()");
edit('components/hris/HrisDocumentWorkspaceClient.tsx','},[employeeId])','},[employeeId,documentId])');
edit('components/hris/HrisDocumentWorkspaceClient.tsx',"key={employeeId??'own'}","key={(employeeId??'own')+':'+(documentId??'all')}");
edit('app/[locale]/(dashboard)/dashboard/people/documents/page.tsx','searchParams:Promise<{employeeId?:string}>','searchParams:Promise<{employeeId?:string;documentId?:string}>');
edit('app/[locale]/(dashboard)/dashboard/people/documents/page.tsx','employeeId=(await searchParams).employeeId','{employeeId,documentId}=await searchParams');
edit('app/[locale]/(dashboard)/dashboard/people/documents/page.tsx','employeeId={employeeId}/>','employeeId={employeeId} documentId={documentId}/>');
edit('services/hris/daily-queue.service.ts',"encodeURIComponent(d.employeeId),actionable:false","encodeURIComponent(d.employeeId)+'&documentId='+encodeURIComponent(d.id),actionable:false");
