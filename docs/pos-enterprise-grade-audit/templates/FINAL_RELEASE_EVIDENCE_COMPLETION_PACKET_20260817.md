# Stoquify final release evidence completion packet

Generated: 2026-08-17 16:37:47Z

Current verdict: **production REJECTED / NO-GO**. Development remains authorized only inside the existing cash-only, synthetic-data, non-statutory development scope.

This packet separates facts that can be verified from repository files from events that must be performed by accountable people or production systems. It does not turn typed names, template text, local tests, or proposed secret names into approval evidence.

## What has now been filled with verified values

| Area | Verified value | Disposition |
| --- | --- | --- |
| Candidate commit | `35b4cc6a06a50ee11de5bfce6b04993e38bd589a` | Observed, not frozen |
| Candidate tree | `7efce91d5ba871e91470f60ed3b53833a1c3b4b4` | Observed, worktree remains dirty |
| Migration raw SHA-256 | `f7de8dc7ace0a5e063cdb7ecd9527e77807b7f872e474546819e9fca13a273d4` | Verified |
| Migration canonical-LF SHA-256 | `2fde92f4ad0cbb1a2a517b12e71c38997dc4956c9d57d70ff1ae0c636ff2f191` | Verified |
| Destructive inventory logical SHA-256 | `55d332c3319b65acfdf415e64042a15504d12861b664429af7e63155296e1ad1` | Verified, 13 findings |
| Destructive inventory file SHA-256 | `cb549001aef5ba40974e68e331fbb3e6fd24f2120b43264e5964c5c2f35aa952` | Verified |
| Prisma schema SHA-256 | `cdbc9c64e88d642f2bfc716ee4fda2e8b7dfbfc26f08a5170645311268ae8af9` | Verified in rolling evidence |
| Development R2 manifest SHA-256 | `956fc6789101b39c57c6cad00e0a237f309c7557cd0fe8b6c76fcd1b7712f66d` | Synthetic development proof only |
| Cameroon source hashes | Six retained artifacts match their recorded digests and byte lengths | Technical source identity only |
| Cameroon technical gate | 11/12 | Qualified expert approval remains missing |
| Secret preflight | 5/21 | Values were not read or written |
| Phase 2B | 2/23 | Blocked by upstream gates |
| Phase 3 | 0/34 | Blocked by upstream gates and pilot evidence |

The machine-readable packet containing every exact destructive finding hash and all six Cameroon source digests is [FINAL_RELEASE_EVIDENCE_COMPLETION_PACKET_20260817.json](./FINAL_RELEASE_EVIDENCE_COMPLETION_PACKET_20260817.json).

## Exact destructive migration findings

| ID | Operation | Risk | Finding SHA-256 |
| --- | --- | --- | --- |
| D-001 | Drop `accounts.access_token` | HIGH | `4781af03745e807d47ccdc89b62f0562b923707465d36d215cbeaea3e3e164fb` |
| D-002 | Drop `accounts.expires_at` | HIGH | `277a312724a1c524d910f7c5966d70170825cf1d6a60679269b2388a6c9f3e55` |
| D-003 | Drop `accounts.id_token` | HIGH | `5807ad92f5163c0922dce2373dd15df9d064a28a61b1601e063a510448c52c13` |
| D-004 | Drop `accounts.provider` | CRITICAL | `fbc401c6980f7b01658bb2b2f3702c618e2378e92395b4caee631fd8d8bee2cb` |
| D-005 | Drop `accounts.providerAccountId` | CRITICAL | `b5d38ed4fd3e87f368f0948c54731873ffdbec440832c219a078af57364ec76b` |
| D-006 | Drop `accounts.refresh_token` | HIGH | `07a6cfdfae6507d5572505bc8a0505c74d4f0f1b496f0864b1e2d4e537ce1492` |
| D-007 | Drop `accounts.session_state` | HIGH | `6ad18571cee52ce1386eacb37d9b18e40c4d6ffbb3b3166de4ffe4710df83988` |
| D-008 | Drop `accounts.token_type` | HIGH | `42bf676feeb19705c6bd4a57cf83ac0f99d8cbb830b46cd42b1f980243a31165` |
| D-009 | Drop `accounts.type` | HIGH | `5f168672b10fcdcbe1af94b0da9d9ead18688f6254a326c146ccb1aecda6d9de` |
| D-010 | Drop `sessions.expires` | CRITICAL | `8f4f2215000c21bc293358a28c8c4f8df6b90abdbc7c5200cb0b4e7d814807b9` |
| D-011 | Drop `sessions.sessionToken` | CRITICAL | `ec44f20e8dd677d05d2303eef1758a22bebb08077983362349f6d9c5e4fd9178` |
| D-012 | Drop `users.emailVerified` | CRITICAL | `4b1479492af21a9dd97c0a5212afe7c7383b8cd3b31045310e8ab0e0143bc95d` |
| D-013 | Drop table `auth_sessions` | CRITICAL | `69294f51328a0a7575cff0524e5196accf0159913177b11dd249b65e554295fe` |

