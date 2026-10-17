# Concurrent worktree changes and rechecks

During the audit, 15 fingerprinted files changed outside the audit's own writes. These include payroll control/register and accountant-workspace services, components and tests. The review therefore describes timestamped evidence windows, not a single frozen HEAD. No attempt was made to revert those changes or interrupt other work.

| Recheck cohort | Suites | Passed | Failed | Source files changed during run |
|---|---:|---:|---:|---:|
| people | 73 | 552 | 15 | 0 |
| finance | 65 | 677 | 3 | 0 |
| supplement | 16 | 112 | 0 | 0 |
| changed-ui | 1 | 8 | 0 | 0 |

The original sweep (3,173 pass / 23 fail across 326 suites) is retained; these follow-up results are separate and must not be added to it as unique coverage. The changed-UI cohort is additional targeted coverage. Current residual failures are listed in [verification/recheck-summary.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/recheck-summary.json>). Each recheck captures selected test paths, source hashes at start and changes observed through the end of the run.

None of the ten critical offline/accounting/schema source files listed in recheck-summary.json changed relative to the initial fingerprint baseline. The reproduced core findings remain tied to those unchanged files.

No fingerprinted source file changed within these individual recheck windows. This still does not establish a clean committed release or exact CI pass.

The accountant-workspace tests now show improvement in the finance cohort after the concurrently updated mocks/implementation. Initial failure descriptions remain historical observations. The payroll/country and manual-journal limitations are not waived by this recheck.
