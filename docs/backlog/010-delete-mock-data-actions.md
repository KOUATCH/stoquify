---
id: 010
title: Delete listAllItems mock-data action and sweep for similar
area: architecture
priority: P0
effort: S
phase: quick-wins
status: done
---

# Delete listAllItems mock-data action and sweep for similar

## Problem
`actions/item/listAllItems.ts` ships hardcoded "Sample Item 1/2/3" mock data and is exported as a `"use server"` action. The earlier security review confirmed the file's contents. If any UI calls it, paying customers see mock items; worse, if any write action references the mock IDs (`"1"`, `"2"`, `"3"`), it would corrupt real data. There is a real implementation at `actions/itemsShow/getOrgItems.ts` that this should redirect to.

## Acceptance criteria
- [ ] `git grep listAllItems` lists all callers in `app/` and `components/`. Each is updated to use the canonical `getOrgItems` (or whichever real implementation it should call)
- [ ] `actions/item/listAllItems.ts` is deleted
- [ ] A CI check (or a `scripts/check-mock-data.sh`) greps for `"Sample Item"`, `"Mock User"`, `"fakeUser"`, `"TEST_"` in `actions/` and `services/`, failing if any match
- [ ] **Test:** `npm run build` succeeds (proves no caller was left dangling)
- [ ] **Test:** the grep script passes against a fresh checkout

## Implementation notes
- Sweep grep:
  ```
  git grep -nE "Sample Item|mockItems|fakeUser|TEST_" -- actions/ services/
  ```
- Other suspects from project layout: `actions/users/` may have similar quick-test exports. Audit while you're in there.
- The check script:
  ```sh
  # scripts/check-mock-data.sh
  set -e
  if git grep -lE "Sample Item|mockItems\s*[:=]|fakeUser" -- actions/ services/; then
    echo "Mock data found in actions/ or services/" >&2
    exit 1
  fi
  ```
- Wire into `package.json` `security:check` script

## Out of scope
- Tests inside `services/_test/` or `**/__tests__/` legitimately use mock data — those are fine, exclude them from the grep

## Resolution
Implemented 2026-05-23.

- `actions/item/listAllItems.ts` deleted. `git grep listAllItems` returned only the file itself — zero external callers, safe to delete.
- `scripts/check-no-mock-data.sh` added — fails CI on `Sample (Item|User|...)`, `mockItems`, or `fakeUser` patterns in `actions/` or `services/`, excluding test files.
- One UI-level finding NOT addressed here (out of ticket scope): `components/inventory/stock-adjustment-form.tsx:73-74` has hardcoded `<SelectItem value="item1">Sample Item 1</SelectItem>`. That's a UI placeholder, not a server-action mock. Filed informally — fold into a separate UI-cleanup ticket if it's still in shipped code.

Wire `scripts/check-no-mock-data.sh` into CI as part of ticket #019 (CI workflow).
