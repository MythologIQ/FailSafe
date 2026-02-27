/**
 * CostCalculator — token-to-dollar conversion logic.
 *
 * Pure functions, zero vscode dependencies.
 */

import { DEFAULT_MODEL_PRICING, ModelPricing } from "./types";

function resolvePricing(model: string): ModelPricing {
  return DEFAULT_MODEL_PRICING[model] ?? DEFAULT_MODEL_PRICING["default"];
}

/** Calculate cost in dollars for a given token count and model */
export function calculateCost(
  tokens: number,
  model: string,
  direction: "input" | "output",
): number {
  const pricing = resolvePricing(model);
  const rate =
    direction === "input" ? pricing.inputPerMillion : pricing.outputPerMillion;
  return (tokens / 1_000_000) * rate;
}

/** Calculate dollar savings from using RAG vs full context */
export function calculateSavings(
  fullTokens: number,
  ragTokens: number,
  model: string,
): number {
  const pricing = resolvePricing(model);
  const delta = fullTokens - ragTokens;
  if (delta <= 0) return 0;
  return (delta / 1_000_000) * pricing.inputPerMillion;
}

/** Format a dollar amount for display */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
