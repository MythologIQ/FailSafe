/**
 * Logger - Structured logging for FailSafe
 *
 * Provides consistent logging across all components with
 * support for VS Code output channels and file logging.
 */

import * as vscode from 'vscode';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    component: string;
    message: string;
    data?: unknown;
}

export class Logger {
    private outputChannel: vscode.OutputChannel;
    private component: string;
    private minLevel: LogLevel;

    private static levelPriority: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    };

    constructor(component: string, minLevel: LogLevel = 'info') {
        this.component = component;
        this.minLevel = minLevel;
        this.outputChannel = vscode.window.createOutputChannel(`FailSafe: ${component}`);
    }

    private shouldLog(level: LogLevel): boolean {
        return Logger.levelPriority[level] >= Logger.levelPriority[this.minLevel];
    }

    private formatMessage(level: LogLevel, message: string, data?: unknown): string {
        const timestamp = new Date().toISOString();
        const levelStr = level.toUpperCase().padEnd(5);
        const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [${levelStr}] [${this.component}] ${message}${dataStr}`;
    }

    private log(level: LogLevel, message: string, data?: unknown): void {
        if (!this.shouldLog(level)) {
            return;
        }

        const formatted = this.formatMessage(level, message, data);
        this.outputChannel.appendLine(formatted);

        // Also log to console for debugging
        switch (level) {
            case 'debug':
                console.debug(formatted);
                break;
            case 'info':
                console.info(formatted);
                break;
            case 'warn':
                console.warn(formatted);
                break;
            case 'error':
                console.error(formatted);
                break;
        }
    }

    debug(message: string, data?: unknown): void {
        this.log('debug', message, data);
    }

    info(message: string, data?: unknown): void {
        this.log('info', message, data);
    }

    warn(message: string, data?: unknown): void {
        this.log('warn', message, data);
    }

    error(message: string, error?: unknown): void {
        const errorData = error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error;
        this.log('error', message, errorData);
    }

    /**
     * Show the output channel in VS Code
     */
    show(): void {
        this.outputChannel.show();
    }

    /**
     * Create a child logger with a sub-component name
     */
    child(subComponent: string): Logger {
        return new Logger(`${this.component}:${subComponent}`, this.minLevel);
    }

    dispose(): void {
        this.outputChannel.dispose();
    }
}
