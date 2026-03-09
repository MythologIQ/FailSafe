/**
 * IntentMigration - Intent schema v1 to v2 migration (B66/B68).
 * Extracted from WorkspaceMigration for Section 4 compliance.
 */
import * as fs from "fs";
import * as path from "path";

/**
 * Adds planId and agentIdentity defaults to archived intents.
 */
export async function migrateIntentSchemaV2(
  rootPath: string,
): Promise<void> {
  const intentsDir = path.join(rootPath, ".failsafe", "manifest", "intents");
  try {
    await fs.promises.access(intentsDir);
  } catch {
    return;
  }
  const files = (await fs.promises.readdir(intentsDir)).filter((f) =>
    f.endsWith(".json"),
  );
  for (const file of files) {
    const filePath = path.join(intentsDir, file);
    const content = await fs.promises.readFile(filePath, "utf8");
    const raw = JSON.parse(content);
    if (raw.schemaVersion && raw.schemaVersion >= 2) continue;
    raw.schemaVersion = 2;
    raw.planId = raw.planId ?? null;
    if (!raw.metadata?.agentIdentity) {
      raw.metadata = {
        ...raw.metadata,
        agentIdentity: {
          agentDid: raw.metadata?.author ?? "unknown",
          workflow: "manual",
        },
      };
    }
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(raw, null, 2),
      "utf8",
    );
  }
}
