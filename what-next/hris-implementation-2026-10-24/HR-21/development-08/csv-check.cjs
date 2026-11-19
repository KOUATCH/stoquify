// Independent parser used only by the browser evidence harness.
module.exports=function(csv,manifest){
 const assert=require('node:assert/strict');assert.equal(csv[0],'\uFEFF');
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=1;i<csv.length;i++){const c=csv[i];if(c==='"'){if(quoted&&csv[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(!quoted&&c===','){row.push(cell);cell=''}else if(!quoted&&c==='\r'&&csv[i+1]==='\n'){row.push(cell);rows.push(row);row=[];cell='';i++}else cell+=c}
 assert.equal(quoted,false);assert.equal(cell,'');assert.equal(row.length,0);
 const headers=rows.shift();assert.equal(new Set(headers).size,24);assert.equal(rows.length,manifest.rows.length);
 for(const [i,values]of rows.entries()){
  assert.equal(values.length,headers.length);const r=Object.fromEntries(headers.map((k,j)=>[k,values[j]])),m=manifest.rows[i];
  assert.equal(r.employee_id,m.employeeId);assert.equal(r.employee_number,m.employeeNumber);assert.equal(r.display_name,(m.displayName.startsWith('=')?"'":'')+m.displayName);assert.equal(r.legal_name,m.legalName);
  assert.equal(r.period_id,manifest.period.id);assert.equal(r.contract_id,m.contractId);assert.equal(r.employment_status,m.employmentStatus);assert.equal(r.hire_date,m.hireDate);assert.equal(r.termination_date,m.terminationDate??'');assert.equal(r.contract_effective_from,m.contractEffectiveFrom);assert.equal(r.contract_effective_to,m.contractEffectiveTo??'');
  assert.equal(r.period_start,manifest.period.start);assert.equal(r.period_end,manifest.period.end);assert.equal(r.country,'CM');assert.equal(r.contract_base_salary_reference,m.contractBaseSalary);assert.equal(r.currency,m.currency);assert.deepEqual(JSON.parse(r.compensation_json),m.compensation);
  for(const [col,key]of [['scheduled_minutes','scheduledMinutes'],['worked_minutes','workedMinutes'],['absence_minutes','absenceMinutes'],['overtime_minutes','overtimeMinutes'],['leave_minutes','leaveMinutes']])assert.equal(Number(r[col]),m[key]);
  assert.equal(r.attendance_snapshot_id,m.attendanceSnapshotId);assert.equal(Number(r.attendance_revision),m.attendanceRevision);
 }
};
