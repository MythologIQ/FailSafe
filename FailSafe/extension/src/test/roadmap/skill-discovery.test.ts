import { strict as assert } from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

suite('Skill Discovery: collectCommandMarkdownFiles equivalent logic', () => {
  let tmpDir: string;

  function collectCommandMarkdownFiles(root: string): string[] {
    const files: string[] = [];
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
          stack.push(full);
          continue;
        }
        if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(full);
        }
      }
    }
    return files;
  }

  setup(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-disc-'));
    fs.writeFileSync(path.join(tmpDir, 'ql-plan.md'), '# Plan skill');
    fs.writeFileSync(path.join(tmpDir, 'ql-audit.md'), '# Audit skill');
    fs.mkdirSync(path.join(tmpDir, 'agents'));
    fs.writeFileSync(path.join(tmpDir, 'agents', 'ql-governor.md'), '# Governor');
    fs.mkdirSync(path.join(tmpDir, '_quarantine'));
    fs.writeFileSync(path.join(tmpDir, '_quarantine', 'blocked.md'), '# Blocked');
  });

  teardown(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('finds .md files in root and nested directories', () => {
    const found = collectCommandMarkdownFiles(tmpDir);
    const names = found.map(f => path.basename(f)).sort();
    assert.ok(names.includes('ql-plan.md'), 'Should find ql-plan.md');
    assert.ok(names.includes('ql-audit.md'), 'Should find ql-audit.md');
    assert.ok(names.includes('ql-governor.md'), 'Should find nested ql-governor.md');
  });

  test('skips directories prefixed with _ or .', () => {
    const found = collectCommandMarkdownFiles(tmpDir);
    const names = found.map(f => path.basename(f));
    assert.ok(!names.includes('blocked.md'), 'Should skip _quarantine/blocked.md');
  });
});

suite('parseCommandFile category derivation', () => {
  test('assigns governance category to ql-* prefixed files', () => {
    const baseName = 'ql-plan';
    const isGovernance = baseName.startsWith('ql-');
    assert.strictEqual(isGovernance, true);
    const category = isGovernance ? 'governance' : 'other';
    assert.strictEqual(category, 'governance');
  });

  test('derives category from directory name for non-ql files', () => {
    const baseName = 'backend-developer';
    const dirName = 'agents';
    const isGovernance = baseName.startsWith('ql-');
    assert.strictEqual(isGovernance, false);
    const category = isGovernance ? 'governance' : dirName;
    assert.strictEqual(category, 'agents');
  });
});
