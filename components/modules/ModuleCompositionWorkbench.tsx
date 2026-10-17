"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Boxes, Check, CheckCircle2, FileClock, History, Layers3, Link2, Loader2, LockKeyhole, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Store, BriefcaseBusiness, AlertTriangle } from "lucide-react"

import { applyModuleCompositionAction, getModuleCompositionAction, getModuleCompositionHistoryAction, previewModuleCompositionAction, reopenModuleCompositionAction, resumeModuleCompositionAction, saveModuleCompositionDraftAction } from "@/actions/modules/module-composition.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { RouteStatePanel, dashboardToneClass, type DashboardTone } from "@/components/dashboard/primitives"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { localizePath, pickLocale } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { isCommercialModuleSlug, type CommercialModuleSlug } from "@/services/modules/module-control-contracts"
import type { CompositionCatalogItem, CompositionHistoryEntry, CompositionIssue, CompositionLifecycleStep, CompositionSetupInputs, ModuleCompositionApplyResult, ModuleCompositionData, ModuleCompositionDraftInput, ModuleCompositionPreview, ModuleCompositionReopenInput, ModuleCompositionResumeInput } from "@/services/modules/module-composition-contracts"

import styles from "./module-composition.module.css"

const presets: Record<"retailer" | "services", CommercialModuleSlug[]> = {
  retailer: ["inventory", "sales", "pos", "cash_drawer"],
  services: ["sales", "finance", "accounting", "reports"],
}
const categories = ["all", "operations", "finance", "people", "insights"] as const
type Category = typeof categories[number]
type Pending = "preview" | "save" | "apply" | "verify" | "refresh" | "reopen" | "resume" | "history" | null
type Notice = { key: string; kind: "info" | "success" | "error" | "warning" }
type DraftChallenge = { kind: "save"; input: ModuleCompositionDraftInput } | { kind: "reopen"; input: ModuleCompositionReopenInput }
const categoryModules: Record<Exclude<Category, "all">, CommercialModuleSlug[]> = {
  operations: ["inventory", "sales", "pos", "purchasing", "commercial_agents"],
  finance: ["cash_drawer", "finance", "accounting", "payment_reconciliation", "close_assurance", "compliance"],
  people: ["presence", "payroll"],
  insights: ["analytics", "reports", "content"],
}

function sameSelection(left: readonly string[], right: readonly string[]) {
  return [...new Set(left)].sort().join("|") === [...new Set(right)].sort().join("|")
}

function sameSetup(left: CompositionSetupInputs, right: CompositionSetupInputs) {
  return (left.payrollPeriodId ?? "") === (right.payrollPeriodId ?? "") && (left.complianceAdapterId ?? "") === (right.complianceAdapterId ?? "")
}

function sameHistoryScope(left: ModuleCompositionData, right: ModuleCompositionData) {
  return Boolean(left.historyAccessKey) && left.organizationId === right.organizationId && left.historyAccessKey === right.historyAccessKey &&
    left.revision === right.revision && left.activeRevision === right.activeRevision && JSON.stringify(left.lifecycle) === JSON.stringify(right.lifecycle)
}

/** Local connection hints only. Authoritative validation always comes from the server preview. */
function connectionHints(selected: readonly CommercialModuleSlug[], catalog: readonly CompositionCatalogItem[]) {
  const entries = new Map(catalog.map(item => [item.slug, item]))
  const resolved = new Set<CommercialModuleSlug>(catalog.filter(item => item.core).map(item => item.slug))
  const requiredBy = new Map<CommercialModuleSlug, Set<CommercialModuleSlug>>()
  const visit = (slug: CommercialModuleSlug) => {
    if (resolved.has(slug)) return
    resolved.add(slug)
    for (const dependency of entries.get(slug)?.dependencies ?? []) {
      if (dependency.dependencyType !== "required") continue
      const dependents = requiredBy.get(dependency.dependsOnSlug) ?? new Set<CommercialModuleSlug>()
      dependents.add(slug)
      requiredBy.set(dependency.dependsOnSlug, dependents)
      visit(dependency.dependsOnSlug)
    }
  }
  selected.forEach(visit)
  return { resolved, requiredBy }
}

