/**
 * Capability-Based Access Control for FailSafe Extension
 *
 * Provides:
 * - Per-persona capability definitions
 * - Capability enforcement checks
 * - Action authorization
 */

import { PersonaType } from '../types';

// =============================================================================
// CAPABILITY DEFINITIONS
// =============================================================================

/**
 * Available capabilities in the system
 */
export type Capability =
    // Code Operations
    | 'submit_code'
    | 'audit_code'
    | 'modify_code'
    // Trust Operations
    | 'view_own_trust'
    | 'view_all_trust'
    | 'update_trust'
    | 'quarantine_agent'
    | 'release_quarantine'
    // Ledger Operations
    | 'view_ledger'
    | 'append_ledger'
    // L3 Review Operations
    | 'queue_l3'
    | 'review_l3'
    | 'approve_l3'
    | 'reject_l3'
    // Shadow Genome Operations
    | 'view_shadow_genome'
    | 'archive_failure'
    | 'update_remediation'
    // Administrative Operations
    | 'register_agent'
    | 'modify_policy'
    | 'view_config'
    | 'modify_config';

/**
 * Capability matrix per persona
 */
export const PERSONA_CAPABILITIES: Record<PersonaType, Capability[]> = {
    scrivener: [
        // Scrivener: The basic agent that writes code
        'submit_code',
        'view_own_trust',
        'view_ledger',
        'queue_l3',
        'view_shadow_genome'
    ],
    sentinel: [
        // Sentinel: The automated auditor/monitor
        'audit_code',
        'view_own_trust',
        'view_all_trust',
        'update_trust',
        'quarantine_agent',
        'release_quarantine',
        'view_ledger',
        'append_ledger',
        'queue_l3',
        'view_shadow_genome',
        'archive_failure',
        'update_remediation'
    ],
    judge: [
        // Judge: The L3 reviewer
        'audit_code',
        'view_own_trust',
        'view_all_trust',
        'view_ledger',
        'append_ledger',
        'review_l3',
        'approve_l3',
        'reject_l3',
        'view_shadow_genome',
        'update_remediation'
    ],
    overseer: [
        // Overseer: Human administrator with full access
        'submit_code',
        'audit_code',
        'modify_code',
        'view_own_trust',
        'view_all_trust',
        'update_trust',
        'quarantine_agent',
        'release_quarantine',
        'view_ledger',
        'append_ledger',
        'queue_l3',
        'review_l3',
        'approve_l3',
        'reject_l3',
        'view_shadow_genome',
        'archive_failure',
        'update_remediation',
        'register_agent',
        'modify_policy',
        'view_config',
        'modify_config'
    ]
};

// =============================================================================
// CAPABILITY CHECKS
// =============================================================================

export interface CapabilityCheckResult {
    allowed: boolean;
    capability: Capability;
    persona: PersonaType;
    reason?: string;
}

/**
 * Check if a persona has a specific capability
 */
export function hasCapability(persona: PersonaType, capability: Capability): boolean {
    const capabilities = PERSONA_CAPABILITIES[persona];
    return capabilities?.includes(capability) ?? false;
}

/**
 * Check if an action is allowed for a persona
 */
export function checkCapability(
    persona: PersonaType,
    capability: Capability
): CapabilityCheckResult {
    const allowed = hasCapability(persona, capability);
    
    return {
        allowed,
        capability,
        persona,
        reason: allowed ? undefined : `Persona '${persona}' does not have capability '${capability}'`
    };
}

/**
 * Get all capabilities for a persona
 */
export function getCapabilities(persona: PersonaType): Capability[] {
    return PERSONA_CAPABILITIES[persona] || [];
}

/**
 * Check if a persona can perform an action on another persona
 * (e.g., sentinel updating trust on scrivener)
 */
export function canActOnAgent(
    actorPersona: PersonaType,
    targetPersona: PersonaType,
    capability: Capability
): CapabilityCheckResult {
    // First check if actor has the capability
    if (!hasCapability(actorPersona, capability)) {
        return {
            allowed: false,
            capability,
            persona: actorPersona,
            reason: `Persona '${actorPersona}' does not have capability '${capability}'`
        };
    }
    
    // Then check hierarchy rules
    const hierarchyOrder: PersonaType[] = ['scrivener', 'sentinel', 'judge', 'overseer'];
    const actorLevel = hierarchyOrder.indexOf(actorPersona);
    const targetLevel = hierarchyOrder.indexOf(targetPersona);
    
    // Can't act on equal or higher level personas (except self operations)
    if (actorLevel <= targetLevel && actorPersona !== targetPersona) {
        // Exception: Sentinel can quarantine any non-overseer
        if (capability === 'quarantine_agent' && targetPersona !== 'overseer' && actorPersona === 'sentinel') {
            return { allowed: true, capability, persona: actorPersona };
        }
        
        // Exception: Judge can approve/reject L3 from any persona
        if ((capability === 'approve_l3' || capability === 'reject_l3') && actorPersona === 'judge') {
            return { allowed: true, capability, persona: actorPersona };
        }
        
        return {
            allowed: false,
            capability,
            persona: actorPersona,
            reason: `Persona '${actorPersona}' cannot act on '${targetPersona}' (insufficient privilege)`
        };
    }
    
    return { allowed: true, capability, persona: actorPersona };
}

// =============================================================================
// CAPABILITY ENFORCEMENT DECORATOR
// =============================================================================

/**
 * Enforce capability check before executing an action
 * Throws an error if the capability check fails
 */
export function enforceCapability(
    persona: PersonaType,
    capability: Capability,
    actionDescription: string
): void {
    const result = checkCapability(persona, capability);
    
    if (!result.allowed) {
        throw new Error(
            `Access Denied: ${actionDescription}. ` +
            `Reason: ${result.reason}`
        );
    }
}

/**
 * Log capability check result for audit purposes
 */
export function logCapabilityCheck(
    result: CapabilityCheckResult,
    context: { agentDid?: string; action: string }
): void {
    const status = result.allowed ? 'ALLOWED' : 'DENIED';
    const logEntry = {
        timestamp: new Date().toISOString(),
        status,
        persona: result.persona,
        capability: result.capability,
        reason: result.reason,
        ...context
    };
    
    console.log(`[CapabilityCheck] ${JSON.stringify(logEntry)}`);
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const CAPABILITY_CONSTANTS = {
    // Capability categories
    CODE_OPS: ['submit_code', 'audit_code', 'modify_code'] as Capability[],
    TRUST_OPS: ['view_own_trust', 'view_all_trust', 'update_trust', 'quarantine_agent', 'release_quarantine'] as Capability[],
    LEDGER_OPS: ['view_ledger', 'append_ledger'] as Capability[],
    L3_OPS: ['queue_l3', 'review_l3', 'approve_l3', 'reject_l3'] as Capability[],
    SHADOW_OPS: ['view_shadow_genome', 'archive_failure', 'update_remediation'] as Capability[],
    ADMIN_OPS: ['register_agent', 'modify_policy', 'view_config', 'modify_config'] as Capability[]
};
