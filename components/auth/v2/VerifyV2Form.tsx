"use client"

import verifyOTP from "@/actions/users/verifyOtp"
import { Button } from "@/components/ui/button"
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
import { useState } from "react"
import { useNotifications } from "../../notifications/NotificationProvider"

const copy = {
  en: {
    badge: "Email verification",
    title: "Enter the 6-digit code.",
    subtitle: "We sent a verification code to the email address used for this workspace setup.",
    emailFallback: "your registered email",
    codeLabel: "Verification code",
    submit: "Verify and continue",
    loading: "Verifying code",
    successTitle: "Email verified",
    successBody: "The account is active. Redirecting to secure sign in.",
    continue: "Continue to sign in",
    login: "Back to sign in",
    register: "Create another workspace",
    trustTitle: "Why this step matters",
    trustBody:
      "Verification prevents untrusted access before roles, tenant data, cash controls, stock operations, payroll, and reports are opened.",
    helpTitle: "Need a new code?",
    helpBody:
      "Check spam or promotions first. If the code expired, restart registration or ask the workspace owner or implementation lead to resend access.",
    controls: [
      ["Tenant activation", "Only a verified account can enter the workspace."],
      ["RBAC-ready access", "The next sign in applies role and scope controls."],
      ["Auditable onboarding", "Verification is recorded before operations begin."],
    ],
    errors: {
      incomplete: "Enter all 6 digits before verifying.",
      invalid: "Invalid verification code. Please check the email and try again.",
      networkTitle: "Verification failed",
      networkBody: "Unable to verify the code right now. Please try again.",
    },
  },
  fr: {
    badge: "Verification email",
    title: "Saisissez le code a 6 chiffres.",
    subtitle: "Nous avons envoye un code de verification a l'email utilise pour creer l'espace.",
    emailFallback: "votre email enregistre",
    codeLabel: "Code de verification",
    submit: "Verifier et continuer",
    loading: "Verification du code",
    successTitle: "Email verifie",
    successBody: "Le compte est actif. Redirection vers la connexion securisee.",
    continue: "Continuer vers la connexion",
    login: "Retour a la connexion",
    register: "Creer un autre espace",
    trustTitle: "Pourquoi cette etape compte",
    trustBody:
      "La verification bloque les acces non fiables avant l'ouverture des roles, donnees tenant, controles caisse, stock, paie et rapports.",
    helpTitle: "Besoin d'un nouveau code ?",
    helpBody:
      "Verifiez d'abord les spams ou promotions. Si le code a expire, recommencez l'inscription ou demandez au proprietaire de renvoyer l'acces.",
    controls: [
      ["Activation tenant", "Seul un compte verifie peut entrer dans l'espace."],
      ["Acces pret RBAC", "La prochaine connexion applique les roles et scopes."],
      ["Onboarding auditable", "La verification est tracee avant l'exploitation."],
    ],
    errors: {
      incomplete: "Saisissez les 6 chiffres avant de verifier.",
      invalid: "Code de verification invalide. Verifiez l'email et reessayez.",
      networkTitle: "Verification echouee",
      networkBody: "Impossible de verifier le code maintenant. Veuillez reessayer.",
    },
  },
} as const

const otpSlotClass =
  "h-12 w-10 rounded-lg border border-[#cbd8d1] bg-white text-base font-black text-[#132028] shadow-sm transition-all first:rounded-lg first:border last:rounded-lg focus-visible:outline-none sm:h-14 sm:w-12 sm:text-lg"

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

    if (otpValue.length !== 6) {
      setOtpError(t.errors.incomplete)
      return
    }

    try {
      setLoading(true)
      const result = await verifyOTP(userId, otpValue)

      if (result.status !== 200) {
        setOtpError(t.errors.invalid)
        setLoading(false)
        return
      }

      setVerified(true)
      notifySuccess(t.successTitle, t.successBody)
      window.setTimeout(() => router.push(loginHref), 900)
    } catch {
      notifyError(t.errors.networkTitle, t.errors.networkBody)
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[620px] rounded-lg border border-[#d9e1dc] bg-white p-5 shadow-[0_24px_80px_rgba(19,32,40,0.12)] sm:p-7">
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
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="rounded-lg border border-[#d9e1dc] bg-[#f7faf8] p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#53675f]">{t.codeLabel}</p>
            <p className="mt-2 break-all text-sm font-semibold text-[#132028]">{emailLabel}</p>
          </div>

          <div className="space-y-3">
            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={handleOtpChange}
              disabled={loading}
              containerClassName="justify-center gap-2 sm:gap-3"
            >
              <InputOTPGroup className="gap-2 sm:gap-3">
                <InputOTPSlot index={0} className={cn(otpSlotClass, otpError && "border-[#ef6a6a]")} />
                <InputOTPSlot index={1} className={cn(otpSlotClass, otpError && "border-[#ef6a6a]")} />
                <InputOTPSlot index={2} className={cn(otpSlotClass, otpError && "border-[#ef6a6a]")} />
              </InputOTPGroup>
              <InputOTPSeparator className="text-[#9fb4bb]" />
              <InputOTPGroup className="gap-2 sm:gap-3">
                <InputOTPSlot index={3} className={cn(otpSlotClass, otpError && "border-[#ef6a6a]")} />
                <InputOTPSlot index={4} className={cn(otpSlotClass, otpError && "border-[#ef6a6a]")} />
                <InputOTPSlot index={5} className={cn(otpSlotClass, otpError && "border-[#ef6a6a]")} />
              </InputOTPGroup>
            </InputOTP>
            {otpError ? (
              <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-[#d44848]">
                <AlertCircle className="h-4 w-4" />
                {otpError}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={loading || otpValue.length !== 6}
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
          <div>
            <p className="text-sm font-black text-[#132028]">{t.helpTitle}</p>
            <p className="mt-1 text-sm leading-6 text-[#6f5620]">{t.helpBody}</p>
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
