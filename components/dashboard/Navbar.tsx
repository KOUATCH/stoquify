"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Activity,
  Bell,
  Building2,
  ChevronRight,
  ExternalLink,
  Globe2,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sun,
} from "lucide-react"

import { useShellPermissions } from "@/components/dashboard/useShellPermissions"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import UserDropdownMenu from "@/components/UserDropdownMenu"
import {
  filterSidebarLinksByPermission,
  findSidebarActiveContext,
  getDefaultSidebarLinks,
  flattenSidebarDestinations,
  getSidebarSections,
  isSidebarHrefActive,
  searchSidebarLinks,
  sidebarLinks,
} from "@/config/sidebar"
import { localizePath } from "@/i18n/routing"
import { signOut } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import Logo from "../global/Logo"

const OrganizationBanner = ({
  organizationName,
  organizationId,
  userRole,
}: {
  organizationName: string
  organizationId: string
  userRole: string
}) => {
  const shortOrgId = organizationId ? organizationId.slice(-6).toUpperCase() : "ORG"

  return (
    <div className="hidden min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] 2xl:flex">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(47,125,246,0.16)] text-[#8fb7ff]">
        <Building2 className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold text-white">{organizationName || "Organization"}</span>
          <span className="rounded-full bg-[rgba(45,212,191,0.14)] px-2 py-0.5 text-[0.66rem] font-bold uppercase tracking-[0.1em] text-[#7de8dc]">
            {userRole || "User"}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[0.68rem] font-medium text-[#8fa4ab]">
          <Activity className="h-3 w-3 text-[#2ec98a]" aria-hidden="true" />
          <span>Live</span>
          <span className="text-white/20">/</span>
          <span>{shortOrgId}</span>
        </div>
      </div>
    </div>
  )
}

const Navbar = ({ session }: { session: any }) => {
  const router = useRouter()
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [themeReady, setThemeReady] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSearchTerm, setMobileSearchTerm] = useState("")
  const [commandSearchTerm, setCommandSearchTerm] = useState("")
  const { hasPermission } = useShellPermissions(session)
  const userRole = session?.user?.roles?.[0]?.name ?? "User"
  const localePrefix = pathname.match(/^\/(en|fr)(?=\/)/)?.[1]
  const locale = localePrefix === "fr" ? "fr" : "en"
  const normalizedPath = localePrefix ? pathname.replace(`/${localePrefix}`, "") : pathname
  const localizedHref = (href: string) => {
    if (!href.startsWith("/")) {
      return href
    }

    return localizePath(href, locale)
  }
  const targetLocale = localePrefix === "fr" ? "en" : "fr"
  const pathWithoutLocale = pathname.replace(/^\/(en|fr)(?=\/)/, "") || "/dashboard"
  const targetLocaleHref = `/${targetLocale}${pathWithoutLocale}`
  const isDarkTheme = themeReady && resolvedTheme === "dark"

  useEffect(() => {
    setThemeReady(true)
  }, [])

  const filteredLinks = useMemo(
    () => filterSidebarLinksByPermission(sidebarLinks, hasPermission),
    [hasPermission],
  )

  const activeContext = useMemo(
    () => findSidebarActiveContext(filteredLinks, normalizedPath),
    [filteredLinks, normalizedPath],
  )

  const pathSegments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "en" && segment !== "fr")
  const fallbackSection = pathSegments[1] ?? pathSegments[0] ?? "dashboard"
  const fallbackPageTitle = fallbackSection
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
  const pageTitle = activeContext?.child?.title ?? activeContext?.link.title ?? fallbackPageTitle
  const breadcrumb = activeContext
    ? [activeContext.section.title, activeContext.link.title, activeContext.child?.title]
        .filter(Boolean)
        .join(" / ")
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
    try {
      await signOut()
      router.push(localizedHref("/login"))
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <header className="sticky top-0 z-20 isolate flex min-h-16 w-full max-w-full items-center gap-2 overflow-hidden border-b border-white/10 bg-[#142129]/90 px-2 shadow-[0_20px_45px_rgba(5,12,16,0.22)] backdrop-blur-xl sm:px-4 lg:h-[68px] lg:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),transparent)]" />
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="relative z-10 shrink-0 rounded-xl md:hidden">
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="dashboard-enterprise-sidebar flex flex-col border-white/10 p-0 text-[#d3ddd8]">
          <div className="relative z-10 flex h-full min-h-0 flex-col p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Logo href={localizedHref("/dashboard")} />
              <span className="rounded-full border border-white/10 bg-white/[0.055] px-2 py-1 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-[#8fb7ff]">
                {mobileSections.reduce((count, section) => count + section.links.length, 0)} modules
              </span>
            </div>

            <label className="relative mb-4 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]" aria-hidden="true" />
              <input
                value={mobileSearchTerm}
                onChange={(event) => setMobileSearchTerm(event.target.value)}
                placeholder="Search modules"
                aria-label="Search mobile navigation"
                className="h-11 w-full rounded-xl border border-white/10 bg-[#102027]/70 pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#7f969f] focus:border-[#5796ff]/70 focus:ring-2 focus:ring-[#2f7df6]/20"
              />
            </label>

            <nav aria-label="Mobile dashboard navigation" className="dashboard-sidebar-scroll grid gap-4 overflow-y-auto text-sm font-medium">
              {mobileSections.map((section) => (
                <section key={section.key} className="grid gap-1" aria-labelledby={`mobile-sidebar-section-${section.key}`}>
                  <div className="flex items-center justify-between px-1">
                    <span id={`mobile-sidebar-section-${section.key}`} className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#7f969f]">
                      {section.title}
                    </span>
                    <span className="text-[0.66rem] font-semibold text-[#647a83]" aria-hidden="true">
                      {section.links.length}
                    </span>
                  </div>
                  {section.links.map((link) => {
                    const Icon = link.icon
                    const destinations = link.dropdown && link.dropdownMenu?.length
                      ? link.dropdownMenu.map((item) => ({ title: item.title, href: item.href, permission: item.permission }))
                      : link.href
                        ? [{ title: link.title, href: link.href, permission: link.permission }]
                        : []

                    return destinations.map((item) => {
                      const isActive = isSidebarHrefActive(normalizedPath, item.href)

                      return (
                        <Link
                          key={`${link.title}-${item.href}`}
                          href={localizedHref(item.href)}
                          onClick={() => setMobileOpen(false)}
                          data-active={isActive ? "true" : "false"}
                          aria-current={isActive ? "page" : undefined}
                          title={link.dropdown ? `${link.title}: ${item.title}` : item.title}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[#b9c8c3] outline-none transition-all hover:bg-white/[0.075] hover:text-white focus-visible:ring-2 focus-visible:ring-[#5796ff]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b161b]",
                            isActive && "bg-[rgba(47,125,246,0.16)] text-white",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-[#8fb7ff]" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{item.title}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-[#7f969f]" aria-hidden="true" />
                        </Link>
                      )
                    })
                  })}
                </section>
              ))}
              {mobileSections.length === 0 ? (
                <div role="status" className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-4 text-center text-xs text-[#9fb4bb]">
                  No modules match your search.
                </div>
              ) : null}
            </nav>

            <div className="mt-auto pt-4">
              <Button onClick={handleLogout} size="sm" className="w-full rounded-xl">
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <div className="relative z-10 hidden min-w-0 sm:block sm:max-w-[15rem] xl:max-w-[20rem]">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(47,125,246,0.16)] text-[#8fb7ff] ring-1 ring-white/10">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <h1 className="truncate text-lg font-bold text-white">{pageTitle}</h1>
        </div>
        <p className="mt-0.5 truncate text-xs font-medium text-[#8fa4ab]">{breadcrumb}</p>
      </div>
      <OrganizationBanner organizationName={session?.user?.organizationName ?? ""} organizationId={session.user?.organizationId ?? ""} userRole={userRole} />
      <div className="relative z-10 hidden min-w-0 flex-1 lg:block xl:max-w-md 2xl:max-w-xl">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#49c6e5]" aria-hidden="true" />
          <input
            type="search"
            value={commandSearchTerm}
            onChange={(event) => setCommandSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && commandResults[0]) {
                router.push(localizedHref(commandResults[0].href))
                setCommandSearchTerm("")
              }
            }}
            placeholder="Search modules, actions, reports"
            aria-label="Search dashboard modules and actions"
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.055] pl-9 pr-3 text-sm text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] placeholder:text-[#8fa4ab] focus:border-[#5796ff]/70 focus:ring-2 focus:ring-[#2f7df6]/20"
          />
        </label>
        {commandSearchTerm.trim() ? (
          <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-white/10 bg-[#142129] p-1 shadow-[0_24px_64px_rgba(5,12,16,0.45)]">
            {commandResults.length ? (
              commandResults.map((item) => {
                const Icon = item.icon

                return (
                  <button
                    key={item.href}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      router.push(localizedHref(item.href))
                      setCommandSearchTerm("")
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#d3ddd8] transition hover:bg-white/[0.075] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5796ff]/70"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[#8fb7ff]" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{item.title}</span>
                      <span className="block truncate text-[0.7rem] text-[#8fa4ab]">{item.section.title} / {item.parentTitle}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#7f969f]" aria-hidden="true" />
                  </button>
                )
              })
            ) : (
              <div role="status" className="px-3 py-3 text-sm text-[#9fb4bb]">
                No matching modules found.
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="relative z-10 ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">

        <Link
          href="/"
          className="dashboard-top-button hidden h-10 w-10 items-center justify-center rounded-xl transition-all 2xl:flex"
          target="_blank"
          rel="noreferrer"
          aria-label="Open website"
        >
          <ExternalLink className="h-4 w-4 text-[#8fb7ff]" aria-hidden="true" />
        </Link>
        <Link
          href={targetLocaleHref}
          className="dashboard-top-button flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl px-0 text-sm font-semibold uppercase transition-all sm:w-auto sm:px-3"
          aria-label={`Switch language to ${targetLocale.toUpperCase()}`}
        >
          <Globe2 className="h-4 w-4 text-[#8fb7ff]" aria-hidden="true" />
          <span className="hidden sm:inline">{targetLocale}</span>
        </Link>
        <button
          type="button"
          onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
          className="dashboard-top-button flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl px-0 text-sm font-semibold transition-all 2xl:w-auto 2xl:px-3"
          aria-label={isDarkTheme ? "Switch to light theme" : "Switch to dark theme"}
        >
          {isDarkTheme ? (
            <Sun className="h-4 w-4 text-[#8fb7ff]" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4 text-[#8fb7ff]" aria-hidden="true" />
          )}
          <span className="hidden 2xl:inline">{isDarkTheme ? "Light" : "Dark"}</span>
        </button>
        <button
          type="button"
          className="dashboard-top-button relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-[#8fb7ff]" aria-hidden="true" />
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#ef6a6a] shadow-[0_0_0_4px_rgba(239,106,106,0.14)]" />
        </button>
        <UserDropdownMenu
          username={session?.user?.name ?? ""}
          email={session?.user?.email ?? ""}
          avatarUrl={
            session?.user?.image ??
            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20(54)-NX3G1KANQ2p4Gupgnvn94OQKsGYzyU.png"
          }
        />
      </div>
    </header>
  )
}

export default Navbar
