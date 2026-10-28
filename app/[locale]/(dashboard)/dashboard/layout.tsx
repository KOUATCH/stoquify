import { getSession } from "@/lib/auth-server";
import Navbar from "@/components/dashboard/Navbar";
import Sidebar from "@/components/dashboard/Sidebar";
import { localizePath, pickLocale } from "@/i18n/routing";
import { RbacError, requireRbacContext } from "@/lib/security/rbac";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const session = await getSession()
  if (!session?.user) {
    redirect(localizePath("/login", locale))
  }

  let rbacContext: Awaited<ReturnType<typeof requireRbacContext>>
  try {
    rbacContext = await requireRbacContext()
  } catch (error) {
    if (error instanceof RbacError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect(localizePath("/login", locale))
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
    },
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <Sidebar session={shellSession} />
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden md:pl-[220px] lg:pl-[280px]">
        <Navbar session={shellSession} />
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
