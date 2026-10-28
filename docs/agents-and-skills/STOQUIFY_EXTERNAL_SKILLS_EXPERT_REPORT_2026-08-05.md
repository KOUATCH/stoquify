# Stoquify External Skills Expert Assessment

**Assessment date:** 2026-08-05  
**Decision scope:** engineering and product-development workflow only  
**Method:** canonical-source inspection plus local Stoquify overlap analysis  
**Safety posture:** no candidate was installed, executed, copied, or given Stoquify source/data

## 1. Executive decision

All five candidates contain useful ideas, but only two justify first-wave pilots. The clearest recommendation is:

1. **Impeccable — adopt the deterministic design-audit capability, beginning with a controlled read-only pilot.** It is locally reproducible, explicitly supports agent workflows, and can expose frontend anti-patterns that ordinary visual critique misses. Do not let its opinionated aesthetic defaults replace Stoquify's frozen design system or enterprise workflow rules.
2. **Alibaba Open Code Review — run a controlled synthetic-code pilot.** Its deterministic file selection, rule resolution, line positioning, current Prisma support, and active Windows/Codex support are promising. Direct use on Stoquify code is blocked until model routing, source egress, telemetry, retention, binary provenance, and custom control rules are approved.
3. **Anthropic Skill Creator — selectively adapt its evaluation methods; do not install the whole Claude-specific workflow.** Stoquify already has Codex skill authoring, validation, prompt architecture, and with/without-skill benchmark artifacts. The portable value is blind comparison, human qualitative review, assertion grading, token/time capture, and variance analysis.
4. **claude-video — keep as a demand-gated later pilot.** It can automate timestamped frame and transcript extraction, but the present business priority and privacy case do not justify a first-wave installation. Customer or payroll recordings are out of bounds until privacy, consent, retention, and processor controls exist.
5. **last30days — do not install.** Its cross-social recency is potentially useful for market sensing, but its credential, scraping, multi-provider, cookie, local-retention, public-publishing, prompt-conflict, and Windows burden outweighs its incremental value. Adapt a narrow “recent-source triangulation” research template instead.

The first sequence is **Impeccable read-only detector pilot → Alibaba synthetic review benchmark**. Both must remain reversible, isolated, and non-production. Neither pilot is authorization for global installation, repository hooks, source transmission, auto-fixing, CI enforcement, or customer-data processing.

## 2. Assessment scope and evidence discipline

### What was verified

- Canonical repositories, current release/version evidence, manifests, skill instructions, license files, dependency/runtime expectations, scripts/hooks, network and credential surfaces, filesystem behavior, Windows/Codex claims, tests, and maintenance signals were inspected where available.
- Stoquify overlap was checked against `AGENTS.md`, `package.json`, repository scripts/tests, the installed review and UI/UX evaluation skills, the Codex `skill-creator`, existing benchmark artifacts, current system-audit reports, and the repository knowledge graph.
- External facts are linked to canonical files or official documentation. Publisher benchmarks remain publisher claims because no candidate code was executed.

### Evidence labels

- **Verified external fact:** directly supported by a canonical repository or official documentation.
- **Verified repository fact:** directly supported by a local file or read-only command.
- **Publisher claim:** stated by a maintainer but not independently reproduced here.
- **Inference:** reasoned from verified evidence.
- **Expert judgment:** a recommendation or tradeoff.
- **Unknown:** material evidence was absent, unpinned, contradictory, or not safely testable.

### Limits

This was a source assessment, not a runtime benchmark. No quality, security, accessibility, privacy, or production-readiness claim is certified. Stars and popularity were excluded from scoring. Current releases can change after the assessment date, so an approved pilot must pin and re-audit an exact artifact.

## 3. Stoquify baseline and overlap map

### Current repository priorities

