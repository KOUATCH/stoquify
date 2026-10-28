# Create and Edit Item Workflow Fix

Date: 2026-08-05  
Workspace: `E:\ohada saas\Focused projects\stoquify`  
Domain: Inventory item creation and editing

## Outcome

The item creation workflow now requires a successfully uploaded image and can reach persistence only through an explicit click on the final create button. The inventory edit route is now discoverable by Next.js because its reserved route entry file is tracked as lowercase `page.tsx`.

## Root Cause

### Edit page did not open

The edit route entrypoint was tracked as:

`app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/Page.tsx`

Next.js App Router reserved route files are case-sensitive and require `page.tsx`. On case-sensitive environments, the uppercase filename meant that the edit route did not exist.

### Create flow persisted before the intended boundary

The create workflow had multiple gaps:

1. `imageUrls` was optional in both the client form schema and the canonical server schema.
2. The outer form used a native submit handler and the final action was `type="submit"`, so Enter or a nested button behaving as a submit control could invoke creation.
3. Upload completion was checked only through an in-progress flag; there was no mandatory uploaded-image precondition.
4. There was no immediate synchronous lock protecting the action from rapid repeated clicks.
5. The enhanced uploader's remove-image button did not declare `type="button"`.

## Previous Event Sequence

1. The user entered item data.
2. A native form submit event could occur from Enter or a submit-like nested control.
3. Client validation allowed a missing image.
4. Server validation also allowed a missing image.
5. The create action could persist an incomplete item before the intended explicit final click.

The edit navigation separately targeted a route whose entrypoint was not recognized on case-sensitive builds.

## Corrected Event Sequence

1. The user enters item information.
2. The user starts an image upload.
3. Creation remains blocked while upload is in progress.
4. Upload completion stores the image URL in the form without invoking persistence.
5. The final create control remains disabled until a non-empty uploaded image URL exists.
6. Native form submissions are suppressed.
7. Only the explicit `Create Product` button invokes React Hook Form validation and the create action.
8. A synchronous submission lock prevents concurrent or rapid duplicate calls.
9. The canonical server schema rejects any missing or whitespace-only image URL.
10. On success, navigation follows the existing items-list behavior.
11. The edit link resolves to a production-discovered lowercase `page.tsx` route.

## Files Changed

- `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/Page.tsx` renamed to `page.tsx`
  - Added the existing `inventory.items.update` permission check.
- `components/inventory/ModernCreateItemForm.tsx`
  - Required the image in client validation.
  - Added upload-completion and explicit-click guards.
  - Suppressed native form submission.
  - Changed the final create control to `type="button"`.
  - Added a synchronous duplicate-submission lock.
  - Preserved retry behavior when validation, upload, or persistence fails.
- `components/FormInputs/EnhancedImageUploadButton.tsx`
  - Declared the remove-image control as `type="button"`.
- `lib/item/schemas.ts`
  - Required a non-empty image URL at the canonical server creation boundary.
- `lib/item/__tests__/create-item-schema.test.ts`
  - Added missing-image rejection coverage.
- `components/inventory/__tests__/ModernCreateItemForm.test.tsx`
  - Added native-submit, upload-only, upload-in-progress, explicit-click, image payload, and duplicate-click coverage.
- `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/__tests__/page.test.tsx`
  - Added route rendering, permission, tenant-scoped lookup, reference-data, and not-found coverage.

Existing unrelated worktree changes were preserved.

## Verification Results

- Focused create-item schema, form, and item-service Jest suites: **passed**
  - 3 suites, 12 tests.
- Edit-item route Jest suite: **passed**
  - 1 suite, 2 tests.
- Total focused regression coverage: **14 tests passed**.
- Focused ESLint for all changed implementation and test files: **passed** with no findings.
- `npm run typecheck`: **passed** in 159.2 seconds.
- `git diff --check`: **passed**; only existing line-ending warnings were reported.
- `npm run build:app`: **caller timed out** after 304 seconds without diagnostics.
  - The spawned Next build continued to completion after the wrapper timeout.
  - A new `.next/BUILD_ID` was produced.
  - All build processes created by the run exited.
  - `.next/app-path-routes-manifest.json` contains:
    `/[locale]/dashboard/inventory/items/[id]/edit`
  - Route discovery is therefore confirmed, while the wrapper command itself is conservatively recorded as timed out because its final exit status was not captured.

## Risk Controls

- Tenant isolation remains enforced by the organization-scoped edit DTO lookup and server-owned organization context.
- The edit route now requires `inventory.items.update`.
- Server validation prevents client-side bypass of the required image.
- Upload events only stage the image reference and do not call item persistence.
- The duplicate lock prevents concurrent explicit submissions.
- Failed validation or persistence releases the lock and preserves form state for retry.
- No schema migration or destructive data operation was performed.

## Success Criteria Status

- Item creation before image completion: **prevented**.
- Image selection or upload completion creating an item: **prevented and tested**.
- Native form submission or Enter reaching persistence: **prevented and tested through the native submit boundary**.
- Creation without a server-validated image: **prevented and tested**.
- Rapid repeated create clicks producing duplicates: **prevented and tested**.
- Edit route discoverable by Next.js: **confirmed by lowercase tracked entrypoint, route test, and production route manifest**.
- Authenticated browser smoke: **not run** because no authenticated test session was supplied in this execution.
