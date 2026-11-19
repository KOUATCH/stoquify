# Authenticated sales-to-accounting local runtime

This harness is for current-source application verification against a new synthetic database on the previously verified task-owned PostgreSQL 17 cluster. It never loads ambient application environment files or clones business data. The setup is a synthetic zero-tax fixture, not a Cameroon statutory chart, migration-history, country-pack or production-artifact certification.

## Reviewed effects and commands

The repository command registry classifies development startup and build as mutations. This harness deliberately uses the reviewed `scripts/dev-app-safe.js` preparation function and installed Next CLI directly; it does not invoke the `predev` Prisma generator, build, migration promotion, reset, general seeds or deployment.

From the repository root:

```powershell
node docs/stoquify-potential/development/authenticated-sales-accounting-2026-11-08/runtime.cjs prepare
node docs/stoquify-potential/development/authenticated-sales-accounting-2026-11-08/runtime.cjs start --browser
node docs/stoquify-potential/development/authenticated-sales-accounting-2026-11-08/runtime.cjs stop
```

`prepare` has already completed successfully on 2026-11-08. It refuses replacement if the target manifest exists. It verifies the owned cluster/user, creates a new empty database, checks the current datamodel and retained bootstrap hashes, applies that reviewed bootstrap only to the new database, and creates the fixture. It starts/stops the owned cluster only when needed. Do not delete the manifest merely to retry a failed partial preparation; review its retained state first.

`start` must run after source edits are finalized. It refuses occupied application/CDP ports, copies current application source into a new owned directory, excludes all `.env*`, Git, caches and shared generated clients, and records per-file hashes. It creates independent package junctions with `@prisma/client` pointing to the private current-schema client, validates that resolution, creates fresh isolated Next output/tsconfig and synthetic secrets, and launches the real app on `http://127.0.0.1:3196`.

The optional `--browser` launches only the reviewed installed Chromium executable, with a new private profile and loopback CDP on port 9316. The supervisor remains running while browser work continues. `stop` writes an owned stop marker; the supervisor closes its owned browser/application process trees and stops PostgreSQL only if it started it. No process is selected by executable name or shared port for termination.

Local TCP/process launch requires the same approved execution boundary used by the prior owned PostgreSQL proof in this environment. Keep the supervisor alive in one long-running execution session; ordinary detached child processes may be terminated when their parent exits.

## Fixture and credentials

`FIXTURE.json` contains only nonsecret synthetic IDs, email addresses, permissions and initial counts. Random synthetic passwords live only in the target directory's `credentials.private.json` beneath gitignored `.codex-tmp`; do not copy their values to reports or logs. No auth sessions or assurance fields are populated.

Five verified users have actual Argon2 credential accounts: cashier, collector, independent reverser, accountant and read-only. The collector also has reversal permission so the interface can demonstrate the independent-actor rejection. No wildcard permissions are granted. Explicit active module grants cover the journey and required dependencies.

Initial stock is five units at cost 4 and selling price 10, with one credit customer, one store/till/drawer, an open current accounting period and balanced synthetic sale/cash/bank collection posting rules. Initial sales, settlements, authentication sessions, POS shifts and posted journals are all zero. Opening the shift, signing in, password confirmation, sale, collection and reversal must occur through the actual application interface.

## Evidence status

- Source review: runtime, fixture, safe development helper, command registry and current auth/financial controls inspected.
- Static syntax: `node --check` passed for both new CommonJS scripts.
- Real database setup: guarded prepare passed; retained fixture counts confirm zero application transactions/authentication state at setup completion.
- Browser/application behavior: not established by setup or favicon readiness. Record actual authenticated screens, actors, locale, operations, denials and database tie-outs separately.

Every startup records source provenance, target identity and readiness separately. Subsequent source edits require a new snapshot/restart or explicit amended provenance. Shared working-tree changes and shared generated clients remain outside this harness's ownership.
