const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
function edit(file, replacements) {
  const target = path.join(root, file); let source = fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
  for (const [before, after] of replacements) { assert.ok(source.includes(before), before); source = source.replace(before, after); }
  fs.writeFileSync(target, source);
}
edit('services/payroll/payroll-register.service.ts', [
  ['version: 8,', 'version: 9,'],
  ['    paymentEvidenceHashes: input.run.paymentBatches', `    paymentAllocations: input.run.paymentBatches.map((batch) => ({
      id: batch.id,
      status: batch.status,
      allocations: batch.allocations.map((allocation) => ({
        id: allocation.id,
        payslipId: allocation.payslipId,
        employeeId: allocation.employeeId,
        amount: decimal(allocation.amount).toFixed(2),
        currency: allocation.currency,
      })).sort((a, b) => a.id.localeCompare(b.id)),
    })).sort((a, b) => a.id.localeCompare(b.id)),
    paymentEvidenceHashes: input.run.paymentBatches`],
  ['function buildRows(input: {', `// Allocation is a reservation/disbursement instruction, never proof of settlement.
function hasCurrentAllocations(batch: { status: PayrollPaymentBatchStatus }) {
  return batch.status !== PayrollPaymentBatchStatus.CANCELLED && batch.status !== PayrollPaymentBatchStatus.FAILED
}

function buildRows(input: {`],
  ['const allocatedAmount = sumDecimals(paymentAllocations.map((allocation) => allocation.amount))', `const currentAllocations = paymentAllocations.filter((allocation) => hasCurrentAllocations(allocation.payrollPaymentBatch))
    const allocatedAmount = sumDecimals(currentAllocations.map((allocation) => allocation.amount))`],
  ['const paymentStatus = paymentAllocations.length === 0', 'const paymentStatus = currentAllocations.length === 0'],
  ['sumDecimals(run.paymentBatches.flatMap((batch) => batch.allocations.map((allocation) => allocation.amount)))', 'sumDecimals(run.paymentBatches.filter(hasCurrentAllocations).flatMap((batch) => batch.allocations.map((allocation) => allocation.amount)))'],
  ['kind: "AQSTOQFLOW_PAYROLL_REGISTER_TIE_OUT_EXPORT",\n    version: 1,', 'kind: "AQSTOQFLOW_PAYROLL_REGISTER_TIE_OUT_EXPORT",\n    version: 2,'],
]);
edit('services/payroll/__tests__/payroll-register.service.test.ts', [
  ['    expect(result.content).toContain("AQSTOQFLOW_PAYROLL_REGISTER_TIE_OUT_EXPORT")', `    expect(result.content).toContain("AQSTOQFLOW_PAYROLL_REGISTER_TIE_OUT_EXPORT")
    const exported = JSON.parse(result.content)
    expect(exported.version).toBe(2)
    expect(exported.register.summary.allocatedAmount).toBe("143700.00")
    expect(exported.register.summary).not.toHaveProperty("paidAmount")`],
]);
edit('components/payroll/PayrollRegisterTieOut.tsx', [
  ['  if (["MATCHED", "POSTED", "PAID", "ARCHIVED", "READY", "RELEASED",', `  if (["PAID", "RELEASED"].includes(normalized)) return "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
  if (["MATCHED", "POSTED", "ARCHIVED", "READY",`],
  ['function Badge({ value }: { value: string })', 'function Badge({ value, label = value }: { value: string; label?: string })'],
  ['<span className="truncate">{value}</span>', '<span className="truncate">{label}</span>'],
  ['  const registerTable = useHrPayrollTable({', `  const paymentCopy = locale === "fr" ? {
    allocated: "Montant affecté", tieOut: "Contrôle des affectations", released: "Paiement transmis",
    explanation: "Les montants affectés incluent les instructions de paiement en préparation, approuvées ou transmises, hors lots annulés ou en échec. Une affectation, un contrôle concordant ou la transmission du paiement ne prouve pas son règlement. Consultez les preuves de règlement dans le suivi des paiements.",
    review: "Consulter les preuves de règlement", detail: "affectés aux bulletins",
  } : {
    allocated: "Allocated amount", tieOut: "Allocation tie-out", released: "Payment released",
    explanation: "Allocated amounts include draft, approved and released payment instructions, excluding cancelled or failed batches. An allocation, a matched tie-out or payment release does not prove settlement. Review settlement evidence in the payments workspace.",
    review: "Review settlement evidence", detail: "allocated to payslips",
  }
  const registerTable = useHrPayrollTable({`],
  ['key: "paid", label: "Paid amount"', 'key: "allocated", label: paymentCopy.allocated'],
  ['label: "Payment tie-out"', 'label: paymentCopy.tieOut'],
  ['<Badge value={data.payrollRun.status} />', '<Badge value={data.payrollRun.status} label={data.payrollRun.status === "PAID" ? paymentCopy.released : data.payrollRun.status} />'],
  ['<Metric label="Paid"', '<Metric label={paymentCopy.allocated}'],
  ['      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">', `      <section className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm text-cyan-100">
        <p>{paymentCopy.explanation}</p>
        <Link href={localizePath("/dashboard/payroll/payments", locale)} className="mt-2 inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
          {paymentCopy.review}
        </Link>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">`],
  ['label="Payments"', 'label={paymentCopy.tieOut}'],
  ['} allocated to payslips`}', '} ${paymentCopy.detail}`}'],
  ['font-semibold">Paid</th>', 'font-semibold">{paymentCopy.allocated}</th>'],
  ['font-semibold">Payment</th>', 'font-semibold">{paymentCopy.tieOut}</th>'],
]);
