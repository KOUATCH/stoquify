# Graph Report - prisma  (2026-08-09)

## Corpus Check
- 63 files · ~36,499 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 116 nodes · 259 edges · 10 communities detected
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
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]

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
- `seedComprehensiveCoverageData()` --calls--> `main()`  [INFERRED]
  comprehensive-seed-coverage.ts → comprehensive-seed.ts
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
Cohesion: 0.2
Nodes (25): clearSeededData(), accountingPeriodIdFor(), applyModelOverrides(), buildRow(), clearComprehensiveCoverageData(), countMany(), createMany(), day() (+17 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (20): seedRbacTestDemo(), clearDatabase(), seedCommercialAgents(), seedFinanceDemo(), hashPassword(), seedIntegratedRbacDemo(), now(), runCurrentSeed() (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (4): renderSeedImage(), roleDefinitionFor(), seedImagePath(), uniquePermissions()

### Community 3 - "Community 3"
Cohesion: 0.42
Nodes (9): avatarSvg(), brandSvg(), categorySvg(), ensureSeedImages(), escapeXml(), paletteFor(), productSvg(), receiptSvg() (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.5
Nodes (8): currentOrg(), id(), orgId(), scopedEmail(), scopedPhone(), seedAccountingControlPlane(), seedAuditAndInvites(), seedRegisterWorkflowDemoAccounts()

### Community 5 - "Community 5"
Cohesion: 0.29
Nodes (7): verifyComprehensiveCoverageCounts(), main(), seedOrganizations(), seedOrgDataset(), verifyCounts(), verifySeedImageFiles(), withOrgSeedContext()

### Community 6 - "Community 6"
Cohesion: 0.8
Nodes (5): ensureItem(), ensureLocation(), ensureOrganization(), now(), seedProductionData()

### Community 7 - "Community 7"
Cohesion: 0.4
Nodes (5): hashPassword(), roleEmail(), seedAuthTables(), seedImageUrl(), seedUsers()

### Community 8 - "Community 8"
Cohesion: 0.6
Nodes (5): createOrgContext(), orgCodeFor(), orgIdFor(), orgScopedNumber(), pad()

### Community 9 - "Community 9"
Cohesion: 0.5
Nodes (4): day(), seedBrands(), seedReferenceData(), slugify()

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main()` connect `Community 5` to `Community 0`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `seedComprehensiveCoverageData()` connect `Community 0` to `Community 5`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `clearSeededData()` connect `Community 0` to `Community 2`, `Community 5`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `seedCurrentDemo()` (e.g. with `seedRbacTestDemo()` and `seedCommercialAgents()`) actually correct?**
  _`seedCurrentDemo()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._