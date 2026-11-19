# P04-R04 unit and static evidence

- attempt01: exact pre-repair alias; both selected plain-service-Error assertions returned the private synthetic canary and failed as expected. 56 other assertions were explicitly filtered, not waived in acceptance. Executed baseline bytes are archived with baseline-source-relocation.json.
- attempt02: 276/276 tests in 3 suites passed, zero failures/skips. 58 new sibling tests, 212 R03 regression tests, 6 shared-helper tests. 26 bound inputs unchanged.
- typecheck01: two owned entries and transitive import/hook closure; noEmit, incremental:false, plugins:[], exit0 and empty diagnostics.
- lint01: two owned files; zero errors/warnings and source drift.

Actual schema/safe normalizer and hook queryFn execute; service/RBAC/useQuery are mocked. This is not rendered UI, signed-cookie HTTP or database qualification. Native receipts are separate.
