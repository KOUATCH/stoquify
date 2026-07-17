# Graph Report - prisma  (2026-07-14)

## Corpus Check
- 24 files · ~18,062 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 115 nodes · 258 edges · 8 communities detected
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]

## God Nodes (most connected - your core abstractions)
1. `seedCurrentDemo()` - 17 edges
2. `pad()` - 16 edges
3. `seedRegisterWorkflowDemoAccounts()` - 10 edges
4. `applyModelOverrides()` - 9 edges
5. `currentOrg()` - 9 edges
6. `seedUsers()` - 9 edges
7. `seedBrands()` - 9 edges
8. `now()` - 9 edges
9. `pad()` - 8 edges
10. `id()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `seedComprehensiveCoverageData()`  [INFERRED]
  comprehensive-seed.ts → comprehensive-seed-coverage.ts
- `seedRbacTestDemo()` --calls--> `seedCurrentDemo()`  [INFERRED]
  rbac-test-seed.ts → seed.ts
- `seedCommercialAgents()` --calls--> `seedCurrentDemo()`  [INFERRED]
  seed-commercial-agents.ts → seed.ts
- `seedFinanceDemo()` --calls--> `seedCurrentDemo()`  [INFERRED]
  seed-finance.ts → seed.ts
- `seedIntegratedRbacDemo()` --calls--> `seedCurrentDemo()`  [INFERRED]
  seed-integrated-rbac.ts → seed.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (20): seedRbacTestDemo(), clearDatabase(), seedCommercialAgents(), seedFinanceDemo(), hashPassword(), seedIntegratedRbacDemo(), now(), runCurrentSeed() (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.22
Nodes (23): accountingPeriodIdFor(), applyModelOverrides(), buildRow(), countMany(), createMany(), day(), delegateName(), deleteMany() (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (4): hashPassword(), roleDefinitionFor(), seedAuthTables(), uniquePermissions()

### Community 3 - "Community 3"
Cohesion: 0.3
Nodes (15): currentOrg(), day(), id(), orgId(), roleEmail(), scopedEmail(), scopedPhone(), seedAccountingControlPlane() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.42
Nodes (9): avatarSvg(), brandSvg(), categorySvg(), ensureSeedImages(), escapeXml(), paletteFor(), productSvg(), receiptSvg() (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (9): clearSeededData(), clearComprehensiveCoverageData(), verifyComprehensiveCoverageCounts(), main(), seedOrganizations(), seedOrgDataset(), verifyCounts(), verifySeedImageFiles() (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.38
Nodes (7): createOrgContext(), orgCodeFor(), orgIdFor(), orgScopedNumber(), pad(), renderSeedImage(), seedImagePath()

### Community 7 - "Community 7"
Cohesion: 0.8
Nodes (5): ensureItem(), ensureLocation(), ensureOrganization(), now(), seedProductionData()

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main()` connect `Community 5` to `Community 1`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `seedComprehensiveCoverageData()` connect `Community 1` to `Community 5`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `clearSeededData()` connect `Community 5` to `Community 2`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `seedCurrentDemo()` (e.g. with `seedRbacTestDemo()` and `seedCommercialAgents()`) actually correct?**
  _`seedCurrentDemo()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._