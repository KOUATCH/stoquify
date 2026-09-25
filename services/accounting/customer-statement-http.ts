// All responses from bearer-link endpoints are private, including denials.
export function privateStatementResponse<T extends { headers: Headers }>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store, max-age=0")
  response.headers.set("Referrer-Policy", "no-referrer")
  response.headers.set("X-Content-Type-Options", "nosniff")
  return response
}
