"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  Bell,
  Building2,
  ExternalLink,
  Menu,
  Search,
} from "lucide-react"

import { useShellPermissions } from "@/components/dashboard/useShellPermissions"
import { BusinessRecordSearch } from "@/components/dashboard/BusinessRecordSearch"
import { DashboardLanguageLink } from "@/components/dashboard/DashboardLanguageLink"
import { DashboardMobileNavigation } from "@/components/dashboard/DashboardMobileNavigation"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import UserDropdownMenu from "@/components/UserDropdownMenu"
import {
  filterSidebarLinksByPermission,
  findSidebarActiveContext,
  getDefaultSidebarLinks,
  flattenSidebarDestinations,
  getSidebarSections,
  searchSidebarLinks,
  sidebarLinks,
} from "@/config/sidebar"
import { localizePath } from "@/i18n/routing"
import { signOut } from "@/lib/auth-client"
import { dashboardSharedCopy, localizeSidebarLinks, navigationLabel } from "@/lib/dashboard/presentation"
import { selfSignOutCopy } from "@/lib/security/self-sign-out-copy"
import { notificationCopy } from "@/lib/notifications/presentation"
import { dashboardRoleLabel } from "@/lib/dashboard/role-label"
import { cn } from "@/lib/utils"
import Logo from "../global/Logo"

