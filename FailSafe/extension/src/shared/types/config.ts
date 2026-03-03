/**
 * Configuration Types
 *
 * FailSafe extension configuration.
 */

import type { SentinelMode } from "./sentinel";

export interface FailSafeConfig {
  genesis: {
    livingGraph: boolean;
    cortexOmnibar: boolean;
    theme: "starry-night" | "light" | "high-contrast";
  };
  sentinel: {
    enabled: boolean;
    mode: SentinelMode;
    localModel: string;
    ollamaEndpoint: string;
  };
  evaluation?: {
    enabled: boolean;
    mode: "production" | "debug" | "audit";
    routing: {
      tier2_risk_threshold: "R1" | "R2";
      tier3_risk_threshold: "R2" | "R3";
      tier2_novelty_threshold: "medium" | "high";
      tier3_novelty_threshold: "low" | "medium" | "high";
      tier2_confidence_threshold: "medium" | "low";
      tier3_confidence_threshold: "low";
    };
    ledger: {
      tier0_enabled: boolean;
      tier1_enabled: boolean;
      tier2_enabled: boolean;
      tier3_enabled: boolean;
    };
  };
  qorelogic: {
    ledgerPath: string;
    strictMode: boolean;
    l3SLA: number;
  };
  feedback: {
    outputDir: string;
  };
  architecture: {
    contributors: number;
    maxComplexity: number;
  };
}
