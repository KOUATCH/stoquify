# Release candidate: runtime qualification blocked

This candidate built successfully but did not pass the complete close-workflow qualification. Preserve it as an unsuccessful release attempt. No final release admission was issued and no production deployment occurred.

The source snapshot is `5927a9e593e1a5a467c1156dcd06feb2e64948e1c19e971c2a5688b760203093`. Its 6,707-file artifact has build ID `9Rbh3LK-fOIO8T0G5B8S4` and manifest SHA256 `529513478dc7d5245a3ab1cf9ef35e30613004c1d1c9c0d8de80eda4699554ee`. The private clean candidate, original source archive and artifact remain retained.

Passed evidence remains valid within its original boundaries:

- Clean offline locked installation and scoped native/default database-client verification.
- 472 mocked tests across five service/action suites against that clean candidate.
- Fresh replay of all 123 migrations, 20 real PostgreSQL cases, and a synthetic backup restored into a second new database. All 247 public-table profiles, sequences, migration history and retained document bytes matched. Thirteen CHECK deparse differences required exact PostgreSQL parser equivalence; other compared schema definitions matched.
- Full application build, type checking, trusted artifact verification, default native engine inclusion, private configuration exclusion and policy-controlled private upload mapping. Lint reported zero errors and 29 warnings.
- The actual production schema-promotion command rejected the local target after artifact verification, before calling the lock or migration launcher.

The actual sealed runtime failed its first anonymous close-page recovery check: the login redirect targeted `https://localhost:3296`, the internal server address, instead of the configured public origin `https://127.0.0.1:3443`. The failed [runtime receipt](RUNTIME_QUALIFICATION.json) and [attempt evidence](sealed-runtime-6d714e1e8a/RESULT.json) remain unchanged. No authenticated browser qualification ran for this attempt. The application, proxy and owned PostgreSQL cluster stopped; test ports were released and artifact bytes remained unchanged.

Source inspection identified middleware redirects built from Next's internally normalized request URL. The remedy must use the existing configured canonical application/auth origins and retain relative callback paths; it must not trust arbitrary forwarded host headers or relax the recovery assertion. A new candidate will be frozen and rebuilt after the product fix, under [the second candidate directory](../close-integrity-release-candidate-2026-11-10-r2/).

The first candidate's databases and synthetic credential setup are preserved rather than reset. Subsequent qualification uses new absent database names. Live delivery remained disabled throughout; hosting/domain, production delivery configuration, hosted recovery and production approval remain separate requirements.