The full inventory also binds the canonical operation hashes, line numbers and required treatments. Approval remains 0/13 because the final candidate is not frozen and production data-impact and restore proof do not exist.

## Cameroon evidence disposition

The source files are real local artifacts and their current hashes match the review index. This proves which bytes were reviewed by the machine; it does not prove the law was interpreted correctly.

| Source | SHA-256 |
| --- | --- |
| CNPS Decree 2016/072 | `1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61` |
| CNPS employer general rules | `bc51f74de8dd3b0c7babd86e8f98d92dbdbece214480f66ac89c42d3e894a868` |
| CNPS Statistical Yearbook 2025 | `53a22ebb9a9bf31bc0c7c60f8cc0eed9383192ef4f0d6a309f2782ad60875504` |
| CNPS current employer obligations | `8e319e856a0f473accac53587708523b7080c5aac5f6d8eb4e8bd5cb5bb8d743` |
| CNPS official FAQ for Decree 2016/072 | `166f12931df869f4a6f96a977342ce18600ece1361535c96fc2e841f2ffb7d5d` |
| CNPS official 2025 contribution scale | `ae152e77b7a26ab2a2270d032a256815e8f3544e66700f207191edf584ed2259` |

The supplied `Complaince authorization validation.docx` has SHA-256 `f373afa6dd8f4e50470cccf30b12c854921142c1a3c20a7b6757bab6622bae59`. Its Office author is KOUATCHOUA MARK, but the package contains no embedded certificate or signature part. It is classified as **administrative declaration, unsigned, not approval**.

The prefilled expert return is [CAMEROON_QUALIFIED_REVIEW_RETURN_PREFILLED_20260817.json](./CAMEROON_QUALIFIED_REVIEW_RETURN_PREFILLED_20260817.json). A qualified reviewer must still supply identity, capacity, qualification reference, conflict declaration, review window, independent digest recomputation, four fixture-family decisions, effective dates and a signed conclusion. A different checker must verify the signature.

The local packet is primarily CNPS-focused. Current 2026 DGI/MINFI tax and IRPP sources, electronic-invoicing authority contracts, labor/time/leave, declaration/payslip, fiscal-receipt, retention/privacy and correction requirements still need captured authority artifacts and explicitly qualified scope decisions.

## Managed secret references

No secret values belong in this repository. The completion packet gives stable proposed names, but every reference is correctly marked `NOT_PROVISIONED` until the production secret manager returns a real reference, version, owner, creation time, rotation event, old-version revocation and workload verification.

Required boundaries are public-identity HMAC, receipt-token signing, history-cursor signing, statement-token signing, statement-envelope encryption, accountant-invite encryption and the canonical HTTPS public URL. Provider credentials and live delivery flags are additional environment-specific requirements.

## What still cannot be manufactured from templates

| Gate | Authentic return required |
| --- | --- |
| Clean release | A reviewed clean commit, artifact digest, CI run and immutable evidence-bundle digest |
| Production database | Redacted target identity, preflight census, backup, isolated restore replay, direct history, data-impact proof and post-deploy health |
| Migration approval | SANGO MALO fresh-auth maker signature; later MAXIMILLIANO BONGA independent checker signature; manual 13/13 decisions bound to the final hashes |
| Cameroon | Qualified expert decision plus independent signature verification and separate decisions for uncovered legal scopes |
| Hardware | Physical device matrix and results, or a qualified product/controller signed production-scope exclusion |
| Operations | Six primary/backup owner acceptances, runbooks, coverage windows, scheduler deployment and three successful windows, alert delivery/ack/retry/dead-letter/recovery/escalation, credential rotation and CI proof |
| Governance | Artifact-bound product, controller, security and release-authority decisions after freeze |
| Phase 2B/3 | Decisions made only after upstream gates pass and the controlled pilot produces exit evidence |

## Safe order to close the gates

1. Finish and review development changes; remove generated/transient files from the candidate; create a clean `codex/` release branch and commit.
2. Build and test the unchanged candidate in approved CI. Record artifact, manifest, browser and evidence-bundle hashes.
3. Provision managed secrets and operational integrations; complete rotation, scheduler, alert and owner evidence.
4. Run the authorized production preflight, backup and isolated restore. Do not run the migration on the live target yet.
5. Rebuild the exact-hash migration packet from the frozen commit. Complete the 13 production data-impact dispositions.
6. Maker authenticates freshly and signs; checker independently recomputes hashes, verifies evidence, authenticates later and signs.
7. Qualified Cameroon reviewers return statutory decisions and signature verification. Complete hardware evidence or the signed exclusion.
8. Rerun every narrow gate and enterprise gate 017. Only a GO can permit the separate protected activation ceremony.
9. Conduct Phase 2B as a bounded pilot, collect exit evidence, then make the Phase 3 decision.

## Final rule

The packet is now complete as a **field-and-evidence map**, not as production authorization. Null or pending fields represent events that have not occurred. They must stay null until their authoritative systems or accountable humans return verifiable evidence bound to one unchanged release candidate.
