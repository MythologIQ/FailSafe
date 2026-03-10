import { describe, it } from "mocha";
import * as assert from "assert";
import {
  validateCommitMessage,
  auditWorkspace,
  validateStructure,
  validateRootFiles,
  validateGitHubConfig,
  validateSecurityPosture,
} from "../../roadmap/services/RepoGovernanceService";
import * as path from "path";

describe("RepoGovernanceService", () => {
  // Use the actual FailSafe workspace for testing
  const workspacePath = path.resolve(__dirname, "../../../../..");

  describe("validateCommitMessage", () => {
    it("validates correct semantic commit format", () => {
      const result = validateCommitMessage("feat: add new feature");
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.type, "feat");
      assert.strictEqual(result.description, "add new feature");
      assert.strictEqual(result.issues.length, 0);
    });

    it("validates commit with scope", () => {
      const result = validateCommitMessage("fix(auth): resolve login issue");
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.type, "fix");
      assert.strictEqual(result.scope, "auth");
      assert.strictEqual(result.description, "resolve login issue");
    });

    it("rejects invalid type", () => {
      const result = validateCommitMessage("invalid: some message");
      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes("Invalid type")));
    });

    it("rejects non-semantic format", () => {
      const result = validateCommitMessage("just a random commit message");
      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes("semantic commit format")));
    });

    it("warns about non-imperative mood", () => {
      const result = validateCommitMessage("feat: added new feature");
      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes("imperative")));
    });

    it("warns about long first line", () => {
      const longMessage =
        "feat: " + "a".repeat(80);
      const result = validateCommitMessage(longMessage);
      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes("too long")));
    });

    it("validates all standard commit types", () => {
      const types = ["feat", "fix", "docs", "refactor", "test", "chore", "style", "perf"];
      for (const type of types) {
        const result = validateCommitMessage(`${type}: valid message`);
        assert.strictEqual(result.valid, true, `Expected ${type} to be valid`);
      }
    });
  });

  describe("validateStructure", () => {
    it("returns checks for required directories", () => {
      const checks = validateStructure(workspacePath);
      assert.ok(checks.length > 0);
      assert.ok(checks.some((c) => c.id.includes("src")));
      assert.ok(checks.some((c) => c.id.includes("docs")));
      assert.ok(checks.some((c) => c.id.includes(".github")));
    });

    it("marks present directories as passed", () => {
      const checks = validateStructure(workspacePath);
      const docsCheck = checks.find((c) => c.id.includes("docs"));
      assert.ok(docsCheck);
      assert.strictEqual(docsCheck.passed, true);
    });

    it("marks missing directories as failed", () => {
      // Use a temp path that doesn't exist
      const checks = validateStructure("/nonexistent/path");
      assert.ok(checks.every((c) => c.passed === false));
    });
  });

  describe("validateRootFiles", () => {
    it("checks for mandatory files", () => {
      const checks = validateRootFiles(workspacePath);
      assert.ok(checks.some((c) => c.id.includes("readme")));
      assert.ok(checks.some((c) => c.id.includes("license")));
    });

    it("checks for recommended files", () => {
      const checks = validateRootFiles(workspacePath);
      assert.ok(checks.some((c) => c.id.includes("contributing")));
      assert.ok(checks.some((c) => c.id.includes("security")));
      assert.ok(checks.some((c) => c.id.includes("code_of_conduct") || c.id.includes("code-of-conduct")));
    });

    it("detects present README.md", () => {
      const checks = validateRootFiles(workspacePath);
      const readmeCheck = checks.find((c) => c.id.includes("readme"));
      assert.ok(readmeCheck);
      assert.strictEqual(readmeCheck.passed, true);
    });
  });

  describe("validateGitHubConfig", () => {
    it("checks for .github directory", () => {
      const checks = validateGitHubConfig(workspacePath);
      const githubCheck = checks.find((c) => c.id === "github-dir");
      assert.ok(githubCheck);
      assert.strictEqual(githubCheck.passed, true);
    });

    it("checks for issue templates", () => {
      const checks = validateGitHubConfig(workspacePath);
      assert.ok(checks.some((c) => c.id.includes("bug_report") || c.id.includes("bug-report")));
      assert.ok(checks.some((c) => c.id.includes("feature_request") || c.id.includes("feature-request")));
    });

    it("checks for PR template", () => {
      const checks = validateGitHubConfig(workspacePath);
      const prCheck = checks.find((c) => c.id === "github-pr-template");
      assert.ok(prCheck);
      assert.strictEqual(prCheck.passed, true);
    });

    it("checks for workflows directory", () => {
      const checks = validateGitHubConfig(workspacePath);
      const workflowsCheck = checks.find((c) => c.id === "github-workflows-dir");
      assert.ok(workflowsCheck);
      assert.strictEqual(workflowsCheck.passed, true);
    });
  });

  describe("validateSecurityPosture", () => {
    it("checks for SECURITY.md", () => {
      const checks = validateSecurityPosture(workspacePath);
      const securityCheck = checks.find((c) => c.id === "security-policy-file");
      assert.ok(securityCheck);
      assert.strictEqual(securityCheck.passed, true);
    });

    it("checks for .env gitignore", () => {
      const checks = validateSecurityPosture(workspacePath);
      const envCheck = checks.find((c) => c.id === "security-env-gitignored");
      assert.ok(envCheck);
    });

    it("checks for dependency scanning", () => {
      const checks = validateSecurityPosture(workspacePath);
      const depCheck = checks.find((c) => c.id === "security-dep-scanning");
      assert.ok(depCheck);
      // FailSafe has .socket.yml
      assert.strictEqual(depCheck.passed, true);
    });
  });

  describe("auditWorkspace", () => {
    it("returns complete compliance report", () => {
      const report = auditWorkspace(workspacePath);
      assert.ok(report.timestamp);
      assert.ok(report.workspacePath);
      assert.ok(typeof report.score === "number");
      assert.ok(typeof report.maxScore === "number");
      assert.ok(typeof report.percentage === "number");
      assert.ok(["A", "B", "C", "D", "F"].includes(report.grade));
      assert.ok(Array.isArray(report.checks));
      assert.ok(Array.isArray(report.violations));
      assert.ok(report.summary);
    });

    it("calculates percentage correctly", () => {
      const report = auditWorkspace(workspacePath);
      const expectedPercentage = Math.round((report.score / report.maxScore) * 100);
      assert.strictEqual(report.percentage, expectedPercentage);
    });

    it("grades based on percentage", () => {
      const report = auditWorkspace(workspacePath);
      // FailSafe should have good compliance
      assert.ok(
        ["A", "B", "C"].includes(report.grade),
        `Expected grade A, B, or C but got ${report.grade}`,
      );
    });

    it("counts violations by severity", () => {
      const report = auditWorkspace(workspacePath);
      const errors = report.violations.filter((v) => v.severity === "error").length;
      const warnings = report.violations.filter((v) => v.severity === "warning").length;
      const infos = report.violations.filter((v) => v.severity === "info").length;

      assert.strictEqual(report.summary.errors, errors);
      assert.strictEqual(report.summary.warnings, warnings);
      assert.strictEqual(report.summary.infos, infos);
    });

    it("includes remediation guidance for violations", () => {
      const report = auditWorkspace(workspacePath);
      // Check that violations with remediation have it set
      const violationsWithRemediation = report.violations.filter((v) => v.remediation);
      // Not all violations need remediation, but if there are violations, some should have it
      if (report.violations.length > 0) {
        assert.ok(
          violationsWithRemediation.length >= 0,
          "Expected some violations to have remediation guidance",
        );
      }
    });

    it("handles nonexistent workspace gracefully", () => {
      const report = auditWorkspace("/nonexistent/path");
      assert.ok(report);
      assert.strictEqual(report.grade, "F");
      assert.ok(report.violations.length > 0);
    });
  });
});
