# AqStoqFlow Module Control Plane Skill Prompt

Use this prompt to create a reusable Codex skill for designing and implementing AqStoqFlow as a secure, professional, module-based OHADA SMB operating system.

```text
Create and install a Codex skill named `aqstoqflow-module-control-plane`.

Purpose:
Design, implement, and verify a battle-tested, professional, modern, secure, robust, enterprise-grade module-control-plane skill for AqStoqFlow. The skill must help Codex transform AqStoqFlow into a true module-based OHADA-zone SMB operating system where each business tenant only sees and uses the modules it has selected, purchased, subscribed to, or been granted.

Core objective:
AqStoqFlow must function as a modular business operating system. If a tenant has POS and Inventory only, then Accounting, Payroll, Compliance, Payment Reconciliation, Close Assurance, Purchasing/AP, and other disabled modules must be invisible in the UI and technically inaccessible through routes, APIs, server actions, services, reports, dashboards, exports, and background jobs.

The skill must guide Codex to handle both:
1. Strategic product/design analysis.
2. Practical implementation across schema, services, auth, RBAC, frontend, onboarding, seed data, tests, and verification.

Skill requirements:

1. Skill Structure
Create a clean Codex skill with:
- `SKILL.md`
- `agents/openai.yaml`
- optional `references/` files only where needed
- no unnecessary README, changelog, or clutter

The skill must be concise, reusable, and action-oriented. It should guide implementation without becoming bloated.

2. Platform Analysis
The skill must instruct Codex to inspect the existing AqStoqFlow system before coding:
- Prisma schema
- organization/tenant model
- auth/session claims
- RBAC and permissions
- sidebar/navigation config
- route groups
- server actions
- service layer
- dashboards
- register/onboarding flow
- seed scripts
- tests
- existing module or permission constants

3. Module Control Plane Design
The skill must guide creation of a central module control plane with:
- module catalog
- module keys
- module names
- business descriptions
- module categories
- dependencies
- lifecycle status
- route prefixes
- permission prefixes
- setup requirements
- compliance sensitivity
- pricing/bundle metadata
- default bundles for backward compatibility

4. Tenant Module Entitlements
The skill must guide implementation of tenant-specific enabled modules:
- selected modules
- purchased modules
- trial modules
- suspended modules
- disabled modules
- partner-provisioned bundles
- enterprise custom bundles
- module activation/deactivation history
- audit logs for every module change

5. Security and RBAC
The skill must enforce that module visibility is not only a frontend concern.

Every module check must require:
- valid tenant
- enabled module
- valid role/permission
- server-side authorization
- auditability for sensitive access

The skill must prevent disabled module access through:
- direct URL guessing
- server actions
- API routes
- service calls
- dashboards
- reports
- exports
- background jobs

RBAC must operate inside module entitlements. A permission must never grant access to a module the tenant has not enabled.

6. Auth and Session Integration
The skill must guide Codex to integrate enabled modules into the auth/session layer safely:
- expose enabled module keys in session claims
- prevent stale module access
- refresh or invalidate sessions after entitlement changes
- preserve tenant isolation
- preserve MFA and sensitive-action assurance where relevant

7. Frontend and UX Design
The skill must guide redesign of module-aware UI:
- sidebar
- dashboards
- settings
- command menu/search
- onboarding
- reports
- empty states
- upgrade prompts
- module setup progress

Disabled modules should not make the platform feel broken or incomplete. Tenants should see a complete, professional operating system shaped around their enabled modules.

8. Product and Sales Packaging
The skill must guide Codex to propose professional module bundles for OHADA-zone SMBs, such as:
- Retail Core
- Inventory Pro
- Accounting Core
- Payroll and HR
- Purchasing/AP
- Compliance Center
- Payment Reconciliation
- Close Assurance
- Full Business OS
- Accountant/Partner Edition

For each bundle, the skill should explain:
- target customer
- business value
- included modules
- dependencies
- upgrade path
- sales message
- onboarding message

9. Backend and Database Implementation
The skill must guide implementation of:
- Prisma models/enums for modules and entitlements
- module catalog seed data
- tenant module entitlement service
- module guard helpers
- server action wrappers
- API guards
- service-layer enforcement
- audit records
- module-aware seed tenants

10. Register and Onboarding Integration
The skill must guide Codex to connect module selection to:
- registration
- onboarding
- business profile
- setup checklist
- default module bundles
- requested modules
- assisted setup
- sales follow-up metadata

11. Seed and Demo Data
The skill must require comprehensive seed support:
- one tenant with POS + Inventory
- one tenant with Accounting only
- one tenant with Payroll enabled
- one tenant with Compliance enabled
- one full-suite tenant
- one restricted tenant for negative-access testing

The seed must prove that different businesses see different platform surfaces.

12. Verification Requirements
The skill must require focused verification:
- Prisma validation
- typecheck
- module entitlement tests
- RBAC/module intersection tests
- navigation filtering tests
- route denial tests
- server action denial tests
- service-layer denial tests
- seed verification
- smoke checks for tenants with different module bundles

13. Non-Negotiable Rules
The skill must enforce:
- no UI-only module hiding
- no disabled module access by URL/API/action/service
- no cross-tenant leakage
- no weakening of RBAC
- no weakening of audit logs
- no breaking OHADA compliance
- no breaking ledger-first accounting
- no speculative rewrites unrelated to module control
- no hardcoded one-off module checks scattered across components
- backward compatibility for existing tenants through a safe default bundle

14. Expected Skill Output
The created skill should help Codex produce:
- a module-control-plane architecture
- database/schema changes
- services and guards
- auth/session integration
- RBAC integration
- UI/navigation filtering
- onboarding/register integration
- seed updates
- focused tests
- verification report
- product packaging recommendations
- phased implementation roadmap

The final skill must make AqStoqFlow feel like a professional modular operating system, not a full-suite app with hidden menu items.
```
