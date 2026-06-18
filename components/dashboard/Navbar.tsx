"use client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import UserDropdownMenu from "@/components/UserDropdownMenu";
import { sidebarLinks } from "@/config/sidebar";
import { localizePath } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useShellPermissions } from "@/components/dashboard/useShellPermissions";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  ExternalLink,
  Globe2,
  Menu,
  Moon,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sun,
  Zap
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Logo from "../global/Logo";

const OrganizationBanner = ({
  organizationName,
  organizationId,
  userRole
}: {
  organizationName: string,
  organizationId: string,
  userRole: string
}) => {
  const shortOrgId = organizationId ? organizationId.slice(-6).toUpperCase() : "ORG";

  return (
    <div className="hidden min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] min-[1700px]:flex">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(47,125,246,0.16)] text-[#8fb7ff]">
        <Building2 className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold text-white">{organizationName || "Organization"}</span>
          <span className="rounded-full bg-[rgba(45,212,191,0.14)] px-2 py-0.5 text-[0.66rem] font-bold uppercase tracking-[0.1em] text-[#7de8dc]">
            {userRole || "User"}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[0.68rem] font-medium text-[#8fa4ab]">
          <Activity className="h-3 w-3 text-[#2ec98a]" />
          <span>Live</span>
          <span className="text-white/20">/</span>
          <span>{shortOrgId}</span>
        </div>
      </div>
    </div>
  )
}


const Navbar = ({ session }: { session: any }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  const { hasPermission } = useShellPermissions(session);
  const userRole = session?.user?.roles?.[0]?.name ?? "User"
  const localePrefix = pathname.match(/^\/(en|fr)(?=\/)/)?.[1];
  const locale = localePrefix === "fr" ? "fr" : "en";
  const localizedHref = (href: string) => {
    if (!href.startsWith("/")) {
      return href;
    }
    return localizePath(href, locale);
  };
  const targetLocale = localePrefix === "fr" ? "en" : "fr";
  const pathWithoutLocale = pathname.replace(/^\/(en|fr)(?=\/)/, "") || "/dashboard";
  const targetLocaleHref = `/${targetLocale}${pathWithoutLocale}`;
  const isDarkTheme = themeReady && resolvedTheme === "dark";

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const pathSegments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "en" && segment !== "fr");
  const section = pathSegments[1] ?? pathSegments[0] ?? "dashboard";
  const pageTitle = section
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const breadcrumb = pathSegments.slice(0, 3).join(" / ") || "dashboard";
  const commandLinks = [
    { title: "Items", href: "/dashboard/inventory/items", icon: Package, color: "text-[#8fb7ff]" },
    { title: "Sales", href: "/dashboard/sales", icon: ShoppingCart, color: "text-[#76e3b0]" },
    { title: "Reports", href: "/dashboard/reports", icon: BarChart3, color: "text-[#49c6e5]" },
  ];

  // Filter sidebar links based on user permissions
  const filteredLinks = sidebarLinks
    .map((link) => ({
      ...link,
      dropdownMenu: link.dropdownMenu?.filter((item) =>
        hasPermission(item.permission)
      ),
    }))
    .filter(
      (link) =>
        hasPermission(link.permission) ||
        Boolean(link.dropdown && link.dropdownMenu?.length)
    );

  // Flatten dropdown menus for mobile view
  const mobileLinks = filteredLinks.reduce(
    (acc, link) => {
      // Add main link if it's not a dropdown
      if (!link.dropdown) {
        acc.push({
          title: link.title,
          href: link.href || "#",
          icon: link.icon,
          permission: link.permission,
          parentTitle: link.title,
        });
        return acc;
      }

      // Add dropdown items if user has permission
      if (link.dropdownMenu) {
        link.dropdownMenu.forEach((item) => {
          if (hasPermission(item.permission)) {
            acc.push({
              title: item.title,
              href: item.href,
              icon: link.icon,
              permission: item.permission,
              parentTitle: link.title,
            });
          }
        });
      }

      return acc;
    },
    [] as Array<{ title: string; href: string; icon: any; permission: string; parentTitle?: string }>
  );

  const handleLogout = async () => {
    try {
      await signOut();
      router.push(localizedHref("/login"));
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <header className="sticky top-0 z-20 isolate flex min-h-16 w-full max-w-full items-center gap-2 overflow-hidden border-b border-white/10 bg-[#142129]/90 px-2 shadow-[0_20px_45px_rgba(5,12,16,0.22)] backdrop-blur-xl sm:px-4 lg:h-[68px] lg:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(73,198,229,0.12),transparent_28%),radial-gradient(circle_at_88%_0%,rgba(47,125,246,0.11),transparent_24%)]" />
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="relative z-10 shrink-0 rounded-xl md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="dashboard-enterprise-sidebar flex flex-col border-white/10 p-0 text-[#d3ddd8]">
          <div className="relative z-10 flex h-full min-h-0 flex-col p-4">
            <nav className="dashboard-sidebar-scroll grid gap-2 overflow-y-auto text-lg font-medium">
              <Logo href={localizedHref("/dashboard")} />

              {/* Render mobile navigation links */}
              {mobileLinks.map((item, i) => {
                const Icon = item.icon;
                const href = localizedHref(item.href);
                const isActive = href === pathname || item.href === pathname;
                const isFinanceChild = item.parentTitle === "Finance";

                return (
                  <Link
                    key={i}
                    href={href}
                    data-active={isActive ? "true" : "false"}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
                      isFinanceChild
                        ? "dashboard-finance-submenu-item"
                        : "text-[#b9c8c3] hover:bg-white/[0.075] hover:text-white",
                      !isFinanceChild && isActive ? "bg-[rgba(47,125,246,0.16)] text-white" : ""
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isFinanceChild ? "text-[var(--dash-brand-strong)]" : "text-[#8fb7ff]"
                      )}
                    />
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto">
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
            <ShieldCheck className="h-4 w-4" />
          </span>
          <h1 className="truncate text-lg font-bold text-white">{pageTitle}</h1>
        </div>
        <p className="mt-0.5 truncate text-xs font-medium text-[#8fa4ab]">{breadcrumb}</p>
      </div>
      <OrganizationBanner organizationName={session?.user?.organizationName ?? ""} organizationId={session.user?.organizationId ?? ""} userRole={userRole} />
      <div className="relative z-10 hidden min-w-0 max-w-xs flex-1 min-[1800px]:block">
        <div className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-3 text-sm text-[#9fb4bb] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <Search className="h-4 w-4 text-[#49c6e5]" />
          <span className="truncate">Search operations, inventory, sales...</span>
        </div>
      </div>
      <div className="relative z-10 hidden items-center gap-2 min-[1800px]:flex">
        {commandLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={localizedHref(item.href)}
              className="dashboard-top-button flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-all"
            >
              <Icon className={cn("h-4 w-4", item.color)} />
              {item.title}
            </Link>
          );
        })}
      </div>
      <div className="relative z-10 ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
        <Link
          href={localizedHref("/dashboard")}
          className="dashboard-top-button hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-all min-[1800px]:flex"
        >
          <Zap className="h-4 w-4 text-[#8fb7ff]" />
          Command
        </Link>
        <Link
          href="/"
          className="dashboard-top-button hidden h-10 w-10 items-center justify-center rounded-xl transition-all 2xl:flex"
          target="_blank"
          aria-label="Open website"
        >
          <ExternalLink className="h-4 w-4 text-[#8fb7ff]" />
        </Link>
        <Link
          href={targetLocaleHref}
          className="dashboard-top-button flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl px-0 text-sm font-semibold uppercase transition-all sm:w-auto sm:px-3"
          aria-label={`Switch language to ${targetLocale.toUpperCase()}`}
        >
          <Globe2 className="h-4 w-4 text-[#8fb7ff]" />
          <span className="hidden sm:inline">{targetLocale}</span>
        </Link>
        <button
          type="button"
          onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
          className="dashboard-top-button flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl px-0 text-sm font-semibold transition-all 2xl:w-auto 2xl:px-3"
          aria-label={isDarkTheme ? "Switch to light theme" : "Switch to dark theme"}
        >
          {isDarkTheme ? (
            <Sun className="h-4 w-4 text-[#8fb7ff]" />
          ) : (
            <Moon className="h-4 w-4 text-[#8fb7ff]" />
          )}
          <span className="hidden 2xl:inline">{isDarkTheme ? "Light" : "Dark"}</span>
        </button>
        <button
          type="button"
          className="dashboard-top-button relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-[#8fb7ff]" />
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
  );
}
export default Navbar
