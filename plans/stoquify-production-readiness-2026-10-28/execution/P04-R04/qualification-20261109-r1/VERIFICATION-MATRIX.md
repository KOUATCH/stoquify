# P04-R04 verification matrix

Candidate p04-r04-20261109-ef3f203a9ded. [Machine matrix](verification-matrix.json) maps all 58 new unit assertions and 34 native assertions to their exact names and 36 indexed observations.

| Obligation | Evidence | Result |
|---|---|---|
| Unknown/private errors across both input forms | Unit plain/string/coded/Prisma/typed errors and actual native Prisma fault | Passed |
| Validation and guard denials before service | Unit malformed inputs and fixed RBAC recovery messages; native revoked permissions, unauthenticated transport and invalid pagination | Passed |
| Authorized compatibility | Object/positional defaults, all object filters, hook envelope; native related DTOs, search, filters, sorting, pagination, empty results and permission restoration | Passed |
| Tenant isolation | Server actor org override unchanged; native forged organization and foreign relation filters | Passed |
| No unauthorized business writes | All 36 native before/after pairs equal across 24 business groups; 4 security-audit additions separately counted | Passed |
| Recovery/control flow | Unit FreshAuth and Next signals; real query failure and fixture-schema restoration | Passed within stated scope |
| Source/static integrity | 25 baseline snapshots, 26 current unit inputs, 2 owned files and 5,209 native source inputs; scoped types/lint | Passed |

276 total unit tests (58 new, 218 continuity) passed in 3 suites with zero skips/failures. Exact pre-repair bytes reproduced 2 canary disclosures; 56 other assertions were explicitly filtered in that characterization. Native passed all 34 tests after 121 migration replays/checksums. Observations comprise 9 denied/failed calls and 27 authorized reads. Final owned cluster stopped cleanly, port released, clients empty; fixtures retained.

The hook query function is unit-exercised with useQuery mocked; no rendered UI claim. Native Better Auth/Next transport is stubbed. Actual signed-cookie, session expiry/revocation, browser restoration, hosted/provider and production acceptance remain separate.
