"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  filterSidebarLinksByPermission,
  getDefaultSidebarLinks,
  getSidebarSections,
  findSidebarActiveContext,
  searchSidebarLinks,
  sidebarLinks,
} from "@/config/sidebar"
import { localizePath } from "@/i18n/routing"
import { signOut } from "@/lib/auth-client"
import { dashboardSharedCopy, localizeSidebarLinks, navigationLabel } from "@/lib/dashboard/presentation"
import { selfSignOutCopy } from "@/lib/security/self-sign-out-copy"
import { cn } from "@/lib/utils"
import { useShellPermissions } from "@/components/dashboard/useShellPermissions"
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Crown,
  LogOut,
  Search,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { NotificationMenu } from "../NotificationMenu"
import StoquifyLogo from "../global/kit-logo"
import { moduleVisibleInNavigation } from "@/lib/modules/navigation"
import { dashboardRoleLabel } from "@/lib/dashboard/role-label"

interface SidebarProps {
  session: any
  notifications?: Notification[]
}

function toSidebarDomId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item"
}

const Sidebar = ({ session, notifications = [] }: SidebarProps) => {
  const [signingOut, setSigningOut] = useState(false)
  const [signOutFailed, setSignOutFailed] = useState(false)
  const signOutLock = useRef(false)
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState("")
  const pathname = usePathname()
  const { hasPermission } = useShellPermissions(session)
  const organizationName = session?.user?.organizationName ?? "Stoquify"
  const localePrefix = pathname.match(/^\/(en|fr)(?=\/)/)?.[1]
  const locale = localePrefix === "fr" ? "fr" : "en"
  const userRole = dashboardRoleLabel(session?.user?.roles?.[0], locale)
  const copy = dashboardSharedCopy[locale].shell
  const label = (text: string) => navigationLabel(text, locale)
  const signOutText = selfSignOutCopy[locale]
  const normalizedPath = localePrefix ? pathname.replace(`/${localePrefix}`, "") : pathname

  const localizedHref = (href: string) => {
    if (!href.startsWith("/")) {
      return href
    }

    return localizePath(href, locale)
  }

  // Resolve selection from all authorized links, not the current search result subset.

  const filteredLinks = useMemo(
    () => localizeSidebarLinks(filterSidebarLinksByPermission(sidebarLinks, hasPermission, (item) => moduleVisibleInNavigation(session?.user?.moduleNavigation, item)), locale),
    [hasPermission, session?.user?.moduleNavigation, locale],
  )

  const activeContext = useMemo(
    () => findSidebarActiveContext(filteredLinks, normalizedPath),
    [filteredLinks, normalizedPath],
  )
  const activeHref = activeContext?.child?.href ?? activeContext?.link.href
  const isActiveHref = (href?: string) => Boolean(href && href === activeHref)

  useEffect(() => {
    setOpenDropdownKey(undefined)
  }, [normalizedPath])

  const isSearching = searchTerm.trim().length > 0

  const defaultLinks = useMemo(
    () => getDefaultSidebarLinks(filteredLinks, normalizedPath),
    [filteredLinks, normalizedPath],
  )

  const visibleLinks = useMemo(
    () => (isSearching ? searchSidebarLinks(filteredLinks, searchTerm) : defaultLinks),
    [defaultLinks, filteredLinks, isSearching, searchTerm],
  )

  const visibleSections = useMemo(
    () => getSidebarSections(visibleLinks),
    [visibleLinks],
  )

  async function handleLogout() {
    if (signOutLock.current) return
    signOutLock.current = true
    setSigningOut(true)
    setSignOutFailed(false)
    try {
      await signOut({
        redirectTo: localizedHref("/login"),
        redirect: true,
      })
    } catch {
      setSignOutFailed(true)
    } finally {
      signOutLock.current = false
      setSigningOut(false)
    }
  }

  const userInitials = (session?.user?.name ?? "User")
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside
      aria-label={copy.navigation}
      className="dashboard-enterprise-sidebar fixed left-0 top-0 z-30 hidden h-full w-[220px] overflow-hidden border-r md:block lg:w-[280px]"
    >
      <div className="relative z-10 flex h-full max-h-screen flex-col">
        <div className="border-b border-white/10 px-4 py-4 lg:px-5">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={localizedHref("/dashboard")}
              aria-label={copy.home}
              className="group flex min-w-0 items-center gap-3"
            >
              <StoquifyLogo theme="dark" width={180} height={52} tagline="Enterprise OS" />
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.055]">
              <NotificationMenu notifications={notifications} />
            </div>
          </div>

          <div className="mt-3 border-t border-[var(--dash-border-subtle)] pt-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(47,125,246,0.16)] text-[#8fb7ff]">
                <Crown className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{organizationName}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full bg-[rgba(45,212,191,0.14)] px-2 py-0.5 text-[0.66rem] font-bold uppercase tracking-[0.1em] text-[#7de8dc]">
                    {userRole}
                  </span>
                  <span className="flex items-center gap-1 text-[0.68rem] font-medium text-[#9fb4bb]">
                    <Activity className="h-3 w-3 text-[#2ec98a]" aria-hidden="true" />
                    {copy.session}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 lg:px-5">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]"
              aria-hidden="true"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={copy.searchModules}
              aria-label={copy.searchNavigation}
              className="h-10 w-full rounded-xl border border-white/10 bg-[#102027]/70 pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#7f969f] focus:border-[#5796ff]/70 focus:ring-2 focus:ring-[#2f7df6]/20"
            />
          </label>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-3 lg:px-3">
          <div className="mb-3 flex items-center justify-between px-2">
            <span className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#7f969f]">
              {isSearching ? copy.search : copy.modules}
            </span>
            <span
              className="text-xs tabular-nums text-[var(--dash-text-soft)]"
              aria-label={`${isSearching ? visibleLinks.length : filteredLinks.length} ${copy.modules}`}
            >
              {isSearching ? visibleLinks.length : filteredLinks.length}
            </span>
          </div>

          <nav
            aria-label={locale === "fr" ? "Modules du tableau de bord" : "Primary dashboard modules"}
            className="dashboard-sidebar-scroll grid min-h-0 min-w-0 max-w-full flex-1 items-start gap-4 overflow-y-auto overflow-x-hidden pr-1 text-sm font-medium"
          >
            {visibleSections.map((section) => (
              <section key={section.key} aria-labelledby={`sidebar-section-${section.key}`} className="grid min-w-0 gap-1">
                <div className="flex items-center justify-between px-2 pb-1">
                  <span
                    id={`sidebar-section-${section.key}`}
                    className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#7f969f]"
                    title={label(section.description)}
                  >
                    {label(section.title)}
                  </span>
                  <span className="text-[0.66rem] font-semibold text-[#647a83]" aria-hidden="true">
                    {section.links.length}
                  </span>
                </div>

                {section.links.map((item) => {
                  const Icon = item.icon
                  const itemKey = item.href ?? item.title
                  const submenuId = `sidebar-submenu-${toSidebarDomId(itemKey)}`
                  const isHrefIncluded = item.dropdownMenu?.some((link) => isActiveHref(link.href))
                  const isDirectActive = isActiveHref(item.href)
                  const isChildActive = Boolean(isHrefIncluded)
                  const isActive = isDirectActive || isChildActive
                  const isOpen = isSearching || openDropdownKey === itemKey || (openDropdownKey === undefined && isChildActive)
                  const isFinanceSection = item.title === "Finance"

                  return (
                    <div key={itemKey} className="min-w-0">
                      {item.dropdown ? (
                        <Collapsible open={isOpen} onOpenChange={(open) => setOpenDropdownKey(open ? itemKey : null)}>
                          <CollapsibleTrigger
                            data-active={isDirectActive ? "true" : "false"}
                            data-child-active={isChildActive ? "true" : "false"}
                            aria-controls={submenuId}
                            aria-label={`${item.title} ${copy.menu}`}
                            className={cn(
                              "dashboard-sidebar-module group relative flex w-full items-center gap-2 rounded-xl px-2.5 py-2.5 text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#5796ff]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b161b]",
                            )}
                          >
                            <span className="dashboard-sidebar-module-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors">
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1" title={item.title}>
                              <span className="block truncate">{item.title}</span>
                              {item.description ? (
                                <span className="sr-only">
                                  {item.description}
                                </span>
                              ) : null}
                            </span>
                            {item.dropdownMenu?.length ? (
                              <span
                                className="dashboard-sidebar-module-count shrink-0 rounded-full px-1.5 py-0.5 text-[0.64rem] font-semibold"
                                aria-label={`${item.dropdownMenu.length} ${copy.links}`}
                              >
                                {item.dropdownMenu.length}
                              </span>
                            ) : null}
                            {isOpen ? (
                              <ChevronDown className="dashboard-sidebar-module-chevron h-4 w-4 shrink-0" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="dashboard-sidebar-module-chevron h-4 w-4 shrink-0" aria-hidden="true" />
                            )}
                          </CollapsibleTrigger>
                          <CollapsibleContent
                            id={submenuId}
                            className={cn(
                              "dashboard-sidebar-submenu mt-1 rounded-xl border py-1",
                              isFinanceSection && "dashboard-finance-submenu",
                            )}
                          >
                            {item.dropdownMenu?.map((menuItem) => {
                              const isMenuItemActive = isActiveHref(menuItem.href)

                              return (
                                <Link
                                  key={menuItem.href}
                                  href={localizedHref(menuItem.href)}
                                  data-active={isMenuItemActive ? "true" : "false"}
                                  aria-current={isMenuItemActive ? (normalizedPath === menuItem.href ? "page" : "location") : undefined}
                                  title={menuItem.title}
                                  className={cn(
                                    "dashboard-sidebar-submenu-item mx-1.5 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#5796ff]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e1a20]",
                                    isFinanceSection && "dashboard-finance-submenu-item",
                                  )}
                                >
                                  <span className="flex min-w-0 flex-1 items-center gap-2">
                                    <span
                                      data-active={isMenuItemActive ? "true" : "false"}
                                      className={cn(
                                        "dashboard-sidebar-submenu-dot h-1.5 w-1.5 shrink-0 rounded-full",
                                        isFinanceSection && "dashboard-finance-submenu-dot",
                                      )}
                                    />
                                    <span className="block min-w-0 flex-1 truncate">{menuItem.title}</span>
                                  </span>
                                  <span
                                    className={cn(
                                      "dashboard-sidebar-submenu-action flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                                      isFinanceSection && "dashboard-finance-submenu-action",
                                    )}
                                  >
                                    <ChevronRight className="h-3 w-3" aria-hidden="true" />
                                  </span>
                                </Link>
                              )
                            })}
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <Link
                          href={localizedHref(item.href ?? "#")}
                          data-active={isActive ? "true" : "false"}
                          aria-current={isActive ? (normalizedPath === item.href ? "page" : "location") : undefined}
                          title={item.title}
                          className={cn(
                            "dashboard-sidebar-module group relative flex items-center gap-2 rounded-xl px-2.5 py-2.5 outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#5796ff]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b161b]",
                          )}
                        >
                          <span className="dashboard-sidebar-module-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{item.title}</span>
                            {item.description ? (
                              <span className="sr-only">
                                {item.description}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      )}
                    </div>
                  )
                })}
              </section>
            ))}
            {visibleLinks.length === 0 && (
              <div role="status" className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-4 text-center text-xs text-[#9fb4bb]">
                {copy.emptySearch}
              </div>
            )}
          </nav>
        </div>

        <div className="border-t border-white/10 p-3 lg:p-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0e1a20]/70 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#5796ff] text-sm font-black text-white shadow-lg">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{session?.user?.name ?? "User"}</p>
              <p className="truncate text-xs text-[#8fa4ab]">{session?.user?.email ?? ""}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="dashboard-top-button flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all"
              aria-label={signingOut ? signOutText.pending : signOutText.label}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {signOutFailed && <p role="alert" className="mt-2 text-sm">{signOutText.failed}</p>}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
