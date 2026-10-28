# Graph Report - lib  (2026-08-09)

## Corpus Check
- 68 files · ~34,730 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 431 nodes · 623 edges · 21 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 27|Community 27]]

## God Nodes (most connected - your core abstractions)
1. `SystemMonitor` - 40 edges
2. `ResilientDatabase` - 29 edges
3. `CircuitBreaker` - 23 edges
4. `ErrorHandler` - 23 edges
5. `normalizeToCanonicalError()` - 17 edges
6. `FinancialSafety` - 16 edges
7. `hasRbacPermission()` - 10 edges
8. `sanitizeErrorMetadata()` - 9 edges
9. `createCanonicalError()` - 8 edges
10. `loadOfflineLocalQueue()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `checkPermission()` --calls--> `requirePermission()`  [INFERRED]
  auth-server.ts → security\rbac.ts
- `isAuthenticated()` --calls--> `getOptionalRbacContext()`  [INFERRED]
  auth-server.ts → security\rbac.ts
- `can()` --calls--> `hasRbacPermission()`  [INFERRED]
  permissions.ts → security\rbac-permissions.ts
- `createCanonicalError()` --calls--> `sanitizeErrorMetadata()`  [INFERRED]
  error-handling\canonical.ts → error-handling\error-handler.ts
- `logSecurityEvent()` --calls--> `auditRbacDecision()`  [INFERRED]
  security\audit-log.ts → security\rbac.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (38): checkPermission(), getAuthenticatedUser(), isAuthenticated(), redirectTo(), can(), canManageRole(), canManageUser(), getRoleHierarchy() (+30 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (5): createAlert(), getNodeMemoryUsage(), getNodePackageVersion(), startSystemMonitoring(), SystemMonitor

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (27): canonicalCodeFromString(), canonicalErrorToServerActionError(), categoryForCode(), createCanonicalError(), createCorrelationId(), fieldErrorsFromZod(), isApplicationErrorLike(), isFreshAuthRequiredError() (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (4): CircuitBreaker, CircuitBreakerManager, createCircuitBreaker(), executeWithCircuitBreaker()

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (3): dbOperation(), dbTransaction(), ResilientDatabase

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (6): createErrorId(), ErrorHandler, getPublicMessage(), isPlainRecord(), redactString(), sanitizeErrorMetadata()

### Community 6 - "Community 6"
Cohesion: 0.23
Nodes (18): assertProvisionalOnly(), buildOfflineLocalEventEntryHash(), buildOfflineSyncBatchEnvelope(), containsFinalFiscalClaim(), enqueueOfflineLocalEvent(), isState(), loadOfflineLocalQueue(), markOfflineLocalQueueEntries() (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (2): executeFinancialOperation(), FinancialSafety

### Community 8 - "Community 8"
Cohesion: 0.44
Nodes (9): createId(), dispatch(), isOptions(), normalizeAction(), normalizeFromArgs(), normalizeInput(), normalizeType(), show() (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.27
Nodes (7): logSecurityEvent(), buildClaims(), FreshAuthRequiredError, readSessionParts(), requireFreshAuth(), requireSession(), revokeAllSessionsForUser()

### Community 10 - "Community 10"
Cohesion: 0.44
Nodes (8): categorizeError(), getErrorCode(), getRuntimeErrorName(), getUserMessage(), hashString(), isKnownPrismaErrorName(), isPrismaKnownRequestError(), shouldRetry()

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (1): ErrorBoundary

### Community 13 - "Community 13"
Cohesion: 0.36
Nodes (4): buildCrudMutationNotification(), getFriendlyErrorMessage(), safeString(), titleCase()

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (2): createErrorNotification(), getCategoryString()

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (1): MockRbacError

### Community 18 - "Community 18"
Cohesion: 0.6
Nodes (3): useAuth(), usePermissions(), useSession()

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (2): createNotificationCallback(), setupErrorNotificationIntegration()

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (2): getRequestAuditContext(), readHeader()

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (2): sink(), write()

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (1): OrganizationCurrencyUnavailableError

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (2): getPublicIdentityRequestContext(), normalizePublicClientIp()

## Knowledge Gaps
- **Thin community `Community 7`** (18 nodes): `executeFinancialOperation()`, `FinancialSafety`, `.checkIdempotency()`, `.constructor()`, `.createJournalEntries()`, `.executeCompensatingActions()`, `.executeFinancialSaga()`, `.executeFinancialSagaStep()`, `.executeFinancialTransaction()`, `.getAuditTrail()`, `.getInstance()`, `.handleFinancialError()`, `.reconcileFinancialBalances()`, `.recordAuditEntry()`, `.roundToCurrencyPrecision()`, `.validateCurrencyAmount()`, `.validateFinancialTransaction()`, `financial-safety.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (9 nodes): `ErrorBoundary`, `.componentDidCatch()`, `.constructor()`, `.getDerivedStateFromError()`, `.logErrorToSystem()`, `.render()`, `ErrorFallbackComponent()`, `client-error-boundary.tsx`, `WithErrorBoundaryComponent()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (7 nodes): `createErrorNotification()`, `getCategoryString()`, `hooks.ts`, `useErrorMonitoring()`, `useErrorRecovery()`, `useFormErrorHandler()`, `useServerActionHandler()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (6 nodes): `auth-session.test.ts`, `assuranceEvidence()`, `MockRbacError`, `.constructor()`, `rawSession()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (5 nodes): `createNotificationCallback()`, `mapCategoryToNotification()`, `mapSeverityToNotification()`, `setupErrorNotificationIntegration()`, `notification-integration.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (4 nodes): `auth.ts`, `getRequestAuditContext()`, `getRequestOrigin()`, `readHeader()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (4 nodes): `setLoggerSink()`, `sink()`, `write()`, `logger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (4 nodes): `createOrganizationMoneyFormatter()`, `OrganizationCurrencyUnavailableError`, `.constructor()`, `organization-money.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (3 nodes): `getPublicIdentityRequestContext()`, `normalizePublicClientIp()`, `public-request-context.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sanitizeErrorMetadata()` connect `Community 5` to `Community 2`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `createCanonicalError()` connect `Community 2` to `Community 5`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `normalizeToCanonicalError()` (e.g. with `safeRouteErrorBody()` and `jsonErrorResponse()`) actually correct?**
  _`normalizeToCanonicalError()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._