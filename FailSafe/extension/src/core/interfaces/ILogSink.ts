/**
 * ILogSink - Abstracts vscode.window.createOutputChannel
 *
 * Provides a platform-agnostic interface for structured log output,
 * decoupling services from the VS Code OutputChannel API.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ILogSink {
    log(level: LogLevel, component: string, message: string, data?: unknown): void;
    show?(): void;
    dispose(): void;
}
