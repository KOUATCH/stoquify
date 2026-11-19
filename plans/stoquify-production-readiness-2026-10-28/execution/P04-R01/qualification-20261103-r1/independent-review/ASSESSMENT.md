# Independent P04-R01 assessment

**Accepted for bounded local completion: `verified_local_native_actions`.** Candidate `p04-r01-20261103-e7ff3b08d605` has no remaining blocking finding in the reviewed repair. Parent P04 and production readiness remain blocked. See the [machine-readable assessment](ASSESSMENT.json).

The initial assessment was invalidated when a missed delivery-issues helper consumer was found. Its exact prior evidence and the subsequent hold are retained. The final review includes that caller's current reviewer/target code projections, filtering before candidates and cursors, and historical ordinary-evidence compatibility. A new isolated cluster qualified the completed candidate; the original cluster was preserved.

| Evidence | Independently reconciled result |
|---|---|
| Source | 18 product files and 14 tests; 108 pre-repair snapshots; candidate identity independently recomputed |
| Unit/static | 454 passing tests in 17 suites, zero failures/skips; 110 inputs unchanged; 18 product entry files typechecked; 32 files linted with no errors/warnings |
| Real PostgreSQL/action composition | 39 passing tests, zero failures/skips; 121 migrations applied and checksum-verified; all 5,206 final input hashes independently matched |
| Denial and recovery | 35 matching selected-state snapshot pairs across 38 observations; real lock wait, current-code revocation and transactional rollback proved; authorized controls passed |
| Cleanup | Owned PID 38328 stopped; port 53776 released; no remaining clients; postmaster PID file absent; r1 and r2 synthetic databases retained |

Fresh stored role codes and permissions now govern reserved or composed tenant-scope grants, reactivation and replay. Invitation proofs bind issuer and target codes while preserving authorized ordinary legacy evidence. The extra native delivery tests demonstrate authorized reads, hidden reserved records/cursors after code loss, and denial after stored reviewer-permission revocation, without business-state changes.

The native lane calls production service and server-action functions with real Prisma and persisted authorization/session rows. Better Auth transport and Next request/cache context are stubbed. This proves neither actual signed-cookie HTTP nor browser behavior. Selected business-state hashes exclude separately counted security audits and documented synthetic abuse/request failure bookkeeping; positive controls intentionally change fixtures.

Dedicated last-tenant-custodian PostgreSQL cases were not run; custody-specific evidence is unit-only. Production role/invitation census, reviewed replacement of held legacy reserved invitations, P04-V01/V02, a fresh full-app/release candidate and hosted/provider/operator acceptance remain open. No production records, flags, deployment, commit or push are part of this acceptance.

The next eligible package is **P04-R03**. Its first action is to refresh P04-F03 against `actions/item/items.ts` and the current safe-action error contract, then capture source hashes and the nine affected handler/catch paths before preparing a bounded response repair. The [bounded register publication](PUBLICATION-REVIEW.json) is independently accepted; other packages, domain coverage and deferred commitments remain unchanged.
