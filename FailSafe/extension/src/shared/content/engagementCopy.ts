/**
 * Shared engagement copy for panel consistency.
 * Keep directive language concise and action-oriented.
 */
export const ENGAGEMENT_COPY = {
  nextStepTitle: "Recommended next step",
  queueAction: (count: number): string =>
    `${count} approval request${count === 1 ? "" : "s"} waiting for review.`,
  sentinelIdleAction:
    "Sentinel is idle. Resume monitoring before high-risk edits.",
  sentinelMonitorAction:
    "Continue monitoring and audit files with elevated risk.",
  dojoContinueAction:
    "Continue the Dojo workflow from scan to reflect, then finalize the ledger entry.",
  workflowStepLogged: (
    title: string,
    completed: number,
    total: number,
  ): string => `${title} logged. Progress ${completed}/${total}.`,
  workflowReset: "Workflow reset. Start with Scan changes.",
  phaseComplete: (title: string): string => `Phase complete: ${title}`,
  milestoneReached: (title: string): string => `Milestone reached: ${title}`,
  controlsLabel: "Critical controls",
  controlsNote:
    "Use these only when immediate intervention is required.",
} as const;

