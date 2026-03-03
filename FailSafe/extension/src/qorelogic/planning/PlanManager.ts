/**
 * PlanManager - Event-sourced Plan Management with YAML Persistence
 */
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Plan, PlanPhase, Blocker, Milestone, RiskLevel, RiskMarker, Sprint, SprintMetrics, CumulativeRoadmap } from './types';
import { EventBus } from '../../shared/EventBus';

export type PlanEventType =
  | 'plan.created' | 'artifact.touched' | 'blocker.added'
  | 'blocker.resolved' | 'blocker.approval.requested' | 'phase.skipped' | 'phase.started'
  | 'milestone.added' | 'milestone.completed' | 'risk.identified' | 'risk.updated'
  | 'sprint.started' | 'sprint.completed' | 'sprint.archived';

export interface PlanEvent {
  id: string;
  planId: string;
  type: PlanEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

function now(): string { return new Date().toISOString(); }
function generateId(): string { return crypto.randomUUID(); }

export class PlanManager {
  private events: Map<string, PlanEvent[]> = new Map();
  private plans: Map<string, Plan> = new Map();
  private eventBus: EventBus;
  private storagePath: string;
  private roadmapPath: string;
  private roadmap: CumulativeRoadmap | null = null;

  constructor(workspaceRoot: string, eventBus: EventBus) {
    this.eventBus = eventBus;
    this.storagePath = path.join(workspaceRoot, '.failsafe', 'plans.yaml');
    this.roadmapPath = path.join(workspaceRoot, '.qorelogic', 'roadmap.yaml');
    this.loadFromDisk();
    this.loadRoadmapFromDisk();
  }

  createPlan(intentId: string, title: string, phases: PlanPhase[]): Plan {
    const planId = generateId();
    const event: PlanEvent = {
      id: generateId(), planId, type: 'plan.created', timestamp: now(),
      payload: { intentId, title, phases }
    };
    this.appendEvent(planId, event);
    return this.getPlan(planId)!;
  }

  recordArtifactTouch(
    planId: string, phaseId: string, artifactPath: string,
    op: 'write' | 'create' | 'delete' | 'rename'
  ): void {
    const event: PlanEvent = {
      id: generateId(), planId, type: 'artifact.touched', timestamp: now(),
      payload: { phaseId, path: artifactPath, op }
    };
    this.appendEvent(planId, event);
  }

  addBlocker(planId: string, phaseId: string, reason: string): void {
    const event: PlanEvent = {
      id: generateId(), planId, type: 'blocker.added', timestamp: now(),
      payload: { blockerId: generateId(), phaseId, reason }
    };
    this.appendEvent(planId, event);
  }

  resolveBlocker(planId: string, blockerId: string): void {
    const event: PlanEvent = {
      id: generateId(), planId, type: 'blocker.resolved', timestamp: now(),
      payload: { blockerId }
    };
    this.appendEvent(planId, event);
  }

  requestBlockerApproval(planId: string, blockerId: string): void {
    const blocker = this.getBlocker(planId, blockerId);
    if (!blocker) { return; }
    const event: PlanEvent = {
      id: generateId(), planId, type: 'blocker.approval.requested', timestamp: now(),
      payload: { blockerId, phaseId: blocker.phaseId }
    };
    this.appendEvent(planId, event);
  }

