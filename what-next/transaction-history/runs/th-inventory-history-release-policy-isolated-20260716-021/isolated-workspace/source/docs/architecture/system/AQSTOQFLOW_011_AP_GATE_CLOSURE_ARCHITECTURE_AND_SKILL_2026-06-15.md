# AqStoqFlow 011 AP Gate Closure Architecture And Skill

Date: 2026-06-15  
Installed skill: `011-aqstoqflow-ap-gate-closer`  
Skill path: `C:\Users\J COMPUTER\.codex\skills\011-aqstoqflow-ap-gate-closer\SKILL.md`

## Need Being Solved

The 011 purchasing/AP suite step has a working backend AP control kernel, but it cannot advance to 012 yet because four enterprise gates remain open:

1. Server actions/RBAC/fresh-auth wrappers.
2. AP workbench UI surfaces and operational states.
3. Balanced SYSCOHADA supplier invoice and supplier payment posting recipes.
4. Outbound supplier payment reconciliation integration.

The goal is to close those gates without breaking the new AP kernel, weakening maker-checker controls, or pretending unresolved accounting and reconciliation work is complete.

## Recommended Path

Use Option 2: vertical gate closure.

This means completing 011 in four narrow, ordered slices:

1. Action/RBAC slice.
2. AP workbench UI slice.
3. Balanced AP ledger posting slice.
4. Outbound reconciliation slice.

This is the best route because every slice closes a real gate, keeps blast radius controlled, and preserves the suite rule that unfinished financial truth must remain visible as a blocker.

## Option 1: Backend-First Hardening

Finish AP ledger recipes and reconciliation integration before UI.

Strengths:

- Strongest accounting correctness early.
- Less risk of UI being built around temporary states.
- Best if accounting mappings are the highest uncertainty.

Weaknesses:

- Stakeholders cannot inspect or validate the workflow quickly.
- RBAC/action and UX gates remain open longer.
- Can stall on country-pack VAT/withholding questions.

Use when the accounting team can immediately define AP chart mappings and posting rules.

## Option 2: Vertical Gate Closure

Close 011 through four ordered slices: actions/RBAC, UI, ledger, reconciliation.

Strengths:

- Lowest regression risk.
- Clear pass/fail gates after each slice.
- Matches the numbered suite discipline.
- Lets explicit ledger blockers remain visible until real balanced posting exists.

Weaknesses:

- Requires strict scope control.
- Intermediate UI must honestly show degraded/blocked accounting states.

Recommended default.

## Option 3: Full 011 Feature Freeze

Freeze other work and complete all AP surfaces in one integrated push.

Strengths:

- One comprehensive acceptance pass.
- Fewer interim partial states.

Weaknesses:

- Highest merge risk.
- Hardest debugging path.
- Slower feedback loop.

Use only with a dedicated sprint focused exclusively on 011.

## Architecture For Option 2

### Slice 1: Server Actions, RBAC, Fresh Auth

Add `actions/purchasing/ap-control.actions.ts`.

Actions:

- `postSupplierInvoiceAction`
- `requestSupplierBankChangeAction`
- `approveSupplierBankChangeAction`
- `releaseSupplierPaymentAction`
- `getAPWorkbenchAction`

Rules:

- Never trust client `organizationId`.
- Derive tenant from session.
- Enforce module gate and permission gate.
- Require fresh auth for bank approval and payment release.
- Preserve maker-checker separation.
- Return typed safe action results.
- Map duplicate, validation, SoD, permission, stale-auth, period, and ledger errors to safe notifications.

### Slice 2: AP Workbench UI

Add a dense operational AP workbench under the purchasing/payables dashboard surface.

Recommended files:

- `components/purchasing/APControlWorkbench.tsx`
- `components/purchasing/SupplierInvoicePostingPanel.tsx`
- `components/purchasing/ThreeWayMatchQueue.tsx`
- `components/purchasing/SupplierBankChangeQueue.tsx`
- `components/purchasing/SupplierPaymentReleaseQueue.tsx`
- `app/[locale]/(dashboard)/dashboard/purchases/payables/page.tsx`

Required UI states:

- loading
- empty
- validation error
- permission denied
- degraded accounting setup
- ledger blocker visible
- reconciliation pending
- stale/as-of
- retry
- bilingual French-first labels
- light/dark theme support

### Slice 3: Balanced SYSCOHADA AP Posting

Replace AP blocker-only behavior only when posting recipes exist and tests pass.

Supplier invoice recipe:

- Debit purchase or inventory clearing.
- Debit input VAT when country pack permits.
- Credit supplier AP liability.

Supplier payment recipe:

- Debit supplier AP liability.
- Credit bank/mobile/cash clearing.
- Route fees/withholding through country-pack rules only.

Gate:

- Every AP posting batch is either balanced and posted or explicitly failed with a close blocker.

### Slice 4: Outbound Payment Reconciliation

Connect `SupplierPayment` to the payment truth model.

Acceptable final payment states:

- reconciled match record exists;
- suspense item exists and blocks close;
- explicit reconciliation blocker exists.

Unacceptable final state:

- supplier payment is marked final without reconciliation evidence or visible blocker.

## Installed Skill Contents

Created and installed:

- `C:\Users\J COMPUTER\.codex\skills\011-aqstoqflow-ap-gate-closer\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\011-aqstoqflow-ap-gate-closer\agents\openai.yaml`
- `C:\Users\J COMPUTER\.codex\skills\011-aqstoqflow-ap-gate-closer\references\011-ap-gate-closure-blueprint.md`

The skill validates with:

```powershell
python "C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py" "C:\Users\J COMPUTER\.codex\skills\011-aqstoqflow-ap-gate-closer"
```

Result:

- `Skill is valid!`

## Completion Gate For 011

011 can advance to 012 only after:

- AP action/RBAC tests pass.
- AP workbench critical state tests pass.
- Supplier invoice/payment posting is balanced or visibly blocked.
- Supplier payment reconciliation produces match, suspense, or blocker evidence.
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npm test -- services/purchasing --runInBand`
- `npm test -- actions/purchasing --runInBand`
- `npm run typecheck`
- `npm run inventory:boundary:fail`

Until then, the next recommended numbered skill remains:

- `011-aqstoqflow-purchasing-ap-controls`, using companion skill `011-aqstoqflow-ap-gate-closer`
