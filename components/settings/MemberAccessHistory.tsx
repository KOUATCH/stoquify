"use client"
import { useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { useMemberHistory, useExportMemberHistory } from "@/hooks/useMemberHistory"
import { MemberAccessError } from "@/hooks/useMemberAccess"
import type { MemberHistoryInput } from "@/services/users/member-history-input"
import type { MemberHistoryPage } from "@/services/users/member-history.service"
import { memberHistoryCopy } from "./member-history-copy"

type Props = { organizationId: string; actorId: string; memberId: string; locale: "en" | "fr"; initial: MemberHistoryPage }
export default function MemberAccessHistory({ organizationId, actorId, memberId, locale, initial }: Props) {
  const t = memberHistoryCopy[locale], id = useId(), heading = useRef<HTMLHeadingElement>(null), lock = useRef(false)
  const [pages, setPages] = useState<MemberHistoryInput[]>([{}]), [code, setCode] = useState<string | null>(null), [password, setPassword] = useState(""), [notice, setNotice] = useState<string | null>(null), [busy, setBusy] = useState(false)
  const query = useMemberHistory(organizationId, actorId, memberId, pages[pages.length - 1], initial), mutation = useExportMemberHistory(memberId)
  const [prepared, setPrepared] = useState<Awaited<ReturnType<typeof mutation.mutateAsync>> | null>(null)
  const run = async (work: () => Promise<void>) => { if (lock.current) return; lock.current = true; setBusy(true); try { await work() } finally { lock.current = false; setBusy(false) } }
  const download = (file: NonNullable<typeof prepared>) => {
    let url: string | null = null
    try { const bytes = Uint8Array.from(atob(file.contentBase64), value => value.charCodeAt(0)); url = URL.createObjectURL(new Blob([bytes], { type: file.mimeType })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.fileName; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setNotice(t.prepared) }
    catch { setNotice(t.downloadFailed) }
    finally { if (url) URL.revokeObjectURL(url) }
  }
  const exportPage = () => run(async () => {
    if (!query.data || query.isError || query.isFetching) return
    setNotice(null)
    try { const result = await mutation.mutateAsync({ locale, expectedHash: query.data.pageHash, page: { ...(query.data.pageInfo.beforeId ? { beforeId: query.data.pageInfo.beforeId } : {}), ...(query.data.pageInfo.throughId ? { throughId: query.data.pageInfo.throughId } : {}) } }); setPrepared(result); setCode(null); download(result) }
    catch (error) { setCode(error instanceof MemberAccessError ? error.code : "UNCERTAIN") }
  })
  const verify = () => run(async () => { try { const result = await stepUpWithPasswordAction({ password }); if (result.success) { setCode(null); setNotice(t.ready) } else setNotice(t.verifyFailed) } catch { setNotice(t.verifyFailed) } finally { setPassword("") } })
  const navigate = (value: MemberHistoryInput[]) => { setPages(value); setCode(null); setNotice(null); setPrepared(null); setPassword(""); heading.current?.focus() }
  const data = query.data
  return <section className="space-y-3 border-t border-[var(--dash-border-subtle)] pt-5" aria-labelledby={id + "-heading"}>
    <h2 id={id + "-heading"} ref={heading} tabIndex={-1} className="text-lg font-semibold focus-visible:outline focus-visible:outline-2">{t.title}</h2>
    {query.isError ? <p role="alert">{t.failed}</p> : query.isPending || !data ? <p role="status">{t.loading}</p> : <>
      <p role="status" className="text-sm text-[var(--dash-text-soft)]">{t.page} {pages.length} · {data.entries.length} {t.records}{data.pageInfo.recordedThrough ? ` · ${t.snapshot}: ${new Date(data.pageInfo.recordedThrough).toLocaleString(locale, { timeZone: "UTC" })} UTC` : ""}</p>
      {!data.entries.length ? <p>{t.none}</p> : <ol className="space-y-3">{data.entries.map(record => <li key={record.id} className="space-y-2 break-words rounded border border-[var(--dash-border-subtle)] p-3 text-sm"><p>{t[record.operation]} · {new Date(record.createdAt).toLocaleString(locale, { timeZone: "UTC" })} UTC</p>{record.reason && <p>{record.reason}</p>}<p className="break-all text-xs">{record.id}</p>{record.actorId && <p className="break-all text-xs">{t.actor}: {record.actorId}</p>}{!!record.addedRoleIds?.length && <p className="break-all text-xs">{t.added}: {record.addedRoleIds.join(", ")}</p>}{!!record.removedRoleIds?.length && <p className="break-all text-xs">{t.removed}: {record.removedRoleIds.join(", ")}</p>}</li>)}</ol>}
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="dashboard-button-secondary h-auto whitespace-normal" disabled={busy || query.isFetching || pages.length < 2} onClick={() => navigate(pages.slice(0, -1))}>{t.newer}</Button><Button type="button" variant="outline" className="dashboard-button-secondary h-auto whitespace-normal" disabled={busy || query.isFetching || !data.pageInfo.nextCursor} onClick={() => navigate([...pages, { beforeId: data.pageInfo.nextCursor!, throughId: data.pageInfo.throughId! }])}>{t.older}</Button></div>
      <p className="text-xs text-[var(--dash-text-soft)]">{t.exportHelp}</p>
      {data.canExport ? <Button type="button" className="dashboard-button-secondary h-auto whitespace-normal" disabled={busy || query.isFetching || !data.entries.length || code === "FRESH_AUTH_REQUIRED" || code === "CONFLICT"} onClick={exportPage}>{busy ? t.busy : t.export}</Button> : <p>{t.exportDenied}</p>}
      {code && <p role="alert">{code === "FRESH_AUTH_REQUIRED" ? t.fresh : code === "CONFLICT" ? t.stale : t.exportFailed}</p>}{notice && <p role="status">{notice}</p>}
      {code === "FRESH_AUTH_REQUIRED" && <div className="space-y-2"><Label htmlFor={id + "-password"}>{t.password}</Label><Input id={id + "-password"} className="dashboard-control" type="password" autoComplete="current-password" maxLength={128} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} /><Button type="button" disabled={busy || !password} onClick={verify} className="dashboard-button-secondary h-auto whitespace-normal">{t.verify}</Button></div>}
      {prepared && <div className="space-y-2"><p className="break-all text-xs">{t.receipt}: {prepared.auditId} · {prepared.rowCount} {t.records}</p><Button type="button" variant="outline" onClick={() => download(prepared)} disabled={busy} className="dashboard-button-secondary h-auto whitespace-normal">{t.downloadAgain}</Button></div>}
    </>}
    <Button type="button" variant="outline" className="dashboard-button-secondary h-auto whitespace-normal" disabled={busy || query.isFetching} onClick={() => { navigate([{}]); void query.refetch() }}>{t.reload}</Button>
  </section>
}
