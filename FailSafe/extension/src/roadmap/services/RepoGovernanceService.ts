/**
 * RepoGovernanceService — Repository Governance Compliance Validation
 *
 * Validates target workspaces against the Repository Governance Standard
 * defined in docs/REPO_GOVERNANCE.md. Provides compliance scoring,
 * violation detection, and remediation guidance.
 */

import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ViolationSeverity = "error" | "warning" | "info";
export type ViolationCategory =
  | "structure"
  | "root-files"
  | "github-config"
  | "commit-discipline"
  | "security";

export interface Violation {
  id: string;
  category: ViolationCategory;
  severity: ViolationSeverity;
  message: string;
  path?: string;
  remediation?: string;
}

export interface ComplianceCheck {
  id: string;
  name: string;
  category: ViolationCategory;
  passed: boolean;
  details?: string;
}

export interface ComplianceReport {
  timestamp: string;
  workspacePath: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: "A" | "B" | "C" | "D" | "F";
  checks: ComplianceCheck[];
  violations: Violation[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    passed: number;
    total: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_DIRECTORIES = [
  { path: "src", alternatives: ["lib", "app", "packages"] },
  { path: "tests", alternatives: ["test", "__tests__", "spec"] },
  { path: "docs", alternatives: ["documentation", "doc"] },
  { path: ".github", alternatives: [] },
];

const MANDATORY_ROOT_FILES = [
  { file: "README.md", alternatives: ["readme.md", "README"] },
  { file: "LICENSE", alternatives: ["LICENSE.md", "LICENSE.txt", "LICENCE"] },
];

const RECOMMENDED_ROOT_FILES = [
  { file: "CONTRIBUTING.md", alternatives: ["contributing.md"] },
  { file: "SECURITY.md", alternatives: ["security.md"] },
  { file: "CODE_OF_CONDUCT.md", alternatives: ["code_of_conduct.md"] },
  { file: "CHANGELOG.md", alternatives: ["changelog.md", "HISTORY.md"] },
];

const REQUIRED_ISSUE_TEMPLATES = ["bug_report.yml", "feature_request.yml", "config.yml"];

const SEMANTIC_COMMIT_TYPES = [
  "feat",
  "fix",
  "docs",
  "refactor",
  "test",
  "chore",
  "style",
  "perf",
  "ci",
  "build",
  "revert",
];

const L3_PATH_TRIGGERS = ["auth", "payment", "credential", "secret", "key", "token", "password"];

const L3_CONTENT_TRIGGERS = [
  "api_key",
  "apikey",
  "private_key",
  "privatekey",
  "DROP TABLE",
  "password",
  "secret",
  "AWS_SECRET",
  "PRIVATE_KEY",
];

// ─────────────────────────────────────────────────────────────────────────────
// Validation Functions
// ─────────────────────────────────────────────────────────────────────────────

function fileExists(basePath: string, file: string, alternatives: string[]): string | null {
  const candidates = [file, ...alternatives];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(basePath, candidate))) {
      return candidate;
    }
  }
  return null;
}

function dirExists(basePath: string, dir: string, alternatives: string[]): string | null {
  const candidates = [dir, ...alternatives];
  for (const candidate of candidates) {
    const fullPath = path.join(basePath, candidate);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      return candidate;
    }
  }
  return null;
}

export function validateStructure(workspacePath: string): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  for (const req of REQUIRED_DIRECTORIES) {
    const found = dirExists(workspacePath, req.path, req.alternatives);
    checks.push({
      id: `structure-dir-${req.path}`,
      name: `Directory: ${req.path}/`,
      category: "structure",
      passed: found !== null,
      details: found ? `Found: ${found}/` : `Missing: ${req.path}/ (or alternatives)`,
    });
  }

  return checks;
}

export function validateRootFiles(workspacePath: string): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // Mandatory files
  for (const req of MANDATORY_ROOT_FILES) {
    const found = fileExists(workspacePath, req.file, req.alternatives);
    checks.push({
      id: `root-file-${req.file.toLowerCase().replace(/\./g, "-")}`,
      name: `File: ${req.file}`,
      category: "root-files",
      passed: found !== null,
      details: found ? `Found: ${found}` : `Missing: ${req.file}`,
    });
  }

  // Recommended files (info level)
  for (const req of RECOMMENDED_ROOT_FILES) {
    const found = fileExists(workspacePath, req.file, req.alternatives);
    checks.push({
      id: `root-file-${req.file.toLowerCase().replace(/\./g, "-")}`,
      name: `File: ${req.file} (recommended)`,
      category: "root-files",
      passed: found !== null,
      details: found ? `Found: ${found}` : `Recommended: ${req.file}`,
    });
  }

  return checks;
}

