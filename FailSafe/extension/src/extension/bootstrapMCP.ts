import * as vscode from "vscode";
import { FailSafeMCPServer } from "../mcp/FailSafeServer";
import { SentinelSubstrate } from "./bootstrapSentinel";
import { QoreLogicSubstrate } from "./bootstrapQoreLogic";
import { GovernanceSubstrate } from "./bootstrapGovernance";
import { Logger } from "../shared/Logger";

export async function bootstrapMCP(
  context: vscode.ExtensionContext,
  sentinel: SentinelSubstrate,
  qore: QoreLogicSubstrate,
  gov: GovernanceSubstrate,
  logger: Logger,
): Promise<FailSafeMCPServer | undefined> {
  logger.info("Starting MCP Governance Server...");
  try {
    const mcpServer = new FailSafeMCPServer(
      context,
      sentinel.sentinelDaemon,
      qore.ledgerManager,
      gov.intentService,
    );
    await mcpServer.start();
    return mcpServer;
  } catch (error) {
    logger.error("Failed to start MCP Server", error);
    return undefined;
  }
}
