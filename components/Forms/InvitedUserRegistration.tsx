"use client"

import { createInvitedUser } from "@/actions/users/createInvitedUser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { localizePath } from "@/i18n/routing"
import type { Locale } from "@/types/bilingual"
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useEffect, useId, useRef, useState, type FormEvent } from "react"

export type OrgDataProps = { name: string; slug: string; country: string; currency: string | undefined; timezone: string | undefined }
type Props = { locale: Locale; email: string; organizationName: string; roleName: string; token: string; isValidInvite: boolean; loadFailed?: boolean; reloadHref: string }
const errorKeys: Record<string, string> = { WEAK: "weak", BREACHED: "breached", RECENTLY_USED: "weak", CONTAINS_EMAIL: "email", INVITATION_INVALID: "changed", INVITATION_EXPIRED: "expired", INVITATION_UNAVAILABLE: "unavailable", INVITATION_REISSUE_REQUIRED: "reissue", INVITATION_ACCOUNT_EXISTS: "exists", INVITATION_CHANGED: "changed", RATE_LIMITED: "rate" }
const fieldClass = "h-11 border-[#cbd8d1] bg-white text-[#132028] focus-visible:ring-[#178e83]"

export default function InvitedUserRegistration({ locale, email, organizationName, roleName, token, isValidInvite, loadFailed = false, reloadHref }: Props) {
  const t = useTranslations("invitationRegistration"), id = useId()
  const reviewedContext = useRef(isValidInvite ? { email, organizationName, roleName } : null)
  const [profile, setProfile] = useState({ firstName: "", lastName: "", phone: "", password: "" })
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])
  const [pending, setPending] = useState(false), [created, setCreated] = useState(false), [error, setError] = useState(""), [visible, setVisible] = useState(false)
  const submitting = useRef(false), feedback = useRef<HTMLDivElement>(null)
  useEffect(() => { if (created || error) feedback.current?.focus() }, [created, error])
  const loginHref = localizePath("/login-v2", locale)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready || submitting.current || created || !isValidInvite || loadFailed) return
    submitting.current = true
    setPending(true)
    setError("")
    try {
      const result = await createInvitedUser({ ...profile, token })
      if (result.status === 200 && result.data) {
        setCreated(true)
        setProfile(current => ({ ...current, password: "" }))
      } else {
        setError(errorKeys[result.code ?? ""] ?? "unknown")
      }
    } catch { setError("unknown") }
    finally { submitting.current = false; setPending(false) }
  }

  return <div className="w-full max-w-xl rounded-lg border border-[#d9e1dc] bg-white p-5 shadow-sm sm:p-8">
    <p className="text-xs font-bold uppercase tracking-wide text-[#53675f]">{t("badge")}</p>
    <h1 className="mt-2 text-2xl font-bold text-[#132028]">{t("title")}</h1>
    {!created && !error && (loadFailed || !isValidInvite) ? <div role="alert" className="mt-5 space-y-3 rounded-lg border border-[#f0c54d] bg-[#fff8dd] p-4 text-[#6f5620]">
      <AlertCircle aria-hidden="true" className="h-5 w-5" />
      <h2 className="font-semibold">{t(loadFailed ? "loadTitle" : "invalidTitle")}</h2>
      <p className="text-sm leading-6">{t(loadFailed ? "loadBody" : "invalidBody")}</p>
      {loadFailed && <a className="inline-block rounded underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={reloadHref}>{t("reload")}</a>}
    </div> : created ? <div ref={feedback} tabIndex={-1} role="status" className="mt-5 rounded-lg border border-[#178e83] bg-[#f0fbf6] p-5 text-[#132028]">
      <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-[#178e83]" />
      <h2 className="mt-3 text-lg font-bold">{t("successTitle")}</h2>
      <p className="mt-2 text-sm leading-6">{t("successBody")}</p>
    </div> : <>
      <p className="mt-3 break-words text-sm leading-6 text-[#53675f]">{t("intro", { organization: reviewedContext.current?.organizationName ?? organizationName, role: reviewedContext.current?.roleName ?? roleName })}</p>
      <div className="my-5 rounded-lg border border-[#d9e1dc] bg-[#f7faf8] p-4">
        <p className="text-xs font-semibold text-[#53675f]">{t("email")}</p>
        <p className="mt-1 break-all font-medium text-[#132028]">{reviewedContext.current?.email ?? email}</p>
      </div>
      <form method="post" onSubmit={submit} aria-busy={!ready || pending} className="space-y-5">
        {!ready && <p role="status" className="text-sm text-[#53675f]">{t("preparing")}</p>}
        <noscript><p className="text-sm text-[#922e2e]">{t("javascriptRequired")}</p></noscript>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["firstName", "lastName"] as const).map(field => <div key={field} className="space-y-2">
            <Label htmlFor={id + field} className="text-[#132028]">{t(field)}</Label>
            <Input id={id + field} name={field} value={profile[field]} maxLength={100} autoComplete={field === "firstName" ? "given-name" : "family-name"} disabled={!ready || pending} onChange={event => setProfile(current => ({ ...current, [field]: event.target.value }))} className={fieldClass} />
          </div>)}
        </div>
        <div className="space-y-2">
          <Label htmlFor={id + "phone"} className="text-[#132028]">{t("phone")}</Label>
          <Input id={id + "phone"} name="phone" type="tel" autoComplete="tel" maxLength={50} value={profile.phone} disabled={!ready || pending} onChange={event => setProfile(current => ({ ...current, phone: event.target.value }))} className={fieldClass} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id + "password"} className="text-[#132028]">{t("password")}</Label>
          <div className="flex gap-2">
            <Input id={id + "password"} name="password" type={visible ? "text" : "password"} autoComplete="new-password" required minLength={12} maxLength={128} value={profile.password} disabled={!ready || pending} aria-describedby={id + "help"} aria-invalid={["weak", "breached", "email"].includes(error)} onChange={event => setProfile(current => ({ ...current, password: event.target.value }))} className={fieldClass} />
            <Button type="button" variant="outline" className="h-11 shrink-0 border-[#cbd8d1] bg-white text-[#132028]" disabled={!ready || pending} aria-label={t(visible ? "hide" : "show")} aria-pressed={visible} onClick={() => setVisible(current => !current)}>{visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</Button>
          </div>
          <p id={id + "help"} className="text-xs leading-5 text-[#53675f]">{t("passwordHelp")}</p>
        </div>
        {error && <div ref={feedback} tabIndex={-1} role="alert" className="rounded-lg border border-[#d44848] bg-[#fff4f4] p-4 text-sm leading-6 text-[#922e2e]">
          <p>{t("errors." + error)}</p>
          <a href={reloadHref} className="mt-2 inline-block rounded font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2">{t("reload")}</a>
        </div>}
        <Button type="submit" disabled={!ready || pending || !isValidInvite || loadFailed} className="h-auto min-h-12 w-full whitespace-normal rounded-lg bg-[#132028] px-4 py-3 font-bold text-white hover:bg-[#22323b]">
          {pending && <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}{t(!ready ? "preparing" : pending ? "pending" : "submit")}
        </Button>
      </form>
    </>}
    <Link href={loginHref} className="mt-6 inline-block rounded font-semibold text-[#126f67] underline underline-offset-4 focus-visible:outline focus-visible:outline-2">{t("login")}</Link>
  </div>
}
