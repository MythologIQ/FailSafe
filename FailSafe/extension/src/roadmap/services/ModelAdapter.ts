/**
 * ModelAdapter - Model-specific skill format transpiler.
 *
 * Converts proprietary skill definitions into model-specific formats
 * for different AI coding assistants. Reformats metadata and adjusts
 * instruction framing per model conventions. Skill content stays identical.
 */
import * as fs from "fs";
import * as path from "path";
import type { InstalledSkill } from "./SkillParser";
import type { AdapterConfig, AdapterResult } from "./ModelAdapterConfigs";

export function adaptSkillContent(
  skill: InstalledSkill,
  config: AdapterConfig,
): string {
  const content = extractSkillContent(skill);
  const metadata = buildModelMetadata(skill, config);

  switch (config.conventions.metadataFormat) {
    case "yaml-frontmatter":
      return formatYaml(metadata, content);
    case "xml-inline":
      return formatXml(metadata, content);
    case "json":
      return formatJson(metadata, content);
    default:
      return formatYaml(metadata, content);
  }
}

export function adaptSkillsForModel(
  skills: InstalledSkill[],
  config: AdapterConfig,
  workspaceRoot: string,
): AdapterResult {
  const result: AdapterResult = { written: [], skipped: [], errors: [] };

  for (const skill of skills) {
    try {
      const adapted = adaptSkillContent(skill, config);
      const outPath = getOutputPath(skill, config, workspaceRoot);
      const outDir = path.dirname(outPath);
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      if (fs.existsSync(outPath)) {
        if (fs.readFileSync(outPath, "utf8") === adapted) {
          result.skipped.push(outPath);
          continue;
        }
      }
      fs.writeFileSync(outPath, adapted, "utf8");
      result.written.push(outPath);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      result.errors.push(`${skill.id}: ${msg}`);
    }
  }

  return result;
}

function extractSkillContent(skill: InstalledSkill): string {
  try {
    const raw = fs.readFileSync(skill.sourcePath, "utf8");
    const body = raw.replace(/^---[\s\S]*?---\s*/, "");
    return body.trim();
  } catch {
    return `# ${skill.displayName}\n\n${skill.description}`;
  }
}

function buildModelMetadata(
  skill: InstalledSkill,
  config: AdapterConfig,
): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    name: skill.name,
    description: skill.description,
    version: skill.versionPin,
    category: skill.category,
    tags: skill.tags,
    license: "MIT",
    author: skill.creator,
    trustTier: skill.trustTier,
    admissionState: skill.admissionState,
    sourcePriority: skill.sourcePriority,
    sourceType: skill.sourceType,
    requiredPermissions: skill.requiredPermissions,
    model: config.modelId,
  };
  if (config.conventions.supportsSubagents) meta.supportsSubagents = true;
  if (config.conventions.supportsHooks) meta.supportsHooks = true;
  return meta;
}

function formatYaml(
  metadata: Record<string, unknown>,
  content: string,
): string {
  const lines = Object.entries(metadata).map(([k, v]) => {
    if (Array.isArray(v)) return `${k}: [${v.map((i) => `'${i}'`).join(", ")}]`;
    if (typeof v === "string") return `${k}: "${v}"`;
    return `${k}: ${v}`;
  });
  return `---\n${lines.join("\n")}\n---\n\n${content}`;
}

function formatXml(
  metadata: Record<string, unknown>,
  content: string,
): string {
  const lines = Object.entries(metadata).map(([k, v]) => {
    const val = Array.isArray(v) ? v.join(", ") : String(v);
    return `<${k}>${val}</${k}>`;
  });
  return `${lines.join("\n")}\n\n${content}`;
}

function formatJson(
  metadata: Record<string, unknown>,
  content: string,
): string {
  return `${JSON.stringify(metadata, null, 2)}\n\n${content}`;
}

function applyNaming(
  name: string,
  style: "kebab" | "snake" | "camel",
): string {
  const base = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  if (style === "kebab") return base.replace(/[\s_]+/g, "-");
  if (style === "snake") return base.replace(/[\s-]+/g, "_");
  return base
    .replace(/[\s_-]+(.)?/g, (_, c) => c?.toUpperCase() ?? "")
    .replace(/^(.)/, (_, c) => c.toLowerCase());
}

function getOutputPath(
  skill: InstalledSkill,
  config: AdapterConfig,
  workspaceRoot: string,
): string {
  const dirname = applyNaming(skill.localName, config.conventions.fileNaming);
  if (config.modelId === "cursor" || config.modelId === "windsurf" || config.modelId === "kilocode") {
    return path.join(workspaceRoot, config.outputDir, `${dirname}.md`);
  }
  return path.join(workspaceRoot, config.outputDir, dirname, "SKILL.md");
}
