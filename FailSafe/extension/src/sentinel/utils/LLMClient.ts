/**
 * LLMClient - Encapsulates all LLM communication logic for Sentinel
 *
 * Handles endpoint validation, availability checks, prompt construction,
 * and HTTP calls to the local LLM server (Ollama).
 */

import type { IConfigProvider } from '../../core/interfaces/IConfigProvider';
import { Logger } from '../../shared/Logger';
import type { HeuristicResult } from '../../shared/types';

/** Blocked private network prefixes (SSRF prevention) */
const BLOCKED_HOST_PREFIXES = [
    '169.254.', '10.',
    '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.',
    '172.24.', '172.25.', '172.26.', '172.27.',
    '172.28.', '172.29.', '172.30.', '172.31.',
    '192.168.'
];

export class LLMClient {
    private readonly logger: Logger;

    constructor(
        private readonly configProvider: IConfigProvider,
    ) {
        this.logger = new Logger('LLMClient');
    }

    /**
     * Validate an LLM endpoint URL to prevent SSRF attacks.
     * Allows localhost for local LLM servers, blocks private network ranges.
     */
    isValidEndpoint(endpoint: string): boolean {
        try {
            const url = new URL(endpoint);
            // Only allow http/https protocols
            if (!['http:', 'https:'].includes(url.protocol)) {
                return false;
            }
            const hostname = url.hostname.toLowerCase();
            // Allow localhost explicitly for local LLM servers
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return true;
            }
            // Block other private ranges
            for (const prefix of BLOCKED_HOST_PREFIXES) {
                if (hostname.startsWith(prefix)) {
                    return false;
                }
            }
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if the LLM server is reachable at the configured endpoint.
     * Returns true if the server responds with an OK status.
     */
    async checkAvailability(): Promise<boolean> {
        const config = this.configProvider.getConfig();
        const endpoint = config.sentinel.ollamaEndpoint;

        // SECURITY: Validate endpoint before making requests
        if (!this.isValidEndpoint(endpoint)) {
            this.logger.warn('Invalid LLM endpoint URL', { endpoint });
            return false;
        }

        try {
            const response = await fetch(`${endpoint}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            const available = response.ok;
            if (available) {
                this.logger.info('LLM available at ' + endpoint);
            }
            return available;
        } catch {
            return false;
        }
    }

    /**
     * Build the analysis prompt for the LLM from file and heuristic data.
     */
    buildPrompt(
        filePath: string,
        content: string | undefined,
        heuristicResults: HeuristicResult[]
    ): string {
        const matchedFlags = heuristicResults
            .filter(r => r.matched)
            .map(r => r.patternId)
            .join(', ');

        return `Analyze this code for security vulnerabilities, logic errors, and best practices violations.

File: ${filePath}
Heuristic Flags: ${matchedFlags}

Code:
\`\`\`
${content?.substring(0, 2000) || 'File not readable'}
\`\`\`

Respond with:
1. Risk assessment (L1/L2/L3)
2. Issues found (if any)
3. Confidence (0-1)`;
    }

    /**
     * Send a prompt to the LLM endpoint and return the raw response text.
     * Throws on network or timeout errors.
     */
    async callEndpoint(prompt: string): Promise<{ response: string; totalDuration: number }> {
        const config = this.configProvider.getConfig();
        const endpoint = config.sentinel.ollamaEndpoint;
        const model = config.sentinel.localModel;

        const httpResponse = await fetch(`${endpoint}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                stream: false
            }),
            signal: AbortSignal.timeout(5000)
        });

        if (!httpResponse.ok) {
            throw new Error(`LLM endpoint returned ${httpResponse.status}`);
        }

        const result = await httpResponse.json() as {
            response?: string;
            total_duration?: number;
        };

        return {
            response: result.response || '',
            totalDuration: result.total_duration || 0
        };
    }
}
