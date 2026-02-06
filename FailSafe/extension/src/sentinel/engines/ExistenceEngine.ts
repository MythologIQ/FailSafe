
// Step Id: 204
// Source: Spec 4.3 (Existence Checks)

import * as fs from 'fs';
import * as path from 'path';
import { HeuristicResult } from '../../shared/types';
import { ConfigManager } from '../../shared/ConfigManager';

export class ExistenceEngine {
    private configManager: ConfigManager;

    constructor(configManager: ConfigManager) {
        this.configManager = configManager;
    }

    /**
     * validateClaim: Checks if artifacts mentioned in an Agent's claim actually exist.
     * @param artifacts - List of file paths claimed to be created/modified
     */
    public validateClaim(artifacts: string[]): HeuristicResult[] {
        const results: HeuristicResult[] = [];
        const workspaceRoot = this.configManager.getWorkspaceRoot();

        if (!workspaceRoot) {
            // Cannot validate without workspace root
             results.push({
                patternId: "EXS000",
                matched: true,
                severity: "medium", // Not critical, but operationally degraded
                location: { line: 0, column: 0, snippet: "No workspace root available" }
            });
            return results;
        }

        for (const relativePath of artifacts) {
            const absolutePath = path.resolve(workspaceRoot, relativePath);
            
            // Security check: Ensure path is within workspace to prevent traversal attacks
            if (!absolutePath.startsWith(workspaceRoot)) {
                 results.push({
                    patternId: "EXS002",
                    matched: true,
                    severity: "critical",
                    location: {
                        line: 0, 
                        column: 0, 
                        snippet: `Path Traversal Detected: ${relativePath}`
                    }
                });
                continue;
            }

            if (!fs.existsSync(absolutePath)) {
                results.push({
                    patternId: "EXS001",
                    matched: true,
                    severity: "critical",
                    location: {
                        line: 0, 
                        column: 0, 
                        snippet: `Claimed file missing: ${relativePath}`
                    }
                });
            }
        }

        return results;
    }
}
