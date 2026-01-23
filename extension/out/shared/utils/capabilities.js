"use strict";
/**
 * Capability-Based Access Control for FailSafe Extension
 *
 * Provides:
 * - Per-persona capability definitions
 * - Capability enforcement checks
 * - Action authorization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAPABILITY_CONSTANTS = exports.PERSONA_CAPABILITIES = void 0;
exports.hasCapability = hasCapability;
exports.checkCapability = checkCapability;
exports.getCapabilities = getCapabilities;
exports.canActOnAgent = canActOnAgent;
exports.enforceCapability = enforceCapability;
exports.logCapabilityCheck = logCapabilityCheck;
/**
 * Capability matrix per persona
 */
exports.PERSONA_CAPABILITIES = {
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
/**
 * Check if a persona has a specific capability
 */
function hasCapability(persona, capability) {
    const capabilities = exports.PERSONA_CAPABILITIES[persona];
    return capabilities?.includes(capability) ?? false;
}
/**
 * Check if an action is allowed for a persona
 */
function checkCapability(persona, capability) {
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
function getCapabilities(persona) {
    return exports.PERSONA_CAPABILITIES[persona] || [];
}
/**
 * Check if a persona can perform an action on another persona
 * (e.g., sentinel updating trust on scrivener)
 */
function canActOnAgent(actorPersona, targetPersona, capability) {
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
    const hierarchyOrder = ['scrivener', 'sentinel', 'judge', 'overseer'];
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
function enforceCapability(persona, capability, actionDescription) {
    const result = checkCapability(persona, capability);
    if (!result.allowed) {
        throw new Error(`Access Denied: ${actionDescription}. ` +
            `Reason: ${result.reason}`);
    }
}
/**
 * Log capability check result for audit purposes
 */
function logCapabilityCheck(result, context) {
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
exports.CAPABILITY_CONSTANTS = {
    // Capability categories
    CODE_OPS: ['submit_code', 'audit_code', 'modify_code'],
    TRUST_OPS: ['view_own_trust', 'view_all_trust', 'update_trust', 'quarantine_agent', 'release_quarantine'],
    LEDGER_OPS: ['view_ledger', 'append_ledger'],
    L3_OPS: ['queue_l3', 'review_l3', 'approve_l3', 'reject_l3'],
    SHADOW_OPS: ['view_shadow_genome', 'archive_failure', 'update_remediation'],
    ADMIN_OPS: ['register_agent', 'modify_policy', 'view_config', 'modify_config']
};
//# sourceMappingURL=capabilities.js.map