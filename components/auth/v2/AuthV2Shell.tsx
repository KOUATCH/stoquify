import { Link } from "@/i18n/navigation"
import StoquifyLogo from "@/components/global/kit-logo"
import type { Locale } from "@/types/bilingual"
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Globe2,
  Landmark,
  LockKeyhole,
  Radar,
  ShieldCheck,
  WifiOff,
} from "lucide-react"
import type { ReactNode } from "react"

type AuthV2ShellProps = {
  children: ReactNode
  locale: Locale
  variant: "login" | "register" | "verify" | "invite" | "recovery"
  alternatePath?: string
}

const shellCopy = {
  en: {
    brandSubtitle: "OHADA SMB Operating System",
    loginTitle: "Trusted access, not noisy marketing.",
    loginBody:
      "Sign in to the workspace that protects cash, stock, payroll, accounting, approvals, and close evidence.",
    registerTitle: "Create a workspace around your real business context.",
    registerBody:
      "Set country, business type, first branch, setup role, and recommended modules before the team starts operating.",
    verifyTitle: "Confirm your email address.",
    verifyBody:
      "Enter your verification code, then sign in. Your organization’s roles and permissions determine your workspace access.",
    inviteTitle: "Join your organization’s workspace.",
    inviteBody: "Complete your invited account, then sign in. Your organization manages your role and available actions.",
    invite: "Team invitation",
    recovery: "Account recovery",
    recoveryTitle: "Recover access to your account.",
    recoveryBody: "Use your recovery link to choose a new password, then sign in with your current workspace permissions.",
    backHome: "OHADA OS",
    trust: [
      "Tenant-scoped workspace",
      "Role-based permissions",
      "Audit trails for sensitive actions",
      "Source-linked reports",
      "Offline replay controls",
      "Close-ready evidence",
    ],
    status: [
      ["Workspace", "Protected"],
      ["Access", "RBAC"],
      ["Reports", "Source-linked"],
    ],
    language: "FR",
    login: "Sign in",
    register: "Create workspace",
    verify: "Verify email",
  },
  fr: {
    brandSubtitle: "Systeme d'exploitation PME OHADA",
    loginTitle: "Un acces fiable, sans surcharge marketing.",
    loginBody:
      "Connectez-vous a l'espace qui protege caisse, stock, paie, comptabilite, validations et preuves de cloture.",
    registerTitle: "Creez un espace adapte au contexte reel de l'entreprise.",
    registerBody:
      "Definissez pays, activite, premiere agence, role de configuration et modules recommandes avant l'exploitation.",
    verifyTitle: "Confirmez votre adresse email.",
    verifyBody:
      "Saisissez votre code de vérification, puis connectez-vous. Les rôles et les droits de votre organisation déterminent votre accès à l’espace.",
    inviteTitle: "Rejoignez l’espace de votre organisation.",
    inviteBody: "Complétez le compte invité, puis connectez-vous. Votre organisation gère votre rôle et les actions autorisées.",
    invite: "Invitation d’équipe",
    recovery: "Récupération du compte",
    recoveryTitle: "Récupérez l’accès à votre compte.",
    recoveryBody: "Utilisez votre lien de récupération pour choisir un nouveau mot de passe, puis connectez-vous avec vos droits d’accès actuels.",
    backHome: "OHADA OS",
    trust: [
      "Espace tenant securise",
      "Permissions par role",
      "Audit des actions sensibles",
      "Rapports rattaches aux sources",
      "Replay hors ligne controle",
      "Preuves pretes pour la cloture",
    ],
    status: [
      ["Espace", "Protege"],
      ["Acces", "RBAC"],
      ["Rapports", "Sources"],
    ],
    language: "EN",
    login: "Connexion",
    register: "Creer l'espace",
    verify: "Verifier l'email",
  },
} as const

const trustIcons = [LockKeyhole, ShieldCheck, Radar, Landmark, WifiOff, ClipboardCheck]

export function AuthV2Shell({ children, locale, variant, alternatePath }: AuthV2ShellProps) {
  const t = shellCopy[locale]
  const otherLocale = locale === "fr" ? "en" : "fr"
  const currentPath = alternatePath ?? (variant === "register" ? "/register-v2" : "/login-v2")
  const variantLabel = t[variant]
  const title = t[`${variant}Title`]
  const body = t[`${variant}Body`]

  return (
    <main className="min-h-screen bg-[#eef4f0] text-[#132028]">
      <div className="grid min-h-screen lg:grid-cols-[0.96fr_1.04fr]">
        <aside className="relative hidden overflow-hidden bg-[#132028] px-8 py-7 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(125,232,220,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(240,197,77,0.07)_1px,transparent_1px)] bg-[size:44px_44px]" />
          <div className="relative z-10 flex items-center justify-between">
            <Link href="/ohada-os" className="flex items-center gap-3">
              <StoquifyLogo theme="dark" width={236} height={52} tagline={t.brandSubtitle} />
            </Link>
            <Link
              href={currentPath}
              locale={otherLocale}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-black uppercase text-[#dbe7e2] transition hover:bg-white/8"
            >
              <Globe2 className="h-4 w-4" />
              {t.language}
            </Link>
          </div>

          <div className="relative z-10 mt-16 max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-[#7de8dc]/20 bg-[#7de8dc]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#9ff5ed]">
              <BadgeCheck className="h-4 w-4" />
              {variantLabel}
            </div>
            <h1 className="text-4xl font-black leading-tight xl:text-5xl">
              {title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-[#c9d7d1]">
              {body}
            </p>
          </div>

          <div className="relative z-10 mt-10 grid gap-3 sm:grid-cols-2">
            {t.trust.map((item, index) => {
              const Icon = trustIcons[index] ?? CheckCircle2
              return (
                <div key={item} className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
                  <Icon className="mb-4 h-5 w-5 text-[#7de8dc]" />
                  <p className="text-sm font-black leading-6">{item}</p>
                </div>
              )
            })}
          </div>

          <div className="relative z-10 mt-auto grid grid-cols-3 gap-3 pt-10">
            {t.status.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9fb4bb]">{label}</p>
                <p className="mt-3 text-xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </aside>

        <section className="flex min-h-screen min-w-0 flex-col">
          <header className="flex items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:hidden">
            <Link href="/ohada-os" className="flex min-w-0 flex-1 items-center gap-3">
              <StoquifyLogo theme="light" width={236} height={52} tagline={t.brandSubtitle} />
            </Link>
            <Link
              href={currentPath}
              locale={otherLocale}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#cbd8d1] bg-white px-3 py-2 text-xs font-black uppercase text-[#132028]"
            >
              <Globe2 className="h-4 w-4" />
              {t.language}
            </Link>
          </header>

          <div className="flex flex-1 items-start justify-center px-5 pb-10 pt-4 sm:px-8 lg:items-center lg:py-10">
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}
