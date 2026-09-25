# Evidence index and verification limits

Design run: 5 September 2026. All new work is contained in this run directory.

| Evidence | Meaning |
| --- | --- |
| `baseline.json` | Branch/commit, initial working-tree status and hashes of 24 selected source files. |
| `current-catalog.json` | Catalogue obtained from current TypeScript with controlled imports. |
| `current-behavior-probes.json` | Seven observations reproduced from actual current module code using synthetic in-memory dependencies. These are design findings, not fixes or proven end-to-end vulnerabilities. |
| `module-surface-inventory.json` / `.md` | Fresh 415-record static report. Classification counts overlap; report mode changes no policy. |
| `schema-check.json` | Schema model-name/persistence discovery, scoped as described in CURRENT_STATE. |
| `graph-provenance.json` | Relevant graph nodes and initial manifest excerpt. Current checkout path matches; graph freshness is not certified. |
| `module-manifests.json` | 20 proposed example manifest entries, not installed application modules. |
| `configuration-examples.json` | Five resolved synthetic configurations with compatibility results. |
| `model-verification.json` | Final 52 isolated model checks: passed 52, failed 0. Includes invalid configuration, scope/entitlement and lifecycle cases. |
| `browser-verification.json` | Final 19 Chromium interaction checks: passed 19, failed 0; no captured JavaScript errors. |
| `*-desktop.png`, `service-builder.png`, `*-mobile*.png` | Browser-produced screenshots. Desktop builder and French mobile impact were visually inspected. |
| `*.mmd` | Architecture, dependencies, lifecycle and workflow diagrams extracted from the documents. |
| `source-references.json` | Verified repository references used in the documents, with content hashes and line targets when supplied. |
| `artifact-validation.json` | Required files, Markdown/local-link validation, result counts and source-baseline comparison. |
| `artifact-manifest.json` | Final artifact hashes, excluding its own recursive digest and transient server state. |

The local `discover.cjs`, `validate-model.cjs`, `verify-browser.cjs` and `finalize.cjs` document reproducible isolated methods. The prototype server serves only four static files on loopback; it does not start the Stoquify application or connect to its database.

During browser development, two assertions were corrected to avoid assumptions about CSS class naming and rendered whitespace. A keyboard check led to explicit modal Tab wrapping and initial heading focus. The mobile review shortcut was added to make review accessible without scrolling the entire catalogue. The final result reflects those corrections; intermediate failures are not hidden production failures.

**Not run:** application build, migrations, seeds, live subscriptions/activation, real provider requests, production performance capture, full repository test suite, screen-reader review, all browser engines, statutory professional review or release certification. These were outside the authorized design scope or require the actual implementation/environment. The earlier Astra review's tests are inherited historical context and are not added to the 52+19 counts.

**Approval state:** no real approvals were issued and no X1/pilot/production status was changed. No missing external decision blocked this design package. The next implementation's actual decisions are listed in DECISIONS_NEEDED.
