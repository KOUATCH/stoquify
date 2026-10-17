# Required fields and available identifiers

`field-register.json` contains the exact current record IDs and safe values, type, database column, enums, FK constraints and presence status for every selected field. `capability-contracts.json` identifies operational requirements; `assurance/required-input-contracts.json` identifies approval/document requirements. An empty optional model is a conditional workflow gap, not automatically a blocker for development. Secrets, credential material, salary/bank information and tax identifier values were excluded.

| Model / table | Fields extracted | Rows | Query |
| --- | --- | --- | --- |
| Organization / organizations | id, name, tradeName, slug, country, countryCode, currency, timezone, defaultLocale, requestedModules, isActive, deletedAt, onboardingCompletedAt | 3 | model_Organization |
| User / users | id, name, email, firstName, lastName, jobTitle, organizationId, isActive, isVerified, emailVerified, isLocked, lockedUntil, mfaEnabledAt, preferredLocale | 180 | model_User |
| Role / roles | id, code, nameEn, nameFr, description, permissions, organizationId | 174 | model_Role |
| Location / locations | id, name, code, type, organizationId, managerId, isActive, isDefault, deletedAt, requiresApproval, allowNegativeStock | 27 | model_Location |
| PayrollEmployee / payroll_employees | id, organizationId, userId, employeeNumber, displayName, status, countryCode, locationId, department, jobTitle, deletedAt | 144 | model_PayrollEmployee |
| HrisOrgUnit / hris_org_units | id, organizationId, code, name, type, status, parentId, effectiveFrom, effectiveTo | 14 | model_HrisOrgUnit |
| HrisPosition / hris_positions | id, organizationId, orgUnitId, locationId, code, title, status, effectiveFrom, effectiveTo | 94 | model_HrisPosition |
| HrisEmploymentAssignment / hris_employment_assignments | id, organizationId, employeeId, positionId, orgUnitId, type, status, effectiveFrom, effectiveTo | 94 | model_HrisEmploymentAssignment |
| HrisManagerDelegation / hris_manager_delegations | id, organizationId, delegatorEmployeeId, delegateEmployeeId, scopeOrgUnitId, authority, status, effectiveFrom, effectiveTo, approvalEvidenceHash, approvedById, revokedAt | 0 | model_HrisManagerDelegation |
| OrganizationAccountingSettings / organization_accounting_settings | id, organizationId, accountingEnabled, setupStatus, countryPack, baseCurrency, fiscalYearStartMonth, fiscalYearStartDay, inventoryValuationPolicy, roundingMode, roundingScale, taxRegime, payrollCnpsFamilyAllowanceSector, payrollCnpsOccupationalRiskGroup, setupCompletedAt, setupCompletedById | 2 | model_OrganizationAccountingSettings |
| FiscalYear / fiscal_years | id, organizationId, name, startDate, endDate, status, closedAt, closedById | 2 | model_FiscalYear |
| AccountingPeriod / accounting_periods | id, organizationId, fiscalYearId, periodNumber, name, startDate, endDate, status, lockedAt, closedAt, closedById | 24 | model_AccountingPeriod |
| AccountantAccessGrant / accountant_access_grants | id, organizationId, accountantUserId, accountantFirmName, role, status, consentGrantedById, consentGrantedAt, consentEvidenceHash, effectiveFrom, expiresAt, revokedById, revokedAt, activeScopeKey | 0 | model_AccountantAccessGrant |
| AccountantReview / accountant_reviews | id, organizationId, periodId, closeRunId, status, reviewerId, openedById, reviewedAt | 24 | model_AccountantReview |
| CloseRun / close_runs | id, organizationId, periodId, status, readinessScore, criticalBlockerCount, highBlockerCount, asOf, runById, completedAt | 24 | model_CloseRun |
| HrisWorkCalendar / hris_work_calendars | id, organizationId, code, name, countryCode, timezone, version, status, effectiveFrom, effectiveTo, sourceHash, reviewedById, reviewedAt | 4 | model_HrisWorkCalendar |
| HrisLeavePolicy / hris_leave_policies | id, organizationId, code, name, countryCode, version, annualEntitlementMinutes, carryOverLimitMinutes, effectiveFrom, effectiveTo, status, preparedById, approvedById, approvedAt, sourceHash, approvalEvidenceHash | 2 | model_HrisLeavePolicy |
| PayrollContract / payroll_contracts | id, organizationId, employeeId, contractNumber, type, status, effectiveFrom, effectiveTo, currency, signedDocumentHash, activatedBusinessEventId, deletedAt | 118 | model_PayrollContract |
| ProviderAccount / provider_accounts | id, organizationId, paymentRailId, providerCode, displayName, status, countryCode, currencyCode, settlementLagDays, archivedAt, settlementLedgerAccountId, suspenseLedgerAccountId, feeLedgerAccountId | 24 | model_ProviderAccount |
| ComplianceAdapterConfig / compliance_adapter_configs | id, organizationId, countryCode, authorityChannel, adapterKey, environment, status, countryPackVersion, countryPackResolutionHash, capabilityStatus, credentialReference, credentialExpiresAt, credentialRotatedAt, credentialRotatedById, officialSpecTitle, officialSpecVersion, officialSpecPublishedAt, officialSpecEffectiveFrom, officialSpecReference, officialSpecHash, reviewStatus, reviewedById, reviewedAt, reviewerQualification, reviewerConflictDeclared, reviewEvidenceHash, configHash, createdById, updatedById, approvedById, approvedAt, disabledAt | 24 | model_ComplianceAdapterConfig |
| TenantModuleConfiguration / tenant_module_configurations | organizationId, revision, activeRevision, selectedModules, activeModules, newWorkStoppedModules, legacyUnknownValues, manifestHash | 2 | model_TenantModuleConfiguration |
| TenantModuleGrant / tenant_module_grants | id, organizationId, moduleSlug, status, source, startsAt, endsAt, readOnly, trial, revision | 22 | model_TenantModuleGrant |
| TenantModuleConfigurationCommand / tenant_module_configuration_commands | id, organizationId, idempotencyKey, expectedRevision, resultRevision, state, selectedModules, previousModules, previewHash, errorCode, actorId | 2 | model_TenantModuleConfigurationCommand |
| TenantModuleLifecycleOperation / tenant_module_lifecycle_operations | id, organizationId, commandId, desiredRevision, baseActiveRevision, desiredModules, stopNewWorkModules, authorityHash, state, version, errorCode, actorId, completedAt | 0 | model_TenantModuleLifecycleOperation |
| TenantModuleLifecycleStep / tenant_module_lifecycle_steps | id, organizationId, operationId, moduleSlug, stepKey, state, code, href, evidenceHash, checkedAt | 0 | model_TenantModuleLifecycleStep |
| AgentDefinition / agent_definitions | id, key, name, ownerModuleSlug, status, rolloutMode, riskLevel, allowedToolKeys, allowedSkillKeys | 0 | model_AgentDefinition |
| AgentActivationPackage / agent_activation_packages | id, organizationId, agentKey, releaseVersion, environment, commitSha, manifestHash, allowedRoleCodes, activationStartsAt, activationEndsAt, state, version, requestedById, activatedById, activatedAt, suspendedAt, retiredAt, retiredById, lastReconciledAt, reconciliationState, alertTransportReady | 0 | model_AgentActivationPackage |
| AgentActivationOwner / agent_activation_owners | id, packageId, responsibility, primaryUserId, backupUserId, escalationRouteRef, runbookVersion, acceptedAt, validUntil, coverageStartsAt, coverageEndsAt | 0 | model_AgentActivationOwner |
| AgentActivationApproval / agent_activation_approvals | id, packageId, approvalType, decision, approverId, evidenceHash, decidedAt, expiresAt, revokedAt | 0 | model_AgentActivationApproval |
| AgentPilotCertification / agent_pilot_certifications | id, packageId, commitSha, manifestHash, suiteVersion, ciRunId, result, reportHash, passedAt, expiresAt | 0 | model_AgentPilotCertification |
| BranchDailyCloseSignOff / branch_daily_close_sign_offs | id, organizationId, branchDailyCloseRunId, status, signedReadinessSourceHash, signedEvidenceHash, signedEvidenceObservedAt, signedById, signedAt, authAssuranceLevel, freshAuthAt, invalidatedById, invalidatedAt | 0 | model_BranchDailyCloseSignOff |
| StockAdjustment / stock_adjustments | organizationId, locationId, createdById, approvedById, evidenceHash, id, status, reversalOfAdjustmentId | 119 | model_StockAdjustment |
| StockAdjustmentLine / stock_adjustment_lines | itemId, actualQuantity, id, adjustmentId | 119 | model_StockAdjustmentLine |
| SupplierPayment / supplier_payments | id, organizationId, supplierId, bankAccountId, requestedById, approvedById, documentHash, evidenceHash, status | 24 | model_SupplierPayment |
| JournalEntry / journal_entries | id, journalId, periodId, createdById, organizationId, status, postingBatchId, reversalOfEntryId | 141 | model_JournalEntry |
| JournalEntryLine / journal_entry_lines | accountId, debit, credit, id, organizationId, journalEntryId | 368 | model_JournalEntryLine |
| ClosePackExport / close_pack_exports | closeRunId, contentHash, isCertified, id, organizationId, periodId | 24 | model_ClosePackExport |
| PayrollRun / payroll_runs | id, payrollPeriodId, version, preparedById, reviewedById, approvedById, organizationId, status, originalRunId, reviewedBusinessEventId, approvedBusinessEventId, emittedBusinessEventId, postedBusinessEventId | 24 | model_PayrollRun |
| PayrollPaymentBatch / payroll_payment_batches | id, payrollRunId, requestedById, approvedById, releasedById, evidenceHash, bankFileHash, organizationId, status | 24 | model_PayrollPaymentBatch |
| PayrollPayslip / payroll_payslips | employeeId, id, organizationId, status, payrollRunId, runLineId, emittedBusinessEventId | 24 | model_PayrollPayslip |
| POSStation / pos_terminals | id, currentSessionId, locationId, organizationId | 25 | model_POSStation |
| POSSession / pos_sessions | userId, organizationId, status, id, terminalId, locationId | 31 | model_POSSession |
| POSCheckoutWorkspace / pos_checkout_workspaces | leaseId, sessionId, organizationId | 5 | model_POSCheckoutWorkspace |
| BranchDailyCloseRun / branch_daily_close_runs | locationId, startedById, evidenceHash, id, organizationId, status | 0 | model_BranchDailyCloseRun |
| Item / items | id, nameEn, nameFr, isActive, organizationId, unitId, taxRateId | 41 | model_Item |
| Unit / units | id, symbol, type, nameEn, nameFr, baseUnit, conversionRate, isActive, organizationId | 22 | model_Unit |
| TaxRate / tax_rates | id, rate, type, nameEn, nameFr, isActive, organizationId | 4 | model_TaxRate |
