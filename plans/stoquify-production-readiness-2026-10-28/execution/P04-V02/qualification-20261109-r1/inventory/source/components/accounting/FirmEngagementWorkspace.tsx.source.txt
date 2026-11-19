"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { getFirmEngagementWorkspaceAction, executeFirmEngagementCommandAction, getFirmHandoverSummaryAction } from "@/actions/accounting/firm-engagement.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import type { FirmEngagementWorkspace as Workspace } from "@/services/accounting/firm-engagement-workspace.service"
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog"
import { firmEngagementCopy } from "./firm-engagement-copy"

const button = "dashboard-button-secondary min-h-11 rounded-lg px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
const control = "dashboard-control mt-1 min-h-11 w-full min-w-0 rounded-lg px-3 [color-scheme:dark]"
const panel = "dashboard-glass-panel min-w-0 space-y-4 rounded-lg p-5"
type Command = Record<string, unknown> & { command: string; idempotencyKey: string }
export function FirmEngagementWorkspace({ locale = "en" }: { locale?: "en" | "fr" }) {
  const t = firmEngagementCopy[locale]
  const [data, setData] = useState<Workspace | null>(null)
  const [query, setQuery] = useState<{ after?: string; engagementId?: string }>({})
  const [busy, setBusy] = useState(false), [error, setError] = useState(false), [message, setMessage] = useState("")
  const [command, setCommand] = useState<Command | null>(null), [fresh, setFresh] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [work, setWork] = useState<{ awaitingClient: number; awaitingReviewTeam: number; partial: boolean } | null>(null)
  const [workDenied, setWorkDenied] = useState(false)
  const [incomingId, setIncomingId] = useState("")
  const sequence = useRef(0), heading = useRef<HTMLHeadingElement>(null), origin = useRef<HTMLElement | null>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const mutating = useRef(false), commandOpen = useRef(false)
  const label = (key: string) => (t.statuses as Record<string, string>)[key] ?? key
  async function load(next = query) {
    const revision = ++sequence.current
    setData(null); setWork(null); setWorkDenied(false); setError(false); setBusy(true)
    try {
      const result = await getFirmEngagementWorkspaceAction(next)
      if (revision !== sequence.current) return
      if (result.success) setData(result.data)
      else setError(true)
    } catch { if (revision === sequence.current) setError(true) }
    finally { if (revision === sequence.current) { setBusy(false); if (!commandOpen.current) heading.current?.focus() } }
  }
  useEffect(() => {
    void load(query)
    const changed = () => {
      ++sequence.current; setData(null); setWork(null)
      if (!document.hidden && !mutating.current) void load(query)
    }
    const timer = window.setInterval(() => { if (!document.hidden && !mutating.current && !commandOpen.current) void load(query) }, 60000)
    document.addEventListener("visibilitychange", changed)
    window.addEventListener("pageshow", changed)
    return () => { ++sequence.current; clearInterval(timer); document.removeEventListener("visibilitychange", changed); window.removeEventListener("pageshow", changed) }
    // Query changes deliberately discard private workspace state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.after, query.engagementId])
  function clearCommand() { commandOpen.current = false; setCommand(null) }
  function prepare(payload: Record<string, unknown> & { command: string }) {
    origin.current = document.activeElement as HTMLElement
    commandOpen.current = true
    setMessage(""); setFresh(false); setUncertain(false); setCommand({ ...payload, idempotencyKey: crypto.randomUUID() })
  }
  async function submit() {
    if (!command || mutating.current) return
    mutating.current = true; setBusy(true); setMessage("")
    try {
      const result = await executeFirmEngagementCommandAction(command)
      if (result.success) {
        clearCommand(); setFresh(false); setMessage(t.saved)
        const next = { ...query, engagementId: result.data.engagementId }
        setQuery(next); if (!document.hidden) await load(next)
      } else if (result.code === "FRESH_AUTH_REQUIRED") { setFresh(true); setMessage(t.fresh) }
      else if (result.retryable || result.code === "INTERNAL_ERROR") { setUncertain(true); setMessage(t.uncertain) }
      else { setMessage(t.rejected); clearCommand(); await load() }
    } catch { setUncertain(true); setMessage(t.uncertain) }
    finally { mutating.current = false; setBusy(false) }
  }
  function dates(form: FormData) {
    return { scope: String(form.get("scope")), effectiveFrom: new Date(String(form.get("effectiveFrom"))).toISOString(),
      expiresAt: new Date(String(form.get("expiresAt"))).toISOString() }
  }
  const selected = data?.selected
  const terms = (prefix: string, required = true) => <>
    <label className="text-sm">{t.scope}<select name="scope" className={control} defaultValue={selected?.scope ?? "READ_ONLY"}>
      {Object.entries(t.roles).map(([v, text]) => <option key={v} value={v}>{text}</option>)}</select></label>
    <label className="text-sm">{t.start}<input name="effectiveFrom" aria-label={`${t.start} (${prefix})`} type="datetime-local" className={control} required={required} /></label>
    <label className="text-sm">{t.end}<input name="expiresAt" aria-label={`${t.end} (${prefix})`} type="datetime-local" className={control} required={required} /></label>
  </>
  return <section id="firm-engagement-workspace" aria-labelledby="firm-engagement-heading" aria-busy={busy} className="min-w-0 space-y-6">
    <div className={panel}>
      <h2 id="firm-engagement-heading" ref={heading} tabIndex={-1} className="text-xl font-semibold">{t.title}</h2>
      <p>{t.intro}</p><p className="text-sm text-[var(--dash-text-soft)]">{t.boundary}</p>
      {data && <p className="text-sm">{locale === "fr" ? "Vérifié" : "Checked"}: <time dateTime={data.asOf}>{new Date(data.asOf).toLocaleString(locale)}</time></p>}
      <button className={button} onClick={() => void load()} disabled={busy || !!command}>{t.refresh}</button>
      {busy && <p role="status">{t.loading}</p>}
      {message && !command && <p role="status">{message}</p>}
      {error && <div role="alert"><p>{t.unavailable}</p><button className={button} onClick={() => void load()}>{t.retry}</button></div>}
    </div>
    {data && <>
      {data.partial && <p role="status">{t.partial}</p>}
      <div className={panel}>
        <h3 className="font-semibold">{t.title}</h3>
        {!data.engagements.length && <p>{t.empty}</p>}
        <ul className="space-y-2">{data.engagements.map(e => <li key={e.id}>
          <button className={`${button} w-full text-left`} onClick={() => setQuery({ ...query, engagementId: e.id })}>
            {e.clientName} — {label(e.status)}</button></li>)}</ul>
        <div className="flex flex-wrap gap-2">{query.after && <button className={button} onClick={() => setQuery({})}>{t.first}</button>}
          {data.next && <button className={button} onClick={() => setQuery({ after: data.next! })}>{t.next}</button>}</div>
      </div>
      <form className={panel} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); prepare({ command: "CREATE",
        clientOrganizationId: String(f.get("client")), ownerUserId: String(f.get("owner")), ...dates(f) }) }}>
        <h3 className="font-semibold">{t.setup}</h3>
        {!data.clients.length ? <p>{t.noClients}</p> : <fieldset disabled={busy || !!command} className="grid min-w-0 gap-4 md:grid-cols-2">
          <label className="text-sm">{t.client}<select name="client" required className={control} defaultValue="">
            <option value="">{t.select}</option>{data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="text-sm">{t.owner}<select name="owner" required className={control} defaultValue={data.actorId}>
            {data.members.filter(m => m.usable).map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}</select></label>
          {terms(t.setup)}<button className={button}>{t.create}</button>
        </fieldset>}
      </form>
      {selected && <div className={panel}>
        <h3 className="text-lg font-semibold">{t.detail}: {selected.clientName} — {label(selected.status)}</h3>
        <p>{t.start}: {new Date(selected.effectiveFrom).toLocaleString(locale)} · {t.end}: {new Date(selected.expiresAt).toLocaleString(locale)}</p>
        <h4 className="font-semibold">{t.members}</h4><p className="text-sm">{t.accessNote}</p>
        <ul className="grid min-w-0 gap-3 md:grid-cols-2">{data.members.map(m => <li key={m.id} className="min-w-0 rounded-lg border border-[var(--dash-border)] p-3">
          <p className="break-words font-medium">{m.name || m.email}</p><p className="break-all text-sm">{m.email}</p>
          <p>{label(m.state)}</p>
          <p>{t.clientView}: {label(m.consentState)}{m.consentExpiresAt && ` · ${t.expiry}: ${new Date(m.consentExpiresAt).toLocaleString(locale)}`}</p>
          {m.assignment && <p>{t.scope}: {t.roles[m.assignment.scope]} · {t.expiry}: {new Date(m.assignment.expiresAt).toLocaleString(locale)}</p>}
          {m.grant?.linkedElsewhere && <p>{t.lockedElsewhere}</p>}
          {!m.grant && <p className="text-sm">{t.requestHelp}</p>}
          {selected.status !== "ENDED" && m.assignment && m.grant && !m.grant.enrolled && !m.grant.linkedElsewhere &&
            <button className={button} disabled={busy || !!command} onClick={() => prepare({ command: "ENROLL", engagementId: selected.id, expectedVersion: selected.version, grantId: m.grant!.id })}>{t.enroll}: {m.name || m.email}</button>}
        </li>)}</ul>
        {selected.status !== "ENDED" && <>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={e => {
            e.preventDefault(); const f = new FormData(e.currentTarget), member = data.members.find(m => m.id === f.get("member"))!
            prepare({ command: "ASSIGN", engagementId: selected.id, expectedVersion: selected.version,
              accountantUserId: member.id, expectedAssignmentVersion: member.lastAssignmentVersion, ...dates(f) })
          }}>
            <h4 className="font-semibold md:col-span-2">{t.assign}</h4>
            <label>{t.person}<select name="member" required className={control} defaultValue=""><option value="">{t.select}</option>
              {data.members.filter(m => m.usable && m.grant && !m.assignment && !m.grant.linkedElsewhere).map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}</select></label>
            {terms(t.assign)}<button className={button} disabled={busy || !!command}>{t.assign}</button>
          </form>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={e => {
            e.preventDefault(); const f = new FormData(e.currentTarget), old = data.members.find(m => m.id === f.get("outgoing"))!
            const incoming = data.members.find(m => m.id === f.get("incoming"))
            prepare({ command: incoming ? "HANDOVER" : "REMOVE_ASSIGNMENT", engagementId: selected.id, expectedVersion: selected.version,
              assignmentId: old.assignment!.id, expectedAssignmentVersion: old.assignment!.version, reason: String(f.get("reason")),
              ...(incoming ? { accountantUserId: incoming.id, expectedNewAssignmentVersion: incoming.lastAssignmentVersion, ...dates(f) } : {}) })
          }}>
            <h4 className="font-semibold md:col-span-2">{t.handover}</h4>
            <label>{t.outgoing}<select name="outgoing" className={control} required defaultValue=""><option value="">{t.select}</option>
              {data.members.filter(m => m.assignment).map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}</select></label>
            <label>{t.incoming}<select name="incoming" className={control} value={incomingId} onChange={e => setIncomingId(e.target.value)}><option value="">{t.remove}</option>
              {data.members.filter(m => m.usable && m.grant && !m.assignment && !m.grant.linkedElsewhere).map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}</select></label>
            {terms(t.handover, !!incomingId)}
            <label className="md:col-span-2">{t.reason}<textarea name="reason" minLength={10} maxLength={500} required className={control} /></label>
            <button className={button} disabled={busy || !!command}>{t.handover} / {t.remove}</button>
          </form>
          <form className="space-y-3" onSubmit={e => {
            e.preventDefault(); const f = new FormData(e.currentTarget)
            prepare({ command: "TRANSITION", engagementId: selected.id, expectedVersion: selected.version, status: f.get("status"), reason: f.get("reason") })
          }}>
            <label>{t.detail}<select name="status" className={control}>
              {selected.status !== "ACTIVE" && <option value="ACTIVE">{t.activate}</option>}
              {selected.status === "ACTIVE" && <option value="SUSPENDED">{t.suspend}</option>}
              <option value="ENDED">{t.finish}</option></select></label>
            <label className="block">{t.reason}<textarea name="reason" required minLength={10} maxLength={500} className={control} /></label>
            <button className={button} disabled={busy || !!command}>{t.confirm}</button>
          </form>
        </>}
        <div className="space-y-2"><h4 className="font-semibold">{t.summary}</h4>
          <button className={button} disabled={busy} onClick={async () => {
            const revision = sequence.current; setWork(null); setWorkDenied(false)
            try { const r = await getFirmHandoverSummaryAction({ clientOrganizationId: selected.clientId })
              if (revision === sequence.current) { if (r.success) setWork(r.data); else setWorkDenied(true) }
            } catch { if (revision === sequence.current) setWorkDenied(true) }
          }}>{t.preview}</button>
          {workDenied && <p role="status">{t.summaryDenied}</p>}
          {work && <p role="status">{t.clientWork}: {work.awaitingClient} · {t.teamWork}: {work.awaitingReviewTeam}{work.partial && ` — ${t.workPartial}`}</p>}
          <Link className={`${button} inline-flex`} href={`/${locale}/dashboard/accounting/accountant-portfolio`}>{t.work}</Link>
        </div>
        <h4 className="font-semibold">{t.retained}</h4>
        {!selected.history.length && !selected.endedAssignments.length && <p>{t.none}</p>}
        <ul>{selected.history.map(h => <li key={h.version} className="break-words">{h.version}. {label(h.from)} → {label(h.to)} · {h.actorId} · {h.reason}</li>)}
          {selected.endedAssignments.map(a => <li key={a.id} className="break-words">{a.userId} · {a.endedById} · {new Date(a.endedAt).toLocaleString(locale)} · {a.reason}</li>)}</ul>
      </div>}
    </>}
    <AlertDialog open={!!command} onOpenChange={open => { if (!open && !busy && !uncertain) clearCommand() }}>
      <AlertDialogContent className="dashboard-landing-theme dark max-h-[90vh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-lg" onOpenAutoFocus={e => { e.preventDefault(); cancel.current?.focus() }} onCloseAutoFocus={e => { e.preventDefault(); origin.current?.isConnected ? origin.current.focus() : heading.current?.focus() }}>
        <AlertDialogTitle>{t.confirm}</AlertDialogTitle><AlertDialogDescription className="text-[var(--dash-text)]">{t.consequence}</AlertDialogDescription>
        {command && <p className="break-words font-medium">
          {({ CREATE: t.create, ASSIGN: t.assign, HANDOVER: t.handover, REMOVE_ASSIGNMENT: t.remove, ENROLL: t.enroll,
            TRANSITION: command.status === "ACTIVE" ? t.activate : command.status === "SUSPENDED" ? t.suspend : t.finish } as Record<string, string>)[command.command]}
          {" · "}{selected?.clientName ?? data?.clients.find(c => c.id === command.clientOrganizationId)?.name}
          {command.accountantUserId ? ` · ${data?.members.find(m => m.id === command.accountantUserId)?.name ?? ""}` : ""}
        </p>}
        {message && <p role="status">{message}</p>}
        {fresh && <form onSubmit={async e => {
          e.preventDefault(); const form = e.currentTarget, password = String(new FormData(form).get("password")); form.reset()
          setBusy(true)
          try { const r = await stepUpWithPasswordAction({ password }); if (r.success) { setFresh(false); setMessage("") } else setMessage(t.identityFailed) }
          catch { setMessage(t.identityFailed) } finally { setBusy(false) }
        }}><label>{t.password}<input name="password" type="password" autoComplete="current-password" required className={control} /></label>
          <button className={button} disabled={busy}>{t.verify}</button></form>}
        <div className="flex flex-wrap gap-2"><button className={button} disabled={busy || fresh} onClick={() => void submit()}>{t.confirmButton}</button>
          <button ref={cancel} className={button} disabled={busy || uncertain} onClick={() => clearCommand()}>{t.cancel}</button></div>
      </AlertDialogContent>
    </AlertDialog>
  </section>
}
