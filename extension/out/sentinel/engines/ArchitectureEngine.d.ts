export interface ArchSmell {
    id: string;
    name: string;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
    location?: string;
    remediation: string;
}
export interface ArchitectureReport {
    score: number;
    smells: ArchSmell[];
    metrics: {
        languageCount: number;
        serviceCount: number;
        maxCyclomaticComplexity: number;
    };
}
export declare class ArchitectureEngine {
    constructor();
    /**
     * Analyze the workspace for architectural health.
     */
    analyzeWorkspace(rootPath: string): Promise<ArchitectureReport>;
    private checkPolyglotChaos;
    private checkServiceBloat;
    private checkGodModules;
    private checkFrameworkSoup;
}
//# sourceMappingURL=ArchitectureEngine.d.ts.map