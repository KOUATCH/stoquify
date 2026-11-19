export const CSP_NONCE_HEADER = "x-stoquify-csp-nonce"

export function reportOnlyBaseline(baseline: string, nonce: string) {
  // Next 15 copies middleware response headers back onto renderer requests.
  // Its enforcing CSP therefore also needs the nonce for framework scripts.
  // CSP3 element/attribute overrides retain baseline inline behavior while the
  // separate report-only policy measures the proposed restriction.
  return baseline.replace(/script-src ([^;]+);/, `script-src $1 'nonce-${nonce}'; script-src-elem 'self' 'unsafe-inline'; script-src-attr 'unsafe-inline';`)
}

export function cspPilot(pathname: string, mode: string | undefined, production: boolean) {
  // Exact dynamic-page cohort. No static/public, POS, API or evidence routes.
  if (!/^\/(en|fr)\/login\/?$/.test(pathname) || !["report-only", "enforce"].includes(mode ?? "")) return null
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  const nonce = btoa(String.fromCharCode(...bytes))
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${production ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https: wss:",
    "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'",
  ].join("; ") + ";"
  return { nonce, policy, header: mode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only" }
}
