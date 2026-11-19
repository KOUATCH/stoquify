# R3 original-alias denial protocol

Prepared 2 November 2026. No actual application/browser execution is authorized by this document alone. Root admits the source, artifact and disposable database first. Current source recapture is pending that admission.

The three `public/images` aliases in the shared policy refer to private `cmp_org_005` originals. Every synthetic actor remains in `p04-upload-a`, `p04-upload-b` or `p04-upload-disabled`; do not grant original-owner access or render these aliases. Positive compatibility uses the explicitly approved candidate-only fourth alias to the tenant-A sentinel, plus separate synthetic routing/HTTP fixtures. The root production policy stays at three entries.

## Shared helper and exact requests

`private-alias-probe.cjs` is pure and imports only Node assert. Both parent proxy and browser driver must use `buildPrivateAliasProbePlan(manifest.privateUploadAliases)` from the same file. The four-entry fixture manifest must be independently verified and all alias public/traced copies absent before any probe. The helper filters the synthetic fourth row out of original-alias probes and rejects an unexpected fourth owner/path.

Each alias gets canonical, uppercase, encoded directory, encoded filename, encoded separator, double-encoded directory, traversal, encoded leading slash, trailing dot and default-stream forms. Direct forms use GET and HEAD. Every form also gets a GET optimizer target; canonical targets additionally use an encoded optimizer endpoint. The exact proposed 93-row matrix is in `preparation-only-probe-plan.json`; it is not an admission receipt.

The marker is `x-stoquify-private-alias-probe: p04r02-negative-r3`. Match using `matchPrivateAliasProbe(plan, req.method, req.url, marker)` before forwarding. Only exact method/path/marker tuples are admitted. Do not accept arbitrary queries, POST, another origin or unlisted aliases. Canonical original `/uploads` and `/api/uploads` targets remain refused. Ordinary browser pages never receive the marker and must not load original aliases.

## Parent proxy obligations

1. Keep the existing exact host and local upstream checks. Reject original canonical targets and unmarked/unlisted original-alias requests. Strip the probe marker from forwarded headers; preserve the real signed session cookie without logging it.
2. For an admitted alias probe, inspect the upstream status and content type **before** attaching a body collector. Call `assertAliasResponseHeaders(probe, statusCode, contentType)`. Route responses must be 401/403 JSON; optimizer responses must be 400 plain text. Any 2xx/image/HTML/unexpected status must destroy the upstream response and request. Record metadata only; return a distinct safe 502 failure. Never pipe such a response or read/log its bytes.
3. For eligible headers, collect at most `MAX_DENIAL_BYTES` (511) bytes. Abort on oversize, premature close, timeout or error. HEAD must have no response bytes. Call `assertAliasDenial(probe, statusCode, contentType, body)` after completion. It validates every byte against canonical safe fields or the fixed optimizer denial text. Validator errors deliberately omit arbitrary body content.
4. Only a validated upstream denial may be forwarded. Add `x-stoquify-alias-denial-validated: p04r02-r3`; the browser checks this before inspecting the body. Do not copy a supplied upstream value for that header. Rejecting at the safety proxy never counts as an application denial: no validation header, safe 502, failure record and failed parent outcome.
5. Record each probe's method/path, upstream status/type, safe-body length/hash, validation outcome and number of original bytes forwarded (zero). Record all rejected probe attempts, including excess bytes, without body contents. Clear or recompute content-length when emitting a safe response; strip upstream content-encoding when forwarding the validated buffer. Keep no-store.

This safety proxy observes whether the application denied access. It cannot turn a successful or unsafe application response into passing denial evidence. A safety interception fails the package while protecting original bytes from the browser driver.

## Parent fixture fields

Before calling `runBrowserQualification`, provide:

```js
fixture.runId = 'p04r02-full-20261102-r3'; // use a fresh suffix for a later attempt
fixture.privateUploadAliases = verifiedManifest.privateUploadAliases; // exact root three plus approved synthetic row
fixture.syntheticAliasUrl = '/images/p04-private-alias.png';
fixture.privateAliasPolicySha256 = sealedPolicySha256;
fixture.privateAliasNegativeAdmission = {
  aliasesAbsentFromPublicArtifact: true,
  proxyContract: 'p04r02-negative-r3',
};
```

The policy digest must match the frozen four-entry fixture source input and artifact source manifest, not mutable checkout bytes. Retain the original three-entry root policy hash and exact approved synthetic delta separately. Label this as fixture-policy qualification, not a deployable production-policy artifact. The true admission boolean must follow actual manifest/filesystem exclusion verification. Record the helper's digest in runtime evidence; the browser also records it.

## Browser evidence and lifecycle

The full matrix runs for anonymous and signed-in tenant-A `ui`. The 12 canonical rows run for the remaining seven synthetic actors before lifecycle transitions. Total planned original-alias requests: 270. The returned browser summary includes privateAliasProbeCoverage with exact expected/completed totals and per-actor counts; parent validated upstream probe rows must reconcile exactly with those counts and have no rejected/unsafe rows. All batches have business-state snapshots before and after. Direct anonymous requests require 401; every signed-in actor requires 403 because all belong to another tenant. Optimizer requests require 400. Only safe denial bodies/hashes are retained; original images are never positive controls or browser renders.

The synthetic alias joins GET/HEAD authorization and all denied batches, signed-cookie replay, optimizer denial and explicitly warmed default-cache fetch/new-Image revocation recovery. Those explicit image probes supplement the existing real UI consumers. Existing synthetic-asset tests remain: real EN/FR UI login/list/edit, API and legacy authorized reads, revoked/expired/permission/module denial, optimizer cache and browser cache recovery. Intentional transitions are not baseline invariance: module suspension is restored in finally; removed permission, expired session and deleted revoked session remain deliberate fixture changes. Real sign-in session/audit/user metadata effects must be reported separately from denied business writes.

Syntax and 18 pure helper assertions passed (`pure-protocol-checks.json`). No full-app, browser or database pass is inferred. The prior 17-input source review is retained as historical `prior-source-review-r2.json`; a new candidate-bound review must distinguish unchanged inputs from the explicitly approved alias routing/packing changes before execution.
