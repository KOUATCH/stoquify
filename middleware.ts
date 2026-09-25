import {
  getLocaleFromPathname,
  localizePath,
  LOCALE_COOKIE,
  pickLocale,
  stripLocale,
} from "@/i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { DASHBOARD_REQUEST_PATH_HEADER } from "@/lib/security/dashboard-session-recovery";

const scriptSrc =
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Strict-Transport-Security":
    process.env.NODE_ENV === "production"
      ? "max-age=31536000; includeSubDomains"
      : "",
  "Content-Security-Policy": `
    default-src 'self';
    ${scriptSrc};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https: blob:;
    connect-src 'self' https: wss:;
    object-src 'none';
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  `
    .replace(/\s+/g, " ")
    .trim(),
}

function applySecurityHeaders(response: NextResponse, pathname = ""): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) response.headers.set(key, value)
  })
  // Signed statement, supplier and receipt URLs carry bearer evidence. Preserve the private route
  // policy through middleware responses, including rate-limit denials.
  if (/^\/(?:customer-statement|digital-receipt|api\/receipts|api\/customer-statements|api\/supplier-po-envelopes)(?:\/|$)/.test(pathname) || /^\/(?:en|fr)\/supplier-purchase-order(?:\/|$)/.test(pathname)) {
    response.headers.set("Referrer-Policy", "no-referrer")
    response.headers.set("Cache-Control", "private, no-store, max-age=0")
  }
  if (/^\/(?:digital-receipt|api\/receipts)(?:\/|$)/.test(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  }
  return response
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function rateLimit(ip: string, maxRequests = 100, windowMs = 60000): boolean {
  const now = Date.now()
  const clientData = rateLimitStore.get(ip)

  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (clientData.count >= maxRequests) return false
  clientData.count++
  return true
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  )
}

function getLocaleRequestHeaders(req: NextRequest, locale: string): Headers {
  const headers = new Headers(req.headers)
  headers.set("X-NEXT-INTL-LOCALE", locale)
  // Overwrite incoming values: server layouts need the actual requested page
  // when an existing session cookie turns out to be expired or revoked.
  headers.delete(DASHBOARD_REQUEST_PATH_HEADER)
  if (/^\/(?:en|fr)\/dashboard(?:\/|$)/.test(req.nextUrl.pathname)) {
    headers.set(DASHBOARD_REQUEST_PATH_HEADER, req.nextUrl.pathname + req.nextUrl.search)
  }
  return headers
}

function nextWithLocale(req: NextRequest, locale: string): NextResponse {
  const response = NextResponse.next({
    request: { headers: getLocaleRequestHeaders(req, locale) },
  })
  response.cookies.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  })
  return applySecurityHeaders(response, req.nextUrl.pathname)
}

function redirectWithLocaleCookie(
  req: NextRequest,
  href: string,
  locale: string
): NextResponse {
  const response = NextResponse.redirect(new URL(href, req.url))
  response.cookies.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  })
  return applySecurityHeaders(response, req.nextUrl.pathname)
}

// Optimistic routing only; server authorization validates the session. HTTPS uses the secure prefix.
function isAuthenticated(req: NextRequest): boolean {
  return !!(req.cookies.get("__Secure-better-auth.session_token")?.value || req.cookies.get("better-auth.session_token")?.value)
}

export default function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const pathLocale = getLocaleFromPathname(pathname)
  const locale = pathLocale ?? pickLocale(req.cookies.get(LOCALE_COOKIE)?.value)
  const path = stripLocale(pathname)
  const clientIP = getClientIP(req)
  const authenticated = isAuthenticated(req)

  const isAuthRoute =
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/verify")
  const isDashboardRoute = path.startsWith("/dashboard")
  const isHomeRoute = path === "/" || path === ""

  // Skip middleware for static files and assets
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/auth/") ||
    (pathname.includes(".") && !pathname.includes("/api/"))
  ) {
    return nextWithLocale(req, locale)
  }

  if (!pathLocale && (isHomeRoute || isAuthRoute || isDashboardRoute)) {
    return redirectWithLocaleCookie(
      req,
      localizePath(`${path}${search}`, locale),
      locale
    )
  }

  if (!isAuthRoute && !rateLimit(clientIP, 200, 60000)) {
    const response = new NextResponse(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429, headers: { "content-type": "application/json" } }
    )
    return applySecurityHeaders(response, pathname)
  }

  if (isHomeRoute) {
    return nextWithLocale(req, locale)
  }

  if (isAuthRoute) {
    return nextWithLocale(req, locale)
  }

  if (isDashboardRoute) {
    if (!authenticated) {
      const loginUrl = new URL(`/${locale}/login`, req.url)
      loginUrl.searchParams.set("callbackUrl", pathname + search)
      return redirectWithLocaleCookie(
        req,
        loginUrl.pathname + loginUrl.search,
        locale
      )
    }
    return nextWithLocale(req, locale)
  }

  const response = nextWithLocale(req, locale)

  if (pathname.startsWith("/api")) {
    const origin = req.headers.get("origin")
    if (origin === req.nextUrl.origin) {
      response.headers.set("Access-Control-Allow-Origin", origin)
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      )
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      )
      response.headers.set("Access-Control-Allow-Credentials", "true")
      response.headers.set("Vary", "Origin")
    }
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: response.headers })
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
