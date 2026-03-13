import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { RiskSignalDetector } from "../../../sentinel/diffguard/RiskSignalDetector";
import type { DiffHunk, DiffLine, RiskSignal } from "../../../sentinel/diffguard/types";
import type { HeuristicPattern } from "../../../shared/types";
import type { PatternLoader } from "../../../sentinel/PatternLoader";

/**
 * Unit tests for RiskSignalDetector — risk signal detection and severity calculation.
 *
 * Uses a stub PatternLoader to avoid filesystem/YAML dependencies.
 */

// ---------------------------------------------------------------------------
// Stub PatternLoader
// ---------------------------------------------------------------------------

const STUB_PATTERNS: HeuristicPattern[] = [
  {
    id: "secret-api-key",
    name: "API Key / Secret Literal",
    category: "secrets",
    severity: "critical",
    pattern: "(api[_-]?key|secret)\\s*[:=]\\s*['\"][^'\"]+",
    description: "Hardcoded API key or secret value",
    falsePositiveRate: 0.05,
    remediation: "Use environment variables for secrets",
    enabled: true,
  },
  {
    id: "secret-bearer-token",
    name: "Bearer Token",
    category: "secrets",
    severity: "critical",
    pattern: "Bearer\\s+[A-Za-z0-9\\-_.]+",
    description: "Hardcoded bearer token",
    falsePositiveRate: 0.1,
    remediation: "Use environment variables for tokens",
    enabled: true,
  },
  {
    id: "pii-email",
    name: "Email PII",
    category: "pii",
    severity: "high",
    pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
    description: "Possible PII: email address",
    falsePositiveRate: 0.2,
    remediation: "Remove or redact PII data",
    enabled: true,
  },
];

/**
 * Minimal PatternLoader stub — satisfies the interface consumed by
 * RiskSignalDetector without touching disk.
 */
