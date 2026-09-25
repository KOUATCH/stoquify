"use client"

import verifyOTP from "@/actions/users/verifyOtp"
import { resendVerificationCode } from "@/actions/users/resendVerificationCode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { localizePath } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import type { Locale } from "@/types/bilingual"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Loader2,
  LockKeyhole,
  MailCheck,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { FormEvent } from "react"
import { useRef, useState } from "react"
import { useNotifications } from "../../notifications/NotificationProvider"

const copy = {
  en: {
    badge: "Email verification",
    title: "Enter the 6-digit code.",
    subtitle: "Use the code from your verification email. If it has not arrived, request a code below.",
    emailFallback: "your registered email",
    codeLabel: "Verification code",
    submit: "Verify and continue",
    loading: "Verifying code",
    successTitle: "Email verified",
    successBody: "Email ownership is verified. Sign in to check your current workspace access.",
    continue: "Continue to sign in",
    login: "Back to sign in",
    register: "Create another workspace",
    trustTitle: "Why this step matters",
    trustBody:
      "Email verification comes before sign in. Your organization’s roles and permissions determine which operations you can perform.",
    helpTitle: "Need a new code?",
    helpBody:
      "Check spam first, then request a code using your registration email. If a password reset is underway, complete it first. Requests are limited to protect your account; wait before trying again.",
    resendEmail: "Registration email",
    resend: "Request verification code",
    resending: "Requesting code",
    resendRequested: "Request received. If this address matches an account awaiting verification, check its inbox. This does not confirm delivery; if no code arrives, wait before requesting again or contact your workspace owner.",
    controls: [
      ["Verified address", "Confirm that you control this email address."],
      ["Access permissions", "Sign in applies your roles and scope controls."],
      ["History", "Successful verification is recorded."],
    ],
    errors: {
      incomplete: "Enter all 6 digits before verifying.",
      invalid: "Invalid or expired code, or too many attempts. Check the code and wait before trying again.",
      networkTitle: "Verification failed",
      networkBody: "Unable to complete the request right now. Your entries are preserved. Please try again.",
    },
  },
  fr: {
    badge: "Vérification de l’email",
    title: "Saisissez le code à 6 chiffres.",
    subtitle: "Utilisez le code de votre email de vérification. Si vous ne l’avez pas reçu, demandez un code ci-dessous.",
    emailFallback: "votre email d’inscription",
    codeLabel: "Code de vérification",
    submit: "Vérifier et continuer",
    loading: "Vérification du code",
    successTitle: "Email vérifié",
    successBody: "Votre adresse email est vérifiée. Connectez-vous pour vérifier vos droits d’accès actuels.",
    continue: "Continuer vers la connexion",
    login: "Retour à la connexion",
    register: "Créer un autre espace",
    trustTitle: "Pourquoi cette étape compte",
    trustBody:
      "La vérification de l’adresse précède la connexion. Les rôles et les droits de votre organisation déterminent ensuite les opérations autorisées.",
    helpTitle: "Besoin d'un nouveau code ?",
    helpBody:
      "Vérifiez les indésirables, puis demandez un code avec votre email d’inscription. Terminez d’abord toute réinitialisation de mot de passe en cours. Les demandes sont limitées pour protéger votre compte ; patientez avant de réessayer.",
    resendEmail: "Email d’inscription",
    resend: "Demander un code de vérification",
    resending: "Demande du code",
    resendRequested: "Demande reçue. Si cette adresse correspond à un compte en attente de vérification, consultez sa boîte de réception. L’envoi n’est pas confirmé ; si aucun code n’arrive, patientez avant de réessayer ou contactez le propriétaire de votre espace.",
    controls: [
      ["Adresse vérifiée", "Confirmez que vous contrôlez cette adresse email."],
      ["Droits d’accès", "La connexion applique vos rôles et périmètres."],
      ["Historique", "La vérification réussie est enregistrée."],
    ],
    errors: {
      incomplete: "Saisissez les 6 chiffres avant de vérifier.",
      invalid: "Code invalide ou expiré, ou trop de tentatives. Vérifiez le code et patientez avant de réessayer.",
      networkTitle: "Vérification échouée",
      networkBody: "Impossible de terminer la demande maintenant. Vos données sont conservées. Veuillez réessayer.",
    },
  },
} as const

