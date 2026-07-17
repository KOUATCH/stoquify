---
name: aqstoqflow-module-release-gates
description: Compatibility router for older AqStoqFlow module gate requests. Use when a request invokes this legacy skill; delegate gate design, ratchets, evidence freshness, rollback, and certification to aqstoqflow-module-release-gates-and-rollback.
---

# AqStoqFlow Module Release Gates

## Governing Evidence

Read `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md` first, then reverify its findings against current code and generated evidence.

## Purpose

Preserve legacy invocation while maintaining one authoritative release-gate contract.

## Workflow

1. Load `aqstoqflow-module-release-gates-and-rollback`.
2. Pass through the named stage, module, policy version, cohort, evidence paths, and requested promotion.
3. Run the canonical gate ladder and rollback requirements.
4. Do not create an independent baseline, gate taxonomy, or promotion decision.
5. Record the canonical result in the program status register.

## Stop Conditions

Fail closed when the canonical skill is unavailable, evidence is stale, P0 security is open, rollback is missing, or the request tries to delete legacy findings to obtain a pass.

## Completion Report

Return the canonical gate decision, evidence, exceptions, rollback result, and next action.
