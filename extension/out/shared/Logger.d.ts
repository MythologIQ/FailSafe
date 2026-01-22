/**
 * Logger - Structured logging for FailSafe
 *
 * Provides consistent logging across all components with
 * support for VS Code output channels and file logging.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    component: string;
    message: string;
    data?: unknown;
}
export declare class Logger {
    private outputChannel;
    private component;
    private minLevel;
    private static levelPriority;
    constructor(component: string, minLevel?: LogLevel);
    private shouldLog;
    private formatMessage;
    private log;
    debug(message: string, data?: unknown): void;
    info(message: string, data?: unknown): void;
    warn(message: string, data?: unknown): void;
    error(message: string, error?: unknown): void;
    /**
     * Show the output channel in VS Code
     */
    show(): void;
    /**
     * Create a child logger with a sub-component name
     */
    child(subComponent: string): Logger;
    dispose(): void;
}
//# sourceMappingURL=Logger.d.ts.map