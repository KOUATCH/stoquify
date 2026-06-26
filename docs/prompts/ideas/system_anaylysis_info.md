Analyze this project’s existing component, data-flow, and feature architecture, then design and execute a step-by-step improvement plan for building complete, professional, modern, and maintainable components in a Next.js App Router system using Prisma, server actions, services, TanStack Query hooks, and UI components.

Goal:
Study the actual project structure, identify the established workflow for creating features/components, detect incomplete or inconsistent parts, then correct them step by step with clear reports of what was changed, why it was changed, and how it fits the project architecture.

Project context:
This is a Next.js App Router application that may use:

- Next.js App Router
- React Server Components
- Server Actions
- Prisma
- TanStack Query
- TypeScript
- Zod or similar validation
- Services / repositories
- API routes or route handlers where needed
- Custom hooks
- UI components
- Forms
- Tables
- Dashboards
- Auth and permissions
- Inventory, POS, purchasing, finance, payroll, attendance, HR, reports, branches, suppliers, customers, manufacturing, BOM/recipes, settings, and admin modules

Analyze the project for:

1. App Router structure
2. Page, layout, loading, error, not-found, and route group patterns
3. Server Component vs Client Component boundaries
4. Server actions structure
5. Service layer structure
6. Prisma usage patterns
7. Query/mutation hook patterns with TanStack Query
8. Validation patterns
9. Form handling patterns
10. Table/list/data-grid patterns
11. Modal/drawer/detail-view patterns
12. Error handling patterns
13. Loading and optimistic update patterns
14. Cache invalidation patterns
15. Authorization checks and scope checks
16. Audit logging or side-effect patterns
17. Toast/notification patterns
18. Component organization and naming conventions
19. Shared UI/design-system usage
20. Test coverage and story/demo coverage where applicable

For each finding, classify:

- Severity: Critical, High, Medium, Low
- Area: App Router, Server Actions, Services, Prisma, TanStack Query, Hooks, UI, Forms, Tables, Validation, Auth, Error Handling, Testing, Architecture
- Evidence: exact file paths, functions, components, hooks, server actions, services, or missing files
- Risk: what breaks or becomes hard to maintain
- Recommended fix: concrete implementation direction
- Priority: Now, Next, Later

Establish the project’s intended feature/component workflow:

- Route/page
- Server component data bootstrap where appropriate
- Server action or route handler
- Validation schema
- Service function
- Prisma query/mutation
- TanStack Query query hook
- TanStack Query mutation hook
- UI container component
- Presentational components
- Form/table/detail components
- Loading, empty, error, and success states
- Cache invalidation/revalidation
- Authorization/scope checks
- Audit/side effects
- Tests

Specifically determine whether the current project follows a pattern like:

```text
app route/page
→ server component or client entry
→ server action
→ validation schema
→ service layer
→ Prisma
→ TanStack Query query/mutation hooks
→ feature container
→ UI components
→ shared design-system components
If the project uses a different pattern, document the actual pattern and recommend whether to keep, refine, or replace it.

Evaluate against modern Next.js App Router best practices:

Use Server Components for initial rendering where useful
Use Client Components only where interactivity is needed
Keep Prisma/database access server-only
Keep business logic out of UI components
Keep server actions thin and delegate to services
Validate input at the server boundary
Enforce auth and authorization on the server
Use typed responses/errors for actions and services
Use TanStack Query for client-side async state, mutations, invalidation, optimistic updates, and refetching
Avoid duplicating fetch/mutation logic across components
Use consistent query keys
Use consistent mutation success/error handling
Provide loading, error, empty, and permission-denied states
Avoid over-fetching and under-fetching
Avoid leaking server-only code into client bundles
Prefer small composable feature components
Keep design-system primitives separate from domain components
Add tests for services, actions, hooks, and critical UI flows where practical
Check for incomplete or inconsistent components:

Pages without loading/error/empty states
Client components doing server/database work
UI components calling Prisma or services directly
Server actions with too much business logic
Missing validation schemas
Missing auth/permission checks
Missing service layer functions
Missing TanStack Query hooks
Inconsistent query keys
Mutations without invalidation
Mutations without user feedback
Forms without validation or server error handling
Tables without pagination/filter/sort conventions
Components with duplicated fetch/mutation logic
Components with incomplete props/types
Components with unused or dead code
Broken imports or mismatched naming
Missing tests for critical paths
Missing audit/log side effects for sensitive operations
Missing documentation for the feature workflow
Deliverables:

Executive summary
Current architecture maturity score from 0 to 10
Biggest structural risks
Highest-leverage improvements
Current-state architecture
How App Router routes are organized
How server actions are organized
How services are organized
How Prisma is accessed
How TanStack Query hooks are organized
How UI components are organized
Mermaid diagram if useful
Project workflow map
The actual end-to-end workflow for creating a feature/component
Where validation, authorization, services, Prisma, hooks, and UI fit
Naming conventions and folder conventions currently used
Gap analysis
Missing layers
Inconsistent layers
Over-coupled components
Client/server boundary problems
Missing hooks
Missing invalidation
Missing loading/error states
Missing tests
Risk-ranked findings For each finding:
Severity
Evidence
Risk
Recommended fix
Priority
Target architecture proposal Design the preferred workflow for this project, including:
App route/page structure
Server action structure
Service layer structure
Prisma access rules
Validation schema placement
Query key strategy
TanStack Query hook structure
Mutation/invalidation strategy
UI component layering
Error/loading/empty state strategy
Auth/permission enforcement strategy
Testing strategy
Component execution blueprint For every feature/component being corrected or created, define:
Route/page location
Server action file
Service file
Validation schema
Prisma model/query
Query hooks
Mutation hooks
Container component
Presentational components
Form/table/detail components
Loading/empty/error states
Cache invalidation rules
Authorization checks
Tests or verification steps
Step-by-step implementation roadmap Break into phases:
Phase 1: map and document current project patterns
Phase 2: fix critical client/server boundary issues
Phase 3: normalize service and server action patterns
Phase 4: add or fix validation and authorization checks
Phase 5: add or normalize TanStack Query hooks and query keys
Phase 6: complete UI states: loading, empty, error, success, permission denied
Phase 7: fix incomplete components and duplicated logic
Phase 8: add tests and documentation
Execution instructions After the analysis:
Implement fixes phase by phase
Keep changes minimal and consistent with the existing codebase
Do not rewrite working architecture without strong evidence
Preserve existing design system and UI language
Avoid introducing unnecessary abstractions
Report after each phase:
What was changed
Files modified
Why it was changed
How it follows the project workflow
Verification performed
Remaining gaps
Implementation-ready examples Provide examples adapted to the project:
Example server action
Example service function
Example Prisma query
Example validation schema
Example TanStack Query query key
Example useQuery hook
Example useMutation hook with invalidation
Example container component
Example presentational component
Example form with server error handling
Example loading/empty/error state
Example test cases
Important:

Do not give generic Next.js advice only.
Inspect the actual project structure and code.
Reference exact files, folders, routes, functions, hooks, components, and services.
Distinguish between what exists, what is missing, and what should be built.
Follow the project’s current conventions unless they are clearly harmful.
Prefer small, high-impact corrections first.
Keep Prisma and sensitive business logic server-only.
Enforce auth and authorization server-side.
Use TanStack Query consistently for client-side async state.
Ensure the final component workflow is repeatable for future modules.
```
