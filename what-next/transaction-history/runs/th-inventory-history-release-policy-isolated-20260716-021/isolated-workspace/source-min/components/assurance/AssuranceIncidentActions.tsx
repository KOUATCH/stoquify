"use client"

import { useRouter } from "next/navigation"
import { CheckCircle2, Clock3, FileCheck2, RotateCcw, ShieldAlert, UserRoundCheck } from "lucide-react"
import type { FormEvent, ReactNode } from "react"
import { useMemo, useState } from "react"

import {
  acknowledgeWorkflowAssuranceIncidentAction,
  approveWorkflowAssuranceWaiverAction,
  assignWorkflowAssuranceIncidentAction,
  reopenWorkflowAssuranceIncidentAction,
  requestWorkflowAssuranceWaiverAction,
  resolveWorkflowAssuranceIncidentAction,
  suppressWorkflowAssuranceIncidentAction,
} from "@/actions/assurance/workflow-assurance-incident.actions"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type {
  AssuranceControlTowerIncident,
  AssuranceIncidentWaiverSummary,
} from "@/services/assurance/assurance-control-tower-contracts"

type Locale = "en" | "fr"
type DialogAction = "assign" | "resolve" | "suppress" | "requestWaiver" | "approveWaiver" | "reopen"

type AssuranceIncidentActionsProps = {
  incident: AssuranceControlTowerIncident
  waivers: AssuranceIncidentWaiverSummary[]
  locale: Locale
}

type AssuranceIncidentAcknowledgeButtonProps = {
  incidentId: string
  status: AssuranceControlTowerIncident["status"]
  locale: Locale
}

const copy = {
  en: {
    panelTitle: "Incident actions",
    panelBody: "Route, resolve, suppress, waive, or reopen this incident without changing assurance enforcement mode.",
    acknowledge: "Acknowledge",
    assign: "Assign",
    resolve: "Resolve",
    suppress: "Suppress",
    requestWaiver: "Request waiver",
    approveWaiver: "Approve waiver",
    reopen: "Reopen",
    ownerId: "Owner user ID",
    assignedRole: "Assigned role",
    dueAt: "Due date",
    note: "Note",
    reason: "Reason",
    suppressedUntil: "Suppress until",
    evidenceHash: "Evidence hash",
    expiresAt: "Expires at",
    waiverId: "Waiver",
    submit: "Apply action",
    cancel: "Cancel",
    manageRequired: "Sensitive transitions require controls.manage and fresh authentication where configured.",
    successTitle: "Incident updated",
    successMessage: "Workflow Assurance has refreshed the incident state.",
    failedTitle: "Incident action failed",
    quickAckSuccess: "Incident acknowledged",
    quickAckMessage: "The incident is marked for follow-up.",
    noRequestedWaiver: "No requested waiver is awaiting approval.",
  },
  fr: {
    panelTitle: "Actions incident",
    panelBody: "Router, resoudre, masquer, deroger ou rouvrir cet incident sans activer le mode bloquant.",
    acknowledge: "Accuser reception",
    assign: "Assigner",
    resolve: "Resoudre",
    suppress: "Masquer",
    requestWaiver: "Demander derogation",
    approveWaiver: "Approuver derogation",
    reopen: "Rouvrir",
    ownerId: "ID utilisateur responsable",
    assignedRole: "Role assigne",
    dueAt: "Echeance",
    note: "Note",
    reason: "Raison",
    suppressedUntil: "Masquer jusqu'a",
    evidenceHash: "Hash de preuve",
    expiresAt: "Expire le",
    waiverId: "Derogation",
    submit: "Appliquer",
    cancel: "Annuler",
    manageRequired: "Les transitions sensibles exigent controls.manage et une authentification recente si configuree.",
    successTitle: "Incident mis a jour",
    successMessage: "L'etat de l'incident Workflow Assurance a ete rafraichi.",
    failedTitle: "Action incident echouee",
    quickAckSuccess: "Incident accuse",
    quickAckMessage: "L'incident est marque pour suivi.",
    noRequestedWaiver: "Aucune derogation demandee n'attend une approbation.",
  },
} as const

