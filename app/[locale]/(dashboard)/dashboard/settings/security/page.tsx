import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { localizePath, pickLocale } from "@/i18n/routing"
import { requireSession, revokeAllSessionsForUser } from "@/lib/security/auth-session"
import { permissionRisk, type PermissionRisk } from "@/lib/security/rbac-permissions"
import { getSecuritySettingsAccountState } from "@/services/security/security-settings.service"
import type { Locale } from "@/types/bilingual"
import {
  AlertTriangle,
  Clock3,
  KeyRound,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserCheck,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type { ReactNode } from "react"

export const metadata = {
  title: "Security Settings | StockFlow",
  description: "Review password, session, MFA readiness, and permission risk state.",
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

type SecurityPageProps = {
  params: Promise<{ locale: string }>
  searchParams?: SearchParams
}

const copy = {
  en: {
    title: "Security",
    subtitle: "Password, session, MFA readiness, and permission-risk visibility for this account.",
    password: "Password",
    sessions: "Sessions",
    mfa: "MFA readiness",
    permissionRisk: "Permission risk",
    currentSession: "Current session",
    activeSessions: "Active sessions",
    otherSessions: "Other sessions",
    changePassword: "Change password",
    revokeOthers: "Sign out other sessions",
    noOtherSessions: "No other active sessions",
    credentialReady: "Credential account present",
    credentialMissing: "Credential account not found",
    policy: "12 character minimum, Argon2id hashing, breach and history checks are enforced by the current password workflow.",
    passwordLastChanged: "Last recorded password change",
    notRecorded: "Not recorded",
    emailVerified: "Email verified",
    accountLocked: "Account locked",
    unlocked: "Account unlocked",
    lastLogin: "Last login",
    failedLogins: "Failed login attempts",
    currentExpires: "Current session expires",
    currentDevice: "Current user agent",
    mfaEnabled: "MFA enabled",
    mfaDisabled: "MFA not enrolled",
    mfaSchemaReady: "User records include MFA secret, enablement time, and backup-code fields.",
    mfaFlowMissing: "No finished enrollment or challenge route is connected yet, so this page does not expose an MFA toggle.",
    criticalNeedsMfa: "Critical or high-risk permissions are present. MFA enrollment should be completed before these actions are promoted.",
    noCriticalNeedsMfa: "No high or critical permissions were found in the current claim set.",
    roles: "Roles",
    permissions: "Permissions",
    claimsFetched: "RBAC claims fetched",
    noRiskPermissions: "No high-risk permissions found.",
    revoked: "Other active sessions revoked",
    sessionPolicy: "Current session state comes from BetterAuth plus the database session mirror.",
    readiness: "Readiness",
  },
  fr: {
    title: "Securite",
    subtitle: "Mot de passe, sessions, preparation MFA et risque permissions pour ce compte.",
    password: "Mot de passe",
    sessions: "Sessions",
    mfa: "Preparation MFA",
    permissionRisk: "Risque permissions",
    currentSession: "Session actuelle",
    activeSessions: "Sessions actives",
    otherSessions: "Autres sessions",
    changePassword: "Changer le mot de passe",
    revokeOthers: "Deconnecter les autres sessions",
    noOtherSessions: "Aucune autre session active",
    credentialReady: "Compte identifiants present",
    credentialMissing: "Compte identifiants introuvable",
    policy: "Minimum 12 caracteres, hachage Argon2id, controles fuite et historique sont appliques par le workflow actuel.",
    passwordLastChanged: "Dernier changement de mot de passe enregistre",
    notRecorded: "Non enregistre",
    emailVerified: "Email verifie",
    accountLocked: "Compte verrouille",
    unlocked: "Compte non verrouille",
    lastLogin: "Derniere connexion",
    failedLogins: "Tentatives echouees",
    currentExpires: "Expiration session actuelle",
    currentDevice: "Agent utilisateur actuel",
    mfaEnabled: "MFA active",
    mfaDisabled: "MFA non enrollee",
    mfaSchemaReady: "Les fiches utilisateur incluent secret MFA, date d'activation et codes de secours.",
    mfaFlowMissing: "Aucune route finale d'enrolement ou challenge n'est connectee, donc cette page n'expose pas de bascule MFA.",
    criticalNeedsMfa: "Des permissions critiques ou haut risque existent. L'enrolement MFA doit etre finalise avant promotion.",
    noCriticalNeedsMfa: "Aucune permission haute ou critique dans les claims actuels.",
    roles: "Roles",
    permissions: "Permissions",
    claimsFetched: "Claims RBAC recuperes",
    noRiskPermissions: "Aucune permission haut risque trouvee.",
    revoked: "Autres sessions actives revoquees",
    sessionPolicy: "L'etat de session vient de BetterAuth et du miroir de session en base.",
    readiness: "Preparation",
  },
} as const

function t(locale: Locale) {
  return copy[locale]
}

function formatDate(value: Date | string | number | null | undefined, locale: Locale) {
  if (!value) return t(locale).notRecorded
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t(locale).notRecorded
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function statusBadge(ok: boolean, label: string) {
  return (
    <Badge
      variant="outline"
      className={
        ok
          ? "border-[#2dd4bf]/35 bg-[rgba(45,212,191,0.12)] text-[#b5f5ee]"
          : "border-[#ef6a6a]/35 bg-[rgba(239,106,106,0.12)] text-[#ffc6c6]"
      }
    >
      {label}
    </Badge>
  )
}

function riskForPermission(permission: string): PermissionRisk {
  return permission === "*" ? "crit" : permissionRisk(permission)
}

function riskClass(risk: PermissionRisk) {
  if (risk === "crit") return "border-[#ef6a6a]/35 bg-[rgba(239,106,106,0.12)] text-[#ffc6c6]"
  if (risk === "high") return "border-[#f59e0b]/35 bg-[rgba(245,158,11,0.12)] text-[#ffd89a]"
  if (risk === "med") return "border-[#49c6e5]/35 bg-[rgba(73,198,229,0.12)] text-[#bdefff]"
  return "border-[#2dd4bf]/35 bg-[rgba(45,212,191,0.12)] text-[#b5f5ee]"
}

async function loadSecurityState(locale: Locale) {
  const verified = await requireSession()
  const { user, credentialAccount } = await getSecuritySettingsAccountState({
    userId: verified.ctx.userId,
    organizationId: verified.ctx.orgId,
  })

  if (!user) {
    redirect(localizePath("/login", locale))
  }

  const riskCounts: Record<PermissionRisk, number> = { low: 0, med: 0, high: 0, crit: 0 }
  const permissionsByRisk = verified.ctx.permissions
    .map((permission) => ({ permission, risk: riskForPermission(permission) }))
    .sort((a, b) => {
      const order: Record<PermissionRisk, number> = { crit: 0, high: 1, med: 2, low: 3 }
      return order[a.risk] - order[b.risk] || a.permission.localeCompare(b.permission)
    })

  for (const item of permissionsByRisk) {
    riskCounts[item.risk] += 1
  }

  const currentSession = user.sessions.find((session) => session.token === verified.claims.sessionToken)
  const otherSessionCount = user.sessions.filter((session) => session.token !== verified.claims.sessionToken).length

  return {
    verified,
    user,
    credentialAccount,
    currentSession,
    otherSessionCount,
    riskCounts,
    riskyPermissions: permissionsByRisk.filter((item) => item.risk === "crit" || item.risk === "high").slice(0, 12),
  }
}

async function revokeOtherSessionsAction(formData: FormData) {
  "use server"

  const locale = pickLocale(String(formData.get("locale") ?? "en"))
  const verified = await requireSession()
  const revoked = await revokeAllSessionsForUser({
    userId: verified.ctx.userId,
    organizationId: verified.ctx.orgId,
    actorUserId: verified.ctx.userId,
    exceptSessionToken: verified.claims.sessionToken,
    reason: "settings.security.revoke_other_sessions",
  })

  revalidatePath("/[locale]/dashboard/settings/security", "page")
  redirect(localizePath(`/dashboard/settings/security?revoked=${revoked}`, locale))
}

export default async function SecuritySettingsPage({ params, searchParams }: SecurityPageProps) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const labels = t(locale)
  const query = searchParams ? await searchParams : {}
  const revokedValue = Array.isArray(query.revoked) ? query.revoked[0] : query.revoked
  const revokedCount = revokedValue ? Number.parseInt(revokedValue, 10) : 0
  const state = await loadSecurityState(locale)
  const mfaEnabled = Boolean(state.user.mfaEnabledAt)
  const hasCriticalOrHigh = state.riskCounts.crit + state.riskCounts.high > 0
  const verifiedEmail = state.user.emailVerified || state.user.isVerified
  const rawSession = state.verified.raw?.session as
    | { expiresAt?: Date | string | null; userAgent?: string | null }
    | undefined
  const currentDevice = state.currentSession?.userAgent || rawSession?.userAgent || labels.notRecorded

  return (
    <div className="dashboard-landing-theme min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[88rem] min-w-0 flex-col gap-6 px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.8fr)]">
          <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-5 shadow-[0_18px_45px_rgba(5,12,16,0.18)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--dash-text-soft)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                  {labels.readiness}
                </div>
                <h1 className="mt-3 text-2xl font-semibold text-[var(--dash-text)] sm:text-3xl">{labels.title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--dash-text-soft)]">{labels.subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {statusBadge(verifiedEmail, labels.emailVerified)}
                {statusBadge(!state.user.isLocked, state.user.isLocked ? labels.accountLocked : labels.unlocked)}
              </div>
            </div>
            {revokedCount > 0 ? (
              <div className="mt-4 rounded-lg border border-[#2dd4bf]/30 bg-[rgba(45,212,191,0.12)] px-4 py-3 text-sm font-medium text-[#b5f5ee]">
                {labels.revoked}: {revokedCount}
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(47,125,246,0.16)] text-[#8fb7ff]">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--dash-text)]">{state.user.email}</p>
                <p className="text-xs text-[var(--dash-text-soft)]">{state.verified.ctx.organizationName}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Metric label={labels.lastLogin} value={formatDate(state.user.lastLogin, locale)} />
              <Metric label={labels.failedLogins} value={String(state.user.failedLoginAttempts)} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Panel title={labels.password} icon={KeyRound}>
            <div className="flex flex-wrap items-center gap-2">
              {statusBadge(Boolean(state.credentialAccount), state.credentialAccount ? labels.credentialReady : labels.credentialMissing)}
              <Badge variant="outline" className="border-white/10 bg-white/[0.055] text-[var(--dash-text-soft)]">
                Argon2id
              </Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--dash-text-soft)]">{labels.policy}</p>
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--dash-text-faint)]">
                {labels.passwordLastChanged}
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--dash-text)]">
                {formatDate(state.user.passwordHistory[0]?.createdAt, locale)}
              </p>
            </div>
            <div className="mt-5">
              <Button asChild className="rounded-lg bg-[#2563eb] text-white hover:bg-[#1f6feb]">
                <Link href={localizePath("/dashboard/change-password", locale)}>
                  <LockKeyhole className="h-4 w-4" />
                  {labels.changePassword}
                </Link>
              </Button>
            </div>
          </Panel>

          <Panel title={labels.sessions} icon={Smartphone}>
            <div className="grid grid-cols-2 gap-3">
              <Metric label={labels.activeSessions} value={String(state.user.sessions.length)} />
              <Metric label={labels.otherSessions} value={String(state.otherSessionCount)} />
            </div>
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--dash-text-faint)]">
                {labels.currentSession}
              </p>
              <div className="mt-3 grid gap-2 text-sm text-[var(--dash-text-soft)]">
                <p>
                  <span className="font-semibold text-[var(--dash-text)]">{labels.currentExpires}:</span>{" "}
                  {formatDate(state.currentSession?.expiresAt ?? rawSession?.expiresAt, locale)}
                </p>
                <p className="break-words">
                  <span className="font-semibold text-[var(--dash-text)]">{labels.currentDevice}:</span> {currentDevice}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--dash-text-soft)]">{labels.sessionPolicy}</p>
            <form action={revokeOtherSessionsAction} className="mt-5">
              <input type="hidden" name="locale" value={locale} />
              <Button
                type="submit"
                variant="outline"
                disabled={state.otherSessionCount === 0}
                className="rounded-lg border-[#ef6a6a]/30 bg-[rgba(239,106,106,0.08)] text-[#ffc6c6] hover:bg-[rgba(239,106,106,0.14)]"
              >
                <ShieldAlert className="h-4 w-4" />
                {state.otherSessionCount === 0 ? labels.noOtherSessions : labels.revokeOthers}
              </Button>
            </form>
          </Panel>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <Panel title={labels.mfa} icon={ShieldCheck}>
            <div className="flex flex-wrap items-center gap-2">
              {statusBadge(mfaEnabled, mfaEnabled ? labels.mfaEnabled : labels.mfaDisabled)}
              <Badge variant="outline" className="border-white/10 bg-white/[0.055] text-[var(--dash-text-soft)]">
                {state.user.mfaBackupCodes.length} backup codes
              </Badge>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--dash-text-soft)]">
              <p>{labels.mfaSchemaReady}</p>
              <p>{labels.mfaFlowMissing}</p>
              <p className={hasCriticalOrHigh && !mfaEnabled ? "text-[#ffd89a]" : ""}>
                {hasCriticalOrHigh ? labels.criticalNeedsMfa : labels.noCriticalNeedsMfa}
              </p>
            </div>
          </Panel>

          <Panel title={labels.permissionRisk} icon={AlertTriangle}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["crit", "high", "med", "low"] as PermissionRisk[]).map((risk) => (
                <div key={risk} className={`rounded-lg border p-3 ${riskClass(risk)}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">{risk}</p>
                  <p className="mt-2 text-2xl font-semibold">{state.riskCounts[risk]}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {state.verified.ctx.roles.map((role) => (
                <Badge key={role.id} variant="outline" className="border-white/10 bg-white/[0.055] text-[var(--dash-text)]">
                  {role.name}
                </Badge>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--dash-text-faint)]">
                <Clock3 className="h-3.5 w-3.5" />
                {labels.claimsFetched}: {formatDate(state.verified.ctx.fetchedAt, locale)}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {state.riskyPermissions.length > 0 ? (
                  state.riskyPermissions.map((item) => (
                    <Badge key={item.permission} variant="outline" className={riskClass(item.risk)}>
                      {item.permission}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-[var(--dash-text-soft)]">{labels.noRiskPermissions}</p>
                )}
              </div>
            </div>
          </Panel>
        </section>
      </div>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-5 shadow-[0_14px_36px_rgba(5,12,16,0.14)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(47,125,246,0.16)] text-[#8fb7ff]">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--dash-text)]">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--dash-text-faint)]">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-[var(--dash-text)]">{value}</p>
    </div>
  )
}
