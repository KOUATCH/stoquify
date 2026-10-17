# Codex Skills and Commands

## Shared Stoquify workflow

For nontrivial work, read [docs/ecc/WORKFLOW.md](docs/ecc/WORKFLOW.md). It routes engineering, security, database, UI and release work to current project controls. Use [docs/ecc/skill-routing.md](docs/ecc/skill-routing.md) to select relevant skills by qualified source; do not load every installed skill.

Before executing a verification script, inspect its current definition and [docs/ecc/command-registry.json](docs/ecc/command-registry.json). `npm run build` compiles without schema promotion but loads application configuration and writes build output; it is not a read-only check. `release:schema:promote` is the separate mutating migration stage. Unclassified commands require side-effect review, not an assumption of safety. Start with `npm run agent:workflow:check`; this validates the contract and does not run application/database commands.

For UI work, read [design-system/stoquify/MASTER.md](design-system/stoquify/MASTER.md) and the relevant page contract. They reference the existing UI constitution, component registry and implemented tokens. Generic skill recommendations do not override business controls or approved design decisions.

Report source inspection, mocked unit tests, real database tests and rendered/browser checks separately. Passing one does not certify another. Preserve unrelated working-tree edits; stage only explicitly owned files/hunks when a commit is requested.

## Skills Integration

- `/graphify`: discover and read the installed skill through the current harness catalog. Its previously declared user-level path was absent at the 2026-10-07 audit. If still unavailable, report the missing capability and use existing `graphify-out/` evidence for read-only analysis; do not install or regenerate implicitly.
- `/test-gen`: discover and read the installed skill. Its former user-level path was absent at audit. If missing, state the limitation and use existing repository test patterns within the requested scope; do not claim the missing skill ran.
- `/enterprise-error-handling` or `/skill enterprise-error-handling`: resolve the available skill and follow it within the requested scope. Reuse safe-action errors, correlation, transaction and worker recovery controls before introducing new infrastructure.
- `/enterprise-error-handling-complete`: discover the skill first; its previously declared path was absent at audit. Report missing dependencies rather than pretending to invoke them. This trigger does not bypass production-data or deployment boundaries.

Use the actual delegation API exposed by the active harness only when the user or an applicable skill/instruction requests delegation. Do not assume a tool named `Task` exists.

# Code Architecture Analysis

When answering questions about code architecture, dependencies, file relationships, component structure, or system design patterns:

1. **Check for existing knowledge graphs** in `graphify-out/` directory
2. **Read relevant graph files** to enhance architectural insights:
   - `graph_components.json` - UI components architecture
   - `graph_actions.json` - Server actions & business logic
   - `graph_app.json` - Next.js routes & pages
   - `graph_hooks.json` - React hooks & data fetching
   - `graph_types.json` - TypeScript type definitions
3. **Use graph data** to provide accurate dependency analysis, component relationships, and architectural insights
4. **Reference specific nodes/communities** when explaining code relationships
5. **Check freshness and current source** before behavioral claims; dated graphs and counts are not a live coverage guarantee.

**When to use graphs:**
- Code refactoring questions
- Dependency analysis
- Finding related components/functions
- Architecture explanations
- Impact analysis of changes
- Understanding data flow

**Reports available:**
- `GRAPH_REPORT_components.md` - Detailed component analysis
- `GRAPH_REPORT_actions.md` - Business logic breakdown
- `GRAPH_REPORT_app.md` - Route structure analysis
- `GRAPH_REPORT_hooks.md` - Hook dependency patterns
- `GRAPH_REPORT_types.md` - Type relationship mapping

# Andrej Karpathy Skills for Codex

This file contains coding guidelines derived from Andrej Karpathy's observations on LLM coding pitfalls. These principles address the tendency of LLMs to make silent assumptions, write speculative code, and proceed without proper clarification.

## Core Problem Statement

*"The models make wrong assumptions on your behalf and just run along with them without checking. They don't manage their confusion, don't seek clarifications, don't surface inconsistencies, don't present tradeoffs, don't push back when they should."* - Andrej Karpathy

## The Four Principles

### 1. Think Before Coding
**Tagline**: *"Don't assume. Don't hide confusion. Surface tradeoffs."*

**Problem**: LLMs often make silent assumptions when faced with ambiguous requests, proceeding without clarification and potentially building solutions that don't match the user's actual intent.

