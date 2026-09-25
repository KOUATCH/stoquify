// Preserve privacy on every response from the supplier's signed-link endpoints.
export function privateSupplierPoResponse<T extends { headers: Headers }>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store, max-age=0")
  response.headers.set("Referrer-Policy", "no-referrer")
  response.headers.set("X-Content-Type-Options", "nosniff")
  return response
}
