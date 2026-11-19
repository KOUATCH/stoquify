# Independent review of the first r3 runtime attempt

Reviewer: `qualification_review_r2`. Reviewed on 2026-11-02. Candidate: `p04-r02-full-ea52ca48cadd`. Outcome: **BLOCKED**. This preserves the first actual runtime failure separately from any later retry.

## Actual build succeeded

`build-result.json` records Prisma generation and the normal release-artifact chain exiting zero without timeout. The reviewer independently read the actual manifest and recomputed its SHA-256: `e64a4d3e8b3973f3439b7f387527e87b5dc7cd83b1873e289fc8dfdae80e4da8`. Its 9,136 source entries equal the frozen candidate manifest. It lists 5,310 runtime files, six private upload mappings and exactly the three approved original aliases plus one declared synthetic alias.

No public upload or declared public-alias path appears in the manifest. Each original asset digest appears only at its canonical private destination. This is successful fixture-policy artifact evidence, not a deployable production-policy artifact or a successful access-control qualification.

## Actual runtime failed

`runtime-result.json` and `browser/p04r02-full-20261102-r3/result.json` both report failure. The EN and FR consumer checks reached image decoding and failed because the source could not be decoded. The anonymous legacy synthetic read returned HTTP 500, a 21-byte non-image response, rather than the required authorization denial. No authorized-image or complete UI-consumer gate passed.

The first original-alias request for both anonymous and tenant-A UI actors reached the application and returned upstream HTTP 500 with no content type. The safety proxy rejected both responses before forwarding their body, returned safe HTTP 502, and omitted its validation header. Both proxy rows record `validated: false` and zero original bytes forwarded. The expected 270 validated probes were not completed; successful denial coverage is 0/270. Proxy protection must not be reported as application denial.

Filtered runtime diagnostics identify a concrete local transport mismatch: Next attempted `https://localhost:3193/api/uploads/...`, while the reviewed standalone server on port 3193 listens over HTTP. The resulting `EPROTO` / `wrong version number` explains the observed upload-route 500s. It is a transport failure before a useful authorization result; these responses neither demonstrate a guard bypass nor qualify correct guard behavior.

Subsequent actor logins returned HTTP 429. This separately blocks the remaining tenant, session lifecycle, permission, module, authorized-read and cache checks. The original script continued collecting failures, so later failed rows must not be counted as independent access-control defects. Login cadence requires its own bounded harness review.

## Preserved evidence and cleanup

The runtime receipt records no cleanup errors, a closed proxy, terminated owned server and released application/proxy ports. All 5,310 sealed runtime file hashes remain unchanged; the sole allowed addition is the declared synthetic optimizer-cache fixture. The sealed artifact remains unchanged. Database final state and shutdown are separate and were not yet established by this review.

The next eligible work is a bounded local transport/cadence correction and reviewed retry against the same sealed artifact, with fresh runtime identity and evidence. Preserve this failed result. Retain external HTTPS/Secure-cookie behavior, real server guards, strict expected denial bodies and zero-private-byte forwarding. Do not accept 500 as denial, suppress TLS validation as a substitute for matching transport, or infer a production deployment topology from this local fixture.
