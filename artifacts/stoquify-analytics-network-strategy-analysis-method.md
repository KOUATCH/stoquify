# Stoquify analytical screen prioritization method

Snapshot generated 2026-08-29T14:54:44.3032078Z.

This report is a structural product analysis of the Stoquify repository. It uses current routes, components, server actions, services, Prisma models, Graphify architecture reports, and the 2026-08-28 comprehensive system evaluation. It does not use live tenant telemetry, customer interviews, revenue data, adoption funnels, or production SLOs.

## Scoring formula

Each proposed screen receives a directional 1–5 analyst rating for:

- user value: 35%
- foundation readiness: 25%
- network leverage: 25%
- trust safety: 15%

Weighted priority score = `(user value × 0.35) + (foundation readiness × 0.25) + (network leverage × 0.25) + (trust safety × 0.15)`.

The score is a sequencing aid, not observed ROI, market demand, delivery effort, or production readiness. Re-rank it after product telemetry, customer discovery, delivery estimates, privacy review, and pilot results become available.

## Evidence boundaries

- Code presence indicates a technical foundation, not proven customer value or production safety.
- The current system evaluation reports 3 of 12 blocker families ready and 9 open.
- External blocker counts of 70 and 102 use different schemas and are not combined.
- Supplier and accountant collaboration are treated as the first network wedges because they already have consent, redaction, proposal, access, evidence, or portfolio foundations.
- An app/agent marketplace is staged later because durable package, subscription, entitlement, provider, billing, installation, rollback, and review lifecycles are not yet productized.
