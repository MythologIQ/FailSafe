/**
 * DiffGuardService - Orchestration service for risk-aware change preview.
 *
 * Connects Sentinel verdict pipeline to DiffGuard analysis and UI.
 * Subscribes to sentinel verdicts, runs diff analysis with risk detection,
 * and emits results for the DiffGuard panel to render.
 */

import { DiffAnalyzer } from './DiffAnalyzer';
import { RiskSignalDetector } from './RiskSignalDetector';
import { EventBus } from '../../shared/EventBus';
import { Logger } from '../../shared/Logger';
import type { DiffAnalysis, DiffGuardAction, DiffGuardDecision } from './types';
import type { SentinelVerdict, FailSafeEventType } from '../../shared/types';

const DECISION_EVENT_MAP: Record<DiffGuardDecision, FailSafeEventType> = {
  approve: 'diffguard.approved',
  reject: 'diffguard.rejected',
  modify_prompt: 'diffguard.modifyPrompt',
};

export class DiffGuardService {
  private readonly diffAnalyzer: DiffAnalyzer;
  private readonly riskSignalDetector: RiskSignalDetector;
  private readonly eventBus: EventBus;
  private readonly logger: Logger;
  private readonly unsubscribe: () => void;

  constructor(
    diffAnalyzer: DiffAnalyzer,
    riskSignalDetector: RiskSignalDetector,
    eventBus: EventBus,
  ) {
    this.diffAnalyzer = diffAnalyzer;
    this.riskSignalDetector = riskSignalDetector;
    this.eventBus = eventBus;
    this.logger = new Logger('DiffGuardService');

    this.unsubscribe = this.eventBus.on('sentinel.verdict', (event) => {
      this.handleVerdict(event.payload as SentinelVerdict);
    });
  }

  private async handleVerdict(verdict: SentinelVerdict): Promise<void> {
    if (!verdict.artifactPath) {
      return;
    }

    if (verdict.decision === 'PASS' && verdict.riskGrade === 'L1') {
      return;
    }

    await this.analyzeChange(verdict);
  }

  private async analyzeChange(verdict: SentinelVerdict): Promise<void> {
    try {
      const analysis = await this.diffAnalyzer.analyzePath(verdict.artifactPath!);
      const signals = this.riskSignalDetector.detect(
        analysis.hunks,
        verdict.artifactPath!,
      );

      analysis.riskSignals = signals;
      analysis.overallRisk = this.riskSignalDetector.calculateOverallRisk(signals);
      analysis.agentDid = verdict.agentDid;

      if (signals.length === 0 && verdict.riskGrade === 'L1') {
        return;
      }

      this.eventBus.emit('diffguard.analysisReady', analysis);
    } catch (err) {
      this.logger.error('Failed to analyze change', err);
    }
  }

  async recordDecision(action: DiffGuardAction): Promise<void> {
    const eventType = DECISION_EVENT_MAP[action.decision];
    this.eventBus.emit(eventType, action);
    this.logger.info(`Decision recorded: ${action.decision}`, {
      filePath: action.analysis.filePath,
      agentDid: action.agentDid,
    });
  }

  dispose(): void {
    this.unsubscribe();
  }
}
