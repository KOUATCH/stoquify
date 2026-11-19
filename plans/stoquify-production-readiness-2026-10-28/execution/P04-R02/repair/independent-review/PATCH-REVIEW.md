# R02 independent patch review — findings in progress

29 October 2026. Source-only review; no runtime checks executed by this reviewer. This record is not final acceptance.

## Corrections requested

1. **Public duplicates by content:** initial packer detects legacy copies by public/uploads path segments only. Identical inventoried private bytes renamed under public/images or a traced public/static path would remain public. Refuse known legacy-content hashes outside canonical private mapping; do not silently delete unrelated source assets. Add renamed-copy negatives and ordinary public controls.
2. **Ignored asset drift during build:** initial packer first captures ignored upload mappings after build. Git source identity excludes those files, so a build-time asset edit/addition/removal could become the sealed baseline. Capture trusted legacy path/hash inventory before build and compare after build before output writes. Source originals are input fixtures, not build-generated output.
3. **Routing normalization:** initial decoder expands encoding/backslashes but does not collapse decoded dot segments/slash runs before classifying private paths. Inputs such as `/x/..%2Fuploads/org/item.png` or `/%2e%2Fuploads/org/item.png` need native direct/optimizer negatives, because a later static resolver may normalize them differently. Normalize local path semantics consistently without treating decoded leading double slashes as an authority. Do not permit upload-looking traversal to become an arbitrary internal API rewrite. This is a source-derived bypass hypothesis pending runtime evidence.

## Initially acceptable boundaries

The private reader retains current API authority, validates portable organization/file components, uses production private storage only, and limits nonproduction fallback to an absent private root. Known directory/leaf links are refused; a single opened handle is checked and closed in finally. The explicitly operator-controlled filesystem assumption is appropriate; this is not proof against arbitrary hostile ancestor replacement. File-link tests using an lstat adapter must remain distinguished from real directory-junction tests.

Explicit before-files routing and middleware optimizer rejection are appropriate directions. The optimizer endpoint itself and target need equivalent normalized classification before cached bytes are returned. Actual routing configuration belongs in the after fixture, and transformed responses must be tested by status/content/derived identity rather than equality with original PNG bytes alone.

The packer includes source mapping, private completeness, traced duplicates, path/case safety and explicit v1 compatibility rules. Old v1 artifacts containing uploads must not be reclassified safe. Pending corrections above and actual tests determine final disposition.

## Source correction follow-up

The packer now rejects known legacy content hashes outside private mapping during preparation and verification, and captures the ignored original path/hash set before build with exact comparison afterward. Added fixtures cover renamed public/static copies and build-time add/change/remove drift. Early ancestor checks and mapping validation are in place. The narrow filesystem-only Jest configuration is acceptable to execute; it does not invoke a real build or database.

The routing helper now collapses decoded dot segments and slash runs before private-path classification. The repaired HTTP runner includes actual before-files policy, private production storage and the requested encoded direct/optimizer paths. Source concern 3 is addressed pending runtime receipts. A follow-up precision request remains: verify the seeded optimizer cache entry still exists immediately before optimizer requests, since startup occurs after the initial seed/read. Real HTTP Range and remaining malformed/repeated-slash/backslash cases must either execute or remain explicit limitations.
