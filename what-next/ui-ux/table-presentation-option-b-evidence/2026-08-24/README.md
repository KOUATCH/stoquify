# Option B Phase 0 Browser Evidence

Date: 2026-08-24

Status: **sandbox repaired; authenticated and authorized evidence environment pending**

- Approved browser attempts: 3, including post-repair verification.
- Sessions created: 1 after repair.
- Routes opened: 1 after repair; redirected to login.
- Diagnostic login screenshots observed: 1 transient; no protected table data.
- Target-route evidence screenshots captured: 0.
- Keyboard checks: 0.
- Accessibility checks: 0.
- Sensitive data captured: no.

The Codex Windows sandbox setup helper originally returned `helper_unknown_error` with `setup refresh had errors`. The sandbox log identified an Access Denied failure while applying the protective ACL to the repository `.git` directory. Changing only that directory's owner from `BUILTIN\Administrators` to the current Windows user repaired browser startup.

The repaired browser opened the supplier route and reached the Stoquify login callback. No missing table evidence is treated as a passing result. Phase 1 remains unauthorized until the authenticated browser gate succeeds.

After the Prisma runtime repair and development-server restart, the approved browser reproduced the same protected supplier-route redirect and rendered the Stoquify login page. This rules out the repaired sandbox, Prisma query path, and route startup as the active gate. The controlled evidence tabs remain unauthenticated, so authenticated server activity from another client is not accepted as Phase 0 browser evidence.

The subsequent read-only audit confirmed that the app auth endpoint responds normally, but the current database has no known fixture identity and no active verified identity combining the five highlighted route permissions with payroll and purchasing module access. The fixture scripts are separate by workflow, materially write synthetic data, refuse the current nonlocal database by default, and require Prisma connectivity repair before they could be considered.

## 2026-08-25 primary-route preflight

An authenticated approved-browser session passed desktop access for suppliers, payroll compensation, payroll employees, people, and purchase orders. Each page rendered its table and showed neither a login form nor an access-denied state. The capture retained only route-level UI signals, not row contents. This is preflight evidence only; the full Phase 0 matrix remains pending.

See [blocker-register.json](./blocker-register.json) for machine-readable findings, [ownership-baseline.json](./ownership-baseline.json) for exact user-owned file hashes, and [the consolidated blocker report](../../AQSTOQFLOW_TABLE_OPTION_B_PHASE_0_BLOCKER_REGISTER_2026-08-24.md) for the safe recovery sequence.
