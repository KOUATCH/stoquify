"use client";

import { Button } from "@/components/ui/button";
import { localizePath } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  Activity,
  Calculator,
  CheckCircle2,
  Command,
  Globe2,
  LockKeyhole,
  Moon,
  PackageCheck,
  Radar,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Sun,
  Truck,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ReactNode, useEffect, useState } from "react";
import { authCopy, getAuthLocale } from "./auth-copy";

interface AuthLayoutProps {
  children: ReactNode;
  variant?: "login" | "register" | "forgot" | "verify";
  className?: string;
}

export default function AuthLayout({
  children,
  variant = "login",
  className,
}: AuthLayoutProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const locale = getAuthLocale(pathname);
  const pageCopy = authCopy[locale];
  const copy = pageCopy.layout[variant];
  const localizedHref = (href: string) => localizePath(href, locale);
  const targetLocale = locale === "fr" ? "en" : "fr";
  const pathWithoutLocale = pathname.replace(/^\/(en|fr)(?=\/|$)/, "") || "/login";
  const targetLocaleHref = `/${targetLocale}${pathWithoutLocale}`;
  const isDarkTheme = themeReady && resolvedTheme === "dark";
  const moduleHighlights = [
    {
      ...pageCopy.common.moduleHighlights.pos,
      icon: ShoppingCart,
      iconClass: "text-[#178e83] dark:text-[#7de8dc]",
      surfaceClass: "bg-[#2dd4bf]/10 ring-[#2dd4bf]/20",
      metricClass: "text-[#178e83] dark:text-[#7de8dc]",
    },
    {
      ...pageCopy.common.moduleHighlights.inventory,
      icon: PackageCheck,
      iconClass: "text-[#2f7df6] dark:text-[#8fb7ff]",
      surfaceClass: "bg-[#2f7df6]/10 ring-[#2f7df6]/20",
      metricClass: "text-[#2f7df6] dark:text-[#8fb7ff]",
    },
    {
      ...pageCopy.common.moduleHighlights.purchasing,
      icon: Truck,
      iconClass: "text-[#bf4b6a] dark:text-[#ff9ab1]",
      surfaceClass: "bg-[#bf4b6a]/10 ring-[#bf4b6a]/20",
      metricClass: "text-[#bf4b6a] dark:text-[#ff9ab1]",
    },
    {
      ...pageCopy.common.moduleHighlights.accounting,
      icon: Calculator,
      iconClass: "text-[#a87516] dark:text-[#f0c76a]",
      surfaceClass: "bg-[#d7a84f]/10 ring-[#d7a84f]/20",
      metricClass: "text-[#a87516] dark:text-[#f0c76a]",
    },
    {
      ...pageCopy.common.moduleHighlights.compliance,
      icon: Globe2,
      iconClass: "text-[#5c6df6] dark:text-[#aeb8ff]",
      surfaceClass: "bg-[#5c6df6]/10 ring-[#5c6df6]/20",
      metricClass: "text-[#5c6df6] dark:text-[#aeb8ff]",
    },
    {
      ...pageCopy.common.moduleHighlights.reconciliation,
      icon: Radar,
      iconClass: "text-[#2f7df6] dark:text-[#8fb7ff]",
      surfaceClass: "bg-[#2f7df6]/10 ring-[#2f7df6]/20",
      metricClass: "text-[#2f7df6] dark:text-[#8fb7ff]",
    },
    {
      ...pageCopy.common.moduleHighlights.payroll,
      icon: Users,
      iconClass: "text-[#178e83] dark:text-[#7de8dc]",
      surfaceClass: "bg-[#2dd4bf]/10 ring-[#2dd4bf]/20",
      metricClass: "text-[#178e83] dark:text-[#7de8dc]",
    },
    {
      ...pageCopy.common.moduleHighlights.offline,
      icon: Workflow,
      iconClass: "text-[#bf4b6a] dark:text-[#ff9ab1]",
      surfaceClass: "bg-[#bf4b6a]/10 ring-[#bf4b6a]/20",
      metricClass: "text-[#bf4b6a] dark:text-[#ff9ab1]",
    },
    {
      ...pageCopy.common.moduleHighlights.controls,
      icon: ShieldCheck,
      iconClass: "text-[#a87516] dark:text-[#f0c76a]",
      surfaceClass: "bg-[#d7a84f]/10 ring-[#d7a84f]/20",
      metricClass: "text-[#a87516] dark:text-[#f0c76a]",
    },
  ];
  const statusCards = [
    { label: pageCopy.common.statusCards.uptime, value: "Tenant", icon: Activity },
    { label: pageCopy.common.statusCards.audit, value: "Proof", icon: Radar },
    { label: pageCopy.common.statusCards.sync, value: "Replay", icon: Workflow },
  ];
  const assuranceItems = [
    pageCopy.common.encrypted,
    pageCopy.common.teamReady,
    pageCopy.common.permissionAware,
  ];
  const renderModuleHighlights = (containerClassName?: string) => (
    <div
      className={cn(
        "rounded-xl border border-[#9fb4bb]/25 bg-[#eef4f5]/72 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055] sm:p-4",
        containerClassName
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2f7df6] dark:text-[#8fb7ff]">
            {pageCopy.common.moduleShowcaseTitle}
          </p>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[#58707a] dark:text-[#9fb4bb]">
            {pageCopy.common.moduleShowcaseBody}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1 rounded-full border border-[#2dd4bf]/30 bg-[#2dd4bf]/10 px-2.5 py-1 text-xs font-black uppercase tracking-[0.08em] text-[#178e83] dark:text-[#7de8dc]">
          <Workflow className="h-3.5 w-3.5" />
          {pageCopy.common.workspaceSignal}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {moduleHighlights.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={cn(
                "min-h-[132px] rounded-lg border border-[#9fb4bb]/25 bg-white/55 p-3 transition-all hover:-translate-y-0.5 hover:border-[#2f7df6]/35 hover:bg-white dark:border-white/10 dark:bg-white/[0.045] dark:hover:bg-white/[0.075]",
                index === moduleHighlights.length - 1 ? "sm:col-span-2 xl:col-span-1" : ""
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1", item.surfaceClass)}>
                  <Icon className={cn("h-4 w-4", item.iconClass)} />
                </span>
                <span
                  className={cn(
                    "rounded-full bg-[#eef4f5] px-2 py-1 text-[0.64rem] font-black uppercase text-[#45606a] dark:bg-white/[0.07] dark:text-[#b9c8c3]",
                    item.metricClass
                  )}
                >
                  {item.metric}
                </span>
              </div>
              <p className="mt-3 text-sm font-black text-[#132028] dark:text-white">{item.label}</p>
              <p className="mt-1.5 text-xs leading-5 text-[#58707a] dark:text-[#9fb4bb]">{item.body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <main
      className={cn(
        "relative min-h-screen overflow-x-hidden bg-[#dfe8eb] text-[#132028] dark:bg-[#0b1116] dark:text-white",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(47,125,246,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.07)_1px,transparent_1px)] bg-[size:44px_44px] dark:opacity-35" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(47,125,246,0.18),transparent_36%),linear-gradient(315deg,rgba(45,212,191,0.11),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.58),transparent_44%)] dark:bg-[linear-gradient(135deg,rgba(47,125,246,0.13),transparent_36%),linear-gradient(315deg,rgba(45,212,191,0.08),transparent_34%)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link href={localizedHref("/")} className="group flex min-w-0 items-center gap-3">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#132028] text-white shadow-[0_18px_40px_rgba(19,32,40,0.18)] ring-1 ring-white/25 dark:bg-white/[0.08] dark:ring-white/10">
              <Command className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#2dd4bf] shadow-[0_0_0_4px_rgba(45,212,191,0.14)]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black tracking-[0.12em] text-[#132028] dark:text-white">
                AQSTOQFLOW
              </span>
              <span className="block truncate text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#58707a] dark:text-[#9fb4bb]">
                {pageCopy.common.brandSubtitle}
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={targetLocaleHref}
              className="flex h-10 items-center gap-2 rounded-xl border border-[#9fb4bb]/35 bg-[#eef4f5]/78 px-3 text-sm font-bold uppercase text-[#253943] shadow-sm backdrop-blur-xl transition-all hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:text-[#d3ddd8] dark:hover:bg-white/[0.09]"
              aria-label={`${pageCopy.common.languageAria}: ${targetLocale.toUpperCase()}`}
            >
              <Globe2 className="h-4 w-4 text-[#2f7df6] dark:text-[#8fb7ff]" />
              {targetLocale}
            </Link>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
              className="h-10 rounded-xl border border-[#9fb4bb]/35 bg-[#eef4f5]/78 px-3 text-[#253943] shadow-sm backdrop-blur-xl hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:text-[#d3ddd8] dark:hover:bg-white/[0.09]"
              aria-label={isDarkTheme ? pageCopy.common.switchToLight : pageCopy.common.switchToDark}
            >
              {isDarkTheme ? (
                <Sun className="h-4 w-4 text-[#d7a84f]" />
              ) : (
                <Moon className="h-4 w-4 text-[#2f7df6]" />
              )}
              <span className="hidden sm:inline">{isDarkTheme ? pageCopy.common.light : pageCopy.common.dark}</span>
            </Button>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6 px-4 pb-8 pt-2 sm:px-6 lg:grid-cols-[minmax(0,0.98fr)_minmax(420px,0.88fr)] lg:gap-8 lg:px-8 lg:pb-10 lg:pt-6">
          <aside className="hidden min-w-0 self-start lg:block">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#9fb4bb]/35 bg-[#eef4f5]/72 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#31515d] shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055] dark:text-[#9fb4bb]">
                <Sparkles className="h-3.5 w-3.5 text-[#a87516] dark:text-[#f0c76a]" />
                {copy.eyebrow}
              </div>

              <h1 className="max-w-2xl text-4xl font-black tracking-normal text-[#10181d] dark:text-white xl:text-[2.8rem]">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#45606a] dark:text-[#b9c8c3]">
                {copy.body}
              </p>

              {renderModuleHighlights("mt-6")}

              <div className="mt-4 grid max-w-2xl grid-cols-3 gap-2">
                {statusCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-xl border border-[#9fb4bb]/25 bg-[#eef4f5]/70 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055]"
                    >
                      <Icon className="mb-3 h-4 w-4 text-[#2f7df6] dark:text-[#8fb7ff]" />
                      <p className="text-xl font-black text-[#10181d] dark:text-white">{item.value}</p>
                      <p className="mt-1 text-xs font-semibold text-[#58707a] dark:text-[#8fa4ab]">{item.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-[#9fb4bb]/25 bg-[#10181d] shadow-[0_24px_70px_rgba(16,24,29,0.22)] dark:border-white/10">
                <div className="flex flex-col gap-2 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#9fb4bb]">
                    <LockKeyhole className="h-4 w-4 text-[#2dd4bf]" />
                    {pageCopy.common.liveAccess}
                  </div>
                  <span className="rounded-full bg-[#2dd4bf]/12 px-2.5 py-1 text-xs font-bold text-[#7de8dc]">
                    {pageCopy.common.workspaceSignal}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2dd4bf]/12 text-[#7de8dc]">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-lg font-black text-white">{pageCopy.common.commandTitle}</p>
                      <p className="mt-1 text-sm leading-6 text-[#9fb4bb]">{pageCopy.common.commandBody}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {assuranceItems.map((item) => (
                      <div key={item} className="flex min-h-[46px] items-center gap-2 rounded-lg bg-white/[0.055] px-3 py-2 text-sm font-semibold text-[#d3ddd8]">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2ec98a]" />
                        <span className="min-w-0">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2.5">
                    <p className="text-sm font-bold text-white">{pageCopy.common.trustTitle}</p>
                    <p className="mt-1 text-xs leading-5 text-[#9fb4bb]">
                      {pageCopy.common.trustBody}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="mx-auto w-full max-w-[620px] self-start lg:ml-auto">
            {children}
            <div className="mt-5 lg:hidden">
              {renderModuleHighlights()}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#58707a] dark:text-[#8fa4ab]">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#2ec98a]" />
                {pageCopy.common.encrypted}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-[#8fb7ff]" />
                {pageCopy.common.teamReady}
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#f0c76a]" />
                {pageCopy.common.permissionAware}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function AuthFormCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#9fb4bb]/25 bg-[#eef4f5]/86 p-5 shadow-[0_28px_80px_rgba(24,38,45,0.20)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#142129]/90 dark:shadow-[0_28px_80px_rgba(5,12,16,0.46)] sm:p-7",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AuthLoadingOverlay({ show, message }: { show: boolean; message?: string }) {
  const pathname = usePathname();
  const locale = getAuthLocale(pathname);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="rounded-xl border border-white/10 bg-[#142129]/95 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#2f7df6] border-t-transparent" />
        <p className="font-medium text-[#d3ddd8]">{message || authCopy[locale].common.processing}</p>
      </div>
    </div>
  );
}
