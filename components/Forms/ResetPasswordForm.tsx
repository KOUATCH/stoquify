"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react"
import { resetUserPassword } from "@/actions/users/updateUserPassword"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import { passwordRecoveryEmail } from "@/services/users/password-recovery-input"

export type ResetProps = { cPassword: string; password: string }
export default function ResetPasswordForm() {
  const params = useSearchParams(), email = params.get("email") ?? "", token = params.get("token") ?? ""
  return <ResetFields key={email + ":" + token} email={email} token={token} />
}
function ResetFields({ email, token }: { email: string; token: string }) {
  const t = useTranslations("passwordRecovery"), locale = getLocaleFromPathname(usePathname()) ?? "en"
  const [values, setValues] = useState<ResetProps>({ password: "", cPassword: "" }), [shown, setShown] = useState({ password: false, cPassword: false })
  const [ready, setReady] = useState(false), [pending, setPending] = useState(false), [complete, setComplete] = useState(false), [error, setError] = useState("")
  const inFlight = useRef(false), feedback = useRef<HTMLDivElement>(null)
  const validLink = passwordRecoveryEmail.safeParse(email).success && /^[a-z0-9]{32}$/.test(token)
  useEffect(() => setReady(true), [])
  useEffect(() => { if (error || complete) feedback.current?.focus() }, [error, complete])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready || inFlight.current || complete || !validLink) return
    if (values.password !== values.cPassword) { setError(t("errors.mismatch")); return }
    if (!values.password || values.password.length > 128) { setError(t("errors.weak")); return }
    inFlight.current = true; setPending(true); setError("")
    try {
      const result = await resetUserPassword(email, token, values.password)
      if (result?.status === 200) { setComplete(true); setValues({ password: "", cPassword: "" }) }
      else {
        const codes: Record<string, string> = { WEAK: "weak", BREACHED: "breached", RECENTLY_USED: "reused", CONTAINS_EMAIL: "containsEmail", VALIDATION_ERROR: "weak" }
        const key = result?.status === 404 ? "invalidLink" : result?.status === 429 ? "rateLimited" : codes[result?.code ?? ""] ?? (result?.status === 400 ? "weak" : "unknown")
        setError(t("errors." + key))
      }
    } catch { setError(t("errors.unknown")) }
    finally { inFlight.current = false; setPending(false) }
  }
  return <section aria-labelledby="recovery-reset-title" className="w-full max-w-[560px] min-w-0 rounded-lg border border-[#d6e1db] bg-white p-6 text-[#132028] shadow-xl sm:p-8">
    <LockKeyhole className="mb-5 h-7 w-7 text-[#178e83]" aria-hidden="true" />
    <h2 id="recovery-reset-title" className="text-2xl font-black">{t("resetTitle")}</h2>
    {!validLink ? <div role="alert" className="mt-5 rounded-lg border border-[#b42318]/30 bg-[#fff0ef] p-4 text-sm text-[#912018]">{t("errors.invalidLink")}</div> : complete ?
      <div ref={feedback} role="status" tabIndex={-1} className="mt-5 rounded-lg border border-[#178e83]/30 bg-[#edf5f2] p-4 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-[#178e83]"><CheckCircle2 className="mb-2 h-5 w-5 text-[#087447]" aria-hidden="true" /><p className="font-bold">{t("completeTitle")}</p><p className="mt-2">{t("completeBody")}</p></div> : <>
      <p id="reset-password-help" className="mt-3 text-sm leading-6 text-[#526671]">{t("passwordHelp")}</p>
      <form method="post" onSubmit={submit} className="mt-6 space-y-5" aria-busy={pending}>
        <fieldset disabled={!ready || pending} className="space-y-5">
          {(["password", "cPassword"] as const).map(name => <div key={name} className="space-y-2"><Label htmlFor={"reset-" + name}>{t(name === "password" ? "password" : "confirm")}</Label><div className="flex items-center gap-2">
            <Input id={"reset-" + name} name={name} type={shown[name] ? "text" : "password"} autoComplete="new-password" required minLength={12} maxLength={128} value={values[name]} onChange={event => setValues(value => ({ ...value, [name]: event.target.value }))} aria-describedby="reset-password-help" className="min-w-0 border-[#cbd8d1] bg-white text-[#132028]" />
            <Button type="button" variant="outline" size="icon" className="shrink-0 border-[#cbd8d1] bg-white text-[#132028]" aria-pressed={shown[name]} aria-label={t(shown[name] ? "hide" : "show", { field: t(name === "password" ? "password" : "confirm") })} onClick={() => setShown(value => ({ ...value, [name]: !value[name] }))}>{shown[name] ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}</Button>
          </div></div>)}
          <p className="rounded-lg border border-[#178e83]/25 bg-[#edf5f2] p-3 text-sm leading-6">{t("consequence")}</p>
          {error && <div ref={feedback} role="alert" tabIndex={-1} className="rounded-lg border border-[#b42318]/30 bg-[#fff0ef] p-3 text-sm leading-6 text-[#912018] focus:outline-none focus:ring-2 focus:ring-[#b42318]"><AlertCircle className="mr-2 inline h-4 w-4" aria-hidden="true" />{error}</div>}
          <Button type="submit" className="h-auto min-h-11 w-full whitespace-normal bg-[#132028] py-3 text-white hover:bg-[#253943]">{pending && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />}{t(pending ? "resetting" : "resetSubmit")}</Button>
        </fieldset>
        <p role="status" className="sr-only" aria-live="polite">{pending ? t("resetting") : ""}</p>
      </form>
    </>}
    <div className="mt-6 flex flex-wrap gap-5 text-sm font-bold"><Link href={localizePath("/login-v2", locale)} className="rounded text-[#006960] underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-[#178e83]">{t("signIn")}</Link>{!complete && <Link href={localizePath("/forgot-password", locale)} className="rounded text-[#006960] underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-[#178e83]">{t("newLink")}</Link>}</div>
  </section>
}
