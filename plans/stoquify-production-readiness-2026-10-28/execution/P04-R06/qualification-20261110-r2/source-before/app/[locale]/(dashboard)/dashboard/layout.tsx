import { getSession } from "@/lib/auth-server";
import Navbar from "@/components/dashboard/Navbar";
import Sidebar from "@/components/dashboard/Sidebar";
import { localizePath, pickLocale } from "@/i18n/routing";
import { RbacError, requireRbacContext } from "@/lib/security/rbac";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { getModuleNavigationSnapshot } from "@/services/modules/module-navigation.service";
import { headers } from "next/headers";
import { DASHBOARD_REQUEST_PATH_HEADER, dashboardLoginRecoveryHref } from "@/lib/security/dashboard-session-recovery";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const loginHref = async () => dashboardLoginRecoveryHref((await headers()).get(DASHBOARD_REQUEST_PATH_HEADER), locale)
  const session = await getSession()
  if (!session?.user) {
    redirect(await loginHref())
  }

  let rbacContext: Awaited<ReturnType<typeof requireRbacContext>>
  try {
    rbacContext = await requireRbacContext()
  } catch (error) {
    if (error instanceof RbacError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect(await loginHref())
      }
      if (error.code === "EMAIL_NOT_VERIFIED") {
        redirect(localizePath("/login?error=email-not-verified", locale))
      }
      if (error.code === "ACCOUNT_LOCKED") {
        redirect(localizePath("/forgot-password?error=account-locked", locale))
      }
      redirect(localizePath("/unauthorized", locale))
    }
    throw error
  }

  const shellSession = {
    ...session,
    user: {
      ...session.user,
      ...rbacContext.user,
      roles: rbacContext.roles,
      permissions: rbacContext.permissions,
      organizationId: rbacContext.orgId,
      organizationName: rbacContext.organizationName ?? rbacContext.user.organizationName,
      moduleNavigation: await getModuleNavigationSnapshot(rbacContext.orgId),
    },
  }

  return (
    <div className="dark min-h-screen w-full overflow-x-hidden [color-scheme:dark]">
      <a
        href="#dashboard-main-content"
        className="sr-only rounded-lg bg-[var(--product-surface)] font-semibold text-[var(--product-text)] focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:px-4 focus:py-3 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--product-brand-strong)]"
      >
        {locale === "fr" ? "Aller au contenu principal" : "Skip to main content"}
      </a>
      <Sidebar session={shellSession} />
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden md:pl-[220px] lg:pl-[280px]">
        <Navbar session={shellSession} />
        <main id="dashboard-main-content" tabIndex={-1} className="min-w-0 flex-1 scroll-mt-24 overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
