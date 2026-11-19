# Private alias exclusion — scoped implementation verified

The user classified cabin-1.jpg, cabin-2.jpg and profile.jpg as private and authorized a bounded public-delivery exclusion while retaining copies. [Decision and fixed mappings](asset-decision.json).

The shared policy keeps all three original public-source files and canonical upload/recovery copies intact. Middleware and beforeFiles rewrites route the old image URLs to the fixed tenant-authorized upload handler; private optimizer requests are rejected. Case, encoding, normalized traversal and Windows default-stream aliases use the same guard. Packaging excludes only declared, hash-validated public aliases, records their canonical private mapping and refuses changed, missing or unrecognized copies. Manifest verification rejects reintroduced aliases even with changed bytes.

Verification: **91/91** mocked-route/pure-routing/native-filesystem tests, **84/84** packaging fixtures, **6/6** configuration tests, and workflow contract passed. Initial sandbox-only junction EPERM failures were retained; native retries pass. Positive alias route tests use synthetic bytes and mocked authority. Neither fixtures nor source inspection qualify real sessions or rendered consumers.

Eight owned source/test/control files are recorded in [tested source hashes](owned-source-tested.json). [Independent source review](independent-review/SOURCE-REVIEW.md) accepted the bounded repair. No original asset was deleted or rendered; unknown duplicate-byte rejection remains enforced.

P04-R02 remains blocked pending the actual full application artifact and real-session/browser gates in [fresh r3 qualification](../full-app-20261102-r3/independent-review/RECIPE-REVIEW.md). The D: candidate adds one explicitly bound synthetic alias alongside the unchanged original three mappings to test authorized exact-byte reads without serving originals. Root policy remains three rows. This fixture candidate is not a production artifact.

Recovery: retain all source/original/mirror copies and hashes. Correct scoped routing/packing only; never restore public exposure. No commit, push, deployment, production flags or production-data changes.
