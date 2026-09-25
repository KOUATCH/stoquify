"use client"
import { useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { authClient, useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SelfProfileError, useSelfProfile } from "@/hooks/useSelfProfile"
import { readSelfProfileDraft, saveSelfProfileDraft } from "@/hooks/self-profile-draft"
import { selfProfileFields, type SelfProfileCommand, type SelfProfileFields, type SelfProfileReceipt } from "@/services/users/self-profile-input"

export const selfProfileCopy = {
  en: { title: "My profile", intro: "Manage the name and job title shown with your account. These details do not change your permissions or verified identity.", firstName: "Given or display name", lastName: "Family name (optional)", jobTitle: "Job title (optional)", save: "Save profile", busy: "Saving profile…", loading: "Loading your current profile…", failed: "Your profile could not be loaded. Saved details have not been replaced with empty values.", reload: "Reload current account record", denied: "Your current permission allows viewing this profile only.", noAccess: "Your current session or permissions do not allow access. Sign in again or ask your administrator.", saved: "Profile saved", unchanged: "The saved profile already matched these details", recovered: "The original save result was recovered", refreshFailed: "Your profile is saved, but the account display could not be refreshed. Reload the page to update its name.", invalid: "Enter a given or display name. Each field allows up to 100 characters of plain text.", uncertain: "The save result is not confirmed. Recover the same request before making another change.", retry: "Recover the same profile save", storage: "Draft storage is unavailable. Allow site storage before saving so an interrupted request can be recovered.", restored: "Your draft was restored from this tab. Review it before saving.", changed: "The account record changed since this draft began. Compare the saved values with your edits before choosing how to continue.", currentValues: "Current saved values", keepEdits: "Use my edits with this reviewed version", useSaved: "Use the current saved values", originalResult: "This receipt records the earlier save. The current profile can contain later changes.", account: "Account details", email: "Sign-in email", verified: "Email verified", unverified: "Email not verified", phone: "Recorded phone", notRecorded: "Not recorded", identityBoundary: "Email, phone ownership, password, access rights and avatar uploads are managed separately. This form changes only your displayed name and job title.", history: "Recent profile saves", historyHint: "The latest 10 saves from this workflow. Names describe the account; stable account IDs identify recorded actions.", noHistory: "No profile saves recorded by this workflow yet.", checked: "Account record checked", identityChanged: "Your signed-in account changed. Refresh this page before viewing or editing this profile.", staleReceipt: "The request identity conflicts with a retained result. Reload the current record and review your draft.", draftPrivacy: "Unsaved names and job title stay in this browser tab for up to 24 hours. A saved result clears its local draft." },
  fr: { title: "Mon profil", intro: "Gérez le nom et le poste affichés avec votre compte. Ces informations ne modifient ni vos droits ni votre identité vérifiée.", firstName: "Prénom ou nom d’affichage", lastName: "Nom de famille (facultatif)", jobTitle: "Poste (facultatif)", save: "Enregistrer le profil", busy: "Enregistrement du profil…", loading: "Chargement de votre profil actuel…", failed: "Votre profil n’a pas pu être chargé. Les données enregistrées n’ont pas été remplacées par des valeurs vides.", reload: "Recharger la fiche du compte", denied: "Vos droits actuels permettent uniquement de consulter ce profil.", noAccess: "Votre session ou vos droits actuels ne permettent pas cet accès. Reconnectez-vous ou contactez votre administrateur.", saved: "Profil enregistré", unchanged: "Le profil enregistré correspondait déjà à ces informations", recovered: "Le résultat de l’enregistrement initial a été retrouvé", refreshFailed: "Votre profil est enregistré, mais l’affichage du compte n’a pas pu être actualisé. Rechargez la page pour mettre son nom à jour.", invalid: "Saisissez un prénom ou un nom d’affichage. Chaque champ accepte au maximum 100 caractères de texte simple.", uncertain: "Le résultat n’est pas confirmé. Retrouvez la même demande avant d’effectuer une autre modification.", retry: "Retrouver le même enregistrement", storage: "Le stockage du brouillon est indisponible. Autorisez le stockage du site avant d’enregistrer pour pouvoir reprendre une demande interrompue.", restored: "Votre brouillon a été restauré depuis cet onglet. Vérifiez-le avant de l’enregistrer.", changed: "La fiche du compte a changé depuis le début du brouillon. Comparez les valeurs enregistrées à vos modifications avant de continuer.", currentValues: "Valeurs actuellement enregistrées", keepEdits: "Utiliser mes modifications avec cette version vérifiée", useSaved: "Utiliser les valeurs actuellement enregistrées", originalResult: "Ce justificatif décrit l’enregistrement initial. Le profil actuel peut contenir des modifications ultérieures.", account: "Informations du compte", email: "Adresse de connexion", verified: "Adresse électronique vérifiée", unverified: "Adresse électronique non vérifiée", phone: "Téléphone enregistré", notRecorded: "Non renseigné", identityBoundary: "L’adresse électronique, la vérification du téléphone, le mot de passe, les droits et les avatars sont gérés séparément. Ce formulaire modifie uniquement votre nom d’affichage et votre poste.", history: "Enregistrements récents du profil", historyHint: "Les 10 derniers enregistrements de ce parcours. Les noms décrivent le compte ; les identifiants stables identifient les actions enregistrées.", noHistory: "Aucun profil enregistré par ce parcours pour le moment.", checked: "Fiche du compte vérifiée le", identityChanged: "Votre compte connecté a changé. Actualisez cette page avant de consulter ou modifier ce profil.", staleReceipt: "L’identifiant de la demande est en conflit avec un résultat conservé. Rechargez la fiche actuelle et vérifiez votre brouillon.", draftPrivacy: "Les noms et le poste non enregistrés restent dans cet onglet pendant 24 heures au maximum. Un résultat enregistré efface son brouillon local." },
} as const
type Props = { organizationId: string; actorId: string; locale: "en" | "fr" }
type Draft = { expectedHash: string; fields: SelfProfileFields }
export default function SelfProfile(props: Props) {
  const session = useSession(), t = selfProfileCopy[props.locale]
  if (session.isPending) return <p role="status">{t.loading}</p>
  if (session.data?.user?.id !== props.actorId) return <p role="alert">{t.identityChanged}</p>
  return <SelfProfileForActor key={`${props.organizationId}:${props.actorId}`} {...props} />
}
function SelfProfileForActor({ organizationId, actorId, locale }: Props) {
  const t = selfProfileCopy[locale], id = useId(), router = useRouter(), { query, mutation } = useSelfProfile(organizationId, actorId)
  const [draft, setDraft] = useState<Draft | null>(null), [pending, setPending] = useState<SelfProfileCommand | null>(null), [receipt, setReceipt] = useState<(SelfProfileReceipt & { replayed: boolean }) | null>(null)
  const [busy, setBusy] = useState(false), [code, setCode] = useState<string | null>(null), [restored, setRestored] = useState(false), [storageFailed, setStorageFailed] = useState(false), [displayFailed, setDisplayFailed] = useState(false)
  const hydrated = useRef(false), lock = useRef(false), message = useRef<HTMLParagraphElement>(null)
  const current = query.data && !query.isError ? query.data : null
  useEffect(() => {
    if (!current || hydrated.current) return
    hydrated.current = true
    try {
      const saved = readSelfProfileDraft(sessionStorage, organizationId, actorId)
      if (saved) { setDraft({ fields: saved.fields, expectedHash: saved.expectedHash }); setPending(saved.pending); setRestored(true); if (saved.pending) setCode("UNCERTAIN") }
      else setDraft({ fields: current.fields, expectedHash: current.snapshotHash })
    } catch { setStorageFailed(true); setDraft({ fields: current.fields, expectedHash: current.snapshotHash }) }
  }, [current, organizationId, actorId])
  const retain = (value: Draft | null, command: SelfProfileCommand | null) => {
    try { saveSelfProfileDraft(sessionStorage, organizationId, actorId, value ? { ...value, pending: command } : null); setStorageFailed(false); return true }
    catch { setStorageFailed(true); return false }
  }
  const dirty = Boolean(draft && current && JSON.stringify(draft.fields) !== JSON.stringify(current.fields))
  const stale = Boolean(draft && current && draft.expectedHash !== current.snapshotHash)
  const deniedCode = ["FORBIDDEN", "AUTH_REQUIRED", "UNAUTHENTICATED"].includes(code ?? "")
  const unknown = Boolean(pending && !deniedCode && !["VALIDATION_ERROR", "CONFLICT", "IDEMPOTENCY_CONFLICT"].includes(code ?? ""))
  const edit = (field: keyof SelfProfileFields, value: string) => {
    if (!draft || pending || busy) return
    const next = { ...draft, fields: { ...draft.fields, [field]: value } }; setDraft(next); setReceipt(null); setCode(null); setDisplayFailed(false); retain(next, null)
  }
  const reload = async () => {
    if (busy) return
    const result = await query.refetch()
    if (result.data?.canUpdate && !result.isError && deniedCode) setCode(pending ? "UNCERTAIN" : null)
    if (result.data && !result.isError && !draft) setDraft({ fields: result.data.fields, expectedHash: result.data.snapshotHash })
    if (draft) retain(draft, pending)
  }
  const choose = (keep: boolean) => {
    if (!current || !draft || busy || pending) return
    const next = { fields: keep ? draft.fields : current.fields, expectedHash: current.snapshotHash }; setDraft(next); setCode(null); setRestored(false); setReceipt(null); retain(keep ? next : null, null)
  }
  const submit = async () => {
    if (lock.current || !draft || !current?.canUpdate || (!pending && (stale || query.isFetching || !dirty))) return
    const fields = selfProfileFields.safeParse(draft.fields)
    if (!fields.success && !pending) { setCode("VALIDATION_ERROR"); message.current?.focus(); return }
    const command = pending ?? { requestId: crypto.randomUUID(), expectedHash: draft.expectedHash, fields: fields.data! }
    if (!retain(draft, command)) return
    lock.current = true; setBusy(true); setPending(command); setReceipt(null); setCode(null); setDisplayFailed(false)
    try {
      const result = await mutation.mutateAsync(command)
      setReceipt(result); setPending(null); setRestored(false); setDraft(null); retain(null, null)
      const fresh = await query.refetch()
      if (fresh.data && !fresh.isError) setDraft({ fields: fresh.data.fields, expectedHash: fresh.data.snapshotHash })
      try {
        const session = await authClient.getSession({ query: { disableCookieCache: true } })
        if (session.error || session.data?.user?.id !== actorId) throw new Error("Account display refresh unavailable")
        authClient.$store.notify("$sessionSignal")
        router.refresh()
      } catch { setDisplayFailed(true) }
    } catch (error) {
      const value = error instanceof SelfProfileError ? error.code : "UNCERTAIN"; setCode(value)
      if (["CONFLICT", "VALIDATION_ERROR", "IDEMPOTENCY_CONFLICT"].includes(value)) { setPending(null); retain(draft, null); if (value === "CONFLICT") void query.refetch() }
    } finally { lock.current = false; setBusy(false); requestAnimationFrame(() => message.current?.focus()) }
  }
  const failure = code === "VALIDATION_ERROR" ? t.invalid : code === "CONFLICT" ? t.changed : code === "IDEMPOTENCY_CONFLICT" ? t.staleReceipt : deniedCode ? t.noAccess : t.uncertain
  const fieldValidation = code === "VALIDATION_ERROR" && draft ? selfProfileFields.safeParse(draft.fields) : null
  const invalidFields = new Set(fieldValidation && !fieldValidation.success ? fieldValidation.error.issues.map(issue => issue.path[0]) : [])
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-semibold sm:text-3xl">{t.title}</h1><p className="mt-2 max-w-3xl text-sm text-[var(--dash-text-soft)]">{t.intro}</p></header>
    {(code || receipt) && <p ref={message} tabIndex={-1} role={code ? "alert" : "status"} className={`rounded-lg border p-4 text-sm focus-visible:outline focus-visible:outline-2 ${code ? "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)]" : "border-[var(--dash-success)] bg-[var(--dash-success-soft)]"}`}>{code ? failure : `${receipt!.replayed ? t.recovered : receipt!.changedFields.length ? t.saved : t.unchanged}. ${new Date(receipt!.savedAt).toLocaleString(locale)}`}{receipt && <span className="mt-2 block">{t.originalResult}<span className="mt-1 block break-all text-xs">{receipt.id}</span></span>}</p>}
    {displayFailed && <p role="alert" className="text-sm">{t.refreshFailed}</p>}
    {storageFailed && <p role="alert" className="text-sm">{t.storage}</p>}
    {restored && <p role="status" className="text-sm">{t.restored}</p>}
    {!current ? <div className="space-y-3"><p role={query.isError ? "alert" : "status"}>{query.isError ? query.error instanceof SelfProfileError && ["FORBIDDEN", "AUTH_REQUIRED", "UNAUTHENTICATED"].includes(query.error.code) ? t.noAccess : t.failed : t.loading}</p>{query.isError && <Button type="button" variant="outline" onClick={reload} disabled={query.isFetching || busy} className="dashboard-button-secondary h-auto whitespace-normal">{t.reload}</Button>}</div> : <>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <form method="post" onSubmit={event => { event.preventDefault(); void submit() }} className="space-y-4 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-4 sm:p-6">
          <p className="text-xs text-[var(--dash-text-soft)]">{t.checked}: {new Date(current.checkedAt).toLocaleString(locale)}</p>
          {!current.canUpdate && <p role="status" className="text-sm">{t.denied}</p>}
          {draft && (["firstName", "lastName", "jobTitle"] as const).map(field => <div key={field} className="space-y-2"><Label htmlFor={`${id}-${field}`}>{t[field]}</Label><Input id={`${id}-${field}`} name={field} autoComplete={field === "firstName" ? "given-name" : field === "lastName" ? "family-name" : "organization-title"} maxLength={100} value={draft.fields[field]} readOnly={!current.canUpdate || Boolean(pending) || busy} aria-invalid={invalidFields.has(field) || undefined} aria-describedby={invalidFields.has(field) ? `${id}-${field}-error` : undefined} onChange={event => edit(field, event.target.value)} className="dashboard-control" />{invalidFields.has(field) && <p id={`${id}-${field}-error`} className="text-sm">{field === "firstName" && !draft.fields.firstName.trim() ? locale === "fr" ? "Saisissez un prénom ou un nom d’affichage." : "Enter a given or display name." : locale === "fr" ? "Utilisez au maximum 100 caractères de texte simple, sans caractères de contrôle." : "Use up to 100 plain text characters, without control characters."}</p>}</div>)}
          {stale && !pending && draft && <div className="space-y-3 rounded-lg border border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] p-3 text-sm"><p>{t.changed}</p><h2 className="font-semibold">{t.currentValues}</h2><dl className="space-y-2">{(["firstName", "lastName", "jobTitle"] as const).map(field => <div key={field}><dt className="text-xs">{t[field]}</dt><dd className="break-words">{current.fields[field] || t.notRecorded}</dd></div>)}</dl>{current.canUpdate && <Button type="button" variant="outline" onClick={() => choose(true)} disabled={busy || query.isFetching} className="dashboard-button-secondary h-auto whitespace-normal">{t.keepEdits}</Button>}<Button type="button" variant="outline" onClick={() => choose(false)} disabled={busy || query.isFetching} className="dashboard-button-secondary h-auto whitespace-normal">{t.useSaved}</Button></div>}
          <div className="flex flex-wrap gap-3">{current.canUpdate && <Button type="submit" disabled={busy || !draft || deniedCode || storageFailed || (!pending && (!dirty || stale || query.isFetching))} className="dashboard-button-primary h-auto whitespace-normal">{busy ? t.busy : unknown ? t.retry : t.save}</Button>}<Button type="button" variant="outline" onClick={reload} disabled={busy || query.isFetching} className="dashboard-button-secondary h-auto whitespace-normal">{t.reload}</Button></div>
          <p className="text-xs text-[var(--dash-text-soft)]">{t.draftPrivacy}</p>
        </form>
        <section className="space-y-4 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-4 sm:p-6"><h2 className="text-lg font-semibold">{t.account}</h2><dl className="space-y-4 text-sm"><div><dt className="text-[var(--dash-text-soft)]">{t.email}</dt><dd className="break-all">{current.email}<span className="mt-1 block text-xs">{current.emailVerified ? t.verified : t.unverified}</span></dd></div><div><dt className="text-[var(--dash-text-soft)]">{t.phone}</dt><dd>{current.phone || t.notRecorded}</dd></div></dl><p className="text-sm text-[var(--dash-text-soft)]">{t.identityBoundary}</p></section>
      </div>
      <section className="space-y-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-4 sm:p-6"><h2 className="text-lg font-semibold">{t.history}</h2><p className="text-sm text-[var(--dash-text-soft)]">{t.historyHint}</p>{current.history.length ? <ul className="divide-y divide-[var(--dash-border-subtle)]">{current.history.map(item => <li key={item.id} className="space-y-1 py-3 text-sm"><p>{new Date(item.savedAt).toLocaleString(locale)} — {item.displayName}</p><p>{item.fields.jobTitle || t.notRecorded}</p><p className="break-all text-xs text-[var(--dash-text-soft)]">{item.id}</p></li>)}</ul> : <p className="text-sm">{t.noHistory}</p>}</section>
    </>}
  </div>
}
