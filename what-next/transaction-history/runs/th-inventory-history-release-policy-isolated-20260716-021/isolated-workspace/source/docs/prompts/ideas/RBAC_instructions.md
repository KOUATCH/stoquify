Analyze the existing RBAC, authorization, permissions, roles, scopes, approval workflows, and audit controls in this project, then propose a drastic improvement plan to make access control water-tight, robust, professional, modern, secure-by-default, and enterprise-grade.

Goal:
Evaluate what currently exists, identify gaps and risks, then produce a practical upgrade blueprint that can be implemented without guesswork.

Project context:
This platform includes or may include:

- Inventory
- POS
- Purchasing
- Finance and accounting
- Payroll
- Attendance
- HR
- Reporting and dashboards
- Branches / locations
- Warehouses
- Suppliers
- Customers
- Manufacturing / BOM / recipes
- Administration and settings

Analyze the codebase for:

1. Authentication model
2. User model
3. Role model
4. Permission model
5. Authorization checks
6. Middleware / guards
7. Server actions / API route protection
8. Page-level protection
9. Component-level conditional rendering
10. Database schema and relations
11. Branch/location/warehouse scoping
12. Sensitive data access controls
13. Approval workflows
14. Separation-of-duties rules
15. Audit logging
16. Report/export permissions
17. Admin/user-management flows
18. Role-assignment flows
19. Test coverage for authorization
20. Known bypass risks

For each finding, classify:

- Severity: Critical, High, Medium, Low
- Area: Auth, RBAC, ABAC, scopes, workflows, audit, UI, backend, database, tests
- Evidence: exact file paths, functions, routes, schema fields, or missing controls
- Risk: what could go wrong in real business usage
- Recommended fix: concrete implementation direction
- Priority: now, next, later

Evaluate against enterprise access-control standards:

- Deny by default
- Least privilege
- Server-side authorization enforcement
- Resource-scoped permissions
- Branch/location/warehouse scoping
- Explicit sensitive permissions for payroll, salary, bank, refunds, voids, supplier bank details, exports, and user-role management
- Separation of duties
- Maker-checker approval flows
- Dual approval for high-risk actions
- Approval limits
- Audit logs for sensitive actions
- Immutable logs for financial/payroll/POS/inventory events
- Temporary access with expiry
- Delegated access
- MFA or re-authentication for high-risk actions
- No hard deletion of audit-sensitive records
- Permission cache invalidation
- Authorization test coverage

Specifically check whether the project has:

1. Clear permission naming convention
   Examples:

   - inventory.stock_adjustment.create
   - inventory.stock_adjustment.approve
   - pos.refund.approve
   - purchase.purchase_order.approve
   - finance.payment.post
   - payroll.salary.view
   - settings.role.assign
   - audit.event.view

2. Permission granularity
   Separate:

   - View
   - Create
   - Edit
   - Delete
   - Approve
   - Void
   - Post
   - Export
   - Import
   - Override
   - Assign
   - Configure

3. Resource scoping
   Verify support for:

   - Company
   - Branch
   - Warehouse
   - Register / POS terminal
   - Department
   - Cost center
   - Supplier
   - Customer
   - Employee
   - Product category
   - Report category

4. Sensitive controls
   Verify protections for:

   - Payroll visibility
   - Salary visibility
   - Employee personal data
   - Bank account access
   - Financial posting
   - Refunds and voids
   - Discount overrides
   - Stock adjustments
   - Purchase order approval
   - Supplier bank details
   - User and role management
   - Sensitive exports
   - Deleting or archiving records

5. Workflow authorization
   Verify whether the system prevents:

   - A user creating and approving the same purchase order
   - A cashier approving their own refund
   - Payroll preparer approving payroll alone
   - Supplier creator approving supplier bank changes alone
   - Stock adjuster approving large inventory write-offs alone
   - Finance poster deleting audit-sensitive records
   - Super admin silently granting themselves sensitive access

6. UI/UX admin controls
   Review whether admin UI supports:

   - Role templates
   - Permission matrix
   - Module-based permission groups
   - Searchable permissions
   - Branch/location scoping
   - User assignment flow
   - Role preview
   - Permission source explanation
   - Risk badges
   - Conflict warnings
   - Approval limit configuration
   - Audit log visibility
   - Temporary access flow
   - Permission change review screen

7. Backend enforcement
   Review whether authorization is enforced in:

   - API routes
   - Server actions
   - Route handlers
   - Middleware
   - Database queries
   - Background jobs
   - Export jobs
   - Report queries
   - Workflow transitions