The current whole-system audit records a **NO-GO, 2/5 overall maturity** and identifies systemic tenant isolation, payment finality, aggregate correctness, race-prone balances, fail-open audit writes, plaintext invite tokens, incomplete entitlement/MFA/offline authority, and unverified production observability/statutory evidence. The completion roadmap therefore prioritizes tenant safety, identity, audit durability, provider truth, migration/rollback, accessibility evidence, and release assurance ahead of workflow convenience. See `docs/system-audit/STOQUIFY_WHOLE_SYSTEM_AUDIT_2026-08-03.md` and `docs/system-audit/STOQUIFY_COMPLETION_ROADMAP_2026-08-03.md`.

The stack already exposes substantial deterministic verification: `package.json` contains lint, TypeScript, Jest, Playwright, safe migration, secrets preflight, authenticated payroll, command-agent, close-assurance, and transaction-history gates. The installed `review` skill covers intent, correctness, system integrity, authorization, tenant boundaries, data integrity, accessibility, localization, observability, performance, and tests. Installed UI/UX evaluators cover repository/browser evidence, role-based jobs, enterprise trust, design-system fit, accessibility, responsive states, and implementation-ready corrections.

The local inventory contains **482 `SKILL.md` files** across the inspected Codex and agent skill roots. Quantity is not quality, but it materially raises the bar for another general-purpose skill: new adoption must reduce risk or improve measured outcomes, not merely add instructions. Existing skill-evaluation assets include with/without-skill `grading.json`, `benchmark.json`, and `build_benchmark.py` under `ideas/professional-dashboard-creator-workspace/`.

The repository graph reports 4,121 nodes, 5,321 edges, and 135 communities, but it was generated on 2026-06-14 and is stale relative to the current source. It was used for navigation only, consistent with the system audit.

### Functional overlap

| Candidate | Existing coverage | Genuine additive gap |
|---|---|---|
| Alibaba Open Code Review | Native Codex review, installed `review`, ESLint, TypeScript, Jest, Playwright, secrets/policy/service gates | Deterministic diff partitioning, path-specific review rules, resumable sessions, line positioning, repeatable seeded benchmark surface |
| Impeccable | UI/UX evaluators, Stoquify UI skill suite, design-system freeze, Playwright/browser evidence | Reproducible source-level anti-pattern detector and focused agent design command vocabulary |
| last30days | Current web research, internal strategy reports, ordinary official-source research | Aggregated recent social/engagement signal across several platforms |
| claude-video | Codex image/video reasoning and manual frame/screenshot inspection | Automated acquisition, caption extraction, scene/keyframe sampling, timestamps, and transcript assembly |
| Anthropic Skill Creator | Codex `skill-creator`, prompt architect, validators, 482-skill inventory, existing with/without benchmark artifacts | More explicit human-review viewer, blind comparison, token/time statistics, and variance-analysis loop |

## 4. Comparative decision matrix

| Skill | Primary value | Key limitations | Security risk | Overlap | Effort | Score | Confidence | Verdict |
|---|---|---|---|---|---|---:|---|---|
| Impeccable | Deterministic frontend anti-pattern detection plus structured design critique | Opinionated aesthetics; writes design context; optional hooks; can cause broad visual drift | Medium | High | Medium | **83.0** | High | Adopt capability via controlled read-only pilot |
| Alibaba Open Code Review | Deterministic review orchestration and line-level LLM findings | Code/context egress, binary/postinstall supply chain, model variance, custom-rule work | High until governed | Medium-high | Medium | **82.5** | High | Controlled pilot; data-governance override blocks direct adoption |
| Anthropic Skill Creator | Evaluation-driven skill improvement and benchmark variance analysis | Claude commands, Bash assumptions, API/runtime coupling, large overlap | Medium | Very high | Medium | **70.5** | High | Selectively adapt methods; no whole-skill install |
| claude-video | Automated transcript, frame, scene, and timestamp extraction | Temp retention, media dependencies, possible audio upload, token/cost limits | High for private video | Medium | Medium-large | **65.5** | Medium-high | Demand-gated later pilot only |
| last30days | Cross-social recent-market signal aggregation | Credentials, cookies, scraping, many providers, retention/publishing, prompt conflict | High | High | Large | **57.5** | High | Do not install; adapt narrow research patterns |

