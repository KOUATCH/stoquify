# Accountant portfolio

Scope: existing delegated-client portfolio route, AF02 (19 October 2026). Follow MASTER.md, the UI constitution and the current shared primitives.

Reuse the accounting page shell, dashboard semantic tokens, ProofBadge and RouteStatePanel. Use one page h1; portfolio h2, client h3 and blocker h4. Native search and links have visible focus, labels, wrapping and at least 44px action height. Cards reflow from one column to two at xl; long names and French action labels wrap.

AF01 owns grants, period selection, proof state, evidence grade and blockers. Show historical readiness and historical blockers separately from current proof; CURRENT means assessment selection, not certification. Null period, score or evidence remains unavailable. Include assessment as-of, proof-check time and access expiry in UTC. Localize canonical blocker IDs without recalculating their severity or business decision.

Search resets the grant cursor. Page counts describe authorized rows on this page. An empty denied page may still have continuation. End of scan is not a firm-wide total. The evidence work desk retains its own coverage and filters. Evidence navigation carries the server-returned client and period and uses the existing independently authorized portal.

Clear portfolio and unmount work-desk private state before refresh, page/search change and reauthorization. Hidden/pagehide states invalidate in-flight reads; visibility/BFCache return and known mandate expiry recheck via the protected action. Late responses cannot restore removed data. Do not persist private DTOs in local storage. Safe search/navigation context remains. Refresh also clears work-desk drafts; do not claim draft persistence across workspace reauthorization.

The existing route guard owns initial module/role/session recovery. In-workspace FORBIDDEN is deliberately generic because AF01 redacts module/client denial reasons. Never infer a denied client's identity or disclose an internal error string. Controlled EN/FR desktop/mobile browser evidence and keyboard recovery are required; component mocks are recorded separately.
