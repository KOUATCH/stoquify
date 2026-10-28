# Stoquify Next Five Essential Skills - Assessment and Recommendation Prompt

**Date:** 2026-08-05  
**Mode:** Evidence-led, read-only assessment  
**Target:** Stoquify (`Next.js 15`, `React 19`, `Prisma 6`, PostgreSQL/Neon, Jest, Playwright, Windows/Codex)  
**Expected outputs:**

- `docs/agents-and-skills/STOQUIFY_NEXT_5_ESSENTIAL_SKILLS_EXPERT_REPORT_2026-08-05.md`
- `docs/agents-and-skills/STOQUIFY_NEXT_5_ESSENTIAL_SKILLS_EXPERT_REPORT_2026-08-05.pdf`

---

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

## Mission

Evaluate five additional external agent skills that could materially accelerate Stoquify toward its stated goal: becoming a trusted, auditable operating system for SMB finance, accounting, payroll, inventory, POS, purchasing, payments, compliance, evidence, and close assurance.

The five candidates must be additional to the previously reviewed Alibaba Open Code Review, Impeccable, last30days, claude-video, and Anthropic Skill Creator. Do not re-score those earlier candidates.

Assess these five candidates:

1. **The Database Guardian - Supabase `supabase-postgres-best-practices`**
   - Repository: https://github.com/supabase/agent-skills
   - Skill: https://github.com/supabase/agent-skills/blob/main/skills/supabase-postgres-best-practices/SKILL.md
2. **The Supply-Chain Sentinel - Trail of Bits `supply-chain-risk-auditor`**
   - Repository: https://github.com/trailofbits/skills
   - Skill: https://github.com/trailofbits/skills/blob/main/plugins/supply-chain-risk-auditor/skills/supply-chain-risk-auditor/SKILL.md
3. **The Observability Engineer - Sentry `sentry-nextjs-sdk`**
   - Repository: https://github.com/getsentry/sentry-agent-skills
   - Skill: https://github.com/getsentry/sentry-agent-skills/blob/main/skills/sentry-nextjs-sdk/SKILL.md
4. **The Browser Certifier - Anthropic `webapp-testing`**
   - Repository: https://github.com/anthropics/skills
   - Skill: https://github.com/anthropics/skills/blob/main/skills/webapp-testing/SKILL.md
5. **The Web Quality Gate - Addy Osmani `web-quality-audit`**
   - Repository: https://github.com/addyosmani/web-quality-skills
   - Skill: https://github.com/addyosmani/web-quality-skills/blob/main/skills/web-quality-audit/SKILL.md

## Governing Question

For each candidate, answer:

> Does this skill remove a material Stoquify blocker, create repeatable evidence, and improve delivery enough to justify its security, privacy, maintenance, licensing, platform, and operational costs?

Do not equate popularity, polished documentation, or an official publisher with production suitability.

## Required Local Evidence

Inspect, at minimum:

- `package.json`
- `docs/system-audit/STOQUIFY_WHOLE_SYSTEM_AUDIT_2026-08-03.md`
- `docs/system-audit/STOQUIFY_COMPLETION_ROADMAP_2026-08-03.md`
- `docs/system-audit/STOQUIFY_FINDINGS_REGISTER_2026-08-03.md`
- `docs/stoquify-skills-agents/STOQUIFY_TOP_12_ADDITIVE_AGENTS_AND_SKILLS_RESEARCH_REPORT_2026-08-02.md`
- relevant architecture decisions, scripts, Playwright configuration, observability code, database access patterns, CI/release gates, and dependency files
- `graphify-out/GRAPH_REPORT.md` only as supporting navigation; state its generation date and do not treat stale graph data as current truth

Verify whether each candidate or equivalent capability is already installed or substantially implemented. Distinguish direct repository evidence from inference.

## External Research Rules

Use current primary sources wherever possible:

- upstream repository and exact `SKILL.md`
- license file
- release history or commit activity
- scripts and referenced resources included by the skill
- official documentation for any SDK, service, CLI, or runtime the skill requires

Follow every material reference from the selected `SKILL.md`. Inspect scripts rather than trusting their filename or description. Record the research date. If a source is ambiguous or unavailable, say so and reduce confidence.

Do not install, execute, or grant credentials to any candidate during assessment. Do not modify application code, configuration, CI, dependencies, external services, or business data.

## Stoquify Safety Boundaries

Apply these non-negotiable constraints:

