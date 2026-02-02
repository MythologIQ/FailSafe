import { ConfidenceLevel, NoveltyLevel } from "./EvaluationRouter";

export interface NoveltyAccuracyMetrics {
  totalEvaluations: number;
  lowCount: number;
  mediumCount: number;
  highCount: number;
  averageConfidence: number;
}

export class NoveltyAccuracyMonitor {
  private metrics: NoveltyAccuracyMetrics = {
    totalEvaluations: 0,
    lowCount: 0,
    mediumCount: 0,
    highCount: 0,
    averageConfidence: 0,
  };

  recordEvaluation(novelty: NoveltyLevel, confidence: ConfidenceLevel): void {
    this.metrics.totalEvaluations += 1;

    if (novelty === "low") this.metrics.lowCount += 1;
    if (novelty === "medium") this.metrics.mediumCount += 1;
    if (novelty === "high") this.metrics.highCount += 1;

    const confidenceScore = this.confidenceToScore(confidence);
    const n = this.metrics.totalEvaluations;
    this.metrics.averageConfidence =
      (this.metrics.averageConfidence * (n - 1) + confidenceScore) / n;
  }

  getMetrics(): NoveltyAccuracyMetrics {
    return { ...this.metrics };
  }

  private confidenceToScore(confidence: ConfidenceLevel): number {
    switch (confidence) {
      case "high":
        return 1.0;
      case "medium":
        return 0.5;
      case "low":
        return 0.0;
    }
  }
}
