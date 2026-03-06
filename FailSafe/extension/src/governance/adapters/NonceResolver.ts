/**
 * NonceResolver - Handles nonce validation and generation.
 *
 * Extracted from GovernanceAdapter for testability and single responsibility.
 */

import { SecurityReplayGuard, processSignedRequest } from "../SecurityReplayGuard";
import type { DecisionRequest, DecisionResponse } from "../GovernanceAdapter";
import { Logger } from "../../shared/Logger";

export interface NonceResolverConfig {
  enableReplayGuard: boolean;
}

export interface NonceResult {
  nonce: string;
}

/**
 * Resolves and validates nonces for governance requests.
 */
export class NonceResolver {
  private readonly logger: Logger;

  constructor(
    private readonly replayGuard: SecurityReplayGuard,
    private readonly config: NonceResolverConfig,
  ) {
    this.logger = new Logger("NonceResolver");
  }

  /**
   * Resolve a nonce for the request - either validate existing or generate new.
   *
   * @returns NonceResult if successful, or DecisionResponse if validation failed
   */
  resolve(
    request: DecisionRequest,
    timestamp: string,
  ): NonceResult | DecisionResponse {
    // Validate existing nonce if provided
    if (request.nonce && this.config.enableReplayGuard) {
      const validation = processSignedRequest(this.replayGuard, {
        nonce: request.nonce,
        action: request.action,
        timestamp,
      });

      if (!validation.valid) {
        this.logger.warn("Nonce validation failed", {
          reason: validation.reason,
          action: request.action,
        });
        return {
          allowed: false,
          nonce: request.nonce,
          riskGrade: "L3",
          reason: `Nonce validation failed: ${validation.reason}`,
          timestamp,
        };
      }
      return { nonce: request.nonce };
    }

    // Generate new nonce
    return {
      nonce: this.replayGuard.generateNonce({ action: request.action }),
    };
  }

  /**
   * Check if a result is a failed DecisionResponse (vs successful NonceResult)
   */
  static isFailedResponse(
    result: NonceResult | DecisionResponse,
  ): result is DecisionResponse {
    return "allowed" in result;
  }
}
