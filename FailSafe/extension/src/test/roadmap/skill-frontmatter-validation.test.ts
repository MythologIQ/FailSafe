import { describe, it } from "mocha";
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { collectMarkdownFiles } from "../../roadmap/services/SkillFileUtils";
import { readFrontmatterValue } from "../../roadmap/services/SkillFrontmatter";

const ANTIGRAVITY_SKILLS = path.resolve(
  __dirname, "..", "..", "..", "..", "Antigravity", "skills",
);

describe("Proprietary Skill Frontmatter Validation", () => {
  it("all skill files in Antigravity/skills have required fields", async function () {
    this.timeout(15000);
    if (!fs.existsSync(ANTIGRAVITY_SKILLS)) {
      this.skip();
      return;
    }

    const files = await collectMarkdownFiles(ANTIGRAVITY_SKILLS);
    assert.ok(files.length > 0, "No skill files found");

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, "utf8");
      const fmMatch = content.match(/^---\s*([\s\S]*?)\s*---/);
      if (!fmMatch) continue;
      const fm = fmMatch[1];
      const basename = path.basename(filePath);

      const name = readFrontmatterValue(fm, "name");
      assert.ok(name, `${basename}: missing 'name'`);

      const desc = readFrontmatterValue(fm, "description");
      assert.ok(desc, `${basename}: missing 'description'`);
    }
  });
});