8. Audit and compliance
   Verify logs for:
   - Login success/failure
   - Role changes
   - Permission changes
   - Scope changes
   - Sensitive data views
   - Exports
   - Approvals
   - Overrides
   - Financial postings
   - Payroll changes
   - Refunds and voids
   - Stock adjustments
   - Supplier bank changes
   - Failed access attempts

Deliverables:

1. Executive summary

   - Current RBAC maturity score from 0 to 10
   - Biggest risks
   - Highest-leverage improvements

2. Current-state architecture

   - What auth/RBAC model exists now
   - How users, roles, permissions, sessions, scopes, and policies currently work
   - Mermaid diagram if useful

3. Gap analysis

   - Missing controls
   - Weak controls
   - Overly broad roles
   - Client-only checks
   - Missing server-side enforcement
   - Missing scope checks
   - Missing audit logs
   - Missing tests

4. Risk-ranked findings
   For each finding:

   - Severity
   - Evidence
   - Business risk
   - Technical risk
   - Recommended fix

5. Target RBAC architecture
   Propose a modern hybrid model:

   - RBAC for job roles
   - Hierarchical RBAC for management levels
   - Resource-scoped RBAC for branches, warehouses, registers, departments, etc.
   - Policy-based checks for amount limits, status, ownership, time, and risk
   - Workflow-aware authorization for approvals and separation of duties
   - Audit-first logging for sensitive events

6. Proposed role model
   Recommend default roles such as:

   - Owner
   - Super Admin
   - Branch Manager
   - Inventory Manager
   - Stock Clerk
   - Cashier
   - POS Supervisor
   - Purchasing Manager
   - Purchaser
   - Supplier Manager
   - Finance Manager
   - Accountant
   - Accounts Payable Clerk
   - Accounts Receivable Clerk
   - Payroll Manager
   - HR Manager
   - Attendance Manager
   - Production Manager
   - Operator / Baker / Manufacturer
   - Quality Manager
   - Auditor
   - Report Viewer
   - IT Admin

7. Proposed permission taxonomy
   Include:

   - Naming convention
   - Module/resource/action format
   - Risk levels
   - Scope requirements
   - Example permissions for every major module

8. Proposed scope model
   Define how to scope access by:

   - Company
   - Branch
   - Warehouse
   - Register
   - Department
   - Cost center
   - Supplier
   - Customer
   - Employee
   - Product category
   - Report category

9. Proposed approval and separation-of-duties model
   Include workflows for:

   - Purchase requests
   - Purchase orders
   - Stock adjustments
   - Stock transfers
   - Refunds
   - Discount overrides
   - Expenses
   - Vendor payments
   - Payroll runs
   - Salary changes
   - User permission changes
   - Financial period closing

10. Proposed audit model
    Include:

- Events to log
- Database fields
- Retention expectations
- Sensitive view logging
- Export logging
- Tamper-resistance recommendations

11. UI/UX improvement proposal
    Include:

- Admin permissions screen design
- Role templates
- Permission matrix
- Branch/location scope selector
- Role preview
- Risk warnings
- Conflict detection
- Temporary access UX
- Permission change review UX

12. Backend implementation plan
    Include:

- Suggested database schema changes
- Authorization helper/guard design
- Middleware/server-action enforcement strategy
- Policy evaluator design
- Permission cache strategy
- Migration plan from current roles to new roles
- Testing plan

13. Step-by-step upgrade roadmap
    Break into phases:

- Phase 1: close critical bypasses
- Phase 2: introduce permission taxonomy and server-side guards
- Phase 3: add scopes and sensitive controls
- Phase 4: add approval workflows and separation of duties
- Phase 5: add audit logging and admin UX
- Phase 6: harden with tests, monitoring, and documentation

14. Implementation-ready examples
    Provide:

- Example database tables
- Example permission names
- Example `can(user, action, resource)` checks
- Example middleware/guard pseudocode
- Example policy rules
- Example tests for authorization failures

Important:

- Do not only give generic RBAC advice.
- Inspect the actual project structure and code.
- Reference exact files and routes.
- Identify real current weaknesses.
- Distinguish between what exists, what is missing, and what should be built.
- Prioritize small, high-impact changes first.
- Prefer secure-by-default and deny-by-default behavior.
- Assume this will be used by real businesses with sensitive payroll, finance, inventory, POS, and purchasing data.