const finalStatuses = new Set<AssuranceControlTowerIncident["status"]>(["resolved", "waived", "suppressed", "closed"])

export function AssuranceIncidentAcknowledgeButton({
  incidentId,
  status,
  locale,
}: AssuranceIncidentAcknowledgeButtonProps) {
  const router = useRouter()
  const notifications = useNotifications()
  const t = copy[locale]
  const [isPending, setIsPending] = useState(false)
  const canAcknowledge = status === "open" || status === "reopened"

  if (!canAcknowledge) return null

  async function handleAcknowledge() {
    setIsPending(true)
    try {
      const result = await acknowledgeWorkflowAssuranceIncidentAction({
        incidentId,
        note: "Acknowledged from Workflow Assurance Control Tower.",
      })
      if (!result.success) {
        throw new Error(resultError(result))
      }
      notifications.success(t.quickAckSuccess, t.quickAckMessage, { category: "system" })
      router.refresh()
    } catch (error) {
      notifications.error(t.failedTitle, errorMessage(error), { category: "system", priority: "high" })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="rounded-lg border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-text)] hover:bg-[var(--dash-success-soft)] hover:text-[var(--dash-text)]"
      disabled={isPending}
      onClick={handleAcknowledge}
    >
      <CheckCircle2 className="h-4 w-4 text-[var(--dash-success)]" aria-hidden="true" />
      {t.acknowledge}
    </Button>
  )
}

export function AssuranceIncidentActions({ incident, waivers, locale }: AssuranceIncidentActionsProps) {
  const router = useRouter()
  const notifications = useNotifications()
  const t = copy[locale]
  const requestedWaiver = useMemo(() => waivers.find((waiver) => waiver.status === "requested") ?? null, [waivers])
  const [dialogAction, setDialogAction] = useState<DialogAction | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [note, setNote] = useState("")
  const [ownerId, setOwnerId] = useState(incident.ownerId ?? "")
  const [assignedRole, setAssignedRole] = useState(incident.assignedRole ?? incident.ownerRole)
  const [dueAt, setDueAt] = useState("")
  const [reason, setReason] = useState("")
  const [suppressedUntil, setSuppressedUntil] = useState("")
  const [evidenceHash, setEvidenceHash] = useState(incident.sourceHash)
  const [expiresAt, setExpiresAt] = useState(defaultExpiryLocalDateTime())

  const isFinal = finalStatuses.has(incident.status)
  const canAcknowledge = incident.status === "open" || incident.status === "reopened"
  const canManageActive = incident.canManage && !isFinal
  const canReopen = incident.canManage && isFinal

  async function handleAcknowledge() {
    setIsPending(true)
    try {
      const result = await acknowledgeWorkflowAssuranceIncidentAction({
        incidentId: incident.id,
        note: note.trim() || "Acknowledged from Workflow Assurance incident detail.",
      })
      if (!result.success) throw new Error(resultError(result))
      notifySuccess()
    } catch (error) {
      notifyFailure(error)
    } finally {
      setIsPending(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dialogAction) return

    setIsPending(true)
    try {
      const trimmedNote = note.trim()
      const trimmedReason = reason.trim()

      if (dialogAction === "assign") {
        const result = await assignWorkflowAssuranceIncidentAction({
          incidentId: incident.id,
          ownerId: ownerId.trim(),
          assignedRole: assignedRole.trim() || incident.ownerRole,
          dueAt: toIsoDateTime(dueAt),
        })
        if (!result.success) throw new Error(resultError(result))
      }

      if (dialogAction === "resolve") {
        const result = await resolveWorkflowAssuranceIncidentAction({
          incidentId: incident.id,
          note: trimmedNote || "Resolved from Workflow Assurance Control Tower.",
        })
        if (!result.success) throw new Error(resultError(result))
      }

      if (dialogAction === "suppress") {
        const result = await suppressWorkflowAssuranceIncidentAction({
          incidentId: incident.id,
          reason: trimmedReason,
          suppressedUntil: toIsoDateTime(suppressedUntil),
        })
        if (!result.success) throw new Error(resultError(result))
      }

      if (dialogAction === "requestWaiver") {
        const result = await requestWorkflowAssuranceWaiverAction({
          incidentId: incident.id,
          reason: trimmedReason,
          evidenceHash: evidenceHash.trim(),
          expiresAt: requiredIsoDateTime(expiresAt),
        })
        if (!result.success) throw new Error(resultError(result))
      }

      if (dialogAction === "approveWaiver") {
        if (!requestedWaiver) throw new Error(t.noRequestedWaiver)
        const result = await approveWorkflowAssuranceWaiverAction({
          waiverId: requestedWaiver.id,
          note: trimmedNote || "Approved from Workflow Assurance Control Tower.",
        })
        if (!result.success) throw new Error(resultError(result))
      }

      if (dialogAction === "reopen") {
        const result = await reopenWorkflowAssuranceIncidentAction({
          incidentId: incident.id,
          note: trimmedNote || "Reopened from Workflow Assurance Control Tower.",
        })
        if (!result.success) throw new Error(resultError(result))
      }

      setDialogAction(null)
      notifySuccess()
    } catch (error) {
      notifyFailure(error)
    } finally {
      setIsPending(false)
    }
  }

  function notifySuccess() {
    notifications.success(t.successTitle, t.successMessage, { category: "system" })
    router.refresh()
  }

  function notifyFailure(error: unknown) {
    notifications.error(t.failedTitle, errorMessage(error), { category: "system", priority: "high" })
  }

  return (
    <section className={cn(dashboardPanelClass, "p-4")}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--dash-text)]">{t.panelTitle}</h2>
          <p className={cn("mt-1 text-xs leading-5", dashboardMutedTextClass)}>{t.panelBody}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {canAcknowledge ? (
          <Button
            type="button"
            variant="outline"
            className="justify-start rounded-lg border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-text)] hover:bg-[var(--dash-success-soft)]"
            disabled={isPending}
            onClick={handleAcknowledge}
          >
            <CheckCircle2 className="h-4 w-4 text-[var(--dash-success)]" aria-hidden="true" />
            {t.acknowledge}
          </Button>
        ) : null}

        <ActionButton label={t.assign} icon={<UserRoundCheck className="h-4 w-4" />} disabled={!canManageActive || isPending} onClick={() => setDialogAction("assign")} />
        <ActionButton label={t.resolve} icon={<FileCheck2 className="h-4 w-4" />} disabled={!canManageActive || isPending} onClick={() => setDialogAction("resolve")} tone="success" />
        <ActionButton label={t.suppress} icon={<Clock3 className="h-4 w-4" />} disabled={!canManageActive || isPending} onClick={() => setDialogAction("suppress")} tone="gold" />
        <ActionButton label={t.requestWaiver} icon={<ShieldAlert className="h-4 w-4" />} disabled={!canManageActive || isPending} onClick={() => setDialogAction("requestWaiver")} tone="danger" />
        <ActionButton
          label={t.approveWaiver}
          icon={<ShieldAlert className="h-4 w-4" />}
          disabled={!incident.canManage || !requestedWaiver || isPending}
          onClick={() => setDialogAction("approveWaiver")}
          tone="brand"
        />
        <ActionButton label={t.reopen} icon={<RotateCcw className="h-4 w-4" />} disabled={!canReopen || isPending} onClick={() => setDialogAction("reopen")} tone="info" />
      </div>

      {!incident.canManage ? (
        <div className={cn(dashboardRowClass, "mt-4 p-3 text-xs leading-5 text-[var(--dash-text-soft)]")}>
          {t.manageRequired}
        </div>
      ) : null}

      <Dialog open={dialogAction !== null} onOpenChange={(open) => !open && setDialogAction(null)}>
        <DialogContent className="dashboard-glass-panel max-h-[92vh] overflow-y-auto rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-[var(--dash-text)]">{dialogTitle(dialogAction, t)}</DialogTitle>
              <DialogDescription className="text-[var(--dash-text-soft)]">{t.manageRequired}</DialogDescription>
            </DialogHeader>

            <div className="mt-4 grid gap-4">
              {dialogAction === "assign" ? (
                <>
                  <Field label={t.ownerId}>
                    <Input className={fieldClassName} value={ownerId} onChange={(event) => setOwnerId(event.target.value)} required />
                  </Field>
                  <Field label={t.assignedRole}>
                    <Input className={fieldClassName} value={assignedRole} onChange={(event) => setAssignedRole(event.target.value)} />
                  </Field>
                  <Field label={t.dueAt}>
                    <Input className={fieldClassName} type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
                  </Field>
                </>
              ) : null}

              {dialogAction === "resolve" || dialogAction === "approveWaiver" || dialogAction === "reopen" ? (
                <Field label={t.note}>
                  <Textarea className={fieldClassName} value={note} onChange={(event) => setNote(event.target.value)} />
                </Field>
              ) : null}

              {dialogAction === "suppress" || dialogAction === "requestWaiver" ? (
                <Field label={t.reason}>
                  <Textarea className={fieldClassName} value={reason} onChange={(event) => setReason(event.target.value)} minLength={8} required />
                </Field>
              ) : null}

              {dialogAction === "suppress" ? (
                <Field label={t.suppressedUntil}>
                  <Input
                    className={fieldClassName}
                    type="datetime-local"
                    value={suppressedUntil}
                    onChange={(event) => setSuppressedUntil(event.target.value)}
                  />
                </Field>
              ) : null}

              {dialogAction === "requestWaiver" ? (
                <>
                  <Field label={t.evidenceHash}>
                    <Input className={fieldClassName} value={evidenceHash} onChange={(event) => setEvidenceHash(event.target.value)} minLength={12} required />
                  </Field>
                  <Field label={t.expiresAt}>
                    <Input className={fieldClassName} type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} required />
                  </Field>
                </>
              ) : null}

              {dialogAction === "approveWaiver" ? (
                <div className={cn(dashboardRowClass, "p-3 text-sm")}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--dash-text-soft)]">{t.waiverId}</span>
                    <Badge className={cn("border", dashboardToneClass(requestedWaiver ? "gold" : "muted"))}>
                      {requestedWaiver?.id ?? t.noRequestedWaiver}
                    </Badge>
                  </div>
                </div>
              ) : null}
            </div>

            <DialogFooter className="mt-5 gap-2">
              <Button type="button" variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]" onClick={() => setDialogAction(null)}>
                {t.cancel}
              </Button>
              <Button type="submit" className="rounded-lg bg-[var(--dash-brand)] text-white hover:bg-[var(--dash-brand-strong)]" disabled={isPending}>
                {t.submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function ActionButton({
  label,
  icon,
  disabled,
  onClick,
  tone = "brand",
}: {
  label: string
  icon: ReactNode
  disabled: boolean
  onClick: () => void
  tone?: "brand" | "success" | "gold" | "danger" | "info"
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn("justify-start rounded-lg border", dashboardToneClass(tone))}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-semibold uppercase tracking-normal text-[var(--dash-text-faint)]">{label}</Label>
      {children}
    </div>
  )
}

function dialogTitle(action: DialogAction | null, labels: (typeof copy)[Locale]) {
  if (action === "assign") return labels.assign
  if (action === "resolve") return labels.resolve
  if (action === "suppress") return labels.suppress
  if (action === "requestWaiver") return labels.requestWaiver
  if (action === "approveWaiver") return labels.approveWaiver
  if (action === "reopen") return labels.reopen
  return labels.panelTitle
}

function toIsoDateTime(value: string) {
  if (!value) return undefined
  return requiredIsoDateTime(value)
}

function requiredIsoDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error("Enter a valid date.")
  return date.toISOString()
}

function defaultExpiryLocalDateTime() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  date.setMinutes(0, 0, 0)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function resultError(result: { error?: unknown }) {
  const error = result.error
  if (typeof error === "string") return error
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message
  return "The incident action could not be completed."
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The incident action could not be completed."
}

const fieldClassName =
  "border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.38)] text-[var(--dash-text)] placeholder:text-[var(--dash-text-faint)] focus-visible:ring-[var(--dash-brand)]"