export function validateGitHubConfig(workspacePath: string): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  const githubPath = path.join(workspacePath, ".github");

  // Check .github directory exists
  const githubExists = fs.existsSync(githubPath) && fs.statSync(githubPath).isDirectory();
  checks.push({
    id: "github-dir",
    name: "GitHub configuration directory",
    category: "github-config",
    passed: githubExists,
    details: githubExists ? "Found: .github/" : "Missing: .github/",
  });

  if (!githubExists) {
    return checks;
  }

  // Check issue templates
  const templatePath = path.join(githubPath, "ISSUE_TEMPLATE");
  const templateDirExists =
    fs.existsSync(templatePath) && fs.statSync(templatePath).isDirectory();

  checks.push({
    id: "github-issue-template-dir",
    name: "Issue templates directory",
    category: "github-config",
    passed: templateDirExists,
    details: templateDirExists
      ? "Found: .github/ISSUE_TEMPLATE/"
      : "Missing: .github/ISSUE_TEMPLATE/",
  });

  if (templateDirExists) {
    for (const template of REQUIRED_ISSUE_TEMPLATES) {
      const templateFile = path.join(templatePath, template);
      const exists = fs.existsSync(templateFile);
      checks.push({
        id: `github-template-${template.replace(/\./g, "-")}`,
        name: `Issue template: ${template}`,
        category: "github-config",
        passed: exists,
        details: exists ? `Found: ${template}` : `Missing: ${template}`,
      });
    }
  }

  // Check PR template
  const prTemplatePaths = [
    path.join(githubPath, "PULL_REQUEST_TEMPLATE.md"),
    path.join(githubPath, "pull_request_template.md"),
    path.join(workspacePath, "PULL_REQUEST_TEMPLATE.md"),
  ];
  const prTemplateExists = prTemplatePaths.some((p) => fs.existsSync(p));
  checks.push({
    id: "github-pr-template",
    name: "Pull request template",
    category: "github-config",
    passed: prTemplateExists,
    details: prTemplateExists
      ? "Found: PULL_REQUEST_TEMPLATE.md"
      : "Missing: PULL_REQUEST_TEMPLATE.md",
  });

  // Check workflows directory
  const workflowsPath = path.join(githubPath, "workflows");
  const workflowsExists =
    fs.existsSync(workflowsPath) && fs.statSync(workflowsPath).isDirectory();
  checks.push({
    id: "github-workflows-dir",
    name: "CI/CD workflows directory",
    category: "github-config",
    passed: workflowsExists,
    details: workflowsExists ? "Found: .github/workflows/" : "Missing: .github/workflows/",
  });

  if (workflowsExists) {
    const workflows = fs.readdirSync(workflowsPath).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
    checks.push({
      id: "github-workflows-count",
      name: "CI/CD workflows present",
      category: "github-config",
      passed: workflows.length > 0,
      details:
        workflows.length > 0
          ? `Found ${workflows.length} workflow(s)`
          : "No workflow files found",
    });
  }

  return checks;
}

export function validateRecentCommits(workspacePath: string): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // Check if git directory exists
  const gitPath = path.join(workspacePath, ".git");
  if (!fs.existsSync(gitPath)) {
    checks.push({
      id: "commit-git-repo",
      name: "Git repository",
      category: "commit-discipline",
      passed: false,
      details: "Not a git repository",
    });
    return checks;
  }

  checks.push({
    id: "commit-git-repo",
    name: "Git repository",
    category: "commit-discipline",
    passed: true,
    details: "Git repository detected",
  });

  // Note: Actual commit history analysis would require git commands
  // For now, we check for conventional commit tooling
  const packageJsonPath = path.join(workspacePath, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const hasCommitlint =
        packageJson.devDependencies?.["@commitlint/cli"] ||
        packageJson.dependencies?.["@commitlint/cli"];
      const hasHusky =
        packageJson.devDependencies?.husky || packageJson.dependencies?.husky;

      checks.push({
        id: "commit-tooling-commitlint",
        name: "Commitlint configured",
        category: "commit-discipline",
        passed: Boolean(hasCommitlint),
        details: hasCommitlint
          ? "Commitlint detected in dependencies"
          : "Commitlint not configured (recommended)",
      });

      checks.push({
        id: "commit-tooling-husky",
        name: "Git hooks (Husky)",
        category: "commit-discipline",
        passed: Boolean(hasHusky),
        details: hasHusky
          ? "Husky detected in dependencies"
          : "Husky not configured (recommended)",
      });
    } catch {
      // Ignore JSON parse errors
    }
  }

  return checks;
}

