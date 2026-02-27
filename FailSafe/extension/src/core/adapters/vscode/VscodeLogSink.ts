/**
 * VscodeLogSink - VS Code adapter for ILogSink
 *
 * Wraps vscode.OutputChannel to provide structured log output
 * through the platform-agnostic ILogSink interface.
 */

import * as vscode from 'vscode';
import { ILogSink, LogLevel } from '../../interfaces';

export class VscodeLogSink implements ILogSink {
    private readonly channel: vscode.OutputChannel;

    constructor(channelName = 'FailSafe') {
        this.channel = vscode.window.createOutputChannel(channelName);
    }

    log(level: LogLevel, component: string, message: string, data?: unknown): void {
        const timestamp = new Date().toISOString();
        const levelStr = level.toUpperCase().padEnd(5);
        const line = `[${timestamp}] [${levelStr}] [${component}] ${message}`;
        this.channel.appendLine(data ? `${line} | ${JSON.stringify(data)}` : line);
    }

    show(): void {
        this.channel.show();
    }

    dispose(): void {
        this.channel.dispose();
    }
}
