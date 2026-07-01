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
  isSidebarHrefActive,
  searchSidebarLinks,
  sidebarLinks,
} from "@/config/sidebar"
import { localizePath } from "@/i18n/routing"
import { signOut } from "@/lib/auth-client"
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
import { usePathname, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { NotificationMenu } from "../NotificationMenu"
import StoquifyLogo from "../global/kit-logo"

interface SidebarProps {
  session: any
  notifications?: Notification[]
}

function toSidebarDomId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item"
}

const Sidebar = ({ session, notifications = [] }: SidebarProps) => {
  const router = useRouter()
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const pathname = usePathname()
  const { hasPermission } = useShellPermissions(session)
  const userRole = session?.user?.roles?.[0]?.name ?? "User"
  const organizationName = session?.user?.organizationName ?? "Stoquify"
  const localePrefix = pathname.match(/^\/(en|fr)(?=\/)/)?.[1]
  const locale = localePrefix === "fr" ? "fr" : "en"
  const normalizedPath = localePrefix ? pathname.replace(`/${localePrefix}`, "") : pathname

  const localizedHref = (href: string) => {
    if (!href.startsWith("/")) {
      return href
    }

    return localizePath(href, locale)
  }

  const isActiveHref = (href?: string) => isSidebarHrefActive(normalizedPath, href)

  const filteredLinks = useMemo(
    () => filterSidebarLinksByPermission(sidebarLinks, hasPermission),
    [hasPermission],
  )

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
    try {
      await signOut({
        redirectTo: localizedHref("/login"),
        redirect: true,
      })
    } catch (error) {
      console.log(error)
      router.push(localizedHref("/login"))
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
      aria-label="Dashboard navigation"
      className="dashboard-enterprise-sidebar fixed left-0 top-0 z-30 hidden h-full w-[220px] overflow-hidden border-r md:block lg:w-[280px]"
    >
      <div className="relative z-10 flex h-full max-h-screen flex-col">
        <div className="border-b border-white/10 px-4 py-4 lg:px-5">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={localizedHref("/dashboard")}
              aria-label="Stoquify dashboard home"
              className="group flex min-w-0 items-center gap-3"
            >
              <StoquifyLogo theme="dark" width={180} height={52} tagline="Enterprise OS" />
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.055]">
              <NotificationMenu notifications={notifications} />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
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
                    Live
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 lg:px-5">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f969f]"
              aria-hidden="true"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search modules"
              aria-label="Search navigation modules"
              className="h-10 w-full rounded-xl border border-white/10 bg-[#102027]/70 pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#7f969f] focus:border-[#5796ff]/70 focus:ring-2 focus:ring-[#2f7df6]/20"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 px-3 pb-3 lg:px-4">
          <div className="mb-3 flex items-center justify-between px-2">
            <span className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#7f969f]">
              {isSearching ? "Search" : "Modules"}
            </span>
            <span
              className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[0.66rem] font-semibold text-[#a9b8b2]"
              aria-label={`${isSearching ? visibleLinks.length : filteredLinks.length} authorized navigation destinations`}
            >
              {isSearching ? visibleLinks.length : filteredLinks.length}
            </span>
          </div>

          <nav
            aria-label="Primary dashboard modules"
            className="dashboard-sidebar-scroll grid max-h-full items-start gap-4 overflow-y-auto pr-1 text-sm font-medium"
          >
            {visibleSections.map((section) => (
              <section key={section.key} aria-labelledby={`sidebar-section-${section.key}`} className="grid gap-1">
                <div className="flex items-center justify-between px-2 pb-1">
                  <span
                    id={`sidebar-section-${section.key}`}
                    className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#7f969f]"
                    title={section.description}
                  >
                    {section.title}
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
                  const isOpen = isSearching || openDropdownKey === itemKey || (openDropdownKey === null && isChildActive)
                  const isFinanceSection = item.title === "Finance"

                  return (
                    <div key={itemKey}>
                      {item.dropdown ? (
                        <Collapsible open={isOpen} onOpenChange={(open) => setOpenDropdownKey(open ? itemKey : null)}>
                          <CollapsibleTrigger
                            aria-controls={submenuId}
                            aria-label={`${item.title} menu`}
                            className={cn(
                              "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[#b9c8c3] outline-none transition-all duration-200 hover:bg-white/[0.075] hover:text-white focus-visible:ring-2 focus-visible:ring-[#5796ff]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b161b]",
                              isDirectActive && "bg-[rgba(47,125,246,0.16)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
                              isChildActive && !isDirectActive && "bg-white/[0.045] text-[#d3ddd8]",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.055] text-[#8fb7ff] transition-colors",
                                isDirectActive && "bg-[rgba(45,212,191,0.16)] text-[#6ee7db]",
                                isChildActive && !isDirectActive && "bg-white/[0.08] text-[#8fb7ff]",
                              )}
                            >
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1" title={item.title}>
                              <span className="block truncate">{item.title}</span>
                              {item.description ? (
                                <span className="hidden truncate text-[0.66rem] font-medium text-[#7f969f] lg:block">
                                  {item.description}
                                </span>
                              ) : null}
                            </span>
                            {item.dropdownMenu?.length ? (
                              <span
                                className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[0.64rem] font-semibold text-[#8fa4ab]"
                                aria-label={`${item.dropdownMenu.length} links`}
                              >
                                {item.dropdownMenu.length}
                              </span>
                            ) : null}
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-[#9fb4bb]" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-[#7f969f]" aria-hidden="true" />
                            )}
                          </CollapsibleTrigger>
                          <CollapsibleContent
                            id={submenuId}
                            className={cn(
                              "mt-1 rounded-xl border py-1",
                              isFinanceSection
                                ? "dashboard-finance-submenu"
                                : "border-white/[0.06] bg-[#0e1a20]/60",
                            )}
                          >
                            {item.dropdownMenu?.map((menuItem) => {
                              const isMenuItemActive = isActiveHref(menuItem.href)

                              return (
                                <Link
                                  key={menuItem.href}
                                  href={localizedHref(menuItem.href)}
                                  data-active={isMenuItemActive ? "true" : "false"}
                                  aria-current={isMenuItemActive ? "page" : undefined}
                                  title={menuItem.title}
                                  className={cn(
                                    "mx-2 flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#5796ff]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e1a20]",
                                    isFinanceSection
                                      ? "dashboard-finance-submenu-item"
                                      : "text-[#9fb4bb] hover:bg-white/[0.07] hover:text-white",
                                    !isFinanceSection &&
                                      isMenuItemActive &&
                                      "bg-[rgba(45,212,191,0.14)] text-[#d9fffb]",
                                  )}
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span
                                      data-active={isMenuItemActive ? "true" : "false"}
                                      className={cn(
                                        "h-1.5 w-1.5 shrink-0 rounded-full",
                                        isFinanceSection
                                          ? "dashboard-finance-submenu-dot"
                                          : "bg-[#54707a]",
                                        !isFinanceSection && isMenuItemActive && "bg-[#2dd4bf]",
                                      )}
                                    />
                                    <span className="truncate">{menuItem.title}</span>
                                  </span>
                                  <span
                                    className={cn(
                                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                                      isFinanceSection
                                        ? "dashboard-finance-submenu-action"
                                        : "bg-white/[0.04]",
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
                          aria-current={isActive ? "page" : undefined}
                          title={item.title}
                          className={cn(
                            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[#b9c8c3] outline-none transition-all duration-200 hover:bg-white/[0.075] hover:text-white focus-visible:ring-2 focus-visible:ring-[#5796ff]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b161b]",
                            isActive && "bg-[rgba(47,125,246,0.16)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.055] text-[#8fb7ff]",
                              isActive && "bg-[rgba(45,212,191,0.16)] text-[#6ee7db]",
                            )}
                          >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{item.title}</span>
                            {item.description ? (
                              <span className="hidden truncate text-[0.66rem] font-medium text-[#7f969f] lg:block">
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
                No modules match your search.
              </div>
            )}
          </nav>
        </div>

        <div className="border-t border-white/10 p-4 lg:p-5">
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
              className="dashboard-top-button flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
