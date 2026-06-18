# SkillSmith Method

This local method adapts two research ideas:

- Boundary-guided skill compilation: reduce irrelevant context by extracting the minimum runtime interface a skill needs to execute.
- Skill/tool co-evolution: when repeated failures reveal a capability gap, improve the skill, script, tool wrapper, or suite structure together instead of only editing prose.

## Boundary Types

For each skill, define:

- Trigger boundary: when the skill should be selected.
- Input boundary: documents, files, graphs, schemas, configs, or user data it must inspect.
- Edit boundary: files or domains it may modify.
- Tool boundary: tools it may use and tools it should avoid.
- Gate boundary: conditions that must pass before continuing.
- Stop boundary: conditions that require refusal, repair, or clarification.
- Output boundary: exactly what the final report must contain.

## Interaction Types

Use these labels when comparing skills:

- `DEPENDS_ON`: one skill must run after another.
- `COMPLEMENTS`: skills strengthen each other without duplicating work.
- `OVERLAPS`: skills cover similar workflow territory.
- `CONFLICTS`: instructions can push the agent in incompatible directions.
- `RETIRES`: one skill supersedes another.
- `WRAPS_TOOL`: a skill should consistently invoke or prepare a tool/script.
- `SPLIT_CANDIDATE`: a skill is doing too many unrelated jobs.
- `MERGE_CANDIDATE`: separate skills create avoidable repetition or ambiguity.

## Anti-Pattern Record

Track anti-patterns when a failure repeats or would be costly:

- Failure signature
- Context where it appears
- Root cause
- Veto rule
- Repair pattern
- Verification

## Mutation Rules

- Prefer references over bloated `SKILL.md` files.
- Prefer a suite executor over one monolithic mega-skill.
- Prefer a helper script only when the workflow has stable repeated mechanics.
- Prefer split skills when domains have different gates, tools, and outputs.
- Prefer merge only when the user explicitly wants a canonical skill or overlap harms execution.
- Never hide uncertainty about legal, tax, payroll, or fiscal compliance. Require expert validation.

## Verification Checklist

- Folder name equals frontmatter `name`.
- `SKILL.md` begins and ends YAML frontmatter correctly.
- `description` contains useful trigger language.
- Required references exist.
- Templates exist if mentioned.
- No placeholder text remains.
- The output contract is explicit.
- Stop conditions are explicit.
- If installed outside the repo, the installed copy exists in the Codex skills folder.

