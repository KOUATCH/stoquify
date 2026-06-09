# Codex Skills and Commands

## Skills Integration

### graphify
- **graphify** (`~/.Codex/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Task tool with `subagent_type: "general-purpose"`, `description: "Run graphify skill"`, and `prompt: "Execute the graphify skill on the current directory following the instructions in ~/.Codex/skills/graphify/SKILL.md"` before doing anything else.

### test-gen
- **test-gen** (`~/.Codex/skills/test-gen/SKILL.md`) - automated test generation for code files. Trigger: `/test-gen`
When the user types `/test-gen`, invoke the Task tool with `subagent_type: "general-purpose"`, `description: "Run test-gen skill"`, and `prompt: "Execute the test-gen skill on the current directory or specified files following the instructions in ~/.Codex/skills/test-gen/SKILL.md. Generate comprehensive unit tests for the selected code."` before doing anything else.

### enterprise-error-handling
- **enterprise-error-handling** (`~/.Codex/skills/enterprise-error-handling/SKILL.md`) - comprehensive error handling system for enterprise applications. Trigger: `/enterprise-error-handling`
When the user types `/enterprise-error-handling` or `/skill enterprise-error-handling`, invoke the Task tool with `subagent_type: "general-purpose"`, `description: "Run enterprise error handling skill"`, and `prompt: "Execute the enterprise error handling skill following the instructions in ~/.Codex/skills/enterprise-error-handling/SKILL.md. Implement enterprise-grade error handling patterns including error classification, resilient database operations, financial transaction safety, monitoring, and comprehensive error management systems."` before doing anything else.

### enterprise-error-handling-complete
- **enterprise-error-handling-complete** (`~/.Codex/skills/enterprise-error-handling-complete/SKILL.md`) - complete end-to-end enterprise error handling implementation with systematic methodology, financial safety, database resilience, real-time monitoring, and production readiness. Trigger: `/enterprise-error-handling-complete`
When the user types `/enterprise-error-handling-complete` or `/skill enterprise-error-handling-complete`, invoke the Task tool with `subagent_type: "general-purpose"`, `description: "Run complete enterprise error handling implementation"`, and `prompt: "Execute the comprehensive enterprise error handling implementation skill following the instructions in ~/.Codex/skills/enterprise-error-handling-complete/SKILL.md. Implement complete enterprise-grade error handling including: 1) Critical financial operation protection with ACID guarantees, 2) Database resilience with circuit breaker patterns, 3) Real-time system monitoring and alerting, 4) Client error boundaries for React components, 5) Systematic migration planning for remaining operations, 6) Production-ready validation and testing frameworks. This is the complete implementation that goes beyond foundation to full production deployment."` before doing anything else.

# Code Architecture Analysis

When answering questions about code architecture, dependencies, file relationships, component structure, or system design patterns:

1. **Check for existing knowledge graphs** in `graphify-out/` directory
2. **Read relevant graph files** to enhance architectural insights:
   - `graph_components.json` - UI components architecture (1,623 nodes, 502 communities)
   - `graph_actions.json` - Server actions & business logic (1,242 nodes, 245 communities)
   - `graph_app.json` - Next.js routes & pages (689 nodes, 209 communities)
   - `graph_hooks.json` - React hooks & data fetching (671 nodes, 137 communities)
   - `graph_types.json` - TypeScript type definitions (69 nodes, 35 communities)
3. **Use graph data** to provide accurate dependency analysis, component relationships, and architectural insights
4. **Reference specific nodes/communities** when explaining code relationships

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