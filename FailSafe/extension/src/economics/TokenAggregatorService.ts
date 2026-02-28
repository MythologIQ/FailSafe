/**
 * TokenAggregatorService — core token economics aggregation.
 *
 * Listens to EventBus for prompt.dispatch / prompt.response events,
 * maintains rolling daily aggregates, and exposes an API-first
 * interface designed for seamless service extraction.
 *
 * ZERO vscode dependencies. Pure Node + EventBus.
 */

import { EventBus } from "../shared/EventBus";
import { EconomicsPersistence } from "./EconomicsPersistence";
import { calculateSavings } from "./CostCalculator";
import {
  DailyAggregate,
  EconomicsSnapshot,
  PromptDispatchPayload,
  PromptResponsePayload,
} from "./types";

const FLUSH_INTERVAL_MS = 30_000;
const ROLLING_WINDOW_DAYS = 30;
const FULL_CONTEXT_ESTIMATE = 8000;

export class TokenAggregatorService {
  private readonly eventBus: EventBus;
  private readonly persistence: EconomicsPersistence;
  private readonly unsubscribes: (() => void)[] = [];
  private readonly dailyMap: Map<string, DailyAggregate> = new Map();
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(eventBus: EventBus, workspaceRoot: string) {
    this.eventBus = eventBus;
    this.persistence = new EconomicsPersistence(workspaceRoot);
    this.hydrate();
    this.subscribe();
    this.startFlushTimer();
  }

  /** API-first: returns the full economics snapshot */
  getSnapshot(): EconomicsSnapshot {
    const aggregates = this.getSortedAggregates();
    const weekly = this.computeWeeklyTotals(aggregates);
    const totalRag = aggregates.reduce((s, d) => s + d.ragPrompts, 0);
    const totalFull = aggregates.reduce((s, d) => s + d.fullPrompts, 0);
    const total = totalRag + totalFull;

    return {
      weeklyTokensSaved: weekly.tokensSaved,
      weeklyCostSaved: weekly.costSaved,
      contextSyncRatio: total > 0 ? totalRag / total : 0,
      dailyAggregates: aggregates,
      lastUpdated: new Date().toISOString(),
    };
  }

  /** API-first: weekly summary for hero metric */
  getWeeklySummary(): {
    tokensSaved: number;
    costSaved: number;
    ratio: number;
  } {
    const snapshot = this.getSnapshot();
    return {
      tokensSaved: snapshot.weeklyTokensSaved,
      costSaved: snapshot.weeklyCostSaved,
      ratio: snapshot.contextSyncRatio,
    };
  }

  /** API-first: daily trend for the bar chart */
  getDailyTrend(days: number = ROLLING_WINDOW_DAYS): DailyAggregate[] {
    return this.getSortedAggregates().slice(-days);
  }

  dispose(): void {
    this.unsubscribes.forEach((fn) => fn());
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush();
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private hydrate(): void {
    const saved = this.persistence.load();
    if (!saved) return;
    for (const agg of saved.dailyAggregates) {
      this.dailyMap.set(agg.date, agg);
    }
  }

  private subscribe(): void {
    this.unsubscribes.push(
      this.eventBus.on("prompt.dispatch", (event) => {
        this.handleDispatch(event.payload as PromptDispatchPayload);
      }),
      this.eventBus.on("prompt.response", (event) => {
        this.handleResponse(event.payload as PromptResponsePayload);
      }),
    );
  }

  private handleDispatch(payload: PromptDispatchPayload): void {
    const day = this.getOrCreateDay(this.todayKey());
    day.totalDispatched += payload.tokenCount;
    if (payload.contextSource === "rag") {
      day.ragPrompts++;
      const saved = FULL_CONTEXT_ESTIMATE - payload.tokenCount;
      if (saved > 0) {
        day.tokensSaved += saved;
        day.costSaved += calculateSavings(
          FULL_CONTEXT_ESTIMATE,
          payload.tokenCount,
          payload.model,
        );
      }
    } else {
      day.fullPrompts++;
    }
  }

  private handleResponse(payload: PromptResponsePayload): void {
    const day = this.getOrCreateDay(this.todayKey());
    day.totalReceived += payload.tokenCount;
  }

  private getOrCreateDay(key: string): DailyAggregate {
    if (!this.dailyMap.has(key)) {
      this.dailyMap.set(key, {
        date: key,
        totalDispatched: 0,
        totalReceived: 0,
        tokensSaved: 0,
        ragPrompts: 0,
        fullPrompts: 0,
        costSaved: 0,
      });
    }
    return this.dailyMap.get(key)!;
  }

  private getSortedAggregates(): DailyAggregate[] {
    return [...this.dailyMap.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-ROLLING_WINDOW_DAYS);
  }

  private computeWeeklyTotals(aggregates: DailyAggregate[]): {
    tokensSaved: number;
    costSaved: number;
  } {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().slice(0, 10);

    return aggregates
      .filter((d) => d.date >= cutoff)
      .reduce(
        (acc, d) => ({
          tokensSaved: acc.tokensSaved + d.tokensSaved,
          costSaved: acc.costSaved + d.costSaved,
        }),
        { tokensSaved: 0, costSaved: 0 },
      );
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  private flush(): void {
    this.persistence.save(this.getSnapshot());
  }
}