## 5. Reproducible weighted scorecard

Raw scores are 0–10. Weighted contribution equals `raw / 10 × criterion weight`.

| Criterion | Weight | Impeccable | Alibaba OCR | Skill Creator | claude-video | last30days |
|---|---:|---:|---:|---:|---:|---:|
| Stoquify use-case/business value | 20 | 8 | 9 | 7 | 7 | 6 |
| Security/privacy/data governance | 15 | 8 | 5 | 7 | 5 | 3 |
| Codex/Windows compatibility | 15 | 9 | 9 | 5 | 6 | 5 |
| Technical fit | 10 | 9 | 9 | 7 | 7 | 5 |
| Maintenance/maturity | 10 | 9 | 10 | 9 | 6 | 9 |
| License/provenance | 10 | 10 | 10 | 10 | 10 | 10 |
| Reliability/evidence | 10 | 8 | 8 | 8 | 7 | 6 |
| Installation/operating burden | 5 | 6 | 6 | 5 | 4 | 2 |
| Incremental value | 5 | 5 | 7 | 4 | 6 | 5 |
| **Weighted total** | **100** | **83.0** | **82.5** | **70.5** | **65.5** | **57.5** |

### Score interpretation

- **Impeccable:** 83.0 reaches the capability-adoption band. “Adopt” means approve a governed capability path after the read-only pilot, not run `npx`, install hooks, or permit autonomous rewrites now.
- **Alibaba OCR:** 82.5 would normally support adoption, but source/context transmission and artifact provenance are hard deployment-mode blockers. The override reduces the verdict to controlled pilot.
- **Skill Creator:** 70.5 supports a pilot, but extreme overlap makes selective internal adaptation more economical than installing the Claude workflow.
- **claude-video:** 65.5 supports a controlled pilot only after a recurring, non-sensitive use case is proven; it is not first-wave.
- **last30days:** 57.5 supports monitoring or selective pattern adaptation, not installation.

## 6. Individual candidate assessments

### 6.1 Impeccable — The Designer