export function validateSecurityPosture(workspacePath: string): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // Check for SECURITY.md
  const securityFile = fileExists(workspacePath, "SECURITY.md", ["security.md"]);
  checks.push({
    id: "security-policy-file",
    name: "Security policy (SECURITY.md)",
    category: "security",
    passed: securityFile !== null,
    details: securityFile ? `Found: ${securityFile}` : "Missing: SECURITY.md (recommended)",
  });

  // Check for .env in git (should be gitignored)
  const envFile = path.join(workspacePath, ".env");
  const gitignorePath = path.join(workspacePath, ".gitignore");
  let envProtected = true;

  if (fs.existsSync(envFile) && fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, "utf-8");
    envProtected = gitignore.includes(".env");
  }

  checks.push({
    id: "security-env-gitignored",
    name: ".env file gitignored",
    category: "security",
    passed: envProtected,
    details: envProtected
      ? ".env is properly gitignored or not present"
      : ".env exists but may not be gitignored",
  });

  // Check for dependency scanning config
  const socketYml = path.join(workspacePath, ".socket.yml");
  const snykFile = path.join(workspacePath, ".snyk");
  const dependabotPath = path.join(workspacePath, ".github", "dependabot.yml");
  const hasDepScanning =
    fs.existsSync(socketYml) || fs.existsSync(snykFile) || fs.existsSync(dependabotPath);

  checks.push({
    id: "security-dep-scanning",
    name: "Dependency scanning configured",
    category: "security",
    passed: hasDepScanning,
    details: hasDepScanning
      ? "Dependency scanning detected (Socket, Snyk, or Dependabot)"
      : "No dependency scanning configured (recommended)",
  });

  return checks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Violation Extraction
// ─────────────────────────────────────────────────────────────────────────────

function checksToViolations(checks: ComplianceCheck[]): Violation[] {
  const violations: Violation[] = [];

  for (const check of checks) {
    if (check.passed) continue;

    // Determine severity based on check id and category
    let severity: ViolationSeverity = "warning";
    let remediation: string | undefined;

    if (check.id.includes("readme") || check.id.includes("license")) {
      severity = "error";
      remediation = `Create ${check.name.replace("File: ", "")} at the repository root`;
    } else if (check.id.includes("recommended") || check.details?.includes("recommended")) {
      severity = "info";
      remediation = `Consider adding ${check.name.replace(" (recommended)", "")}`;
    } else if (check.category === "security") {
      severity = check.id.includes("env") ? "error" : "warning";
      remediation = check.details;
    } else if (check.category === "github-config") {
      severity = "warning";
      remediation = `Configure ${check.name} in .github/`;
    } else if (check.category === "structure") {
      severity = "warning";
      remediation = `Create the missing directory`;
    }

    violations.push({
      id: check.id,
      category: check.category,
      severity,
      message: check.details || check.name,
      remediation,
    });
  }

  return violations;
}

function calculateGrade(percentage: number): "A" | "B" | "C" | "D" | "F" {
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "F";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Audit Function
// ─────────────────────────────────────────────────────────────────────────────

export function auditWorkspace(workspacePath: string): ComplianceReport {
  const checks: ComplianceCheck[] = [
    ...validateStructure(workspacePath),
    ...validateRootFiles(workspacePath),
    ...validateGitHubConfig(workspacePath),
    ...validateRecentCommits(workspacePath),
    ...validateSecurityPosture(workspacePath),
  ];

  const violations = checksToViolations(checks);

  const passed = checks.filter((c) => c.passed).length;
  const total = checks.length;
  const errors = violations.filter((v) => v.severity === "error").length;
  const warnings = violations.filter((v) => v.severity === "warning").length;
  const infos = violations.filter((v) => v.severity === "info").length;

  // Score: errors = -2, warnings = -1, infos = 0
  const maxScore = total * 2;
  const deductions = errors * 2 + warnings * 1;
  const score = Math.max(0, maxScore - deductions);
  const percentage = Math.round((score / maxScore) * 100);

  return {
    timestamp: new Date().toISOString(),
    workspacePath,
    score,
    maxScore,
    percentage,
    grade: calculateGrade(percentage),
    checks,
    violations,
    summary: {
      errors,
      warnings,
      infos,
      passed,
      total,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// L3 File Detection (Security-Critical Files)
// ─────────────────────────────────────────────────────────────────────────────

export function detectL3Files(workspacePath: string): string[] {
  const l3Files: string[] = [];

  function scanDirectory(dir: string, relativePath: string = ""): void {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);

      // Skip node_modules, .git, etc.
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "dist", "build", ".next"].includes(entry.name)) {
          continue;
        }
        scanDirectory(fullPath, relPath);
      } else if (entry.isFile()) {
        // Check path triggers
        const pathLower = relPath.toLowerCase();
        const hasPathTrigger = L3_PATH_TRIGGERS.some((t) => pathLower.includes(t));

        if (hasPathTrigger) {
          l3Files.push(relPath);
          continue;
        }

        // Check content triggers for certain file types
        const ext = path.extname(entry.name).toLowerCase();
        if ([".ts", ".js", ".json", ".env", ".yml", ".yaml", ".py", ".rb"].includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            const hasContentTrigger = L3_CONTENT_TRIGGERS.some((t) =>
              content.toLowerCase().includes(t.toLowerCase())
            );
            if (hasContentTrigger) {
              l3Files.push(relPath);
            }
          } catch {
            // Skip files that can't be read
          }
        }
      }
    }
  }

  scanDirectory(workspacePath);
  return l3Files;
}