  takeDetour(planId: string, blockerId: string): void {
    const blocker = this.getBlocker(planId, blockerId);
    if (!blocker || !blocker.detourPhaseId) { return; }
    this.appendEvent(planId, {
      id: generateId(), planId, type: 'phase.skipped', timestamp: now(),
      payload: { phaseId: blocker.phaseId, reason: 'detour' }
    });
    this.appendEvent(planId, {
      id: generateId(), planId, type: 'phase.started', timestamp: now(),
      payload: { phaseId: blocker.detourPhaseId }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Milestone Methods (v3.0.0)
  // ─────────────────────────────────────────────────────────────────────────────

  addMilestone(planId: string, phaseId: string, title: string, targetDate?: string, icon?: string): void {
    const event: PlanEvent = {
      id: generateId(), planId, type: 'milestone.added', timestamp: now(),
      payload: { milestoneId: generateId(), phaseId, title, targetDate, icon }
    };
    this.appendEvent(planId, event);
  }

  completeMilestone(planId: string, milestoneId: string): void {
    const event: PlanEvent = {
      id: generateId(), planId, type: 'milestone.completed', timestamp: now(),
      payload: { milestoneId }
    };
    this.appendEvent(planId, event);
  }

  getMilestones(planId: string): Milestone[] {
    return this.plans.get(planId)?.milestones || [];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Risk Methods (v3.0.0)
  // ─────────────────────────────────────────────────────────────────────────────

  identifyRisk(
    planId: string, phaseId: string, title: string,
    level: RiskLevel, description: string, mitigations?: string[]
  ): void {
    const event: PlanEvent = {
      id: generateId(), planId, type: 'risk.identified', timestamp: now(),
      payload: { riskId: generateId(), phaseId, title, level, description, mitigations: mitigations || [] }
    };
    this.appendEvent(planId, event);
  }

  updateRisk(planId: string, riskId: string, level: RiskLevel, description?: string): void {
    const event: PlanEvent = {
      id: generateId(), planId, type: 'risk.updated', timestamp: now(),
      payload: { riskId, level, description }
    };
    this.appendEvent(planId, event);
  }

  getRisks(planId: string): RiskMarker[] {
    return this.plans.get(planId)?.risks || [];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Sprint Methods (v3.1.0 Cumulative Roadmap)
  // ─────────────────────────────────────────────────────────────────────────────

  getAllPlans(): Plan[] {
    return Array.from(this.plans.values());
  }

  getAllSprints(): Sprint[] {
    return this.roadmap?.sprints || [];
  }

  getCurrentSprint(): Sprint | undefined {
    return this.roadmap?.sprints.find(s => s.status === 'active');
  }

  getSprint(sprintId: string): Sprint | undefined {
    return this.roadmap?.sprints.find(s => s.id === sprintId);
  }

  startSprint(name: string, planId: string): Sprint {
    const currentSprint = this.getCurrentSprint();
    if (currentSprint) {
      this.archiveSprint(currentSprint.id);
    }

    const sprint: Sprint = {
      id: generateId(),
      name,
      planId,
      status: 'active',
      startedAt: now(),
      metrics: {
        phasesPlanned: 0, phasesCompleted: 0, phasesSkipped: 0,
        blockersEncountered: 0, blockersResolved: 0,
        risksIdentified: 0, milestonesAchieved: 0
      }
    };
    this.appendSprintEvent('sprint.started', sprint as unknown as Record<string, unknown>);
    return sprint;
  }

  completeSprint(sprintId: string): void {
    this.appendSprintEvent('sprint.completed', { sprintId });
  }

  archiveSprint(sprintId: string): void {
    const sprint = this.getSprint(sprintId);
    if (!sprint) { return; }

    if (sprint.status === 'active') {
      this.completeSprint(sprintId);
    }

    this.appendSprintEvent('sprint.archived', { sprintId });
  }

  private appendSprintEvent(
    type: 'sprint.started' | 'sprint.completed' | 'sprint.archived',
    payload: Record<string, unknown>
  ): void {
    if (!this.roadmap) {
      this.roadmap = {
        projectId: generateId(),
        projectName: 'FailSafe',
        sprints: [],
        currentSprintId: null,
        createdAt: now(),
        updatedAt: now()
      };
    }

    // Apply event to roadmap state
    if (type === 'sprint.started') {
      const sprint = payload as unknown as Sprint;
      this.roadmap.sprints.push(sprint);
      this.roadmap.currentSprintId = sprint.id;
    } else if (type === 'sprint.completed') {
      const sprint = this.roadmap.sprints.find(s => s.id === payload.sprintId);
      if (sprint) {
        sprint.status = 'completed';
        sprint.completedAt = now();
        sprint.metrics = this.calculateSprintMetrics(sprint.planId);
      }
      if (this.roadmap.currentSprintId === payload.sprintId) {
        this.roadmap.currentSprintId = null;
      }
    } else if (type === 'sprint.archived') {
      const sprint = this.roadmap.sprints.find(s => s.id === payload.sprintId);
      if (sprint) {
        if (!sprint.completedAt) {
          sprint.completedAt = now();
        }
        sprint.metrics = this.calculateSprintMetrics(sprint.planId);
        sprint.status = 'archived';
        sprint.archivedAt = now();
      }
      if (this.roadmap.currentSprintId === payload.sprintId) {
        this.roadmap.currentSprintId = null;
      }
    }

    this.roadmap.updatedAt = now();
    this.saveRoadmapToDisk();
    this.eventBus.emit('genesis.streamEvent' as never, { sprintEvent: { type, payload } });
  }

  getPlan(planId: string): Plan | undefined { return this.plans.get(planId); }

  getActivePlan(): Plan | undefined {
    const plans = Array.from(this.plans.values());
    for (const plan of plans) {
      if (plan.phases.some(p => p.status === 'active')) { return plan; }
    }
    return undefined;
  }

  getPlanProgress(planId: string): { completed: number; total: number; blocked: boolean } {
    const plan = this.plans.get(planId);
    if (!plan) { return { completed: 0, total: 0, blocked: false }; }
    return {
      completed: plan.phases.filter(p => p.status === 'completed').length,
      total: plan.phases.length,
      blocked: plan.blockers.some(b => !b.resolvedAt)
    };
  }

  private getBlocker(planId: string, blockerId: string): Blocker | undefined {
    return this.plans.get(planId)?.blockers.find(b => b.id === blockerId);
  }

  private appendEvent(planId: string, event: PlanEvent): void {
    if (!this.events.has(planId)) { this.events.set(planId, []); }
    this.events.get(planId)!.push(event);
    this.deriveState(planId);
    this.saveToDisk();
    this.eventBus.emit('genesis.streamEvent' as never, { planEvent: event });
  }

  private deriveState(planId: string): void {
    const events = this.events.get(planId) || [];
    if (events.length === 0) { return; }
    let plan: Plan | null = null;
    for (const event of events) { plan = this.applyEvent(plan, event); }
    if (plan) { this.plans.set(planId, plan); }
  }

  private applyEvent(plan: Plan | null, event: PlanEvent): Plan | null {
    const p = event.payload as Record<string, unknown>;
    switch (event.type) {
      case 'plan.created': {
        const createdPhases = (p.phases as PlanPhase[]) || [];
        return {
          id: event.planId, intentId: p.intentId as string, title: p.title as string,
          phases: createdPhases.map((ph: PlanPhase) => ({ ...ph, status: ph.status || 'pending' })),
          blockers: [], risks: [], milestones: [],
          currentPhaseId: createdPhases.length > 0 ? createdPhases[0].id : '',
          createdAt: event.timestamp, updatedAt: event.timestamp
        };
      }
      case 'artifact.touched': {
        if (!plan) { return null; }
        const phaseId = p.phaseId as string;
        const artifactPath = p.path as string;
        const phase = plan.phases.find(ph => ph.id === phaseId);
        if (phase) {
          const artifact = phase.artifacts.find(a => a.path === artifactPath);
          if (artifact) { artifact.touched = true; }
        }
        plan.updatedAt = event.timestamp;
        return plan;
      }
      case 'blocker.added': {
        if (!plan) { return null; }
        const blockerId = p.blockerId as string;
        const phaseId = p.phaseId as string;
        const reason = p.reason as string;
        plan.blockers.push({
          id: blockerId, phaseId, title: reason, reason,
          severity: 'hard', createdAt: event.timestamp
        });
        const blockedPhase = plan.phases.find(ph => ph.id === phaseId);
        if (blockedPhase) { blockedPhase.status = 'blocked'; }
        plan.updatedAt = event.timestamp;
        return plan;
      }
      case 'blocker.resolved': {
        if (!plan) { return null; }
        const blockerId = p.blockerId as string;
        const blocker = plan.blockers.find(b => b.id === blockerId);
        if (blocker) {
          blocker.resolvedAt = event.timestamp;
          const ph = plan.phases.find(x => x.id === blocker.phaseId);
          if (ph && ph.status === 'blocked') { ph.status = 'active'; }
        }
        plan.updatedAt = event.timestamp;
        return plan;
      }
      case 'phase.skipped': {
        if (!plan) { return null; }
        const phaseId = p.phaseId as string;
        const skippedPhase = plan.phases.find(ph => ph.id === phaseId);
        if (skippedPhase) { skippedPhase.status = 'skipped'; }
        plan.updatedAt = event.timestamp;
        return plan;
      }
      case 'phase.started': {
        if (!plan) { return null; }
        const phaseId = p.phaseId as string;
        const startedPhase = plan.phases.find(ph => ph.id === phaseId);
        if (startedPhase) {
          startedPhase.status = 'active';
          plan.currentPhaseId = phaseId;
        }
        plan.updatedAt = event.timestamp;
        return plan;
      }

      // ─────────────────────────────────────────────────────────────────────────
      // Milestone Events (v3.0.0)
      // ─────────────────────────────────────────────────────────────────────────
      case 'milestone.added':
        if (!plan) { return null; }
        plan.milestones.push({
          id: p.milestoneId as string, phaseId: p.phaseId as string, title: p.title as string,
          targetDate: p.targetDate as string | undefined, icon: p.icon as string | undefined
        });
        plan.updatedAt = event.timestamp;
        return plan;

      case 'milestone.completed': {
        if (!plan) { return null; }
        const milestoneId = p.milestoneId as string;
        const milestone = plan.milestones.find(m => m.id === milestoneId);
        if (milestone) { milestone.completedAt = event.timestamp; }
        plan.updatedAt = event.timestamp;
        return plan;
      }

      // ─────────────────────────────────────────────────────────────────────────
      // Risk Events (v3.0.0)
      // ─────────────────────────────────────────────────────────────────────────
      case 'risk.identified':
        if (!plan) { return null; }
        plan.risks.push({
          id: p.riskId as string, phaseId: p.phaseId as string, title: p.title as string,
          level: p.level as RiskLevel, description: p.description as string,
          mitigations: (p.mitigations as string[]) || [], createdAt: event.timestamp
        });
        plan.updatedAt = event.timestamp;
        return plan;

      case 'risk.updated': {
        if (!plan) { return null; }
        const riskId = p.riskId as string;
        const risk = plan.risks.find(r => r.id === riskId);
        if (risk) {
          risk.level = p.level as RiskLevel;
          if (p.description) { risk.description = p.description as string; }
          risk.updatedAt = event.timestamp;
        }
        plan.updatedAt = event.timestamp;
        return plan;
      }

      default:
        return plan;
    }
  }

  private loadFromDisk(): void {
    if (!fs.existsSync(this.storagePath)) { return; }
    try {
      const content = fs.readFileSync(this.storagePath, 'utf8');
      const data = yaml.load(content) as { events: Record<string, PlanEvent[]> } | null;
      if (data?.events) {
        for (const [planId, planEvents] of Object.entries(data.events)) {
          this.events.set(planId, planEvents);
          this.deriveState(planId);
        }
      }
    } catch { /* Ignore load errors */ }
  }

  private saveToDisk(): void {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
    const data = { events: Object.fromEntries(this.events) };
    fs.writeFileSync(this.storagePath, yaml.dump(data), 'utf8');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Roadmap Persistence (v3.1.0)
  // ─────────────────────────────────────────────────────────────────────────────

  private loadRoadmapFromDisk(): void {
    if (!fs.existsSync(this.roadmapPath)) { return; }
    try {
      const content = fs.readFileSync(this.roadmapPath, 'utf8');
      const data = yaml.load(content) as CumulativeRoadmap | null;
      if (data) { this.roadmap = data; }
    } catch { /* Ignore load errors */ }
  }

  private saveRoadmapToDisk(): void {
    if (!this.roadmap) { return; }
    const dir = path.dirname(this.roadmapPath);
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
    fs.writeFileSync(this.roadmapPath, yaml.dump(this.roadmap), 'utf8');
  }

  private calculateSprintMetrics(planId: string): SprintMetrics {
    const plan = this.getPlan(planId);
    if (!plan) {
      return {
        phasesPlanned: 0,
        phasesCompleted: 0,
        phasesSkipped: 0,
        blockersEncountered: 0,
        blockersResolved: 0,
        risksIdentified: 0,
        milestonesAchieved: 0
      };
    }

    return {
      phasesPlanned: plan.phases.length,
      phasesCompleted: plan.phases.filter(p => p.status === 'completed').length,
      phasesSkipped: plan.phases.filter(p => p.status === 'skipped').length,
      blockersEncountered: plan.blockers.length,
      blockersResolved: plan.blockers.filter(b => !!b.resolvedAt).length,
      risksIdentified: plan.risks.length,
      milestonesAchieved: plan.milestones.filter(m => !!m.completedAt).length
    };
  }
}
