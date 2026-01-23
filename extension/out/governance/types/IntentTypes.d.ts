/**
 * Intent Type Definitions
 *
 * AXIOM 1: "No action without intent. No intent without verification."
 *
 * This module defines the immutable schema for Intent artifacts,
 * which bind every proposed action to a verified purpose.
 */
import { z } from 'zod';
export declare const IntentIdSchema: z.ZodString;
export declare const IntentTypeSchema: z.ZodEnum<{
    feature: "feature";
    refactor: "refactor";
    bugfix: "bugfix";
    security: "security";
    docs: "docs";
}>;
export declare const RiskGradeSchema: z.ZodEnum<{
    L1: "L1";
    L2: "L2";
    L3: "L3";
}>;
export declare const IntentStatusSchema: z.ZodEnum<{
    PASS: "PASS";
    PULSE: "PULSE";
    VETO: "VETO";
    SEALED: "SEALED";
}>;
export declare const IntentScopeSchema: z.ZodObject<{
    files: z.ZodArray<z.ZodString>;
    modules: z.ZodArray<z.ZodString>;
    riskGrade: z.ZodEnum<{
        L1: "L1";
        L2: "L2";
        L3: "L3";
    }>;
    maxLinesOfCode: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const IntentEvidenceSchema: z.ZodObject<{
    testsPassed: z.ZodBoolean;
    buildSucceeded: z.ZodBoolean;
    visualVerified: z.ZodBoolean;
    sentinelPassed: z.ZodBoolean;
    verifiedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const IntentMetadataSchema: z.ZodObject<{
    author: z.ZodString;
    tags: z.ZodArray<z.ZodString>;
    parentIntentId: z.ZodOptional<z.ZodString>;
    externalRef: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const IntentSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<{
        feature: "feature";
        refactor: "refactor";
        bugfix: "bugfix";
        security: "security";
        docs: "docs";
    }>;
    createdAt: z.ZodString;
    purpose: z.ZodString;
    scope: z.ZodObject<{
        files: z.ZodArray<z.ZodString>;
        modules: z.ZodArray<z.ZodString>;
        riskGrade: z.ZodEnum<{
            L1: "L1";
            L2: "L2";
            L3: "L3";
        }>;
        maxLinesOfCode: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    status: z.ZodEnum<{
        PASS: "PASS";
        PULSE: "PULSE";
        VETO: "VETO";
        SEALED: "SEALED";
    }>;
    blueprint: z.ZodOptional<z.ZodString>;
    evidence: z.ZodOptional<z.ZodObject<{
        testsPassed: z.ZodBoolean;
        buildSucceeded: z.ZodBoolean;
        visualVerified: z.ZodBoolean;
        sentinelPassed: z.ZodBoolean;
        verifiedAt: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    merkleRef: z.ZodOptional<z.ZodString>;
    metadata: z.ZodObject<{
        author: z.ZodString;
        tags: z.ZodArray<z.ZodString>;
        parentIntentId: z.ZodOptional<z.ZodString>;
        externalRef: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    updatedAt: z.ZodString;
    sealedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const IntentHistoryEventSchema: z.ZodEnum<{
    SEALED: "SEALED";
    CREATED: "CREATED";
    STATUS_CHANGED: "STATUS_CHANGED";
    EVIDENCE_UPDATED: "EVIDENCE_UPDATED";
}>;
export declare const IntentHistoryEntrySchema: z.ZodObject<{
    intentId: z.ZodString;
    timestamp: z.ZodString;
    event: z.ZodEnum<{
        SEALED: "SEALED";
        CREATED: "CREATED";
        STATUS_CHANGED: "STATUS_CHANGED";
        EVIDENCE_UPDATED: "EVIDENCE_UPDATED";
    }>;
    previousStatus: z.ZodOptional<z.ZodEnum<{
        PASS: "PASS";
        PULSE: "PULSE";
        VETO: "VETO";
        SEALED: "SEALED";
    }>>;
    newStatus: z.ZodOptional<z.ZodEnum<{
        PASS: "PASS";
        PULSE: "PULSE";
        VETO: "VETO";
        SEALED: "SEALED";
    }>>;
    actor: z.ZodString;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    previousHash: z.ZodOptional<z.ZodString>;
    entryHash: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Unique identifier for an Intent.
 * Format: UUID v4
 */
export type IntentId = string;
/**
 * Classification of the intent's purpose.
 */
export type IntentType = "feature" | "refactor" | "bugfix" | "security" | "docs";
/**
 * QoreLogic Risk Grade assignment.
 */
export type RiskGrade = "L1" | "L2" | "L3";
/**
 * Governance gate status for the Intent.
 */
export type IntentStatus = "PULSE" | "PASS" | "VETO" | "SEALED";
/**
 * Scope definition for the Intent.
 * Defines the boundary of permissible modifications.
 */
export interface IntentScope {
    /**
     * Absolute paths to files that may be created or modified.
     * Any write outside this list triggers Drift detection.
     */
    files: string[];
    /**
     * Module or component names affected by this intent.
     * Used for Living Graph visualization.
     */
    modules: string[];
    /**
     * Risk grade assigned by QoreLogic analysis.
     */
    riskGrade: RiskGrade;
    /**
     * Maximum lines of code permitted (§4 Razor enforcement).
     * null = no specific limit beyond standard §4 rules.
     */
    maxLinesOfCode?: number;
}
/**
 * Evidence of successful implementation.
 * Populated during SUBSTANTIATE phase.
 */
export interface IntentEvidence {
    /**
     * Test suite execution status.
     */
    testsPassed: boolean;
    /**
     * Build/compilation status.
     */
    buildSucceeded: boolean;
    /**
     * Visual verification (screenshots, E2E) completed.
     */
    visualVerified: boolean;
    /**
     * Sentinel verification status.
     */
    sentinelPassed: boolean;
    /**
     * Timestamp of verification completion.
     */
    verifiedAt?: string;
}
/**
 * Metadata for traceability and context.
 */
export interface IntentMetadata {
    /**
     * Human or agent who initiated the intent.
     */
    author: string;
    /**
     * Tags for categorization and search.
     */
    tags: string[];
    /**
     * Parent Intent ID if this is a sub-intent.
     */
    parentIntentId?: IntentId;
    /**
     * External reference (e.g., GitHub issue, JIRA ticket).
     */
    externalRef?: string;
}
/**
 * Core Intent artifact.
 *
 * IMMUTABILITY CONTRACT:
 * - Once status is 'SEALED', the Intent becomes read-only.
 * - Field modifications require a new Intent with parentIntentId reference.
 */
export interface Intent {
    /**
     * Unique identifier for this Intent.
     */
    id: IntentId;
    /**
     * Classification of the intent's purpose.
     */
    type: IntentType;
    /**
     * Creation timestamp (ISO 8601).
     */
    createdAt: string;
    /**
     * One-sentence "why" statement.
     * Max 200 characters.
     */
    purpose: string;
    /**
     * Scope boundary definition.
     */
    scope: IntentScope;
    /**
     * Current governance gate status.
     */
    status: IntentStatus;
    /**
     * Absolute path to the ARCHITECTURE_PLAN.md blueprint.
     * Required for L2/L3 intents.
     */
    blueprint?: string;
    /**
     * Evidence of successful implementation.
     * Populated during SUBSTANTIATE phase.
     */
    evidence?: IntentEvidence;
    /**
     * Reference to the SOA Ledger entry.
     * Links Intent to Merkle chain.
     */
    merkleRef?: string;
    /**
     * Traceability metadata.
     */
    metadata: IntentMetadata;
    /**
     * Timestamp of last status change (ISO 8601).
     */
    updatedAt: string;
    /**
     * Timestamp when status became 'SEALED' (ISO 8601).
     */
    sealedAt?: string;
}
/**
 * Proposed action awaiting verdict.
 */
export interface ProposedAction {
    /**
     * Type of action.
     */
    type: "file_write" | "file_create" | "file_delete" | "file_rename";
    /**
     * Target file path (absolute).
     */
    targetPath: string;
    /**
     * Intent ID this action claims to belong to.
     * null = no active Intent (Drift).
     */
    intentId: IntentId | null;
    /**
     * Timestamp of proposal (ISO 8601).
     */
    proposedAt: string;
    /**
     * Agent or user proposing the action.
     */
    proposedBy: string;
}
/**
 * Enforcement verdict result.
 */
export type Verdict = AllowVerdict | BlockVerdict | EscalateVerdict;
export interface AllowVerdict {
    status: "ALLOW";
    reason: string;
    intentId: IntentId;
}
export interface BlockVerdict {
    status: "BLOCK";
    violation: string;
    axiomViolated: 1 | 2 | 3 | 4 | 5;
    remediation: string;
}
export interface EscalateVerdict {
    status: "ESCALATE";
    escalationTo: "L3_QUEUE" | "HUMAN_REVIEW" | "TRIBUNAL_AUDIT";
    reason: string;
    intentId?: IntentId;
}
/**
 * Intent history entry (append-only log).
 */
export interface IntentHistoryEntry {
    intentId: IntentId;
    timestamp: string;
    event: "CREATED" | "STATUS_CHANGED" | "EVIDENCE_UPDATED" | "SEALED";
    previousStatus?: IntentStatus;
    newStatus?: IntentStatus;
    actor: string;
    details?: Record<string, unknown>;
    previousHash?: string;
    entryHash?: string;
}
//# sourceMappingURL=IntentTypes.d.ts.map