"use client";

import { Button } from "@/components/ui/button";
import StoquifyLogo from "@/components/global/kit-logo";
import { localizePath } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  Building2,
  Calculator,
  CheckCircle2,
  Globe2,
  LockKeyhole,
  Moon,
  PackageCheck,
  Radar,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Sun,
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
      iconClass: "text-[var(--auth-spruce-ink)]",
      surfaceClass: "bg-[var(--auth-spruce)]/10 ring-[var(--auth-spruce)]/20",
      metricClass: "text-[var(--auth-spruce-ink)]",
    },
    {
      ...pageCopy.common.moduleHighlights.inventory,
      icon: PackageCheck,
      iconClass: "text-[var(--auth-brand-ink)]",
      surfaceClass: "bg-[var(--auth-brand)]/10 ring-[var(--auth-brand)]/20",
      metricClass: "text-[var(--auth-brand-ink)]",
    },
    {
      ...pageCopy.common.moduleHighlights.accounting,
      icon: Calculator,
      iconClass: "text-[var(--auth-gold-ink)]",
      surfaceClass: "bg-[var(--auth-gold)]/10 ring-[var(--auth-gold)]/20",
      metricClass: "text-[var(--auth-gold-ink)]",
    },
    {
      ...pageCopy.common.moduleHighlights.reconciliation,
      icon: Radar,
      iconClass: "text-[var(--auth-brand-ink)]",
      surfaceClass: "bg-[var(--auth-brand)]/10 ring-[var(--auth-brand)]/20",
      metricClass: "text-[var(--auth-brand-ink)]",
    },
    {
      ...pageCopy.common.moduleHighlights.payroll,
      icon: Users,
      iconClass: "text-[var(--auth-spruce-ink)]",
      surfaceClass: "bg-[var(--auth-spruce)]/10 ring-[var(--auth-spruce)]/20",
      metricClass: "text-[var(--auth-spruce-ink)]",
    },
    {
      ...pageCopy.common.moduleHighlights.controls,
      icon: ShieldCheck,
      iconClass: "text-[var(--auth-gold-ink)]",
      surfaceClass: "bg-[var(--auth-gold)]/10 ring-[var(--auth-gold)]/20",
      metricClass: "text-[var(--auth-gold-ink)]",
    },
  ];
  const assuranceItems = [
    pageCopy.common.encrypted,
    pageCopy.common.teamReady,
    pageCopy.common.permissionAware,
  ];
  const journeyCopy =
    variant === "register"
      ? pageCopy.layout.register.journeyCards
      : pageCopy.layout.login.journeyCards;
  const journeyCards = [
    {
      ...journeyCopy.context,
      icon: Building2,
      iconClass: "text-[var(--auth-brand-ink)]",
      surfaceClass: "bg-[var(--auth-brand)]/10 ring-[var(--auth-brand)]/20",
    },
    {
      ...journeyCopy.access,
      icon: ShieldCheck,
      iconClass: "text-[var(--auth-spruce-ink)]",
      surfaceClass: "bg-[var(--auth-spruce)]/10 ring-[var(--auth-spruce)]/20",
    },
    {
      ...journeyCopy.assurance,
      icon: Workflow,
      iconClass: "text-[var(--auth-gold-ink)]",
      surfaceClass: "bg-[var(--auth-gold)]/10 ring-[var(--auth-gold)]/20",
    },
  ];
  const renderModuleHighlights = (containerClassName?: string) => (
    <div
      className={cn(
        "rounded-xl border border-[#9fb4bb]/25 bg-[#eef4f5]/72 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055]",
        containerClassName
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--auth-brand-ink)]">
            {pageCopy.common.moduleShowcaseTitle}
          </p>
          <p className="mt-1 max-w-xl text-xs leading-5 text-[#58707a] dark:text-[#9fb4bb] sm:text-sm">
            {pageCopy.common.moduleShowcaseBody}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1 rounded-full border border-[#2dd4bf]/30 bg-[#2dd4bf]/10 px-2.5 py-1 text-xs font-black uppercase tracking-[0.08em] text-[var(--auth-spruce-ink)]">
          <Workflow className="h-3.5 w-3.5" />
          {pageCopy.common.workspaceSignal}
        </span>
      </div>

      <div className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {moduleHighlights.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={cn(
                "min-h-[112px] rounded-lg border border-[#9fb4bb]/25 bg-white/55 p-2.5 transition-all hover:-translate-y-0.5 hover:border-[#2f7df6]/35 hover:bg-white dark:border-white/10 dark:bg-white/[0.045] dark:hover:bg-white/[0.075]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1", item.surfaceClass)}>
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
              <p className="mt-2.5 text-sm font-black text-[#132028] dark:text-white">{item.label}</p>
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
        "auth-shell relative min-h-screen overflow-x-hidden bg-[var(--auth-canvas)] text-[var(--auth-text)]",
        className
      )}
    >
      <div className="auth-shell-grid pointer-events-none absolute inset-0 dark:opacity-35" />
      <div className="auth-shell-wash pointer-events-none absolute inset-0" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link href={localizedHref("/")} className="group flex min-w-0 items-center gap-3">
            <StoquifyLogo theme={isDarkTheme ? "dark" : "light"} width={232} height={54} tagline={pageCopy.common.brandSubtitle} />
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={targetLocaleHref}
              className="flex h-10 items-center gap-2 rounded-xl border border-[#9fb4bb]/35 bg-[#eef4f5]/78 px-3 text-sm font-bold uppercase text-[#253943] shadow-sm backdrop-blur-xl transition-all hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:text-[#d3ddd8] dark:hover:bg-white/[0.09]"
              aria-label={`${pageCopy.common.languageAria}: ${targetLocale.toUpperCase()}`}
            >
              <Globe2 className="h-4 w-4 text-[var(--auth-brand-ink)]" />
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
                <Sun className="h-4 w-4 text-[var(--auth-gold)]" />
              ) : (
                <Moon className="h-4 w-4 text-[var(--auth-brand)]" />
              )}
              <span className="hidden sm:inline">{isDarkTheme ? pageCopy.common.light : pageCopy.common.dark}</span>
            </Button>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6 px-4 pb-8 pt-2 sm:px-6 lg:grid-cols-[minmax(0,0.94fr)_minmax(420px,0.88fr)] lg:gap-8 lg:px-8 lg:pb-10 lg:pt-5">
          <aside className="hidden min-w-0 self-start lg:block">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#9fb4bb]/35 bg-[#eef4f5]/72 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#31515d] shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055] dark:text-[#9fb4bb]">
                <Sparkles className="h-3.5 w-3.5 text-[var(--auth-gold-ink)]" />
                {copy.eyebrow}
              </div>

              <h1 className="max-w-2xl text-3xl font-black tracking-normal text-[#10181d] dark:text-white xl:text-[2.45rem]">
                {copy.title}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#45606a] dark:text-[#b9c8c3]">
                {copy.body}
              </p>

              {renderModuleHighlights("mt-4")}

              <div className="mt-3 overflow-hidden rounded-xl border border-[#9fb4bb]/25 bg-[#10181d] shadow-[0_24px_70px_rgba(16,24,29,0.22)] dark:border-white/10">
                <div className="flex flex-col gap-2 border-b border-white/10 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#9fb4bb]">
                    <LockKeyhole className="h-4 w-4 text-[var(--auth-spruce)]" />
                    {pageCopy.common.liveAccess}
                  </div>
                  <span className="rounded-full bg-[#2dd4bf]/12 px-2.5 py-1 text-xs font-bold text-[#7de8dc]">
                    {pageCopy.common.workspaceSignal}
                  </span>
                </div>
                <div className="p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2dd4bf]/12 text-[#7de8dc]">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-black text-white">{pageCopy.common.commandTitle}</p>
                      <p className="mt-1 text-sm leading-6 text-[#9fb4bb]">{pageCopy.common.commandBody}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {assuranceItems.map((item) => (
                      <div key={item} className="flex min-h-[42px] items-center gap-2 rounded-lg bg-white/[0.055] px-2.5 py-2 text-xs font-semibold text-[#d3ddd8]">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--auth-success)]" />
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
            {(variant === "login" || variant === "register") && (
              <section className="mt-4" data-auth-journey aria-label={journeyCopy.label}>
                <div className="grid gap-2 sm:grid-cols-3">
                  {journeyCards.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        data-auth-journey-card
                        className="flex min-h-[116px] flex-col rounded-lg border border-[#9fb4bb]/25 bg-[#eef4f5]/72 p-3.5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055]"
                      >
                        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg ring-1", item.surfaceClass)}>
                          <Icon className={cn("size-4", item.iconClass)} aria-hidden="true" />
                        </span>
                        <p className="mt-3 text-sm font-black text-[#132028] dark:text-white">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-[#58707a] dark:text-[#9fb4bb]">{item.body}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            <div className="mt-5 lg:hidden">
              {renderModuleHighlights()}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#58707a] dark:text-[#8fa4ab]">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--auth-success)]" />
                {pageCopy.common.encrypted}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-[var(--auth-brand-strong)]" />
                {pageCopy.common.teamReady}
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--auth-gold-ink)]" />
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
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[var(--auth-brand)] border-t-transparent" />
        <p className="font-medium text-[#d3ddd8]">{message || authCopy[locale].common.processing}</p>
      </div>
    </div>
  );
}
