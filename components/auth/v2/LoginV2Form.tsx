"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { localizePath } from "@/i18n/routing"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import type { Locale } from "@/types/bilingual"
import type { LoginProps } from "@/types/types"
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useNotifications } from "../../notifications/NotificationProvider"

const copy = {
  en: {
    badge: "Protected workspace",
    title: "Sign in to your workspace.",
    subtitle: "Access operations, reports, approvals, and close evidence with role-aware controls.",
    email: "Email address",
    emailPlaceholder: "you@company.com",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    sharedDevice: "This is a shared or public device",
    forgot: "Forgot password?",
    submit: "Sign in securely",
    loading: "Checking access",
    newHere: "New to AqStoqFlow?",
    register: "Create workspace",
    helpTitle: "Need help?",
    inviteHelp: "Accept an invitation from your email link, or ask an owner to resend access.",
    verifyHelp: "If you just registered, verify your email before signing in.",
    secureNote: "Your access is protected by workspace scope, role permissions, and audit trails.",
    successTitle: "Signed in",
    successBody: "Workspace access verified.",
    errors: {
      emailRequired: "Email is required",
      emailInvalid: "Please enter a valid email address",
      passwordRequired: "Password is required",
      authFailed: "Authentication failed",
      unexpected: "Unable to sign in. Please try again.",
      connectionTitle: "Connection error",
      connectionBody: "Unable to reach the authentication service.",
      verificationTitle: "Verification required",
      verificationBody: "Please verify your email before accessing the workspace.",
    },
    showPassword: "Show password",
    hidePassword: "Hide password",
  },
  fr: {
    badge: "Espace protege",
    title: "Connectez-vous a votre espace.",
    subtitle: "Accedez aux operations, rapports, validations et preuves de cloture avec controles par role.",
    email: "Adresse email",
    emailPlaceholder: "vous@entreprise.com",
    password: "Mot de passe",
    passwordPlaceholder: "Entrez votre mot de passe",
    sharedDevice: "Ceci est un appareil partage ou public",
    forgot: "Mot de passe oublie ?",
    submit: "Se connecter",
    loading: "Verification",
    newHere: "Nouveau sur AqStoqFlow ?",
    register: "Creer un espace",
    helpTitle: "Besoin d'aide ?",
    inviteHelp: "Acceptez l'invitation depuis votre email ou demandez au proprietaire de renvoyer l'acces.",
    verifyHelp: "Si vous venez de vous inscrire, verifiez votre email avant la connexion.",
    secureNote: "Votre acces est protege par l'espace de travail, les permissions par role et les journaux d'audit.",
    successTitle: "Connexion reussie",
    successBody: "Acces a l'espace verifie.",
    errors: {
      emailRequired: "L'email est requis",
      emailInvalid: "Veuillez entrer une adresse email valide",
      passwordRequired: "Le mot de passe est requis",
      authFailed: "Authentification echouee",
      unexpected: "Connexion impossible. Veuillez reessayer.",
      connectionTitle: "Erreur de connexion",
      connectionBody: "Impossible de joindre le service d'authentification.",
      verificationTitle: "Verification requise",
      verificationBody: "Veuillez verifier votre email avant d'acceder a l'espace.",
    },
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
  },
} as const

const inputClass =
  "auth-input h-12 rounded-lg border-[#9fb4bb]/30 bg-white pl-11 text-[#132028] placeholder:text-[#7f969f] shadow-sm outline-none transition-all focus:border-[#178e83] focus:ring-4 focus:ring-[#178e83]/15 dark:border-white/10 dark:bg-[#0f171d] dark:text-white"