**Verified external facts.** The current repository exposes Skill 4.0.4 and CLI 3.5.0 releases observed on 2026-08-05. Its README describes one skill, 23 design commands, live browser iteration, and 59 deterministic detector rules. The deterministic CLI/browser path does not require an LLM API key. The package manifest requires Node 22.18 or newer, declares Apache-2.0, and includes a source detector export. `init` writes `PRODUCT.md` and may write `DESIGN.md`; project installation can add agent/hook configuration. Sources: [README](https://github.com/pbakaus/impeccable/blob/main/README.md), [releases](https://github.com/pbakaus/impeccable/releases), [package manifest](https://github.com/pbakaus/impeccable/blob/main/package.json), [hook reference](https://github.com/pbakaus/impeccable/blob/main/skill/reference/hooks.md), and [license](https://github.com/pbakaus/impeccable/blob/main/LICENSE).

**Best Stoquify uses.** Read-only detection on bounded React/Tailwind surfaces; regression-oriented review of typography, nested-card patterns, responsive overflow, copy clarity, state completeness, and visual inconsistency; an independent signal before the existing browser/accessibility release gate.

**Benefits.** Deterministic rules are more reproducible than free-form design taste, can be compared across commits, and do not inherently require source transmission to an external model. The project is active and has fixtures/tests for detector behavior. Its product-versus-brand distinction is useful for Stoquify's dense operational dashboards.

**Limitations and risks.** The rules are intentionally opinionated: its public guidance rejects common fonts, pure neutral colors, and several recurring patterns. Those are design opinions, not universal accessibility or enterprise-workflow truths. An unbounded `/init`, `/document`, `/extract`, `/polish`, or hook-driven flow could create competing root documents, rewrite shared components, or override role-based density and localization needs. `npx` installation, auto-update behavior, project hooks, Puppeteer/browser components, and Node-version drift need supply-chain review. Deterministic detection is not an accessibility certification.

**Overlap.** High. Stoquify already has design-system-freeze, UI/UX evaluator, workflow evaluator, public-first-impression, robust-state, localization, accessibility/visual-regression, landing, POS, dashboard, and role-based cockpit skills. The additive part is the source-level detector, not another general design persona.

**Expert judgment.** **Adopt the capability through a controlled read-only pilot; effort medium.** If the detector materially improves precision, map accepted rules into Stoquify's existing design governance. Do not make upstream `PRODUCT.md`, `DESIGN.md`, hooks, or aesthetic defaults authoritative.

### 6.2 Alibaba Open Code Review — The Reviewer

**Verified external facts.** Release v1.8.8, commit `6dc3eb0`, was published on 2026-08-04 and was current at assessment. The project declares Apache-2.0 and publishes Windows artifacts. Its README lists Windows and Codex support, requires Git 2.41+, reads Git diffs, can retrieve full-file/repository context, and sends changed files to a configured LLM in the default mode. Delegation mode lets the coding agent perform model work. Workspace mode includes staged, unstaged, and untracked files. The skill records default concurrency of eight, a ten-minute per-file timeout, path-scoped rules, and structured line positions; it also warns that user rules replace built-ins unless merge is enabled. The npm manifest uses version `0.0.0` placeholders and a `postinstall` downloader for release binaries/checksums, so release pinning must be based on the binary/tag rather than that package field. Sources: [README](https://github.com/alibaba/open-code-review/blob/main/README.md), [skill](https://github.com/alibaba/open-code-review/blob/main/skills/open-code-review/SKILL.md), [v1.8.8 release](https://github.com/alibaba/open-code-review/releases/tag/v1.8.8), [npm manifest](https://github.com/alibaba/open-code-review/blob/main/package.json), [license](https://github.com/alibaba/open-code-review/blob/main/LICENSE), and [telemetry documentation](https://open-codereview.ai/docs/telemetry).

**Publisher claim.** Alibaba reports a benchmark across 50 repositories, 200 pull requests, ten languages, 80+ senior engineers, and 1,505 annotated defects, with higher precision/F1 and lower recall than a general-purpose agent. This is useful design evidence but is not independent Stoquify validation.

**Best Stoquify uses.** Repeatable review of synthetic TypeScript/Prisma changes; path-specific rules for tenant predicates, Decimal handling, transaction boundaries, idempotency, maker-checker, audit durability, redaction, and server-owned authorization; independent review of high-risk diffs before the native final review.

**Benefits.** It adds deterministic file selection, rule matching, resumable sessions, comment positioning, review-unit isolation, full-file scan, and structured output. The recent release line added explicit Prisma allowlisting/support and Windows fixes. That is a better fit than the skill's older metadata version `1.0.0` suggests.

**Limitations and risks.** Default LLM routing can transmit source, diffs, full-file context, and business background outside the workstation. Repository text and diffs are untrusted prompt input. Untracked files can be included unexpectedly. Provider configuration stores secrets; telemetry and saved sessions add retention questions. Large diffs, language defaults, model choice, cost, lower recall, auto-fix instructions, binary downloads, global npm installation, and custom-rule replacement create operational risk. Generic rules cannot infer Stoquify's accounting and tenant invariants without a governed rule pack.

**Overlap.** Medium-high. Native Codex plus the installed `review` skill already performs repository-aware, evidence-led review; TypeScript, ESLint, Jest, Playwright, secrets, migration, service-boundary, and release gates are deterministic. OCR's distinct value is orchestration and measurable review consistency, not replacing those gates.

**Expert judgment.** **Controlled pilot only; effort medium.** The numerical score supports the capability, but direct repository use is blocked until the egress/provider, telemetry, session retention, binary checksum/SBOM, and custom-rule questions are approved. Use delegation or an approved local boundary on synthetic code first. Never enable auto-fix during evaluation.

### 6.3 Anthropic Skill Creator — The Recruiter

**Verified external facts.** The assessed implementation is an unversioned `main` snapshot rather than a pinned release. Its 406-line `SKILL.md` describes creating, editing, evaluating, benchmarking, and improving skill descriptions. The workflow uses with-skill and baseline runs, per-eval metadata, assertion grading, a human review viewer, token/time capture, benchmark aggregation, blind comparison, and variance analysis. Several steps assume Claude-specific helpers and POSIX commands such as `claude-with-access-to-skill`, `cp`, `nohup`, background PIDs, and `claude -p`. The skill's license file is Apache-2.0. Sources: [Skill Creator implementation](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md), [license](https://github.com/anthropics/skills/blob/main/skills/skill-creator/LICENSE.txt), and [official Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview).

Anthropic's official documentation describes progressive disclosure and explicitly states that skills may include executable code. It warns that malicious or compromised skills can misuse tools, expose data, or make unexpected network/file accesses, and says to treat skills like software. The same page states that Agent Skills is not covered by ZDR arrangements for the API feature. Those are platform facts, not a claim that local Codex execution would use Anthropic retention.

**Best Stoquify uses.** Add blind A/B comparison, human example review, discriminating assertions, timing/token measurement, variance flags, and trigger-description tests to the existing Codex lifecycle. Use these methods to rationalize the current skill portfolio before creating more skills.

**Benefits.** The evaluation loop is more rigorous than “write a skill and validate YAML.” It recognizes that subjective outputs require human judgment and that aggregate pass rates can hide nondiscriminating or flaky assertions.

**Limitations and risks.** The orchestration and command examples are Claude/POSIX-centric and not directly portable to Windows Codex. Description optimization can require Claude CLI/API access. An unpinned `main` snapshot complicates change control. Unbounded adoption would add another skill-governance authority and could amplify duplicate-skill creation—the opposite of Stoquify's need to consolidate.

**Overlap.** Very high. Codex's installed `skill-creator` already defines progressive disclosure, lean `SKILL.md` guidance, frontmatter/interface validation, scripts, references, and `quick_validate.py`. Stoquify already has `aqstoqflow-prompt-architect`, local validation scripts, and a real with/without benchmark directory. The missing pieces are process refinements, not scaffolding.

**Expert judgment.** **Selectively adapt methods; effort medium.** Do not install the upstream skill. Create one Stoquify-owned evaluation contract that fits Codex, PowerShell, current schemas, and the existing lifecycle. Consolidation should precede any new skill generation.

### 6.4 claude-video — The Watcher

**Verified external facts.** The current skill version is 0.2.0 dated 2026-06-29 and the project declares MIT licensing. The Python workflow depends on `yt-dlp` and `ffmpeg`/`ffprobe`; it prefers captions, extracts sampled frames, and can use Groq or OpenAI Whisper for audio transcription. Version 0.2.0 introduced transcript/efficient/balanced/token-burner modes, frame deduplication, timestamp capture, a no-Whisper option, 25 MB Whisper chunking, and offline pytest coverage. The default balanced mode caps at 100 frames. Sources: [skill](https://github.com/bradautomates/claude-video/blob/main/skills/watch/SKILL.md), [source](https://github.com/bradautomates/claude-video/blob/main/skills/watch/scripts/watch.py), [configuration](https://github.com/bradautomates/claude-video/blob/main/skills/watch/scripts/config.py), [changelog](https://github.com/bradautomates/claude-video/blob/main/CHANGELOG.md), and [license](https://github.com/bradautomates/claude-video/blob/main/LICENSE).

**Best Stoquify uses.** Public competitor walkthroughs; non-sensitive synthetic bug recordings; internal training demos with explicit approval; timestamped evidence extraction for UI regressions.

**Benefits.** It automates acquisition, captions, scene-aware frames, deduplication, timestamps, and a structured evidence directory. The `--no-whisper` and captions-first paths can avoid audio API upload for suitable public material.

**Limitations and risks.** The code creates a temporary work directory but cleanup is instruction-driven rather than guaranteed by a `finally` boundary; sensitive remnants can persist. API-key configuration, filesystem permissions, and secret protection are weaker on Windows than a Unix `chmod 0600` assumption. Whisper sends audio to an external provider when used. Frames enter the model context. Sparse sampling can miss brief UI failures; captions and transcription can be inaccurate; large recordings can consume substantial image tokens and API cost. `yt-dlp` access can implicate source terms and private-session credentials. The young repository and limited release history reduce maturity confidence.

**Overlap.** Medium. Codex can already reason about user-provided images/video, and Stoquify has browser/screenshot practices. The additive value is automated timeline extraction, not superior product judgment.

**Expert judgment.** **Demand-gated later pilot; effort medium-large.** Pilot only when three or more recurring video-analysis cases exist and start with public or synthetic short clips, captions or `--no-whisper`, an explicit output directory, deterministic cleanup, and no cookies. Do not process customer, payroll, support, or user-research recordings without a separate privacy design.

### 6.5 last30days — The Researcher

**Verified external facts.** The current manifest reports version 3.18.4, Python 3.12+, MIT licensing, and an 84% coverage floor. The skill orchestrates a broad set of social/search sources and optional services, including Reddit, X paths, Hacker News, video/social APIs, search providers, model routers, and market data. Its setup can involve API tokens, browser cookies, CLI tools, a local configuration file, local SQLite watchlists, Markdown/HTML output, and optional publishing. Sources: [skill](https://github.com/mvanhorn/last30days-skill/blob/main/skills/last30days/SKILL.md), [manifest](https://github.com/mvanhorn/last30days-skill/blob/main/pyproject.toml), [changelog](https://github.com/mvanhorn/last30days-skill/blob/main/CHANGELOG.md), [source scripts](https://github.com/mvanhorn/last30days-skill/tree/main/skills/last30days/scripts), and [license](https://github.com/mvanhorn/last30days-skill/blob/main/LICENSE).

**Best Stoquify uses.** Early market-language discovery, competitor chatter, recurring issue sensing, and hypothesis generation—not authoritative research.

**Benefits.** It systematizes recency windows and can aggregate engagement signals that ordinary official-source browsing may miss. The repository is active, versioned, tested, and security changes are recorded in its changelog.

**Limitations and risks.** The breadth is the problem: many providers, authentication modes, cookies, scraping paths, rate limits, local stores, output folders, and optional publishing create a large trust and maintenance surface. POSIX-heavy commands reduce native Windows reliability. Its long, dominant skill contract attempts to control research/source formatting in ways that can conflict with Codex's higher-level citation rules. Social coverage in Africa/OHADA markets is unproven, and engagement is neither representative evidence nor regulatory authority. Ordinary current web research already covers the higher-trust official sources with fewer credentials and less retention.

**Overlap.** High. Stoquify already has web research and extensive product/market reports. The unique signal—cross-social recency—has low authority for the platform's highest-risk decisions.

**Expert judgment.** **Do not install; selectively adapt a narrow research template; effort large.** A Stoquify-owned template should require official-source-first triangulation, a 30-day recency view only where relevant, jurisdiction/geography labels, confidence, and explicit exclusion from legal/accounting/security authority. No browser cookies, public publishing, or persistent watchlist is needed initially.

## 7. First-wave controlled pilot plans

### Pilot A — Impeccable deterministic detector

| Element | Contract |
|---|---|
| Scope | Detector-only, read-only assessment of two bounded non-production UI surfaces: one dense operational dashboard and one form/workflow |
| Isolation | Disposable repository copy with no credentials, customer data, networked app session, project hooks, root-document writes, or auto-update |
| Representative task | Seed 25 known violations spanning overflow, responsive behavior, copy, focus/labels, nested cards, token drift, reduced motion, and inconsistent states |
| Baseline | Current Stoquify UI/UX evaluator plus existing lint/browser/manual review on the same fixtures |
| Metrics | 100% repeatability across three runs; ≥85% precision on deterministic findings; ≥80% recall of seeded applicable issues; zero writes outside the sandbox; zero network egress; reviewer triage ≤30 minutes per surface |
| Domain gate | Every accepted finding must align with the frozen design system, role/job, localization, accessibility evidence, and financial workflow clarity |
| Time box | Five working days including evidence review |
| Removal | Delete the disposable copy and generated local outputs; no repository hook/config/document survives |
| Promote if | It adds at least five material, verified findings beyond the baseline without creating a competing source of design truth |
| Reject if | Precision falls below 85%, rules systematically conflict with design governance, or installation cannot be made hook-free and pinned |

### Pilot B — Alibaba Open Code Review

| Element | Contract |
|---|---|
| Scope | Review-only benchmark on synthetic TypeScript/React/Prisma code derived from generic patterns, never copied from proprietary Stoquify source |
| Isolation | Disposable Git repository; exact signed/checksummed version pin; telemetry off; no saved external sessions; no global install; approved existing agent delegation or locally approved model boundary |
| Representative task | 40 seeded defects across tenant predicates, server authorization, Decimal/money, Prisma transactions, races, idempotency, audit failure, redaction, provider finality, React state, and error handling |
| Baseline | Native Codex plus installed `review` skill, run independently on identical seeded commits |
| Metrics | ≥85% precision; ≥75% overall recall; ≥90% P0/P1 recall; ≥95% correct line placement; zero secret/source egress; no automatic edits; token/cost and reviewer minutes recorded |
| Rule gate | Stoquify rules must merge with—not silently replace—applicable upstream rules; rule ownership and version are explicit |
| Time box | Five working days after privacy/security approval |
| Removal | Delete disposable repository, config, sessions, cache, and binary; verify no global package, hook, service, token, or telemetry endpoint remains |
| Promote if | It catches ≥20% more verified P0/P1 defects than baseline at equal or better precision and adds ≤10% reviewer triage time |
| Reject if | Any unauthorized egress/retention occurs, critical recall is below 90%, line accuracy is below 95%, or the rule pack becomes a competing policy authority |

## 8. Adoption sequence and governance gates

1. **Now:** approve this assessment only. Do not install candidates.
2. **Design pilot:** pin and audit Impeccable, then run the detector-only plan. Security and design-system owners sign the rule map.
3. **Review pilot:** after egress/provenance approval, pin Alibaba OCR and run the synthetic benchmark. Security, privacy, platform, and quality owners sign the result.
4. **Skill lifecycle:** incorporate only the portable Anthropic evaluation concepts into the existing Codex lifecycle. First use them to consolidate or retire duplicates.
5. **Video:** reconsider claude-video only when a named workflow owner supplies recurring non-sensitive cases and privacy/retention controls.
6. **Research:** do not install last30days. Create a small official-source-first recent-signal checklist if product strategy requests it.

No candidate receives CI enforcement, global installation, autonomous fixes, production credentials, customer data, repository-wide hooks, or privileged agent authority from this report.

## 9. Unknowns and specialist reviews required

| Unknown or approval | Owner | Required before |
|---|---|---|
| Exact dependency SBOM, artifact checksum, vulnerability state, and transitive installer behavior at the chosen pin | AppSec / DevSecOps | Any installation |
| Alibaba model endpoint, DPA, residency, retention, telemetry, and session storage | Security / Privacy / Procurement | Any real-source review |
| Impeccable rule-to-design-token mapping and WCAG false-positive validation | Design system / Accessibility | Rule adoption or CI gating |
| Recording consent, lawful basis, processor terms, deletion SLA, and data-subject handling | Privacy / Legal | Any private video |
| `yt-dlp` source authorization and cookie policy | Legal / Security | Authenticated/private acquisition |
| Exact Anthropic Skill Creator commit pin and Codex schema/command mapping | Agent governance | Internal adaptation |
| Africa/OHADA platform coverage and source representativeness for last30days | Product research / Regional expert | Any strategic reliance |
| Apache-2.0/MIT notice and redistribution obligations in Stoquify's intended distribution model | Legal / Procurement | Vendoring or distribution |

## 10. Source register

### Alibaba Open Code Review

- [Canonical repository and README](https://github.com/alibaba/open-code-review)
- [Open Code Review skill](https://github.com/alibaba/open-code-review/blob/main/skills/open-code-review/SKILL.md)
- [v1.8.8 release](https://github.com/alibaba/open-code-review/releases/tag/v1.8.8)
- [npm manifest and postinstall surface](https://github.com/alibaba/open-code-review/blob/main/package.json)
- [Apache-2.0 license](https://github.com/alibaba/open-code-review/blob/main/LICENSE)

### Impeccable

- [Canonical repository and README](https://github.com/pbakaus/impeccable)
- [Current releases](https://github.com/pbakaus/impeccable/releases)
- [Package manifest](https://github.com/pbakaus/impeccable/blob/main/package.json)
- [Hook behavior](https://github.com/pbakaus/impeccable/blob/main/skill/reference/hooks.md)
- [Apache-2.0 license](https://github.com/pbakaus/impeccable/blob/main/LICENSE)

### last30days

- [Canonical repository](https://github.com/mvanhorn/last30days-skill)
- [Skill contract](https://github.com/mvanhorn/last30days-skill/blob/main/skills/last30days/SKILL.md)
- [Python manifest and coverage floor](https://github.com/mvanhorn/last30days-skill/blob/main/pyproject.toml)
- [Changelog](https://github.com/mvanhorn/last30days-skill/blob/main/CHANGELOG.md)
- [MIT license](https://github.com/mvanhorn/last30days-skill/blob/main/LICENSE)

### claude-video

- [Canonical repository](https://github.com/bradautomates/claude-video)
- [Watch skill](https://github.com/bradautomates/claude-video/blob/main/skills/watch/SKILL.md)
- [Execution source](https://github.com/bradautomates/claude-video/blob/main/skills/watch/scripts/watch.py)
- [Configuration source](https://github.com/bradautomates/claude-video/blob/main/skills/watch/scripts/config.py)
- [v0.2.0 changelog](https://github.com/bradautomates/claude-video/blob/main/CHANGELOG.md)
- [MIT license](https://github.com/bradautomates/claude-video/blob/main/LICENSE)

### Anthropic Skill Creator

- [Canonical Skill Creator implementation](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
- [Skill-specific Apache-2.0 license](https://github.com/anthropics/skills/blob/main/skills/skill-creator/LICENSE.txt)
- [Official Agent Skills architecture, security, runtime, and retention guidance](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)

## 11. Verification record

- All five candidates are assessed individually and appear in the comparison and score tables.
- License/provenance, executable/hook behavior, networks/credentials, filesystem/retention, Windows/Codex fit, maintenance, evidence quality, local overlap, and incremental value are addressed.
- The weighted totals were recalculated from the displayed raw scores.
- No third-party candidate code, installer, hook, package, or binary was executed.
- No `.env`, credential, customer, payroll, recording, or production data was inspected.
- Documentation-only validation does not require the full Stoquify build or test suite.
- PDF existence, page count, text extraction, candidate-name coverage, and encoding checks are recorded after rendering in the final handoff.

## Final recommendation

Stoquify should **add two governed signals, not five new authorities**. Impeccable's deterministic detector and Alibaba's review orchestrator can earn adoption through narrow benchmarks. Anthropic's evaluation loop should improve the existing skill lifecycle without another installation. claude-video should wait for a privacy-safe recurring need. last30days should remain external inspiration only.