const otpSlotClass =
  "h-12 w-8 rounded-lg border border-[#cbd8d1] bg-white text-base font-black text-[#132028] shadow-sm transition-all first:rounded-lg first:border last:rounded-lg focus-visible:outline-none min-[384px]:w-10 sm:h-14 sm:w-12 sm:text-lg"

type VerifyV2FormProps = {
  locale: Locale
  userId: string
  email: string
}

export function VerifyV2Form({ locale, userId, email }: VerifyV2FormProps) {
  const t = copy[locale]
  const router = useRouter()
  const { success: notifySuccess, error: notifyError } = useNotifications()
  const [otpValue, setOtpValue] = useState("")
  const [otpError, setOtpError] = useState("")
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const [registrationEmail, setRegistrationEmail] = useState(email)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState("")
  const pendingAction = useRef(false)
  const loginHref = `${localizePath("/login-v2", locale)}?verified=true`
  const emailLabel = email || t.emailFallback

  const handleOtpChange = (value: string) => {
    const normalized = value.replace(/\D/g, "").slice(0, 6)
    setOtpValue(normalized)
    if (otpError) {
      setOtpError("")
    }
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pendingAction.current || verified) return

    if (otpValue.length !== 6) {
      setOtpError(t.errors.incomplete)
      return
    }

    try {
      pendingAction.current = true
      setLoading(true)
      const result = await verifyOTP(userId, otpValue)

      if (result.status !== 200) {
        setOtpError(t.errors.invalid)
        setLoading(false)
        pendingAction.current = false
        return
      }

      setVerified(true)
      notifySuccess(t.successTitle, t.successBody)
      window.setTimeout(() => router.push(loginHref), 900)
    } catch {
      notifyError(t.errors.networkTitle, t.errors.networkBody)
      setLoading(false)
      pendingAction.current = false
    }
  }

  const onResend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pendingAction.current || verified) return
    pendingAction.current = true
    setResending(true)
    setResendMessage("")
    try {
      await resendVerificationCode(userId, registrationEmail)
      setResendMessage(t.resendRequested)
    } catch {
      notifyError(t.errors.networkTitle, t.errors.networkBody)
    } finally {
      pendingAction.current = false
      setResending(false)
    }
  }

  return (
    <div className="min-w-0 w-full max-w-[620px] rounded-lg border border-[#d9e1dc] bg-white p-5 shadow-[0_24px_80px_rgba(19,32,40,0.12)] sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#132028] text-white">
            <MailCheck className="h-5 w-5" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#178e83]">{t.badge}</p>
          <h1 className="mt-2 text-2xl font-black text-[#132028] sm:text-3xl">{t.title}</h1>
          <p className="mt-2 text-sm leading-6 text-[#53675f]">{t.subtitle}</p>
        </div>
        <span className="hidden rounded-lg border border-[#f0c54d]/35 bg-[#fff8dd] px-3 py-2 text-xs font-black uppercase text-[#74581c] sm:inline-flex">
          OTP
        </span>
      </div>

      <div className="mb-6 rounded-lg border border-[#178e83]/25 bg-[#edf8f5] p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#178e83]" />
          <div>
            <p className="text-sm font-black text-[#132028]">{t.trustTitle}</p>
            <p className="mt-1 text-sm leading-6 text-[#31515d]">{t.trustBody}</p>
          </div>
        </div>
      </div>

      {verified ? (
        <div className="space-y-5">
          <div className="rounded-lg border border-[#2ec98a]/30 bg-[#f0fbf6] p-5 text-center">
            <CheckCircle2 className="mx-auto h-11 w-11 text-[#178e83]" />
            <h2 className="mt-4 text-xl font-black text-[#132028]">{t.successTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-[#53675f]">{t.successBody}</p>
          </div>
          <Button asChild className="h-12 w-full rounded-lg bg-[#132028] text-sm font-black text-white hover:bg-[#22323b]">
            <Link href={loginHref}>
              {t.continue}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6" aria-busy={loading}>
          <div className="rounded-lg border border-[#d9e1dc] bg-[#f7faf8] p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#53675f]">{t.codeLabel}</p>
            <p className="mt-2 break-all text-sm font-semibold text-[#132028]">{emailLabel}</p>
          </div>

          <div className="space-y-3">
            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={handleOtpChange}
              disabled={loading || resending}
              aria-label={t.codeLabel}
              aria-invalid={Boolean(otpError)}
              aria-describedby={otpError ? "verification-code-error" : undefined}
              containerClassName="justify-center gap-1 min-[384px]:gap-2 sm:gap-3"
            >
              <InputOTPGroup className="gap-1 min-[384px]:gap-2 sm:gap-3">
                <InputOTPSlot index={0} className={cn(otpSlotClass, otpError && "border-[#ef6a6a]")} />
                <InputOTPSlot index={1} className={cn(otpSlotClass, otpError && "border-[#ef6a6a]")} />
                <InputOTPSlot index={2} className={cn(otpSlotClass, otpError && "border-[#ef6a6a]")} />
              </InputOTPGroup>
              <InputOTPSeparator className="text-[#9fb4bb] [&_svg]:h-4 [&_svg]:w-4" />
              <InputOTPGroup className="gap-1 min-[384px]:gap-2 sm:gap-3">
                <InputOTPSlot index={3} className={cn(otpSlotClass, otpError && "border-[#ef6a6a]")} />
                <InputOTPSlot index={4} className={cn(otpSlotClass, otpError && "border-[#ef6a6a]")} />
                <InputOTPSlot index={5} className={cn(otpSlotClass, otpError && "border-[#ef6a6a]")} />
              </InputOTPGroup>
            </InputOTP>
            {otpError ? (
              <p id="verification-code-error" role="alert" className="flex items-center justify-center gap-1.5 text-sm font-semibold text-[#d44848]">
                <AlertCircle className="h-4 w-4" />
                {otpError}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={loading || resending || otpValue.length !== 6}
            className="h-12 w-full rounded-lg bg-[#132028] text-sm font-black text-white hover:bg-[#22323b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.loading}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {t.submit}
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {t.controls.map(([title, body], index) => {
          const Icon = index === 0 ? LockKeyhole : index === 1 ? ShieldCheck : Clock3
          return (
            <div key={title} className="rounded-lg border border-[#d9e1dc] bg-[#f7faf8] p-4">
              <Icon className="h-5 w-5 text-[#178e83]" />
              <p className="mt-3 text-sm font-black text-[#132028]">{title}</p>
              <p className="mt-2 text-xs leading-5 text-[#53675f]">{body}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-5 rounded-lg border border-[#f0c54d]/40 bg-[#fff8dd] p-4">
        <div className="flex gap-3">
          <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#8b6a20]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-[#132028]">{t.helpTitle}</p>
            <p className="mt-1 text-sm leading-6 text-[#6f5620]">{t.helpBody}</p>
            {!verified ? (
              <form onSubmit={onResend} className="mt-4 space-y-3" aria-busy={resending}>
                <label htmlFor="verification-resend-email" className="block text-sm font-semibold text-[#132028]">{t.resendEmail}</label>
                <Input id="verification-resend-email" type="email" autoComplete="email" required maxLength={254} value={registrationEmail} onChange={(event) => setRegistrationEmail(event.target.value)} disabled={loading || resending} className="bg-white text-[#132028]" />
                <Button type="submit" variant="outline" disabled={loading || resending} className="h-auto min-h-11 w-full whitespace-normal border-[#74581c] bg-white px-3 py-2 text-[#132028]">
                  {resending ? t.resending : t.resend}
                </Button>
                <p role="status" aria-live="polite" className="text-sm leading-6 text-[#6f5620]">{resendMessage}</p>
              </form>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center justify-center gap-2 text-sm text-[#53675f] sm:flex-row">
        <Link href={localizePath("/login-v2", locale)} className="font-black text-[#178e83] transition hover:text-[#126f67]">
          {t.login}
        </Link>
        <span className="hidden text-[#9fb4bb] sm:inline">/</span>
        <Link href={localizePath("/register-v2", locale)} className="font-black text-[#178e83] transition hover:text-[#126f67]">
          {t.register}
        </Link>
      </div>
    </div>
  )
}
