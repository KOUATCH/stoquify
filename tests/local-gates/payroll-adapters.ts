// Browser-only synthetic actions. Never import an application server action.
function record(kind:string,input:unknown) {
  const calls=JSON.parse(sessionStorage.getItem('calls')||'[]');calls.push({kind,input});sessionStorage.setItem('calls',JSON.stringify(calls));return calls
}
export async function recordPayrollPaymentSettlementEvidenceAction(input:unknown) {
  const calls=record('settle',input), scenario=new URL(location.href).searchParams.get('scenario')
  if(scenario==='lost' && calls.filter((c:{kind:string})=>c.kind==='settle').length===1) throw new Error('Synthetic lost response')
  if(scenario==='denied') return {success:false,status:403,code:'FORBIDDEN',correlationId:'synthetic-denial'}
  if(scenario==='fresh' && !sessionStorage.getItem('authenticated')) return {success:false,status:403,code:'FRESH_AUTH_REQUIRED'}
  return {success:true,data:{idempotent:scenario==='lost'}}
}
export async function stepUpWithPasswordAction(_input:unknown) {
  record('authenticate',{passwordRedacted:true});sessionStorage.setItem('authenticated','yes');return {success:true}
}