// ─────────────────────────────────────────────────────────────────────────────
// Commit Message Validation
// ─────────────────────────────────────────────────────────────────────────────

export interface CommitValidation {
  message: string;
  valid: boolean;
  type?: string;
  scope?: string;
  description?: string;
  issues: string[];
}

export function validateCommitMessage(message: string): CommitValidation {
  const issues: string[] = [];
  const firstLine = message.split("\n")[0].trim();

  // Pattern: type(scope)?: description
  const pattern = /^(\w+)(?:\(([^)]+)\))?!?:\s+(.+)$/;
  const match = firstLine.match(pattern);

  if (!match) {
    issues.push("Does not follow semantic commit format: type(scope)?: description");
    return { message, valid: false, issues };
  }

  const [, type, scope, description] = match;

  // Validate type
  if (!SEMANTIC_COMMIT_TYPES.includes(type)) {
    issues.push(
      `Invalid type "${type}". Must be one of: ${SEMANTIC_COMMIT_TYPES.join(", ")}`
    );
  }

  // Validate description
  if (!description || description.length < 3) {
    issues.push("Description too short (minimum 3 characters)");
  }

  if (firstLine.length > 72) {
    issues.push(`First line too long (${firstLine.length} chars, max 72)`);
  }

  // Check imperative mood (basic check)
  const imperativeViolations = ["added", "fixed", "updated", "removed", "changed"];
  const descLower = description?.toLowerCase() || "";
  for (const word of imperativeViolations) {
    if (descLower.startsWith(word)) {
      issues.push(`Use imperative mood: "${word}" → "${word.replace(/ed$/, "")}" or "${word.replace(/ed$/, "")}"`);
      break;
    }
  }

  return {
    message,
    valid: issues.length === 0,
    type,
    scope,
    description,
    issues,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary Formatters
// ─────────────────────────────────────────────────────────────────────────────

export function formatReportSummary(report: ComplianceReport): string {
  const lines: string[] = [
    `# Repository Governance Report`,
    ``,
    `**Workspace**: ${report.workspacePath}`,
    `**Timestamp**: ${report.timestamp}`,
    ``,
    `## Score`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Grade | **${report.grade}** |`,
    `| Score | ${report.score}/${report.maxScore} |`,
    `| Percentage | ${report.percentage}% |`,
    ``,
    `## Summary`,
    ``,
    `| Status | Count |`,
    `|--------|-------|`,
    `| Passed | ${report.summary.passed} |`,
    `| Errors | ${report.summary.errors} |`,
    `| Warnings | ${report.summary.warnings} |`,
    `| Info | ${report.summary.infos} |`,
    `| Total Checks | ${report.summary.total} |`,
    ``,
  ];

  if (report.violations.length > 0) {
    lines.push(`## Violations`);
    lines.push(``);

    const errors = report.violations.filter((v) => v.severity === "error");
    const warnings = report.violations.filter((v) => v.severity === "warning");
    const infos = report.violations.filter((v) => v.severity === "info");

    if (errors.length > 0) {
      lines.push(`### Errors (blocking)`);
      lines.push(``);
      for (const v of errors) {
        lines.push(`- **${v.message}**`);
        if (v.remediation) lines.push(`  - Remediation: ${v.remediation}`);
      }
      lines.push(``);
    }

    if (warnings.length > 0) {
      lines.push(`### Warnings`);
      lines.push(``);
      for (const v of warnings) {
        lines.push(`- ${v.message}`);
        if (v.remediation) lines.push(`  - Remediation: ${v.remediation}`);
      }
      lines.push(``);
    }

    if (infos.length > 0) {
      lines.push(`### Recommendations`);
      lines.push(``);
      for (const v of infos) {
        lines.push(`- ${v.message}`);
      }
      lines.push(``);
    }
  }

  return lines.join("\n");
}