function createStubPatternLoader(): PatternLoader {
  return {
    getPatterns: () => STUB_PATTERNS,
    compilePattern: (pattern: HeuristicPattern): RegExp | null => {
      try {
        return new RegExp(pattern.pattern, "gim");
      } catch {
        return null;
      }
    },
    // Unused methods — stub to satisfy type shape
    getPattern: () => undefined,
    loadCustomPatterns: () => Promise.resolve(),
  } as unknown as PatternLoader;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeHunks(
  filePath: string,
  adds: string[],
  removes: string[],
): DiffHunk[] {
  const lines: DiffLine[] = [
    ...removes.map(
      (c, i): DiffLine => ({
        type: "remove",
        content: c,
        lineNumber: i + 1,
      }),
    ),
    ...adds.map(
      (c, i): DiffLine => ({
        type: "add",
        content: c,
        lineNumber: removes.length + i + 1,
      }),
    ),
  ];
  return [
    {
      filePath,
      oldStart: 1,
      oldCount: removes.length,
      newStart: 1,
      newCount: adds.length,
      lines,
    },
  ];
}

/**
 * Build a large set of deletion lines for mass-modification tests.
 */
function makeMassDeleteHunks(
  filePath: string,
  deleteCount: number,
): DiffHunk[] {
  const removes = Array.from(
    { length: deleteCount },
    (_, i) => `deleted line ${i}`,
  );
  return makeHunks(filePath, [], removes);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RiskSignalDetector", () => {
  const detector = new RiskSignalDetector(createStubPatternLoader());

  // ---- Individual signal detection ----

  describe("detect", () => {
    it("detects security downgrade for --no-verify", () => {
      const hunks = makeHunks("scripts/deploy.sh", [
        "git commit --no-verify -m 'skip hooks'",
      ], []);

      const signals = detector.detect(hunks, "scripts/deploy.sh");

      const downgrade = signals.find((s) => s.type === "security_downgrade");
      assert.ok(downgrade, "expected a security_downgrade signal");
      assert.ok(
        downgrade.evidence.includes("--no-verify"),
        "evidence should reference --no-verify",
      );
    });

    it("detects mass modification when deletions exceed threshold", () => {
      // The detector triggers when deletions > 50 OR totalChanges > 100
      const hunks = makeMassDeleteHunks("src/big.ts", 55);
      const signals = detector.detect(hunks, "src/big.ts");

      const mass = signals.find((s) => s.type === "mass_modification");
      assert.ok(mass, "expected a mass_modification signal");
      assert.equal(mass.severity, "medium");
    });

    it("detects destructive edit when deletions > 2x additions", () => {
      // 10 additions, 25 deletions => deletions (25) > 2 * additions (20)
      const adds = Array.from({ length: 10 }, (_, i) => `new line ${i}`);
      const removes = Array.from({ length: 25 }, (_, i) => `old line ${i}`);
      const hunks = makeHunks("src/refactored.ts", adds, removes);

      const signals = detector.detect(hunks, "src/refactored.ts");

      const destructive = signals.find((s) => s.type === "destructive_edit");
      assert.ok(destructive, "expected a destructive_edit signal");
      assert.equal(destructive.severity, "high");
    });

    it("detects secret exposure for hardcoded API key", () => {
      const hunks = makeHunks("src/config.ts", [
        "const api_key = 'sk-abc123xyz';",
      ], []);

      const signals = detector.detect(hunks, "src/config.ts");

      const secret = signals.find((s) => s.type === "secret_exposure");
      assert.ok(secret, "expected a secret_exposure signal");
      assert.equal(secret.severity, "critical");
    });

    it("returns empty signals for a clean, small diff", () => {
      const hunks = makeHunks("src/clean.ts", [
        "const x = 1;",
        "const y = 2;",
      ], [
        "const x = 0;",
        "const y = 0;",
      ]);

      const signals = detector.detect(hunks, "src/clean.ts");

      // Filter out any signals — a small balanced edit to a non-config file
      // should produce no risk signals.
      assert.equal(signals.length, 0, `unexpected signals: ${JSON.stringify(signals)}`);
    });

    it("detects config tampering for .env file path", () => {
      const hunks = makeHunks(".env", [
        "DATABASE_URL=postgres://localhost/db",
      ], []);

      const signals = detector.detect(hunks, ".env");

      const tampering = signals.find((s) => s.type === "config_tampering");
      assert.ok(tampering, "expected a config_tampering signal");
      assert.equal(tampering.severity, "medium");
    });
  });

  // ---- Overall risk calculation ----

  describe("calculateOverallRisk", () => {
    it("returns 'safe' when no signals present", () => {
      const risk = detector.calculateOverallRisk([]);
      assert.equal(risk, "safe");
    });

    it("returns 'critical' when any signal is critical severity", () => {
      const signals: RiskSignal[] = [
        {
          type: "config_tampering",
          severity: "medium",
          description: "Config modified",
          evidence: ".env changed",
          remediation: "Review",
        },
        {
          type: "secret_exposure",
          severity: "critical",
          description: "Secret exposed",
          evidence: "api_key = ...",
          remediation: "Rotate credentials",
        },
        {
          type: "mass_modification",
          severity: "medium",
          description: "Mass mod",
          evidence: "100 lines",
          remediation: "Review",
        },
      ];

      const risk = detector.calculateOverallRisk(signals);
      assert.equal(risk, "critical");
    });

    it("returns highest severity from mixed signals", () => {
      const signals: RiskSignal[] = [
        {
          type: "config_tampering",
          severity: "low",
          description: "Minor config change",
          evidence: "1 line",
          remediation: "Review",
        },
        {
          type: "destructive_edit",
          severity: "high",
          description: "Large deletion",
          evidence: "50 deletions",
          remediation: "Verify intent",
        },
      ];

      const risk = detector.calculateOverallRisk(signals);
      assert.equal(risk, "high");
    });

    it("returns 'medium' when highest is medium", () => {
      const signals: RiskSignal[] = [
        {
          type: "mass_modification",
          severity: "medium",
          description: "Mass mod",
          evidence: "changes",
          remediation: "Review",
        },
      ];

      const risk = detector.calculateOverallRisk(signals);
      assert.equal(risk, "medium");
    });
  });
});
