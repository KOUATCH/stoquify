"use client"
import { useState } from 'react'
import PayrollPaymentSettlementForm from '@/components/payroll/PayrollPaymentSettlementForm'
import type { Locale } from '@/types/bilingual'
export default function PayrollFixture({locale}:{locale:Locale}) {
  const [changed,setChanged]=useState(false)
  return <main className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-bg)] p-4 text-[var(--dash-text)]">
    <h1>Payroll rehearsal</h1><button type="button" onClick={()=>setChanged(true)}>Fixture: change balance</button>
    <PayrollPaymentSettlementForm payrollPaymentBatchId="batch" batchNumber="PAY-1" amount={changed?'50':'100'} currency="XAF" locale={locale} balanceRevision={changed?'revision-2':'revision-1'} proofOptions={{register:{id:'run',runNumber:'PAY-1',version:1,revision:'run-revision'},matches:[{id:'match',revision:'match-revision',reference:'PROOF-1',kind:'provider_and_statement',amount:'100',currency:'XAF',occurredAt:'2026-10-01T12:00:00Z'}]}} />
  </main>
}
