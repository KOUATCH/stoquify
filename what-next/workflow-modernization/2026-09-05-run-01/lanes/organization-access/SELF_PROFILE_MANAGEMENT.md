# Self-profile management — source v36

**Later source v37 update:** the OA-F18 header clipping described below is now corrected for the verified EN/FR width/text-size cases. See [HEADER_REFLOW.md](HEADER_REFLOW.md). The v36 evidence remains its historical source-bound record; broader accessibility and platform scope remain open.

The existing account-menu destination now opens a working profile form at `/en/dashboard/profile` and `/fr/dashboard/profile`. This is the supported Profile implementation record. `SELF_PROFILE_BOUNDARY.md` preserves the earlier discovery state; it is not the current implementation status. The whole-platform assignment remains incomplete.

## What changed and why

The previous generic authentication endpoint accepted a changed display name from an authenticated user without `profile.update`, wrote no application audit and left structured names different. Two isolated HTTP reproductions established that behavior. The missing localized profile pages also returned 404.

The new route uses the existing shell, profile permissions, organization context and design tokens. Service-owned reads expose current permitted fields and the latest ten profile-save receipts. Saves validate the current organization, usable account, roles and exact unexpired requesting session. They lock the affected records, check the reviewed revision, update only first name, last name, job title and their derived display name, and persist the receipt in the same transaction. Failed audit persistence rolls back the profile change. No schema migration was needed.

Three duplicate requests produce one change receipt. Concurrent different edits have one winner and one stale conflict. Recovering an earlier request returns its original receipt and preserves subsequent edits. Current authority is checked before recovery, including after a new login. Empty optional last name and job title become null; a given/display name is required. A no-op can produce a receipt without changing the account revision.

The review hash includes the account's `updatedAt`, so another account update can require renewed review even when its display fields did not change. This conservatively prevents lost updates without adding a profile-version schema. The screen calls this an account-record change and preserves the user's edits for comparison.

## Using the form

1. Open your account menu, then **My profile / Mon profil**.
2. Supply the name you want colleagues to see. Family name and job title are optional. Get these values from the account holder or your internal staff directory; do not enter an approver identity or an approval-record reference.
3. Review the values and save. Your administrator must grant both `profile.read` and `profile.update` through the existing role controls. A reader can inspect the profile without editing.
4. If the account record changed, compare its saved values with your draft. Choose the current saved values or explicitly keep your edits against the newly reviewed version.
5. If a save result is unknown, recover the same request. Refreshing this tab preserves the request identity and draft for up to 24 hours. Recovery still requires current access. A failed read offers reload and never replaces stored values with an empty successful result.
6. A confirmed receipt identifies the save. A separate account-display refresh failure does not undo a confirmed save; reload the page to refresh its name. Recent history records earlier saves and can differ from the latest profile.

No new approver, signing platform, file hash or manual SOURCE RECORD URI is required for this basic self-service operation. It does not clear X1 or verify a signer's authority. Email, phone ownership, password, role grants and avatar uploads require their separate supported workflows. This screen does not change them.

Local drafts contain names/title and recovery metadata only, scoped to organization and actor in session storage. Closing the tab can lose an unsaved draft; recent server receipts remain available after a new authorized login. Do not treat browser metadata as approval or authoritative completion.

## API compatibility

`GET /api/me/profile` supplies the current self-profile and `snapshotHash`, with `private, no-store` caching. `POST /api/auth/update-user` now accepts `{ requestId, expectedHash, fields: { firstName, lastName, jobTitle } }`, with a new UUID for a new reviewed change and the same UUID/payload for a retry. A trusted origin, valid JSON, current session and current `profile.update` are mandatory. The body limit is 8 KiB.

Old `{ name }`, image, phone or arbitrary identity updates receive `409 PROFILE_REVIEW_REQUIRED` with the read endpoint. No in-repository generic update-user caller was found. External SDK/API consumers must adopt this reviewed contract before rollout. This is a deliberate compatibility change that closes the reproduced alternate write path. Other Better Auth handlers and global cookie/session policy are unchanged. Canonical, trailing-slash, encoded and doubled-slash legacy attempts were denied without profile changes in real HTTP verification.

## Account menu and design mapping

The menu now uses real shell-provided organization and role labels. Unsupported online dots, fixed Pro subscription and hardcoded version claims were removed from this menu. The shared shell still has other presence/readiness labels requiring their own review. Existing navigation destinations remain; duplicate Profile/Settings quick buttons became single keyboard-operable menu items. This removes redundant stops and uses the existing Radix menu interaction model.

All menu copy is EN/FR. Theme selection is a native menu checkbox, with no nested switch. Sign-out checks the returned result: failure keeps the menu and an actionable message; confirmed sign-out redirects to the localized login page. This fixes this menu's caller only; other uses of the older global sign-out helper remain separate work.

