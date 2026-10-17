// Per-process fallback only. Shared/edge enforcement must be verified separately.
export class TrafficLimiter {
  private readonly entries = new Map<string, { count: number; resetAt: number }>()
  private overflow = { count: 0, resetAt: 0 }

  constructor(private readonly capacity = 10000, private readonly limit = 200, private readonly windowMs = 60000) {}

  check(key: string, now = Date.now()) {
    // Fixed windows retain insertion order; never evict a live identity to admit
    // another one (that would let churn reset an attacker's allowance).
    for (const [identity, entry] of this.entries) {
      if (entry.resetAt > now) break
      this.entries.delete(identity)
    }
    let entry = this.entries.get(key)
    if (!entry) {
      if (this.entries.size < this.capacity) {
        entry = { count: 0, resetAt: now + this.windowMs }
        this.entries.set(key, entry)
      } else {
        if (this.overflow.resetAt <= now) this.overflow = { count: 0, resetAt: now + this.windowMs }
        entry = this.overflow
      }
    }
    const allowed = entry.count < this.limit
    if (allowed) entry.count++
    return { allowed, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) }
  }

  get size() { return this.entries.size }
}

export function trafficIdentity(headers: Headers, trustedHeader?: string) {
  // Configure only after the ingress overwrites this header AND direct origin
  // access is closed. This function cannot authenticate the network peer.
  if (trustedHeader) {
    if (!["x-real-ip", "cf-connecting-ip"].includes(trustedHeader)) return "unknown"
    const value = headers.get(trustedHeader)?.trim()
    return normalizeAddress(value)
  }
  // Compatibility fallback pending a verified deployment contract. These are
  // untrusted partition keys, NOT proof of identity or a distributed abuse gate.
  const value = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim()
  return normalizeAddress(value)
}

function normalizeAddress(value: string | undefined) {
  if (!value || value.length > 64 || !/^[0-9a-fA-F:.]+$/.test(value)) return "unknown"
  if (value.includes(":")) {
    try { return new URL(`http://[${value}]/`).hostname.toLowerCase() } catch { return "unknown" }
  }
  const parts = value.split(".")
  return parts.length === 4 && parts.every(part => /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255) ? value : "unknown"
}
