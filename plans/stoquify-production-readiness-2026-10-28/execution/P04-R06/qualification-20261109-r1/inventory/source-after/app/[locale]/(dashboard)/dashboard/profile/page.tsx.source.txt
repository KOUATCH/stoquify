import SelfProfile from "@/components/settings/SelfProfile"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { requireSession } from "@/lib/security/auth-session"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { localizePath, pickLocale } from "@/i18n/routing"

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = pickLocale((await params).locale)
  try {
    await requirePermission("profile.read", { resource: "SelfProfile" })
    const { ctx } = await requireSession()
    return <div className="dashboard-landing-theme dark min-h-screen"><div className="dashboard-landing-content mx-auto max-w-6xl px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8"><SelfProfile locale={locale} actorId={ctx.userId} organizationId={ctx.orgId} /></div></div>
  } catch (error) {
    if (!(error instanceof RbacError)) throw error
    return <DashboardRouteState kind="permission_denied" eyebrow={locale === "fr" ? "Accès requis" : "Access required"} title={locale === "fr" ? "Ce profil n’est pas disponible" : "This profile is unavailable"} message={locale === "fr" ? "Reconnectez-vous ou contactez votre administrateur pour vérifier vos accès." : "Sign in again or ask your administrator to review your access."} primaryHref={localizePath("/dashboard", locale)} primaryLabel={locale === "fr" ? "Retour au tableau de bord" : "Back to dashboard"} />
  }
}
