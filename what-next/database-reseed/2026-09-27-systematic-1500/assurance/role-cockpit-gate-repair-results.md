# Role cockpit gate evidence repair

Changed only `scripts/role-based-operating-cockpit-gate.js` and its focused test file. The application was not edited.

The two former failures came from exact source markers that no longer represented the implementation: an organization query now selects timezone alongside name/currency, and loading/error/access states now use translation namespaces and a distinct stale-session branch.

All **nine existing checks** remain. The repaired checks require organization-scoped active/nondeleted metadata selection, service-owned name/currency/timezone outputs, actual loading/error translation-key usage, complete EN/FR access/recovery messages, and the no-organization, permission-denied and stale-session states.

Verification:

- `node node_modules/jest/bin/jest.js scripts/__tests__/role-based-operating-cockpit-gate.test.js --runInBand`: **1 suite, 28 tests passed**, 18.212 seconds.
- Regression mutations verify that missing metadata fields, incorrect tenant scope, hard-coded outputs, missing/blank translations, missing auth-state branches, unlocalized sign-in, incorrect loading state, missing alert semantics and disconnected recovery keys still fail.
- Gate execution `--mode fail`: **9/9 ready, exit 0**; outputs are the adjacent role-based-operating-cockpit-gate JSON and Markdown files.
- `git diff --check` for both changed gate/test files: passed.

This is static repository evidence for the Daily Digest cockpit slice, not a browser or accessibility certification.
