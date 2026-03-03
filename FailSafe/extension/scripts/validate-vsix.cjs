const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exit(1);
}

function runCommand(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    fail(result.stderr.trim() || `${command} ${args.join(" ")} failed`);
  }
  return result.stdout;
}

function canRun(command, args = ["--help"]) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return !result.error;
}

function resolveVsixPath() {
  const explicit = process.argv[2];
  if (explicit) {
    const resolved = path.resolve(process.cwd(), explicit);
    if (fs.existsSync(resolved)) {
      return resolved;
    }

    const basename = path.basename(explicit);
    const strippedV = basename.replace(/-v(\d+\.\d+\.\d+(?:[-+][^.]*)?(?:\.[^.]+)*)\.vsix$/i, "-$1.vsix");
    if (strippedV !== basename) {
      const fallback = path.resolve(process.cwd(), path.join(path.dirname(explicit), strippedV));
      if (fs.existsSync(fallback)) {
        return fallback;
      }
    }

    return resolved;
  }

  const files = fs
    .readdirSync(root)
    .filter((name) => name.endsWith(".vsix"))
    .map((name) => path.join(root, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  if (files.length === 0) {
    fail("No VSIX found. Pass a path or run packaging first.");
  }

  return files[0];
}

function assertIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    fail(`${label} missing: ${needle}`);
  }
}

function createArchiveReader(vsixPath) {
  if (canRun("unzip")) {
    return {
      list: () => runCommand("unzip", ["-Z1", vsixPath]),
      read: (entry) => runCommand("unzip", ["-p", vsixPath, entry]),
    };
  }

  return {
    list: () => runCommand("tar", ["-tf", vsixPath]),
    read: (entry) => runCommand("tar", ["-xOf", vsixPath, entry]),
  };
}

function main() {
  const vsixPath = resolveVsixPath();
  if (!fs.existsSync(vsixPath)) {
    fail(`VSIX not found: ${vsixPath}`);
  }

  const archive = createArchiveReader(vsixPath);
  const list = archive.list();
  [
    "extension.vsixmanifest",
    "extension/package.json",
    "extension/README.md",
    "extension/CHANGELOG.md",
    "extension/docs/COMPONENT_HELP.md",
    "extension/docs/PROCESS_GUIDE.md",
    "extension/dist/extension/main.js",
    "extension/dist/extension/ui/index.html",
    "extension/dist/extension/ui/legacy-index.html",
    "extension/dist/webui/pages/index.html",
    "extension/dist/webui/pages/dashboard.html",
  ].forEach((entry) => assertIncludes(list, entry, "Archive entry"));

  const pkg = archive.read("extension/package.json");
  assertIncludes(pkg, `"version": "4.3.0"`, "Packaged package.json version");
  assertIncludes(pkg, `"main": "./dist/extension/main.js"`, "Packaged package.json main");
  assertIncludes(pkg, `"command": "failsafe.installCommitHook"`, "Packaged command");
  assertIncludes(pkg, `"command": "failsafe.removeCommitHook"`, "Packaged command");

  const manifest = archive.read("extension.vsixmanifest");
  assertIncludes(manifest, `Version="4.3.0"`, "VSIX manifest version");
  assertIncludes(manifest, `DisplayName>FailSafe (feat. QoreLogic)<`, "VSIX display name");

  const readme = archive.read("extension/README.md");
  assertIncludes(readme, `**Current Release**: v4.3.0 (2026-03-02)`, "Packaged README release marker");
  assertIncludes(readme, `## What's New in v4.3.0`, "Packaged README release notes");

  const changelog = archive.read("extension/CHANGELOG.md");
  assertIncludes(changelog, `## [4.3.0] - 2026-03-02`, "Packaged changelog release entry");

  console.log(`[PASS] VSIX validated: ${vsixPath}`);
}

main();
