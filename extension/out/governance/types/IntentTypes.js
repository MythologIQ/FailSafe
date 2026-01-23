"use strict";
/**
 * Intent Type Definitions
 *
 * AXIOM 1: "No action without intent. No intent without verification."
 *
 * This module defines the immutable schema for Intent artifacts,
 * which bind every proposed action to a verified purpose.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentHistoryEntrySchema = exports.IntentHistoryEventSchema = exports.IntentSchema = exports.IntentMetadataSchema = exports.IntentEvidenceSchema = exports.IntentScopeSchema = exports.IntentStatusSchema = exports.RiskGradeSchema = exports.IntentTypeSchema = exports.IntentIdSchema = void 0;
const zod_1 = require("zod");
// ============================================================
// ZOD SCHEMAS (D1: Runtime Validation)
// ============================================================
exports.IntentIdSchema = zod_1.z.string().uuid();
exports.IntentTypeSchema = zod_1.z.enum(['feature', 'refactor', 'bugfix', 'security', 'docs']);
exports.RiskGradeSchema = zod_1.z.enum(['L1', 'L2', 'L3']);
exports.IntentStatusSchema = zod_1.z.enum(['PULSE', 'PASS', 'VETO', 'SEALED']);
exports.IntentScopeSchema = zod_1.z.object({
    files: zod_1.z.array(zod_1.z.string()),
    modules: zod_1.z.array(zod_1.z.string()),
    riskGrade: exports.RiskGradeSchema,
    maxLinesOfCode: zod_1.z.number().optional(),
});
exports.IntentEvidenceSchema = zod_1.z.object({
    testsPassed: zod_1.z.boolean(),
    buildSucceeded: zod_1.z.boolean(),
    visualVerified: zod_1.z.boolean(),
    sentinelPassed: zod_1.z.boolean(),
    verifiedAt: zod_1.z.string().optional(),
});
exports.IntentMetadataSchema = zod_1.z.object({
    author: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()),
    parentIntentId: zod_1.z.string().uuid().optional(),
    externalRef: zod_1.z.string().optional(),
});
exports.IntentSchema = zod_1.z.object({
    id: exports.IntentIdSchema,
    type: exports.IntentTypeSchema,
    createdAt: zod_1.z.string(),
    purpose: zod_1.z.string().max(200),
    scope: exports.IntentScopeSchema,
    status: exports.IntentStatusSchema,
    blueprint: zod_1.z.string().optional(),
    evidence: exports.IntentEvidenceSchema.optional(),
    merkleRef: zod_1.z.string().optional(),
    metadata: exports.IntentMetadataSchema,
    updatedAt: zod_1.z.string(),
    sealedAt: zod_1.z.string().optional(),
});
exports.IntentHistoryEventSchema = zod_1.z.enum([
    'CREATED', 'STATUS_CHANGED', 'EVIDENCE_UPDATED', 'SEALED'
]);
exports.IntentHistoryEntrySchema = zod_1.z.object({
    intentId: exports.IntentIdSchema,
    timestamp: zod_1.z.string(),
    event: exports.IntentHistoryEventSchema,
    previousStatus: exports.IntentStatusSchema.optional(),
    newStatus: exports.IntentStatusSchema.optional(),
    actor: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    previousHash: zod_1.z.string().optional(),
    entryHash: zod_1.z.string().optional(),
});
//# sourceMappingURL=IntentTypes.js.map