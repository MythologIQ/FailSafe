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
 * Help text constants for FailSafe metrics.
 */
export const HELP_TEXT = {
  sentinelMode:
    "Sentinel audit strategy. Heuristic = local rules only. LLM-assisted = uses the configured local model. Hybrid = combines both passes.",
  operationalMode:
    "Sentinel workload posture. NORMAL balances coverage, LEAN reduces overhead, SURGE increases scrutiny, SAFE prioritizes conservative behavior.",
  filesWatched: "Count of files currently under Sentinel watch in the active workspace.",
  queueDepth: "Number of saved-change events waiting for Sentinel review.",
  eventsProcessed: "Total saved-change events Sentinel has processed during the current session.",
  uptime: "Elapsed time since the Sentinel daemon started in this session.",
  trustStages:
    "Trust stage bands. CBT = 0-50%, KBT = 50-80%, IBT = 80-100%. Higher stages indicate stronger historical reliability.",
  l3Queue: "High-risk items that require explicit human approval before work should proceed.",
  avgTrust: "Average trust score across registered AI agents in the local ledger.",
  quarantined:
    "Agents isolated after trust violations or suspicious behavior until reviewed.",
  verdictDecision:
    "Latest Sentinel outcome. PASS = clear, WARN = caution, BLOCK = stop, ESCALATE = human review, QUARANTINE = isolate agent or session.",
  riskGrade: "Artifact risk grade. L1 = low impact, L2 = elevated review, L3 = critical or human-gated work.",
  noveltyLevels:
    "Novelty tiers from similarity scoring. Higher novelty means the change is less like known patterns and may deserve closer review.",
  avgConfidence: "Average confidence of novelty or evaluation results shown in this panel.",
  cacheHits: "Requests served from cache without recomputing fingerprints or novelty scores.",
  cacheMisses: "Requests that required fresh fingerprint or novelty computation.",
  cacheSizes: "Current entry counts stored in the fingerprint and novelty caches.",
  influenceWeight: "Trust-derived weighting used when FailSafe scales an agent's downstream influence.",
  trustScore:
    "Trust score ranges from 0.0 to 1.0 and affects how much verification weight an agent receives.",
  checkpointGovernance:
    "Checkpoint governance captures a known-good state so you can inspect drift, undo failures, and recover with evidence.",
  planProgress:
    "Percent of plan phases completed. Blocked phases do not count toward completion.",
} as const;
