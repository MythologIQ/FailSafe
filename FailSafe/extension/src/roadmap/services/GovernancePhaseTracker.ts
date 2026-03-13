/**
 * GovernancePhaseTracker — S.H.I.E.L.D. lifecycle phase detection
 *
 * Parses META_LEDGER.md to determine current governance phase,
 * recent completions, and context-aware next steps for the Monitor.
 */

export type ShieldPhase = "IDLE" | "PLAN" | "GATE" | "IMPLEMENT" | "SUBSTANTIATE";

export interface LedgerEntry {
  entry: number;
  phase: ShieldPhase;
  verdict?: string;
  timestamp: string;
  plan?: string;
}

export interface Alert {
  id: string;
  type: "VETO" | "BLOCK" | "WARNING";
  message: string;
  entry?: number;
  details?: string;
}

export interface GovernanceState {
  current: ShieldPhase;
  recentCompletions: LedgerEntry[];
  nextSteps: string[];
  activeAlerts: Alert[];
}

const PHASE_PATTERN = /\*\*Phase\*\*:?\s*(\w+)/i;
const VERDICT_PATTERN = /\*\*Verdict\*\*:?\s*(.+?)(?:\n|$)/i;
const TIMESTAMP_PATTERN = /\*\*(?:Timestamp|Date)\*\*:?\s*(.+?)(?:\n|$)/i;
const PLAN_PATTERN = /\*\*Plan\*\*:?\s*`?([^`\n]+)`?/i;

export function parseMetaLedger(content: string): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  const blocks = content.split(/(?=### Entry #\d+)/);

  for (const block of blocks) {
    const headerMatch = block.match(/### Entry #(\d+):?\s*(.*)(?:\n|$)/);
    if (!headerMatch) continue;

    const entryNum = parseInt(headerMatch[1], 10);
    const phaseMatch = block.match(PHASE_PATTERN);
    const verdictMatch = block.match(VERDICT_PATTERN);
    const timestampMatch = block.match(TIMESTAMP_PATTERN);
    const planMatch = block.match(PLAN_PATTERN);

    if (phaseMatch) {
      const rawPhase = phaseMatch[1].toUpperCase();
      const phase = normalizePhase(rawPhase);

      entries.push({
        entry: entryNum,
        phase,
        verdict: verdictMatch?.[1]?.trim(),
        timestamp: timestampMatch?.[1]?.trim() || "",
        plan: planMatch?.[1]?.trim(),
      });
    }
  }

  // Sort by entry number descending (most recent first)
  return entries.sort((a, b) => b.entry - a.entry);
}

export function normalizePhase(raw: string): ShieldPhase {
  if (raw.includes("PLAN")) return "PLAN";
  if (raw.includes("GATE") || raw.includes("AUDIT")) return "GATE";
  if (raw.includes("IMPLEMENT")) return "IMPLEMENT";
  if (raw.includes("SUBSTANTIATE") || raw.includes("SEAL")) return "SUBSTANTIATE";
  return "IDLE";
}

export function getCurrentPhase(entries: LedgerEntry[]): ShieldPhase {
  if (entries.length === 0) return "IDLE";

  const latest = entries[0];

  // If last entry was a sealed session, we're idle
  if (latest.phase === "SUBSTANTIATE" && (latest.verdict?.includes("SEAL") || latest.verdict?.includes("SUBSTANTIATED"))) {
    return "IDLE";
  }

  // If last entry was a VETO, we're still in GATE phase (need re-audit)
  if (latest.phase === "GATE" && latest.verdict?.includes("VETO")) {
    return "GATE";
  }

  // Otherwise return the latest phase
  return latest.phase;
}

export function getNextSteps(phase: ShieldPhase, lastEntry?: LedgerEntry): string[] {
  const steps: string[] = [];

  switch (phase) {
    case "IDLE":
      steps.push("Run /ql-plan to start a new implementation cycle");
      break;
    case "PLAN":
      steps.push("Run /ql-audit to submit plan for Gate Tribunal review");
      break;
    case "GATE":
      if (lastEntry?.verdict?.includes("VETO")) {
        steps.push("Address VETO findings and re-submit with /ql-audit");
      } else if (lastEntry?.verdict?.includes("PASS")) {
        steps.push("Run /ql-implement to begin implementation");
      } else {
        steps.push("Awaiting Gate Tribunal verdict");
      }
      break;
    case "IMPLEMENT":
      steps.push("Run /ql-substantiate to seal the session");
      steps.push("Verify tests pass before sealing");
      break;
    case "SUBSTANTIATE":
      steps.push("Session complete — run /ql-status to verify");
      break;
  }

  return steps;
}

export function getActiveAlerts(entries: LedgerEntry[]): Alert[] {
  const alerts: Alert[] = [];
  if (entries.length === 0) return alerts;

  const latest = entries[0];

  // Check for VETO verdict
  if (latest.verdict?.includes("VETO")) {
    alerts.push({
      id: `veto-${latest.entry}`,
      type: "VETO",
      message: `Gate Tribunal VETO on Entry #${latest.entry}`,
      entry: latest.entry,
      details: latest.verdict,
    });
  }

  // Check for BLOCK verdict
  if (latest.verdict?.includes("BLOCK")) {
    alerts.push({
      id: `block-${latest.entry}`,
      type: "BLOCK",
      message: `Blocked: ${latest.verdict}`,
      entry: latest.entry,
    });
  }

  // Check for FAIL verdict
  if (latest.verdict?.includes("FAIL")) {
    alerts.push({
      id: `fail-${latest.entry}`,
      type: "WARNING",
      message: `Substantiation failed on Entry #${latest.entry}`,
      entry: latest.entry,
      details: latest.verdict,
    });
  }

  return alerts;
}

export function buildGovernanceState(content: string): GovernanceState {
  const entries = parseMetaLedger(content);
  const current = getCurrentPhase(entries);

  return {
    current,
    recentCompletions: entries.slice(0, 5),
    nextSteps: getNextSteps(current, entries[0]),
    activeAlerts: getActiveAlerts(entries),
  };
}
