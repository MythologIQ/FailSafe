/**
 * FeedbackManager - Community Feedback Loop Handler
 *
 * Manages the collection and storage of user feedback for FailSafe.
 * Generates GUID-stamped JSON files in the .failsafe/feedback directory.
 */
import * as vscode from 'vscode';
export interface FeedbackEntry {
    id: string;
    timestamp: string;
    type: 'bug_report' | 'feature_request' | 'ux_feedback' | 'performance' | 'general';
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    reproduction?: string;
    environment: {
        os: string;
        vscodeVersion: string;
        extensionVersion: string;
        workspacePath?: string;
    };
    metadata: {
        sessionId?: string;
        relatedFiles?: string[];
        relatedEvents?: string[];
        userAgent?: string;
    };
}
export interface FeedbackSummary {
    totalFeedback: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recentFeedback: FeedbackEntry[];
}
export declare class FeedbackManager {
    private context;
    private feedbackDir;
    private logger;
    constructor(context: vscode.ExtensionContext);
    /**
     * Ensure the feedback directory exists
     */
    private ensureFeedbackDirectory;
    /**
     * Generate a GUID for feedback entries
     */
    private generateGUID;
    /**
     * Collect environment information
     */
    private collectEnvironment;
    /**
     * Create a feedback entry with user input
     */
    createFeedbackEntry(): Promise<FeedbackEntry | null>;
    /**
     * Map feedback type to category
     */
    private getCategoryFromType;
    /**
     * Save feedback entry to a GUID-stamped JSON file
     */
    saveFeedback(entry: FeedbackEntry): Promise<string>;
    /**
     * Load all feedback entries from the feedback directory
     */
    loadAllFeedback(): Promise<FeedbackEntry[]>;
    /**
     * Get a summary of all feedback
     */
    getFeedbackSummary(): Promise<FeedbackSummary>;
    /**
     * Delete a feedback entry
     */
    deleteFeedback(id: string): Promise<boolean>;
    /**
     * Export all feedback to a single JSON file
     */
    exportFeedback(outputPath: string): Promise<void>;
    /**
     * Display feedback in a webview panel
     */
    showFeedbackPanel(): Promise<void>;
    /**
     * Generate HTML for feedback panel
     */
    private getFeedbackHtml;
    /**
     * Escape HTML to prevent XSS
     */
    private escapeHtml;
}
//# sourceMappingURL=FeedbackManager.d.ts.map