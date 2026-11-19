"use client"
import { useEffect, useId, useRef, useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { OrganizationDirectoryExportError, useOrganizationDirectoryExport } from "@/hooks/useOrganizationDirectoryExport"
import type { DirectoryExportInput, DirectoryFilters } from "@/services/organization/organization-directory-input"
import type { DirectoryExportPreview, DirectoryExportReceipt } from "@/services/organization/organization-directory-export.service"
import { readDirectoryExportRequest, saveDirectoryExportRequest } from "@/hooks/organization-directory-recovery"
import { useSession } from "@/lib/auth-client"

const copy = {
  en: { export: "Export", denied: "Report-export permission is required.", unavailable: "Refresh the table or adjust its filters before exporting.", title: "Review company directory export", description: "Only the current organization and the reviewed filters are included. Your current export permission and password confirmation are checked before preparing the file.", definition: "Gross paid payment amount includes non-deleted PAID sales and purchase payments, before refunds are subtracted. It is not revenue or a cash balance.", loading: "Loading the current export preview…", failed: "The preview could not be loaded. No file was prepared.", reload: "Reload and review current data", empty: "No organization matches these filters.", prepare: "Prepare reviewed CSV", pending: "Preparing…", fresh: "Confirm your own password, then choose Prepare reviewed CSV again.", password: "Your password", verify: "Confirm identity", verified: "Identity confirmed. Review the values, then prepare the file.", verifyFailed: "Identity could not be confirmed. Check your password and try again.", stale: "The reviewed data changed. Reload and review before preparing a new file.", rejected: "Your current access does not permit this export.", uncertain: "The result could not be confirmed. Retry the same export request to retrieve its recorded result.", retry: "Retry same export request", prepared: "File prepared. Check your browser downloads; if necessary, download this same file again.", downloadFailed: "The file is prepared, but the browser download failed. Use Download prepared file again.", again: "Download prepared file again", receipt: "Export record", yes: "Yes", no: "No", checked: "Preview checked", resumed: "Recovered the original recorded file.", close: "Close export review", note: "Filters apply to rows. The CSV includes all listed fields, including columns hidden in the directory." },
  fr: { export: "Exporter", denied: "L’autorisation d’exporter les rapports est requise.", unavailable: "Actualisez la table ou ajustez ses filtres avant l’export.", title: "Vérifier l’export du répertoire", description: "Seules l’organisation actuelle et les filtres vérifiés sont inclus. Vos droits actuels et votre confirmation par mot de passe sont contrôlés avant de préparer le fichier.", definition: "Le montant brut inclut les paiements PAID non supprimés des ventes et des achats, avant déduction des remboursements. Ce n’est ni un chiffre d’affaires ni un solde de trésorerie.", loading: "Chargement de l’aperçu actuel…", failed: "L’aperçu n’a pas pu être chargé. Aucun fichier n’a été préparé.", reload: "Recharger et vérifier les données actuelles", empty: "Aucune organisation ne correspond à ces filtres.", prepare: "Préparer le CSV vérifié", pending: "Préparation…", fresh: "Confirmez votre propre mot de passe, puis choisissez à nouveau Préparer le CSV vérifié.", password: "Votre mot de passe", verify: "Confirmer l’identité", verified: "Identité confirmée. Vérifiez les valeurs, puis préparez le fichier.", verifyFailed: "L’identité n’a pas pu être confirmée. Vérifiez votre mot de passe et réessayez.", stale: "Les données vérifiées ont changé. Rechargez-les et vérifiez-les avant un nouvel export.", rejected: "Vos accès actuels ne permettent pas cet export.", uncertain: "Le résultat n’a pas pu être confirmé. Réessayez la même demande pour retrouver son résultat enregistré.", retry: "Réessayer la même demande d’export", prepared: "Fichier préparé. Vérifiez les téléchargements du navigateur ; vous pouvez télécharger à nouveau ce même fichier.", downloadFailed: "Le fichier est préparé, mais le téléchargement a échoué. Utilisez Télécharger à nouveau le fichier préparé.", again: "Télécharger à nouveau le fichier préparé", receipt: "Document d’export", yes: "Oui", no: "Non", checked: "Aperçu vérifié", resumed: "Le fichier enregistré initialement a été retrouvé.", close: "Fermer la vérification d’export", note: "Les filtres sélectionnent les lignes. Le CSV contient tous les champs listés, y compris les colonnes masquées dans le répertoire." },
} as const

type Props = { organizationId: string; locale: "en" | "fr"; filters: DirectoryFilters; canExport: boolean; available: boolean }
export default function OrganizationDirectoryExport(props: Props) {
  const { data: session, isPending } = useSession()
  if (isPending || !session?.user?.id) return <Button type="button" disabled className="dashboard-button-secondary">{copy[props.locale].export}</Button>
  return <OrganizationDirectoryExportForActor key={session.user.id} {...props} actorId={session.user.id} />
}

function OrganizationDirectoryExportForActor({ organizationId, actorId, locale, filters, canExport, available }: Props & { actorId: string }) {
  const t = copy[locale], id = useId(), lock = useRef(false), message = useRef<HTMLParagraphElement>(null)
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [code, setCode] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null), [password, setPassword] = useState("")
  const [prepared, setPrepared] = useState<DirectoryExportReceipt | null>(null), [pending, setPending] = useState<{ command: DirectoryExportInput; preview?: DirectoryExportPreview } | null>(null)
  const [restored, setRestored] = useState(false), [storageUnavailable, setStorageUnavailable] = useState(false)
  const restoredFor = useRef<string | null>(null)
  const { query, mutation } = useOrganizationDirectoryExport(organizationId, actorId, { locale, filters }, open)
  useEffect(() => {
    if (!open || !query.data || query.isError || restoredFor.current === actorId) return
    restoredFor.current = actorId
    setPrepared(null); setPending(null); setCode(null); setNotice(null); setRestored(false)
    try {
      const command = readDirectoryExportRequest(window.sessionStorage, organizationId, actorId, locale)
      if (command) { setPending({ command }); setRestored(true); setCode("UNCERTAIN") }
    } catch { setStorageUnavailable(true) }
  }, [open, actorId, organizationId, locale, query.data, query.isError])
  const retain = (command: DirectoryExportInput | null) => {
    if (!actorId) return
    try { saveDirectoryExportRequest(window.sessionStorage, organizationId, actorId, locale, command); setStorageUnavailable(false) }
    catch { setStorageUnavailable(true) }
  }
  const preview = pending?.preview ?? query.data
  const unknown = code !== null && !["FORBIDDEN", "FRESH_AUTH_REQUIRED", "CONFLICT", "IDEMPOTENCY_CONFLICT", "VALIDATION_ERROR"].includes(code)
  const run = async (work: () => Promise<void>) => { if (lock.current) return; lock.current = true; setBusy(true); try { await work() } finally { lock.current = false; setBusy(false); requestAnimationFrame(() => message.current?.focus()) } }
  const download = (file: DirectoryExportReceipt) => {
    let url: string | null = null
    try { const bytes = Uint8Array.from(atob(file.contentBase64), value => value.charCodeAt(0)); url = URL.createObjectURL(new Blob([bytes], { type: file.mimeType })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.fileName; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setNotice(t.prepared) }
    catch { setNotice(t.downloadFailed) }
    finally { if (url) URL.revokeObjectURL(url) }
  }
  const prepare = () => run(async () => {
    if (!preview || (!pending && (query.isError || query.isFetching))) return
    const request = pending ?? { command: { locale, filters, expectedHash: preview.snapshotHash, requestId: crypto.randomUUID() }, preview }
    setPending(request); setNotice(null); retain(request.command)
    try { const file = await mutation.mutateAsync(request.command); setPrepared(file); setCode(null); setRestored(false); retain(null); download(file); if (file.replayed) setNotice(t.resumed) }
    catch (error) { setCode(error instanceof OrganizationDirectoryExportError ? error.code : "UNCERTAIN") }
  })
  const verify = () => run(async () => { try { const result = await stepUpWithPasswordAction({ password }); if (result.success) { setCode(null); setNotice(t.verified) } else setNotice(t.verifyFailed) } catch { setNotice(t.verifyFailed) } finally { setPassword("") } })
  const reload = () => { retain(null); setPending(null); setPrepared(null); setCode(null); setNotice(null); setRestored(false); setPassword(""); void query.refetch() }
  const errorText = code === "FRESH_AUTH_REQUIRED" ? t.fresh : code === "CONFLICT" || code === "IDEMPOTENCY_CONFLICT" ? t.stale : code === "FORBIDDEN" ? t.rejected : code === "VALIDATION_ERROR" ? (locale === "fr" ? "Cet export ne peut pas être préparé. Rechargez l’aperçu et vérifiez les filtres ; si le problème persiste, contactez votre administrateur." : "This export cannot be prepared. Reload the preview and check the filters; if the problem continues, contact your administrator.") : t.uncertain
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) setPassword("") }}>
    <div className="space-y-1"><DialogTrigger asChild><Button type="button" variant="outline" disabled={!canExport || !available} aria-describedby={!canExport || !available ? id + "-unavailable" : undefined} className="dashboard-button-secondary h-11 rounded-lg"><Download className="size-4" aria-hidden />{t.export}</Button></DialogTrigger>{(!canExport || !available) && <p id={id + "-unavailable"} className="max-w-xs text-xs text-[var(--dash-text-soft)]">{!canExport ? t.denied : t.unavailable}</p>}</div>
    <DialogContent closeLabel={t.close} className="dashboard-landing-theme dark max-h-[90dvh] overflow-y-auto border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)] sm:max-w-2xl">
      <DialogHeader><DialogTitle>{t.title}</DialogTitle><DialogDescription className="text-[var(--dash-text-soft)]">{t.description}</DialogDescription></DialogHeader>
      <p className="text-sm">{t.note}</p><p className="rounded border border-[var(--dash-border-subtle)] p-3 text-sm">{t.definition}</p>
      {storageUnavailable && <p role="status" className="text-sm">{locale === "fr" ? "La reprise après actualisation est indisponible. Gardez cette fenêtre ouverte pour réessayer la même demande." : "Recovery after refresh is unavailable. Keep this window open to retry the same request."}</p>}
      {restored && <p role="status" className="text-sm">{locale === "fr" ? "Une demande interrompue a été retrouvée. Réessayez-la pour récupérer le fichier déjà enregistré, s’il existe. L’aperçu ci-dessous montre les données actuelles et peut différer du fichier initial." : "An interrupted request was found. Retry it to recover the recorded file, if one exists. The preview below shows current data and may differ from the original file."}</p>}
      {!preview && query.isPending ? <p role="status">{t.loading}</p> : !preview || (query.isError && !pending) ? <p role="alert">{query.error instanceof OrganizationDirectoryExportError && query.error.code === "FORBIDDEN" ? t.rejected : t.failed}</p> : <>
        <p className="text-xs text-[var(--dash-text-soft)]">{t.checked}: {new Date(preview.checkedAt).toLocaleString(locale)}</p>
        {preview.rows.length === 0 ? <p>{t.empty}</p> : preview.rows.map((row, index) => <dl key={index} className="grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2">{preview.headings.map((heading, column) => <div key={heading} className="min-w-0 border-b border-[var(--dash-border-subtle)] py-1"><dt className="text-xs text-[var(--dash-text-soft)]">{heading}</dt><dd className="break-words">{typeof row[column] === "boolean" ? row[column] ? t.yes : t.no : String(row[column] ?? "—")}</dd></div>)}</dl>)}
        {!prepared && <Button type="button" disabled={busy || (!pending && !preview.rowCount) || code === "FRESH_AUTH_REQUIRED" || code === "CONFLICT" || code === "IDEMPOTENCY_CONFLICT" || code === "FORBIDDEN" || code === "VALIDATION_ERROR" || (!pending && query.isFetching)} className="dashboard-button-primary h-auto whitespace-normal" onClick={prepare}>{busy ? t.pending : unknown || restored ? t.retry : t.prepare}</Button>}
      </>}
      {(code || notice) && <p ref={message} tabIndex={-1} role={code ? "alert" : "status"} className="text-sm focus-visible:outline focus-visible:outline-2">{code ? errorText : notice}</p>}
      {code === "FRESH_AUTH_REQUIRED" && <form method="post" onSubmit={event => { event.preventDefault(); void verify() }} className="space-y-2"><Label htmlFor={id + "-password"}>{t.password}</Label><Input id={id + "-password"} type="password" autoComplete="current-password" maxLength={128} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} className="dashboard-control" /><Button type="submit" disabled={busy || !password} className="dashboard-button-secondary h-auto whitespace-normal">{t.verify}</Button></form>}
      {prepared && <div className="space-y-2"><p className="break-all text-xs">{t.receipt}: {prepared.auditId}</p><Button type="button" onClick={() => download(prepared)} disabled={busy} className="dashboard-button-secondary h-auto whitespace-normal">{t.again}</Button></div>}
      <Button type="button" variant="outline" onClick={reload} disabled={busy || query.isFetching || unknown} className="dashboard-button-secondary h-auto whitespace-normal">{t.reload}</Button>
    </DialogContent>
  </Dialog>
}