const OrganizationBanner = ({
  organizationName,
  organizationId,
  userRole,
  locale,
}: {
  organizationName: string
  organizationId: string
  userRole: string
  locale: "en" | "fr"
}) => {
  const copy = dashboardSharedCopy[locale].shell
  const shortOrgId = organizationId ? organizationId.slice(-6).toUpperCase() : "ORG"

  return (
    <div className="hidden min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] 2xl:flex">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(47,125,246,0.16)] text-[#8fb7ff]">
        <Building2 className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold text-white">{organizationName || copy.organization}</span>
          <span className="rounded-full bg-[rgba(45,212,191,0.14)] px-2 py-0.5 text-[0.66rem] font-bold uppercase tracking-[0.1em] text-[#7de8dc]">
            {userRole || copy.user}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[0.68rem] font-medium text-[#8fa4ab]">
          <Activity className="h-3 w-3 text-[#2ec98a]" aria-hidden="true" />
          <span>{copy.session}</span>
          <span className="text-white/20">/</span>
          <span>{shortOrgId}</span>
        </div>
      </div>
    </div>
  )
}

import { moduleVisibleInNavigation } from "@/lib/modules/navigation"

const Navbar = ({ session }: { session: any }) => {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSearchTerm, setMobileSearchTerm] = useState("")
  const [commandSearchTerm, setCommandSearchTerm] = useState("")
  const [signingOut, setSigningOut] = useState(false)
  const [signOutFailed, setSignOutFailed] = useState(false)
  const signOutLock = useRef(false)
  const { hasPermission } = useShellPermissions(session)
  const { soundEnabled, toggleSound } = useNotifications()
  const localePrefix = pathname.match(/^\/(en|fr)(?=\/)/)?.[1]
  const locale = localePrefix === "fr" ? "fr" : "en"
  const userRole = dashboardRoleLabel(session?.user?.roles?.[0], locale)
  const copy = dashboardSharedCopy[locale].shell
  const label = (text: string) => navigationLabel(text, locale)
  const signOutText = selfSignOutCopy[locale]
  const normalizedPath = localePrefix ? pathname.replace(`/${localePrefix}`, "") : pathname
  const searchAuthority = JSON.stringify([session?.user?.id, session?.user?.organizationId, session?.user?.permissions, session?.user?.roles, session?.user?.moduleNavigation])
  useEffect(() => { setCommandSearchTerm("") }, [searchAuthority])
  const localizedHref = (href: string) => {
    if (!href.startsWith("/")) {
      return href
    }

    return localizePath(href, locale)
  }
  const filteredLinks = useMemo(
    () => localizeSidebarLinks(filterSidebarLinksByPermission(sidebarLinks, hasPermission, (item) => moduleVisibleInNavigation(session?.user?.moduleNavigation, item)), locale),
    [hasPermission, session?.user?.moduleNavigation, locale],
  )

  const activeContext = useMemo(
    () => findSidebarActiveContext(filteredLinks, normalizedPath),
    [filteredLinks, normalizedPath],
  )

  const activeHref = activeContext?.child?.href ?? activeContext?.link.href

  const pathSegments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "en" && segment !== "fr")
  const fallbackSection = pathSegments[1] ?? pathSegments[0] ?? "dashboard"
  const fallbackPageTitle = normalizedPath === "/dashboard/purchases/payables/history" ? label("AP History") : fallbackSection
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
  const pageTitle = normalizedPath === "/dashboard/access-requests" ? label("Access requests") : activeContext?.child?.title ?? activeContext?.link.title ?? fallbackPageTitle
  const breadcrumb = normalizedPath === "/dashboard/access-requests" ? pageTitle : activeContext
    ? [label(activeContext.section.title), activeContext.link.title, activeContext.child?.title]
        .filter(Boolean)
        .join(" / ")
    : normalizedPath === "/dashboard/purchases/payables/history"
      ? [label("Dashboard"), label("Purchases"), label("Payables"), label("AP History")].join(" / ")
      : pathSegments.slice(0, 3).join(" / ") || "dashboard"

  const allDestinations = useMemo(
    () => flattenSidebarDestinations(filteredLinks),
    [filteredLinks],
  )


  const commandResults = useMemo(() => {
    const query = commandSearchTerm.trim().toLowerCase()

    if (!query) {
      return []
    }

    return allDestinations
      .filter((item) =>
        item.title.toLowerCase().includes(query) ||
        item.parentTitle.toLowerCase().includes(query) ||
        item.section.title.toLowerCase().includes(query) ||
        Boolean(item.moduleSlug?.toLowerCase().includes(query)),
      )
      .slice(0, 7)
  }, [allDestinations, commandSearchTerm])

  const isMobileSearching = mobileSearchTerm.trim().length > 0

  const mobileNavigationLinks = useMemo(
    () =>
      isMobileSearching
        ? searchSidebarLinks(filteredLinks, mobileSearchTerm)
        : getDefaultSidebarLinks(filteredLinks, normalizedPath),
    [filteredLinks, isMobileSearching, mobileSearchTerm, normalizedPath],
  )

  const mobileSections = useMemo(
    () => getSidebarSections(mobileNavigationLinks),
    [mobileNavigationLinks],
  )

  const handleLogout = async () => {
    if (signOutLock.current) return
    signOutLock.current = true
    setSigningOut(true)
    setSignOutFailed(false)
    try {
      await signOut()
    } catch {
      setSignOutFailed(true)
    } finally {
      signOutLock.current = false
      setSigningOut(false)
    }
  }

  return (
    <header className="dashboard-enterprise-toolbar sticky top-0 z-20 isolate flex min-h-16 w-full max-w-full flex-wrap items-center gap-2 border-b border-[var(--product-border-subtle)] bg-[var(--product-chrome)] px-2 py-2 text-[var(--product-text)] sm:px-4 lg:px-5">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="dashboard-top-button relative z-10 shrink-0 rounded-xl md:hidden">
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">{locale === "fr" ? "Ouvrir le menu de navigation" : "Toggle navigation menu"}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" closeLabel={locale === "fr" ? "Fermer la navigation" : "Close navigation"} className="dashboard-enterprise-sidebar flex w-[calc(100vw-1rem)] flex-col border-white/10 p-0 text-[#d3ddd8]">
          <SheetTitle className="sr-only">{locale === "fr" ? "Navigation de l’espace de travail" : "Workspace navigation"}</SheetTitle>
          <SheetDescription className="sr-only">{locale === "fr" ? "Recherchez une destination ou déconnectez votre session actuelle." : "Find a destination or sign out of your current session."}</SheetDescription>
          <div className="relative z-10 flex h-full min-h-0 flex-col p-4">
            <div className="mb-4 flex flex-wrap items-center gap-3 pr-8">
              <Logo variant="dark" href={localizedHref("/dashboard")} />
              <span className="max-w-full break-words rounded-full border border-white/10 bg-white/[0.055] px-2 py-1 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-[#8fb7ff]">
                {mobileSections.reduce((count, section) => count + section.links.length, 0)} modules
              </span>
            </div>

            <label className="relative mb-4 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" aria-hidden="true" />
              <input
                value={mobileSearchTerm}
                onChange={(event) => setMobileSearchTerm(event.target.value)}
                placeholder={locale === "fr" ? "Rechercher des modules" : "Search modules"}
                aria-label={locale === "fr" ? "Rechercher dans la navigation mobile" : "Search mobile navigation"}
                className="h-11 w-full rounded-xl border border-white/10 bg-[#102027]/70 pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#7f969f] focus:border-[#5796ff]/70 focus:ring-2 focus:ring-[#2f7df6]/20"
              />
            </label>

            <DashboardMobileNavigation sections={mobileSections} locale={locale} activeHref={activeHref}
              pathname={normalizedPath} searching={isMobileSearching} onNavigate={() => setMobileOpen(false)} />

            <div className="mt-auto shrink-0 pt-4">
              <Button onClick={handleLogout} disabled={signingOut} size="sm" className="h-auto min-h-11 w-full whitespace-normal rounded-xl py-2">
                {signingOut ? signOutText.pending : signOutText.label}
              </Button>
              {signOutFailed && <p role="alert" className="mt-2 text-sm">{signOutText.failed}</p>}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <div className="relative z-10 hidden min-w-0 sm:block sm:max-w-[15rem] xl:max-w-[20rem]">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-[var(--product-text)]" title={pageTitle}>{pageTitle}</p>
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--product-text-soft)]" title={breadcrumb}>{breadcrumb}</p>
      </div>
      <OrganizationBanner locale={locale} organizationName={session?.user?.organizationName ?? ""} organizationId={session.user?.organizationId ?? ""} userRole={userRole} />
      <div className="relative z-10 order-last w-full min-w-0 lg:order-none lg:w-auto lg:flex-1 xl:max-w-md 2xl:max-w-xl">
        <BusinessRecordSearch query={commandSearchTerm} onQueryChange={setCommandSearchTerm}
          locale={locale} authority={searchAuthority}
          pages={commandResults.map(item => ({ href: item.href, title: item.title, context: `${label(item.section.title)} / ${item.parentTitle}` }))} />
      </div>

      <div className="relative z-10 ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1 sm:gap-2">

        <Link
          href="/"
          className="dashboard-top-button hidden h-10 w-10 items-center justify-center rounded-xl transition-all 2xl:flex"
          target="_blank"
          rel="noreferrer"
          aria-label={copy.website}
        >
          <ExternalLink className="h-4 w-4 text-[#8fb7ff]" aria-hidden="true" />
        </Link>
        <DashboardLanguageLink locale={locale} />
        <button
          type="button"
          onClick={toggleSound}
          className="dashboard-top-button relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all"
          aria-label={soundEnabled ? notificationCopy[locale].disableSound : notificationCopy[locale].enableSound}
          aria-pressed={soundEnabled}
        >
          <Bell className="h-5 w-5 text-[#8fb7ff]" aria-hidden="true" />
          <span
            aria-hidden="true"
            className={cn(
              "absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full",
              soundEnabled
                ? "bg-[#2ec98a] shadow-[0_0_0_4px_rgba(46,201,138,0.14)]"
                : "bg-[#7f969f] shadow-[0_0_0_4px_rgba(127,150,159,0.12)]",
            )}
          />
        </button>
        <UserDropdownMenu
          fixedDarkAppearance
          canChangePassword={hasPermission("profile.password.update")}
          username={session?.user?.name ?? ""}
          email={session?.user?.email ?? ""}
          avatarUrl={session?.user?.image ?? undefined}
          organizationName={session?.user?.organizationName ?? undefined}
          roleNames={session?.user?.roles?.map((role: { name: string; nameEn?: string; nameFr?: string }) => dashboardRoleLabel(role, locale)) ?? []}
        />
      </div>
    </header>
  )
}

export default Navbar
