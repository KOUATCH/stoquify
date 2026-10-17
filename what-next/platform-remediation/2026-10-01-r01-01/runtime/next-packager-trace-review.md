# Normal standalone trace policy — Next 15.5.23

Read-only source inspection of the installed Next package confirmed a concrete mismatch in the initial preflight. No Next module was executed.

`node_modules/next/dist/build/utils.js`, `copyTracedFiles`, consumes:

- Pages Router traces for non-edge/non-static pages; `/404` and `/500` missing traces are specially tolerated by the packager.
- App Router page traces except edge functions.
- Node middleware and instrumentation traces when their build flags are enabled.
- The root `next-server.js.nft.json` trace, unconditionally.

Edge middleware/function files, WASM and assets are copied from the middleware manifest separately. `writeStandaloneDirectory` in `dist/build/index.js` also copies required-server files, compiled page/app trees, the required-server manifest, and selected loaded environment files. This isolated helper deliberately rejects packaged environment files rather than reading them; externally supplied environment values remain separate.

**The ordinary packager does not consume `next-minimal-server.js.nft.json`.** A dependency unique to that trace must not be required merely because the trace exists. The preflight now records its trace-file hash/count as unconsumed provenance, without requiring its unique dependency files in the copied package. Dependencies also listed by a required normal-server/application trace remain mandatory. Package symlinks, dependency-resolution containment, drift checks and runtime-pending status are unchanged. A different Next version requires fresh packager review and currently fails the version check.

The recorded September build contains 188 trace files: 183 app traces, three Pages Router traces, the normal-server trace and the minimal-server trace. Its compiled manifests contain 183 app entries, three JS Pages Router entries and zero edge functions. There are no other trace families in that observed build. This is evidence about the recorded output, not a claim that every future trace discovered belongs to the packager's selected page set.

The earlier recovery's missing minimal-only runtime file was an overstrict validation result, not independent proof that normal Next packaging was incomplete. The separately observed `@next/env` and `styled-jsx` resolutions into the original workspace remain valid blockers; this correction does not qualify or rerun that package.

Installed source fingerprints match the previous review:

- `utils.js`: `b6d586f8ed85c911e5f41e981296879daa6efe21034957ed72c707241e2b3bee`
- `index.js`: `f7ef456d065abbeb6a6d5e752d29f3471f7fbf93c31634fae0f1474dac911b70`

Focused regressions cover a missing required normal-server dependency, an omitted minimal-only dependency that is accepted structurally, a shared dependency that remains required, and refusal to reuse this policy for an unreviewed Next version. Actual startup, ESM/native loading and authenticated routes remain unexecuted.