export function ModuleCompositionWorkbench({ initialData, userId }: { initialData: ModuleCompositionData; userId: string }) {
  const t = useTranslations("moduleComposition")
  const locale = pickLocale(useLocale())
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const previousServerData = useRef(initialData)
  const historyRequestVersion = useRef(0)
  const [selected, setSelected] = useState<CommercialModuleSlug[]>(initialData.selectedModules)
  const [stopped, setStopped] = useState<CommercialModuleSlug[]>(initialData.newWorkStoppedModules)
  const [setupInputs, setSetupInputs] = useState(initialData.setupInputs)
  const [tab, setTab] = useState("build")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<Category>("all")
  const [selectedOnly, setSelectedOnly] = useState(false)
  const selectedFilter = useRef<HTMLButtonElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const stopDisclosure = useRef<HTMLDetailsElement>(null)
  const [preview, setPreview] = useState<ModuleCompositionPreview | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [pending, setPending] = useState<Pending>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [historyError, setHistoryError] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState<number | null>(null)
  const [historyFocusId, setHistoryFocusId] = useState<string | null>(null)
  const [needsFreshAuth, setNeedsFreshAuth] = useState(false)
  const [applyFailed, setApplyFailed] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const applyKey = useRef<string | null>(null)
  const resumeCommand = useRef<ModuleCompositionResumeInput | null>(null)
  const [resumeAuth, setResumeAuth] = useState(false)
  const [draftChallenge, setDraftChallenge] = useState<DraftChallenge | null>(null)
  const draftOrigin = useRef<HTMLButtonElement | null>(null)
  const reviewButton = useRef<HTMLButtonElement>(null)
  const reviewHeading = useRef<HTMLHeadingElement>(null)
  const resumeButton = useRef<HTMLButtonElement>(null)
  const lifecycleHeading = useRef<HTMLHeadingElement>(null)
  const panelHeading = useRef<HTMLHeadingElement>(null)
  const storageKey = `stoquify:module-draft:${initialData.organizationId}:${userId}`
  // SSR renders the catalogue before React can accept input. Disable commands until
  // draft restoration completes so a fast click cannot be lost during hydration.
  const busy = pending !== null || !draftReady
  const hints = useMemo(() => connectionHints(selected, data.catalog), [selected, data.catalog])
  const moduleName = (slug: string) => isCommercialModuleSlug(slug) ? t(`modules.${slug}.name`) : slug
  const moduleNames = (slugs: readonly string[]) => slugs.map(moduleName).join(", ")
  const formatTime = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value))
  const href = (path: string) => localizePath(path, locale)

  useEffect(() => {
    const previous = previousServerData.current
    previousServerData.current = initialData
    const incoming = [...initialData.drafts, ...initialData.history]
    const previousHead = new Set([...previous.drafts, ...previous.history].map(entry => entry.id))
    const disjointHead = previousHead.size > 0 && !incoming.some(entry => previousHead.has(entry.id))
    if (!sameHistoryScope(previous, initialData) || disjointHead) historyRequestVersion.current += 1
    setData(current => {
      // RSC props can replay after a read action. Retain fetched history only
      // within the same server-derived access and configuration/lifecycle scope.
      if (!sameHistoryScope(current, initialData) || disjointHead) return initialData
      const entries = [...new Map([...current.drafts, ...current.history, ...initialData.drafts, ...initialData.history].map(entry => [entry.id, entry])).values()]
      return { ...initialData,
        drafts: entries.filter(entry => entry.state === "DRAFT"), history: entries.filter(entry => entry.state !== "DRAFT"),
        historyNextCursor: current.historyNextCursor === previous.historyNextCursor ? initialData.historyNextCursor : current.historyNextCursor }
    })
    setHistoryError(false); setHistoryLoaded(null)
  }, [initialData])
  useEffect(() => {
    if (historyFocusId) document.getElementById(`module-history-${historyFocusId}`)?.focus()
  }, [historyFocusId])
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "null")
      if (saved && typeof saved === "object" && "selected" in saved && Array.isArray(saved.selected) && saved.selected.every(isCommercialModuleSlug)) {
        setSelected(saved.selected)
        if ("stopped" in saved && Array.isArray(saved.stopped) && saved.stopped.every(isCommercialModuleSlug)) setStopped(saved.stopped)
        if ("setupInputs" in saved && saved.setupInputs && typeof saved.setupInputs === "object") {
          const scope = saved.setupInputs
          setSetupInputs({ ...("payrollPeriodId" in scope && typeof scope.payrollPeriodId === "string" ? { payrollPeriodId: scope.payrollPeriodId } : {}), ...("complianceAdapterId" in scope && typeof scope.complianceAdapterId === "string" ? { complianceAdapterId: scope.complianceAdapterId } : {}) })
        }
        setNotice({ key: "draftRestored", kind: "info" })
      }
    } catch { /* Browser storage is optional; the server draft remains available. */ }
    setDraftReady(true)
  }, [storageKey])
  useEffect(() => {
    if (!draftReady) return
    try {
      if (sameSelection(selected, data.selectedModules) && sameSelection(stopped, data.newWorkStoppedModules) && sameSetup(setupInputs, data.setupInputs)) sessionStorage.removeItem(storageKey)
      else sessionStorage.setItem(storageKey, JSON.stringify({ selected, stopped, setupInputs, revision: data.revision }))
    } catch { /* Storage failure must not prevent configuring the workspace. */ }
  }, [selected, stopped, setupInputs, data.selectedModules, data.newWorkStoppedModules, data.setupInputs, data.revision, storageKey, draftReady])

  const filtered = data.catalog.filter(item => {
    if (item.core) return false
    if (selectedOnly && !hints.resolved.has(item.slug)) return false
    if (category !== "all" && !categoryModules[category].includes(item.slug)) return false
    const words = `${moduleName(item.slug)} ${t(`modules.${item.slug}.description`)}`.toLocaleLowerCase(locale)
    return words.includes(query.trim().toLocaleLowerCase(locale))
  })
  const foundations = data.catalog.filter(item => item.core)
  const explicitChoices = data.catalog.filter(item => !item.core && selected.includes(item.slug))
  const connections = [...hints.requiredBy].filter(([slug]) => !selected.includes(slug) && !foundations.some(item => item.slug === slug))
  const unavailable = (item: CompositionCatalogItem) => !item.available || item.status === "internal" || item.status === "deprecated"
  const setupNotes = (item: CompositionCatalogItem) => item.requirements.filter(step => step.status !== "SUCCEEDED" || step.code === "COMPLIANCE_SANDBOX_VERIFIED")
  const setupLabel = (item: CompositionCatalogItem) => item.requirements.some(step => step.status !== "SUCCEEDED")
    ? "setup.required" : item.requirements.some(step => step.code === "COMPLIANCE_SANDBOX_VERIFIED") ? "catalog.setupSandbox" : `setup.${item.setup.status}`
  const cautions = (item: CompositionCatalogItem) => [
    ...(unavailable(item) ? [t("status.unavailable")] : []),
    ...(!item.eligible || item.grantStatus === "read_only" ? [t(`status.${item.grantStatus ?? "none"}`)] : []),
    ...(setupNotes(item).length || item.setup.status !== "ready" ? [t(setupLabel(item))] : []),
  ]
  const restrictedChoices = data.catalog.filter(item => !item.core && hints.resolved.has(item.slug) && cautions(item).length)
  const clearFilters = () => { setQuery(""); setCategory("all"); setSelectedOnly(false); searchInput.current?.focus() }
  const history = [...new Map([...data.drafts, ...data.history].map(entry => [entry.id, entry])).values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
  const serverHistoryIds = new Set([...initialData.drafts, ...initialData.history].map(entry => entry.id))
  const hasEarlierHistory = history.some(entry => !serverHistoryIds.has(entry.id))
  const activePreparation = data.lifecycle && !["ACTIVE", "RETAINED"].includes(data.lifecycle.state)
  const hasChanges = !sameSelection(selected, data.selectedModules) || !sameSelection(stopped, data.newWorkStoppedModules) || !sameSetup(setupInputs, data.setupInputs)
  const missingScopes = Number(hints.resolved.has("payroll") && !setupInputs.payrollPeriodId) + Number(hints.resolved.has("compliance") && !setupInputs.complianceAdapterId)
  const addedChoices = explicitChoices.filter(item => !data.selectedModules.includes(item.slug))
  const removedChoices = data.selectedModules.filter(slug => !selected.includes(slug) && !foundations.some(item => item.slug === slug))
  const stopChanges = [...new Set([...stopped, ...data.newWorkStoppedModules])].filter(slug => stopped.includes(slug) !== data.newWorkStoppedModules.includes(slug))
  function showOperationControls() {
    if (!stopDisclosure.current) return
    stopDisclosure.current.open = true
    stopDisclosure.current.querySelector("summary")?.focus()
    stopDisclosure.current.scrollIntoView({ block: "start" })
  }

  async function loadOlderHistory() {
    if (busy || !data.historyNextCursor) return
    const requestVersion = historyRequestVersion.current
    setPending("history"); setHistoryError(false); setHistoryLoaded(null)
    try {
      const result = await getModuleCompositionHistoryAction({ beforeId: data.historyNextCursor })
      if (requestVersion !== historyRequestVersion.current) return
      if (!result.success || !result.data) { setHistoryError(true); return }
      const page = result.data
      setData(current => ({ ...current, historyNextCursor: page.nextCursor,
        history: [...current.history, ...page.entries.filter(entry => entry.state !== "DRAFT")],
        drafts: [...current.drafts, ...page.entries.filter(entry => entry.state === "DRAFT")] }))
      setHistoryLoaded(page.entries.length)
      setHistoryFocusId(page.entries[0]?.id ?? null)
    } catch { setHistoryError(true) }
    finally { setPending(null) }
  }

  function editSelection(value: CommercialModuleSlug[]) {
    setSelected(value)
    setPreview(null)
    setNeedsFreshAuth(false)
    setApplyFailed(false)
    setNotice(null)
    applyKey.current = null
  }

  function editStopped(value: CommercialModuleSlug[]) {
    setStopped(value)
    editSelection(selected)
  }

  function editSetup(value: CompositionSetupInputs) {
    setSetupInputs(value)
    editSelection(selected)
  }

  function actionError(code?: string) {
    if (code === "CONFLICT" || code === "CONCURRENCY_CONFLICT" || code === "IDEMPOTENCY_CONFLICT") {
      setPreview(null)
      setNotice({ key: "conflict", kind: "warning" })
    } else if (code === "FORBIDDEN" || code === "TENANT_SCOPE_VIOLATION") setNotice({ key: "denied", kind: "error" })
    else if (code === "AUTH_REQUIRED") setNotice({ key: "signedOut", kind: "warning" })
    else setNotice({ key: "error", kind: "error" })
  }

  async function refresh() {
    setPending("refresh")
    try {
      const result = await getModuleCompositionAction()
      if (!result.success) { actionError(result.code); return }
      setData(result.data)
      setPreview(null)
      setNotice({ key: "refreshSuccess", kind: "info" })
    } catch { setNotice({ key: "refreshFailed", kind: "warning" }) }
    finally { setPending(null) }
  }

  async function review() {
    draftOrigin.current = null
    setDraftChallenge(null)
    setPending("preview")
    setNotice(null)
    try {
      const result = await previewModuleCompositionAction({ selectedModules: selected, stopNewWorkModules: stopped, setupInputs, expectedRevision: data.revision })
      if (!result.success) { actionError(result.code); return }
      setPreview(result.data)
      applyKey.current = crypto.randomUUID()
      setNeedsFreshAuth(false)
      setResumeAuth(false)
      setApplyFailed(false)
      setReviewOpen(true)
    } catch { actionError() }
    finally { setPending(null) }
  }

  async function saveDraft(command?: ModuleCompositionDraftInput) {
    const input = command ?? { selectedModules: selected, stopNewWorkModules: stopped, setupInputs, expectedRevision: data.revision, idempotencyKey: crypto.randomUUID() }
    if (!command) setDraftChallenge(null)
    setPending("save")
    setNotice(null)
    try {
      const result = await saveModuleCompositionDraftAction(input)
      if (!result.success) {
        if (result.code === "FRESH_AUTH_REQUIRED") openDraftChallenge({ kind: "save", input })
        else actionError(result.code)
        return
      }
      setData(current => ({ ...current, drafts: [result.data, ...current.drafts.filter(entry => entry.id !== result.data.id)] }))
      finishDraftChallenge()
      setNotice({ key: "saved", kind: "success" })
    } catch { actionError() }
    finally { setPending(null) }
  }

  async function applyReviewed() {
    if (!preview?.canApply || !preview.stopImpact.canStop || !applyKey.current) return
    setPending("apply")
    setNotice(null)
    try {
      const result = await applyModuleCompositionAction({ selectedModules: preview.selectedModules, stopNewWorkModules: preview.stopNewWorkModules, setupInputs: preview.setupInputs, expectedRevision: preview.revision, previewHash: preview.previewHash, idempotencyKey: applyKey.current })
      if (!result.success) {
        if (result.code === "FRESH_AUTH_REQUIRED") setNeedsFreshAuth(true)
        else { actionError(result.code); setApplyFailed(true) }
        return
      }
      const newerOperation = result.data.data.lifecycle && result.data.data.lifecycle.commandId !== result.data.commandId
      if (!newerOperation && result.data.state === "FAILED" && !result.data.data.lifecycle?.canResume) {
        setData(result.data.data)
        setApplyFailed(true)
        if (result.data.issue?.code === "CONFIGURATION_STALE") actionError("CONFLICT")
        else {
          const issue = result.data.issue
          setPreview(current => current ? { ...current, canApply: false, issues: issue ? [...current.issues.filter(item => item.code !== issue.code), issue] : current.issues } : null)
          setNotice({ key: "activationFailed", kind: "error" })
        }
        return
      }
      receiveOperation(result.data)
    } catch { setApplyFailed(true); actionError() }
    finally { setPending(null) }
  }

  function receiveOperation(result: ModuleCompositionApplyResult) {
    const newerOperation = result.data.lifecycle && result.data.lifecycle.commandId !== result.commandId
    const currentState = newerOperation ? result.data.lifecycle!.state : result.state
    const completed = currentState === "ACTIVE" || currentState === "RETAINED"
    setData(result.data)
    setSelected(result.data.selectedModules)
    setStopped(result.data.newWorkStoppedModules)
    setSetupInputs(result.data.setupInputs)
    setPreview(null)
    setNeedsFreshAuth(false)
    setResumeAuth(false)
    setReviewOpen(false)
    setTab(completed ? "workspace" : "build")
    setNotice({ key: newerOperation ? "lifecycle.newerRequest" : currentState === "ACTIVE" ? "activationSuccess" : currentState === "RETAINED" ? "lifecycle.retainedSuccess" : currentState === "FAILED" ? "lifecycle.failedNotice" : "lifecycle.requestedNotice", kind: newerOperation ? "info" : completed ? "success" : currentState === "FAILED" ? "error" : "info" })
    router.refresh()
    requestAnimationFrame(() => completed ? panelHeading.current?.focus() : lifecycleHeading.current?.focus())
  }

  async function resumePreparation() {
    if (!data.lifecycle?.canResume) return
    draftOrigin.current = null
    setDraftChallenge(null)
    if (resumeCommand.current?.operationId !== data.lifecycle.id) resumeCommand.current = { operationId: data.lifecycle.id, expectedRevision: data.revision, idempotencyKey: crypto.randomUUID() }
    setPending("resume")
    setNotice(null)
    try {
      const result = await resumeModuleCompositionAction(resumeCommand.current)
      if (!result.success) {
        if (result.code === "FRESH_AUTH_REQUIRED") { setPreview(null); setResumeAuth(true); setNeedsFreshAuth(true); setReviewOpen(true) }
        else actionError(result.code)
        return
      }
      resumeCommand.current = null
      receiveOperation(result.data)
    } catch { actionError() }
    finally { setPending(null) }
  }

  async function verifyAndApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const password = String(new FormData(form).get("password") ?? "")
    setPending("verify")
    try {
      const result = await stepUpWithPasswordAction({ password })
      form.reset()
      if (!result.success) { actionError(result.code); return }
      setNeedsFreshAuth(false)
      if (draftChallenge) await retryDraftChallenge(draftChallenge)
      else if (resumeAuth) await resumePreparation()
      else await applyReviewed()
    } catch { form.reset(); actionError() }
    finally { setPending(null) }
  }

  function openDraftChallenge(challenge: DraftChallenge) {
    setDraftChallenge(challenge)
    setPreview(null)
    setResumeAuth(false)
    setNeedsFreshAuth(true)
    setReviewOpen(true)
  }

  function finishDraftChallenge() {
    setNeedsFreshAuth(false)
    setDraftChallenge(null)
    setReviewOpen(false)
  }

  async function retryDraftChallenge(challenge: DraftChallenge) {
    if (challenge.kind === "save") await saveDraft(challenge.input)
    else await reopen({ id: challenge.input.commandId }, challenge.input)
  }

  async function reopen(entry: Pick<CompositionHistoryEntry, "id">, command?: ModuleCompositionReopenInput) {
    const input = command ?? { commandId: entry.id, expectedRevision: data.revision, idempotencyKey: crypto.randomUUID() }
    if (!command) setDraftChallenge(null)
    setPending("reopen")
    setNotice(null)
    try {
      const result = await reopenModuleCompositionAction(input)
      if (!result.success) {
        if (result.code === "FRESH_AUTH_REQUIRED") openDraftChallenge({ kind: "reopen", input })
        else actionError(result.code)
        return
      }
      editSelection(result.data.selectedModules)
      setStopped(result.data.stopNewWorkModules)
      setSetupInputs(result.data.setupInputs)
      setData(current => ({ ...current, drafts: [result.data, ...current.drafts.filter(item => item.id !== result.data.id)] }))
      setTab("build")
      finishDraftChallenge()
      setNotice({ key: "reopened", kind: "info" })
    } catch { actionError() }
    finally { setPending(null) }
  }

  function issueList(issues: readonly CompositionIssue[]) {
    return <ul className="grid gap-2">{issues.map((issue, index) => <li key={`${issue.code}-${issue.moduleSlug ?? "all"}-${index}`} className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm leading-6", dashboardToneClass(issue.blocking ? "danger" : "gold"))}>
      {issue.blocking ? <AlertTriangle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" /> : <ShieldCheck className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />}
      <div className="min-w-0">{issue.moduleSlug ? <strong>{moduleName(issue.moduleSlug)}. </strong> : null}{t(`issues.${issue.code}`)}{issue.href ? <Link className="ml-1 underline underline-offset-4" href={href(issue.href)}>{t("setupLink")}</Link> : null}</div>
    </li>)}</ul>
  }

  function listModules(slugs: readonly string[]) {
    return slugs.length ? <ul className="mt-3 grid gap-2 text-sm">{slugs.map(slug => <li key={slug} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dash-text-soft)]" aria-hidden="true" /><span>{moduleName(slug)}</span></li>)}</ul> : <p className="mt-3 text-sm text-[var(--dash-text-soft)]">{t("none")}</p>
  }

  function requirementList(requirements: readonly CompositionLifecycleStep[], evidence = false) {
    return <ul className="grid gap-3">{requirements.map(step => <li key={`${step.moduleSlug}-${step.stepKey}`} className={styles.card}>
      <div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-semibold">{moduleName(step.moduleSlug)}</p><Badge variant="outline" className={dashboardToneClass(step.status === "SUCCEEDED" ? "success" : step.status === "FAILED" ? "danger" : step.status === "WAITING_INPUT" ? "gold" : "info")}>{step.status === "SUCCEEDED" ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> : step.status === "FAILED" ? <AlertTriangle className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> : <FileClock className="mr-1 h-3.5 w-3.5" aria-hidden="true" />}{t(`lifecycle.stepStates.${step.status}`)}</Badge></div>
      <p className="mt-2 text-sm leading-6 text-[var(--dash-text-soft)]">{t(`lifecycle.requirements.${step.code}`)}</p>
      {step.href && step.status !== "SUCCEEDED" ? <Link href={href(step.href)} className="mt-2 inline-block text-sm underline underline-offset-4">{t("setupLink")}</Link> : null}
      {step.checkedAt ? <p className="mt-2 text-xs text-[var(--dash-text-soft)]">{t("updated", { time: formatTime(step.checkedAt) })}</p> : null}
      {evidence ? <details className="mt-2 text-xs text-[var(--dash-text-soft)]"><summary className="cursor-pointer">{t("lifecycle.stepEvidence")}</summary><dl className="mt-2 grid gap-2 break-all"><div><dt>{t("lifecycle.attempts")}</dt><dd>{step.attempts}</dd></div><div><dt>{t("lifecycle.evidenceReference")}</dt><dd>{step.evidenceHash ?? t("lifecycle.noEvidence")}</dd></div></dl></details> : null}
    </li>)}</ul>
  }

  function requirementsPanel(requirements: readonly CompositionLifecycleStep[], evidence = false) {
    // A successful sandbox check still needs a visible environment limitation.
    const remaining = requirements.filter(step => step.status !== "SUCCEEDED" || step.code === "COMPLIANCE_SANDBOX_VERIFIED")
    const completed = requirements.filter(step => step.status === "SUCCEEDED" && step.code !== "COMPLIANCE_SANDBOX_VERIFIED")
    return <div className="space-y-3">{remaining.length ? requirementList(remaining, evidence) : null}{completed.length ? <details><summary className="cursor-pointer text-sm font-semibold">{t("lifecycle.completedSteps", { count: completed.length })}</summary><div className="mt-3">{requirementList(completed, evidence)}</div></details> : null}</div>
  }

  function noticePanel(inDialog = false) {
    if (!notice) return null
    const tone: DashboardTone = notice.kind === "error" ? "danger" : notice.kind === "warning" ? "warning" : notice.kind
    return <div role={notice.kind === "error" ? "alert" : "status"} aria-live={notice.kind === "error" ? "assertive" : "polite"} className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm leading-6", dashboardToneClass(tone))}>
      <span>{t(notice.key)}</span>
      {(notice.key === "conflict" || notice.key === "refreshFailed") ? <Button type="button" disabled={busy} variant="outline" className="dashboard-button-secondary whitespace-normal" onClick={() => { if (inDialog) setReviewOpen(false); void refresh() }}><RefreshCw aria-hidden="true" />{t("refresh")}</Button> : null}
    </div>
  }

  return <div className={cn("dashboard-landing-theme min-h-screen", styles.workbench)} data-testid="module-composition-workbench" data-hydrated={draftReady} data-configuring={tab === "build"} aria-busy={!draftReady}>
    <div className={cn("dashboard-landing-content", styles.content)}>
      <header className={styles.pageHeader}>
        <div><p className={styles.eyebrow}>{data.organizationName}</p><h1>{t("experience.title")}</h1><p className={styles.introduction}>{t("experience.subtitle")}</p></div>
        <Button type="button" variant="outline" className="dashboard-button-secondary min-h-11 whitespace-normal" disabled={busy} onClick={() => void refresh()}><RefreshCw className={cn("h-4 w-4", pending === "refresh" && "animate-spin")} aria-hidden="true" />{t(pending === "refresh" ? "refreshing" : "refresh")}</Button>
      </header>
      <div className={styles.contextBar}>
        <p className={styles.currentState}><span className={styles.stateDot} aria-hidden="true" />{t("experience.activeCount", { count: data.activeModules.filter(slug => !foundations.some(item => item.slug === slug)).length })}</p>
        <p role="status" aria-live="polite">{t(hasChanges ? "experience.unsaved" : "experience.currentDraft")}</p>
        {data.newWorkStoppedModules.length ? <p className="text-[var(--dash-warning)]">{t("experience.stoppedCount", { count: data.newWorkStoppedModules.length })}</p> : null}
        <details className={styles.contextDetails}><summary>{t("experience.stateDetails")}</summary><dl>
          <div><dt>{t("organization")}</dt><dd>{data.organizationName}</dd></div><div><dt>{t("experience.configurationSource")}</dt><dd>{t(data.source === "legacy" ? "legacy" : "durable")}</dd></div>
          <div><dt>{t("lifecycle.desiredRevision")}</dt><dd>{data.revision}</dd></div><div><dt>{t("lifecycle.activeRevision")}</dt><dd>{data.activeRevision}</dd></div><div><dt>{t("lifecycle.observed")}</dt><dd>{formatTime(data.generatedAt)}</dd></div>
        </dl></details>
      </div>
      {!reviewOpen ? noticePanel() : null}
      {data.lifecycle ? <section className={cn(styles.card, styles.preparation)} aria-labelledby="module-lifecycle-title" data-testid="module-lifecycle">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 ref={lifecycleHeading} tabIndex={-1} id="module-lifecycle-title" className="text-lg font-semibold">{t("lifecycle.title")}</h2><p className="mt-2 text-sm leading-6 text-[var(--dash-text-soft)]">{t(activePreparation ? "lifecycle.previousWorkspace" : data.lifecycle.state === "RETAINED" ? "lifecycle.retainedHint" : "lifecycle.completeHint")}</p></div><Badge variant="outline" className={dashboardToneClass(data.lifecycle.state === "ACTIVE" ? "success" : data.lifecycle.state === "FAILED" ? "danger" : data.lifecycle.state === "RETAINED" ? "gold" : "info")}>{t(`historyStates.${data.lifecycle.state}`)}</Badge></div>
        <p role="status" aria-live="polite" className="mt-3 text-sm">{t(`historyStates.${data.lifecycle.state}`)} · {t("lifecycle.revisions", { desired: data.lifecycle.desiredRevision, active: data.lifecycle.activeRevision })} · {t("updated", { time: formatTime(data.lifecycle.updatedAt) })}</p>
        <div className={styles.preparationSteps}>{requirementsPanel(data.lifecycle.steps, true)}</div>
        {data.lifecycle.canResume ? <div className="mt-4"><Button ref={resumeButton} type="button" disabled={busy} className="dashboard-button-primary h-auto min-h-11 whitespace-normal" onClick={() => void resumePreparation()}><RefreshCw aria-hidden="true" />{t(pending === "resume" ? "lifecycle.resuming" : "lifecycle.resume")}</Button><p className="mt-2 text-xs leading-5 text-[var(--dash-text-soft)]">{t("lifecycle.resumeHint")}</p></div> : activePreparation ? <p className="mt-4 text-sm leading-6 text-[var(--dash-text-soft)]">{t("lifecycle.noResume")}</p> : null}
        <details className="mt-3 text-xs text-[var(--dash-text-soft)]"><summary className="cursor-pointer">{t("record")}</summary><p className="mt-2 break-all">{data.lifecycle.id}</p></details>
      </section> : null}
      <Tabs value={tab} onValueChange={value => { if (!busy) setTab(value) }}>
        <TabsList aria-label={t("eyebrow")} className={styles.tabs}>
          <TabsTrigger value="build" className={styles.tab} disabled={busy}><SlidersHorizontal className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />{t("tabs.build")}</TabsTrigger>
          <TabsTrigger value="workspace" className={styles.tab} disabled={busy}><Boxes className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />{t("tabs.workspace")}</TabsTrigger>
          <TabsTrigger value="history" className={styles.tab} disabled={busy}><History className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />{t("tabs.history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="build" className="mt-5 space-y-5">
          <div className={styles.layout}>
            <section aria-labelledby="module-catalog-title" className="min-w-0 space-y-4">
              <div><h2 id="module-catalog-title" className="text-lg font-semibold">{t("catalogTitle")}</h2><p className="mt-1 text-sm leading-6 text-[var(--dash-text-soft)]">{t("catalogHint")}</p></div>
          <details className={styles.presets}>
            <summary id="module-recipes-title" className="text-sm font-semibold">{t("recipesTitle")}</summary>
            <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t("recipesHint")}</p>
            <div className={styles.recipeGrid}>{(["retailer", "services", "current"] as const).map(recipe => {
              const selection = recipe === "current" ? data.selectedModules : presets[recipe]
              const Icon = recipe === "retailer" ? Store : recipe === "services" ? BriefcaseBusiness : Layers3
              return <button type="button" key={recipe} className={styles.recipe} disabled={busy} aria-pressed={sameSelection(selected, selection)} onClick={() => editSelection(selection)}><Icon className="h-5 w-5 shrink-0 text-[var(--dash-brand-strong)]" aria-hidden="true" /><span><span className="block text-sm font-semibold">{t(`recipes.${recipe}.title`)}</span><span className="mt-1 block text-xs leading-5 text-[var(--dash-text-soft)]">{t(`recipes.${recipe}.description`)}</span></span></button>
            })}</div>
          </details>

              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="min-w-0 flex-1 text-xs font-semibold" htmlFor="module-search">{t("search")}<span className="relative mt-2 block"><Search className="absolute left-3 top-3 h-4 w-4 text-[var(--dash-text-soft)]" aria-hidden="true" /><Input ref={searchInput} id="module-search" value={query} disabled={!draftReady} onChange={event => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} className="dashboard-control h-11 pl-9" /></span></label>
                <label className="text-xs font-semibold sm:max-w-[14rem]" htmlFor="module-category">{t("filter")}<select id="module-category" value={category} disabled={!draftReady} onChange={event => setCategory(event.target.value as Category)} className="dashboard-control mt-2 block h-11 w-full rounded-md px-3 text-sm">{categories.map(value => <option key={value} value={value}>{t(`categories.${value}`)}</option>)}</select></label>
              </div>
              <div className={styles.catalogToolbar}>
                <Button ref={selectedFilter} type="button" variant="outline" disabled={!draftReady} aria-pressed={selectedOnly} aria-describedby="module-selected-filter-hint" className={cn("dashboard-button-secondary", styles.selectedFilter)} onClick={() => setSelectedOnly(value => !value)}><Check className="h-4 w-4" aria-hidden="true" />{t("catalog.selectedFilter")}</Button>
                <p id="module-selected-filter-hint" className="text-xs text-[var(--dash-text-soft)]">{t("catalog.selectedHint")}</p>
                {filtered.length > 0 && (query || category !== "all" || selectedOnly) ? <Button type="button" variant="ghost" className={styles.clearFilters} onClick={clearFilters}>{t("clearSearch")}</Button> : null}
              </div>
              <a href="#module-draft-title" className={styles.draftJump}>{t("catalog.viewDraft")} · {t("catalog.explicitCount", { count: explicitChoices.length })}</a>
              <p role="status" aria-atomic="true" className="text-xs text-[var(--dash-text-soft)]">{t("catalog.results", { count: filtered.length, total: data.catalog.length - foundations.length })}</p>
              {filtered.length ? <div className={styles.catalog}>{categories.filter(group => group !== "all").map(group => {
                const items = filtered.filter(item => categoryModules[group].includes(item.slug))
                if (!items.length) return null
                return <section key={group} aria-labelledby={`module-group-${group}`} className={styles.catalogGroup}>
                  <div className={styles.groupHeading}><h3 id={`module-group-${group}`} className="font-semibold">{t(`categories.${group}`)}</h3><span className="text-xs text-[var(--dash-text-soft)]">{t("catalog.groupCount", { count: items.length })}</span></div>
                  {items.map(item => {
                const explicit = selected.includes(item.slug)
                const required = !explicit && hints.resolved.has(item.slug)
                const checked = hints.resolved.has(item.slug)
                const dependents = [...(hints.requiredBy.get(item.slug) ?? [])]
                const isUnavailable = unavailable(item)
                const notes = setupNotes(item)
                const dependencies = item.dependencies.filter(dependency => dependency.dependencyType === "required")
                return <article key={item.slug} className={styles.capabilityRow} data-selected={checked} data-testid={`module-card-${item.slug}`}>
                  <div className={styles.rowMain}>
                    <span className={styles.selectionControl}><Checkbox id={`module-${item.slug}`} className="h-6 w-6" checked={checked} disabled={busy || required || (isUnavailable && !explicit)} aria-describedby={`module-description-${item.slug} module-context-${item.slug}`} onCheckedChange={value => {
                      editSelection(value === true ? [...selected, item.slug] : selected.filter(slug => slug !== item.slug))
                      // A removed row disappears in Selected view; keep keyboard focus on a stable control.
                      if (selectedOnly && value !== true && !dependents.length) selectedFilter.current?.focus()
                    }} /></span>
                    <div className="min-w-0"><label htmlFor={`module-${item.slug}`} className={styles.capabilityName}>{moduleName(item.slug)}</label><p id={`module-description-${item.slug}`} className="text-sm leading-6 text-[var(--dash-text-soft)]">{t(`modules.${item.slug}.description`)}</p></div>
                    <span className={styles.draftState}>{required ? <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" /> : checked ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}{t(required ? "required" : checked ? "selected" : "catalog.notSelected")}</span>
                  </div>
                  <div id={`module-context-${item.slug}`} className={styles.rowContext}>
                    <dl className={styles.rowFacts}>
                      <div><dt>{t("catalog.workspace")}</dt><dd>{t(data.activeModules.includes(item.slug) ? "current" : "catalog.outsideWorkspace")}</dd></div>
                      <div><dt>{t("catalog.access")}</dt><dd className={!item.eligible || item.grantStatus === "read_only" ? "text-[var(--dash-warning)]" : undefined}>{t(`status.${item.grantStatus ?? "none"}`)}</dd></div>
                      <div><dt>{t("catalog.setup")}</dt><dd>{t(setupLabel(item))}</dd></div>
                      {data.newWorkStoppedModules.includes(item.slug) ? <div className="text-[var(--dash-warning)]"><dt>{t("experience.operations")}</dt><dd>{t("stop.current")}</dd></div> : null}
                    </dl>
                    {required ? <p className="text-xs leading-5 text-[var(--dash-text-muted)]">{t("requiredBy", { modules: moduleNames(dependents) })} {t("removeDependency", { modules: moduleNames(dependents) })}</p> : null}
                    {item.requirements.some(step => step.code === "COMPLIANCE_SANDBOX_VERIFIED") ? <p className="text-xs leading-5 text-[var(--dash-text-soft)]">{t("lifecycle.requirements.COMPLIANCE_SANDBOX_VERIFIED")}</p> : null}
                    {isUnavailable ? <p className="text-xs leading-5 text-[var(--dash-warning)]">{t("issues.CATALOG_UNAVAILABLE")}</p> : !item.eligible ? <p className="text-xs leading-5 text-[var(--dash-warning)]">{t("issues.ELIGIBILITY_REQUIRED")}</p> : null}
                  </div>
                  <details className={styles.rowDetails}>
                    <summary>{t("catalog.details")}<span className="sr-only">{t("catalog.detailsFor", { module: moduleName(item.slug) })}</span></summary>
                    <div className="space-y-3 pb-2 text-xs leading-5 text-[var(--dash-text-soft)]">
                      {dependencies.length ? <p>{t("connections")}: {moduleNames(dependencies.map(dependency => dependency.dependsOnSlug))}</p> : <p>{t("catalog.noConnections")}</p>}
                      {explicit && dependents.length ? <p>{t("requiredBy", { modules: moduleNames(dependents) })} {t("catalog.explicitConnection")}</p> : null}
                      {notes.map(step => <p key={step.stepKey}>{step.code !== "COMPLIANCE_SANDBOX_VERIFIED" ? t(`lifecycle.requirements.${step.code}`) : null}{step.href ? <Link href={href(step.href)} className={styles.setupLink}>{t("setupLink")}</Link> : null}</p>)}
                      {!notes.length && item.setup.status !== "ready" ? <p>{t(`issues.${item.setup.code}`)}{item.setup.href ? <Link href={href(item.setup.href)} className={styles.setupLink}>{t("setupLink")}</Link> : null}</p> : null}
                      <p>{t("catalog.setupHint")}</p>
                    </div>
                  </details>
                </article>
                  })}
                </section>
              })}</div> : <RouteStatePanel kind="empty" title={t("emptySearch")} message={t("emptySearchHint")} action={{ label: t("clearSearch"), onClick: clearFilters }} />}
              <details className={styles.card}><summary className="cursor-pointer text-sm font-semibold">{t("futureTitle")}</summary><p className="mt-3 text-sm leading-6 text-[var(--dash-text-soft)]">{t("future")}</p></details>
            </section>

            <aside className={cn(styles.card, styles.summary)} aria-labelledby="module-draft-title">
              <div className="flex items-center gap-2"><Layers3 className="h-5 w-5 text-[var(--dash-brand-strong)]" aria-hidden="true" /><h2 id="module-draft-title" tabIndex={-1} className="font-semibold">{t("summary")}</h2></div>
              <div className={styles.draftCounts} aria-live="polite" aria-atomic="true">
                <p className="text-xl font-semibold">{t("catalog.explicitCount", { count: explicitChoices.length })}</p>
                <p>{t("catalog.connectionCount", { count: connections.length })}</p>
                <p>{t("foundationCount", { count: foundations.length })}</p>
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--dash-text-soft)]">{t("experience.draftHint")}</p>
              {hasChanges ? <div className={styles.changeSummary} data-testid="module-draft-changes"><p>{t("experience.selectionChanges", { added: addedChoices.length, removed: removedChoices.length })}</p>{stopChanges.length ? <p className="text-[var(--dash-warning)]">{t("experience.stopChanges", { count: stopChanges.length })}</p> : null}{!sameSetup(setupInputs, data.setupInputs) ? <p>{t("experience.scopeChanged")}</p> : null}</div> : null}
              <Button ref={reviewButton} type="button" className={cn(activePreparation ? "dashboard-button-secondary mt-4" : "dashboard-button-primary mt-4", styles.summaryAction, styles.reviewAction)} disabled={busy} onClick={() => void review()}>{pending === "preview" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}{t(pending === "preview" ? "reviewing" : "review")}</Button>
              <Button type="button" variant="outline" className={cn("dashboard-button-secondary mt-2", styles.summaryAction)} disabled={busy} onClick={event => { draftOrigin.current = event.currentTarget; void saveDraft() }}><FileClock aria-hidden="true" />{t(pending === "save" ? "saving" : "saveDraft")}</Button>
              {busy ? <p role="status" className="mt-3 text-xs leading-5 text-[var(--dash-text-soft)]">{t("pendingHint")}</p> : null}
          {hints.resolved.has("payroll") || hints.resolved.has("compliance") ? <details className={styles.scopeDetails}><summary id="module-scope-title">{t("scopes.title")}<span>{t(missingScopes ? "experience.scopeMissing" : "experience.scopeChosen", { count: missingScopes })}</span></summary><p className="mt-2 text-sm leading-6 text-[var(--dash-text-soft)]">{t("scopes.hint")}</p><div className="mt-4 grid gap-5">
            {hints.resolved.has("payroll") ? <div><label className="text-sm font-semibold" htmlFor="module-payroll-period">{t("scopes.payroll")}</label><select id="module-payroll-period" value={setupInputs.payrollPeriodId ?? ""} disabled={busy} onChange={event => editSetup({ ...setupInputs, payrollPeriodId: event.target.value || undefined })} className="dashboard-control mt-2 block min-h-11 w-full min-w-0 rounded-md px-3 py-2 text-sm"><option value="">{t("scopes.choosePeriod")}</option>{setupInputs.payrollPeriodId && !data.availablePayrollPeriods.some(period => period.id === setupInputs.payrollPeriodId) ? <option value={setupInputs.payrollPeriodId} disabled>{t("scopes.unavailable")}</option> : null}{data.availablePayrollPeriods.map(period => <option key={period.id} value={period.id}>{period.name} · {period.countryCode} · {formatDate(period.periodStart)}–{formatDate(period.periodEnd)} · {t("scopes.payDate", { date: formatDate(period.payDate) })}</option>)}</select><p className="mt-2 text-xs leading-5 text-[var(--dash-text-soft)]">{t(data.availablePayrollPeriods.length ? "scopes.periodHint" : "scopes.noPeriods")}</p><Link href={href("/dashboard/payroll")} className="mt-2 inline-block text-sm underline underline-offset-4">{t("scopes.openPayroll")}</Link></div> : null}
            {hints.resolved.has("compliance") ? <div><label className="text-sm font-semibold" htmlFor="module-compliance-adapter">{t("scopes.compliance")}</label><select id="module-compliance-adapter" value={setupInputs.complianceAdapterId ?? ""} disabled={busy} onChange={event => editSetup({ ...setupInputs, complianceAdapterId: event.target.value || undefined })} className="dashboard-control mt-2 block min-h-11 w-full min-w-0 rounded-md px-3 py-2 text-sm"><option value="">{t("scopes.chooseAdapter")}</option>{setupInputs.complianceAdapterId && !data.availableComplianceAdapters.some(adapter => adapter.id === setupInputs.complianceAdapterId) ? <option value={setupInputs.complianceAdapterId} disabled>{t("scopes.unavailable")}</option> : null}{data.availableComplianceAdapters.map(adapter => <option key={adapter.id} value={adapter.id}>{adapter.countryCode} · {adapter.authorityChannel} · {t(adapter.environment.toLowerCase() === "sandbox" ? "scopes.sandbox" : adapter.environment.toLowerCase() === "production" ? "scopes.production" : "scopes.otherEnvironment")}</option>)}</select><p className="mt-2 text-xs leading-5 text-[var(--dash-text-soft)]">{t(data.availableComplianceAdapters.length ? "scopes.adapterHint" : "scopes.noAdapters")}</p><Link href={href("/dashboard/compliance")} className="mt-2 inline-block text-sm underline underline-offset-4">{t("scopes.openCompliance")}</Link></div> : null}
          </div><p className="mt-4 text-xs leading-5 text-[var(--dash-text-soft)]">{t("scopes.refreshHint")}</p></details> : null}
              <details className={styles.summaryDetails}><summary>{t("catalog.yourChoices", { count: explicitChoices.length })}</summary>{listModules(explicitChoices.map(item => item.slug))}</details>
              {connections.length ? <details className={styles.summaryDetails}><summary>{t("catalog.connectionCount", { count: connections.length })}</summary><ul className="mt-3 space-y-3">{connections.map(([slug, dependents]) => <li key={slug} className="text-sm"><span className="font-semibold">{moduleName(slug)}</span><span className="mt-1 block text-xs leading-5 text-[var(--dash-text-soft)]">{t("requiredBy", { modules: moduleNames([...dependents]) })}</span></li>)}</ul></details> : null}
              <details className={styles.summaryDetails}><summary>{t("shared")}</summary>{listModules(foundations.map(item => item.slug))}</details>
              {restrictedChoices.length ? <div className={styles.draftCautions}><h3 className="text-sm font-semibold">{t("catalog.restrictions", { count: restrictedChoices.length })}</h3><ul className="mt-3 space-y-2">{restrictedChoices.map(item => <li key={item.slug} className="text-xs leading-5"><span className="font-semibold">{moduleName(item.slug)}</span><span className="ml-1 text-[var(--dash-text-soft)]">{cautions(item).join(" · ")}</span></li>)}</ul></div> : null}
              <Button type="button" variant="ghost" className={styles.operationsLink} disabled={busy} onClick={showOperationControls}><ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />{t("stop.title")}</Button>
              <p className="mt-3 text-xs leading-5 text-[var(--dash-text-soft)]">{t("catalog.reviewHint")}</p>
              <p className="mt-5 border-t border-[var(--dash-border-subtle)] pt-4 text-xs leading-5 text-[var(--dash-text-soft)]">{t("noPurchase")}</p>
            </aside>
          </div>
          <details ref={stopDisclosure} id="module-operation-controls" className={cn(styles.card, styles.operations)}>
            <summary className="cursor-pointer font-semibold">{t("stop.title")}</summary>
            <p id="module-stop-hint" className="mt-3 text-sm leading-6 text-[var(--dash-text-soft)]">{t("stop.hint")}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--dash-text-soft)]">{t("stop.resumeHint")}</p>
            <fieldset className="mt-4 grid gap-3 sm:grid-cols-2" aria-describedby="module-stop-hint"><legend className="sr-only">{t("stop.title")}</legend>{data.catalog.filter(item => !item.core).map(item => {
              const option = data.stopOptions.find(option => option.moduleSlug === item.slug)
              const chosen = stopped.includes(item.slug)
              return <div key={item.slug} className="rounded-lg border border-[var(--dash-border-subtle)] p-3 text-sm leading-6"><div className="flex items-start gap-3"><Checkbox id={`stop-${item.slug}`} className="mt-1 h-5 w-5 shrink-0" checked={chosen} disabled={busy || (!option?.supported && !chosen)} aria-describedby={`stop-context-${item.slug}`} onCheckedChange={value => editStopped(value === true ? [...stopped, item.slug] : stopped.filter(slug => slug !== item.slug))} /><label htmlFor={`stop-${item.slug}`}>{t("stop.option", { module: moduleName(item.slug) })}</label></div><div id={`stop-context-${item.slug}`} className="mt-2 text-xs leading-5 text-[var(--dash-text-soft)]">{option?.supported && item.slug === "accounting" ? <p>{t("stop.accountingScope")}</p> : null}{!option?.supported ? <p>{t(option?.unsupportedReason === "OFFLINE_CONTINUATION_UNAVAILABLE" ? "stop.unsupportedOffline" : "stop.unsupported")}</p> : null}{data.newWorkStoppedModules.includes(item.slug) ? <p className="text-[var(--dash-gold)]">{t("stop.current")}</p> : null}</div></div>
            })}</fieldset>
          </details>
        </TabsContent>

        <TabsContent value="workspace" className="mt-5 space-y-4">
          <div><h2 ref={panelHeading} tabIndex={-1} className="text-xl font-semibold outline-none">{t("workspaceTitle")}</h2><p className="mt-2 text-sm leading-6 text-[var(--dash-text-soft)]">{t("workspaceHint")}</p></div>
          {data.workspace.length ? <div className={styles.workspaceGrid}>{data.workspace.map(destination => <Link key={`${destination.moduleSlug}-${destination.href}`} href={href(destination.href)} className={styles.workspaceLink} aria-label={t("open", { module: moduleName(destination.moduleSlug) })}><Boxes className="h-5 w-5 text-[var(--dash-brand-strong)]" aria-hidden="true" /><span className="font-semibold">{moduleName(destination.moduleSlug)}</span>{data.newWorkStoppedModules.includes(destination.moduleSlug) ? <><Badge variant="outline" className={dashboardToneClass("gold")}>{t("stop.current")}</Badge><span className="text-sm leading-6 text-[var(--dash-text-soft)]">{t("stop.workspaceHint")}</span></> : <span className="text-sm leading-6 text-[var(--dash-text-soft)]">{t(`modules.${destination.moduleSlug}.description`)}</span>}<span className={styles.destinationAction}>{t("experience.openWorkspace")}<ArrowRight className="h-4 w-4" aria-hidden="true" /></span></Link>)}</div> : <RouteStatePanel kind="permission_denied" title={t("workspaceEmpty")} message={t("workspaceEmptyHint")} />}
          <p className="text-sm leading-6 text-[var(--dash-text-soft)]">{t("retained")}</p>
          {data.newWorkStoppedModules.length ? <section className={styles.card} aria-labelledby="module-retained-title"><h3 id="module-retained-title" className="font-semibold">{t("stop.retainedTitle")}</h3><p className="mt-2 text-sm leading-6 text-[var(--dash-text-soft)]">{t("stop.retainedHint")}</p><ul className="mt-3 grid gap-3">{data.newWorkStoppedModules.map(slug => <li key={slug} className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>{moduleName(slug)}</span><div className="flex flex-wrap items-center gap-3">{data.retainedWorkspace.filter(destination => destination.moduleSlug === slug).map(destination => <Link key={destination.href} href={href(destination.href)} className="underline underline-offset-4">{t("stop.openRecords", { module: moduleName(slug) })}</Link>)}<Button type="button" variant="outline" className="dashboard-button-secondary h-auto min-h-11 whitespace-normal" disabled={busy} onClick={() => { setStopped(stopped.filter(item => item !== slug)); editSelection([...new Set([...selected, slug])]); setTab("build"); setNotice({ key: "stop.reactivationDraft", kind: "info" }) }}>{t("stop.reactivate", { module: moduleName(slug) })}</Button></div></li>)}</ul></section> : null}
        </TabsContent>

        <TabsContent value="history" className="mt-5 space-y-4">
          <div><h2 className="text-xl font-semibold">{t("historyTitle")}</h2><p className="mt-2 text-sm leading-6 text-[var(--dash-text-soft)]">{t("historyHint")}</p></div>
          {hasEarlierHistory ? <p className="text-sm leading-6 text-[var(--dash-text-soft)]">{t("historySnapshot")}</p> : null}
          {history.length ? <ol className={styles.historyList}>{history.map(entry => <li key={entry.id} id={`module-history-${entry.id}`} tabIndex={-1} className={cn(styles.card, "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]")}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><Badge variant="outline" className={dashboardToneClass(entry.state === "ACTIVE" ? "success" : entry.state === "FAILED" ? "danger" : entry.state === "RETAINED" ? "gold" : "info")}>{entry.state === "ACTIVE" ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> : <FileClock className="mr-1 h-3.5 w-3.5" aria-hidden="true" />}{t(`historyStates.${entry.state}`)}</Badge><p className="mt-2 text-sm">{t("revision", { revision: entry.revision })} · <time dateTime={entry.createdAt}>{formatTime(entry.createdAt)}</time></p></div><Button type="button" variant="outline" className="dashboard-button-secondary h-auto min-h-11 whitespace-normal py-2 text-left" disabled={busy} onClick={event => { draftOrigin.current = event.currentTarget; void reopen(entry) }}><History aria-hidden="true" />{t(pending === "reopen" ? "reopening" : "reopen")}</Button></div>
            <p className="mt-3 text-sm leading-6"><span className="text-[var(--dash-text-soft)]">{t("configuration")}: </span>{moduleNames(entry.selectedModules) || t("none")}</p>
            {entry.stopNewWorkModules.length ? <p className="mt-2 text-sm leading-6"><span className="text-[var(--dash-text-soft)]">{t("stop.recordedStops")}: </span>{moduleNames(entry.stopNewWorkModules)}</p> : null}
            <details className="mt-3 text-xs leading-5 text-[var(--dash-text-soft)]"><summary className="cursor-pointer">{t("record")}</summary><dl className="mt-2 grid gap-2 break-all"><div><dt>{t("record")}</dt><dd>{entry.id}</dd></div><div><dt>{t("actor")}</dt><dd>{entry.actorId}</dd></div><div><dt>{t("previous")}</dt><dd>{moduleNames(entry.previousModules) || t("none")}</dd></div></dl></details>
          </li>)}</ol> : <RouteStatePanel kind="empty" title={t("historyEmpty")} message={t("historyEmptyHint")} />}
          {historyError ? <p role="alert" className={cn("rounded-lg border p-3 text-sm leading-6", dashboardToneClass("danger"))}>{t("historyLoadFailed")}</p> : null}
          {historyLoaded !== null ? <p role="status" className="text-sm text-[var(--dash-text-soft)]">{t("historyLoaded", { count: historyLoaded })}</p> : null}
          {data.historyNextCursor ? <Button type="button" data-testid="module-history-older" variant="outline" className="dashboard-button-secondary h-auto min-h-11 whitespace-normal" disabled={busy} onClick={() => void loadOlderHistory()}>{pending === "history" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <History aria-hidden="true" />}{t(pending === "history" ? "historyLoading" : historyError ? "historyRetry" : "historyOlder")}</Button> : null}
        </TabsContent>
      </Tabs>

      {data.limitations.length ? <details className={styles.card}><summary className="cursor-pointer text-sm font-semibold">{t("limitations")}</summary><div className="mt-3">{issueList(data.limitations)}</div></details> : null}
    </div>

    <Dialog open={reviewOpen} onOpenChange={open => { if (!busy) setReviewOpen(open) }}>
      <DialogContent className={styles.dialog} closeLabel={t("close")} closeDisabled={busy} onOpenAutoFocus={event => { event.preventDefault(); reviewHeading.current?.focus() }} data-testid="configuration-review" onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onInteractOutside={event => { if (busy) event.preventDefault() }} onCloseAutoFocus={event => { event.preventDefault(); if (draftOrigin.current?.isConnected) draftOrigin.current.focus(); else if (resumeAuth) resumeButton.current?.focus(); else if (tab === "workspace") panelHeading.current?.focus(); else if (activePreparation && !preview) lifecycleHeading.current?.focus(); else reviewButton.current?.focus() }}>
        <DialogHeader className={styles.reviewHeader}><DialogTitle ref={reviewHeading} tabIndex={-1} className="text-xl leading-7">{t(draftChallenge ? `draftAuth.${draftChallenge.kind}Title` : resumeAuth ? "lifecycle.resumeTitle" : "reviewTitle")}</DialogTitle><DialogDescription className="text-[var(--dash-text-soft)]">{t(draftChallenge ? "draftAuth.hint" : resumeAuth ? "lifecycle.resumeHint" : "reviewDescription")}</DialogDescription></DialogHeader>
        <div className={styles.reviewBody}>
        {noticePanel(true)}
        {preview ? <>
          <p className="flex items-center gap-2 text-xs text-[var(--dash-info)]"><ShieldCheck className="h-4 w-4" aria-hidden="true" />{t("checked", { revision: preview.revision })} · {formatTime(preview.generatedAt)}</p>
          <div className={styles.impact}>{(["additions", "kept", "removed"] as const).map(key => <section className={styles.card} key={key}><h3 className={styles.impactTitle}>{t(key)}<span>{(key === "removed" ? preview.removedFromWorkspace : preview[key]).length}</span></h3>{listModules(key === "removed" ? preview.removedFromWorkspace : preview[key])}</section>)}</div>
          <div className="rounded-lg border border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] p-3 text-sm leading-6"><p>{t("retained")}</p><details className="mt-2"><summary className="cursor-pointer font-semibold">{t("accessKept")} ({preview.preservedAccess.length})</summary>{listModules(preview.preservedAccess)}</details></div>
          {preview.stopImpact.impacts.length || preview.stopImpact.resumed.length ? <section aria-labelledby="module-stop-impact" className="space-y-3"><h3 id="module-stop-impact" className="font-semibold">{t("stop.impactTitle")}</h3><p className="text-sm leading-6 text-[var(--dash-text-soft)]">{t("stop.timing")}</p>
            {preview.stopImpact.impacts.map(impact => <article className={styles.card} key={impact.moduleSlug} data-testid={`stop-impact-${impact.moduleSlug}`}><h4 className="font-semibold">{moduleName(impact.moduleSlug)}</h4><p className={cn("mt-2 text-sm leading-6", impact.supported ? "text-[var(--dash-text-soft)]" : "text-[var(--dash-danger)]")}>{t(impact.supported ? "stop.supported" : impact.unsupportedReason === "OFFLINE_CONTINUATION_UNAVAILABLE" ? "stop.unsupportedOffline" : "stop.unsupported")}</p>
              {impact.newWork.length ? <div className="mt-3"><h5 className="text-sm font-semibold">{t("stop.newWork")}</h5><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">{impact.newWork.map(code => <li key={code}>{t(`stop.operations.${code}`)}</li>)}</ul></div> : null}
              {impact.continuation.length ? <div className="mt-3"><h5 className="text-sm font-semibold">{t("stop.continuations")}</h5><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">{impact.continuation.map(code => <li key={code}>{t(`stop.operations.${code}`)}</li>)}</ul></div> : null}
              {impact.dependentModules.length ? <div className="mt-3"><h5 className="text-sm font-semibold">{t("stop.dependents")}</h5>{listModules(impact.dependentModules)}</div> : null}
              <ul className="mt-3 space-y-2 text-sm leading-6">{impact.observations.map(observation => <li key={observation.code}>{t(`stop.observations.${observation.code}`)}: <strong>{observation.count}</strong> <span className="text-[var(--dash-text-soft)]">({t(`stop.kinds.${observation.kind}`)})</span></li>)}</ul>
              <p className="mt-3 text-sm leading-6 text-[var(--dash-gold)]">{t("stop.pending", { count: impact.pendingCount })}</p>
              {impact.observations.length ? <p className="mt-2 text-xs leading-5 text-[var(--dash-text-soft)]">{t("stop.observationHint")}</p> : null}
            </article>)}
            {preview.stopImpact.resumed.length ? <div className={styles.card}><h4 className="text-sm font-semibold">{t("stop.resumed")}</h4>{listModules(preview.stopImpact.resumed)}<p className="mt-2 text-sm leading-6 text-[var(--dash-text-soft)]">{t("stop.resumeReviewHint")}</p></div> : null}
            <p className="text-sm leading-6 text-[var(--dash-text-soft)]">{t(preview.stopImpact.canRetain ? "stop.drainReady" : "stop.drainPending")}</p>
          </section> : null}
          <p className="text-sm leading-6 text-[var(--dash-text-soft)]">{t("noPurchase")}</p>
          {preview.setupInputs.payrollPeriodId || preview.setupInputs.complianceAdapterId ? <section className={styles.card} aria-labelledby="module-reviewed-scope"><h3 id="module-reviewed-scope" className="font-semibold">{t("scopes.reviewTitle")}</h3>
            {preview.setupInputs.payrollPeriodId ? <div className="mt-3 text-sm leading-6"><h4 className="font-semibold">{t("scopes.payroll")}</h4>{preview.setupScope.payrollPeriod ? <><p>{preview.setupScope.payrollPeriod.name} · {preview.setupScope.payrollPeriod.countryCode}</p><p>{t("scopes.periodRange", { start: formatDate(preview.setupScope.payrollPeriod.periodStart), end: formatDate(preview.setupScope.payrollPeriod.periodEnd) })}</p><p>{t("scopes.payDate", { date: formatDate(preview.setupScope.payrollPeriod.payDate) })}</p></> : <p className="text-[var(--dash-warning)]">{t("scopes.unavailable")}</p>}</div> : null}
            {preview.setupInputs.complianceAdapterId ? <div className="mt-3 text-sm leading-6"><h4 className="font-semibold">{t("scopes.compliance")}</h4>{preview.setupScope.complianceAdapter ? <><p>{preview.setupScope.complianceAdapter.countryCode} · {preview.setupScope.complianceAdapter.authorityChannel}</p><p>{t(preview.setupScope.complianceAdapter.environment.toLowerCase() === "sandbox" ? "scopes.sandbox" : preview.setupScope.complianceAdapter.environment.toLowerCase() === "production" ? "scopes.production" : "scopes.otherEnvironment")}</p><p className="mt-1 text-[var(--dash-text-soft)]">{t("scopes.adapterHint")}</p></> : <p className="text-[var(--dash-warning)]">{t("scopes.unavailable")}</p>}</div> : null}
          </section> : null}
          {preview.issues.length ? <section aria-labelledby="module-conditions"><h3 id="module-conditions" className="mb-2 text-sm font-semibold">{t("conditions")}</h3>{issueList(preview.issues)}</section> : null}
          {preview.requirements.length ? <section aria-labelledby="module-setup-preview"><h3 id="module-setup-preview" className="mb-3 font-semibold">{t("lifecycle.requirementsTitle")}</h3><p className="mb-3 text-sm leading-6 text-[var(--dash-text-soft)]">{t("lifecycle.requirementsHint")}</p>{requirementsPanel(preview.requirements)}</section> : null}
        </> : !resumeAuth && !draftChallenge ? <RouteStatePanel kind="stale_data" title={t("conflict")} message={t("draftHint")} /> : null}
        {needsFreshAuth ? <form onSubmit={event => void verifyAndApply(event)} className="rounded-lg border border-[var(--dash-brand)] p-4"><p className="mb-3 flex items-start gap-2 text-sm"><LockKeyhole className="h-4 w-4 shrink-0" aria-hidden="true" />{t(draftChallenge ? "draftAuth.freshAuth" : resumeAuth ? "lifecycle.freshAuth" : "freshAuth")}</p><label className="text-sm font-semibold" htmlFor="module-step-up-password">{t("password")}</label><Input id="module-step-up-password" autoComplete="current-password" name="password" type="password" required disabled={busy} className="dashboard-control mt-2 h-11" /><Button type="submit" disabled={busy || (!draftChallenge && (resumeAuth ? !data.lifecycle?.canResume : !preview?.canApply || !preview.stopImpact.canStop))} className="dashboard-button-primary mt-3 h-auto min-h-11 w-full whitespace-normal">{busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}{t(pending === "verify" ? "verifying" : pending === "apply" ? "applying" : draftChallenge ? `draftAuth.${draftChallenge.kind}Verify` : resumeAuth ? "lifecycle.verifyResume" : "verify")}</Button></form> : null}
        </div>
        <DialogFooter className={styles.reviewFooter}><Button type="button" variant="outline" className="dashboard-button-secondary h-auto min-h-11 whitespace-normal" disabled={busy} onClick={() => setReviewOpen(false)}>{t(draftChallenge ? "close" : resumeAuth ? "lifecycle.backToPreparation" : "cancel")}</Button>{!needsFreshAuth && draftChallenge ? <Button type="button" disabled={busy} className="dashboard-button-primary h-auto min-h-11 whitespace-normal" onClick={() => void retryDraftChallenge(draftChallenge)}>{t("draftAuth.retry")}</Button> : !needsFreshAuth && preview ? <Button type="button" disabled={busy || !preview.canApply || !preview.stopImpact.canStop} className="dashboard-button-primary h-auto min-h-11 whitespace-normal" onClick={() => void applyReviewed()}>{pending === "apply" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}{t(pending === "apply" ? "applying" : applyFailed ? "retry" : "activate")}</Button> : null}</DialogFooter>
        {busy ? <p role="status" aria-live="polite" className="text-sm text-[var(--dash-text-soft)]">{t(pending === "apply" ? "applying" : pending === "verify" ? "verifying" : "pendingHint")}</p> : null}
      </DialogContent>
    </Dialog>
  </div>
}
