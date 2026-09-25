"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { AlertCircle, Info, Loader2, Mail } from "lucide-react"
import { sendResetLink } from "@/actions/users/sendResetLink"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import { passwordRecoveryEmail } from "@/services/users/password-recovery-input"

export default function ForgotPasswordForm() {
  const t = useTranslations("passwordRecovery"), locale = getLocaleFromPathname(usePathname()) ?? "en"
  const [email, setEmail] = useState(""), [ready, setReady] = useState(false), [pending, setPending] = useState(false)
  const [requested, setRequested] = useState(false), [error, setError] = useState("")
  const inFlight = useRef(false), feedback = useRef<HTMLDivElement>(null)
  useEffect(() => setReady(true), [])
  useEffect(() => { if (error || requested) feedback.current?.focus() }, [error, requested])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready || inFlight.current || requested) return
    if (!passwordRecoveryEmail.safeParse(email).success) { setError(t("errors.email")); return }
    inFlight.current = true; setPending(true); setError("")
    try {
      const result = await sendResetLink(email)
      if (result?.status === 200) setRequested(true)
      else setError(t(result?.status === 429 ? "errors.rateLimited" : "errors.requestUnknown"))
    } catch { setError(t("errors.requestUnknown")) }
    finally { inFlight.current = false; setPending(false) }
  }
  return <section aria-labelledby="recovery-request-title" className="w-full max-w-[560px] min-w-0 rounded-lg border border-[#d6e1db] bg-white p-6 text-[#132028] shadow-xl sm:p-8">
    <Mail className="mb-5 h-7 w-7 text-[#178e83]" aria-hidden="true" />
    <h2 id="recovery-request-title" className="text-2xl font-black">{t("requestTitle")}</h2>
    <p className="mt-3 text-sm leading-6 text-[#526671]">{t("requestDescription")}</p>
    {requested ? <div ref={feedback} role="status" tabIndex={-1} className="mt-6 rounded-lg border border-[#178e83]/30 bg-[#edf5f2] p-4 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-[#178e83]">
      <Info className="mb-2 h-5 w-5" aria-hidden="true" /><p className="font-bold">{t("requestedTitle")}</p><p className="mt-2">{t("requestedBody")}</p>
      <Button type="button" variant="outline" onClick={() => { setRequested(false); setError("") }} className="mt-4 w-full whitespace-normal border-[#cbd8d1] bg-white text-[#132028]">{t("anotherRequest")}</Button>
    </div> : <form method="post" onSubmit={submit} className="mt-6 space-y-5" aria-busy={pending}>
      <fieldset disabled={!ready || pending} className="space-y-5">
        <div className="space-y-2"><Label htmlFor="recovery-email">{t("email")}</Label><Input id="recovery-email" name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} className="border-[#cbd8d1] bg-white text-[#132028]" /></div>
        {error && <div ref={feedback} role="alert" tabIndex={-1} className="rounded-lg border border-[#b42318]/30 bg-[#fff0ef] p-3 text-sm text-[#912018] focus:outline-none focus:ring-2 focus:ring-[#b42318]"><AlertCircle className="mr-2 inline h-4 w-4" aria-hidden="true" />{error}</div>}
        <Button type="submit" className="h-auto min-h-11 w-full whitespace-normal bg-[#132028] py-3 text-white hover:bg-[#253943]">{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}{t(pending ? "requesting" : "requestSubmit")}</Button>
      </fieldset>
      <p role="status" aria-live="polite" className="sr-only">{pending ? t("requesting") : ""}</p>
    </form>}
    <p className="mt-5 text-sm leading-6 text-[#526671]">{t("requestHelp")}</p>
    <Link href={localizePath("/login-v2", locale)} className="mt-6 inline-block rounded font-bold text-[#006960] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#178e83]">{t("signIn")}</Link>
  </section>
}
