# Retained verification attempts

- `73adc9`: first baseline process could not write its receipt under the filesystem sandbox. The inspected owned-local driver was rerun with reviewed execution permission.
- `7df92e`, `supplier-proposal-evidence-before-512c4ca5-499.json`: harness called a PostgreSQL ownership helper with the wrong client type (`client.query is not a function`); it failed before fixture creation. Corrected to the existing owned-target helper.
- `479868`, `supplier-proposal-evidence-before-d424f5ee-eba.json`: baseline observations succeeded. All 15 deliberately inconsistent public/history/retry reads were accepted by the old service. “Passed” here means the observation completed, not that integrity protection passed.
- `c1e30a`, `supplier-proposal-evidence-after-6283ddeb-bf0.json`: 16 corrected integrity groups passed.
- `23100a`, `supplier-proposal-evidence-after-48ec1cd4-87f.json`: 18 final service integrity groups passed, adding evidence-query failure and multi-line historical order. Query-result fault injection never edits immutable database evidence.
- `e30be0`, `supplier-proposal-evidence-tests-01.json`: 35 focused tests passed. `f8110c` / completion `0c2e71`, `supplier-proposal-evidence-tests-02.json`: 71 tests passed before the later UI correction.
- `4f3e64`, `supplier-buyer-browser-c2f4ebd6-da0.json`: English timed out waiting for the supplier result; French completed. No cause was proven. The failed attempt remains. HTTP-status observations were added to the verification driver, without modifying public application logic. `8f8bf9`, `supplier-buyer-browser-df6f22c0-a38.json`: both languages then passed; each public read returned 200 and submission returned 201. This is a successful rerun, not proof of the earlier timeout's root cause.
- `9ead92`, `supplier-history-browser-49b4da30-85c.json`: English six-envelope paging passed; French reverted to five records instead of retaining the older page.
- `978115`, `supplier-history-revalidation-before-03.json`: component reproduction confirmed the route-prop overwrite (17 passed, one failed). The bounded fix preserves the selected page and invalidates it on changed authority/order; an in-flight read cannot be replaced by route props.
- `3c09e6`, `supplier-proposal-evidence-tests-04.json`: final 75 tests in seven suites passed, including the history reproduction and changed-authority/order/failure cases.
- `9a8df1`, `supplier-history-browser-715db56b-393.json`: final EN/FR six-envelope keyboard/history/reflow journeys passed; ten screenshots, eight layout/text cases, retained records unchanged.
- Buyer PostgreSQL regression `3fe29d`, `supplier-buyer-postgres-a1d1f2ec-048.json`: nine groups passed. Its domain service binding is unchanged by the later workbench-only correction.
- Final six-file lint: `c29577`, exit 0. Final typecheck: `6f1228`, exit 0. Earlier four-file lint and pre-UI typecheck also passed. No migration-bearing build was invoked.

Final connected buyer/supplier browser run: `704720`, `supplier-buyer-browser-ee28f50a-4cd.json`, EN/FR passed with 24 screenshots and ten layout cases on the final workbench source. Unique v48 source baseline: `ebcc17`, 2,624 source/config candidates and 921 tests. Earlier evidence files remain historical and are not overwritten.
