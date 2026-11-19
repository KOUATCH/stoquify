# P04-R02 isolated qualification recipe

Current command definitions and repository registry were reviewed. `agent:workflow:check` passed before execution; no application commands were executed by it. New harnesses were reviewed for their specific side effects.

1. `capture-candidate.cjs` reads scoped source/config/scripts and Git state; writes only candidate provenance. Environment/secret files and live database state are excluded.
2. Asset inventory copies three legacy files into an owned .codex-tmp mirror, verifies hashes and retains originals. Their contents are not rendered or served. Source-reference review does not query production database URLs.
3. `inspect-release-publication.cjs` invokes the current packer with a synthetic standalone structure and stubbed build. It copies only owned mirror bytes into a new isolated artifact and checks the resulting paths/hashes. No app runtime or production build is invoked.
4. `run-http-before-01.cjs` verifies the archived runner bytes, scrubs environment, materializes only allowlisted current source in a new ignored fixture and starts the installed Next development router on loopback. Authority/error adapters are explicit synthetic stubs. Only generated synthetic image bytes are served. HTTP/fetch outbound requests and environment/real-upload file reads are guarded. A bounded timeout terminates only the owned child tree.
5. Both existing URLs require valid authorized reads; every denied actor must receive no private body/file read. Encoded, HEAD, conditional and optimizer paths are included. Known reproduction success is separate from security acceptance. No production flag/data/migration/deployment/commit/push is involved.
