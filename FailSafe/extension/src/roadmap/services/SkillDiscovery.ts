/**
 * SkillDiscovery - Skill file discovery across workspace roots.
 * Extracted from SkillRegistry.ts for modularity.
 */
import * as fs from "fs";
import * as path from "path";
import {
  type InstalledSkill, type SkillRoot,
  collectSkillMarkdownFiles, collectCommandMarkdownFiles,
  parseSkillFile, parseCommandFile, toComparablePath,
} from "./SkillParser";
import { isPreferredSkill } from "./SkillRanker";
import { getApprovedSkillFileSet } from "./SkillRegistry";
export { adaptSkillContent, adaptSkillsForModel } from "./ModelAdapter";
export type { AdapterConfig, AdapterResult } from "./ModelAdapterConfigs";
export { BUILTIN_ADAPTER_CONFIGS } from "./ModelAdapterConfigs";

export function buildSkillRoots(wsRoot: string, dirname: string): SkillRoot[] {
  const bases = new Set<string>();
  const addAncestors = (start: string): void => {
    let current = path.resolve(start);
    for (let i = 0; i < 10; i += 1) {
      if (bases.has(current)) break;
      bases.add(current);
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  };
  addAncestors(wsRoot);
  addAncestors(path.resolve(dirname, ".."));
  addAncestors(path.resolve(dirname, "../.."));
  const roots: SkillRoot[] = [];
  const add = (rp: string, st: string, sp: number, as_: string): void => {
    const n = path.resolve(rp);
    if (!roots.some((r) => r.root === n)) {
      roots.push({ root: n, sourceType: st, sourcePriority: sp, admissionState: as_ });
    }
  };
  for (const base of bases) {
    add(path.join(base, "FailSafe", "VSCode", "skills"), "project-canonical", 1, "admitted");
    add(path.join(base, "VSCode", "skills"), "project-canonical", 1, "admitted");
    add(path.join(base, ".agent", "skills"), "project-local", 2, "admitted");
    add(path.join(base, ".claude", "skills"), "project-local", 2, "admitted");
    add(path.join(base, ".codex", "skills"), "project-local", 2, "admitted");
    add(path.join(base, ".github", "skills"), "project-local", 2, "admitted");
    add(path.join(base, ".claude", "commands"), "project-commands", 2, "admitted");
    add(path.join(base, ".claude", "agents"), "project-agents", 2, "admitted");
    add(path.join(base, ".failsafe", "manual-skills"), "manual-import", 3, "conditional");
  }
  return roots;
}

export function buildWorkspaceDiscoveryRoots(wsRoot: string): string[] {
  const base = path.resolve(wsRoot);
  const roots = [
    path.join(base, ".agent", "skills"), path.join(base, ".claude", "skills"),
    path.join(base, ".codex", "skills"), path.join(base, ".github", "skills"),
    path.join(base, "FailSafe", "VSCode", "skills"),
    path.join(base, "VSCode", "skills"),
    path.join(base, ".failsafe", "manual-skills"),
  ];
  return Array.from(new Set(roots.map((r) => path.resolve(r))));
}

export function discoverAllSkills(
  ws: string, dirname: string,
): InstalledSkill[] {
  const skillRoots = buildSkillRoots(ws, dirname);
  const approved = getApprovedSkillFileSet(ws, skillRoots);
  const discovered = new Map<string, InstalledSkill>();
  discoverSkillFiles(skillRoots, approved, discovered, ws);
  discoverCommandFiles(skillRoots, discovered, ws);
  if (discovered.size === 0) {
    for (const s of emergencyDiscoverSkills(ws, dirname)) {
      discovered.set(s.key, s);
    }
  }
  return Array.from(discovered.values()).sort((a, b) => {
    if (a.sourcePriority !== b.sourcePriority) return a.sourcePriority - b.sourcePriority;
    return a.label.localeCompare(b.label);
  });
}

function discoverSkillFiles(
  roots: SkillRoot[], approved: Set<string>,
  out: Map<string, InstalledSkill>, ws: string,
): void {
  for (const root of roots) {
    if (!fs.existsSync(root.root)) continue;
    for (const md of collectSkillMarkdownFiles(root.root)) {
      const ok = approved.has(toComparablePath(md)) ||
        root.sourceType === "project-canonical" || root.sourceType === "project-local";
      if (!ok) continue;
      const parsed = parseSkillFile(md, root, ws);
      if (!parsed) continue;
      const existing = out.get(parsed.key);
      if (!existing || isPreferredSkill(parsed, existing)) out.set(parsed.key, parsed);
    }
  }
}

function discoverCommandFiles(
  roots: SkillRoot[], out: Map<string, InstalledSkill>, ws: string,
): void {
  for (const root of roots.filter((r) => r.sourceType === "project-commands")) {
    if (!fs.existsSync(root.root)) continue;
    for (const md of collectCommandMarkdownFiles(root.root)) {
      const parsed = parseCommandFile(md, root, ws);
      if (parsed && !out.has(parsed.key)) out.set(parsed.key, parsed);
    }
  }
}

function emergencyDiscoverSkills(ws: string, dirname: string): InstalledSkill[] {
  const roots = [
    path.join(ws, "FailSafe", "VSCode", "skills"),
    path.join(ws, "VSCode", "skills"),
    path.resolve(ws, "..", "VSCode", "skills"),
    path.resolve(ws, "..", "FailSafe", "VSCode", "skills"),
    path.resolve(dirname, "../../../../VSCode/skills"),
    path.resolve(dirname, "../../../../../FailSafe/VSCode/skills"),
  ];
  const unique = Array.from(new Set(roots.map((r) => path.resolve(r))));
  const output = new Map<string, InstalledSkill>();
  for (const root of unique) {
    if (!fs.existsSync(root)) continue;
    for (const file of collectSkillMarkdownFiles(root)) {
      const parsed = parseSkillFile(file, {
        root, sourceType: "project-canonical", sourcePriority: 1, admissionState: "admitted",
      }, ws);
      if (parsed && !output.has(parsed.key)) output.set(parsed.key, parsed);
    }
  }
  return Array.from(output.values());
}
