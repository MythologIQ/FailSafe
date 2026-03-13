/**
 * RiskSignalDetector - Scans diff hunks for risk signals.
 *
 * Detects dependency hallucination, security downgrades, mass modifications,
 * destructive edits, secret exposure, and configuration tampering.
 */

import { DiffHunk, RiskSignal, RiskLevel, RiskSignalType } from './types';
import { PatternLoader } from '../PatternLoader';
import { Logger } from '../../shared/Logger';

interface AddedLine {
  content: string;
  line: number;
}

const SECURITY_BYPASS_PATTERNS: RegExp[] = [
  /--no-verify/i,
  /--insecure/i,
  /NODE_TLS_REJECT_UNAUTHORIZED/i,
  /rejectUnauthorized\s*.*false/i,
  /verify\s*.*false/i,
  /SSL_CERT_FILE/i,
  /disable\s*.*ssl/i,
  /skip\s*.*verification/i,
];

const CONFIG_FILE_PATTERNS: RegExp[] = [
  /\.env(\..+)?$/,
  /tsconfig\.json$/,
  /\.github\/workflows\//,
  /\.gitlab-ci\.yml$/,
  /Dockerfile$/,
  /docker-compose/,
];

export class RiskSignalDetector {
  private readonly logger: Logger;
  private readonly patternLoader: PatternLoader;

  constructor(patternLoader: PatternLoader) {
    this.patternLoader = patternLoader;
    this.logger = new Logger('RiskSignalDetector');
  }

  detect(hunks: DiffHunk[], filePath: string): RiskSignal[] {
    const addedLines = this.getAddedLines(hunks);
    const signals: RiskSignal[] = [
      ...this.detectDependencyHallucination(addedLines, filePath),
      ...this.detectSecurityDowngrade(addedLines),
      ...this.detectMassModification(hunks),
      ...this.detectDestructiveEdit(hunks),
      ...this.detectSecretExposure(addedLines),
      ...this.detectConfigTampering(addedLines, filePath),
    ];

    this.logger.debug(`Detected ${signals.length} risk signals`, { filePath });
    return signals;
  }

  calculateOverallRisk(signals: RiskSignal[]): RiskLevel {
    if (signals.length === 0) { return 'safe'; }

    const severityOrder: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
    for (const level of severityOrder) {
      if (signals.some(s => s.severity === level)) {
        return level;
      }
    }
    return 'safe';
  }

  private getAddedLines(hunks: DiffHunk[]): AddedLine[] {
    const added: AddedLine[] = [];
    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add') {
          added.push({ content: line.content, line: line.lineNumber });
        }
      }
    }
    return added;
  }

  private detectDependencyHallucination(
    addedLines: AddedLine[],
    filePath: string,
  ): RiskSignal[] {
    if (!filePath.endsWith('package.json')) { return []; }

    const depLinePattern = /^\s*"[^"]+"\s*:\s*"[^"]*"/;
    return addedLines
      .filter(l => depLinePattern.test(l.content))
      .map(l => this.signal(
        'dependency_hallucination', 'high', l.line,
        'Added dependency entry in package.json',
        l.content.trim(),
        'Verify package exists on npm and is intentional',
      ));
  }

  private detectSecurityDowngrade(addedLines: AddedLine[]): RiskSignal[] {
    const signals: RiskSignal[] = [];

    for (const line of addedLines) {
      for (const pattern of SECURITY_BYPASS_PATTERNS) {
        if (pattern.test(line.content)) {
          signals.push(this.signal(
            'security_downgrade', 'high', line.line,
            'Security verification bypass detected',
            line.content.trim(),
            'Review security configuration change',
          ));
          break;
        }
      }
    }

    return signals;
  }

  private detectMassModification(hunks: DiffHunk[]): RiskSignal[] {
    let additions = 0;
    let deletions = 0;

    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add') { additions++; }
        if (line.type === 'remove') { deletions++; }
      }
    }

    const totalChanges = additions + deletions;
    if (deletions <= 50 && totalChanges <= 100) { return []; }

    return [this.signal(
      'mass_modification', 'medium', undefined,
      `Mass modification: ${additions} additions, ${deletions} deletions`,
      `Total changes: ${totalChanges}`,
      'Review scope of changes - consider breaking into smaller edits',
    )];
  }

  private detectDestructiveEdit(hunks: DiffHunk[]): RiskSignal[] {
    let additions = 0;
    let deletions = 0;

    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add') { additions++; }
        if (line.type === 'remove') { deletions++; }
      }
    }

    if (deletions <= 2 * additions) { return []; }

    return [this.signal(
      'destructive_edit', 'high', undefined,
      `Destructive edit: ${deletions} deletions vs ${additions} additions`,
      `Deletion ratio: ${additions > 0 ? (deletions / additions).toFixed(1) : 'Infinity'}:1`,
      'Large deletion detected - verify no critical code removed',
    )];
  }

  private detectSecretExposure(addedLines: AddedLine[]): RiskSignal[] {
    const secretSignals = this.matchPatternCategory(
      addedLines, 'secrets', 'secret_exposure', 'critical',
    );
    const piiSignals = this.matchPatternCategory(
      addedLines, 'pii', 'secret_exposure', 'critical',
    );
    return [...secretSignals, ...piiSignals];
  }

  private detectConfigTampering(
    addedLines: AddedLine[],
    filePath: string,
  ): RiskSignal[] {
    const isPackageScripts = filePath.endsWith('package.json');
    const isConfigFile = CONFIG_FILE_PATTERNS.some(p => p.test(filePath));

    if (!isConfigFile && !isPackageScripts) { return []; }
    if (addedLines.length === 0) { return []; }

    return [this.signal(
      'config_tampering', 'medium', addedLines[0].line,
      `Configuration file modified: ${filePath.split(/[/\\]/).pop() ?? filePath}`,
      `${addedLines.length} line(s) added`,
      'Review configuration change for unintended side effects',
    )];
  }

  private matchPatternCategory(
    addedLines: AddedLine[],
    category: string,
    signalType: RiskSignalType,
    severity: RiskSignal['severity'],
  ): RiskSignal[] {
    const signals: RiskSignal[] = [];
    const patterns = this.patternLoader.getPatterns()
      .filter(p => p.category === category && p.enabled);

    for (const pattern of patterns) {
      const compiled = this.patternLoader.compilePattern(pattern);
      if (!compiled) { continue; }
      // Strip g flag — we only need boolean match, not global iteration
      const regex = new RegExp(compiled.source, compiled.flags.replace('g', ''));

      for (const line of addedLines) {
        if (regex.test(line.content)) {
          signals.push(this.signal(
            signalType, severity, line.line,
            pattern.description ?? pattern.name,
            line.content.trim(),
            signalType === 'secret_exposure'
              ? 'Remove exposed secret and rotate credentials'
              : 'Review security configuration change',
          ));
        }
      }
    }
    return signals;
  }

  private signal(
    type: RiskSignalType,
    severity: RiskSignal['severity'],
    line: number | undefined,
    description: string,
    evidence: string,
    remediation: string,
  ): RiskSignal {
    return { type, severity, description, evidence, line, remediation };
  }
}