export function LoginV2Form({ locale }: { locale: Locale }) {
  const t = copy[locale]
  const params = useSearchParams()
  const { formError, formSuccess } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [sharedDevice, setSharedDevice] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginProps>()

  const emailValue = watch("email")
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue || "")
  const requestedReturnUrl = params.get("returnUrl") || params.get("callbackUrl")
  const returnUrl =
    requestedReturnUrl?.startsWith("/") && !requestedReturnUrl.startsWith("//")
      ? localizePath(requestedReturnUrl, locale)
      : localizePath("/dashboard", locale)

  useEffect(() => {
    if (params.get("registered") === "true") {
      formSuccess(t.successTitle, t.verifyHelp)
    }

    if (params.get("error") === "email-not-verified") {
      formError(t.errors.verificationTitle, t.errors.verificationBody)
    }
  }, [formError, formSuccess, params, t])

  const onSubmit = async (data: LoginProps) => {
    try {
      setLoading(true)
      const result = await authClient.signIn.email({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        rememberMe: !sharedDevice,
      })

      if (result.error) {
        formError(t.errors.authFailed, result.error.message || t.errors.unexpected)
        setLoading(false)
        return
      }

      formSuccess(t.successTitle, t.successBody)
      window.location.href = returnUrl
    } catch {
      formError(t.errors.connectionTitle, t.errors.connectionBody)
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[560px] rounded-lg border border-[#d9e1dc] bg-white p-5 shadow-[0_24px_80px_rgba(19,32,40,0.12)] sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#132028] text-white">
            <KeyRound className="h-5 w-5" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#178e83]">{t.badge}</p>
          <h1 className="mt-2 text-2xl font-black text-[#132028] sm:text-3xl">{t.title}</h1>
          <p className="mt-2 text-sm leading-6 text-[#53675f]">{t.subtitle}</p>
        </div>
        <span className="hidden rounded-lg border border-[#178e83]/25 bg-[#178e83]/10 px-3 py-2 text-xs font-black uppercase text-[#126f67] sm:inline-flex">
          RBAC
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email-v2" className="flex items-center gap-2 text-sm font-bold text-[#253943]">
            {t.email}
            {emailIsValid ? <CheckCircle2 className="h-4 w-4 text-[#2ec98a]" /> : null}
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" />
            <Input
              id="email-v2"
              type="email"
              placeholder={t.emailPlaceholder}
              className={cn(inputClass, errors.email && "border-[#ef6a6a] focus:border-[#ef6a6a] focus:ring-[#ef6a6a]/15")}
              {...register("email", {
                required: t.errors.emailRequired,
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t.errors.emailInvalid,
                },
              })}
            />
          </div>
          {errors.email ? <FieldError message={errors.email.message} /> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password-v2" className="text-sm font-bold text-[#253943]">
            {t.password}
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" />
            <Input
              id="password-v2"
              type={showPassword ? "text" : "password"}
              placeholder={t.passwordPlaceholder}
              className={cn(inputClass, "pr-12", errors.password && "border-[#ef6a6a] focus:border-[#ef6a6a] focus:ring-[#ef6a6a]/15")}
              {...register("password", { required: t.errors.passwordRequired })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#7f969f] transition hover:bg-[#edf5f2] hover:text-[#132028]"
              aria-label={showPassword ? t.hidePassword : t.showPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password ? <FieldError message={errors.password.message} /> : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#53675f]">
            <input
              type="checkbox"
              checked={sharedDevice}
              onChange={(event) => setSharedDevice(event.target.checked)}
              className="h-4 w-4 rounded border-[#9fb4bb]/50 text-[#178e83] focus:ring-[#178e83]/25"
            />
            {t.sharedDevice}
          </label>
          <Link href={localizePath("/forgot-password", locale)} className="text-sm font-black text-[#178e83] transition hover:text-[#126f67]">
            {t.forgot}
          </Link>
        </div>

        <Button type="submit" disabled={loading} className="h-12 w-full rounded-lg bg-[#132028] text-sm font-black text-white hover:bg-[#22323b]">
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

      <div className="mt-6 rounded-lg border border-[#178e83]/25 bg-[#edf8f5] p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#178e83]" />
          <p className="text-sm font-semibold leading-6 text-[#31515d]">{t.secureNote}</p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-[#d9e1dc] bg-[#f7faf8] p-4">
        <p className="text-sm font-black text-[#132028]">{t.helpTitle}</p>
        <p className="mt-2 text-sm leading-6 text-[#53675f]">{t.inviteHelp}</p>
        <p className="mt-1 text-sm leading-6 text-[#53675f]">{t.verifyHelp}</p>
      </div>

      <p className="mt-5 text-center text-sm text-[#53675f]">
        {t.newHere}{" "}
        <Link href={localizePath("/register-v2", locale)} className="font-black text-[#178e83] transition hover:text-[#126f67]">
          {t.register}
        </Link>
      </p>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1.5 text-sm font-semibold text-[#d44848]">
      <AlertCircle className="h-4 w-4" />
      {message}
    </p>
  )
}
