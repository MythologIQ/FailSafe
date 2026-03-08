/**
 * SkillRanker - Ranks and compares skills by phase relevance and priority.
 * Extracted from ConsoleServer.ts for modularity.
 */
import type { InstalledSkill } from "./SkillParser";

export type SkillRelevance = InstalledSkill & {
  score: number;
  reasons: string[];
};

const PHASE_KEYWORD_MAP: Record<string, string[]> = {
  plan: ["plan", "strategy", "architecture", "design", "router", "flow"],
  audit: [
    "audit", "review", "security", "permission", "verify", "compliance",
  ],
  implement: [
    "implement", "integration", "wiring", "state", "plugin", "build",
  ],
  debug: [
    "debug", "error", "test", "validation", "fix", "mock", "performance",
  ],
  substantiate: [
    "documentation", "release", "narrative", "governance", "evidence",
    "lifecycle",
  ],
};

export function rankSkillForPhase(
  skill: InstalledSkill,
  phase: string,
): SkillRelevance {
  const text = `${skill.key} ${skill.label} ${skill.desc}`.toLowerCase();
  const keywords = PHASE_KEYWORD_MAP[phase] || [];
  let score = 1;
  const reasons: string[] = [];
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      score += 1;
      reasons.push(`keyword:${keyword}`);
    }
  }
  applyTrustModifiers(skill, reasons, score, (s) => { score = s; });
  applySourceModifiers(skill, reasons, score, (s) => { score = s; });
  if (skill.requiredPermissions.length > 0) {
    reasons.push(`permissions:${skill.requiredPermissions.length}`);
  }
  if (reasons.length === 0) {
    reasons.push("baseline");
  }
  return { ...skill, score, reasons };
}

function applyTrustModifiers(
  skill: InstalledSkill,
  reasons: string[],
  score: number,
  setScore: (s: number) => void,
): void {
  if (skill.trustTier.toLowerCase() === "verified") {
    setScore(score + 1);
    reasons.push("trust:verified");
  }
  const admission = skill.admissionState.toLowerCase();
  if (admission === "admitted") {
    setScore(score + 1);
    reasons.push("admission:admitted");
  } else if (admission === "conditional") {
    reasons.push("admission:conditional");
  } else if (admission === "quarantined") {
    setScore(score - 5);
    reasons.push("admission:quarantined");
  }
}

function applySourceModifiers(
  skill: InstalledSkill,
  reasons: string[],
  score: number,
  setScore: (s: number) => void,
): void {
  if (skill.sourcePriority <= 1) {
    setScore(score + 2);
    reasons.push("source:project-canonical");
  } else if (skill.sourcePriority === 2) {
    setScore(score + 1);
    reasons.push("source:preferred");
  } else {
    reasons.push(`source:priority-${skill.sourcePriority}`);
  }
}

export function isPreferredSkill(
  candidate: InstalledSkill,
  current: InstalledSkill,
): boolean {
  if (candidate.sourcePriority !== current.sourcePriority) {
    return candidate.sourcePriority < current.sourcePriority;
  }
  const candidateAdmission = admissionWeight(candidate.admissionState);
  const currentAdmission = admissionWeight(current.admissionState);
  if (candidateAdmission !== currentAdmission) {
    return candidateAdmission > currentAdmission;
  }
  const candidatePinned = candidate.versionPin !== "unversioned";
  const currentPinned = current.versionPin !== "unversioned";
  if (candidatePinned !== currentPinned) {
    return candidatePinned;
  }
  return candidate.label.localeCompare(current.label) < 0;
}

function admissionWeight(value: string): number {
  const normalized = value.toLowerCase();
  if (normalized === "admitted") return 3;
  if (normalized === "conditional") return 2;
  if (normalized === "quarantined") return 1;
  return 0;
}

export function getRelevanceScore(
  skill: InstalledSkill,
  phase: string,
): number {
  return rankSkillForPhase(skill, phase).score;
}