**Guidelines**:
- When requirements are unclear, ask clarifying questions before coding
- Surface potential tradeoffs and design decisions explicitly
- Don't hide confusion - if something is ambiguous, say so
- Present multiple implementation options when appropriate
- Validate assumptions with the user before proceeding
- If you're unsure about edge cases, discuss them upfront

**Example Scenarios**:
- User asks for "authentication" → Ask: OAuth, JWT, session-based, or simple password?
- User wants "optimization" → Ask: For speed, memory, maintainability, or user experience?
- User requests "error handling" → Ask: Graceful degradation, fail-fast, or retry logic?

### 2. Simplicity First
**Tagline**: *"Minimum code that solves the problem. Nothing speculative."*

**Problem**: LLMs tend to over-engineer solutions, adding features that weren't requested and creating unnecessary complexity.

**Guidelines**:
- Write the minimum code that solves the exact problem stated
- No speculative features or "nice-to-have" additions
- No premature abstractions or over-engineering
- Resist the urge to add defensive programming for unstated edge cases
- Keep dependencies minimal
- Write straightforward, readable code over clever code

**What NOT to do**:
- Add configuration options not requested
- Create abstractions for single-use cases
- Implement features "that might be useful later"
- Add extensive error handling for scenarios not mentioned
- Optimize for performance without evidence of need

### 3. Surgical Changes
**Tagline**: *"Touch only what you must. Clean up only your own mess."*

**Problem**: LLMs often refactor adjacent code, remove existing comments, or "improve" code that wasn't part of the request.

**Guidelines**:
- Edit only the specific code necessary for the requested change
- Don't refactor existing working code unless explicitly asked
- Don't remove or modify existing comments, documentation, or formatting
- Don't "clean up" pre-existing dead code or unused imports
- Preserve the existing code style and patterns
- Only fix code you break during your changes

**Boundaries**:
- If you must touch adjacent code, explain why it's necessary
- If you see obvious bugs in existing code, mention them but don't fix them unless asked
- Respect existing architectural decisions even if they seem suboptimal

### 4. Goal-Driven Execution
**Tagline**: *"Define success criteria. Loop until verified."*

**Problem**: LLMs often follow step-by-step instructions linearly without adapting when intermediate steps fail or when the goal isn't achieved.

**Key Insight**: *"LLMs are exceptionally good at looping until they meet specific goals"*

**Guidelines**:
- Transform requests into verifiable success criteria
- Define clear "done" conditions upfront
- Create verification steps to check if goals are met
- Loop and iterate until success criteria are satisfied
- Adapt approach when initial strategy doesn't work
- Report verification results explicitly

**Process**:
1. **Define Success**: What does "working" look like?
2. **Create Tests**: How will we verify success?
3. **Execute**: Implement the solution
4. **Verify**: Run tests and check criteria
5. **Iterate**: If not successful, analyze and retry

**Example Transformation**:
- Instead of: "Add user authentication to the app"
- Goal-Driven: "Success = Users can register, login, logout, and protected routes block unauthenticated access. Verify by testing each flow manually."

## Implementation Guidelines

### When Starting a Task
1. **Clarify the goal** - What does success look like?
2. **Ask questions** - What are you unsure about?
3. **Define scope** - What exactly should be changed?
4. **Plan verification** - How will you know it works?

### During Implementation
1. **Stay focused** - Only implement what was requested
2. **Minimize changes** - Touch as little existing code as possible
3. **Verify continuously** - Test each change as you make it
4. **Communicate issues** - If something isn't working, explain why

### Before Completing
1. **Verify success criteria** - Does it meet the defined goals?
2. **Test the changes** - Run any tests or manual verification
3. **Report results** - Clearly state what was accomplished
4. **Note any limitations** - What wasn't addressed or might need future work

## Integration with Existing Workflow

These principles work alongside existing development practices:
- They don't replace testing, documentation, or code review
- They guide the interaction pattern between human and AI
- They help prevent common AI coding pitfalls
- They can be combined with project-specific guidelines

## Benefits

- **Reduced back-and-forth** - Fewer misunderstandings and rework
- **Better alignment** - Solutions that match actual requirements
- **Cleaner code** - Less over-engineering and unnecessary complexity
- **Faster iteration** - Clear success criteria enable rapid feedback
- **Maintainable changes** - Surgical edits preserve existing code quality

---

*These guidelines are derived from the community project "andrej-karpathy-skills" by GitHub user forrestchang, based on Andrej Karpathy's public observations about LLM coding behaviors.*
