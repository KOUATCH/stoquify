# Referral War Room Phase 3 Slice 420 Selection Report

Date: 2026-08-01
Orchestrator: `stoquify-referral-war-room-orchestrator`
Selected skill: `stoquify-referral-war-room-orchestrator`
Next-pillar skill under audit: `stoquify-accountant-close-portal`

## Selected Slice

Phase 3 / Slice 420: Phase 3 Exit And Phase 4 Accountant-Close Entry Gate.

This is an orchestration and evidence slice. It authorizes no product-code change.

## Evidence Reviewed

- All required referral source documents named by the orchestrator skill.
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/CASH_LEAKAGE_RADAR_REPORT_2026-07-19.md`
- `what-next/referrals/INVENTORY_LOSS_CONTROL_REPORT_2026-08-01.md`
- `what-next/referrals/INVENTORY_LOSS_CONTROL_SLICE_414_REPORT_2026-08-01.md`
- Slice 415 through Slice 419 Inventory Loss consumer and authorization evidence.
- Live Workflow Assurance incident, Inventory Loss action, snapshot, signal, and action-queue services and tests.
- Live accountant access, data-trust, close-readiness, close-pack, route, action, Prisma, and test surfaces.
- Installed `stoquify-accountant-close-portal` skill.

The configured `graphify-out/` architecture evidence directory is absent, so this audit relies on live source and test evidence.

## Candidate Decision

| Candidate | Impact | Readiness | Risk | Decision |
| --- | --- | --- | --- | --- |
| Phase 3 exit and Phase 4 entry gate | High | High | Low | Selected |
| Role-aware navigation filtering | Low | Medium | Low | Deferred; service gates already own authorization |
| Location-scoped Cash Command | Medium | Low | High | Deferred; requires a distinct read model and UX |
| Another Inventory Loss consumer or owner queue | Medium | Medium | Medium | Deferred; five certified consumers already cover current daily command surfaces |
| Immediate accountant feature edit | High | Medium | High | Deferred until existing untracked access surfaces and phase dependencies are formally inventoried |

## Why This Slice

The war plan defines Phase 3 success as deterministic mismatch and Inventory Loss review controls with permissioned audit and non-accusatory wording. Live evidence now includes:

- deterministic cash and Inventory Loss review rules;
- explicit count, variance, adjustment, and write-off commands;
- server-owned actor, organization, permission, entitlement, and maker-checker controls;
- durable assurance incident identity and transition audit;
- protected resolution commands;
- neutral wording that explicitly does not identify who caused recorded loss;
- five certified Inventory Loss action consumers.

The POS cash-shortage production definition remains disabled. That is a production activation hold, not a reason to keep the entire roadmap in Phase 3 indefinitely. This slice must preserve that hold.

Phase 4 dependencies are present but not yet referral-program certified:

- explicit expiring accountant-client consent grants;
- delegated READ and EXPORT capability checks;
- active-grant portfolio scoping;
- service-owned accountant data-trust reads;
- close readiness and close-pack export services;
- redaction and audit controls;
- accountant portal routes.

Several accountant-access files are currently untracked, and accountant portal files are modified in the shared worktree. Slice 420 may inspect and test them but must not rewrite, normalize, stage, or claim authorship of those surfaces.

## Required Gate

Phase 3 may close only if focused current-state verification proves:

- deterministic review rules remain green;
- Inventory Loss write commands remain permissioned and entitlement-gated;
- exception/action resolution remains audited;
- neutral language remains present;
- no POS cash-shortage production activation occurred.

Phase 4 may become active only if focused current-state verification proves:

- accountant grants are tenant-scoped, explicit, expiring, and revocable;
- delegated cross-client reads require an active consent grant;
- READ_ONLY grants cannot export;
- portfolio reads use the authenticated accountant identity;
- data-trust actions use the resolved client organization;
- route access remains permission-gated;
- close readiness and redacted pack foundations remain green.

## Expected Files

Orchestration artifacts only:

- `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_420_SELECTION_REPORT_2026-08-01.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_EXIT_PHASE_4_ENTRY_REPORT_2026-08-01.md`
- `what-next/skills-life-cycle/STOQUIFY_SLICE_420_RELEASE_EVIDENCE_REPORT_2026-08-01.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- Focused Phase 3 Jest bundle for Inventory Loss controls, signals, action queue, assurance incidents, and protected resolution.
- Focused Phase 4 baseline bundle for accountant access, delegated data trust, portal route, close readiness, and close-pack export.
- Full typecheck as a phase-transition integrity gate.
- Static Phase 3 neutral-language and disabled-activation scans.
- Static accountant tenant, capability, expiry, revocation, redaction, and protected-route scans.
- Scoped artifact whitespace and reject-file checks.

## Non-Goals

- No application code, schema, migration, route, component, navigation, notification, or production configuration change.
- No POS cash-shortage activation.
- No claim that the whole Accountant Portal phase is complete.
- No accountant firm practice-management expansion.
- No external sharing, AI/copilot, or WhatsApp authority.

## Handoff

If the gate passes, Phase 3 will be marked complete and Phase 4 will become active. No Phase 4 implementation slice will be selected until a fresh orchestrator audit ranks the existing accountant-close gaps.
