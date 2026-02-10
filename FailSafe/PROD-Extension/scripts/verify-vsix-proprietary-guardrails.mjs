import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const configPath = path.join(
  repoRoot,
  "FailSafe",
  "PROD-Extension",
  "proprietary-guardrails.json",
);

function fail(message) {
  console.error(`\n[guardrail] ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32",
    ...options,
  });
  if (result.error) {
    fail(`Command failed to start: ${command} ${args.join(" ")}\n${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    fail(
      `Command failed: ${command} ${args.join(" ")}\n${stderr || stdout || "(no output)"}`,
    );
  }
  return result.stdout || "";
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function normalizeEntry(entry) {
  return entry.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function hasBlockedSegment(entry, blockedSegments) {
  const segments = normalizeEntry(entry).split("/").filter(Boolean);
  const lookup = new Set(blockedSegments.map((s) => s.toLowerCase()));
  return segments.some((segment) => lookup.has(segment.toLowerCase()));
}

function hasBlockedPrefix(entry, blockedPrefixes) {
  const normalized = normalizeEntry(entry).toLowerCase();
  return blockedPrefixes.some((prefix) =>
    normalized.startsWith(prefix.toLowerCase()),
  );
}

function assertVscodeIgnoreCoverage(targetRoot, requiredIgnoreGlobs) {
  const ignorePath = path.join(targetRoot, ".vscodeignore");
  if (!fs.existsSync(ignorePath)) {
    fail(`Missing .vscodeignore at ${ignorePath}`);
  }

  const lines = fs
    .readFileSync(ignorePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  const missing = requiredIgnoreGlobs.filter((glob) => !lines.includes(glob));
  if (missing.length > 0) {
    fail(
      `Target ${targetRoot} is missing required .vscodeignore entries:\n- ${missing.join("\n- ")}`,
    );
  }
}

function listPackagedEntries(targetRoot) {
  const listOutput = run(
    npmCommand(),
    ["exec", "--yes", "@vscode/vsce", "--", "ls"],
    { cwd: targetRoot },
  );
  return listOutput
    .split(/\r?\n/)
    .map((line) => normalizeEntry(line))
    .filter(Boolean);
}

function main() {
  if (!fs.existsSync(configPath)) {
    fail(`Guardrail config not found at ${configPath}`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const blockedSegments = config.blockedPathSegments || [];
  const blockedPrefixes = config.blockedPathPrefixes || [];
  const targets = config.targets || [];

  if (targets.length === 0) {
    fail("No targets configured in proprietary-guardrails.json");
  }

  for (const target of targets) {
    const targetRoot = path.join(repoRoot, target.path);
    if (!fs.existsSync(targetRoot)) {
      fail(`Target path does not exist: ${target.path}`);
    }

    assertVscodeIgnoreCoverage(targetRoot, target.requiredIgnoreGlobs || []);
    const entries = listPackagedEntries(targetRoot);

    const leaks = entries.filter(
      (entry) =>
        hasBlockedSegment(entry, blockedSegments) ||
        hasBlockedPrefix(entry, blockedPrefixes),
    );

    if (leaks.length > 0) {
      fail(
        `Detected blocked artifacts in ${target.name} VSIX:\n- ${leaks.join("\n- ")}`,
      );
    }

    console.log(
      `[guardrail] ${target.name}: OK (${entries.length} included entries validated)`,
    );
  }

  console.log("[guardrail] All VSIX proprietary guardrails passed.");
}

main();
