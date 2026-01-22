import { HeuristicResult } from '../../shared/types';
import { ConfigManager } from '../../shared/ConfigManager';
export declare class ExistenceEngine {
    private configManager;
    constructor(configManager: ConfigManager);
    /**
     * validateClaim: Checks if artifacts mentioned in an Agent's claim actually exist.
     * @param artifacts - List of file paths claimed to be created/modified
     */
    validateClaim(artifacts: string[]): HeuristicResult[];
}
//# sourceMappingURL=ExistenceEngine.d.ts.map