"use client";

import { Button } from "@/components/ui/button";
import StoquifyLogo from "@/components/global/kit-logo";
import { localizePath } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Globe2, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { ReactNode, useEffect, useState } from "react";
import { authCopy, getAuthLocale } from "./auth-copy";
import { publicAuthCopy } from "./public-auth-copy";
import { PublicWorkspaceGuide } from "./public-workspace-guide";

interface AuthLayoutProps {
  children: ReactNode;
  variant?: "login" | "register" | "forgot" | "verify";
  className?: string;
}

export default function AuthLayout({ children, variant = "login", className }: AuthLayoutProps) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { resolvedTheme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  useEffect(() => { setThemeReady(true); }, []);
  const locale = getAuthLocale(pathname);
  const pageCopy = authCopy[locale];
  const targetLocale = locale === "fr" ? "en" : "fr";
  const pathWithoutLocale = pathname.replace(/^\/(en|fr)(?=\/|$)/, "") || "/login";
  const query = params.toString();
  const targetLocaleHref = `/${targetLocale}${pathWithoutLocale}${query ? `?${query}` : ""}`;
  const isDarkTheme = themeReady && resolvedTheme === "dark";
  const journeyCopy = publicAuthCopy[locale].nextSteps;
  const journeyCards = [journeyCopy.context, journeyCopy.access, journeyCopy.assurance];
  const hasWorkspaceGuide = variant === "login" || variant === "register";

  return (
    <main className={cn("auth-shell min-h-screen bg-[var(--auth-canvas)] text-[var(--auth-text)]", hasWorkspaceGuide ? "auth-contour-shell" : "auth-shell-grid", className)}>
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href={localizePath("/", locale)} className="block min-w-0 max-w-[190px] sm:max-w-none">
          <StoquifyLogo className="w-full" theme={isDarkTheme ? "dark" : "light"} width={212} height={48} tagline={pageCopy.common.brandSubtitle} />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={targetLocaleHref} className="flex min-h-11 items-center gap-2 rounded-lg border border-[#9fb4bb]/35 px-3 text-sm font-semibold uppercase dark:border-white/20" aria-label={`${pageCopy.common.languageAria}: ${targetLocale.toUpperCase()}`}>
            <Globe2 className="h-4 w-4" aria-hidden="true" />{targetLocale}
          </Link>
          <Button type="button" variant="ghost" onClick={() => setTheme(isDarkTheme ? "light" : "dark")} className="h-11 rounded-lg border border-[#9fb4bb]/35 px-3 dark:border-white/20" aria-label={isDarkTheme ? pageCopy.common.switchToLight : pageCopy.common.switchToDark}>
            {isDarkTheme ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      </header>
      <div className={cn("mx-auto w-full px-4 pb-10 pt-4 sm:pt-8", variant === "register" ? "max-w-2xl" : "max-w-lg", hasWorkspaceGuide && "grid items-start gap-8 lg:max-w-6xl lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:gap-12 lg:px-8")}>
        <div className="min-w-0">
          {children}
          {variant === "register" && (
            <section data-auth-journey className="mt-6 px-1" aria-label={journeyCopy.label}>
              <h2 className="text-sm font-semibold">{journeyCopy.label}</h2>
              <ol className="mt-3 grid gap-4 sm:grid-cols-3">
                {journeyCards.map((item, index) => (
                  <li key={item.title} data-auth-journey-card className="border-t border-[#9fb4bb]/30 pt-3">
                    <p className="text-sm font-semibold">{index + 1}. {item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--auth-text-soft)]">{item.body}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
        {(variant === "login" || variant === "register") && (
          <PublicWorkspaceGuide locale={locale} variant={variant} />
        )}
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
        "rounded-xl border border-[#9fb4bb]/25 bg-[var(--auth-surface)] p-5 shadow-[0_28px_80px_rgba(24,38,45,0.20)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#142129]/90 dark:shadow-[0_28px_80px_rgba(5,12,16,0.46)] sm:p-7",
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