- Tenant boundaries must fail closed.
- Finance, payroll, statutory, close, billing, provider-payment, inventory, entitlement, and evidence writes remain service-owned and approval-gated.
- No skill may independently certify legal, statutory, accounting, security, accessibility, or release compliance.
- No sensitive data, secrets, tokens, request bodies, local variables, source maps, replay recordings, payroll details, or financial evidence may be transmitted externally without explicit data-governance approval.
- Generated advice is not evidence. Evidence requires deterministic checks, retained artifacts, reproducible commands, and an accountable reviewer.
- External skills must be version-pinned or commit-pinned, checksummed where practical, project-local, least-privilege, and reviewable before use.
- Windows/Codex compatibility must be tested explicitly; POSIX-only commands, Bash assumptions, process-tree behavior, and shell invocation are material risks.
- A skill that contradicts Stoquify architecture must be adapted or rejected, not followed literally.

## Required Assessment for Each Skill

Produce a full dossier containing:

1. **Identity and provenance**
   - publisher, repository, exact skill path, license, maintenance evidence, release/version signal, and whether it is official or community-authored
2. **How it works**
   - instructions, scripts, tools, commands, credentials, services, network access, data flows, outputs, and persistent artifacts
3. **Stoquify fit**
   - exact blocker or roadmap item addressed
   - compatible stack surfaces
   - overlap with existing code, scripts, skills, or prior recommendations
   - incremental value beyond current Stoquify capabilities
4. **Security and privacy review**
   - prompt-injection and instruction risks
   - shell/process risks
   - secret and PII exposure
   - telemetry and third-party data transfer
   - dependency and supply-chain exposure
   - generated-code and false-certification risk
5. **Platform and operational review**
   - Codex and Windows compatibility
   - installation burden
   - runtime/tooling prerequisites
   - maintenance burden and likely failure modes
6. **Three grounded scenarios**
   - a high-value use
   - a normal operating use
   - a misuse or failure case
7. **Recommendation**
   - adopt now, controlled pilot, selectively adapt/monitor, or reject
   - required guardrails
   - narrow pilot scope
   - measurable success criteria
   - rollback or stop conditions

## Weighted Scoring Model

Score every criterion from 0 to 10, then calculate the weighted score out of 100.

| Criterion | Weight |
|---|---:|
| Stoquify use-case and business value | 20% |
| Security, privacy, and data governance | 15% |
| Codex and Windows compatibility | 15% |
| Technical and architectural fit | 10% |
| Maintenance health | 10% |
| License and provenance clarity | 10% |
| Reliability and evidence quality | 10% |
| Installation and operational burden | 5% |
| Incremental value over existing capabilities | 5% |

Use this formula:

`weighted total = sum((criterion score / 10) * criterion weight)`

Verdict bands:

- `80-100`: adopt now, subject to stated governance
- `65-79.9`: controlled pilot
- `50-64.9`: selectively adapt or monitor
- `<50`: reject

A hard blocker overrides the numeric band. Hard blockers include unclear or incompatible licensing, unsafe mandatory data transfer, unbounded shell execution, unsupported platform behavior, inability to operate least-privilege, or conflict with Stoquify's authoritative service boundaries.

## Cross-Skill Decision

After the individual dossiers:

1. Rank all five candidates.
2. Map each candidate to a verified Stoquify gap.
3. Identify overlap and interaction risks between candidates.
4. Separate what should be adopted as guidance from what requires tooling or external service integration.
5. Recommend a phased sequence with owners, prerequisites, measurable gates, and stop conditions.
6. State which candidates should not be installed as-is.
7. Explain what these five add beyond Stoquify's existing skill estate and the previously reviewed five candidates.

## Output Contract

Create an executive-grade report with:

- executive decision
- Stoquify evidence baseline
- ranked weighted scorecard
- five complete dossiers
- risk and hard-blocker register
- phased adoption recommendation
- pilot success metrics
- final go/no-go decisions
- local and external source register
- limitations and confidence statement

Every material claim must cite a local file or a direct primary-source link. Clearly label inference. Avoid promotional language and false precision.

Save the report as both Markdown and PDF at the expected output paths. Treat the Markdown as the reviewable source of truth. Verify that the PDF opens, contains selectable text, has no clipped tables or headings, and matches the Markdown's decisions and scores.

Do not implement or install the assessed skills. End with a concise executive recommendation and the first safe action Stoquify should take.
