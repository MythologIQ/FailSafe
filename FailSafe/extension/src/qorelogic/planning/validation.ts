/**
 * Plan Validation Module
 * Provides dependency cycle detection, topological sorting, and plan structure
 * validation. Governance must refuse plans with circular dependencies.
 */
import { Plan, PlanPhase } from './types';

/** Result of plan structure validation. */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Detects dependency cycles in a list of phases using DFS.
 * @param phases - Array of plan phases to analyze
 * @returns Array of phase IDs forming a cycle (e.g., ['a', 'b', 'a']), or null if none
 */
export function detectDependencyCycles(phases: PlanPhase[]): string[] | null {
  const phaseMap = new Map<string, PlanPhase>();
  for (const phase of phases) {
    phaseMap.set(phase.id, phase);
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  for (const phase of phases) {
    const cycle = dfsDetectCycle(phase.id, phaseMap, visited, recursionStack, path);
    if (cycle) {
      return cycle;
    }
  }

  return null;
}

/** DFS helper for cycle detection. */
function dfsDetectCycle(
  nodeId: string,
  phaseMap: Map<string, PlanPhase>,
  visited: Set<string>,
  recursionStack: Set<string>,
  path: string[]
): string[] | null {
  if (recursionStack.has(nodeId)) {
    const cycleStart = path.indexOf(nodeId);
    return [...path.slice(cycleStart), nodeId];
  }

  if (visited.has(nodeId)) {
    return null;
  }

  const phase = phaseMap.get(nodeId);
  if (!phase) {
    return null;
  }

  visited.add(nodeId);
  recursionStack.add(nodeId);
  path.push(nodeId);

  for (const depId of phase.dependencies) {
    const cycle = dfsDetectCycle(depId, phaseMap, visited, recursionStack, path);
    if (cycle) {
      return cycle;
    }
  }

  path.pop();
  recursionStack.delete(nodeId);

  return null;
}

/**
 * Performs topological sort on phases based on dependencies.
 * Returns phases in execution order (dependencies before dependents).
 * @param phases - Array of plan phases to sort
 * @returns Phases in dependency order
 * @throws Error if a dependency cycle is detected
 */
export function topologicalSort(phases: PlanPhase[]): PlanPhase[] {
  const cycle = detectDependencyCycles(phases);
  if (cycle) {
    throw new Error(`Dependency cycle detected: ${cycle.join(' -> ')}`);
  }

  const phaseMap = new Map<string, PlanPhase>();
  for (const phase of phases) {
    phaseMap.set(phase.id, phase);
  }

  const visited = new Set<string>();
  const result: PlanPhase[] = [];

  for (const phase of phases) {
    topologicalVisit(phase.id, phaseMap, visited, result);
  }

  return result;
}

/** DFS helper for topological sort. */
function topologicalVisit(
  nodeId: string,
  phaseMap: Map<string, PlanPhase>,
  visited: Set<string>,
  result: PlanPhase[]
): void {
  if (visited.has(nodeId)) {
    return;
  }

  const phase = phaseMap.get(nodeId);
  if (!phase) {
    return;
  }

  visited.add(nodeId);

  for (const depId of phase.dependencies) {
    topologicalVisit(depId, phaseMap, visited, result);
  }

  result.push(phase);
}

/** Validates required plan-level fields. */
function validatePlanFields(plan: Plan, errors: string[]): void {
  if (!plan.id) {
    errors.push('Plan must have an id');
  }
  if (!plan.title) {
    errors.push('Plan must have a title');
  }
  if (!plan.intentId) {
    errors.push('Plan must have an intentId');
  }
}

/** Collects phase IDs, checking for duplicates and missing IDs. */
function collectPhaseIds(phases: PlanPhase[], errors: string[]): Set<string> {
  const phaseIds = new Set<string>();
  for (const phase of phases) {
    if (!phase.id) {
      errors.push('All phases must have an id');
      continue;
    }
    if (phaseIds.has(phase.id)) {
      errors.push(`Duplicate phase id: ${phase.id}`);
    }
    phaseIds.add(phase.id);
  }
  return phaseIds;
}

/** Validates phase structure and dependencies. */
function validatePhases(phases: PlanPhase[], phaseIds: Set<string>, errors: string[]): void {
  for (const phase of phases) {
    if (!phase.id) {
      continue;
    }
    if (!phase.title) {
      errors.push(`Phase ${phase.id} must have a title`);
    }
    for (const depId of phase.dependencies || []) {
      if (!phaseIds.has(depId)) {
        errors.push(`Phase ${phase.id} has unknown dependency: ${depId}`);
      }
    }
  }
}

/** Validates blockers and risks reference valid phases. */
function validateReferences(plan: Plan, phaseIds: Set<string>, errors: string[]): void {
  if (plan.currentPhaseId && !phaseIds.has(plan.currentPhaseId)) {
    errors.push(`currentPhaseId references unknown phase: ${plan.currentPhaseId}`);
  }
  for (const blocker of plan.blockers || []) {
    if (!phaseIds.has(blocker.phaseId)) {
      errors.push(`Blocker ${blocker.id} references unknown phase: ${blocker.phaseId}`);
    }
    if (blocker.detourPhaseId && !phaseIds.has(blocker.detourPhaseId)) {
      errors.push(`Blocker ${blocker.id} has unknown detour phase: ${blocker.detourPhaseId}`);
    }
  }
  for (const risk of plan.risks || []) {
    if (!phaseIds.has(risk.phaseId)) {
      errors.push(`Risk ${risk.id} references unknown phase: ${risk.phaseId}`);
    }
  }
}

/**
 * Validates the structure of a plan.
 * Checks for required fields, valid phase references, dependency cycles, and currentPhaseId.
 * @param plan - The plan to validate
 * @returns Validation result with isValid flag and error messages
 */
export function validatePlanStructure(plan: Plan): ValidationResult {
  const errors: string[] = [];

  validatePlanFields(plan, errors);

  if (!plan.phases || plan.phases.length === 0) {
    errors.push('Plan must have at least one phase');
    return { isValid: false, errors };
  }

  const phaseIds = collectPhaseIds(plan.phases, errors);
  validatePhases(plan.phases, phaseIds, errors);

  const cycle = detectDependencyCycles(plan.phases);
  if (cycle) {
    errors.push(`Dependency cycle detected: ${cycle.join(' -> ')}`);
  }

  validateReferences(plan, phaseIds, errors);

  return { isValid: errors.length === 0, errors };
}
