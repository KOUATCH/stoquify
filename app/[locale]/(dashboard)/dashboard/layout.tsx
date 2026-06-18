import { getSession } from "@/lib/auth-server";
import Navbar from "@/components/dashboard/Navbar";
import Sidebar from "@/components/dashboard/Sidebar";
import { localizePath, pickLocale } from "@/i18n/routing";
import { getOptionalRbacContext } from "@/lib/security/rbac";
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
  const rbacContext = await getOptionalRbacContext()
  const shellSession = rbacContext
    ? {
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
    : session

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
