import { HeuristicPattern } from '../shared/types';
export declare class PatternLoader {
    private patterns;
    private customPatternsPath;
    constructor(workspaceRoot?: string);
    private loadDefaults;
    loadCustomPatterns(): Promise<void>;
    private isValidPattern;
    getPatterns(): HeuristicPattern[];
    getPattern(id: string): HeuristicPattern | undefined;
    compilePattern(pattern: HeuristicPattern): RegExp | null;
}
//# sourceMappingURL=PatternLoader.d.ts.map