import { defineRouting } from "next-intl/routing";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "@/types/bilingual";

export const LOCALE_COOKIE = "STOCKFLOW_LOCALE";

export const routing = defineRouting({
  locales: [...SUPPORTED_LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
  localeCookie: { name: LOCALE_COOKIE, maxAge: 60 * 60 * 24 * 365 },
});

export function isLocale(value: string | undefined | null): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function pickLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function stripLocale(pathname: string): string {
  const segments = pathname.split("/");
  return isLocale(segments[1]) ? `/${segments.slice(2).join("/")}`.replace(/\/$/, "") || "/" : pathname;
}

export function getLocaleFromPathname(pathname: string): Locale | undefined {
  const locale = pathname.split("/")[1];
  return isLocale(locale) ? locale : undefined;
}

export function localizePath(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) {
    return href;
  }

  const [, pathname = "/", suffix = ""] = href.match(/^([^?#]*)(.*)$/) ?? [];

  if (getLocaleFromPathname(pathname)) {
    return `${pathname}${suffix}`;
  }

  const pathWithoutLocale = stripLocale(pathname);
  const localizedPath = pathWithoutLocale === "/" ? `/${locale}` : `/${locale}${pathWithoutLocale}`;

  return `${localizedPath}${suffix}`;
}
