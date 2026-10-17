"use client"

import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react"
import { updateUserPassword } from "@/actions/users/updateUserPassword"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import { DEFAULT_LOCALE } from "@/types/bilingual"
import type { PasswordChangeFields } from "@/services/users/password-change-input"

export type PasswordProps = PasswordChangeFields
const errorKeys: Record<string, string> = { WEAK: "weak", BREACHED: "breached", RECENTLY_USED: "recent", CONTAINS_EMAIL: "email", VALIDATION_ERROR: "validation", INVALID_CREDENTIALS: "credentials", RATE_LIMITED: "rate", AUTH_REQUIRED: "auth", UNAUTHENTICATED: "auth", FORBIDDEN: "denied", FRESH_AUTH_REQUIRED: "fresh", CREDENTIAL_CHANGED: "changed", CREDENTIAL_REVIEW_REQUIRED: "review", USER_UNAVAILABLE: "unavailable" }
const fieldClass = "h-11 border-[var(--dash-border)] bg-[var(--dash-canvas)] text-[var(--dash-text)] focus-visible:ring-[var(--dash-brand)]"

export default function ChangePasswordForm({ editingId }: { editingId?: string }) {
  const t = useTranslations("passwordChange"), id = useId(), pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE
  const [fields, setFields] = useState<PasswordChangeFields>({ oldPassword: "", newPassword: "" })
  const [visible, setVisible] = useState({ oldPassword: false, newPassword: false })
  const [ready, setReady] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState("")
  const [completed, setCompleted] = useState<{ selfService: boolean } | null>(null)
  const submitting = useRef(false), feedback = useRef<HTMLDivElement>(null)
  useEffect(() => { setReady(true) }, [])
  useEffect(() => { if (error || completed) feedback.current?.focus() }, [error, completed])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingId || !ready || submitting.current || completed) return
    submitting.current = true; setPending(true); setError("")
    try {
      const result = await updateUserPassword(editingId, fields)
      if (result.status === 200 && result.data) {
        setCompleted({ selfService: result.data.selfService })
        setFields({ oldPassword: "", newPassword: "" })
      } else setError(errorKeys[result.code ?? ""] ?? "unknown")
    } catch { setError("unknown") }
    finally { submitting.current = false; setPending(false) }
  }

  return <section className="mx-auto w-full max-w-2xl space-y-5 text-[var(--dash-text)]" aria-labelledby={id + "-title"}>
    <header className="space-y-2">
      <LockKeyhole className="h-6 w-6 text-[var(--dash-brand)]" aria-hidden="true" />
      <h1 id={id + "-title"} className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-sm text-[var(--dash-text-muted)]">{t("description")}</p>
    </header>
    <Card className="border-[var(--dash-border)] bg-[var(--dash-surface)]">
      <CardContent className="space-y-5 p-4 sm:p-6">
        {completed ? <div ref={feedback} role="status" tabIndex={-1} className="space-y-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">
          <CheckCircle2 className="h-6 w-6 text-[var(--dash-success)]" aria-hidden="true" />
          <h2 className="text-lg font-semibold">{t("successTitle")}</h2>
          <p className="text-sm text-[var(--dash-text-muted)]">{t(completed.selfService ? "successSelf" : "successAdmin")}</p>
          <Button asChild><a href={localizePath(completed.selfService ? "/login-v2" : "/dashboard/settings/users", locale)}>{t(completed.selfService ? "signIn" : "backToUsers")}</a></Button>
        </div> : !editingId ? <div role="alert" className="text-[var(--dash-danger)]">{t("errors.unavailable")}</div> : <form method="post" onSubmit={submit} className="space-y-5" aria-busy={pending}>
          <fieldset disabled={!ready || pending} className="space-y-5">
            <legend className="sr-only">{t("title")}</legend>
            {(["oldPassword", "newPassword"] as const).map(name => <div key={name} className="space-y-2">
              <Label htmlFor={id + "-" + name}>{t(name)}</Label>
              <div className="flex gap-2">
                <Input id={id + "-" + name} name={name} type={visible[name] ? "text" : "password"} autoComplete={name === "oldPassword" ? "current-password" : "new-password"} required maxLength={name === "oldPassword" ? 1024 : 128} minLength={name === "newPassword" ? 12 : undefined} value={fields[name]} onChange={event => setFields(current => ({ ...current, [name]: event.target.value }))} aria-describedby={name === "newPassword" ? id + "-policy" : id + "-assurance"} className={fieldClass} />
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label={t(visible[name] ? "hide" : "show", { field: t(name) })} aria-pressed={visible[name]} onClick={() => setVisible(current => ({ ...current, [name]: !current[name] }))}>{visible[name] ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}</Button>
              </div>
              <p id={id + (name === "newPassword" ? "-policy" : "-assurance")} className="text-xs leading-relaxed text-[var(--dash-text-muted)]">{t(name === "newPassword" ? "policy" : "assurance")}</p>
            </div>)}
          </fieldset>
          {error && <div ref={feedback} role="alert" tabIndex={-1} className="flex gap-3 rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-3 text-sm text-[var(--dash-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dash-danger)]" /><div className="space-y-2"><p>{t("errors." + error)}</p>{["auth", "changed", "unknown"].includes(error) && <a className="underline underline-offset-2" href={localizePath("/login-v2", locale)}>{t("signIn")}</a>}</div></div>}
          <p className="rounded-lg bg-[var(--dash-info-soft)] p-3 text-sm text-[var(--dash-info)]">{t("consequence")}</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" asChild><a href={localizePath("/dashboard", locale)} aria-disabled={pending} onClick={event => { if (pending) event.preventDefault() }}>{t("cancel")}</a></Button>
            <Button type="submit" disabled={!ready || pending} className="min-h-11">{pending && <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}{t(pending ? "saving" : "submit")}</Button>
          </div>
          {!ready && <p role="status" className="text-sm text-[var(--dash-text-muted)]">{t("preparing")}</p>}
          {pending && <p role="status" className="sr-only">{t("saving")}</p>}
          <noscript><p>{t("javascriptRequired")}</p></noscript>
        </form>}
      </CardContent>
    </Card>
  </section>
}
