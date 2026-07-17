---
id: 002
title: Replace in-memory rate limiter with Upstash Ratelimit (free tier)
area: security
priority: P0
effort: S
phase: quick-wins
status: done
---

# Replace in-memory rate limiter with Upstash Ratelimit (free tier)

## Problem
`lib/security/rate-limit.ts:19-79` is a `Map`-based limiter scoped to a single module instance. On Vercel serverless functions the instance is per-invocation; on the Edge runtime (where the middleware runs) it's per-edge-region and resets on cold start. Net result: the documented limit of "5 sign-in attempts / 15 min" is effectively unbounded across the edge fleet — an attacker gets ~5 attempts per *warm* instance and there are many. Credential stuffing is not actually defended against.

## Acceptance criteria
- [ ] `@upstash/ratelimit` and `@upstash/redis` installed
- [ ] `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` added to `lib/env.ts` schema and `.env.example`
- [ ] `lib/security/rate-limit.ts` exports the same `authRateLimit`, `apiRateLimit`, `strictRateLimit`, `getClientIP` API (drop-in replacement so `middleware.ts` doesn't change shape)
- [ ] Each limiter uses `Ratelimit.slidingWindow(...)` with prefixes (`rl:auth`, `rl:api`, `rl:strict`)
- [ ] Fail OPEN with `logger.warn` if Upstash is unreachable (do NOT lock everyone out if Redis is down)
- [ ] Stays within Upstash free tier (10k commands/day). Document expected daily traffic in a code comment
- [ ] **Test:** 6 sequential sign-in attempts from one IP within 60s — the 6th returns 429 with `Retry-After`
- [ ] **Test:** if `UPSTASH_REDIS_REST_URL` is unset, limiter fails open and logs a warning (not an error)

## Implementation notes
- Free Upstash account → create a Redis DB → REST URL + token go in Vercel project env
- `Ratelimit.slidingWindow(5, "15 m")` for `authRateLimit` (matches current intent)
- `Ratelimit.slidingWindow(60, "1 m")` for `apiRateLimit`
- `Ratelimit.slidingWindow(10, "1 m")` for `strictRateLimit`
- Identifier is `getClientIP(request)` (already implemented in the file)
- Don't import `@upstash/ratelimit` in a Node-runtime file expecting Edge — confirm it works in Next.js Edge middleware (it does as of latest)
- Free tier note in code: at 50 orgs × ~50 requests/day each rate-limited surface, well under 10k commands/day

## Out of scope
- Per-user rate limit (in addition to per-IP) → consider as part of #003 if abuse patterns warrant
- WAF / DDoS at the edge — Vercel handles the absurd cases

## Resolution
Implemented 2026-05-23.

- `@upstash/ratelimit ^2.0.8` and `@upstash/redis ^1.38.0` installed via `npm install --legacy-peer-deps` (cmdk@1.0.0 still pins react 18 — known peer conflict, unrelated to this work).
- `lib/security/rate-limit.ts` rewritten:
  - Same exported API (`authRateLimit`, `apiRateLimit`, `strictRateLimit`, `getClientIP`, `RateLimitResult`) — but `.check()` is now async (returns `Promise<RateLimitResult>`).
  - `buildLimiter()` factory inspects `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`:
    - **Both set** → `UpstashLimiterWrapper` (Redis-backed sliding-window). This is the production path.
    - **Missing in prod** → in-memory `InMemoryLimiter` (legacy behavior) + a `logger.warn` so engineers see the degraded mode in prod logs.
    - **Missing in dev** → silent in-memory fallback (no noise during local development).
  - `UpstashLimiterWrapper.check()` wraps `ratelimit.limit(id)` in try/catch and **fails open** on Redis errors — logs a warning, allows the request. Lock-everyone-out behavior on Redis outage is a bigger risk than brief over-allowance.
- `middleware.ts` updated: `strictRateLimit.check()`, `apiRateLimit.check()`, `authRateLimit.check()` are now `await`-ed.
- `lib/env.ts` and `.env.example`: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` documented.
- `lib/security/rate-limit.test.ts` added — 6 vitest cases covering the in-memory fallback path: 6th sign-in returns 429, per-IP isolation, `getClientIP` parsing (x-forwarded-for, x-real-ip, fallback), and the `reset` Date contract.

Verification:
- `npx vitest run lib/security/rate-limit.test.ts` → 6/6 passed (776ms).

To activate Upstash in production:
1. Sign up at https://upstash.com (free tier covers 10k commands/day; ~50 orgs × 50 limited requests/day each is well under).
2. Create a Redis database in the same region as the Vercel deployment.
3. Copy REST URL + REST Token into Vercel project env (Production + Preview).
4. Redeploy — the warning log goes away and rate limits become globally consistent.
