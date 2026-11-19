# Independent execution recipe review

29 October 2026. Source review only. This reviewer did not execute the application, build, database commands or browser. Runtime acceptance remains pending.

The current preparation, build, database fixture/control, browser and finalized runtime recipes are accepted for isolated execution after their candidate/build admission assertions pass. The accepted scope is the fresh current full application with synthetic accounts and assets, using the exclusively owned local PostgreSQL cluster and two fresh named databases. It does not authorize production changes or hosted release.

The review required and confirmed these corrections before acceptance:

- Exact candidate/template schema SHA and all 120 migration checksums, with catalog equality explicitly distinguished from fresh migration replay.
- Owned cluster cleanup on startup failure, and a PID-bound exact-data-directory stop fallback if SQL identity lookup fails.
- Bounded build-child termination and settled exit/error handling.
- Inventory read permissions for the revocation actor so its authorized image baseline can actually precede revocation; no update permission was added to that actor.
- Real credential accounts with zero preseeded sessions. All browser session cookies must come from actual Better Auth sign-in.
- Default browser HTTP cache retained; a deny-only external proxy replaces request interception. Post-revocation default fetch and new image load must fail, followed by visible login recovery on reload.
- Passwords and cookie values remain private. Reports contain cookie properties and hashes/counts, not session values or synthetic database rows.
- Runtime fixture loading uses the successful seed receipt and validates synthetic private asset bytes against the candidate annex.
- The owned HTTPS proxy refuses decoded original asset targets, including nested optimizer query values, before forwarding.
- Runtime control/proxy cleanup has independent deadlines, destroys owned upstream requests and sockets, and continues to server termination and integrity checks.
- The actual copied runtime's ImageOptimizerCache is seeded with synthetic tenant-A bytes. The entry must survive runtime startup and the browser's optimizer denial checks. Runtime integrity permits new files only under `.next/cache/images/`; sealed code and private asset bytes must remain unchanged.

The inspected database-clone receipt binds both fresh destinations to schema SHA `1813b8954e67033633071f68db3845e778aacbf06f7cc545452178b6dc2ff607`, migration-set SHA `919e652f586d6f6b8b0fa71ed0d68b4d9da3be30ae0c24371524609e28cfc041`, and catalog SHA `358cbea3f824f57f876f6ea12b48ced6861f96a301f0bf5edeb095036ffda811`. The receipt checks eight named business/auth tables are empty. It does not claim all database tables were independently proven empty.

Business-state snapshots cover all public tables except sessions and audit logs, whose counts are reported separately. Final reporting must preserve that distinction. The browser does not promise erasure of pixels legitimately viewed before revocation. Full-app browser results, build outcome, artifact identity, final source/asset reconciliation and confirmed cleanup still require independent review before local R02 completion. Hosted ingress/CDN/operator gates remain separate release requirements.
