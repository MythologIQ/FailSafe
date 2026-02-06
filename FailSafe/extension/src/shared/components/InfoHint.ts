/**
 * InfoHint Component - Contextual Help Tooltips
 *
 * Provides unobtrusive help hints for UI elements.
 * Uses native browser title attribute for accessibility.
 */

import { tooltipAttrs } from "./Tooltip";

export interface InfoHintOptions {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
}

/**
 * Generates an info hint span with tooltip text.
 */
export function infoHint(options: InfoHintOptions): string {
  const attrs = tooltipAttrs(options.text);
  return `<span class="info-hint" ${attrs}><span class="info-icon">?</span></span>`;
}

/**
 * CSS styles for info hints.
 */
export const INFO_HINT_STYLES = `
    .info-hint {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        margin-left: 6px;
        border-radius: 50%;
        background: var(--vscode-button-secondaryBackground);
        cursor: help;
        font-size: 9px;
        font-weight: bold;
        color: var(--vscode-descriptionForeground);
        vertical-align: middle;
        opacity: 0.7;
        transition: opacity 0.2s;
    }
    .info-hint:hover {
        opacity: 1;
        background: var(--vscode-button-secondaryHoverBackground);
    }
    .info-icon {
        line-height: 1;
    }
`;

/**
 * Help text constants for Dojo metrics.
 */
export const HELP_TEXT = {
  sentinelMode:
    "Heuristic: rule-based only. LLM-assisted: uses local model. Hybrid: combines both.",
  operationalMode:
    "Operational mode controls monitoring intensity: NORMAL, LEAN, SURGE, or SAFE.",
  filesWatched: "Number of files actively monitored for changes by Sentinel.",
  queueDepth: "Pending file audits waiting to be processed.",
  trustStages:
    "CBT: Calculus-Based (0-50%). KBT: Knowledge-Based (50-80%). IBT: Identification-Based (80-100%).",
  l3Queue: "High-risk changes requiring human review before proceeding.",
  avgTrust: "Average trust score across all registered AI agents.",
  verdictDecision:
    "Sentinel decision outcome: PASS, WARN, BLOCK, ESCALATE, or QUARANTINE.",
  riskGrade: "Risk grade classification. L1: low, L2: moderate, L3: critical.",
  noveltyLevels:
    "Novelty tiers based on similarity scoring. Higher means less similar to known patterns.",
  avgConfidence: "Average confidence for novelty evaluation results.",
  cacheHits: "Requests served from cache without recomputation.",
  cacheMisses: "Requests that required fresh computation.",
  cacheSizes: "Active entries stored in fingerprint and novelty caches.",
  influenceWeight: "Trust-derived weighting used to scale agent impact.",
  trustScore:
    "Trust score ranges 0.0 to 1.0 and influences verification weight.",
  checkpointGovernance:
    "Pause governance before using third-party skills. Resume to reconcile drift and restore tracking.",
} as const;
