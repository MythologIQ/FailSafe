/**
 * AgentDefinitions - Built-In Agent System Manifests
 *
 * Defines the 6 supported AI coding agents with their detection rules
 * and governance paths. These replace the old filesystem-based manifests
 * that were loaded from FailSafe/_STAGING_OLD/.
 */

import { SystemManifest } from "./types/QoreLogicSystem";

export const BUILT_IN_AGENTS: SystemManifest[] = [
  {
    id: "claude",
    name: "Claude Code",
    description: "Claude Code CLI and Anthropic agents",
    targetDir: null,
    detection: {
      folderExists: [".claude"],
      extensionKeywords: ["claude", "anthropic"],
    },
    governancePaths: [".claude/skills", ".claude/agents", ".claude/CLAUDE.md"],
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    description: "GitHub Copilot AI assistant",
    targetDir: null,
    detection: {
      folderExists: [".github/copilot-instructions.md"],
      extensionKeywords: ["copilot"],
    },
    governancePaths: [".github/copilot-instructions.md"],
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "Cursor AI-native code editor",
    targetDir: null,
    detection: {
      folderExists: [".cursor"],
      hostAppNames: ["cursor"],
    },
    governancePaths: [".cursor/rules/failsafe.mdc"],
  },
  {
    id: "codex",
    name: "OpenAI Codex",
    description: "OpenAI Codex CLI agent",
    targetDir: null,
    detection: {
      folderExists: ["codex.md", "AGENTS.md"],
      extensionKeywords: ["codex"],
    },
    governancePaths: ["codex.md"],
  },
  {
    id: "windsurf",
    name: "Windsurf",
    description: "Windsurf AI code editor",
    targetDir: null,
    detection: {
      folderExists: [".windsurfrules", ".windsurf"],
      hostAppNames: ["windsurf"],
    },
    governancePaths: [".windsurfrules"],
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    description: "Google Gemini CLI agent",
    targetDir: null,
    detection: {
      folderExists: [".gemini", "GEMINI.md"],
      extensionKeywords: ["gemini"],
    },
    governancePaths: ["GEMINI.md", ".gemini/settings.json"],
  },
];
