# Browser denial assertion review

2 November 2026. Qualification harness only; no application, database, flags, migrations or deployment changed.

The harness now accepts guarded GET denial bodies only when every byte is the canonical JSON auth envelope: exact fields; fixed 401/403 error, code, category, severity and retryability; and the current bounded correlation-ID format. HEAD denials must be empty. Private optimizer denial must have status 400 and the exact fixed middleware body. Assertion failures do not echo response contents.

All six anonymous encoded aliases normalize to the guarded legacy route in current lib/media/legacy-upload-routing.ts; the harness requires canonical 401 for each. Encoded aliases and optimizer requests now fall inside before/after business snapshots. Revoked default-cache browser fetch uses the same safe-body assertion, and history restoration, new image load and login recovery are covered by a separate business snapshot pair. Sessions and audit logs remain explicitly separate from business-state digests.

Source inspected: app/api/uploads/[...path]/route.ts, middleware.ts, lib/media/legacy-upload-routing.ts, lib/error-handling/route-response.ts, lib/error-handling/canonical.ts and types.ts.

Verification: node --check of run-browser.cjs exited 0. The following isolated checks extracted only assertSafeDenial into a node:vm context with assert and Buffer; the harness module, Playwright and application were not imported or executed. No full-app or browser pass is claimed.

```json
{
  "executedAt": "2026-11-02T14:52:06.334Z",
  "evidenceClass": "isolated_pure_assertion_checks_not_application_or_browser",
  "harnessSha256": "2f9f016d96ada285da4b6df30c9657bfc8ae82539bda85f203b6ba2e4f40c228",
  "helperSha256": "ae3293130363eba81dab084aac4e0c7dabc322354a68e666d0d00ba5fb93b6e7",
  "passed": true,
  "cases": [
    {
      "label": "canonical401",
      "passed": true,
      "expectation": "accept"
    },
    {
      "label": "canonical403",
      "passed": true,
      "expectation": "accept"
    },
    {
      "label": "empty-head",
      "passed": true,
      "expectation": "accept"
    },
    {
      "label": "optimizer400",
      "passed": true,
      "expectation": "accept"
    },
    {
      "label": "private-png-body",
      "passed": true,
      "expectation": "reject"
    },
    {
      "label": "private-bytes-appended",
      "passed": true,
      "expectation": "reject"
    },
    {
      "label": "extra-private-field",
      "passed": true,
      "expectation": "reject"
    },
    {
      "label": "private-message",
      "passed": true,
      "expectation": "reject"
    },
    {
      "label": "private-correlation",
      "passed": true,
      "expectation": "reject"
    },
    {
      "label": "unexpected-classification",
      "passed": true,
      "expectation": "reject"
    },
    {
      "label": "wrong-content-type",
      "passed": true,
      "expectation": "reject"
    },
    {
      "label": "unexpected404",
      "passed": true,
      "expectation": "reject"
    },
    {
      "label": "nonempty-head",
      "passed": true,
      "expectation": "reject"
    },
    {
      "label": "optimizer-private-suffix",
      "passed": true,
      "expectation": "reject"
    },
    {
      "label": "optimizer-wrong-status",
      "passed": true,
      "expectation": "reject"
    },
    {
      "label": "leading-whitespace",
      "passed": true,
      "expectation": "reject"
    }
  ]
}
```
