"use client"

import Link from "next/link"
import { useLocale } from "next-intl"
import { useEffect, useId, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { AlertTriangle, CheckCircle2, Loader2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { RoleWorkflowError, useRoleEditor, useSaveRole } from "@/hooks/useRoleEditor"
import type { RoleFormData } from "@/types/types"
import type { RoleCommand } from "@/services/roles/role-command"
import { roleCategoryFrench, roleEditorCopy, rolePermissionLabel } from "./role-editor-copy"
import { RoleHistory } from "./RoleHistory"

type Props = { editingId?: string; organizationId: string; actorId: string }
type Baseline = { values: RoleFormData; revision?: string }
type EditorData = NonNullable<ReturnType<typeof useRoleEditor>["data"]>
function baselineFor(data: EditorData): Baseline {
  const role = data.role
  return { values: { name: role?.nameEn ?? "", nameFr: role?.nameFr ?? "", description: role?.description ?? "", permissions: role?.permissions ?? [], organizationId: data.organizationId }, revision: role ? new Date(role.updatedAt).toISOString() : undefined }
}
const signature = (values: RoleFormData) => JSON.stringify({ ...values, permissions: [...values.permissions].sort() })

export default function RoleForm(props: Props) {
  return <RoleEditor key={props.organizationId + ":" + props.actorId + ":" + (props.editingId ?? "new")} {...props} />
}

function RoleEditor({ editingId, organizationId, actorId }: Props) {
  const locale = useLocale() === "fr" ? "fr" : "en", t = roleEditorCopy[locale], id = useId()
  const query = useRoleEditor(organizationId, actorId, editingId), save = useSaveRole(editingId)
  const [baseline, setBaseline] = useState<Baseline | null>(null)
  const [reviewed, setReviewed] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [password, setPassword] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const busy = useRef(false), message = useRef<HTMLDivElement>(null)
  const pendingCommand = useRef<{ key: string; command: RoleCommand; data: RoleFormData } | null>(null)
  const { register, watch, reset, setValue, handleSubmit } = useForm<RoleFormData>({ defaultValues: { name: "", nameFr: "", description: "", permissions: [], organizationId } })
  const values = watch(), draftKey = signature(values)
  const pending = save.isPending || verifying
  const uncertain = code === "UNCERTAIN" || code === "INTERNAL_ERROR" || code === "DATABASE_UNAVAILABLE"
  const stale = !!baseline?.revision && !!query.data?.role && new Date(query.data.role.updatedAt).toISOString() !== baseline.revision
  const dirty = baseline && signature(baseline.values) !== draftKey
  const fresh = code === "FRESH_AUTH_REQUIRED"
  useEffect(() => { if (query.data && !baseline) { const initial = baselineFor(query.data); setBaseline(initial); reset(initial.values) } }, [query.data, baseline, reset])
  useEffect(() => { if (code || notice) message.current?.focus() }, [code, notice])
  const failureText = (failure: string) => ({ FORBIDDEN: t.denied, AUTH_REQUIRED: t.denied, NOT_FOUND: t.missing, DUPLICATE_KEY_CONFLICT: t.duplicate, VALIDATION_ERROR: t.validation, BUSINESS_RULE_VIOLATION: t.blocked, FRESH_AUTH_REQUIRED: t.fresh, CONFLICT: t.stale, IDEMPOTENCY_CONFLICT: t.stale, RATE_LIMITED: t.rate } as Record<string, string>)[failure] ?? t.failed

  async function submit(data: RoleFormData) {
    if (busy.current || !baseline || (stale && !uncertain) || (!uncertain && reviewed !== signature(data))) return
    busy.current = true; setNotice(null)
    const key = signature(data)
    if (!pendingCommand.current || pendingCommand.current.key !== key) pendingCommand.current = { key, data: structuredClone(data), command: { requestId: crypto.randomUUID(), ...(baseline.revision ? { expectedUpdatedAt: baseline.revision } : {}) } }
    try {
      const after = await save.mutateAsync({ data: pendingCommand.current.data, command: pendingCommand.current.command })
      const next = { name: after.nameEn, nameFr: after.nameFr ?? "", description: after.description ?? "", permissions: after.permissions, organizationId }
      setBaseline({ values: next, revision: new Date(after.updatedAt).toISOString() }); reset(next)
      setSavedId(after.id); pendingCommand.current = null; setReviewed(null); setCode(null); setNotice(t.saved)
    } catch (error) {
      const failure = error instanceof RoleWorkflowError ? error.code : "UNCERTAIN"
      setCode(failure)
      if (failure === "CONFLICT" || failure === "IDEMPOTENCY_CONFLICT") await query.refetch()
    } finally { busy.current = false }
  }
  async function verify() {
    if (busy.current || !password) return
    busy.current = true; setVerifying(true)
    try { const result = await stepUpWithPasswordAction({ password }); if (result.success) { setCode(null); setNotice(t.verified) } else { setNotice(result.code === "RATE_LIMITED" ? t.rate : t.verifyFailed) } }
    catch { setNotice(t.verifyFailed) }
    finally { setPassword(""); setVerifying(false); busy.current = false }
  }
  function reconcileDraft(keepEdits: boolean) {
    if (!query.data || !baseline || query.isError) return
    const next = baselineFor(query.data), merged = { ...next.values }
    if (keepEdits) {
      for (const field of ["name", "nameFr", "description"] as const) if (values[field] !== baseline.values[field]) merged[field] = values[field] ?? ""
      const added = values.permissions.filter(value => !baseline.values.permissions.includes(value)), removed = baseline.values.permissions.filter(value => !values.permissions.includes(value))
      merged.permissions = [...new Set([...next.values.permissions.filter(value => !removed.includes(value)), ...added])]
    }
    setBaseline(next); reset(merged); setReviewed(null); pendingCommand.current = null; setCode(null); setNotice(null)
  }
  const known = new Set<string>(query.data?.catalogue.flatMap(category => category.permissions.map(item => item.permission)) ?? [])
  const oldPermissions = [...new Set([...(baseline?.values.permissions ?? []), ...values.permissions])].filter(permission => !known.has(permission))
  const additions = values.permissions.filter(permission => !baseline?.values.permissions.includes(permission))
  const removals = baseline?.values.permissions.filter(permission => !values.permissions.includes(permission)) ?? []
  const categories = query.data?.catalogue.map(category => ({ ...category, permissions: category.permissions.filter(item => (item.permission + " " + category.category + " " + (roleCategoryFrench[category.category] ?? "") + " " + rolePermissionLabel(item.permission, locale)).toLocaleLowerCase().includes(search.toLocaleLowerCase())) })).filter(category => category.permissions.length) ?? []
  function permissionControl(permission: string, canAdd: boolean, risk?: "low" | "med" | "high" | "crit") {
    const checked = values.permissions.includes(permission), existed = baseline?.values.permissions.includes(permission)
    const allowed = checked ? !existed || !!query.data?.canRemove : !!existed || canAdd
    return <label key={permission} className="flex min-w-0 items-start gap-3 rounded-lg border border-[var(--dash-border-subtle)] p-3">
      <input type="checkbox" checked={checked} disabled={!allowed || pending || uncertain || !!savedId && !editingId} onChange={event => { setValue("permissions", event.target.checked ? [...values.permissions, permission] : values.permissions.filter(value => value !== permission), { shouldDirty: true }); setReviewed(null) }} className="mt-1 size-4 shrink-0 accent-[var(--dash-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" />
      <span className="min-w-0"><span className="block text-sm font-medium">{rolePermissionLabel(permission, locale)}{risk ? " · " + t[risk] : ""}</span><code className="block break-all text-xs text-[var(--dash-text-soft)]">{permission}</code>{!allowed && <span className="mt-1 block text-xs text-[var(--dash-text-soft)]">{t.unavailable}</span>}</span>
    </label>
  }
  return <div className="dashboard-landing-content mx-auto w-full max-w-5xl space-y-5 px-4 py-6 text-[var(--dash-text)] sm:px-6">
    <Link href={"/" + locale + "/dashboard/settings/roles"} className="inline-block rounded text-sm underline underline-offset-4 focus-visible:outline focus-visible:outline-2">{t.back}</Link>
    <header><h1 className="flex items-center gap-2 text-2xl font-semibold"><Shield className="size-6 text-[var(--dash-brand-strong)]" aria-hidden />{editingId ? t.edit : t.create}</h1><p className="mt-2 max-w-3xl text-sm text-[var(--dash-text-soft)]">{t.intro}</p></header>
    {query.isPending && <p role="status">{t.loading}</p>}
    {query.isError && <div role="alert" className="dashboard-glass-panel space-y-3 rounded-lg p-4"><p>{query.error instanceof RoleWorkflowError && ["FORBIDDEN", "AUTH_REQUIRED", "NOT_FOUND"].includes(query.error.code) ? failureText(query.error.code) : t.loadFailed}</p><Button type="button" onClick={() => query.refetch()} className="dashboard-button-secondary">{t.reload}</Button></div>}
    {(code || notice) && <div ref={message} tabIndex={-1} role={code ? "alert" : "status"} className={"flex gap-2 rounded-lg border p-4 " + (code ? "border-[var(--dash-warning)] text-[var(--dash-text)]" : "border-[var(--dash-border-subtle)] text-[var(--dash-text)]")}>{notice === t.saved ? <CheckCircle2 className="size-5 shrink-0 text-[var(--dash-success)]" aria-hidden /> : <AlertTriangle className="size-5 shrink-0 text-[var(--dash-gold)]" aria-hidden />}<div className="space-y-2">{code && <p>{failureText(code)}</p>}{notice && <p>{notice}</p>}</div></div>}
    {baseline && query.data && <form onSubmit={handleSubmit(submit)} className="space-y-5">
      {(stale || code === "CONFLICT" || code === "IDEMPOTENCY_CONFLICT") && <section aria-label={t.stale} className="dashboard-glass-panel space-y-3 rounded-lg p-4"><p>{t.stale}</p><div className="flex flex-wrap gap-2"><Button type="button" disabled={pending} onClick={() => query.refetch()} className="dashboard-button-secondary">{t.reload}</Button>{stale && <><Button type="button" disabled={pending || query.isError} onClick={() => reconcileDraft(true)} className="dashboard-button-secondary h-auto whitespace-normal">{t.merge}</Button><Button type="button" disabled={pending || query.isError} onClick={() => reconcileDraft(false)} variant="outline" className="h-auto whitespace-normal">{t.discard}</Button></>}</div></section>}
      {fresh && <section className="dashboard-glass-panel space-y-3 rounded-lg p-4"><Label htmlFor={id + "-password"}>{t.password}</Label><Input id={id + "-password"} type="password" maxLength={128} autoComplete="current-password" value={password} disabled={pending} onChange={event => setPassword(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void verify() } }} className="dashboard-control max-w-md" /><Button type="button" onClick={verify} disabled={pending || !password} className="dashboard-button-secondary">{t.verify}</Button></section>}
      <fieldset disabled={pending || query.isError || stale || uncertain || (!!savedId && !editingId)} className="min-w-0 space-y-5">
        <div className="dashboard-glass-panel grid gap-4 rounded-lg p-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor={id + "-name"}>{t.name}</Label><Input id={id + "-name"} required maxLength={120} {...register("name", { required: true, maxLength: 120 })} className="dashboard-control" /></div>
          <div className="space-y-2"><Label htmlFor={id + "-fr"}>{t.nameFr}</Label><Input id={id + "-fr"} maxLength={120} {...register("nameFr")} className="dashboard-control" /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor={id + "-description"}>{t.description}</Label><Textarea id={id + "-description"} maxLength={1000} {...register("description")} className="dashboard-control" /></div>
        </div>
        <section className="space-y-3" aria-labelledby={id + "-permissions"}>
          <h2 id={id + "-permissions"} className="text-lg font-semibold">{t.permissions} · {t.selected}: {values.permissions.length}</h2>
          <Label htmlFor={id + "-search"}>{t.search}</Label><Input id={id + "-search"} value={search} onChange={event => setSearch(event.target.value)} className="dashboard-control" />
          {!categories.length && <p role="status">{t.noMatches}</p>}
          {categories.map(category => <details key={category.category} className="dashboard-glass-panel rounded-lg p-4" open={search ? true : undefined}><summary className="cursor-pointer rounded font-medium focus-visible:outline focus-visible:outline-2">{locale === "fr" ? roleCategoryFrench[category.category] ?? category.category : category.category} · {category.permissions.filter(item => values.permissions.includes(item.permission)).length}</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">{category.permissions.map(item => permissionControl(item.permission, item.canAdd, item.risk))}</div></details>)}
          {!!oldPermissions.length && <section className="space-y-2"><h3 className="font-medium">{t.retained}</h3><p className="text-sm text-[var(--dash-text-soft)]">{t.retainedHelp}</p>{oldPermissions.map(permission => permissionControl(permission, false))}</section>}
        </section>
      </fieldset>
      {reviewed === draftKey && <section aria-label={t.review} className="dashboard-glass-panel space-y-3 rounded-lg border border-[var(--dash-gold)] p-4"><h2 className="font-semibold">{t.review}</h2><p>{values.name} / {values.nameFr}</p><p className="text-sm">{t.consequences}</p>{additions.length + removals.length === 0 ? <p>{t.unchanged}</p> : <div className="grid gap-4 sm:grid-cols-2">{[[t.adds, additions], [t.removes, removals]].map(([label, entries]) => <div key={label as string}><h3 className="font-medium">{label as string}: {(entries as string[]).length}</h3><ul className="mt-2 space-y-1 text-xs">{(entries as string[]).map(permission => <li key={permission} className="break-all">{permission}</li>)}</ul></div>)}</div>}</section>}
      <div className="flex flex-wrap gap-3">
        {uncertain ? <Button type="button" disabled={pending} onClick={() => submit(pendingCommand.current!.data)} className="dashboard-button-primary h-auto whitespace-normal">{t.retry}</Button> : reviewed === draftKey ? <><Button type="submit" disabled={pending || fresh || stale || query.isError || !dirty} className="dashboard-button-primary h-auto whitespace-normal">{pending && <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" aria-hidden />}{pending ? t.saving : t.save}</Button><Button type="button" disabled={pending} onClick={() => setReviewed(null)} className="dashboard-button-secondary">{t.cancel}</Button></> : <Button type="button" disabled={pending || stale || query.isError || !dirty || !!savedId && !editingId} onClick={handleSubmit(data => { setReviewed(signature(data)); setCode(null); setNotice(null) })} className="dashboard-button-primary h-auto whitespace-normal">{t.review}</Button>}
        {savedId && <Link href={"/" + locale + "/dashboard/settings/roles/update/" + savedId} className="dashboard-button-secondary inline-flex items-center rounded-lg px-4 py-2 text-sm">{t.edit}</Link>}
      </div>
      <p className="text-xs text-[var(--dash-text-faint)]">{t.checked}: {new Date(query.data.checkedAt).toLocaleString(locale)}</p>
      {editingId && <RoleHistory locale={locale} allowed={query.data.canReadHistory} records={query.data.history} />}
    </form>}
  </div>
}
