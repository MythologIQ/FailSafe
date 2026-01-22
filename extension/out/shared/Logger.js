"use strict";
/**
 * Logger - Structured logging for FailSafe
 *
 * Provides consistent logging across all components with
 * support for VS Code output channels and file logging.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const vscode = __importStar(require("vscode"));
class Logger {
    outputChannel;
    component;
    minLevel;
    static levelPriority = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    };
    constructor(component, minLevel = 'info') {
        this.component = component;
        this.minLevel = minLevel;
        this.outputChannel = vscode.window.createOutputChannel(`FailSafe: ${component}`);
    }
    shouldLog(level) {
        return Logger.levelPriority[level] >= Logger.levelPriority[this.minLevel];
    }
    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const levelStr = level.toUpperCase().padEnd(5);
        const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [${levelStr}] [${this.component}] ${message}${dataStr}`;
    }
    log(level, message, data) {
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
    debug(message, data) {
        this.log('debug', message, data);
    }
    info(message, data) {
        this.log('info', message, data);
    }
    warn(message, data) {
        this.log('warn', message, data);
    }
    error(message, error) {
        const errorData = error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error;
        this.log('error', message, errorData);
    }
    /**
     * Show the output channel in VS Code
     */
    show() {
        this.outputChannel.show();
    }
    /**
     * Create a child logger with a sub-component name
     */
    child(subComponent) {
        return new Logger(`${this.component}:${subComponent}`, this.minLevel);
    }
    dispose() {
        this.outputChannel.dispose();
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map