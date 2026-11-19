# Independent cleanup and final integrity recipe review

Reviewed 9 November 2026. Recipes `database/finalize.cjs`, `database/stop.cjs` and `final-integrity.cjs` are accepted for their exact isolated target. This is permission to execute the reviewed local qualification cleanup, not evidence it has completed.

The finalizer checks the task root, running owner, cluster directory, port and owned PID; the common connector independently verifies database/server/data-directory identity. It locks all remaining session rows in the new full database and refuses cleanup unless each belongs to a synthetic `example.invalid` user in one of the three owned organizations. It deletes only those observed session IDs, preserves all business/audit digests and requires zero remaining sessions. Data and evidence are retained.

The stop recipe verifies the owner and live PostgreSQL PID/data directory/port, queries for other client connections and refuses to stop if any remain. It stops only that cluster and requires PID-file removal and loopback port release. It preserves both created databases on disk.

The final-integrity recipe compares current eligible root source, candidate source, annex assets and artifact bytes to the exact admitted manifests. It performs no application, database or network calls. Its failure cannot be relabeled a passing candidate.

Final acceptance still requires actual successful cleanup receipts, released application/browser/proxy listeners, preserved root source and independent result verification.

Reviewed SHA-256 values:

- `database/finalize.cjs`: `19a963ea68038a33bc224c563532da10eb6e0f7fbd9fa5b7b70b1fd0e34bc70d`
- `database/stop.cjs`: `80f0c6e4212feb6209177a8c3591681baf44da7e3b505bf8280e1dfb734b47ff`
- `final-integrity.cjs`: `b6b4db79767fa3f02e7038128080685c402e10ddd5173256c1a443f5744dcbd6`
