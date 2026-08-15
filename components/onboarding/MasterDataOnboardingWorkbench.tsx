"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, type FormEvent } from "react"

import {
  approveMasterDataImportAction,
  commitMasterDataImportAction,
  getMasterDataCsvTemplateAction,
  getMasterDataImportEvidenceAction,
  stageMasterDataImportAction,
} from "@/actions/onboarding/master-data-onboarding.actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  MasterDataImportSummary,
  MasterDataOnboardingDashboard,
} from "@/services/onboarding/master-data-import.service"
import type { MasterDataImportTarget } from "@/services/onboarding/master-data-csv"

const targetLabels: Record<MasterDataImportTarget, string> = {
  CUSTOMER: "Customers",
  SUPPLIER: "Suppliers",
  ITEM: "Items",
}

const stateClasses: Record<string, string> = {
  NOT_STARTED: "border-slate-300 bg-slate-50 text-slate-700",
  IMPORTED: "border-blue-300 bg-blue-50 text-blue-800",
  RECONCILED: "border-emerald-300 bg-emerald-50 text-emerald-800",
  BLOCKED: "border-red-300 bg-red-50 text-red-800",
  WAIVED: "border-amber-300 bg-amber-50 text-amber-800",
}

function download(filename: string, content: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function MasterDataOnboardingWorkbench({
  initialData,
  writableTargets,
}: {
  initialData: MasterDataOnboardingDashboard
  writableTargets: readonly MasterDataImportTarget[]
}) {
  const router = useRouter()
  const availableTargets = initialData.milestones.map((milestone) => milestone.target)
  const [target, setTarget] = useState<MasterDataImportTarget>(availableTargets[0] ?? "CUSTOMER")
  const [file, setFile] = useState<File | null>(null)
  const [batch, setBatch] = useState<MasterDataImportSummary | null>(null)
  const [approvalChecked, setApprovalChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const activeBatch = useMemo(
    () => batch ?? initialData.recentBatches.find((candidate) => candidate.target === target) ?? null,
    [batch, initialData.recentBatches, target],
  )
  const canWrite = writableTargets.includes(target)

  async function run(operation: () => Promise<void>) {
    setBusy(true)
    setNotice(null)
    try {
      await operation()
      router.refresh()
    } catch {
      setNotice("The governed operation could not be completed. Review the batch state and safe row issues, then retry.")
    } finally {
      setBusy(false)
    }
  }

  async function handleTemplate() {
    await run(async () => {
      const template = await getMasterDataCsvTemplateAction(target)
      download(template.filename, template.content, template.mimeType)
      setNotice(`Downloaded the tenant-scoped ${targetLabels[target].toLowerCase()} template.`)
    })
  }

  async function handleDryRun(event: FormEvent) {
    event.preventDefault()
    if (!file) {
      setNotice("Choose a CSV file before running validation.")
      return
    }
    await run(async () => {
      const content = await file.text()
      const result = await stageMasterDataImportAction({
        target,
        sourceFilename: file.name,
        sourceMimeType: file.type || "text/csv",
        content,
      })
      setBatch(result)
      setApprovalChecked(false)
      setNotice(result.replayed ? "Existing hash-bound batch replayed without duplicate writes." : "Dry run recorded. No master data was written.")
    })
  }

  async function handleApprove() {
    if (!activeBatch || !approvalChecked) return
    await run(async () => {
      const result = await approveMasterDataImportAction({
        target: activeBatch.target,
        batchId: activeBatch.batchId,
        expectedApprovalDigest: activeBatch.approval.digest,
      })
      setBatch(result)
      setApprovalChecked(false)
      setNotice("Approval recorded against the exact source hash, mapping version, and dry-run controls.")
    })
  }

  async function handleCommit() {
    if (!activeBatch) return
    await run(async () => {
      const result = await commitMasterDataImportAction({
        target: activeBatch.target,
        batchId: activeBatch.batchId,
        expectedApprovalDigest: activeBatch.approval.digest,
      })
      setBatch(result)
      setNotice(result.status === "COMMITTED" ? "Commit reconciled and evidence sealed." : "Commit paused at a governed control boundary.")
    })
  }

  async function handleEvidence() {
    if (!activeBatch) return
    await run(async () => {
      const evidence = await getMasterDataImportEvidenceAction({
        target: activeBatch.target,
        batchId: activeBatch.batchId,
      })
      download(
        `onboarding-evidence-${activeBatch.batchId}.json`,
        JSON.stringify({ ...evidence, exportedAt: new Date().toISOString() }, null, 2),
        "application/json",
      )
      setNotice("Evidence manifest exported without raw source rows.")
    })
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Governed onboarding</p>
        <h1 className="text-3xl font-semibold text-slate-950">Master-data import readiness</h1>
        <p className="max-w-4xl text-sm leading-6 text-slate-600">
          Validate tenant CSVs, bind approval to the dry-run evidence, and commit only customer, supplier, or item master records through their canonical domain owners.
        </p>
      </header>

      <section aria-label="Readiness milestones" className="grid gap-4 md:grid-cols-3">
        {initialData.milestones.map((milestone) => (
          <Card key={milestone.target}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{targetLabels[milestone.target]}</CardTitle>
              <CardDescription>Tenant readiness milestone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${stateClasses[milestone.state]}`}>
                {milestone.state.toLowerCase().replaceAll("_", " ")}
              </span>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div><dt className="text-slate-500">Source</dt><dd className="font-semibold">{milestone.sourceRecordCount}</dd></div>
                <div><dt className="text-slate-500">Committed</dt><dd className="font-semibold">{milestone.committedCount}</dd></div>
                <div><dt className="text-slate-500">Blockers</dt><dd className="font-semibold">{milestone.blockerCount}</dd></div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>1. Template and dry run</CardTitle>
          <CardDescription>Files are hashed and staged per tenant. A dry run never writes business truth.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto_auto] md:items-end" onSubmit={handleDryRun}>
            <label className="grid gap-1.5 text-sm font-medium text-slate-800">
              Target
              <select
                className="h-10 rounded-md border border-slate-300 bg-white px-3"
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value as MasterDataImportTarget)
                  setBatch(null)
                  setApprovalChecked(false)
                }}
              >
                {availableTargets.map((item) => <option key={item} value={item}>{targetLabels[item]}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-800">
              CSV file
              <input
                className="h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <Button type="button" variant="outline" disabled={busy} onClick={handleTemplate}>Download template</Button>
            <Button type="submit" disabled={busy || !file || !canWrite}>{busy ? "Working…" : "Run dry validation"}</Button>
          </form>
          {notice ? <p role="status" className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{notice}</p> : null}
        </CardContent>
      </Card>

      {activeBatch ? (
        <Card>
          <CardHeader>
            <CardTitle>2. Controls, approval, and commit</CardTitle>
            <CardDescription>
              Batch {activeBatch.batchId} · mapping v{activeBatch.mappingVersion} · {activeBatch.contentHash}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {[
                ["Status", activeBatch.status],
                ["Source rows", activeBatch.controls.sourceRecordCount],
                ["Valid", activeBatch.controls.validRecordCount],
                ["Error rows", activeBatch.controls.errorRecordCount],
                ["Duplicates", activeBatch.controls.duplicateRecordCount],
                ["Committed", activeBatch.controls.committedRecordCount],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-md border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 font-semibold text-slate-950">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-slate-200 p-4">
                <h2 className="font-semibold text-slate-950">Required-field controls</h2>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {Object.entries(activeBatch.controls.requiredFieldTotals).map(([field, count]) => (
                    <li key={field}>{field}: {count}/{activeBatch.controls.sourceRecordCount}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-slate-200 p-4">
                <h2 className="font-semibold text-slate-950">Pre/post record controls</h2>
                <p className="mt-2 text-sm text-slate-700">
                  Before: {activeBatch.controls.preCommitRecordCount ?? "pending"} · After: {activeBatch.controls.postCommitRecordCount ?? "pending"}
                </p>
              </div>
            </div>

            {activeBatch.issues.length > 0 ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4">
                <h2 className="font-semibold text-red-950">Safe row issues</h2>
                <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-sm text-red-900">
                  {activeBatch.issues.map((issue, index) => (
                    <li key={`${issue.rowNumber}-${issue.code}-${index}`}>
                      Row {issue.rowNumber}{issue.field ? ` · ${issue.field}` : ""}: {issue.safeMessage} ({issue.code})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {activeBatch.status === "VALIDATED" ? (
              <label className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <input type="checkbox" className="mt-0.5" checked={approvalChecked} onChange={(event) => setApprovalChecked(event.target.checked)} />
                <span>I approve this exact source hash, mapping version, record count, required-field totals, and zero-error dry run.</span>
              </label>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {activeBatch.status === "VALIDATED" && canWrite ? <Button disabled={busy || !approvalChecked} onClick={handleApprove}>Record explicit approval</Button> : null}
              {activeBatch.status === "APPROVED" && canWrite ? <Button disabled={busy} onClick={handleCommit}>Commit through domain owners</Button> : null}
              <Button type="button" variant="outline" disabled={busy} onClick={handleEvidence}>Export evidence manifest</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Exact control boundary</CardTitle>
          <CardDescription>This milestone is readiness evidence, not an accounting or statutory certification.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div>
            <h2 className="font-semibold text-slate-950">Included</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {initialData.controlBoundary.included.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-slate-950">Excluded</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {initialData.controlBoundary.excluded.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
