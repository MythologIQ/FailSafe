import * as path from "path";
import type { Intent } from "../types/IntentTypes";
import type { IntentProvider } from "../EnforcementEngine";
import type { Logger } from "../../shared/Logger";
import type { INotificationService } from "../../core/interfaces/INotificationService";

export async function autoCreateIntent(
  intentProvider: IntentProvider,
  targetPath: string,
  workspaceRoot: string,
  logger: Logger,
  notifications: INotificationService,
): Promise<Intent | null> {
  const fileName = path.basename(targetPath || "workspace");
  const intentTitle = `Session: ${fileName}`;
  const intentDesc = `Auto-created intent for ${targetPath || "workspace"}`;

  try {
    const intent = await intentProvider.createIntent({
      type: "feature",
      purpose: intentDesc,
      scope: {
        files: [targetPath || workspaceRoot],
        modules: [],
        riskGrade: "L1",
      },
      metadata: {
        author: "failsafe-assist",
        tags: ["auto-created", "assist-mode"],
      },
    });
    logger.info("ASSIST MODE: Auto-created intent", { intentId: intent.id });
    notifications.showInfo(
      `FailSafe: Created intent "${intentTitle}" for your session.`,
    );
    return intent;
  } catch (err) {
    logger.error("Failed to auto-create intent", { error: err });
    return null;
  }
}
