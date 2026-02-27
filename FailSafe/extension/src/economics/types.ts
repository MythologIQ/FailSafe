/**
 * Token Economics type definitions.
 *
 * Pure value types with zero vscode dependencies.
 * Designed as a generic JSON schema for API-first consumption.
 */

/** Payload for prompt.dispatch events */
export interface PromptDispatchPayload {
  tokenCount: number;
  model: string;
  contextSource: "full" | "rag";
}

/** Payload for prompt.response events */
export interface PromptResponsePayload {
  tokenCount: number;
  model: string;
  latencyMs: number;
}

/** Aggregated metrics for a single calendar day */
export interface DailyAggregate {
  date: string;
  totalDispatched: number;
  totalReceived: number;
  tokensSaved: number;
  ragPrompts: number;
  fullPrompts: number;
  costSaved: number;
}

/** The top-level economics snapshot — the API response shape */
export interface EconomicsSnapshot {
  weeklyTokensSaved: number;
  weeklyCostSaved: number;
  contextSyncRatio: number;
  dailyAggregates: DailyAggregate[];
  lastUpdated: string;
}

/** Pricing per million tokens for a model */
export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

/** Default model pricing map ($/million tokens) */
export const DEFAULT_MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-sonnet": { inputPerMillion: 3, outputPerMillion: 15 },
  "claude-opus": { inputPerMillion: 15, outputPerMillion: 75 },
  "claude-haiku": { inputPerMillion: 0.25, outputPerMillion: 1.25 },
  "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10 },
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  default: { inputPerMillion: 3, outputPerMillion: 15 },
};
