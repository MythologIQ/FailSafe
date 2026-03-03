/**
 * Shared Type Definitions for FailSafe Extension
 *
 * DECOMPOSED: Types have been moved to domain-grouped modules in ./types/
 * This file re-exports all types for backward compatibility.
 *
 * Domain modules:
 * - types/risk.ts       - Risk grading types
 * - types/trust.ts      - Trust dynamics and agent identity
 * - types/sentinel.ts   - Sentinel monitoring and heuristics
 * - types/ledger.ts     - SOA Ledger and Shadow Genome
 * - types/l3-approval.ts - L3 human approval workflow
 * - types/genesis.ts    - Genesis UI (graph, cortex, concept)
 * - types/events.ts     - Event bus types
 * - types/config.ts     - Extension configuration
 */

// Re-export all types from domain modules
export * from "./types/index";
