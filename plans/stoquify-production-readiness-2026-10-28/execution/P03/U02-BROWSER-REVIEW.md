# U02 browser recipe review

Independent reviewer accepted run-u02-browser.cjs after correcting an initial test-sequence issue. The test preserves the original same-component sequence: lost preparer response, explicit identical-command recovery, pending settles, synthetic assurance expires, reviewer password confirmation and commit, pending settles. No document reload occurs between the two grants.

One explicit Refresh current list action follows. Both committed rows must become visible; full synthetic grant/event/receipt/outbox snapshots and observed grant POST count must remain unchanged. The reload handler itself is guarded against active or retained commands.

Fresh candidate/runtime/database guards, disabled live providers, immutable prior artifacts, bounded cleanup and integrity checks remain. This is recipe review, not executed browser proof.