Profile surfaces use `--dash-surface`, `--dash-border-subtle` and dashboard text tokens. Selection/navigation use brand treatment, saved receipts use success, and stale/unknown states use warning with explicit text. The header avatar uses the globally available `--product-brand` and white text, because dashboard-local tokens were unavailable at that header boundary. Portal menus reuse `enterprise-floating-surface` and its shared focus treatment. The existing shell's always-dark floating-surface policy remains visible when toggling the theme; no second design system was added.

## Verification and practical limits

- 50/50 focused tests, seven suites, standard repository configuration: `../../evidence/self-profile-tests-03.json` (601f66). Browser-only setup mocks now have environment guards so Node HTTP tests can run alongside browser tests.
- PostgreSQL 9/9: `../environment/self-profile-postgres-e44127ad-b3a.json` (9a4afa). Real locking, duplicate/concurrent writes, audit rollback, current authority, cross-scope denial, no-op and expired-session behavior.
- Real HTTP EN/FR 2/2: `../environment/self-profile-http-ed4e482e-345.json` (bfdfba). Reader denial, legacy path variants, trusted origin, actual save/replay and unchanged unrelated records.
- Browser EN/FR 2/2: `../environment/self-profile-browser-5e33c89d-e5d.json` (347056). Real saves/audits, current shell-name refresh, stale drafts, lost response across refresh, failed reads, read-only access, sign-out failure and actual session deletion. 24 screenshots. Recorded menu→profile development observations were 10,066 ms EN and 9,021 ms FR; these include navigation/interaction and are not production performance certification.
- Final display EN/FR 2/2 scripted checks: `../environment/self-profile-display-334a6bcf-9ba.json` (2153bf). 320/768/1440 menu bounds, keyboard theme toggle/return, final avatar and ten screenshots. **Visual review limits the 200% text claim:** the document-width check passed, but the existing narrow shell clips the rightmost account trigger when CSS text size doubles. See OA-F18 below. The screenshot has the menu open and does not establish full Profile reflow or native browser zoom. Do not call this full accessibility verification.
- Final typecheck: exit 0 (3197db). Changed-file lint: exit 0 (6da05c). No migration, default build, deployment, external messaging or financial writes.

Initial unit failure, Windows evidence-write failures, two Node suites blocked by browser-only setup and the non-returning separate test configuration remain recorded in `../../evidence/self-profile-initial-attempts.md`. The separate test process was stopped by exact owned PID (8251bc/709498); the corrected standard configuration passed all seven suites.

Only the avatar's presentation changed after the full database/HTTP/browser runs. Final display checks cover that correction; all other captured application hashes remain bound to those runs. `../../evidence/self-profile-receipt.json` binds the complete batch to v36 and distinguishes these evidence revisions.

## Review responsibilities and remaining work

| Responsibility | Review and limit |
| --- | --- |
| Architecture/backend/API | Current service → action/HTTP → hook → form; one reviewed write path; other auth endpoints preserved. External API compatibility review remains. |
| Database/migrations | Existing User and AuditLog; atomic save/evidence, deterministic receipt, locks and concurrency exercised. No migration. Formal audit hold/retention and organization-delete cascades remain open. |
| Security/IAM/privacy/fraud | Exact current self identity, org, roles and session; strict fields, origin/media/body checks; no edit rights inferred from UI. Global provider/cache assurance and abuse/load testing remain open. |
| Frontend/workflow/accessibility/localization | EN/FR, preserved drafts, field errors, keyboard menu and responsive layout exercised. Native assistive technology, full contrast, browser zoom and OA-F18 remain open. |
| Product/operations/support | One discoverable profile action and explicit recovery. No organizational approval added for ordinary display details; operators manage actual permission and retention rules. |
| Quality/release/SRE | Source-bound unit, DB, HTTP and browser evidence; failed attempts retained; dev observations only. No live cohort or production release assertion. |
| Audit/records/data governance | Stable actor IDs, old/new fields and issued receipts retained. Historical consumers resolving current display names must not treat them as immutable signer identity. Broader archive/export policies remain open. |
| SaaS/billing/packaging | Menu removes unsupported Pro claim. No entitlement, price, package or subscription mutation. |
| Finance/reconciliation/OHADA/country packs | Not applicable to this display-profile mutation: no financial/state/statutory calculation changes; unrelated financial record hashes unchanged. No professional approval asserted. |
| Events/offline/provider integrations | Not applicable to profile persistence: no new worker, outbox or external side effect. Existing authentication provider handlers preserved. |
| AI/agent governance | Not applicable: no agent tools, approval policy or autonomous execution introduced. |

OA-F18: visual inspection of the 390px screenshot with CSS text enlarged to 200% shows the shared header clipping its account trigger despite no document overflow. Review the actual header layout, keyboard reachability and native zoom as the next bounded shared-shell task. Do not hide this under the successful scripted width assertion.

Roll out only to an authorized internal cohort after checking consumers of the changed API and the above usability/retention requirements. Rollback must not restore the generic unpermissioned write path: retain the controlled endpoint or temporarily disable profile writes. Existing save receipts and completed account changes must remain; restoring older code is not a reversal of user data. The earlier rejected global-auth patch remains unapplied.
