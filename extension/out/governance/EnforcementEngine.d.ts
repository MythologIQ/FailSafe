import { ProposedAction, Verdict, Intent } from './types/IntentTypes';
export interface IntentProvider {
    getActiveIntent(): Promise<Intent | null>;
}
/**
 * Enforcement Engine - Evaluates proposed actions against Prime Axioms.
 * AXIOM 3: "FailSafe is the upstream authority."
 */
export declare class EnforcementEngine {
    private intentProvider;
    private workspaceRoot;
    constructor(intentProvider: IntentProvider, workspaceRoot: string);
    /** D2: Secure Path Validation - prevents path traversal attacks using path.resolve() + boundary checks */
    isPathInScope(targetPath: string, scopePaths: string[]): boolean;
    evaluateAction(action: ProposedAction): Promise<Verdict>;
    /** AXIOM 1: No action without intent. No intent without verification. */
    private enforceAxiom1;
    /** AXIOM 2: Truth is earned, not declared. (D2: Secure path validation) */
    private enforceAxiom2;
    /** AXIOM 3: FailSafe is the upstream authority. */
    private enforceAxiom3;
}
//# sourceMappingURL=EnforcementEngine.d.ts.map