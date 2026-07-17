---
name: aqstoqflow-module-commercialization-orchestrator
description: Compatibility router for older AqStoqFlow module commercialization requests. Use when a request names this legacy skill; delegate program sequencing to aqstoqflow-module-control-plane-orchestrator and package-specific work to the canonical package, entitlement, provisioning, or Workbench skill.
---

# AqStoqFlow Module Commercialization Orchestrator

## Governing Evidence

Read `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md` first, then reverify its findings against current code and generated evidence.

## Purpose

Preserve legacy invocation compatibility without maintaining a second module roadmap.

## Workflow

1. Read `aqstoqflow-module-control-plane-orchestrator` and the current program status register.
2. Classify the request as package strategy, entitlement, provisioning, package read model, Workbench UX, lifecycle, provider reconciliation, or rollout.
3. Route to the canonical focused skill and preserve its prerequisites, stop conditions, evidence, and verification.
4. Do not perform independent orchestration or enable enforcement.
5. Record the delegated skill and result in `what-next/module-system/execution-status.md`.

## Stop Conditions

Stop when the canonical orchestrator or required focused skill is unavailable, prerequisites are incomplete, or the request attempts provider-driven authorization, UI-owned truth, destructive migration, or uncertified enforcement.

## Completion Report

Name the canonical skill used, stage, evidence, result, blockers, and next gate.
