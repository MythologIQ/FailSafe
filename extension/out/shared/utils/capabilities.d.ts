/**
 * Capability-Based Access Control for FailSafe Extension
 *
 * Provides:
 * - Per-persona capability definitions
 * - Capability enforcement checks
 * - Action authorization
 */
import { PersonaType } from '../types';
/**
 * Available capabilities in the system
 */
export type Capability = 'submit_code' | 'audit_code' | 'modify_code' | 'view_own_trust' | 'view_all_trust' | 'update_trust' | 'quarantine_agent' | 'release_quarantine' | 'view_ledger' | 'append_ledger' | 'queue_l3' | 'review_l3' | 'approve_l3' | 'reject_l3' | 'view_shadow_genome' | 'archive_failure' | 'update_remediation' | 'register_agent' | 'modify_policy' | 'view_config' | 'modify_config';
/**
 * Capability matrix per persona
 */
export declare const PERSONA_CAPABILITIES: Record<PersonaType, Capability[]>;
export interface CapabilityCheckResult {
    allowed: boolean;
    capability: Capability;
    persona: PersonaType;
    reason?: string;
}
/**
 * Check if a persona has a specific capability
 */
export declare function hasCapability(persona: PersonaType, capability: Capability): boolean;
/**
 * Check if an action is allowed for a persona
 */
export declare function checkCapability(persona: PersonaType, capability: Capability): CapabilityCheckResult;
/**
 * Get all capabilities for a persona
 */
export declare function getCapabilities(persona: PersonaType): Capability[];
/**
 * Check if a persona can perform an action on another persona
 * (e.g., sentinel updating trust on scrivener)
 */
export declare function canActOnAgent(actorPersona: PersonaType, targetPersona: PersonaType, capability: Capability): CapabilityCheckResult;
/**
 * Enforce capability check before executing an action
 * Throws an error if the capability check fails
 */
export declare function enforceCapability(persona: PersonaType, capability: Capability, actionDescription: string): void;
/**
 * Log capability check result for audit purposes
 */
export declare function logCapabilityCheck(result: CapabilityCheckResult, context: {
    agentDid?: string;
    action: string;
}): void;
export declare const CAPABILITY_CONSTANTS: {
    CODE_OPS: Capability[];
    TRUST_OPS: Capability[];
    LEDGER_OPS: Capability[];
    L3_OPS: Capability[];
    SHADOW_OPS: Capability[];
    ADMIN_OPS: Capability[];
};
//# sourceMappingURL=capabilities.d.ts.map