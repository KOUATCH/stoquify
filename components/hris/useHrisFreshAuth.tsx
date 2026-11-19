"use client"

import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { localizePath } from "@/i18n/routing"

/** Recovery only: the caller retains its draft and must explicitly retry its operation. */
export function useHrisFreshAuth(locale: "en" | "fr", scope: string, onVerified?: () => void) {
  const pathname = usePathname(), id = useId(), generation = useRef(0), challenge = useRef(0), mounted = useRef(false)
  const trigger = useRef<HTMLElement | null>(null), passwordInput = useRef<HTMLInputElement>(null), inFlight = useRef(false)
  const [open, setOpen] = useState(false), [password, setPassword] = useState(""), [busy, setBusy] = useState(false)
  const [error, setError] = useState(""), [sessionExpired, setSessionExpired] = useState(false), [notice, setNotice] = useState("")
  const t = (en: string, fr: string) => locale === "fr" ? fr : en
  useEffect(() => {
    mounted.current = true; generation.current++; inFlight.current = false
    setOpen(false); setPassword(""); setBusy(false); setError(""); setNotice(""); setSessionExpired(false)
    return () => { mounted.current = false; generation.current++ }
  }, [pathname, scope])

  function requestVerification() {
    challenge.current++
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setPassword(""); setError(""); setNotice(""); setSessionExpired(false); setOpen(true)
  }
  async function run<T extends { success: boolean; code?: string | null }>(operation: () => Promise<T>): Promise<T> {
    const current = generation.current, attempt = challenge.current
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const result = await operation()
    if (mounted.current && current === generation.current && attempt === challenge.current && !result.success && result.code === "FRESH_AUTH_REQUIRED") {
      requestVerification(); trigger.current = focused
    }
    return result
  }
  function close(next: boolean) {
    if (inFlight.current) return
    challenge.current++
    setOpen(next); setPassword(""); setError("")
  }
  async function verify(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current || !password || sessionExpired) return
    const current = generation.current, entered = password
    setPassword(""); setBusy(true); setError(""); inFlight.current = true
    try {
      const result = await stepUpWithPasswordAction({ password: entered })
      if (!mounted.current || current !== generation.current) return
      if (result.success) {
        challenge.current++
        setOpen(false)
        setNotice(t("Password verified. Retry your action to continue.", "Mot de passe vérifié. Réessayez votre action pour continuer."))
        onVerified?.()
      } else if (result.code === "AUTH_REQUIRED") {
        setSessionExpired(true)
        setError(t("Your session is no longer valid. Sign in again to continue.", "Votre session n’est plus valide. Reconnectez-vous pour continuer."))
      } else setError(result.code === "RATE_LIMITED"
        ? t("Too many attempts. Wait before trying again.", "Trop de tentatives. Patientez avant de réessayer.")
        : t("The password could not be verified. Try again.", "Le mot de passe n’a pas pu être vérifié. Réessayez."))
    } catch {
      if (mounted.current && current === generation.current) setError(t("Verification could not be confirmed. Try again.", "La vérification n’a pas pu être confirmée. Réessayez."))
    } finally {
      if (mounted.current && current === generation.current) { inFlight.current = false; setBusy(false) }
    }
  }
  const dialog = <>
    {notice && <p role="status" className="text-sm text-sky-200">{notice}</p>}
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="dashboard-landing-theme dark max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text)]"
        closeLabel={t("Close", "Fermer")} closeDisabled={busy}
        onOpenAutoFocus={event => { event.preventDefault(); passwordInput.current?.focus() }}
        onCloseAutoFocus={event => { event.preventDefault(); if (trigger.current?.isConnected) trigger.current.focus() }}
        onEscapeKeyDown={event => { if (inFlight.current) event.preventDefault() }}
        onInteractOutside={event => { if (inFlight.current) event.preventDefault() }}>
        <DialogTitle>{t("Confirm your identity", "Confirmer votre identité")}</DialogTitle>
        <DialogDescription className="text-[var(--dash-text-soft)]">{t("Enter your password to continue. Your entries are retained; verification does not submit your changes.", "Saisissez votre mot de passe pour continuer. Vos valeurs sont conservées ; la vérification ne soumet pas vos modifications.")}</DialogDescription>
        <form onSubmit={verify} aria-busy={busy} className="grid gap-4">
          <label htmlFor={id}>{t("Password", "Mot de passe")}</label>
          <input ref={passwordInput} id={id} type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={event => setPassword(event.target.value)} disabled={busy || sessionExpired} className="dashboard-control min-h-11 w-full rounded px-3" aria-describedby={error ? `${id}-error` : undefined}/>
          {error && <p id={`${id}-error`} role="alert">{error}</p>}
          {sessionExpired && <a className="underline" href={localizePath("/login", locale)}>{t("Sign in", "Se connecter")}</a>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy || sessionExpired || !password} className="dashboard-button-primary min-h-11 px-4">{busy ? t("Verifying…", "Vérification…") : t("Verify password", "Vérifier le mot de passe")}</button>
            <button type="button" disabled={busy} onClick={() => close(false)} className="dashboard-button-secondary min-h-11 px-4">{t("Cancel", "Annuler")}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </>
  return { run, dialog, requestVerification }
}

/** A denied read contains no private data; refresh repeats the server's authorization checks. */
export function HrisFreshAuthGate({ locale }: { locale: "en" | "fr" }) {
  const router = useRouter()
  const recovery = useHrisFreshAuth(locale, "initial-read", () => router.refresh())
  return <section className="dashboard-landing-theme p-6" aria-label={locale === "fr" ? "Vérification requise" : "Verification required"}>
    <h1 className="text-xl font-semibold">{locale === "fr" ? "Confirmez votre identité pour continuer" : "Confirm your identity to continue"}</h1>
    <p className="my-4">{locale === "fr" ? "Une vérification récente est nécessaire pour consulter ce dossier RH." : "A recent password check is required to view this HR workspace."}</p>
    <button type="button" onClick={recovery.requestVerification} className="dashboard-button-primary min-h-11 px-4">{locale === "fr" ? "Vérifier le mot de passe" : "Verify password"}</button>
    {recovery.dialog}
  </section>
}
