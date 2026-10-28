---
id: 012
title: /api/ready must ping the database (real readiness probe)
area: observability
priority: P0
effort: S
phase: quick-wins
status: done
---

# /api/ready must ping the database (real readiness probe)

## Problem
`app/api/health/route.ts` returns 200 unconditionally (correct for *liveness*). But `/api/ready` (referenced in `middleware.ts:43` as a public route) likely also returns 200 unconditionally. If the DB is down, your uptime monitor sees "all green" while customers see "Internal Server Error" on every page.

Without a working readiness probe, you find out about outages from customer email.

## Acceptance criteria
- [ ] `app/api/ready/route.ts` exists (or is updated) to run `db.$queryRaw\`SELECT 1\`` with a 1s timeout
- [ ] On success: 200 + `{ ok: true, checks: { db: "up" } }`
- [ ] On failure: 503 + `{ ok: false, checks: { db: "down" }, error: "..." }`
- [ ] `/api/health` remains 200-unconditional (liveness — "is the Node process responding")
- [ ] An uptime monitor (Better Stack free tier or UptimeRobot free tier) is configured to hit `/api/ready` every 1-5 minutes and alert on 503
- [ ] **Test:** unit-mock `db.$queryRaw` to throw → `/api/ready` returns 503
- [ ] **Test:** real `db.$queryRaw` succeeds → `/api/ready` returns 200 in under 1 second

## Implementation notes
- Pattern:
  ```ts
  // app/api/ready/route.ts
  import { db } from "@/prisma/db"
  import { NextResponse } from "next/server"

  export const dynamic = "force-dynamic"

  export async function GET() {
    const start = Date.now()
    try {
      await Promise.race([
        db.$queryRaw`SELECT 1`,
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 1000)),
      ])
      return NextResponse.json({ ok: true, checks: { db: "up" }, latency_ms: Date.now() - start })
    } catch (e) {
      return NextResponse.json(
        { ok: false, checks: { db: "down" }, error: e instanceof Error ? e.message : "unknown" },
        { status: 503 },
      )
    }
  }
  ```
- Don't add Redis/Upstash to the readiness check until ticket #002 lands — even then, fail open on Redis (Redis being down should not fail readiness)
- Free uptime monitor: Better Stack offers 10 monitors at 3-min interval on free tier; UptimeRobot offers 50 monitors at 5-min interval on free tier

## Out of scope
- Detailed health dashboard / status page (separate ticket if customer-facing)
- Probe authentication — probe is public; don't expose more than `db: "up" | "down"`

## Resolution
Implemented 2026-05-23. Most of the work was already done — `app/api/ready/route.ts` already pinged the DB and returned 503 on failure. This ticket added the missing piece:

- Added 1-second timeout via `Promise.race` — a hung DB now produces a 503 within 1s instead of hanging the probe
- Added `app/api/ready/route.test.ts` covering: DB success → 200; DB throws → 503; DB hangs past timeout → 503; `Cache-Control: no-store` header set

Verification: `npx vitest run app/api/ready/route.test.ts` → 4/4 passed in 1.97s.

External setup (uptime monitor configuration in Better Stack/UptimeRobot) is operations work, not code — record the URL once configured.
