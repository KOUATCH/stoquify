# Harness discovery timeout

Jest timed out after180seconds before reporting suites. Initial custom config omitted explicit roots, allowing repository-wide discovery through generated trees. No test outcome is inferred. Restrict roots to the two intended test folders, matching existing scoped configs; rerun same three suites. This changes discovery scope, not test assertions/application code.
