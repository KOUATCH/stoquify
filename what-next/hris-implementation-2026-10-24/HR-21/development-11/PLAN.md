# HR21 development11 — hiring denial/recovery and protected originals

Scope: clear private workspaces after authority/session loss; preserve canonical errors; preserve exact uncertain hiring submissions; connect protected documents (including retention) to existing password recovery. No new read freshness policy, server permission weakening, production provider, deployment or schema promotion.

Independent reviewer: `/root/hiring_independent_review`, read-only source review requested by the user. Preflight found three UI gaps; native original-document protections had no demonstrated new defect.

Acceptance: denial clears private drafts/data; password expiry retains exact drafts without automatic submission; uncertain saves freeze the full request; independent/stale decisions are refused; protected originals remain inaccessible through quarantine/rejection and grants enforce actor/company/current access. EN/FR and rendered recovery checks remain required.

Verification classes: bounded mocked components; native PostgreSQL on the explicit owned loopback database; actual isolated Next/browser actions; local HTTPS storage/scanner simulation clearly distinguished from external provider/malware certification. Preserve all failures, check cleanup and source provenance before closure.

Command review: direct Jest uses inspected SWC/jsdom config and mocked actions, disables cache, writes evidence only; no Next config/environment load. Native database and browser runners require explicit owned database and synthetic fixture ownership. Workflow contract passed. No root build, root .env, schema promotion or external connection is authorized here.

Guidance: docs/ecc/WORKFLOW.md, qualified ECC security-review, UI/UX Pro Max focused UX search `form error recovery preserve input`, design-system/stoquify/MASTER.md and manager-action-center page contract. Search results support explicit recovery actions and labelled inputs; existing controls/tokens remain authoritative.
