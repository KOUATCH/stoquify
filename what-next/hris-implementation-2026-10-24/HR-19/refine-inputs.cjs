const fs=require('node:fs'),file='services/hris/payroll-handoff-read.service.ts';let s=fs.readFileSync(file,'utf8');s=s.replaceAll("deletedAt:null,status:'ACTIVE',effectiveFrom", "deletedAt:null,status:{in:['ACTIVE','DRAFT']},effectiveFrom");s=s.replace('  if(pendingHrisLifecycleFromMetadata(e.metadata)||pendingSalary',()=>`  const pendingMovement=pendingHrisLifecycleFromMetadata(e.metadata)
  const draftContracts=e.contracts.filter(c=>c.status==='DRAFT'),draftAssignments=e.rubriqueAssignments.filter(r=>r.status==='DRAFT')
  if(draftContracts.length||draftAssignments.length)add(e.id,'PENDING_CONTRACT_OR_COMPENSATION')
  sources.push({employeeId:e.id,draftContracts,draftAssignments})
  e.contracts=e.contracts.filter(c=>c.status==='ACTIVE');e.rubriqueAssignments=e.rubriqueAssignments.filter(r=>r.status==='ACTIVE')
  if((pendingMovement&&new Date(pendingMovement.effectiveAt)<=period.periodEnd)||pendingSalary`);fs.writeFileSync(file,s);
