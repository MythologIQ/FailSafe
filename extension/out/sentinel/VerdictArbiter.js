"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerdictArbiter = void 0;
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const Logger_1 = require("../shared/Logger");
/**
 * VerdictArbiter
 *
 * Orchestrates the decision-making process for Sentinel.
 * - Coordinates Heuristics, LLM, and Existence checks.
 * - Determines when to escalate to LLM analysis.
 * - Produces the final SentinelVerdict.
 */
class VerdictArbiter {
    logger;
    configManager;
    heuristicEngine;
    verdictEngine;
    existenceEngine;
    llmAvailable = false;
    currentMode = 'heuristic';
    constructor(configManager, heuristicEngine, verdictEngine, existenceEngine) {
        this.configManager = configManager;
        this.heuristicEngine = heuristicEngine;
        this.verdictEngine = verdictEngine;
        this.existenceEngine = existenceEngine;
        this.logger = new Logger_1.Logger('VerdictArbiter');
        // Initialize mode from config
        const config = this.configManager.getConfig();
        this.currentMode = config.sentinel.mode;
    }
    getMode() {
        return this.currentMode;
    }
    isLlmAvailable() {
        return this.llmAvailable;
    }
    /**
     * Check if LLM is available and update internal state
     */
    async checkLLMAvailability() {
        const config = this.configManager.getConfig();
        const endpoint = config.sentinel.ollamaEndpoint;
        try {
            const response = await fetch(`${endpoint}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            this.llmAvailable = response.ok;
        }
        catch {
            this.llmAvailable = false;
        }
        if (this.llmAvailable) {
            this.logger.info('LLM available at ' + endpoint);
        }
        else {
            this.logger.info('LLM not available, forcing heuristic fallback if needed');
            if (this.currentMode === 'llm-assisted') {
                this.currentMode = 'heuristic';
            }
        }
        return this.llmAvailable;
    }
    /** Maximum file size to read (5MB) */
    static MAX_FILE_SIZE = 5 * 1024 * 1024;
    /**
     * Evaluate a Sentinel Event and produce a Verdict
     */
    async evaluateEvent(event) {
        // P0 FIX: AGENT_CLAIM events must route to validateClaim, not evaluateFileEvent
        if (event.type === 'AGENT_CLAIM') {
            const claim = event.payload;
            return this.validateClaim(claim);
        }
        // All other events (FILE_CREATED, FILE_MODIFIED, etc.) go to file processing
        return this.evaluateFileEvent(event);
    }
    /**
     * Specific logic for File-related events
     */
    async evaluateFileEvent(event) {
        // P2 FIX: Runtime validation for payload.path
        const payload = event.payload;
        const filePath = payload?.path;
        if (!filePath || typeof filePath !== 'string') {
            this.logger.warn('Invalid event payload: missing or invalid path', { eventId: event.id });
            // Return a safe "unknown" verdict
            return this.verdictEngine.generateVerdict(event, 'unknown', [], undefined);
        }
        this.logger.debug('Arbitrating event', { type: event.type, path: filePath });
        // Read file content (if exists and within size limit)
        let content;
        if (event.type !== 'FILE_DELETED' && fs.existsSync(filePath)) {
            try {
                // P1 FIX: Check file size before reading to prevent memory exhaustion
                const stats = fs.statSync(filePath);
                if (stats.size > VerdictArbiter.MAX_FILE_SIZE) {
                    this.logger.warn('File too large, skipping content read', { filePath, size: stats.size });
                    content = undefined;
                }
                else {
                    content = fs.readFileSync(filePath, 'utf-8');
                }
            }
            catch {
                content = undefined;
            }
        }
        // Run heuristic checks
        const heuristicResults = this.heuristicEngine.analyze(filePath, content);
        // Determine if LLM evaluation is needed
        let llmEvaluation;
        if (this.shouldInvokeLLM(heuristicResults)) {
            llmEvaluation = await this.invokeLLM(filePath, content, heuristicResults);
        }
        // Generate verdict
        return this.verdictEngine.generateVerdict(event, filePath, heuristicResults, llmEvaluation);
    }
    /**
     * Validate an agent claim (Existence Check)
     */
    async validateClaim(claim) {
        // Logic moved from SentinelDaemon.validateClaim
        this.logger.info('Validating agent claim', { agentDid: claim.agentDid });
        const artifacts = claim.claimedArtifacts || [];
        const existenceResults = this.existenceEngine.validateClaim(artifacts);
        // Generate verdict via engine
        const verdict = await this.verdictEngine.generateVerdict({
            id: crypto.randomUUID(),
            type: 'AGENT_CLAIM',
            timestamp: new Date().toISOString(),
            priority: 'high',
            source: 'agent_message',
            payload: claim
        }, artifacts[0] || 'claim_manifest', existenceResults, undefined);
        return verdict;
    }
    /**
     * Determine if LLM evaluation should be invoked
     */
    shouldInvokeLLM(heuristicResults) {
        if (!this.llmAvailable) {
            return false;
        }
        if (this.currentMode === 'heuristic') {
            return false;
        }
        if (this.currentMode === 'llm-assisted') {
            return true;
        }
        // Hybrid mode: invoke on flags or low confidence
        const hasFlags = heuristicResults.some(r => r.matched && r.severity !== 'low');
        return hasFlags;
    }
    /**
     * Invoke LLM for deeper evaluation
     */
    async invokeLLM(filePath, content, heuristicResults) {
        const config = this.configManager.getConfig();
        const endpoint = config.sentinel.ollamaEndpoint;
        const model = config.sentinel.localModel;
        const prompt = `Analyze this code for security vulnerabilities, logic errors, and best practices violations.

File: ${filePath}
Heuristic Flags: ${heuristicResults.filter(r => r.matched).map(r => r.patternId).join(', ')}

Code:
\`\`\`
${content?.substring(0, 2000) || 'File not readable'}
\`\`\`

Respond with:
1. Risk assessment (L1/L2/L3)
2. Issues found (if any)
3. Confidence (0-1)`;
        try {
            const response = await fetch(`${endpoint}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    prompt,
                    stream: false
                }),
                signal: AbortSignal.timeout(5000)
            });
            if (!response.ok) {
                return undefined;
            }
            const result = await response.json();
            return {
                model,
                promptUsed: prompt,
                response: result.response,
                confidence: 0.7, // TODO: Parse from response
                processingTime: result.total_duration || 0
            };
        }
        catch (error) {
            this.logger.warn('LLM evaluation failed', error);
            return undefined;
        }
    }
}
exports.VerdictArbiter = VerdictArbiter;
//# sourceMappingURL=VerdictArbiter.js.map