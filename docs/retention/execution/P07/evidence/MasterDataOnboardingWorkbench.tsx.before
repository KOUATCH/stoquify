"use client"

import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useMemo, useState, type FormEvent } from "react"

import {
  approveMasterDataImportAction,
  commitMasterDataImportAction,
  getMasterDataCsvTemplateAction,
  getMasterDataImportEvidenceAction,
  stageMasterDataImportAction,
} from "@/actions/onboarding/master-data-onboarding.actions"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  MasterDataImportSummary,
  MasterDataOnboardingDashboard,
} from "@/services/onboarding/master-data-import.service"
import type { MasterDataImportTarget } from "@/services/onboarding/master-data-csv"

const stateClasses: Record<string, string> = {
  NOT_STARTED: "border-[var(--dash-border-subtle)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
  IMPORTED: "border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand)]",
  RECONCILED: "border-[var(--dash-border-subtle)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]",
  BLOCKED: "border-[var(--dash-border-subtle)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
  WAIVED: "border-[var(--dash-border-subtle)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]",
}

type Notice = { kind: "error" | "success"; message: string }

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
  const t = useTranslations("masterDataOnboarding")
  const locale = useLocale() === "fr" ? "fr" : "en"
  const router = useRouter()
  const availableTargets = initialData.milestones.map((milestone) => milestone.target)
  const [target, setTarget] = useState<MasterDataImportTarget>(availableTargets[0] ?? "CUSTOMER")
  const [file, setFile] = useState<File | null>(null)
  const [batch, setBatch] = useState<MasterDataImportSummary | null>(null)
  const [approvalChecked, setApprovalChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const activeBatch = useMemo(
    () => batch ?? initialData.recentBatches.find((candidate) => candidate.target === target) ?? null,
    [batch, initialData.recentBatches, target],
  )
  const canWrite = writableTargets.includes(target)
  const canApprove = Boolean(activeBatch?.approval.canCurrentActorApprove && canWrite)
  const hasReadOnlyTargets = writableTargets.length < availableTargets.length
  const localizedIncluded = t.raw("boundary.includedItems") as string[]
  const localizedExcluded = t.raw("boundary.excludedItems") as string[]

  function targetLabel(value: MasterDataImportTarget) {
    return t(`targets.${value}`)
  }

  function issueMessage(issue: MasterDataImportSummary["issues"][number]) {
    const field = issue.field ?? t("issues.row")
    switch (issue.code) {
      case "CSV_UNTERMINATED_QUOTE": return t("issues.unterminatedQuote")
      case "CSV_DUPLICATE_HEADER": return t("issues.duplicateHeader")
      case "CSV_MISSING_MAPPED_COLUMN": return t("issues.missingMappedColumn")
      case "CSV_UNMAPPED_COLUMN": return t("issues.unmappedColumn")
      case "CSV_ROW_LIMIT_EXCEEDED": return t("issues.rowLimit")
      case "CSV_COLUMN_COUNT_MISMATCH": return t("issues.columnCount")
      case "CSV_FORMULA_REJECTED": return t("issues.formulaRejected")
      case "REQUIRED_FIELD_MISSING": return t("issues.requiredField", { field })
      case "DUPLICATE_IN_FILE": return t("issues.duplicateInFile", { field })
      case "DUPLICATE_IN_TENANT": return t("issues.duplicateInTenant", { field })
      case "FIELD_INVALID": return t("issues.fieldInvalid", { field })
      default: return t("issues.generic")
    }
  }

  async function run(operation: () => Promise<void>) {
    setBusy(true)
    setNotice(null)
    try {
      await operation()
      router.refresh()
    } catch {
      setNotice({ kind: "error", message: t("notices.operationFailed") })
    } finally {
      setBusy(false)
    }
  }

  async function handleTemplate() {
    await run(async () => {
      const template = await getMasterDataCsvTemplateAction(target)
      download(template.filename, template.content, template.mimeType)
      setNotice({ kind: "success", message: t("notices.templateDownloaded", { target: targetLabel(target).toLocaleLowerCase(locale) }) })
    })
  }

  async function handleDryRun(event: FormEvent) {
    event.preventDefault()
    if (!file) {
      setNotice({ kind: "error", message: t("notices.chooseFile") })
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
      setNotice({
        kind: result.status === "BLOCKED" ? "error" : "success",
        message: result.replayed ? t("notices.batchReplayed") : t("notices.dryRunRecorded"),
      })
    })
  }

  async function handleApprove() {
    if (!activeBatch || !approvalChecked || !canApprove) return
    await run(async () => {
      const result = await approveMasterDataImportAction({
        target: activeBatch.target,
        batchId: activeBatch.batchId,
        expectedApprovalDigest: activeBatch.approval.digest,
      })
      setBatch(result)
      setApprovalChecked(false)
      setNotice({ kind: "success", message: t("notices.approvalRecorded") })
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
      setNotice({
        kind: result.status === "COMMITTED" ? "success" : "error",
        message: result.status === "COMMITTED" ? t("notices.commitReconciled") : t("notices.commitPaused"),
      })
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
      setNotice({ kind: "success", message: t("notices.evidenceExported") })
    })
  }

  if (availableTargets.length === 0) {
    return (
      <DashboardRouteState
        kind="empty"
        eyebrow={t("states.empty.eyebrow")}
        title={t("states.empty.title")}
        message={t("states.empty.message")}
        primaryHref={`/${locale}/dashboard`}
        primaryLabel={t("actions.backToDashboard")}
      />
    )
  }

  return (
    <main aria-busy={busy} className="dashboard-landing-theme dark min-h-screen overflow-x-hidden bg-[var(--dash-canvas)] text-[var(--dash-text)]">
      <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <header className="dashboard-glass-panel rounded-lg p-5 md:p-6">
        <p className="dashboard-eyebrow w-fit">{t("eyebrow")}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">{t("title")}</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--dash-text-soft)]">{t("description")}</p>
      </header>

      {hasReadOnlyTargets ? (
        <section role="status" data-state="partial" className="dashboard-glass-panel rounded-lg border border-[var(--dash-border-subtle)] p-4">
          <h2 className="font-semibold">{t("states.partial.title")}</h2>
          <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t("states.partial.message")}</p>
        </section>
      ) : null}

      <section aria-label={t("readiness.title")} className="grid gap-4 md:grid-cols-3">
        {initialData.milestones.map((milestone) => (
          <Card key={milestone.target} className="dashboard-stat-card rounded-lg border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[var(--dash-text)]">{targetLabel(milestone.target)}</CardTitle>
              <CardDescription className="text-[var(--dash-text-soft)]">{t("readiness.milestone")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${stateClasses[milestone.state]}`}>
                {t(`milestoneStates.${milestone.state}`)}
              </span>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div><dt className="text-[var(--dash-text-soft)]">{t("metrics.source")}</dt><dd className="font-semibold">{milestone.sourceRecordCount}</dd></div>
                <div><dt className="text-[var(--dash-text-soft)]">{t("metrics.committed")}</dt><dd className="font-semibold">{milestone.committedCount}</dd></div>
                <div><dt className="text-[var(--dash-text-soft)]">{t("metrics.blockers")}</dt><dd className="font-semibold">{milestone.blockerCount}</dd></div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="dashboard-glass-panel rounded-lg border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]">
        <CardHeader>
          <CardTitle>{t("stage.title")}</CardTitle>
          <CardDescription className="text-[var(--dash-text-soft)]">{t("stage.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto_auto] md:items-end" onSubmit={handleDryRun}>
            <label htmlFor="master-data-target" className="grid gap-1.5 text-sm font-medium">
              {t("fields.target")}
              <select
                id="master-data-target"
                className="dashboard-control h-10 rounded-lg"
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value as MasterDataImportTarget)
                  setBatch(null)
                  setFile(null)
                  setApprovalChecked(false)
                }}
              >
                {availableTargets.map((item) => <option key={item} value={item}>{targetLabel(item)}</option>)}
              </select>
            </label>
            <label htmlFor="master-data-file" className="grid gap-1.5 text-sm font-medium">
              {t("fields.csvFile")}
              <input
                id="master-data-file"
                aria-describedby="master-data-file-help"
                className="dashboard-control h-10 rounded-lg px-3 py-2 text-sm"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <span id="master-data-file-help" className="sr-only">{t("fields.csvHelp")}</span>
            </label>
            <Button type="button" variant="outline" className="dashboard-button-secondary rounded-lg" disabled={busy} onClick={handleTemplate}>{t("actions.downloadTemplate")}</Button>
            <Button type="submit" className="dashboard-button-primary rounded-lg" disabled={busy || !file || !canWrite}>{busy ? t("actions.working") : t("actions.runValidation")}</Button>
          </form>
          {!canWrite ? <p className="mt-3 text-sm text-[var(--dash-warning)]">{t("states.readOnly")}</p> : null}
          {notice ? (
            <p
              role={notice.kind === "error" ? "alert" : "status"}
              aria-live={notice.kind === "error" ? "assertive" : "polite"}
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${notice.kind === "error" ? "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]" : "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]"}`}
            >
              {notice.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {activeBatch ? (
        <Card className="dashboard-glass-panel rounded-lg border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]">
          <CardHeader>
            <CardTitle>{t("approval.title")}</CardTitle>
            <CardDescription className="break-words text-[var(--dash-text-soft)]">
              {t("approval.batch", { id: activeBatch.batchId, version: activeBatch.mappingVersion })}
              <code className="mt-1 block break-all text-xs">{activeBatch.contentHash}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-2" aria-label={t("risk.label")}>
              <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${activeBatch.risk.level === "HIGH" ? "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]" : "border-[var(--dash-border-subtle)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]"}`}>
                {t(`risk.levels.${activeBatch.risk.level}`)}
              </span>
              {activeBatch.risk.reasons.map((reason) => (
                <span key={reason} className="rounded-lg border border-[var(--dash-border-subtle)] px-2.5 py-1 text-xs text-[var(--dash-text-soft)]">
                  {t(`risk.reasons.${reason}`)}
                </span>
              ))}
            </div>

            {activeBatch.risk.separateApproverRequired ? (
              <div id="separate-approver-help" role="status" className="rounded-lg border border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] p-4">
                <h2 className="font-semibold text-[var(--dash-warning)]">{t("risk.separateApproverTitle")}</h2>
                <p className="mt-1 text-sm text-[var(--dash-text-soft)]">
                  {canApprove ? t("risk.separateApproverReady") : t("risk.separateApproverBlocked")}
                </p>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {[
                [t("metrics.status"), t(`batchStatuses.${activeBatch.status}`)],
                [t("metrics.sourceRows"), activeBatch.controls.sourceRecordCount],
                [t("metrics.valid"), activeBatch.controls.validRecordCount],
                [t("metrics.errorRows"), activeBatch.controls.errorRecordCount],
                [t("metrics.duplicates"), activeBatch.controls.duplicateRecordCount],
                [t("metrics.committed"), activeBatch.controls.committedRecordCount],
              ].map(([label, value]) => (
                <div key={String(label)} className="dashboard-stat-card rounded-lg border border-[var(--dash-border-subtle)] p-3">
                  <p className="text-xs uppercase tracking-normal text-[var(--dash-text-soft)]">{label}</p>
                  <p className="mt-1 break-words font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section aria-labelledby="required-controls-heading" className="rounded-lg border border-[var(--dash-border-subtle)] p-4">
                <h2 id="required-controls-heading" className="font-semibold">{t("controls.requiredFields")}</h2>
                <ul className="mt-2 space-y-1 text-sm text-[var(--dash-text-soft)]">
                  {Object.entries(activeBatch.controls.requiredFieldTotals).map(([field, count]) => (
                    <li key={field}>{t("controls.fieldTotal", { field, count, total: activeBatch.controls.sourceRecordCount })}</li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby="record-controls-heading" className="rounded-lg border border-[var(--dash-border-subtle)] p-4">
                <h2 id="record-controls-heading" className="font-semibold">{t("controls.prePost")}</h2>
                <p className="mt-2 text-sm text-[var(--dash-text-soft)]">
                  {t("controls.prePostValues", {
                    before: activeBatch.controls.preCommitRecordCount ?? t("controls.pending"),
                    after: activeBatch.controls.postCommitRecordCount ?? t("controls.pending"),
                  })}
                </p>
              </section>
            </div>

            {activeBatch.issues.length > 0 ? (
              <section aria-labelledby="row-issues-heading" className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-4">
                <h2 id="row-issues-heading" className="font-semibold text-[var(--dash-danger)]">{t("issues.title")}</h2>
                <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-sm">
                  {activeBatch.issues.map((issue, index) => (
                    <li key={`${issue.rowNumber}-${issue.code}-${index}`}>
                      {t("issues.rowPrefix", { row: issue.rowNumber })}{issue.field ? ` · ${issue.field}` : ""}: {issueMessage(issue)} ({issue.code})
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {activeBatch.status === "VALIDATED" ? (
              <label className="flex items-start gap-3 rounded-lg border border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] p-4 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  checked={approvalChecked}
                  disabled={!canApprove}
                  aria-describedby={activeBatch.risk.separateApproverRequired ? "separate-approver-help" : undefined}
                  onChange={(event) => setApprovalChecked(event.target.checked)}
                />
                <span>{t("approval.confirmation")}</span>
              </label>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {activeBatch.status === "VALIDATED" && canWrite ? <Button className="dashboard-button-primary rounded-lg" disabled={busy || !approvalChecked || !canApprove} onClick={handleApprove}>{t("actions.recordApproval")}</Button> : null}
              {activeBatch.status === "APPROVED" && canWrite ? <Button className="dashboard-button-primary rounded-lg" disabled={busy} onClick={handleCommit}>{t("actions.commit")}</Button> : null}
              <Button type="button" variant="outline" className="dashboard-button-secondary rounded-lg" disabled={busy} onClick={handleEvidence}>{t("actions.exportEvidence")}</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <section data-state="empty" className="dashboard-glass-panel rounded-lg p-5" aria-labelledby="no-batch-heading">
          <h2 id="no-batch-heading" className="font-semibold">{t("states.noBatch.title")}</h2>
          <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t("states.noBatch.message")}</p>
        </section>
      )}

      <section aria-labelledby="adoption-heading" className="dashboard-glass-panel rounded-lg p-5">
        <h2 id="adoption-heading" className="font-semibold">{t("adoption.title")}</h2>
        <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t("adoption.description")}</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="dashboard-stat-card rounded-lg p-3"><dt className="text-xs text-[var(--dash-text-soft)]">{t("adoption.batches")}</dt><dd className="mt-1 text-xl font-semibold">{initialData.adoption.batchCount}</dd></div>
          <div className="dashboard-stat-card rounded-lg p-3"><dt className="text-xs text-[var(--dash-text-soft)]">{t("adoption.committed")}</dt><dd className="mt-1 text-xl font-semibold">{initialData.adoption.committedBatchCount}</dd></div>
          <div className="dashboard-stat-card rounded-lg p-3"><dt className="text-xs text-[var(--dash-text-soft)]">{t("adoption.blocked")}</dt><dd className="mt-1 text-xl font-semibold">{initialData.adoption.blockedBatchCount}</dd></div>
          <div className="dashboard-stat-card rounded-lg p-3"><dt className="text-xs text-[var(--dash-text-soft)]">{t("adoption.highRiskApproved")}</dt><dd className="mt-1 text-xl font-semibold">{initialData.adoption.separatelyApprovedHighRiskBatchCount}/{initialData.adoption.highRiskBatchCount}</dd></div>
        </dl>
      </section>

      <Card className="dashboard-glass-panel rounded-lg border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]">
        <CardHeader>
          <CardTitle>{t("boundary.title")}</CardTitle>
          <CardDescription className="text-[var(--dash-text-soft)]">{t("boundary.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="included-heading">
            <h2 id="included-heading" className="font-semibold">{t("boundary.included")}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--dash-text-soft)]">
              {initialData.controlBoundary.included.map((item, index) => <li key={item}>{localizedIncluded[index] ?? item}</li>)}
            </ul>
          </section>
          <section aria-labelledby="excluded-heading">
            <h2 id="excluded-heading" className="font-semibold">{t("boundary.excluded")}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--dash-text-soft)]">
              {initialData.controlBoundary.excluded.map((item, index) => <li key={item}>{localizedExcluded[index] ?? item}</li>)}
            </ul>
          </section>
        </CardContent>
      </Card>
      </div>
    </main>
  )
}
